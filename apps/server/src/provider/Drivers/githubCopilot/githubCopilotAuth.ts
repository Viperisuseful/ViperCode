/**
 * githubCopilotAuth — stateful token manager for the GitHub Copilot driver.
 *
 * Owns the GitHub OAuth token obtained through the device flow and persists
 * it to disk so login survives restarts.
 *
 * Built by {@link makeGitHubCopilotAuth} as a per-instance value so two
 * configured Copilot instances never share credentials. Requires
 * `HttpClient`, `FileSystem`, and `Path`.
 *
 * @module provider/Drivers/githubCopilot/githubCopilotAuth
 */
import * as Effect from "effect/Effect";
import * as Duration from "effect/Duration";
import * as Clock from "effect/Clock";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as Scope from "effect/Scope";
import * as Schema from "effect/Schema";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { HttpClient } from "effect/unstable/http";

import {
  type GitHubCopilotApiError,
  pollDeviceAccessToken,
  requestDeviceCode,
  type DeviceCodeResponse,
} from "./githubCopilotApi.ts";

const StoredOAuth = Schema.Struct({ oauthToken: Schema.String });
const StoredOAuthJson = Schema.fromJsonString(StoredOAuth);
const decodeStoredOAuthJson = Schema.decodeUnknownEffect(StoredOAuthJson);
const encodeStoredOAuthJson = Schema.encodeEffect(StoredOAuthJson);

const DEVICE_FLOW_EXPIRY_SAFETY_MS = 5_000;

export class GitHubCopilotAuthError extends Schema.TaggedErrorClass<GitHubCopilotAuthError>()(
  "GitHubCopilotAuthError",
  {
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return this.detail;
  }
}

export type DeviceFlowStatus =
  | { readonly _tag: "authenticated" }
  | { readonly _tag: "pending"; readonly userCode: string; readonly verificationUri: string }
  | { readonly _tag: "unavailable"; readonly reason: string };

export interface GitHubCopilotAuthShape {
  /** Whether a persisted `ghu_` OAuth token exists (i.e. the user is logged in). */
  readonly isAuthenticated: Effect.Effect<boolean>;
  /**
   * Drive sign-in without a dedicated UI: if already authenticated, report
   * so; otherwise start (or resume) the device flow and report the code to
   * surface in the provider card. The browser-authorization poll runs in the
   * background and persists the token on success.
   */
  readonly ensureDeviceFlow: Effect.Effect<DeviceFlowStatus>;
  /** Begin the device flow; the returned code/uri are surfaced in the UI. */
  readonly startDeviceAuthorization: Effect.Effect<
    DeviceCodeResponse,
    GitHubCopilotAuthError | GitHubCopilotApiError
  >;
  /**
   * Poll until the user authorizes in their browser, then persist the
   * resulting `ghu_` token. Resolves with the token, or fails if the device
   * code expires or GitHub returns an error.
   */
  readonly awaitDeviceAuthorization: (
    device: Pick<DeviceCodeResponse, "device_code" | "interval" | "expires_in">,
  ) => Effect.Effect<string, GitHubCopilotAuthError | GitHubCopilotApiError>;
  /**
   * Return the persisted GitHub OAuth token used by current Copilot API calls.
   * Kept as `getSessionToken` to preserve the driver-internal contract while
   * the implementation moves away from copilot_internal/v2/token.
   */
  readonly getSessionToken: Effect.Effect<string, GitHubCopilotAuthError>;
  /** Forget the persisted OAuth token (sign out). */
  readonly signOut: Effect.Effect<void>;
}

export const makeGitHubCopilotAuth = (options: {
  /** Absolute path to the JSON file holding the persisted `ghu_` token. */
  readonly storagePath: string;
  /** GitHub OAuth App client id with device flow enabled. */
  readonly clientId: string;
  /** Public GitHub by default; GitHub Enterprise URL for enterprise setups. */
  readonly githubBaseUrl?: string | undefined;
}): Effect.Effect<
  GitHubCopilotAuthShape,
  never,
  HttpClient.HttpClient | FileSystem.FileSystem | Path.Path | Scope.Scope
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const httpClient = yield* HttpClient.HttpClient;
    const scope = yield* Effect.scope;
    const clientId = options.clientId.trim();
    const activeFlowRef = yield* Ref.make<{
      readonly userCode: string;
      readonly verificationUri: string;
      readonly expiresAtMs: number;
    } | null>(null);

    // The shape's effects are R=never; provide HttpClient once here so each
    // stateless API call captures it instead of leaking it into the contract.
    const withHttp = <A, E>(eff: Effect.Effect<A, E, HttpClient.HttpClient>): Effect.Effect<A, E> =>
      eff.pipe(Effect.provideService(HttpClient.HttpClient, httpClient));

    const readStoredOAuthToken = Effect.gen(function* () {
      const exists = yield* fs.exists(options.storagePath).pipe(Effect.orElseSucceed(() => false));
      if (!exists) return null;
      const raw = yield* fs
        .readFileString(options.storagePath)
        .pipe(Effect.orElseSucceed(() => ""));
      if (raw.trim().length === 0) return null;
      const parsed = yield* decodeStoredOAuthJson(raw).pipe(Effect.result);
      return Result.isSuccess(parsed) ? parsed.success.oauthToken : null;
    });

    const writeStoredOAuthToken = (oauthToken: string) =>
      Effect.gen(function* () {
        yield* fs
          .makeDirectory(path.dirname(options.storagePath), { recursive: true })
          .pipe(Effect.orElseSucceed(() => undefined));
        const encoded = yield* encodeStoredOAuthJson({ oauthToken });
        yield* fs.writeFileString(options.storagePath, encoded);
      });

    const isAuthenticated = readStoredOAuthToken.pipe(Effect.map((token) => token !== null));

    const missingClientIdReason =
      "Configure a GitHub OAuth client ID with device flow enabled before signing in.";

    const requireClientId = Effect.suspend(() =>
      clientId.length > 0
        ? Effect.succeed(clientId)
        : Effect.fail(new GitHubCopilotAuthError({ detail: missingClientIdReason })),
    );

    const startDeviceAuthorization = requireClientId.pipe(
      Effect.flatMap((validatedClientId) =>
        withHttp(
          requestDeviceCode({
            clientId: validatedClientId,
            ...(options.githubBaseUrl ? { githubBaseUrl: options.githubBaseUrl } : {}),
          }),
        ),
      ),
    );

    const awaitDeviceAuthorization = (
      device: Pick<DeviceCodeResponse, "device_code" | "interval" | "expires_in">,
    ): Effect.Effect<string, GitHubCopilotAuthError | GitHubCopilotApiError> =>
      Effect.gen(function* () {
        const startedAtMs = yield* Clock.currentTimeMillis;
        const expiresAtMs =
          startedAtMs + Math.max(device.expires_in, 1) * 1000 - DEVICE_FLOW_EXPIRY_SAFETY_MS;
        const poll = (
          intervalSeconds: number,
        ): Effect.Effect<string, GitHubCopilotAuthError | GitHubCopilotApiError> =>
          Effect.sleep(Duration.seconds(intervalSeconds)).pipe(
            Effect.flatMap(() =>
              Effect.gen(function* () {
                const now = yield* Clock.currentTimeMillis;
                if (now >= expiresAtMs) {
                  return yield* new GitHubCopilotAuthError({
                    detail: "GitHub Copilot device authorization expired.",
                  });
                }
                const validatedClientId = yield* requireClientId;
                return yield* withHttp(
                  pollDeviceAccessToken(device.device_code, {
                    clientId: validatedClientId,
                    ...(options.githubBaseUrl ? { githubBaseUrl: options.githubBaseUrl } : {}),
                  }),
                );
              }),
            ),
            Effect.flatMap((result) => {
              switch (result._tag) {
                case "authorized":
                  return writeStoredOAuthToken(result.accessToken).pipe(
                    Effect.mapError(
                      (cause) =>
                        new GitHubCopilotAuthError({
                          detail: "Could not persist GitHub Copilot OAuth token.",
                          cause,
                        }),
                    ),
                    Effect.as(result.accessToken),
                  );
                case "pending":
                  return poll(intervalSeconds);
                case "slow_down":
                  return poll(result.interval);
                case "error":
                  return Effect.fail(
                    new GitHubCopilotAuthError({
                      detail: `GitHub Copilot authorization failed: ${result.error}${
                        result.description ? ` (${result.description})` : ""
                      }`,
                    }),
                  );
              }
            }),
          );
        return yield* poll(Math.max(device.interval, 1));
      });

    const getSessionToken = Effect.gen(function* () {
      const oauthToken = yield* readStoredOAuthToken;
      if (oauthToken === null) {
        return yield* new GitHubCopilotAuthError({
          detail: "Not signed in to GitHub Copilot. Run the device authorization flow first.",
        });
      }
      return oauthToken;
    });

    const signOut = Effect.gen(function* () {
      yield* Ref.set(activeFlowRef, null);
      yield* fs.remove(options.storagePath).pipe(Effect.orElseSucceed(() => undefined));
    });

    const ensureDeviceFlow: Effect.Effect<DeviceFlowStatus> = Effect.gen(function* () {
      const authed = yield* isAuthenticated;
      if (authed) {
        yield* Ref.set(activeFlowRef, null);
        return { _tag: "authenticated" } as const;
      }
      if (clientId.length === 0) {
        return {
          _tag: "unavailable",
          reason: missingClientIdReason,
        } as const;
      }
      const active = yield* Ref.get(activeFlowRef);
      const now = yield* Clock.currentTimeMillis;
      if (active !== null && now < active.expiresAtMs) {
        return {
          _tag: "pending",
          userCode: active.userCode,
          verificationUri: active.verificationUri,
        } as const;
      }
      const started = yield* startDeviceAuthorization.pipe(
        Effect.timeout(Duration.seconds(20)),
        Effect.map((device) => ({ ok: true as const, device })),
        Effect.tapError((cause) =>
          Effect.logWarning("GitHub Copilot device-code request failed", { cause }),
        ),
        Effect.orElseSucceed(() => ({ ok: false as const })),
      );
      if (!started.ok) {
        return {
          _tag: "unavailable",
          reason: "Could not reach GitHub to start sign-in. Check your connection and retry.",
        } as const;
      }
      const device = started.device;
      yield* Effect.logInfo("GitHub Copilot device code ready", {
        userCode: device.user_code,
        verificationUri: device.verification_uri,
      });
      yield* Ref.set(activeFlowRef, {
        userCode: device.user_code,
        verificationUri: device.verification_uri,
        expiresAtMs: now + Math.max(device.expires_in, 1) * 1000 - DEVICE_FLOW_EXPIRY_SAFETY_MS,
      });
      yield* awaitDeviceAuthorization({
        device_code: device.device_code,
        interval: device.interval,
        expires_in: device.expires_in,
      }).pipe(
        Effect.orElseSucceed(() => undefined),
        Effect.flatMap(() => Ref.set(activeFlowRef, null)),
        Effect.forkIn(scope),
      );
      return {
        _tag: "pending",
        userCode: device.user_code,
        verificationUri: device.verification_uri,
      } as const;
    });

    return {
      isAuthenticated,
      ensureDeviceFlow,
      startDeviceAuthorization,
      awaitDeviceAuthorization,
      getSessionToken,
      signOut,
    } satisfies GitHubCopilotAuthShape;
  });

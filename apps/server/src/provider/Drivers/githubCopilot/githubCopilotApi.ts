/**
 * githubCopilotApi - stateless HTTP calls and schemas for GitHub Copilot.
 *
 * Auth happens in two steps, mirroring VS Code / OpenCode:
 * 1. GitHub OAuth device flow yields a long-lived `ghu_` OAuth token.
 * 2. That token is exchanged at `copilot_internal/v2/token` for a short-lived
 *    Copilot session token, which is the only credential that
 *    api.githubcopilot.com accepts as a Bearer token.
 *
 * @module provider/Drivers/githubCopilot/githubCopilotApi
 */
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

export const COPILOT_OAUTH_SCOPE = "read:user";
export const DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
export const DEFAULT_GITHUB_BASE_URL = "https://github.com";
export const DEFAULT_GITHUB_API_BASE = "https://api.github.com";
export const DEFAULT_COPILOT_API_BASE = "https://api.githubcopilot.com";
export const COPILOT_API_VERSION = "2026-06-01";
// The token exchange and the Copilot API both gate on editor identification
// headers; these mirror the VS Code Copilot Chat extension, the same set
// OpenCode and other third-party clients send.
export const COPILOT_USER_AGENT = "GitHubCopilotChat/0.26.7";
export const COPILOT_EDITOR_VERSION = "vscode/1.99.3";
export const COPILOT_EDITOR_PLUGIN_VERSION = "copilot-chat/0.26.7";
export const COPILOT_INTEGRATION_ID = "vscode-chat";

export interface GitHubCopilotOAuthOptions {
  readonly clientId: string;
  readonly githubBaseUrl?: string | undefined;
}

export interface GitHubCopilotApiOptions {
  readonly apiBaseUrl?: string | undefined;
  readonly userAgent?: string | undefined;
}

function parseBaseUrl(value: string | undefined): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

export function resolveGitHubBaseUrl(githubBaseUrl: string | undefined): string {
  return parseBaseUrl(githubBaseUrl)?.origin ?? DEFAULT_GITHUB_BASE_URL;
}

export function resolveCopilotApiBaseUrl(githubBaseUrl: string | undefined): string {
  const parsed = parseBaseUrl(githubBaseUrl);
  if (parsed === null || parsed.hostname === "github.com") {
    return DEFAULT_COPILOT_API_BASE;
  }
  return `https://copilot-api.${parsed.host}`;
}

export function resolveGitHubApiBaseUrl(githubBaseUrl: string | undefined): string {
  const parsed = parseBaseUrl(githubBaseUrl);
  if (parsed === null || parsed.hostname === "github.com") {
    return DEFAULT_GITHUB_API_BASE;
  }
  return `https://api.${parsed.host}`;
}

export function buildCopilotHeaders(options?: {
  readonly userAgent?: string | undefined;
  readonly initiator?: "user" | "agent";
  readonly intent?: "conversation-edits";
  readonly vision?: boolean;
}): Readonly<Record<string, string>> {
  return {
    Accept: "application/json",
    "User-Agent": options?.userAgent?.trim() || COPILOT_USER_AGENT,
    "X-GitHub-Api-Version": COPILOT_API_VERSION,
    "Editor-Version": COPILOT_EDITOR_VERSION,
    "Editor-Plugin-Version": COPILOT_EDITOR_PLUGIN_VERSION,
    "Copilot-Integration-Id": COPILOT_INTEGRATION_ID,
    ...(options?.intent ? { "Openai-Intent": options.intent } : {}),
    ...(options?.initiator ? { "x-initiator": options.initiator } : {}),
    ...(options?.vision ? { "Copilot-Vision-Request": "true" } : {}),
  };
}

const applyHeaders =
  (headers: Readonly<Record<string, string>>) => (request: HttpClientRequest.HttpClientRequest) =>
    Object.entries(headers).reduce(
      (acc, [key, value]) => HttpClientRequest.setHeader(key, value)(acc),
      request,
    );

export class GitHubCopilotApiError extends Schema.TaggedErrorClass<GitHubCopilotApiError>()(
  "GitHubCopilotApiError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
    detail: Schema.optional(Schema.String),
  },
) {
  override get message(): string {
    const detail = this.detail ?? errorMessage(this.cause);
    return `GitHub Copilot API request failed during ${this.operation}${
      detail ? `: ${detail}` : ""
    }`;
  }
}

function errorMessage(cause: unknown): string | undefined {
  if (cause instanceof Error && cause.message.trim().length > 0) return cause.message;
  if (typeof cause === "object" && cause !== null && "message" in cause) {
    const message = (cause as { readonly message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) return message;
  }
  return undefined;
}

function isGitHubCopilotApiError(cause: unknown): cause is GitHubCopilotApiError {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "_tag" in cause &&
    (cause as { readonly _tag?: unknown })._tag === "GitHubCopilotApiError"
  );
}

const mapApiError = (operation: string) =>
  Effect.mapError((cause: unknown) =>
    isGitHubCopilotApiError(cause)
      ? cause
      : new GitHubCopilotApiError({
          operation,
          cause,
        }),
  );

function compactBody(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 500 ? `${normalized.slice(0, 497)}...` : normalized;
}

function apiStatusError(
  operation: string,
  response: HttpClientResponse.HttpClientResponse,
  body: string,
): GitHubCopilotApiError {
  const compacted = compactBody(body);
  const detail = `HTTP ${response.status}${compacted.length > 0 ? `: ${compacted}` : ""}`;
  return new GitHubCopilotApiError({
    operation,
    detail,
    cause: new Error(detail),
  });
}

const ensureStatusOk = (
  operation: string,
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<HttpClientResponse.HttpClientResponse, GitHubCopilotApiError> => {
  if (response.status >= 200 && response.status < 300) return Effect.succeed(response);
  return response.text.pipe(
    Effect.orElseSucceed(() => ""),
    Effect.flatMap((body) => Effect.fail(apiStatusError(operation, response, body))),
  );
};

export const DeviceCodeResponse = Schema.Struct({
  device_code: Schema.String,
  user_code: Schema.String,
  verification_uri: Schema.String,
  expires_in: Schema.Number,
  interval: Schema.Number,
});
export type DeviceCodeResponse = typeof DeviceCodeResponse.Type;

export const DeviceAccessTokenResponse = Schema.Struct({
  access_token: Schema.optional(Schema.String),
  token_type: Schema.optional(Schema.String),
  scope: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  error_description: Schema.optional(Schema.String),
  interval: Schema.optional(Schema.Number),
});
export type DeviceAccessTokenResponse = typeof DeviceAccessTokenResponse.Type;

export const CopilotTokenResponse = Schema.Struct({
  token: Schema.String,
  expires_at: Schema.optional(Schema.Number),
  refresh_in: Schema.optional(Schema.Number),
  endpoints: Schema.optional(
    Schema.Struct({
      api: Schema.optional(Schema.String),
    }),
  ),
});
export type CopilotTokenResponse = typeof CopilotTokenResponse.Type;

export const CopilotModelLimits = Schema.Struct({
  max_context_window_tokens: Schema.optional(Schema.Number),
  max_output_tokens: Schema.optional(Schema.Number),
  max_prompt_tokens: Schema.optional(Schema.Number),
  vision: Schema.optional(Schema.Unknown),
});
export type CopilotModelLimits = typeof CopilotModelLimits.Type;

export const CopilotModelSupports = Schema.Struct({
  adaptive_thinking: Schema.optional(Schema.Boolean),
  max_thinking_budget: Schema.optional(Schema.Number),
  min_thinking_budget: Schema.optional(Schema.Number),
  reasoning_effort: Schema.optional(Schema.Array(Schema.String)),
  streaming: Schema.optional(Schema.Boolean),
  structured_outputs: Schema.optional(Schema.Boolean),
  tool_calls: Schema.optional(Schema.Boolean),
  vision: Schema.optional(Schema.Boolean),
});
export type CopilotModelSupports = typeof CopilotModelSupports.Type;

export const CopilotModelCapabilities = Schema.Struct({
  family: Schema.optional(Schema.String),
  limits: Schema.optional(CopilotModelLimits),
  supports: Schema.optional(CopilotModelSupports),
});
export type CopilotModelCapabilities = typeof CopilotModelCapabilities.Type;

export const CopilotModelPolicy = Schema.Struct({
  state: Schema.optional(Schema.String),
});
export type CopilotModelPolicy = typeof CopilotModelPolicy.Type;

export const CopilotModel = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  version: Schema.optional(Schema.String),
  vendor: Schema.optional(Schema.String),
  model_picker_enabled: Schema.optional(Schema.Boolean),
  supported_endpoints: Schema.optional(Schema.Array(Schema.String)),
  policy: Schema.optional(CopilotModelPolicy),
  billing: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  capabilities: Schema.optional(CopilotModelCapabilities),
});
export type CopilotModel = typeof CopilotModel.Type;

export const CopilotModelsResponse = Schema.Struct({
  data: Schema.Array(CopilotModel),
});
export type CopilotModelsResponse = typeof CopilotModelsResponse.Type;

export const ChatCompletionMessage = Schema.Struct({
  role: Schema.String,
  content: Schema.NullOr(Schema.String),
});
export type ChatCompletionMessage = typeof ChatCompletionMessage.Type;

export const ChatCompletionChoice = Schema.Struct({
  index: Schema.optional(Schema.Number),
  message: Schema.optional(ChatCompletionMessage),
  finish_reason: Schema.optional(Schema.NullOr(Schema.String)),
});

export const ChatCompletionResponse = Schema.Struct({
  id: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  choices: Schema.Array(ChatCompletionChoice),
});
export type ChatCompletionResponse = typeof ChatCompletionResponse.Type;

export interface ChatCompletionRequest {
  readonly model: string;
  readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }>;
  readonly temperature?: number;
  readonly stream?: boolean;
  readonly reasoning_effort?: string;
  readonly [key: string]: unknown;
}

export interface ResponsesCompletionRequest {
  readonly model: string;
  readonly input: ReadonlyArray<{ readonly role: string; readonly content: string }> | string;
  readonly stream?: boolean;
  readonly store?: boolean;
  readonly reasoning?: {
    readonly effort?: string;
    readonly summary?: string;
  };
  readonly [key: string]: unknown;
}

export interface MessagesCompletionRequest {
  readonly model: string;
  readonly messages: ReadonlyArray<{
    readonly role: "user" | "assistant";
    readonly content: string;
  }>;
  readonly max_tokens: number;
  readonly system?: string;
  readonly stream?: boolean;
  readonly [key: string]: unknown;
}

export interface CopilotCompletionRequest {
  readonly model: string;
  readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }>;
  readonly reasoningEffort?: string | undefined;
}

export interface CopilotCompletionResponse {
  readonly text: string;
  readonly endpoint: "chat" | "responses" | "messages";
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

export function shouldUseCopilotResponsesApi(model: string): boolean {
  const normalized = model.toLowerCase();
  const match = /^gpt-(\d+)/.exec(normalized);
  return match !== null && Number(match[1]) >= 5 && !normalized.startsWith("gpt-5-mini");
}

export function shouldUseCopilotMessagesApi(model: string): boolean {
  const normalized = model.toLowerCase();
  return normalized.startsWith("claude-") || normalized.includes("/claude-");
}

export function extractChatCompletionText(response: ChatCompletionResponse): string {
  return response.choices.find((choice) => choice.message?.content)?.message?.content ?? "";
}

export function extractResponsesCompletionText(response: unknown): string {
  if (!isRecord(response)) return "";
  const direct = response.output_text;
  if (typeof direct === "string") return direct;

  const chunks: Array<string> = [];
  const output = response.output;
  if (!Array.isArray(output)) return "";

  for (const item of output) {
    if (!isRecord(item)) continue;
    const itemText = item.text ?? item.output_text;
    if (typeof itemText === "string") chunks.push(itemText);

    const content = item.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!isRecord(part)) continue;
      const partText = part.text ?? part.output_text;
      if (typeof partText === "string") chunks.push(partText);
    }
  }

  return chunks.join("");
}

export function extractMessagesCompletionText(response: unknown): string {
  if (!isRecord(response) || !Array.isArray(response.content)) return "";
  return response.content
    .map((part) => {
      if (!isRecord(part)) return "";
      const text = part.text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

function splitSystemMessages(messages: CopilotCompletionRequest["messages"]): {
  readonly system: string | undefined;
  readonly messages: ReadonlyArray<{
    readonly role: "user" | "assistant";
    readonly content: string;
  }>;
} {
  const system = messages
    .filter((message) => message.role === "system" && message.content.trim().length > 0)
    .map((message) => message.content)
    .join("\n\n");
  return {
    system: system.length > 0 ? system : undefined,
    messages: messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: message.content,
      })),
  };
}

export const requestDeviceCode = (
  options: GitHubCopilotOAuthOptions,
): Effect.Effect<DeviceCodeResponse, GitHubCopilotApiError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(
      `${resolveGitHubBaseUrl(options.githubBaseUrl)}/login/device/code`,
    ).pipe(
      HttpClientRequest.setHeader("Accept", "application/json"),
      HttpClientRequest.setHeader("User-Agent", COPILOT_USER_AGENT),
      HttpClientRequest.bodyUrlParams({
        client_id: options.clientId,
        scope: COPILOT_OAUTH_SCOPE,
      }),
    );
    const response = yield* httpClient.execute(request);
    const ok = yield* ensureStatusOk("requestDeviceCode", response);
    return yield* HttpClientResponse.schemaBodyJson(DeviceCodeResponse)(ok);
  }).pipe(mapApiError("requestDeviceCode"));

export type DevicePollResult =
  | { readonly _tag: "authorized"; readonly accessToken: string }
  | { readonly _tag: "pending" }
  | { readonly _tag: "slow_down"; readonly interval: number }
  | { readonly _tag: "error"; readonly error: string; readonly description: string | undefined };

export const pollDeviceAccessToken = (
  deviceCode: string,
  options: GitHubCopilotOAuthOptions,
): Effect.Effect<DevicePollResult, GitHubCopilotApiError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(
      `${resolveGitHubBaseUrl(options.githubBaseUrl)}/login/oauth/access_token`,
    ).pipe(
      HttpClientRequest.setHeader("Accept", "application/json"),
      HttpClientRequest.setHeader("User-Agent", COPILOT_USER_AGENT),
      HttpClientRequest.bodyUrlParams({
        client_id: options.clientId,
        device_code: deviceCode,
        grant_type: DEVICE_CODE_GRANT_TYPE,
      }),
    );
    const response = yield* httpClient.execute(request);
    const body = yield* HttpClientResponse.schemaBodyJson(DeviceAccessTokenResponse)(response);

    if (body.access_token) {
      return { _tag: "authorized", accessToken: body.access_token } as const;
    }
    switch (body.error) {
      case "authorization_pending":
        return { _tag: "pending" } as const;
      case "slow_down":
        return { _tag: "slow_down", interval: body.interval ?? 5 } as const;
      default:
        return {
          _tag: "error",
          error: body.error ?? "unknown_error",
          description: body.error_description,
        } as const;
    }
  }).pipe(mapApiError("pollDeviceAccessToken"));

/**
 * Exchange the persisted GitHub OAuth token for a short-lived Copilot session
 * token. api.githubcopilot.com only accepts the session token as Bearer; the
 * raw `ghu_` OAuth token is rejected with 401.
 */
export const exchangeCopilotSessionToken = (
  githubOAuthToken: string,
  options?: {
    readonly githubBaseUrl?: string | undefined;
    readonly userAgent?: string | undefined;
  },
): Effect.Effect<CopilotTokenResponse, GitHubCopilotApiError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(
      `${resolveGitHubApiBaseUrl(options?.githubBaseUrl)}/copilot_internal/v2/token`,
    ).pipe(
      HttpClientRequest.setHeader("Authorization", `token ${githubOAuthToken}`),
      applyHeaders(buildCopilotHeaders({ userAgent: options?.userAgent })),
    );
    const response = yield* httpClient.execute(request);
    const ok = yield* ensureStatusOk("exchangeCopilotSessionToken", response);
    return yield* HttpClientResponse.schemaBodyJson(CopilotTokenResponse)(ok);
  }).pipe(mapApiError("exchangeCopilotSessionToken"));

export const fetchCopilotModels = (
  copilotSessionToken: string,
  options?: GitHubCopilotApiOptions,
): Effect.Effect<ReadonlyArray<CopilotModel>, GitHubCopilotApiError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(
      `${options?.apiBaseUrl ?? DEFAULT_COPILOT_API_BASE}/models`,
    ).pipe(
      HttpClientRequest.bearerToken(copilotSessionToken),
      applyHeaders(buildCopilotHeaders({ userAgent: options?.userAgent })),
    );
    const response = yield* httpClient.execute(request);
    const ok = yield* ensureStatusOk("fetchCopilotModels", response);
    const body = yield* HttpClientResponse.schemaBodyJson(CopilotModelsResponse)(ok);
    return body.data;
  }).pipe(mapApiError("fetchCopilotModels"));

export const createChatCompletion = (
  copilotSessionToken: string,
  payload: ChatCompletionRequest,
  options?: GitHubCopilotApiOptions,
): Effect.Effect<ChatCompletionResponse, GitHubCopilotApiError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const request = yield* HttpClientRequest.post(
      `${options?.apiBaseUrl ?? DEFAULT_COPILOT_API_BASE}/chat/completions`,
    ).pipe(
      HttpClientRequest.bearerToken(copilotSessionToken),
      applyHeaders(
        buildCopilotHeaders({
          userAgent: options?.userAgent,
          intent: "conversation-edits",
          initiator: "user",
        }),
      ),
      HttpClientRequest.bodyJson({ ...payload, stream: false, store: payload.store ?? false }),
    );
    const response = yield* httpClient.execute(request);
    const ok = yield* ensureStatusOk("createChatCompletion", response);
    return yield* HttpClientResponse.schemaBodyJson(ChatCompletionResponse)(ok);
  }).pipe(mapApiError("createChatCompletion"));

export const createResponsesCompletion = (
  copilotSessionToken: string,
  payload: ResponsesCompletionRequest,
  options?: GitHubCopilotApiOptions,
): Effect.Effect<unknown, GitHubCopilotApiError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const request = yield* HttpClientRequest.post(
      `${options?.apiBaseUrl ?? DEFAULT_COPILOT_API_BASE}/responses`,
    ).pipe(
      HttpClientRequest.bearerToken(copilotSessionToken),
      applyHeaders(
        buildCopilotHeaders({
          userAgent: options?.userAgent,
          intent: "conversation-edits",
          initiator: "user",
        }),
      ),
      HttpClientRequest.bodyJson({ ...payload, stream: false, store: payload.store ?? false }),
    );
    const response = yield* httpClient.execute(request);
    const ok = yield* ensureStatusOk("createResponsesCompletion", response);
    return yield* ok.json;
  }).pipe(mapApiError("createResponsesCompletion"));

export const createMessagesCompletion = (
  copilotSessionToken: string,
  payload: MessagesCompletionRequest,
  options?: GitHubCopilotApiOptions,
): Effect.Effect<unknown, GitHubCopilotApiError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const request = yield* HttpClientRequest.post(
      `${options?.apiBaseUrl ?? DEFAULT_COPILOT_API_BASE}/v1/messages`,
    ).pipe(
      HttpClientRequest.bearerToken(copilotSessionToken),
      applyHeaders({
        ...buildCopilotHeaders({
          userAgent: options?.userAgent,
          intent: "conversation-edits",
          initiator: "user",
        }),
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "interleaved-thinking-2025-05-14",
      }),
      HttpClientRequest.bodyJson({ ...payload, stream: false }),
    );
    const response = yield* httpClient.execute(request);
    const ok = yield* ensureStatusOk("createMessagesCompletion", response);
    return yield* ok.json;
  }).pipe(mapApiError("createMessagesCompletion"));

export const createCopilotCompletion = (
  copilotSessionToken: string,
  payload: CopilotCompletionRequest,
  options?: GitHubCopilotApiOptions,
): Effect.Effect<CopilotCompletionResponse, GitHubCopilotApiError, HttpClient.HttpClient> => {
  if (shouldUseCopilotMessagesApi(payload.model)) {
    const split = splitSystemMessages(payload.messages);
    return createMessagesCompletion(
      copilotSessionToken,
      {
        model: payload.model,
        messages: split.messages,
        max_tokens: 4096,
        ...(split.system ? { system: split.system } : {}),
      },
      options,
    ).pipe(
      Effect.map((response) => ({
        text: extractMessagesCompletionText(response),
        endpoint: "messages" as const,
      })),
    );
  }

  if (shouldUseCopilotResponsesApi(payload.model)) {
    return createResponsesCompletion(
      copilotSessionToken,
      {
        model: payload.model,
        input: payload.messages,
        reasoning: {
          effort: payload.reasoningEffort ?? "medium",
          summary: "auto",
        },
      },
      options,
    ).pipe(
      Effect.map((response) => ({
        text: extractResponsesCompletionText(response),
        endpoint: "responses" as const,
      })),
    );
  }

  return createChatCompletion(
    copilotSessionToken,
    {
      model: payload.model,
      messages: payload.messages,
      ...(payload.reasoningEffort ? { reasoning_effort: payload.reasoningEffort } : {}),
    },
    options,
  ).pipe(
    Effect.map((response) => ({
      text: extractChatCompletionText(response),
      endpoint: "chat" as const,
    })),
  );
};

// @effect-diagnostics nodeBuiltinImport:off - Tests exercise root env file precedence directly.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { loadRepoEnv, resolvePublicConfig } from "./public-config.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadRepoEnv", () => {
  it("does not project cloud configuration for an unconfigured clone", () => {
    const env = loadRepoEnv({ baseEnv: {}, repoRoot: makeTemporaryDirectory() });

    expect(env.VIPERCODE_CLERK_PUBLISHABLE_KEY).toBeUndefined();
    expect(env.VIPERCODE_CLERK_CLI_OAUTH_CLIENT_ID).toBeUndefined();
    expect(env.VITE_CLERK_PUBLISHABLE_KEY).toBeUndefined();
    expect(env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeUndefined();
    expect(env.VIPERCODE_CLERK_JWT_TEMPLATE).toBeUndefined();
    expect(env.VITE_CLERK_JWT_TEMPLATE).toBeUndefined();
    expect(env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE).toBeUndefined();
    expect(env.VIPERCODE_RELAY_URL).toBeUndefined();
    expect(env.VITE_VIPERCODE_RELAY_URL).toBeUndefined();
    expect(env.VIPERCODE_MOBILE_OTLP_TRACES_URL).toBeUndefined();
    expect(env.VIPERCODE_MOBILE_OTLP_TRACES_DATASET).toBeUndefined();
    expect(env.VIPERCODE_MOBILE_OTLP_TRACES_TOKEN).toBeUndefined();
    expect(env.EXPO_PUBLIC_OTLP_TRACES_URL).toBeUndefined();
    expect(env.EXPO_PUBLIC_OTLP_TRACES_DATASET).toBeUndefined();
    expect(env.EXPO_PUBLIC_OTLP_TRACES_TOKEN).toBeUndefined();
  });

  it("applies process, root local, and root precedence in that order", () => {
    const repoRoot = makeTemporaryDirectory();
    writeFileSync(
      join(repoRoot, ".env"),
      "VIPERCODE_CLERK_PUBLISHABLE_KEY=pk_root\nVIPERCODE_CLERK_JWT_TEMPLATE=template_root\nVIPERCODE_CLERK_CLI_OAUTH_CLIENT_ID=oauth_root\nVIPERCODE_RELAY_URL=https://root.example.test\n",
    );
    writeFileSync(
      join(repoRoot, ".env.local"),
      "VIPERCODE_CLERK_PUBLISHABLE_KEY=pk_local\nVIPERCODE_CLERK_JWT_TEMPLATE=template_local\nVIPERCODE_CLERK_CLI_OAUTH_CLIENT_ID=oauth_local\nVIPERCODE_RELAY_URL=https://local.example.test\n",
    );

    expect(loadRepoEnv({ baseEnv: {}, repoRoot }).VIPERCODE_RELAY_URL).toBe(
      "https://local.example.test",
    );
    expect(
      loadRepoEnv({
        baseEnv: {
          VIPERCODE_CLERK_PUBLISHABLE_KEY: "pk_ci",
          VIPERCODE_CLERK_JWT_TEMPLATE: "template_ci",
          VIPERCODE_CLERK_CLI_OAUTH_CLIENT_ID: "oauth_ci",
          VIPERCODE_RELAY_URL: "https://ci.example.test",
        },
        repoRoot,
      }),
    ).toMatchObject({
      VIPERCODE_CLERK_PUBLISHABLE_KEY: "pk_ci",
      VIPERCODE_CLERK_CLI_OAUTH_CLIENT_ID: "oauth_ci",
      VITE_CLERK_PUBLISHABLE_KEY: "pk_ci",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_ci",
      VIPERCODE_CLERK_JWT_TEMPLATE: "template_ci",
      VITE_CLERK_JWT_TEMPLATE: "template_ci",
      EXPO_PUBLIC_CLERK_JWT_TEMPLATE: "template_ci",
      VIPERCODE_RELAY_URL: "https://ci.example.test",
      VITE_VIPERCODE_RELAY_URL: "https://ci.example.test",
    });
  });

  it("accepts legacy framework aliases as root overrides", () => {
    expect(
      resolvePublicConfig({
        VITE_CLERK_PUBLISHABLE_KEY: "pk_legacy",
        VITE_CLERK_JWT_TEMPLATE: "template_legacy",
        VIPERCODE_CLERK_CLI_OAUTH_CLIENT_ID: "oauth_canonical",
        VITE_VIPERCODE_RELAY_URL: "https://legacy.example.test",
        EXPO_PUBLIC_OTLP_TRACES_URL: "https://api.axiom.co/v1/traces",
        EXPO_PUBLIC_OTLP_TRACES_DATASET: "mobile-traces",
        EXPO_PUBLIC_OTLP_TRACES_TOKEN: "mobile-token",
      }),
    ).toEqual({
      clerkPublishableKey: "pk_legacy",
      clerkJwtTemplate: "template_legacy",
      clerkCliOAuthClientId: "oauth_canonical",
      relayUrl: "https://legacy.example.test",
      mobileOtlpTracesUrl: "https://api.axiom.co/v1/traces",
      mobileOtlpTracesDataset: "mobile-traces",
      mobileOtlpTracesToken: "mobile-token",
    });
  });

  it("projects canonical mobile tracing values to Expo public aliases", () => {
    expect(
      loadRepoEnv({
        baseEnv: {
          VIPERCODE_RELAY_URL: "https://relay.example.test",
          VIPERCODE_MOBILE_OTLP_TRACES_URL: "https://api.axiom.co/v1/traces",
          VIPERCODE_MOBILE_OTLP_TRACES_DATASET: "mobile-traces",
          VIPERCODE_MOBILE_OTLP_TRACES_TOKEN: "mobile-token",
        },
        repoRoot: makeTemporaryDirectory(),
      }),
    ).toEqual({
      VIPERCODE_RELAY_URL: "https://relay.example.test",
      VITE_VIPERCODE_RELAY_URL: "https://relay.example.test",
      VIPERCODE_MOBILE_OTLP_TRACES_URL: "https://api.axiom.co/v1/traces",
      VIPERCODE_MOBILE_OTLP_TRACES_DATASET: "mobile-traces",
      VIPERCODE_MOBILE_OTLP_TRACES_TOKEN: "mobile-token",
      EXPO_PUBLIC_OTLP_TRACES_URL: "https://api.axiom.co/v1/traces",
      EXPO_PUBLIC_OTLP_TRACES_DATASET: "mobile-traces",
      EXPO_PUBLIC_OTLP_TRACES_TOKEN: "mobile-token",
    });
  });
});

function makeTemporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "vipercode-public-config-"));
  temporaryDirectories.push(directory);
  return directory;
}

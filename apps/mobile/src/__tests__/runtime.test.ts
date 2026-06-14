import { describe, expect, it } from "vite-plus/test";
import {
  createKnownEnvironment,
  getKnownEnvironmentWsBaseUrl,
  getKnownEnvironmentHttpBaseUrl,
  getReconnectDelayMs,
  DEFAULT_RECONNECT_BACKOFF,
  isTransportConnectionErrorMessage,
  type MobileConnectionState,
  type MobileKnownEnvironmentRecord,
} from "../runtime/clientRuntimeImports.ts";

describe("client-runtime imports", () => {
  it("creates known environments", () => {
    const env = createKnownEnvironment({
      label: "Test",
      target: { httpBaseUrl: "https://test.local", wsBaseUrl: "wss://test.local" },
    });
    expect(env.label).toBe("Test");
    expect(env.source).toBe("manual");
    expect(getKnownEnvironmentWsBaseUrl(env)).toBe("wss://test.local");
    expect(getKnownEnvironmentHttpBaseUrl(env)).toBe("https://test.local");
  });

  it("handles null environment for base URL getters", () => {
    expect(getKnownEnvironmentWsBaseUrl(null)).toBeNull();
    expect(getKnownEnvironmentHttpBaseUrl(undefined)).toBeNull();
  });

  it("computes reconnect backoff delays", () => {
    expect(getReconnectDelayMs(0, DEFAULT_RECONNECT_BACKOFF)).toBe(1000);
    expect(getReconnectDelayMs(1, DEFAULT_RECONNECT_BACKOFF)).toBe(2000);
    expect(getReconnectDelayMs(6, DEFAULT_RECONNECT_BACKOFF)).toBe(64000);
    expect(getReconnectDelayMs(7, DEFAULT_RECONNECT_BACKOFF)).toBeNull();
  });

  it("classifies transport errors", () => {
    expect(isTransportConnectionErrorMessage("SocketCloseError: closed")).toBe(true);
    expect(isTransportConnectionErrorMessage("ping timeout")).toBe(true);
    expect(isTransportConnectionErrorMessage("some other error")).toBe(false);
    expect(isTransportConnectionErrorMessage(null)).toBe(false);
  });
});

describe("MobileConnectionState", () => {
  it("accepts valid states", () => {
    const states: MobileConnectionState[] = [
      "idle",
      "connecting",
      "connected",
      "reconnecting",
      "requires-auth",
      "error",
    ];
    expect(states).toHaveLength(6);
  });
});

describe("MobileKnownEnvironmentRecord", () => {
  it("serializes and deserializes", () => {
    const record: MobileKnownEnvironmentRecord = {
      version: 1,
      environmentId: "env-123" as MobileKnownEnvironmentRecord["environmentId"],
      label: "My PC",
      httpBaseUrl: "https://pc.local",
      wsBaseUrl: "wss://pc.local",
      createdAt: "2026-06-14T00:00:00Z",
      lastConnectedAt: null,
      relayManaged: { relayUrl: "https://relay.example.com" },
    };
    const json = JSON.stringify(record);
    const parsed = JSON.parse(json) as MobileKnownEnvironmentRecord;
    expect(parsed.version).toBe(1);
    expect(parsed.label).toBe("My PC");
    expect(parsed.lastConnectedAt).toBeNull();
    expect(parsed.relayManaged?.relayUrl).toBe("https://relay.example.com");
  });
});

import type {
  MobileConnectionState,
  MobileKnownEnvironmentRecord,
} from "../runtime/clientRuntimeImports.ts";

export type ConnectionErrorKind =
  | "auth-failure"
  | "relay-unavailable"
  | "endpoint-unreachable"
  | "network-offline"
  | "version-drift"
  | "server-unavailable"
  | "timeout"
  | "unknown";

export interface ConnectionError {
  readonly kind: ConnectionErrorKind;
  readonly message: string;
  readonly recoverable: boolean;
}

export function resolveErrorAction(kind: ConnectionErrorKind): string {
  switch (kind) {
    case "auth-failure":
      return "Sign in again or refresh your Viper Connect session.";
    case "relay-unavailable":
      return "Check that Viper Connect relay is online. Retry will happen automatically.";
    case "endpoint-unreachable":
      return "The environment may be offline or behind a firewall. Verify the server is running.";
    case "network-offline":
      return "Check your internet connection. The app will reconnect automatically.";
    case "version-drift":
      return "The mobile app version is incompatible with the server. Update both to the latest version.";
    case "server-unavailable":
      return "The Viper Code server is not reachable. Ensure it is running and network access is enabled.";
    case "timeout":
      return "Connection timed out. The server may be under heavy load. Retrying...";
    case "unknown":
    default:
      return "An unexpected error occurred. Check your connection and try again.";
  }
}

export interface ConnectionEntry {
  readonly environmentId: string;
  readonly record: MobileKnownEnvironmentRecord;
  readonly state: MobileConnectionState;
  readonly error: string | null;
  readonly errorKind: ConnectionErrorKind | null;
  readonly lastConnectedAt: string | null;
}

export type ConnectionStoreListener = () => void;

export class MobileConnectionStore {
  private entries = new Map<string, ConnectionEntry>();
  private listeners = new Set<ConnectionStoreListener>();
  private snapshot: ReadonlyArray<ConnectionEntry> = [];

  get(environmentId: string): ConnectionEntry | undefined {
    return this.entries.get(environmentId);
  }

  getAll(): ReadonlyArray<ConnectionEntry> {
    return this.snapshot;
  }

  getState(environmentId: string): MobileConnectionState {
    return this.entries.get(environmentId)?.state ?? "idle";
  }

  setState(
    environmentId: string,
    state: MobileConnectionState,
    error?: string | null,
    errorKind?: ConnectionErrorKind | null,
  ): void {
    const existing = this.entries.get(environmentId);
    if (!existing) return;
    this.entries.set(environmentId, {
      ...existing,
      state,
      error: error ?? null,
      errorKind: errorKind ?? null,
      lastConnectedAt: state === "connected" ? new Date().toISOString() : existing.lastConnectedAt,
    });
    this.snapshot = Array.from(this.entries.values());
    this.notify();
  }

  upsert(record: MobileKnownEnvironmentRecord): void {
    const existing = this.entries.get(record.environmentId);
    this.entries.set(record.environmentId, {
      environmentId: record.environmentId,
      record,
      state: existing?.state ?? "idle",
      error: existing?.error ?? null,
      errorKind: existing?.errorKind ?? null,
      lastConnectedAt: existing?.lastConnectedAt ?? record.lastConnectedAt,
    });
    this.snapshot = Array.from(this.entries.values());
    this.notify();
  }

  remove(environmentId: string): void {
    this.entries.delete(environmentId);
    this.snapshot = Array.from(this.entries.values());
    this.notify();
  }

  subscribe(listener: ConnectionStoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // ignore listener errors
      }
    }
  }
}

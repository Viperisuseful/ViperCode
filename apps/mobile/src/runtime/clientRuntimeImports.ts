import {
  createKnownEnvironment,
  type KnownEnvironment,
  getKnownEnvironmentWsBaseUrl,
  getKnownEnvironmentHttpBaseUrl,
  attachEnvironmentDescriptor,
  getReconnectDelayMs,
  DEFAULT_RECONNECT_BACKOFF,
  type ReconnectBackoffConfig,
  isTransportConnectionErrorMessage,
  sanitizeThreadErrorMessage,
  ManagedRelayClient,
  ManagedRelayDpopSigner,
  type ManagedRelayClientShape,
  type ManagedRelayDpopSignerShape,
  type ManagedRelayClientError,
  type ManagedRelayDpopSignerError,
} from "@vipercode/client-runtime";
import type { EnvironmentId } from "@vipercode/contracts";

export type {
  KnownEnvironment,
  ReconnectBackoffConfig,
  ManagedRelayClientShape,
  ManagedRelayDpopSignerShape,
  ManagedRelayClientError,
  ManagedRelayDpopSignerError,
};

export {
  createKnownEnvironment,
  getKnownEnvironmentWsBaseUrl,
  getKnownEnvironmentHttpBaseUrl,
  attachEnvironmentDescriptor,
  getReconnectDelayMs,
  DEFAULT_RECONNECT_BACKOFF,
  isTransportConnectionErrorMessage,
  sanitizeThreadErrorMessage,
  ManagedRelayClient,
  ManagedRelayDpopSigner,
};

export type MobileConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "requires-auth"
  | "error";

export interface MobileKnownEnvironmentRecord {
  readonly version: 1;
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly httpBaseUrl: string;
  readonly wsBaseUrl: string;
  readonly createdAt: string;
  readonly lastConnectedAt: string | null;
  readonly relayManaged?: {
    readonly relayUrl: string;
  };
}

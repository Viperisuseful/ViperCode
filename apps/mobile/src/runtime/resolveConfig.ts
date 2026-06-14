import Constants from "expo-constants";
import type { MobilePublicConfig } from "./publicConfig.ts";

export function resolveMobilePublicConfig(): MobilePublicConfig {
  const extra = Constants.expoConfig?.extra;
  return {
    clerkPublishableKey: extra?.clerkPublishableKey || undefined,
    clerkJwtTemplate: extra?.clerkJwtTemplate || undefined,
    relayUrl: extra?.relayUrl || undefined,
  };
}

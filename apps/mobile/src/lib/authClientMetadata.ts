import type { AuthClientPresentationMetadata } from "@vipercode/contracts";
import { Platform } from "react-native";

export function mobileAuthClientMetadata(): AuthClientPresentationMetadata {
  return {
    label: "T3 Code Mobile",
    deviceType: "mobile",
    ...(Platform.OS === "ios" ? { os: "iOS" } : Platform.OS === "android" ? { os: "Android" } : {}),
  };
}

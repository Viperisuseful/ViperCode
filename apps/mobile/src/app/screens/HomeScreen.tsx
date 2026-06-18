import { useAuth } from "@clerk/clerk-expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  useState,
} from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Line } from "react-native-svg";
import type { RootStackParamList } from "../navigation/AppNavigator.tsx";
import { theme } from "../../theme/index.ts";
import { loadKnownEnvironments } from "../../storage/environmentStore.ts";
import type {
  MobileKnownEnvironmentRecord,
  MobileConnectionState,
} from "../../runtime/clientRuntimeImports.ts";
import { useRelayEnvironments } from "../../runtime/useRelayEnvironments.ts";
import { useConnectionStore, useConnectionService } from "../../connections/ConnectionProvider.tsx";
import { hasRelayConfig } from "../../runtime/mobileRuntime.ts";
import { resolveMobilePublicConfig } from "../../runtime/resolveConfig.ts";
import { ViperCodeHeaderTitle } from "../../components/ViperCodeLogo.tsx";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

function statusColor(state: MobileConnectionState): string {
  switch (state) {
    case "connected":
      return theme.colors.success;
    case "connecting":
    case "reconnecting":
      return theme.colors.warning;
    case "error":
    case "requires-auth":
      return theme.colors.error;
    default:
      return theme.colors.textMuted;
  }
}

function statusLabel(state: MobileConnectionState): string {
  switch (state) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "error":
      return "Error";
    case "requires-auth":
      return "Auth required";
    default:
      return "Idle";
  }
}

function PlusIcon({ color, size = 22 }: { readonly color: string; readonly size?: number }) {
  const half = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <Line
        x1={half}
        y1={2}
        x2={half}
        y2={size - 2}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Line
        x1={2}
        y1={half}
        x2={size - 2}
        y2={half}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MenuIcon({ color, size = 22 }: { readonly color: string; readonly size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <Line
        x1={2}
        y1={size * 0.25}
        x2={size - 2}
        y2={size * 0.25}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Line
        x1={2}
        y1={size * 0.5}
        x2={size - 2}
        y2={size * 0.5}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Line
        x1={2}
        y1={size * 0.75}
        x2={size - 2}
        y2={size * 0.75}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { isSignedIn } = useAuth();
  const store = useConnectionStore();
  const service = useConnectionService();
  const relay = useRelayEnvironments();
  const [pairedEnvs, setPairedEnvs] = useState<ReadonlyArray<MobileKnownEnvironmentRecord>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const headerRight = useCallback(
    () => (
      <View style={styles.headerActions}>
        <Pressable
          onPress={() => navigation.navigate("Pair")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerAction}
        >
          <PlusIcon color={theme.colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerAction}
        >
          <MenuIcon color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    ),
    [navigation],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: ViperCodeHeaderTitle,
      headerRight,
    });
  }, [navigation, headerRight]);

  const entries = useSyncExternalStore(
    useCallback((onChange: () => void) => store.subscribe(onChange), [store]),
    useCallback(() => store.getAll(), [store]),
  );

  useEffect(() => {
    void loadKnownEnvironments().then((envs) => {
      setPairedEnvs(envs);
      setIsLoading(false);
    });
  }, []);

  const hasRelay = hasRelayConfig && isSignedIn;
  const hasPaired = pairedEnvs.length > 0;
  const hasRelayEnvs = relay.data !== null && relay.data.length > 0;
  const isEmpty = !hasPaired && (!hasRelay || !hasRelayEnvs);

  const environments = [
    ...pairedEnvs,
    ...(relay.data ?? []).map((re) => ({
      version: 1 as const,
      environmentId: re.environmentId as MobileKnownEnvironmentRecord["environmentId"],
      label: re.label,
      httpBaseUrl: re.endpoint.httpBaseUrl,
      wsBaseUrl: re.endpoint.wsBaseUrl,
      createdAt: re.linkedAt,
      lastConnectedAt: null,
      relayManaged: { relayUrl: resolveMobilePublicConfig().relayUrl ?? "" },
    })),
  ];

  const renderEnvironment = useCallback(
    ({ item }: { readonly item: (typeof environments)[number] }) => {
      const entry = entries.find((e) => e.environmentId === item.environmentId);
      const state = entry?.state ?? "idle";
      return (
        <View>
          <Pressable
            style={styles.envRow}
            onPress={() => {
              void service.connectEnvironment(item.environmentId);
              navigation.navigate("EnvironmentThreads", {
                environmentId: item.environmentId,
                label: item.label,
              });
            }}
          >
            <View style={styles.envInfo}>
              <Text style={styles.envLabel}>{item.label}</Text>
              <Text style={styles.envUrl}>{item.httpBaseUrl}</Text>
            </View>
            <View style={styles.envStatusCol}>
              <View style={[styles.envStatus, { backgroundColor: statusColor(state) }]} />
              <Text style={styles.envStatusText}>{statusLabel(state)}</Text>
            </View>
          </Pressable>
          {entry?.error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{entry.error}</Text>
              <Pressable onPress={() => service.connectEnvironment(item.environmentId)}>
                <Text style={styles.errorBannerAction}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );
    },
    [entries, navigation, service],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading environments...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <ViperCodeHeaderTitle />
          {isSignedIn ? (
            <>
              <Text style={styles.subtitle}>No environments yet.</Text>
              <Text style={styles.hint}>
                {hasRelayConfig
                  ? "Enable Viper Connect on your desktop under Settings > Connections, or pair manually below."
                  : "Pair with your desktop over Tailscale or LAN using the button below."}
              </Text>
              <Pressable
                style={styles.pairButtonPrimary}
                onPress={() => navigation.navigate("Pair")}
              >
                <Text style={styles.pairButtonPrimaryText}>Pair Environment</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>Sign in to see your environments.</Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={environments}
          keyExtractor={(item) => item.environmentId}
          contentContainerStyle={styles.listContent}
          renderItem={renderEnvironment}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
    fontFamily: theme.font.sans,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    fontFamily: theme.font.sans,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    fontFamily: theme.font.sans,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: theme.spacing.md,
  },
  envRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 56,
  },
  envInfo: {
    flex: 1,
  },
  envLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.font.sans,
  },
  envUrl: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontFamily: theme.font.mono,
  },
  envStatusCol: {
    alignItems: "flex-end",
    marginLeft: theme.spacing.sm,
  },
  envStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  envStatusText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontFamily: theme.font.sans,
  },
  errorBanner: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
    fontFamily: theme.font.sans,
  },
  errorBannerAction: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.error,
    fontFamily: theme.font.sans,
  },
  pairButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: "center",
    marginTop: theme.spacing.lg,
    minWidth: 200,
    height: 48,
    justifyContent: "center",
  },
  pairButtonPrimaryText: {
    color: theme.colors.primaryForeground,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.font.sans,
  },
});

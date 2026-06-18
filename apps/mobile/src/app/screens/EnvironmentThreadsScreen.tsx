import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EnvironmentId, ThreadId } from "@vipercode/contracts";
import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { RootStackParamList } from "../navigation/AppNavigator.tsx";
import { theme } from "../../theme/index.ts";
import { useShellSnapshot } from "../../shell/useShellSnapshot.ts";
import type { ProviderInfo } from "../../shell/shellTypes.ts";

type Props = NativeStackScreenProps<RootStackParamList, "EnvironmentThreads">;

function threadStatusColor(status: string): string {
  switch (status) {
    case "running":
    case "starting":
    case "ready":
      return theme.colors.success;
    case "interrupted":
      return theme.colors.warning;
    case "error":
    case "stopped":
      return theme.colors.error;
    default:
      return theme.colors.textMuted;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "starting":
      return "Starting";
    case "running":
      return "Running";
    case "ready":
      return "Ready";
    case "interrupted":
      return "Paused";
    case "stopped":
      return "Stopped";
    case "error":
      return "Error";
    default:
      return status;
  }
}

export function EnvironmentThreadsScreen({ navigation, route }: Props) {
  const { environmentId } = route.params;
  const shell = useShellSnapshot(environmentId as EnvironmentId);

  const selectableProviders = useMemo<ReadonlyArray<ProviderInfo>>(
    () =>
      shell.providers.filter(
        (p) => p.enabled && p.installed && p.availability !== "unavailable" && p.status === "ready",
      ),
    [shell.providers],
  );

  const headerRight = useCallback(
    () => (
      <Pressable
        onPress={() =>
          navigation.navigate("NewThread", {
            environmentId,
            label: route.params.label,
            projects: shell.projects.map((p) => ({
              id: p.id,
              title: p.title,
              workspaceRoot: p.workspaceRoot,
            })),
            providers: selectableProviders,
          })
        }
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.headerAction}
      >
        <Text style={styles.headerButton}>+ New</Text>
      </Pressable>
    ),
    [navigation, environmentId, route.params.label, shell.projects, selectableProviders],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerRight });
  }, [navigation, headerRight]);

  const sections = useMemo(() => {
    if (shell.threads.length === 0) {
      return [];
    }
    const projectMap = new Map<string, string>();
    for (const project of shell.projects) {
      projectMap.set(project.id, project.title);
    }
    const grouped = new Map<string, typeof shell.threads>();
    for (const thread of shell.threads) {
      const projectTitle = projectMap.get(thread.projectId) ?? "Unknown Project";
      const existing = grouped.get(projectTitle);
      if (existing) {
        grouped.set(projectTitle, [...existing, thread]);
      } else {
        grouped.set(projectTitle, [thread]);
      }
    }
    return Array.from(grouped.entries()).map(([title, data]) => ({ title, data }));
  }, [shell]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {shell.isPending && shell.threads.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading threads...</Text>
        </View>
      ) : shell.error && shell.threads.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{shell.error}</Text>
          </View>
        </View>
      ) : !shell.isPending && shell.threads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Threads</Text>
          <Text style={styles.emptyHint}>
            No threads in this environment. Start a new thread from the web app.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={styles.threadRow}
              onPress={() =>
                navigation.navigate("ThreadDetail", {
                  environmentId,
                  threadId: item.id as ThreadId,
                  title: item.title,
                })
              }
            >
              <View style={styles.threadInfo}>
                <Text style={styles.threadTitle}>{item.title}</Text>
                <Text style={styles.threadMeta}>
                  {statusLabel(item.status)}
                  {item.hasPendingApprovals ? " · Needs Approval" : ""}
                  {item.hasPendingUserInput ? " · Needs Input" : ""}
                </Text>
              </View>
              <View
                style={[styles.statusDot, { backgroundColor: threadStatusColor(item.status) }]}
              />
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
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
    padding: theme.spacing.lg,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.font.sans,
  },
  emptyHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontFamily: theme.font.sans,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    fontFamily: theme.font.sans,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: theme.font.sans,
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 48,
  },
  threadInfo: {
    flex: 1,
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.font.sans,
  },
  threadMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontFamily: theme.font.sans,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: theme.spacing.sm,
  },
  headerAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  headerButton: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.font.sans,
  },
  errorBanner: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 12,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    width: "100%",
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
});

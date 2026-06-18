import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme/index.ts";

interface Props {
  readonly status: string;
  readonly onStop: () => void;
  readonly onRetry: () => void;
}

function isRunning(status: string): boolean {
  return status === "running" || status === "starting";
}

function canRetry(status: string): boolean {
  return status === "error" || status === "stopped" || status === "interrupted";
}

export function AgentControls({ status, onStop, onRetry }: Props) {
  const [confirming, setConfirming] = useState(false);

  const handleStop = useCallback(() => {
    if (confirming) {
      onStop();
      setConfirming(false);
    } else {
      Alert.alert(
        "Stop Agent",
        "Are you sure you want to stop the running agent? This will interrupt the current turn.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Stop", style: "destructive", onPress: onStop },
        ],
      );
    }
  }, [confirming, onStop]);

  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  if (!isRunning(status) && !canRetry(status)) {
    return null;
  }

  return (
    <View style={styles.container}>
      {isRunning(status) && (
        <Pressable onPress={handleStop}>
          <Text style={styles.stopText}>Stop</Text>
        </Pressable>
      )}
      {canRetry(status) && (
        <Pressable onPress={handleRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  stopText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.error,
    fontFamily: theme.font.sans,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    fontFamily: theme.font.sans,
  },
});

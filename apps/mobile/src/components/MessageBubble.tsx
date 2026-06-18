import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme/index.ts";
import type { ThreadMessage } from "../thread/threadTypes.ts";

interface Props {
  readonly message: ThreadMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.text}
        </Text>
        {message.streaming && <Text style={styles.streamingBadge}>streaming</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: theme.radius.card,
    maxWidth: "85%",
    padding: theme.spacing.md,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.font.sans,
  },
  userText: {
    color: theme.colors.primaryForeground,
  },
  assistantText: {
    color: theme.colors.text,
  },
  streamingBadge: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontFamily: theme.font.sans,
  },
});

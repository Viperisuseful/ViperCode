import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ThreadId } from "@vipercode/contracts";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../navigation/AppNavigator.tsx";
import { theme } from "../../theme/index.ts";
import { useThreadDetail, setThreadDetail } from "../../thread/useThreadDetail.ts";
import type { ThreadMessage } from "../../thread/threadTypes.ts";
import { EMPTY_THREAD_DETAIL } from "../../thread/threadTypes.ts";
import { MessageBubble } from "../../components/MessageBubble.tsx";
import { Composer } from "../../components/Composer.tsx";

type Props = NativeStackScreenProps<RootStackParamList, "ThreadDetail">;

function generateMessageId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function ThreadDetailScreen({ navigation, route }: Props) {
  const { threadId, title } = route.params;
  const tid = threadId as ThreadId;
  const detail = useThreadDetail(tid);
  const flatListRef = useRef<FlatList<ThreadMessage>>(null);
  const [sending, setSending] = useState(false);
  const [sendGuard, setSendGuard] = useState<string | null>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: title || "Thread" });
    // Initialize empty detail state on mount
    setThreadDetail(tid, { ...EMPTY_THREAD_DETAIL, threadId: tid, isPending: true });
    scrollToEnd();
  }, [tid, title, navigation, scrollToEnd]);

  const handleSend = useCallback(
    (text: string) => {
      if (sending || sendGuard === text) return;

      setSending(true);
      setSendGuard(text);

      const now = new Date().toISOString();
      const messageId = generateMessageId();
      const userMessage: ThreadMessage = {
        id: messageId,
        role: "user",
        text,
        streaming: false,
        turnId: null,
        createdAt: now,
      };

      const current = { ...detail };
      if (current.messages.length === 0 && current.threadId === ("" as ThreadId)) {
        current.threadId = tid;
      }
      current.messages = [...current.messages, userMessage];
      setThreadDetail(tid, { ...current, isPending: false });

      // TODO: dispatch ThreadTurnStartCommand via client RPC when connection is wired
      // mobileRuntime.runPromise(
      //   ManagedRelayClient.pipe(
      //     Effect.flatMap(client => client.orchestration.command.dispatchCommand({...}))
      //   )
      // ).then(...)

      setTimeout(() => {
        setSending(false);
        setSendGuard(null);
        scrollToEnd();
      }, 300);
    },
    [detail, tid, scrollToEnd, sending, sendGuard],
  );

  const messages = detail.messages.length > 0 ? detail.messages : detail.isPending ? [] : [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {detail.isPending && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading thread...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No messages yet.</Text>
          <Text style={styles.loadingHint}>Send a message to start the conversation.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
        />
      )}
      <Composer onSend={handleSend} disabled={sending} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  messageList: {
    paddingVertical: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  loadingHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});

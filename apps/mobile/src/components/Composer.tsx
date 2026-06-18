import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Svg, { Line, Polyline } from "react-native-svg";
import { theme } from "../theme/index.ts";

interface Props {
  readonly onSend: (text: string) => void;
  readonly disabled?: boolean;
}

function SendIcon({
  size = 16,
  color = theme.colors.primaryForeground,
}: {
  readonly size?: number;
  readonly color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <Polyline
        points={`${size * 0.25},${size * 0.75} ${size * 0.5},${size * 0.25} ${size * 0.75},${size * 0.75}`}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={size * 0.5}
        y1={size * 0.25}
        x2={size * 0.5}
        y2={size * 0.75}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function Composer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.clear();
  }, [text, onSend, disabled]);

  const isDisabled = !text.trim() || disabled;

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type a message..."
        placeholderTextColor={theme.colors.textMuted}
        multiline
        editable={!disabled}
        autoCapitalize="sentences"
        autoCorrect
      />
      <Pressable
        style={({ pressed }) => [
          styles.sendButton,
          isDisabled && styles.sendButtonDisabled,
          pressed && !isDisabled && { opacity: 0.8 },
        ]}
        onPress={handleSend}
        disabled={isDisabled}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <SendIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    paddingBottom: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 15,
    maxHeight: 120,
    marginRight: 8,
    fontFamily: theme.font.sans,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
});

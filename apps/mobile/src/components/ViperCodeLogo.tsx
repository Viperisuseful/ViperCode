import React from "react";
import type { ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { theme } from "../theme/index.ts";

interface ViperCodeMarkProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function ViperCodeMark({ size = 28, color = theme.colors.text, style }: ViperCodeMarkProps) {
  const width = size * (72 / 32);
  return (
    <Svg width={width} height={size} viewBox="0 0 72 32" fill="none" style={style}>
      <Path
        d="M4 4 L16 28 L28 4"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M37 6 L47 16 L37 26"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x={54} y={26} width={16} height={5} rx={2.5} fill={color} />
    </Svg>
  );
}

export function ViperCodeHeaderTitle() {
  return (
    <View style={styles.headerTitle}>
      <ViperCodeMark size={28} />
      <Text style={styles.wordmark}>Viper Code</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wordmark: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    fontFamily: theme.font.sans,
  },
});

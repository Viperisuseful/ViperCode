import React from "react";
import type { ImageStyle } from "react-native";
import { Image, StyleSheet, View } from "react-native";

const logoSource = require("../../assets/viper-logo-white.png");

// The provided logo is 1738x289 (~6:1 aspect ratio).
const LOGO_ASPECT = 1738 / 289;

interface ViperCodeMarkProps {
  size?: number;
  color?: string;
  style?: ImageStyle;
}

export function ViperCodeMark({ size = 28, style }: ViperCodeMarkProps) {
  return (
    <Image
      source={logoSource}
      style={[{ width: size * LOGO_ASPECT, height: size }, style]}
      resizeMode="contain"
    />
  );
}

export function ViperCodeHeaderTitle() {
  return (
    <View style={styles.headerTitle}>
      <ViperCodeMark size={22} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
});

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { RootStackParamList } from "../navigation/AppNavigator.tsx";
import { theme } from "../../theme/index.ts";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen(_props: Props) {
  return (
    <View style={styles.container}>
      {/* oxlint-disable-next-line react/style-prop-object -- expo-status-bar uses string style */}
      <StatusBar style="light" />
      <Text style={styles.title}>Viper Code</Text>
      <Text style={styles.subtitle}>Mobile scaffold ready (Phase 1).</Text>
      <Text style={styles.hint}>Environment discovery and connection coming in later phases.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});

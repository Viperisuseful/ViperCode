import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme/index.ts";
import type { ThreadPlan } from "../thread/threadTypes.ts";

interface Props {
  readonly plan: ThreadPlan;
}

export function PlanCard({ plan }: Props) {
  const isImplemented = plan.implementedAt !== null;

  return (
    <View style={[styles.card, isImplemented && styles.cardImplemented]}>
      <View style={styles.header}>
        <View style={[styles.badge, isImplemented ? styles.badgeImplemented : styles.badgeActive]}>
          <Text style={styles.badgeText}>{isImplemented ? "Implemented" : "Proposed Plan"}</Text>
        </View>
      </View>
      <Text style={styles.planMarkdown} numberOfLines={20}>
        {plan.planMarkdown}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  cardImplemented: {
    borderColor: theme.colors.success,
    opacity: 0.85,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeActive: {
    backgroundColor: theme.colors.primary,
  },
  badgeImplemented: {
    backgroundColor: theme.colors.success,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.background,
    textTransform: "uppercase",
  },
  planMarkdown: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    fontFamily: "monospace",
  },
});

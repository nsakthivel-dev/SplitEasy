import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import { Group } from "@/utils/storage";
import { formatDate } from "@/utils/helpers";

interface Props {
  group: Group;
  onPress: () => void;
}

export function GroupCard({ group, onPress }: Props) {
  const lastActivity =
    group.expenses.length > 0
      ? formatDate(group.expenses[group.expenses.length - 1].date)
      : formatDate(group.createdAt);

  const total = group.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconWrap}>
        <Ionicons name="people" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{group.members.length} members</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{lastActivity}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.code}>{group.code}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  metaText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  dot: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  code: {
    fontSize: FONT_SIZE.xs,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
});

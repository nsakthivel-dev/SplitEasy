import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import { Debt } from "@/utils/balance";
import { MemberAvatar } from "./MemberAvatar";
import { formatCurrency } from "@/utils/helpers";

interface Props {
  debt: Debt;
  fromIndex: number;
  toIndex: number;
}

export function DebtRow({ debt, fromIndex, toIndex }: Props) {
  return (
    <View style={styles.row}>
      <MemberAvatar name={debt.from.name} index={fromIndex} size={36} fontSize={13} />
      <View style={styles.info}>
        <Text style={styles.text}>
          <Text style={styles.name}>{debt.from.name}</Text>
          <Text style={styles.owes}> owes </Text>
          <Text style={styles.name}>{debt.to.name}</Text>
        </Text>
      </View>
      <View style={styles.arrowWrap}>
        <Ionicons name="arrow-forward" size={14} color={COLORS.textSecondary} />
      </View>
      <MemberAvatar name={debt.to.name} index={toIndex} size={36} fontSize={13} />
      <Text style={styles.amount}>{formatCurrency(debt.amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  info: {
    flex: 1,
  },
  text: {
    fontSize: FONT_SIZE.sm,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
  },
  owes: {
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  arrowWrap: {
    paddingHorizontal: 2,
  },
  amount: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
  },
});

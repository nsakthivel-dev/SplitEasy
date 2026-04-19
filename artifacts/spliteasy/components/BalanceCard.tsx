import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import { MemberBalance } from "@/utils/balance";
import { MemberAvatar } from "./MemberAvatar";
import { formatCurrency } from "@/utils/helpers";

interface Props {
  balance: MemberBalance;
  index: number;
}

export function BalanceCard({ balance, index }: Props) {
  const net = balance.net;
  const isPositive = net >= 0;

  return (
    <View style={styles.card}>
      <MemberAvatar
        name={balance.member.name}
        index={index}
        size={44}
        avatarUri={balance.member.avatarUri}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{balance.member.name}</Text>
        <Text style={styles.paid}>Paid {formatCurrency(balance.totalPaid)}</Text>
      </View>
      <View style={styles.netWrap}>
        <Text style={[styles.net, { color: isPositive ? COLORS.success : COLORS.danger }]}>
          {isPositive ? "+" : ""}{formatCurrency(net)}
        </Text>
        <Text style={[styles.netLabel, { color: isPositive ? COLORS.success : COLORS.danger }]}>
          {isPositive ? "gets back" : "owes"}
        </Text>
      </View>
    </View>
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
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  paid: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  netWrap: {
    alignItems: "flex-end",
  },
  net: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_700Bold",
  },
  netLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: "Inter_400Regular",
  },
});

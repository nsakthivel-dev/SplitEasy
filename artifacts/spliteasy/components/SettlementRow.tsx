import React from "react";
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import { Settlement } from "@/utils/storage";
import { Member } from "@/utils/storage";
import { MemberAvatar } from "./MemberAvatar";
import { formatCurrency } from "@/utils/helpers";

interface Props {
  settlement: Settlement;
  members: Member[];
  onMarkPaid: () => void;
}

export function SettlementRow({ settlement, members, onMarkPaid }: Props) {
  const from = members.find((m) => m.id === settlement.fromId);
  const to = members.find((m) => m.id === settlement.toId);
  const fromIdx = members.findIndex((m) => m.id === settlement.fromId);
  const toIdx = members.findIndex((m) => m.id === settlement.toId);

  const handleUPI = () => {
    const url = `upi://pay?pa=&am=${settlement.amount.toFixed(2)}&cu=INR`;
    Linking.openURL(url).catch(() => {});
  };

  if (settlement.isPaid) {
    return (
      <View style={[styles.row, styles.paid]}>
        <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
        <Text style={styles.paidText}>
          {from?.name} paid {to?.name} {formatCurrency(settlement.amount)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <MemberAvatar
        name={from?.name || "?"}
        index={fromIdx}
        size={36}
        fontSize={13}
        avatarUri={from?.avatarUri}
      />
      <View style={styles.arrowWrap}>
        <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
      </View>
      <MemberAvatar
        name={to?.name || "?"}
        index={toIdx}
        size={36}
        fontSize={13}
        avatarUri={to?.avatarUri}
      />
      <View style={styles.info}>
        <Text style={styles.names}>
          {from?.name} → {to?.name}
        </Text>
        <Text style={styles.amount}>{formatCurrency(settlement.amount)}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.markPaidBtn} onPress={onMarkPaid} activeOpacity={0.75}>
          <Text style={styles.markPaidText}>Mark Paid</Text>
        </TouchableOpacity>
        {Platform.OS !== "web" && (
          <TouchableOpacity style={styles.upiBtn} onPress={handleUPI} activeOpacity={0.75}>
            <Ionicons name="qr-code-outline" size={14} color={COLORS.primary} />
            <Text style={styles.upiText}>UPI</Text>
          </TouchableOpacity>
        )}
      </View>
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
  paid: {
    opacity: 0.6,
  },
  arrowWrap: {
    paddingHorizontal: 2,
  },
  info: {
    flex: 1,
  },
  names: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
    color: COLORS.textPrimary,
  },
  amount: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
  },
  paidText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  actions: {
    flexDirection: "column",
    gap: SPACING.xs,
    alignItems: "stretch",
  },
  markPaidBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    alignItems: "center",
  },
  markPaidText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.primary,
  },
  upiBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
  },
  upiText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: "Inter_500Medium",
    color: COLORS.primary,
  },
});

import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import { Expense, Member } from "@/utils/storage";
import { formatCurrency, formatDate } from "@/utils/helpers";
import { calculateMemberNets } from "@/utils/balance";

interface Props {
  expense: Expense;
  members: Member[];
  onDelete: () => void;
}

export function ExpenseCard({ expense, members, onDelete }: Props) {
  const category = CATEGORIES.find((c) => c.key === expense.category) || CATEGORIES[CATEGORIES.length - 1];
  const translateX = useRef(new Animated.Value(0)).current;
  const showDelete = useRef(false);
  const [expanded, setExpanded] = useState(false);

  const memberNets = calculateMemberNets(expense, members);

  // Get payer information
  const payerText = expense.payers.map((p) => {
    const member = members.find((m) => m.id === p.memberId);
    return `${member?.name || "Unknown"} (${formatCurrency(p.amountPaid)})`;
  }).join(", ");

  // Get split among information
  const splitAmongText = expense.splitAmong.map((id) => {
    const member = members.find((m) => m.id === id);
    return member?.name || "Unknown";
  }).join(", ");

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.setValue(Math.max(g.dx, -80));
        } else if (showDelete.current) {
          translateX.setValue(Math.min(-80 + g.dx, 0));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          Animated.spring(translateX, { toValue: -80, useNativeDriver: true }).start();
          showDelete.current = true;
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          showDelete.current = false;
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Alert.alert("Delete Expense", `Delete "${expense.title}"?`, [
      { text: "Cancel", style: "cancel", onPress: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        showDelete.current = false;
      }},
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
        <Ionicons name="trash" size={22} color="#fff" />
      </TouchableOpacity>
      <Animated.View
        style={[styles.card, { transform: [{ translateX: Platform.OS === "web" ? 0 : translateX }] }]}
        {...(Platform.OS !== "web" ? panResponder.panHandlers : {})}
      >
        <View style={[styles.catIcon, { backgroundColor: category.color + "22" }]}>
          <Ionicons name={category.icon as any} size={20} color={category.color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{expense.title}</Text>
          {expense.description && (
            <Text style={styles.description} numberOfLines={1}>{expense.description}</Text>
          )}
          <Text style={styles.meta}>
            Paid by {payerText}
          </Text>
          <Text style={styles.meta}>
            Split among: {splitAmongText}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {Platform.OS === "web" && (
            <TouchableOpacity onPress={handleDelete} style={styles.webDelete}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.expandedTitle}>Net for this expense:</Text>
          {memberNets.map((mn) => {
            const isPositive = mn.net > 0.01;
            const isNegative = mn.net < -0.01;
            const isZero = !isPositive && !isNegative;
            return (
              <View key={mn.memberId} style={styles.netRow}>
                <Text style={styles.netName}>{mn.name}</Text>
                <Text
                  style={[
                    styles.netAmount,
                    isPositive && styles.netPositive,
                    isNegative && styles.netNegative,
                    isZero && styles.netZero,
                  ]}
                >
                  {isZero ? "Even" : isPositive ? `Gets back ${formatCurrency(mn.net)}` : `Owes ${formatCurrency(Math.abs(mn.net))}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginBottom: SPACING.sm,
  },
  deleteBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 72,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  description: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  meta: {
    fontSize: FONT_SIZE.xs,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    marginBottom: 1,
  },
  expandBtn: {
    padding: 4,
  },
  expandedContent: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: -SPACING.sm + 2,
    marginBottom: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  expandedTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  netName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textPrimary,
  },
  netAmount: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
  },
  netPositive: {
    color: COLORS.success,
  },
  netNegative: {
    color: COLORS.danger,
  },
  netZero: {
    color: COLORS.textSecondary,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
  },
  webDelete: {
    padding: 4,
  },
});

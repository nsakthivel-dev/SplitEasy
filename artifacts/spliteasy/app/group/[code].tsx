import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { CATEGORIES, COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import type { CategoryKey } from "@/constants/theme";
import {
  getGroupByCode,
  saveGroup,
  Group,
  Expense,
  Member,
  Split,
} from "@/utils/storage";
import { generateId, formatCurrency, formatDate } from "@/utils/helpers";
import { calculateBalances, simplifyDebts, Debt, MemberBalance } from "@/utils/balance";
import { ExpenseCard } from "@/components/ExpenseCard";
import { BalanceCard } from "@/components/BalanceCard";
import { DebtRow } from "@/components/DebtRow";
import { SettlementRow } from "@/components/SettlementRow";
import { EmptyState } from "@/components/EmptyState";
import { CategoryChip } from "@/components/CategoryChip";
import { Toast, useToast } from "@/components/Toast";

type Tab = "expenses" | "balances" | "settle";

export default function GroupDashboard() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [group, setGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toastMsg, toastVisible, showToast, hideToast } = useToast();

  // Add expense form state
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState<CategoryKey>("food");
  const [expPaidBy, setExpPaidBy] = useState("");
  const [expSplitType, setExpSplitType] = useState<"equal" | "custom">("equal");
  const [expCustomSplits, setExpCustomSplits] = useState<Record<string, string>>({});

  const loadGroup = useCallback(async () => {
    if (!code) return;
    const g = await getGroupByCode(code);
    setGroup(g);
    if (g && !expPaidBy) {
      setExpPaidBy(g.members[0]?.id || "");
    }
  }, [code]);

  useFocusEffect(
    useCallback(() => {
      loadGroup();
    }, [loadGroup])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroup();
    setRefreshing(false);
  };

  const copyCode = async () => {
    if (!group) return;
    await Clipboard.setStringAsync(group.code);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast("Copied!");
  };

  const resetForm = () => {
    setExpTitle("");
    setExpAmount("");
    setExpCategory("food");
    setExpSplitType("equal");
    setExpCustomSplits({});
    if (group) setExpPaidBy(group.members[0]?.id || "");
  };

  const handleAddExpense = async () => {
    if (!group) return;
    if (!expTitle.trim()) {
      Alert.alert("Missing Info", "Please enter an expense title.");
      return;
    }
    const amt = parseFloat(expAmount);
    if (!expAmount || isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    let splits: Split[];
    if (expSplitType === "equal") {
      const share = Math.round((amt / group.members.length) * 100) / 100;
      splits = group.members.map((m) => ({ memberId: m.id, amountOwed: share }));
    } else {
      const total = Object.values(expCustomSplits).reduce(
        (s, v) => s + (parseFloat(v) || 0),
        0
      );
      if (Math.abs(total - amt) > 0.5) {
        Alert.alert("Invalid Split", `Custom splits must add up to ${formatCurrency(amt)}`);
        return;
      }
      splits = group.members.map((m) => ({
        memberId: m.id,
        amountOwed: parseFloat(expCustomSplits[m.id] || "0") || 0,
      }));
    }

    const expense: Expense = {
      id: generateId(),
      title: expTitle.trim(),
      amount: amt,
      category: expCategory,
      paidById: expPaidBy,
      date: new Date().toISOString(),
      splits,
    };

    const updated = { ...group, expenses: [...group.expenses, expense] };
    await saveGroup(updated);
    setGroup(updated);
    setShowAddModal(false);
    resetForm();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Expense added!");
  };

  const handleDeleteExpense = async (id: string) => {
    if (!group) return;
    const updated = { ...group, expenses: group.expenses.filter((e) => e.id !== id) };
    await saveGroup(updated);
    setGroup(updated);
    showToast("Expense deleted");
  };

  const handleMarkPaid = async (settlementId: string) => {
    if (!group) return;
    const updated = {
      ...group,
      settlements: group.settlements.map((s) =>
        s.id === settlementId ? { ...s, isPaid: true } : s
      ),
    };
    await saveGroup(updated);
    setGroup(updated);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Marked as paid!");
  };

  if (!group) {
    return (
      <View style={styles.root}>
        <EmptyState icon="alert-circle-outline" title="Group not found" subtitle="This group may have been deleted." />
      </View>
    );
  }

  const balances: MemberBalance[] = calculateBalances(group.members, group.expenses);
  const debts: Debt[] = simplifyDebts(balances);

  // Sync settlements with current debts
  const settlements = debts.map((debt) => {
    const existing = group.settlements.find(
      (s) => s.fromId === debt.from.id && s.toId === debt.to.id && s.amount === debt.amount
    );
    return (
      existing || {
        id: generateId(),
        fromId: debt.from.id,
        toId: debt.to.id,
        amount: debt.amount,
        isPaid: false,
      }
    );
  });

  const allSettled = settlements.every((s) => s.isPaid);
  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const equalShare = expAmount && !isNaN(parseFloat(expAmount)) && group.members.length > 0
    ? parseFloat(expAmount) / group.members.length
    : 0;

  return (
    <View style={styles.root}>
      {/* Group Header */}
      <View style={[styles.groupHeader, { paddingTop: topPad + SPACING.sm }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.memberCount}>{group.members.length} members</Text>
          </View>
          <TouchableOpacity style={styles.codeBox} onPress={copyCode} activeOpacity={0.7}>
            <Text style={styles.codeText}>{group.code}</Text>
            <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {/* Tab Bar */}
        <View style={styles.tabs}>
          {(["expenses", "balances", "settle"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === "expenses" ? "Expenses" : tab === "balances" ? "Balances" : "Settle Up"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === "expenses" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={group.expenses}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => (
              <ExpenseCard
                expense={item}
                members={group.members}
                onDelete={() => handleDeleteExpense(item.id)}
              />
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 80 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="receipt-outline"
                title="No expenses yet"
                subtitle='Tap the "+" button to add your first expense'
              />
            }
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity
            style={[styles.fab, { bottom: bottomPad + 16 }]}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === "balances" && (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + SPACING.lg }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Member Balances</Text>
          {balances.map((b, i) => (
            <BalanceCard key={b.member.id} balance={b} index={i} />
          ))}
          {debts.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Simplified Debts</Text>
              {debts.map((debt, i) => (
                <DebtRow
                  key={i}
                  debt={debt}
                  fromIndex={group.members.findIndex((m) => m.id === debt.from.id)}
                  toIndex={group.members.findIndex((m) => m.id === debt.to.id)}
                />
              ))}
            </>
          )}
          {debts.length === 0 && group.expenses.length > 0 && (
            <View style={styles.allClearWrap}>
              <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
              <Text style={styles.allClearText}>Everyone is even!</Text>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === "settle" && (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + SPACING.lg }]}
          showsVerticalScrollIndicator={false}
        >
          {settlements.length === 0 ? (
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="Nothing to settle"
              subtitle="Add expenses to see who owes what"
            />
          ) : allSettled ? (
            <View style={styles.allSettledWrap}>
              <Ionicons name="trophy" size={48} color={COLORS.primary} />
              <Text style={styles.allSettledTitle}>All settled up!</Text>
              <Text style={styles.allSettledSub}>Great job everyone!</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Pending Payments</Text>
              {settlements
                .filter((s) => !s.isPaid)
                .map((s) => (
                  <SettlementRow
                    key={s.id}
                    settlement={s}
                    members={group.members}
                    onMarkPaid={() => {
                      const existing = group.settlements.find((gs) => gs.id === s.id);
                      if (!existing) {
                        const updated = { ...group, settlements: [...group.settlements, s] };
                        saveGroup(updated).then(() => {
                          setGroup(updated);
                          handleMarkPaid(s.id);
                        });
                      } else {
                        handleMarkPaid(s.id);
                      }
                    }}
                  />
                ))}
              {settlements.some((s) => s.isPaid) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.sectionLabel}>Completed</Text>
                  {settlements
                    .filter((s) => s.isPaid)
                    .map((s) => (
                      <SettlementRow
                        key={s.id}
                        settlement={s}
                        members={group.members}
                        onMarkPaid={() => {}}
                      />
                    ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.modal}
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: bottomPad + SPACING.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity
                onPress={() => { setShowAddModal(false); resetForm(); }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.formInput}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.textSecondary}
              value={expTitle}
              onChangeText={setExpTitle}
            />

            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>₹</Text>
              </View>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
                value={expAmount}
                onChangeText={setExpAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <CategoryChip selected={expCategory} onSelect={setExpCategory} />

            <Text style={styles.fieldLabel}>Paid by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberPicker}>
              {group.members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.memberChip,
                    expPaidBy === m.id && styles.memberChipActive,
                  ]}
                  onPress={() => setExpPaidBy(m.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.memberChipText, expPaidBy === m.id && styles.memberChipTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Split</Text>
            <View style={styles.splitToggle}>
              <TouchableOpacity
                style={[styles.splitBtn, expSplitType === "equal" && styles.splitBtnActive]}
                onPress={() => setExpSplitType("equal")}
                activeOpacity={0.75}
              >
                <Text style={[styles.splitBtnText, expSplitType === "equal" && styles.splitBtnTextActive]}>
                  Equal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.splitBtn, expSplitType === "custom" && styles.splitBtnActive]}
                onPress={() => setExpSplitType("custom")}
                activeOpacity={0.75}
              >
                <Text style={[styles.splitBtnText, expSplitType === "custom" && styles.splitBtnTextActive]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {expSplitType === "equal" && equalShare > 0 && (
              <View style={styles.equalSplitPreview}>
                {group.members.map((m) => (
                  <View key={m.id} style={styles.splitPreviewRow}>
                    <Text style={styles.splitPreviewName}>{m.name}</Text>
                    <Text style={styles.splitPreviewAmount}>{formatCurrency(equalShare)}</Text>
                  </View>
                ))}
              </View>
            )}

            {expSplitType === "custom" && (
              <View style={styles.customSplits}>
                {group.members.map((m) => (
                  <View key={m.id} style={styles.customSplitRow}>
                    <Text style={styles.customSplitName}>{m.name}</Text>
                    <View style={styles.customAmountRow}>
                      <Text style={styles.currencySmall}>₹</Text>
                      <TextInput
                        style={styles.customSplitInput}
                        placeholder="0"
                        placeholderTextColor={COLORS.textSecondary}
                        value={expCustomSplits[m.id] || ""}
                        onChangeText={(v) =>
                          setExpCustomSplits((prev) => ({ ...prev, [m.id]: v }))
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleAddExpense}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.saveBtnText}>Save Expense</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Toast message={toastMsg} visible={toastVisible} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  groupHeader: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  headerInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
  },
  memberCount: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  codeText: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
    letterSpacing: 2,
  },
  tabs: {
    flexDirection: "row",
    gap: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    padding: SPACING.lg,
  },
  fab: {
    position: "absolute",
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  allClearWrap: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  allClearText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.success,
  },
  allSettledWrap: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  allSettledTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
  },
  allSettledSub: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  // Modal
  modal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
  },
  formInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_400Regular",
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  currencyBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  currencyText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
  },
  memberPicker: {
    flexGrow: 0,
  },
  memberChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.card,
  },
  memberChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  memberChipText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSecondary,
  },
  memberChipTextActive: {
    color: COLORS.white,
  },
  splitToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 3,
    gap: 3,
  },
  splitBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  splitBtnActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  splitBtnText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSecondary,
  },
  splitBtnTextActive: {
    color: COLORS.primary,
    fontFamily: "Inter_600SemiBold",
  },
  equalSplitPreview: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  splitPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  splitPreviewName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  splitPreviewAmount: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
  },
  customSplits: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  customSplitName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
    color: COLORS.textPrimary,
  },
  customAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 90,
  },
  currencySmall: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.primary,
  },
  customSplitInput: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textPrimary,
    flex: 1,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.white,
  },
});

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
  Payer,
} from "@/utils/storage";
import { generateId, formatCurrency, formatDate } from "@/utils/helpers";
import { calculateBalances, simplifyDebts, Debt, MemberBalance } from "@/utils/balance";
import { pickContact, ContactInfo } from "@/utils/contactPicker";
import { ExpenseCard } from "@/components/ExpenseCard";
import { BalanceCard } from "@/components/BalanceCard";
import { DebtRow } from "@/components/DebtRow";
import { SettlementRow } from "@/components/SettlementRow";
import { EmptyState } from "@/components/EmptyState";
import { CategoryChip } from "@/components/CategoryChip";
import { Toast, useToast } from "@/components/Toast";
import { MemberAvatar } from "@/components/MemberAvatar";

type Tab = "expenses" | "balances" | "settle";

export default function GroupDashboard() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [group, setGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const { toastMsg, toastVisible, showToast, hideToast } = useToast();

  // Member management state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState<string | null>(null);
  const [newMemberAvatar, setNewMemberAvatar] = useState<string | null>(null);
  const [duplicatePhoneError, setDuplicatePhoneError] = useState("");

  // Add expense form state
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState<CategoryKey>("food");
  const [expPaidBy, setExpPaidBy] = useState<string[]>([]);
  const [expPayerAmounts, setExpPayerAmounts] = useState<Record<string, string>>({});
  const [expSplitAmong, setExpSplitAmong] = useState<string[]>([]);
  
  // Validation errors
  const [payerAmountError, setPayerAmountError] = useState("");
  const [splitAmongError, setSplitAmongError] = useState("");
  const [amountError, setAmountError] = useState("");

  const loadGroup = useCallback(async () => {
    if (!code) return;
    const g = await getGroupByCode(code);
    setGroup(g);
    if (g && expPaidBy.length === 0) {
      setExpPaidBy([g.members[0]?.id || ""]);
      setExpSplitAmong(g.members.map((m) => m.id)); // Default: split among all
    }
  }, [code, expPaidBy.length]);

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
    setExpDescription("");
    setExpAmount("");
    setExpCategory("food");
    setExpSplitAmong(group?.members.map((m) => m.id) || []);
    setExpPayerAmounts({});
    setPayerAmountError("");
    setSplitAmongError("");
    setAmountError("");
    if (group) setExpPaidBy([group.members[0]?.id || ""]);
  };

  const handleAddExpense = async () => {
    if (!group) return;
    
    // Validate amount
    const amt = parseFloat(expAmount);
    if (!expAmount || isNaN(amt) || amt <= 0) {
      setAmountError("Amount must be a positive number");
      return;
    }
    setAmountError("");

    // Validate at least one payer
    if (expPaidBy.length === 0) {
      Alert.alert("Missing Info", "Please select at least one payer.");
      return;
    }

    // Validate payer amounts sum to total
    const payerSum = expPaidBy.reduce((sum, id) => {
      return sum + (parseFloat(expPayerAmounts[id] || "0") || 0);
    }, 0);

    if (Math.abs(payerSum - amt) > 0.01) {
      setPayerAmountError(`Payer amounts (${formatCurrency(payerSum)}) must sum to ${formatCurrency(amt)}`);
      return;
    }
    setPayerAmountError("");

    // Validate at least one person in split-among
    if (expSplitAmong.length === 0) {
      setSplitAmongError("At least one person must be selected");
      return;
    }
    setSplitAmongError("");

    // Create payers array
    const payers: Payer[] = expPaidBy.map((memberId) => ({
      memberId,
      amountPaid: parseFloat(expPayerAmounts[memberId] || "0") || 0,
    }));

    // Create expense with splitAmong
    const expense: Expense = {
      id: generateId(),
      title: expDescription.trim() || "Untitled Expense",
      description: expDescription.trim() || undefined,
      amount: amt,
      category: expCategory,
      date: new Date().toISOString(),
      payers,
      splitAmong: expSplitAmong,
      splits: [], // Will be calculated from nets
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

  const handleAddMember = async () => {
    if (!group) return;
    const name = newMemberName.trim();
    if (!name) {
      Alert.alert("Missing Info", "Please enter a member name.");
      return;
    }

    // Check for duplicate names
    if (group.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert("Duplicate", "A member with this name already exists.");
      return;
    }

    // Check for duplicate phone number
    if (newMemberPhone) {
      const phoneExists = group.members.some(
        (m) => m.phoneNumber && m.phoneNumber === newMemberPhone
      );
      if (phoneExists) {
        setDuplicatePhoneError("This contact is already in the group");
        return;
      }
    }

    const updated = {
      ...group,
      members: [
        ...group.members,
        {
          id: generateId(),
          name,
          phoneNumber: newMemberPhone || null,
          avatarUri: newMemberAvatar || null,
          addedFromContacts: !!newMemberPhone,
        },
      ],
    };
    await saveGroup(updated);
    setGroup(updated);
    setNewMemberName("");
    setNewMemberPhone(null);
    setNewMemberAvatar(null);
    setDuplicatePhoneError("");
    showToast("Member added!");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePickFromContacts = async () => {
    const contactInfo = await pickContact();
    if (!contactInfo) return;

    setNewMemberName(contactInfo.name);
    setNewMemberPhone(contactInfo.phoneNumber);
    setNewMemberAvatar(contactInfo.avatarUri);
    setDuplicatePhoneError("");

    // Check for duplicate phone number immediately
    if (contactInfo.phoneNumber && group) {
      const phoneExists = group.members.some(
        (m) => m.phoneNumber && m.phoneNumber === contactInfo.phoneNumber
      );
      if (phoneExists) {
        setDuplicatePhoneError("This contact is already in the group");
      }
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!group) return;
    const member = group.members.find((m) => m.id === memberId);
    if (!member) return;

    // Check if member appears in any expense
    const appearsInExpense = group.expenses.some(
      (exp) =>
        exp.payers.some((p) => p.memberId === memberId) ||
        exp.splitAmong.includes(memberId)
    );

    if (appearsInExpense) {
      Alert.alert(
        "Cannot Remove",
        `${member.name} cannot be removed because they appear in existing expenses. Delete those expenses first.`
      );
      return;
    }

    Alert.alert("Remove Member", `Remove ${member.name} from the group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const updated = {
            ...group,
            members: group.members.filter((m) => m.id !== memberId),
          };
          await saveGroup(updated);
          setGroup(updated);
          showToast("Member removed");
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
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

  return (
    <View style={styles.root}>
      {/* Group Header */}
      <View style={[styles.groupHeader, { paddingTop: topPad + SPACING.sm }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.memberCount}>{group.members.length} members</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.manageMembersBtn}
              onPress={() => setShowMemberModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeBox} onPress={copyCode} activeOpacity={0.7}>
              <Text style={styles.codeText}>{group.code}</Text>
              <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
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

            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.textSecondary}
              value={expDescription}
              onChangeText={setExpDescription}
            />

            <Text style={styles.fieldLabel}>Total Amount *</Text>
            <View style={styles.amountRow}>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>₹</Text>
              </View>
              <TextInput
                style={[styles.formInput, { flex: 1 }, amountError && styles.inputError]}
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
                value={expAmount}
                onChangeText={(v) => {
                  setExpAmount(v);
                  setAmountError("");
                  const totalAmt = parseFloat(v) || 0;
                  if (totalAmt > 0 && expPaidBy.length > 0) {
                    const equalPayerShare = (totalAmt / expPaidBy.length).toFixed(2);
                    const newPayerAmounts: Record<string, string> = {};
                    expPaidBy.forEach((id) => {
                      newPayerAmounts[id] = equalPayerShare;
                    });
                    setExpPayerAmounts(newPayerAmounts);
                    setPayerAmountError("");
                  }
                }}
                keyboardType="decimal-pad"
              />
            </View>
            {amountError && <Text style={styles.errorText}>{amountError}</Text>}

            <Text style={styles.fieldLabel}>Category</Text>
            <CategoryChip selected={expCategory} onSelect={setExpCategory} />

            <Text style={styles.fieldLabel}>Who Paid? *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberPicker}>
              {group.members.map((m) => {
                const isSelected = expPaidBy.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberChip,
                      isSelected && styles.memberChipActive,
                    ]}
                    onPress={() => {
                      setExpPaidBy((prev) => {
                        const newPaidBy = prev.includes(m.id)
                          ? prev.filter((id) => id !== m.id)
                          : [...prev, m.id];

                        // Auto-fill equal amounts for payers if total amount is set
                        const totalAmt = parseFloat(expAmount) || 0;
                        if (totalAmt > 0 && newPaidBy.length > 0) {
                          const equalPayerShare = (totalAmt / newPaidBy.length).toFixed(2);
                          const newPayerAmounts: Record<string, string> = {};
                          newPaidBy.forEach((id) => {
                            newPayerAmounts[id] = equalPayerShare;
                          });
                          setExpPayerAmounts(newPayerAmounts);
                          setPayerAmountError("");
                        }
                        return newPaidBy;
                      });
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.memberChipText, isSelected && styles.memberChipTextActive]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {expPaidBy.length > 1 && (
              <View style={styles.customSplits}>
                <Text style={styles.sectionLabel}>Amount Paid by Each</Text>
                {expPaidBy.map((memberId) => {
                  const member = group.members.find((m) => m.id === memberId);
                  if (!member) return null;
                  return (
                    <View key={memberId} style={styles.customSplitRow}>
                      <Text style={styles.customSplitName}>{member.name}</Text>
                      <View style={styles.customAmountRow}>
                        <Text style={styles.currencySmall}>₹</Text>
                        <TextInput
                          style={styles.customSplitInput}
                          placeholder="0"
                          placeholderTextColor={COLORS.textSecondary}
                          value={expPayerAmounts[memberId] || ""}
                          onChangeText={(v) => {
                            setExpPayerAmounts((prev) => ({ ...prev, [memberId]: v }));
                            setPayerAmountError("");
                          }}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  );
                })}
                {payerAmountError && <Text style={styles.errorText}>{payerAmountError}</Text>}
                {expAmount && (
                  <View style={styles.validationRow}>
                    <Text style={styles.validationLabel}>Total:</Text>
                    <Text style={styles.validationValue}>{formatCurrency(parseFloat(expAmount) || 0)}</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.fieldLabel}>Split Among * (Equal Split)</Text>
            <View style={styles.splitAmongContainer}>
              {group.members.map((m) => {
                const isSelected = expSplitAmong.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.splitAmongChip,
                      isSelected && styles.splitAmongChipActive,
                    ]}
                    onPress={() => {
                      setExpSplitAmong((prev) => {
                        const newSplit = prev.includes(m.id)
                          ? prev.filter((id) => id !== m.id)
                          : [...prev, m.id];
                        setSplitAmongError("");
                        return newSplit;
                      });
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={isSelected ? COLORS.white : COLORS.textSecondary}
                    />
                    <Text style={[styles.splitAmongText, isSelected && styles.splitAmongTextActive]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {splitAmongError && <Text style={styles.errorText}>{splitAmongError}</Text>}
            {expSplitAmong.length > 0 && expAmount && (
              <View style={styles.splitPreview}>
                <Text style={styles.splitPreviewText}>
                  Each person pays: {formatCurrency(parseFloat(expAmount) / expSplitAmong.length)}
                </Text>
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

      {/* Member Management Modal */}
      <Modal visible={showMemberModal} animationType="slide" presentationStyle="pageSheet">
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
              <Text style={styles.modalTitle}>Manage Members</Text>
              <TouchableOpacity
                onPress={() => setShowMemberModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Current Members</Text>
            {group.members.map((m, idx) => (
              <View key={m.id} style={styles.memberRow}>
                <MemberAvatar
                  name={m.name}
                  index={idx}
                  size={40}
                  avatarUri={m.avatarUri}
                />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeMemberBtn}
                  onPress={() => handleRemoveMember(m.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addMemberSection}>
              <Text style={styles.fieldLabel}>Add New Member</Text>
              
              {/* Add from contacts button */}
              <TouchableOpacity
                style={styles.contactPickerBtn}
                onPress={handlePickFromContacts}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={20} color={COLORS.white} />
                <Text style={styles.contactPickerBtnText}>Add from Contacts</Text>
              </TouchableOpacity>

              <Text style={styles.orDivider}>— or type manually —</Text>
              
              <View style={styles.addMemberRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  placeholder="Enter member name"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newMemberName}
                  onChangeText={(text) => {
                    setNewMemberName(text);
                    setDuplicatePhoneError("");
                  }}
                />
                <TouchableOpacity
                  style={styles.addMemberBtn}
                  onPress={handleAddMember}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              {duplicatePhoneError && (
                <Text style={styles.errorText}>{duplicatePhoneError}</Text>
              )}
              {newMemberPhone && (
                <Text style={styles.contactHint}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />{" "}
                  Selected from contacts
                </Text>
              )}
            </View>
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
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
  validationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  validationLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
  },
  validationValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
  },
  splitAmongContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  splitAmongChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  splitAmongChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  splitAmongText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSecondary,
  },
  splitAmongTextActive: {
    color: COLORS.white,
  },
  splitPreview: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  splitPreviewText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.primary,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  manageMembersBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_500Medium",
    color: COLORS.textPrimary,
  },
  removeMemberBtn: {
    padding: SPACING.xs,
  },
  addMemberSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addMemberBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  contactPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  contactPickerBtnText: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.white,
  },
  orDivider: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginVertical: SPACING.md,
  },
  contactHint: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: COLORS.success,
    marginTop: SPACING.xs,
    flexDirection: "row",
    alignItems: "center",
  },
});

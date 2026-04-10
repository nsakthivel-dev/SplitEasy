import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import { saveGroup } from "@/utils/storage";
import { generateCode, generateId } from "@/utils/helpers";

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [groupName, setGroupName] = useState("");
  const [yourName, setYourName] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    setMembers((m) => [...m, ""]);
  };

  const updateMember = (idx: number, val: string) => {
    setMembers((m) => m.map((n, i) => (i === idx ? val : n)));
  };

  const removeMember = (idx: number) => {
    setMembers((m) => m.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert("Missing Info", "Please enter a group name.");
      return;
    }
    if (!yourName.trim()) {
      Alert.alert("Missing Info", "Please enter your name.");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const allMembers = [yourName.trim(), ...members.filter((m) => m.trim())];
    const uniqueMembers = [...new Set(allMembers)];

    const group = {
      id: generateId(),
      code: generateCode(),
      name: groupName.trim(),
      createdAt: new Date().toISOString(),
      members: uniqueMembers.map((name) => ({ id: generateId(), name })),
      expenses: [],
      settlements: [],
    };

    await saveGroup(group);
    setLoading(false);
    router.replace(`/group/${group.code}`);
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + SPACING.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Weekend trip, House expenses..."
            placeholderTextColor={COLORS.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.textSecondary}
            value={yourName}
            onChangeText={setYourName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Other Members</Text>
          {members.map((name, idx) => (
            <View key={idx} style={styles.memberRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={`Member ${idx + 2}`}
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={(v) => updateMember(idx, v)}
              />
              {members.length > 1 && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeMember(idx)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addMemberBtn} onPress={addMember} activeOpacity={0.75}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.addMemberText}>Add Member</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.disabled]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.createBtnText}>
            {loading ? "Creating..." : "Create Group"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  section: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
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
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  removeBtn: {
    padding: SPACING.xs,
  },
  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  addMemberText: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_500Medium",
    color: COLORS.primary,
  },
  createBtn: {
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
  createBtnText: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.white,
  },
  disabled: {
    opacity: 0.6,
  },
});

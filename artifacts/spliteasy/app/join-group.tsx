import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { getGroupByCode } from "@/utils/storage";

export default function JoinGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-character group code.");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const group = await getGroupByCode(trimmed);
    setLoading(false);

    if (!group) {
      Alert.alert("Not Found", "No group found with that code. Check the code and try again.");
      return;
    }

    router.replace(`/group/${trimmed}`);
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.content, { paddingBottom: bottomPad + SPACING.xl }]}>
        <View style={styles.iconWrap}>
          <Ionicons name="enter-outline" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.heading}>Join a Group</Text>
        <Text style={styles.sub}>
          Ask the group creator for their 6-character group code
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="XXXXXX"
          placeholderTextColor={COLORS.border}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
        />

        <TouchableOpacity
          style={[styles.joinBtn, loading && styles.disabled]}
          onPress={handleJoin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.joinBtnText}>{loading ? "Joining..." : "Join Group"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  heading: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
  },
  sub: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  codeInput: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
    textAlign: "center",
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  joinBtn: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinBtnText: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.white,
  },
  disabled: {
    opacity: 0.6,
  },
});

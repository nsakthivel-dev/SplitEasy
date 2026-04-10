import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import { getAllGroups, Group } from "@/utils/storage";
import { GroupCard } from "@/components/GroupCard";
import { EmptyState } from "@/components/EmptyState";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getAllGroups();
    setGroups(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topPad + SPACING.md }]}>
        <View style={styles.logo}>
          <Ionicons name="wallet" size={28} color={COLORS.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.appName}>SplitEasy</Text>
          <Text style={styles.tagline}>Split bills. Not friendships.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/create-group")}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color={COLORS.white} />
          <Text style={styles.primaryBtnText}>Create New Group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/join-group")}
          activeOpacity={0.8}
        >
          <Ionicons name="enter-outline" size={20} color={COLORS.primary} />
          <Text style={styles.secondaryBtnText}>Join Group</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>
          {groups.length > 0 ? "Recent Groups" : "Your Groups"}
        </Text>
        {groups.length > 0 && (
          <Text style={styles.count}>{groups.length}</Text>
        )}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => router.push(`/group/${item.code}`)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + SPACING.lg },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No groups yet"
            subtitle="Create a group to start splitting expenses with friends and family"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {},
  appName: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: "Inter_700Bold",
    color: COLORS.white,
  },
  tagline: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  actions: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.white,
  },
  secondaryBtn: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  secondaryBtnText: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.primary,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
  },
  count: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
    color: COLORS.textSecondary,
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
});

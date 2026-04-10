import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";
import type { CategoryKey } from "@/constants/theme";

interface Props {
  selected: CategoryKey;
  onSelect: (key: CategoryKey) => void;
}

export function CategoryChip({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.chip,
              { borderColor: cat.color },
              isSelected && { backgroundColor: cat.color },
            ]}
            onPress={() => onSelect(cat.key)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={isSelected ? "#fff" : cat.color}
            />
            <Text style={[styles.label, { color: isSelected ? "#fff" : cat.color }]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AVATAR_COLORS } from "@/constants/theme";
import { getInitials } from "@/utils/helpers";

interface Props {
  name: string;
  index?: number;
  size?: number;
  fontSize?: number;
}

export function MemberAvatar({ name, index = 0, size = 40, fontSize = 15 }: Props) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});

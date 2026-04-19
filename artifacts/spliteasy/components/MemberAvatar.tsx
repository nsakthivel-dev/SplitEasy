import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { AVATAR_COLORS } from "@/constants/theme";
import { getInitials } from "@/utils/helpers";

interface Props {
  name: string;
  index?: number;
  size?: number;
  fontSize?: number;
  avatarUri?: string | null;
}

export function MemberAvatar({ name, index = 0, size = 40, fontSize = 15, avatarUri }: Props) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  
  // If avatar URI is provided, show the image
  if (avatarUri) {
    return (
      <Image
        source={{ uri: avatarUri }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  // Otherwise show initials with color
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

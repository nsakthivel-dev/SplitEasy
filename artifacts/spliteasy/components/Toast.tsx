import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants/theme";

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, visible, onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity, bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80 },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

let toastCallback: ((msg: string) => void) | null = null;

export function useToast() {
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  return { toastMsg, toastVisible, showToast, hideToast };
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
});

export const COLORS = {
  primary: "#16a34a",
  primaryLight: "#dcfce7",
  primaryDark: "#14532d",
  background: "#f9fafb",
  card: "#ffffff",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  danger: "#ef4444",
  dangerLight: "#fee2e2",
  success: "#16a34a",
  border: "#e5e7eb",
  inputBg: "#f9fafb",
  white: "#ffffff",
  black: "#000000",
  overlay: "rgba(0,0,0,0.5)",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const AVATAR_COLORS = [
  "#16a34a",
  "#2563eb",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#d97706",
  "#7c3aed",
  "#0d9488",
];

export const CATEGORIES = [
  { key: "food", label: "Food", icon: "restaurant", color: "#ea580c" },
  { key: "travel", label: "Travel", icon: "airplane", color: "#2563eb" },
  { key: "rent", label: "Rent", icon: "home", color: "#9333ea" },
  { key: "fun", label: "Fun", icon: "happy", color: "#db2777" },
  { key: "grocery", label: "Grocery", icon: "cart", color: "#16a34a" },
  { key: "bills", label: "Bills", icon: "flash", color: "#d97706" },
  { key: "other", label: "Other", icon: "grid", color: "#6b7280" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

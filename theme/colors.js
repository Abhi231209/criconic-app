// theme/colors.js

export const COLORS = {
  primary: "#3B82F6",
  primaryDark: "#1D4ED8",
  secondary: "#10B981",
  secondaryDark: "#047857",
  accent: "#EA580C",
  danger: "#EF4444",
  dangerDark: "#B91C1C",
  warning: "#F59E0B",
  warningDark: "#D97706",
  success: "#10B981",
  info: "#3B82F6",
  live: "#EF4444",
  blue: "#2563EB",

  light: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    cardSecondary: "#F1F5F9",
    text: "#1E293B",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    border: "#E2E8F0",
    divider: "#F1F5F9",
    inputBg: "#F1F5F9",
    inputBackground: "#FFFFFF",
    playerCard: "#F8FAFC",
    playerCardBorder: "#E2E8F0",
  },

  dark: {
    background: "#0F172A",
    surface: "#1E293B",
    card: "#1E293B",
    cardSecondary: "#334155",
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    border: "#334155",
    divider: "#1E293B",
    inputBg: "#0F172A",
    inputBackground: "#1E293B",
    playerCard: "#334155",
    playerCardBorder: "#475569",
  },

  gradients: {
    actionPrimary: ["#3B82F6", "#2563EB"],
    actionSecondary: ["#8B5CF6", "#6D28D9"],
    primary: ["#3B82F6", "#2563EB"],
    secondary: ["#8B5CF6", "#6D28D9"],
  },
};

/**
 * Returns active color palette based on dark mode flag
 */
export function getThemeColors(isDark = false) {
  const modeColors = isDark ? COLORS.dark : COLORS.light;
  return {
    ...COLORS,
    ...modeColors,
    gradients: COLORS.gradients,
    isDark,
  };
}

export default COLORS;

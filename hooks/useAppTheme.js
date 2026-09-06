import { useContext } from "react";
import { ThemeContext } from "@/contexts/ThemeContext";
import { useColorScheme } from "react-native";
import { COLORS, getThemeColors } from "@/theme/colors";
import APP_THEME from "@/theme/appTheme";

export default function useAppTheme() {
  const context = useContext(ThemeContext);
  const colorScheme = useColorScheme();

  // If inside ThemeProvider, use centralized context
  if (context && context.toggleTheme && typeof context.isDark === "boolean") {
    return context;
  }

  // Fallback if used outside ThemeProvider
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark);

  const theme = {
    ...APP_THEME,
    ...colors,
    isDark,
    isDarkMode: isDark,
    neutralLight: isDark ? "#334155" : "#F3F4F6",
    neutral: isDark ? "#94A3B8" : "#6B7280",
    dangerLight: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
    primaryLight: isDark ? "#1E3A8A" : "#EFF6FF",
    surface: isDark ? "#1E293B" : "#FFFFFF",
    background: isDark ? "#0F172A" : "#F8FAFC",
    border: isDark ? "#334155" : "#E2E8F0",
    text: isDark ? "#F8FAFC" : "#1E293B",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    gradients: {
      actionPrimary: ["#3B82F6", "#2563EB"],
      actionSecondary: ["#8B5CF6", "#6D28D9"],
      primary: ["#3B82F6", "#2563EB"],
      secondary: ["#8B5CF6", "#6D28D9"],
      ...(APP_THEME?.gradients || {}),
      ...(COLORS?.gradients || {}),
    },
  };

  return {
    theme,
    colors: theme,
    isDark,
    isDarkMode: isDark,
    toggleTheme: () => {},
    setThemeMode: () => {},
    themeMode: isDark ? "dark" : "light",
  };
}

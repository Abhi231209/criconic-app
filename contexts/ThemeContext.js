// contexts/ThemeContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Appearance, useColorScheme as useRNColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme as nwColorScheme } from "nativewind";
import { COLORS, getThemeColors } from "@/theme/colors";
import APP_THEME from "@/theme/appTheme";

const THEME_STORAGE_KEY = "themePreference";

export const ThemeContext = createContext({
  themeMode: "system", // 'light' | 'dark' | 'system'
  isDark: false,
  isDarkMode: false,
  theme: APP_THEME,
  colors: COLORS,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const rnScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState("system");
  const [isDark, setIsDark] = useState(rnScheme === "dark");

  const applyTheme = useCallback((mode) => {
    const activeIsDark =
      mode === "dark"
        ? true
        : mode === "light"
        ? false
        : Appearance.getColorScheme() === "dark";

    setIsDark(activeIsDark);

    // 1. Sync React Native Appearance
    try {
      if (typeof Appearance.setColorScheme === "function") {
        Appearance.setColorScheme(mode === "system" ? null : mode);
      }
    } catch (e) {
      // Ignored
    }

    // 2. Sync NativeWind
    try {
      if (nwColorScheme?.set) {
        nwColorScheme.set(mode);
      }
    } catch (e) {
      // Ignored
    }
  }, []);

  // Load saved preference on mount
  useEffect(() => {
    let isMounted = true;
    const initTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted) {
          if (saved === "dark" || saved === "light" || saved === "system") {
            setThemeModeState(saved);
            applyTheme(saved);
          } else {
            applyTheme("system");
          }
        }
      } catch (err) {
        console.warn("[ThemeProvider] Failed to load theme preference:", err);
      }
    };
    initTheme();
    return () => {
      isMounted = false;
    };
  }, [applyTheme]);

  // Listen to system changes when in system mode
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
      if (themeMode === "system") {
        setIsDark(newScheme === "dark");
      }
    });
    return () => subscription.remove();
  }, [themeMode]);

  const setThemeMode = useCallback(
    async (mode) => {
      setThemeModeState(mode);
      applyTheme(mode);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch (err) {
        console.warn("[ThemeProvider] Failed to save theme preference:", err);
      }
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(async () => {
    const nextMode = isDark ? "light" : "dark";
    await setThemeMode(nextMode);
  }, [isDark, setThemeMode]);

  const themeColors = useMemo(() => getThemeColors(isDark), [isDark]);

  const theme = useMemo(
    () => ({
      ...APP_THEME,
      ...themeColors,
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
    }),
    [isDark, themeColors]
  );

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      isDarkMode: isDark,
      theme,
      colors: theme,
      toggleTheme,
      setThemeMode,
    }),
    [themeMode, isDark, theme, toggleTheme, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppThemeContext = () => useContext(ThemeContext);

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  AccessibilityInfo,
  Easing,
  Platform,
  useColorScheme,
} from "react-native";

export const SKELETON_COLORS = {
  light: "#E5E7EB",
  dark: "#374151",
};

// Web has no native animation driver; asking for it there only logs a warning.
const USE_NATIVE_DRIVER = Platform.OS !== "web";

// Grey placeholder block with a gentle opacity pulse. Building block for the
// list/card skeletons shown while data loads.
export default function SkeletonBlock({ width = "100%", height = 12, radius = 6, style }) {
  const isDarkMode = useColorScheme() === "dark";
  const opacity = useRef(new Animated.Value(0.4)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  // Respect the OS "reduce motion" setting: show a static block instead.
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      ?.then((enabled) => mounted && setReduceMotion(Boolean(enabled)))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (enabled) =>
      setReduceMotion(Boolean(enabled))
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.7);
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [reduceMotion, opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: isDarkMode ? SKELETON_COLORS.dark : SKELETON_COLORS.light,
          opacity,
        },
        style,
      ]}
    />
  );
}

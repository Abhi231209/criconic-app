import React from "react";
import { Image, TouchableOpacity, useColorScheme } from "react-native";

/**
 * Brand logo asset map from /assets/brand (synchronized with web brand assets)
 */
const LOGO_ASSETS = {
  horizontal: {
    dark: require("@/assets/brand/logo-horizontal-dark.png"),
    light: require("@/assets/brand/logo-horizontal-light.png"),
  },
  stacked: {
    dark: require("@/assets/brand/logo-stacked-dark.png"),
    light: require("@/assets/brand/logo-stacked-light.png"),
  },
  mark: {
    dark: require("@/assets/brand/logo-mark.png"),
    light: require("@/assets/brand/logo-mark.png"),
  },
  icon: {
    dark: require("@/assets/brand/icon-master.png"),
    light: require("@/assets/brand/icon-master.png"),
  },
  mono: {
    dark: require("@/assets/brand/icon-mono.png"),
    light: require("@/assets/brand/icon-mono.png"),
  },
};

/**
 * Aspect ratios based on raw image pixel dimensions:
 * - horizontal: 1123 x 240 (~4.68)
 * - stacked: 900 x 591 (~1.52)
 * - mark: 1024 x 1024 (1.0)
 * - icon: 1024 x 1024 (1.0)
 * - mono: 1024 x 1024 (1.0)
 */
const ASPECT_RATIOS = {
  horizontal: 1123 / 240,
  stacked: 900 / 591,
  mark: 1,
  icon: 1,
  mono: 1,
};

const DEFAULT_DIMENSIONS = {
  horizontal: { width: 140, height: 30 },
  stacked: { width: 140, height: 92 },
  mark: { width: 36, height: 36 },
  icon: { width: 44, height: 44 },
  mono: { width: 44, height: 44 },
};

/**
 * CriconicLogo — Situation-aware brand logo component matching web design system
 *
 * @param {('horizontal'|'stacked'|'mark'|'icon'|'mono')} [variant='horizontal']
 *   - "horizontal": full wordmark side-by-side (navbars, headers, cards)
 *   - "stacked": brand icon on top + wordmark below (login, signup, splash)
 *   - "mark": cyan/teal C-mark only, transparent background (avatars, badges)
 *   - "icon": master dark rounded app icon
 *   - "mono": monochrome version
 * @param {('auto'|'dark'|'light')} [theme='auto']
 *   - "auto": dynamically follows user system/app theme
 *   - "dark": forces dark background variant
 *   - "light": forces light background variant
 * @param {number} [width] - Explicit width in px (height computed from aspect ratio if omitted)
 * @param {number} [height] - Explicit height in px (width computed from aspect ratio if omitted)
 * @param {string} [className] - NativeWind / Tailwind CSS classes
 * @param {object} [style] - Custom React Native style object
 * @param {string} [resizeMode='contain']
 * @param {function} [onPress] - If provided, wraps the logo in a TouchableOpacity
 * @param {number} [activeOpacity=0.8]
 */
export default function CriconicLogo({
  variant = "horizontal",
  theme = "auto",
  width,
  height,
  className = "",
  style,
  resizeMode = "contain",
  onPress,
  activeOpacity = 0.8,
  ...restProps
}) {
  const systemScheme = useColorScheme();
  const effectiveTheme =
    theme === "auto" ? (systemScheme === "dark" ? "dark" : "light") : theme;

  const variantKey = LOGO_ASSETS[variant] ? variant : "horizontal";
  const source =
    LOGO_ASSETS[variantKey][effectiveTheme] ||
    LOGO_ASSETS[variantKey].dark;

  const aspectRatio = ASPECT_RATIOS[variantKey] || 1;
  const defaults = DEFAULT_DIMENSIONS[variantKey] || DEFAULT_DIMENSIONS.horizontal;

  let computedWidth = width;
  let computedHeight = height;

  if (computedWidth != null && computedHeight == null) {
    computedHeight = Math.round(computedWidth / aspectRatio);
  } else if (computedHeight != null && computedWidth == null) {
    computedWidth = Math.round(computedHeight * aspectRatio);
  } else if (computedWidth == null && computedHeight == null) {
    computedWidth = defaults.width;
    computedHeight = defaults.height;
  }

  const imageElement = (
    <Image
      source={source}
      style={[{ width: computedWidth, height: computedHeight }, style]}
      resizeMode={resizeMode}
      className={className}
      {...restProps}
    />
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={{ width: computedWidth, height: computedHeight }}
      >
        {imageElement}
      </TouchableOpacity>
    );
  }

  return imageElement;
}

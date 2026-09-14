import { Text, StyleSheet } from 'react-native';
import React from 'react';

const fontMap = {
  thin: 'DarkerGrotesque_400Regular',
  light: 'DarkerGrotesque_400Regular',
  normal: 'DarkerGrotesque_400Regular',
  medium: 'DarkerGrotesque_500Medium',
  semibold: 'DarkerGrotesque_600SemiBold',
  bold: 'DarkerGrotesque_700Bold',
  extrabold: 'DarkerGrotesque_800ExtraBold',
  black: 'DarkerGrotesque_900Black',
  '100': 'DarkerGrotesque_400Regular',
  '200': 'DarkerGrotesque_400Regular',
  '300': 'DarkerGrotesque_400Regular',
  '400': 'DarkerGrotesque_400Regular',
  '500': 'DarkerGrotesque_500Medium',
  '600': 'DarkerGrotesque_600SemiBold',
  '700': 'DarkerGrotesque_700Bold',
  '800': 'DarkerGrotesque_800ExtraBold',
  '900': 'DarkerGrotesque_900Black',
};

const classCache = new Map();
const FONT_CLASS_REGEX = /\bfont-(thin|light|normal|medium|semibold|bold|extrabold|black|\d{3})\b/i;
const FONT_CLEAN_REGEX = /\bfont-(thin|light|normal|medium|semibold|bold|extrabold|black|\d{3})\b/gi;

function parseClassName(className) {
  if (!className || !className.includes('font-')) {
    return { fontKey: null, cleanedClassName: className || '' };
  }
  const cached = classCache.get(className);
  if (cached) return cached;

  const fontMatch = className.match(FONT_CLASS_REGEX);
  const fontKey = fontMatch ? fontMatch[1].toLowerCase() : null;
  const cleanedClassName = className.replace(FONT_CLEAN_REGEX, '').trim();

  const result = { fontKey, cleanedClassName };
  if (classCache.size < 500) {
    classCache.set(className, result);
  }
  return result;
}

export default function ThemedText({
  style,
  className = '',
  children,
  darkColor = '',
  lightColor = '',
  ...props
}) {
  const { fontKey: classFontKey, cleanedClassName } = parseClassName(className);

  let styleWeight = null;
  let flatStyle = null;
  if (style) {
    flatStyle = StyleSheet.flatten(style);
    if (!classFontKey && flatStyle?.fontWeight) {
      styleWeight = String(flatStyle.fontWeight).toLowerCase();
    }
  }

  const fontKey = classFontKey || styleWeight;
  const fontFamily = fontMap[fontKey] || fontMap['400'];

  const sanitizeChild = (child) => {
    if (
      child !== null &&
      child !== undefined &&
      typeof child === 'object' &&
      !React.isValidElement(child)
    ) {
      return (
        child.name ||
        child.playerName ||
        child.title ||
        child.prompt ||
        child.message ||
        child.description ||
        ''
      );
    }
    return child;
  };

  const safeChildren = Array.isArray(children)
    ? React.Children.map(children, sanitizeChild)
    : sanitizeChild(children);

  return (
    <Text
      className={`${cleanedClassName} ${darkColor || lightColor}`}
      style={[
        {
          fontFamily,
          includeFontPadding: false,
          textAlignVertical: 'center',
        },
        style,
        { fontFamily },
        !flatStyle?.lineHeight && flatStyle?.fontSize
          ? { lineHeight: Math.round(flatStyle.fontSize * 1.2) }
          : null,
      ]}
      {...props}
    >
      {safeChildren}
    </Text>
  );
}

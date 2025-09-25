import { Text } from 'react-native';
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
  '400': 'DarkerGrotesque_400Regular',
  '500': 'DarkerGrotesque_500Medium',
  '600': 'DarkerGrotesque_600SemiBold',
  '700': 'DarkerGrotesque_700Bold',
  '800': 'DarkerGrotesque_800ExtraBold',
  '900': 'DarkerGrotesque_900Black',
};

export default function ThemedText({
  style,
  className = '',
  children,
  darkColor = '',
  lightColor = '',
  ...props
}) {
  // Match weight keyword or number
  const fontMatch = className.match(
    /\bfont-(thin|light|normal|medium|semibold|bold|extrabold|black|\d{3})\b/i
  );
  const fontKey = fontMatch?.[1]?.toLowerCase();

  const fontFamily = fontMap[fontKey] || fontMap['400'];

  // Remove the matched font class from className
  const cleanedClassName = className
    .replace(
      /\bfont-(thin|light|normal|medium|semibold|bold|extrabold|black|\d{3})\b/gi,
      ''
    )
    .trim();

  return (
    <Text
      className={`${cleanedClassName} ${darkColor || lightColor}`}
      style={[
        {
          fontFamily,
          includeFontPadding: false, // Android: remove default extra padding
          textAlignVertical: 'center',
        },
        style,
        // Apply fallback lineHeight if not provided
        !style?.lineHeight && style?.fontSize
          ? { lineHeight: Math.round(style.fontSize * 1.2) }
          : null,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

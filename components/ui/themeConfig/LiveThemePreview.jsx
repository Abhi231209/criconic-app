import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Image, Platform, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { WEB_URL } from '@/config';
import { THEME_PREVIEW_IMAGES } from './themePreviewImages';

// A web broadcast theme as it will look on the stream: the website's
// /theme-preview page — the real overlay with sample data, in the match's
// jersey colors and team names. Until the page says it's ready (font loaded,
// ticker laid out), or when it can't load (e.g. offline), the theme's
// bundled screenshot is shown instead.

// How long the page gets to load before the screenshot is kept for good.
const READY_TIMEOUT = 10000;
// The theme cards' background, behind a screenshot covering the page.
const COVER_BG = '#070A0F';
// An Image with no width/height takes the picture's own pixel size on web,
// even when absolutely positioned: size it to its box.
const FILL_IMAGE = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' };

export function themePreviewUrl({ componentKey, teamAColor, teamBColor, teamAName, teamBName, strip }) {
  const colors = {};
  if (teamAColor?.config) colors.TeamA = { config: teamAColor.config };
  if (teamBColor?.config) colors.TeamB = { config: teamBColor.config };
  const params = strip ? ['view=strip'] : [];
  if (Object.keys(colors).length) params.push(`colors=${encodeURIComponent(JSON.stringify(colors))}`);
  if (teamAName) params.push(`a=${encodeURIComponent(teamAName)}`);
  if (teamBName) params.push(`b=${encodeURIComponent(teamBName)}`);
  return `${WEB_URL}/theme-preview/${encodeURIComponent(componentKey)}${
    params.length ? `?${params.join('&')}` : ''
  }`;
}

// The bundled screenshot where the ticker sits on a stream: along the
// bottom, or top-left for the corner scorebug.
export function ThemeScreenshotFrame({ componentKey, style }) {
  const shot = THEME_PREVIEW_IMAGES[componentKey];
  const isCorner = componentKey === 'CornerScorebugScorecard';
  return (
    <LinearGradient colors={['#2E6B2E', '#1D4A20', '#123316']} style={[StyleSheet.absoluteFill, style]}>
      {shot && (
        <Image
          source={shot.image}
          resizeMode="contain"
          style={
            isCorner
              ? { position: 'absolute', top: '4%', left: '3%', width: '45%', height: undefined, aspectRatio: shot.aspect }
              : { position: 'absolute', left: '1%', width: '98%', bottom: '3%', height: undefined, aspectRatio: shot.aspect }
          }
        />
      )}
    </LinearGradient>
  );
}

// `strip`: just the ticker (sized by the caller to the theme's proportions),
// instead of the ticker on a mock 16:9 stream.
export default function LiveThemePreview({
  componentKey,
  teamAColor,
  teamBColor,
  teamAName,
  teamBName,
  strip = false,
}) {
  const uri = useMemo(
    () => themePreviewUrl({ componentKey, teamAColor, teamBColor, teamAName, teamBName, strip }),
    [componentKey, teamAColor, teamBColor, teamAName, teamBName, strip]
  );
  const shot = THEME_PREVIEW_IMAGES[componentKey];
  const [shownUri, setShownUri] = useState(null);
  const shownRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const ready = shownUri === uri && !failed;
  const markReady = useCallback(() => {
    shownRef.current = uri;
    setShownUri(uri);
  }, [uri]);

  // A page that never says it's ready (the site doesn't have /theme-preview
  // yet, an error page, no connection) is given up on: the screenshot stays.
  useEffect(() => {
    setFailed(false);
    const t = setTimeout(() => {
      if (shownRef.current !== uri) setFailed(true);
    }, READY_TIMEOUT);
    return () => clearTimeout(t);
  }, [uri]);

  // Web: the page in the iframe posts { type: "theme-preview-ready" }.
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onMessage = (e) => {
      if (e.data?.type === 'theme-preview-ready' && e.data?.key === componentKey) markReady();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [componentKey, markReady]);

  // The page loads underneath and the screenshot covers it until it's ready.
  // (Hiding the WebView with opacity doesn't work on Android: its dark
  // loading/error page showed through as a black box.)
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {!failed &&
        (Platform.OS === 'web' ? (
          React.createElement('iframe', {
            key: uri,
            src: uri,
            title: 'Theme preview',
            scrolling: 'no',
            onError: () => setFailed(true),
            style: {
              border: 0,
              width: '100%',
              height: '100%',
              position: 'absolute',
              inset: 0,
              background: 'transparent',
            },
          })
        ) : (
          <WebView
            key={uri}
            source={{ uri }}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
            containerStyle={{ backgroundColor: 'transparent' }}
            originWhitelist={['*']}
            javaScriptEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            onMessage={(e) => e.nativeEvent.data === 'ready' && markReady()}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
          />
        ))}
      {!ready &&
        (strip ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: COVER_BG }]}>
            {shot && <Image source={shot.image} resizeMode="contain" style={FILL_IMAGE} />}
          </View>
        ) : (
          <ThemeScreenshotFrame componentKey={componentKey} />
        ))}
    </View>
  );
}

// A theme's ticker in a list of themes, at its own proportions: a
// full-width bar, or a compact box (corner scorebug, 9:16 card) kept to a
// readable height. `live` (the selected theme) shows the real overlay in the
// chosen jersey colors; the others show the bundled screenshot. Null for
// themes that aren't website broadcast themes.
const SCREENSHOT_MAX_HEIGHT = 120;
export function ThemeStripPreview({ componentKey, live = false, minWidth = 560, ...colors }) {
  const shot = THEME_PREVIEW_IMAGES[componentKey];
  if (!shot) return null;
  const stripWidth = Math.max(Dimensions.get('window').width - 56, minWidth);
  const height = Math.min(stripWidth / shot.aspect, SCREENSHOT_MAX_HEIGHT);
  const size = { width: height * shot.aspect, height, margin: 6 };
  if (!live) return <Image source={shot.image} style={size} resizeMode="contain" />;
  return (
    <View style={size}>
      <LiveThemePreview componentKey={componentKey} strip {...colors} />
    </View>
  );
}

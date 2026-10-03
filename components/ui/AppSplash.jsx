import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Image, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import ThemedText from "@/components/ui/custom/ThemedText";

// The splash stays on screen at least this long, however fast the app starts.
export const SPLASH_MIN_MS = 2400;

const INK = "#0A0F1C";
const TEAL = "#4DD6C7";
const CREAM = "#F2F6FB";
const SLATE = "#A9B4C6";

// Same artwork as the native splash (app.json), so the hand-over is seamless.
const WORDMARK = require("../../assets/splash-icon.png");
const WORDMARK_RATIO = 900 / 220;

// How far the wordmark moves up to make room for the details below it.
const LIFT = 84;
// Inner (dashed) ring radius, as a share of the backdrop's half-width.
const INNER_RING = 0.52;
const TRACK_WIDTH = 168;
const BALL = 14;

const FEATURES = [
  { key: "scoring", label: "Live scoring", icon: "cricket", material: true },
  { key: "tournaments", label: "Tournaments", icon: "trophy" },
  { key: "stats", label: "Player stats", icon: "stats-chart" },
];

const EASE_OUT = Easing.out(Easing.cubic);

/** Fades and slides its children in once `show` turns true. */
function Rise({ show, delay = 0, style, children }) {
  const shown = useSharedValue(0);

  useEffect(() => {
    if (show) {
      shown.value = withDelay(delay, withTiming(1, { duration: 480, easing: EASE_OUT }));
    }
  }, [show, delay, shown]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: interpolate(shown.value, [0, 1], [14, 0]) }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/**
 * The glow and the field plan (boundary and inner ring) behind the wordmark.
 * The dashed inner ring turns slowly.
 */
function Backdrop({ size, style }) {
  const spin = useSharedValue(0);
  const c = size / 2;

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 40000, easing: Easing.linear }),
      -1
    );
  }, [spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="splashGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={TEAL} stopOpacity="0.30" />
            <Stop offset="0.55" stopColor={TEAL} stopOpacity="0.08" />
            <Stop offset="1" stopColor={TEAL} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill="url(#splashGlow)" />
        <Circle cx={c} cy={c} r={c * 0.82} stroke={TEAL} strokeOpacity={0.1} strokeWidth={1.5} fill="none" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={c}
            cy={c}
            r={c * INNER_RING}
            stroke={TEAL}
            strokeOpacity={0.2}
            strokeWidth={1.5}
            strokeDasharray="10 9"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** Start-up progress: a cricket ball rolling along the track. */
function ProgressTrack({ progress }) {
  const fillStyle = useAnimatedStyle(() => ({
    width: progress.value * TRACK_WIDTH,
  }));

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * TRACK_WIDTH - BALL / 2 },
      { rotate: `${progress.value * 720}deg` },
    ],
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.trackFill, fillStyle]} />
      <Animated.View style={[styles.ball, ballStyle]}>
        <Svg width={BALL} height={BALL} viewBox="0 0 14 14">
          <Circle cx={7} cy={7} r={7} fill={CREAM} />
          <Path
            d="M4.6 1.3 C 7.6 4, 7.6 10, 4.6 12.7"
            stroke={INK}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * Launch screen shown over the app while it starts. It opens on the same
 * centred wordmark as the native splash, then lifts it to show what Criconic
 * does and how start-up is going.
 *
 * @param {boolean} fontsLoaded - text only appears once the app fonts are in
 * @param {boolean} ready - the app underneath is ready to be shown
 * @param {string} [userName] - signed-in user's name, for the welcome line
 * @param {function} onDone - called once the splash has faded out
 */
export default function AppSplash({ fontsLoaded, ready, userName, onDone }) {
  const { width, height } = useWindowDimensions();
  // When the splash was first actually painted; the minimum time counts from
  // here, not from mount, so a busy start-up can't eat into it.
  const [shownAt, setShownAt] = useState(null);
  const finished = useRef(false);

  const backdrop = useSharedValue(0);
  const lift = useSharedValue(0);
  const progress = useSharedValue(0);
  const exit = useSharedValue(0);

  const logoWidth = Math.min(width * 0.6, 300);
  const logoHeight = logoWidth / WORDMARK_RATIO;
  const backdropSize = Math.min(Math.max(width, 320) * 1.25, 620);
  // The features sit just outside the dashed ring, which is centred on the
  // lifted wordmark.
  const featuresTop = height / 2 - LIFT + (backdropSize / 2) * INNER_RING + 22;

  // Read through a ref so a re-render of the parent can't restart the exit.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDoneRef.current?.();
  }, []);

  useEffect(() => {
    backdrop.value = withTiming(1, { duration: 900, easing: EASE_OUT });
    progress.value = withTiming(0.2, { duration: 500, easing: EASE_OUT });

    // Two frames on, the first one has been painted.
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setShownAt(Date.now()));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [backdrop, progress]);

  useEffect(() => {
    if (!fontsLoaded) return;
    lift.value = withTiming(1, { duration: 620, easing: EASE_OUT });
    progress.value = withTiming(0.62, { duration: 900, easing: EASE_OUT });
  }, [fontsLoaded, lift, progress]);

  useEffect(() => {
    if (!ready || !shownAt) return undefined;
    const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - shownAt));
    progress.value = withTiming(0.9, { duration: Math.max(wait, 300), easing: EASE_OUT });

    const leave = setTimeout(() => {
      progress.value = withTiming(1, { duration: 260 });
      exit.value = withDelay(
        260,
        withTiming(1, { duration: 380, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) runOnJS(finish)();
        })
      );
    }, wait);
    // Never leave the app covered if the animation callback doesn't arrive.
    const safety = setTimeout(finish, wait + 1200);

    return () => {
      clearTimeout(leave);
      clearTimeout(safety);
    };
  }, [ready, shownAt, progress, exit, finish]);

  const exitStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: interpolate(exit.value, [0, 1], [1, 1.05]) }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -LIFT * lift.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
    transform: [{ scale: interpolate(backdrop.value, [0, 1], [0.8, 1]) }],
  }));

  const firstName = userName?.trim().split(/\s+/)[0];
  const status = !ready
    ? "Getting your matches ready…"
    : firstName
      ? `Welcome back, ${firstName}`
      : "Ready to play";
  const version = Constants.expoConfig?.version;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, exitStyle]}
      accessibilityRole="progressbar"
      accessibilityLabel="Criconic is starting"
    >
      <LinearGradient
        colors={[INK, "#111B36", INK]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Wordmark: starts dead centre like the native splash, then lifts */}
      <Animated.View
        style={[
          styles.logo,
          {
            width: logoWidth,
            height: logoHeight,
            left: (width - logoWidth) / 2,
            top: (height - logoHeight) / 2,
          },
          logoStyle,
        ]}
      >
        <Backdrop
          size={backdropSize}
          style={[
            {
              left: (logoWidth - backdropSize) / 2,
              top: (logoHeight - backdropSize) / 2,
            },
            backdropStyle,
          ]}
        />
        <Image
          source={WORDMARK}
          resizeMode="contain"
          style={{ width: logoWidth, height: logoHeight }}
        />
      </Animated.View>

      {/* The last status bar mounted wins, and the app's own mounts after
          this one; re-mounting on `ready` puts the splash's back on top. */}
      <StatusBar key={ready ? "ready" : "starting"} style="light" />

      {fontsLoaded && (
        <>
          <View
            style={[styles.details, { top: height / 2 + logoHeight / 2 - LIFT + 18 }]}
          >
            <Rise show delay={220}>
              <ThemedText className="font-semibold" style={styles.tagline}>
                Live Cricket Scoring & Tournaments
              </ThemedText>
            </Rise>
          </View>

          <View style={[styles.details, { top: featuresTop }]}>
            <View style={styles.features}>
              {FEATURES.map((feature, index) => {
                const Icon = feature.material ? MaterialCommunityIcons : Ionicons;
                return (
                  <Rise
                    key={feature.key}
                    show
                    delay={380 + index * 110}
                    style={styles.feature}
                  >
                    <View style={styles.featureIcon}>
                      <Icon name={feature.icon} size={20} color={TEAL} />
                    </View>
                    <ThemedText className="font-semibold" style={styles.featureLabel}>
                      {feature.label}
                    </ThemedText>
                  </Rise>
                );
              })}
            </View>
          </View>

          <Rise show delay={300} style={styles.footer}>
            <ThemedText
              className="font-semibold"
              style={styles.status}
              accessibilityLiveRegion="polite"
            >
              {status}
            </ThemedText>
            <ProgressTrack progress={progress} />
            {!!version && (
              <ThemedText className="font-medium" style={styles.version}>
                v{version}
              </ThemedText>
            )}
          </Rise>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: INK,
    zIndex: 1000,
    elevation: 1000,
    overflow: "hidden",
  },
  logo: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: SLATE,
    textAlign: "center",
  },
  features: {
    flexDirection: "row",
    justifyContent: "center",
  },
  feature: {
    width: 96,
    alignItems: "center",
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(77,214,199,0.10)",
    borderWidth: 1,
    borderColor: "rgba(77,214,199,0.28)",
  },
  featureLabel: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 16,
    color: "#C3CFDF",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 44,
    alignItems: "center",
  },
  status: {
    fontSize: 14,
    lineHeight: 18,
    color: CREAM,
  },
  track: {
    width: TRACK_WIDTH,
    height: 3,
    marginTop: 14,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  trackFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  ball: {
    position: "absolute",
    top: (3 - BALL) / 2,
    left: 0,
    width: BALL,
    height: BALL,
  },
  version: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 14,
    color: "rgba(169,180,198,0.6)",
  },
});

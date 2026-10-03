import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";

// Built by brand/build_hero.py. Each keeps its left half quiet for the copy.
const ART = {
  live: {
    image: require("../../../assets/hero/hero-live.jpg"),
    accent: "#60A5FA",
  },
  tournaments: {
    image: require("../../../assets/hero/hero-tournaments.jpg"),
    accent: "#FBBF24",
  },
  host: {
    image: require("../../../assets/hero/hero-host.jpg"),
    accent: "#34D399",
  },
};

// Shown until the admin configures holdings on the server.
const DEFAULT_SLIDES = [
  {
    id: "default-1",
    art: "live",
    tag: "Live Cricket",
    heading: "Live Cricket Arena",
    description: "Ball-by-ball commentary and real-time scores",
    buttonText: "Watch live",
    isMatch: true,
    callToAction: "AllMatches",
  },
  {
    id: "default-2",
    art: "tournaments",
    tag: "Tournaments",
    heading: "Tournaments & Leagues",
    description: "Featured tournaments, points tables and results",
    buttonText: "Explore",
    isMatch: false,
    callToAction: "AllTournaments",
  },
  {
    id: "default-3",
    art: "host",
    tag: "Host a Match",
    heading: "Start Your Own Match",
    description: "Create teams, score every ball and broadcast it live",
    buttonText: "Get started",
    isMatch: false,
    callToAction: "CreateMatch",
  },
];

const GUTTER = 16;
const RADIUS = 16;
// Room under the card so its shadow isn't cut off by the carousel's clipping.
const SHADOW_ROOM = 14;
// How far the picture lags behind its card while swiping.
const PARALLAX = 24;
// A buttonText longer than this is a sentence, not a button label.
const MAX_BUTTON_LABEL = 22;

const artFor = (item, index) =>
  ART[item?.art] ||
  (item?.isMatch ? ART.live : index % 2 ? ART.host : ART.tournaments);

function LiveDot() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
      -1
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.7, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.6]) }],
  }));

  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.tagDot, styles.liveRing, ringStyle]} />
      <View style={[styles.tagDot, { backgroundColor: "#EF4444" }]} />
    </View>
  );
}

function HeroSlide({ item, index, animationValue, width, height, onPress }) {
  const art = artFor(item, index);
  const cardWidth = width - GUTTER * 2;
  const [imageFailed, setImageFailed] = useState(false);
  const source =
    item?.bannerImage && !imageFailed ? { uri: item.bannerImage } : art.image;

  const label = item?.buttonText?.trim();
  const labelIsSentence = label?.length > MAX_BUTTON_LABEL;
  const description = item?.description || (labelIsSentence ? label : null);
  const buttonLabel =
    label && !labelIsSentence ? label : item?.isMatch ? "Watch now" : "Explore";

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          animationValue.value,
          [-1, 0, 1],
          [PARALLAX, 0, -PARALLAX],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(animationValue.value),
      [0, 0.7],
      [1, 0],
      Extrapolation.CLAMP
    ),
    transform: [{ translateX: animationValue.value * 18 }],
  }));

  return (
    <View style={{ width, paddingHorizontal: GUTTER }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onPress?.(item)}
        accessibilityRole="button"
        accessibilityLabel={[item?.heading, buttonLabel].filter(Boolean).join(". ")}
        style={[styles.shadow, { height }]}
      >
        <View style={styles.card}>
          <Animated.Image
            source={source}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            style={[
              styles.image,
              { width: cardWidth + PARALLAX * 2, height },
              imageStyle,
            ]}
          />
          {/* Scrims: left for the copy, bottom so the button always reads */}
          <LinearGradient
            colors={["rgba(5,9,21,0.94)", "rgba(5,9,21,0.62)", "rgba(5,9,21,0)"]}
            locations={[0, 0.42, 0.8]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(5,9,21,0)", "rgba(5,9,21,0.55)"]}
            locations={[0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <Animated.View style={[styles.copy, copyStyle]}>
            <View style={styles.tag}>
              {item?.isMatch ? (
                <LiveDot />
              ) : (
                <View style={styles.dotWrap}>
                  <View style={[styles.tagDot, { backgroundColor: art.accent }]} />
                </View>
              )}
              <ThemedText
                className="text-white font-bold uppercase"
                style={styles.tagText}
                numberOfLines={1}
              >
                {item?.tag || (item?.isMatch ? "Live Cricket" : "Featured")}
              </ThemedText>
            </View>

            <View>
              {!!item?.heading && (
                <ThemedText
                  className="text-white font-extrabold"
                  style={styles.heading}
                  numberOfLines={2}
                >
                  {item.heading}
                </ThemedText>
              )}
              {!!description && (
                <ThemedText
                  className="font-medium"
                  style={styles.description}
                  numberOfLines={2}
                >
                  {description}
                </ThemedText>
              )}
              <View style={styles.button}>
                <ThemedText
                  className="font-extrabold"
                  style={styles.buttonText}
                  numberOfLines={1}
                >
                  {buttonLabel}
                </ThemedText>
                <View style={[styles.buttonArrow, { backgroundColor: art.accent }]}>
                  <Ionicons name="arrow-forward" size={12} color="#0A0F1C" />
                </View>
              </View>
            </View>
          </Animated.View>

          <View pointerEvents="none" style={styles.edge} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

function PageDot({ index, count, progress, activeColor, idleColor }) {
  const style = useAnimatedStyle(() => {
    const raw = Math.abs(progress.value - index);
    // Looping: the last slide is also one step away from the first.
    const distance = Math.min(raw, count - raw, 1);
    return {
      width: interpolate(distance, [0, 1], [20, 6]),
      backgroundColor: interpolateColor(distance, [0, 1], [activeColor, idleColor]),
    };
  });

  return <Animated.View style={[styles.pageDot, style]} />;
}

/**
 * Home hero swiper. `banners` are the admin-configured holdings; without any,
 * the built-in slides are shown. The carousel bleeds out of the page gutter so
 * cards swipe edge to edge while resting in line with the rest of the page.
 */
export default function HeroCarousel({ banners, onPress }) {
  const isDarkMode = useColorScheme() === "dark";
  const progress = useSharedValue(0);
  // The screen width is right on phones; on web the page column is narrower,
  // so the laid-out width takes over once it's known.
  const { width: screenWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(null);
  const width = measuredWidth ?? screenWidth;

  const slides = useMemo(
    () => (banners?.length > 0 ? banners : DEFAULT_SLIDES),
    [banners]
  );
  const many = slides.length > 1;
  const cardHeight = Math.round(Math.min((width - GUTTER * 2) * 0.56, 300));

  return (
    <View
      style={{ marginHorizontal: -GUTTER }}
      className="mt-2 mb-1"
      onLayout={(e) => setMeasuredWidth(Math.round(e.nativeEvent.layout.width))}
    >
      <Carousel
        loop={many}
        enabled={many}
        width={width}
        height={cardHeight + SHADOW_ROOM}
        autoPlay={many}
        autoPlayInterval={5000}
        scrollAnimationDuration={700}
        data={slides}
        onProgressChange={progress}
        // Only claim clearly sideways drags so the page still scrolls vertically.
        onConfigurePanGesture={(pan) => pan.activeOffsetX([-10, 10])}
        renderItem={({ item, index, animationValue }) => (
          <HeroSlide
            item={item}
            index={index}
            animationValue={animationValue}
            width={width}
            height={cardHeight}
            onPress={onPress}
          />
        )}
      />

      {many && (
        <View style={styles.pagination}>
          {slides.map((item, index) => (
            <PageDot
              key={item?.id || item?._id || index}
              index={index}
              count={slides.length}
              progress={progress}
              activeColor={isDarkMode ? "#60A5FA" : "#2563EB"}
              idleColor={isDarkMode ? "#374151" : "#CBD5E1"}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: RADIUS,
    backgroundColor: "#0A0F1C",
    shadowColor: "#0A0F1C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  card: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: "hidden",
    backgroundColor: "#0A0F1C",
  },
  image: {
    position: "absolute",
    top: 0,
    left: -PARALLAX,
  },
  copy: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
  },
  dotWrap: {
    width: 8,
    height: 8,
    marginRight: 6,
  },
  tagDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveRing: {
    backgroundColor: "#EF4444",
  },
  tagText: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  heading: {
    fontSize: 22,
    lineHeight: 24,
    maxWidth: "72%",
  },
  description: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 3,
    maxWidth: "62%",
    color: "#CBD5E1",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "72%",
    marginTop: 10,
    paddingLeft: 12,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  buttonText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    marginRight: 8,
    color: "#0A0F1C",
  },
  buttonArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    height: 6,
  },
  pageDot: {
    height: 6,
    borderRadius: 3,
  },
});

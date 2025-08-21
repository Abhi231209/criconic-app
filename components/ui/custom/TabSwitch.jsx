import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ThemedText from "./ThemedText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TabSwitch = ({
  tabs,
  onChange,
  initialIndex = 0,
  tabBarHeight = 40,
  activeColor = "#007AFF",
  inactiveColor = "#8E8E93",
  underlineColor = "#007AFF",
  backgroundColor = "#FFFFFF",
  springConfig = { damping: 15, stiffness: 150 },
  enableSwipeGesture = true,
  contentStyle,
  tabStyle,
  underlineHeight = 3,
  animationDuration = 300,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Shared values for reanimated
  const translateX = useSharedValue(
    initialIndex * (SCREEN_WIDTH / tabs.length)
  );
  const contentTranslateX = useSharedValue(-initialIndex * SCREEN_WIDTH);
  const scale = useSharedValue(1);

  const tabWidth = SCREEN_WIDTH / tabs.length;
  const underlineWidth = tabWidth * 0.6;

  const handleTabPress = useCallback(
    (index) => {
      if (index === activeIndex) return;
      setActiveIndex(index);

      translateX.value = withSpring(index * tabWidth, springConfig);

      contentTranslateX.value = withTiming(-index * SCREEN_WIDTH, {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      });

      scale.value = withSpring(1.05, {}, () => {
        scale.value = withSpring(1, {});
      });

      if (onChange) onChange(tabs[index], index);
    },
    [activeIndex, tabs, translateX, tabWidth, springConfig, contentTranslateX, animationDuration, scale, onChange]
  );

  const underlineAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + (tabWidth - underlineWidth) / 2 },
      { scaleX: scale.value },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentTranslateX.value }],
  }));

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          if (!enableSwipeGesture) return;
        })
        .onEnd((event) => {
          if (!enableSwipeGesture) return;

          // Prevent out-of-bounds
          let newIndex = activeIndex;
          if (event.translationX > 50 && activeIndex > 0) {
            newIndex = activeIndex - 1;
          } else if (
            event.translationX < -50 &&
            activeIndex < tabs.length - 1
          ) {
            newIndex = activeIndex + 1;
          }

          if (newIndex !== activeIndex) {
            runOnJS(handleTabPress)(newIndex);
          } else {
            contentTranslateX.value = withSpring(
              -activeIndex * SCREEN_WIDTH,
              springConfig
            );
          }
        }),
    [activeIndex, enableSwipeGesture, tabs.length, springConfig, contentTranslateX, handleTabPress]
  );

  const getTabTextStyle = useCallback(
    (index) => ({
      color: index === activeIndex ? activeColor : inactiveColor,
      fontWeight: index === activeIndex ? "600" : "400",
      fontSize: 16,
      textAlign: "center",
      lineHeight: tabBarHeight - 10,
    }),
    [activeIndex, activeColor, inactiveColor, tabBarHeight]
  );

  return (
    <View style={[styles.container, { flex: 1 }]}>
      {/* Tab Header */}
      <View
        style={[styles.tabHeader, { height: tabBarHeight, backgroundColor }]}
      >
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id || index}
            style={[styles.tab, { width: tabWidth }, tabStyle]}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.7}
          >
            <ThemedText style={getTabTextStyle(index)}>{tab.label}</ThemedText>
          </TouchableOpacity>
        ))}

        {/* Animated underline */}
        <Animated.View
          style={[
            styles.underline,
            {
              width: underlineWidth,
              height: underlineHeight,
              backgroundColor: underlineColor,
            },
            underlineAnimatedStyle,
          ]}
        />
      </View>

      {/* Content Area with Swipe Gesture */}
      <GestureDetector gesture={swipeGesture}>
        <View style={[styles.contentContainer, contentStyle, { flex: 1 }]}>
          <Animated.View
            style={[
              styles.contentWrapper,
              { width: SCREEN_WIDTH * tabs.length },
              contentAnimatedStyle,
            ]}
          >
            {tabs.map((tab, index) => (
              <View key={tab.id || index} style={[styles.contentTab, { width: SCREEN_WIDTH }]}>
                {tab.content || (
                  <View style={styles.defaultContent}>
                    <Text style={styles.defaultText}>{tab.label} Content</Text>
                  </View>
                )}
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabHeader: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    overflow: "hidden",
  },
  contentWrapper: {
    flexDirection: "row",
    height: "100%",
  },
  contentTab: {
    width: "100%",
  },
  defaultContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  defaultText: {
    fontSize: 18,
    color: "#8E8E93",
    fontWeight: "500",
  },
});

export default TabSwitch;
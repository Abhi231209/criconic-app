import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import PagerView from "react-native-pager-view";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TabSwitch = ({
  tabs,
  onChange,
  initialIndex = 0,
  tabBarHeight = 40,
  activeColor,
  inactiveColor,
  underlineColor,
  backgroundColor,
  springConfig = { damping: 15, stiffness: 150 },
  enableSwipeGesture = true,
  contentStyle,
  tabStyle,
  underlineHeight = 3,
  animationDuration = 250,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // Blue/Cyan default color scheme
  const defaultActiveColor = "#2196F3";
  const defaultInactiveColor = isDarkMode ? "#90A4AE" : "#78909C";
  const defaultUnderlineColor = "#2196F3";
  const defaultBackgroundColor = isDarkMode ? "#121212" : "#FFFFFF";
  const defaultTabBarBackground = isDarkMode ? "#1E1E1E" : "#FFFFFF";

  const finalActiveColor = activeColor || defaultActiveColor;
  const finalInactiveColor = inactiveColor || defaultInactiveColor;
  const finalUnderlineColor = underlineColor || defaultUnderlineColor;
  const finalBackgroundColor = backgroundColor || defaultBackgroundColor;
  const finalTabBarBackground = defaultTabBarBackground;

  // Safe initial index
  const safeInitialIndex = Math.min(
    Math.max(0, typeof initialIndex === "number" ? initialIndex : 0),
    Array.isArray(tabs) && tabs.length > 0 ? tabs.length - 1 : 0
  );

  const [activeIndex, setActiveIndex] = useState(safeInitialIndex);

  const pagerRef = useRef(null);
  const tabBarScrollViewRef = useRef(null);
  const tabLayouts = useRef({});
  const hasUserSwitchedRef = useRef(false);
  const lastSelectedIndexRef = useRef(safeInitialIndex);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const activeTabIdRef = useRef(tabs?.[safeInitialIndex]?.id || null);

  // Animated underline shared values
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  // Auto-scroll the tab bar to keep the active tab centered and visible
  const scrollToTab = useCallback((index) => {
    const layout = tabLayouts.current[index];
    if (layout && tabBarScrollViewRef.current) {
      const centerOffset = layout.x - (SCREEN_WIDTH - layout.width) / 2;
      tabBarScrollViewRef.current.scrollTo({
        x: Math.max(0, centerOffset),
        animated: true,
      });
    }
  }, []);

  const updateIndicator = useCallback((index, animated = true) => {
    const layout = tabLayouts.current[index];
    if (layout) {
      if (animated) {
        indicatorX.value = withTiming(layout.x, {
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
        });
        indicatorW.value = withTiming(layout.width, {
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        indicatorX.value = layout.x;
        indicatorW.value = layout.width;
      }
    }
  }, [animationDuration, indicatorX, indicatorW]);

  // Handle tab button press
  const handleTabPress = useCallback((index) => {
    hasUserSwitchedRef.current = true;
    lastSelectedIndexRef.current = index;
    setActiveIndex(index);
    activeTabIdRef.current = tabsRef.current?.[index]?.id;

    if (Platform.OS !== "web") {
      pagerRef.current?.setPage(index);
    }
    updateIndicator(index, true);
    scrollToTab(index);

    if (onChangeRef.current) {
      try {
        onChangeRef.current(tabsRef.current?.[index], index);
      } catch (e) {
        console.error("Error in TabSwitch onChange:", e);
      }
    }
  }, [updateIndicator, scrollToTab]);

  // Handle pager page selected (swipe)
  const handlePageSelected = useCallback((e) => {
    const newIndex = e.nativeEvent.position;
    if (newIndex === lastSelectedIndexRef.current) return;

    hasUserSwitchedRef.current = true;
    lastSelectedIndexRef.current = newIndex;
    setActiveIndex(newIndex);
    activeTabIdRef.current = tabsRef.current?.[newIndex]?.id;

    updateIndicator(newIndex, true);
    scrollToTab(newIndex);

    if (onChangeRef.current) {
      try {
        onChangeRef.current(tabsRef.current?.[newIndex], newIndex);
      } catch (err) {
        console.error("Error in TabSwitch onChange:", err);
      }
    }
  }, [updateIndicator, scrollToTab]);

  // Handle real-time pager scroll for smooth indicator transition
  const handlePageScroll = useCallback((e) => {
    const { position, offset } = e.nativeEvent;
    const current = tabLayouts.current[position];
    const next = tabLayouts.current[position + 1];

    if (current && next && offset > 0) {
      indicatorX.value = current.x + (next.x - current.x) * offset;
      indicatorW.value = current.width + (next.width - current.width) * offset;
    }
  }, [indicatorX, indicatorW]);

  // Tab layout measurement
  const onTabLayout = useCallback((index, event) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[index] = { x, width };

    // Initialize indicator on active tab once laid out
    if (index === activeIndex) {
      if (indicatorW.value === 0) {
        indicatorX.value = x;
        indicatorW.value = width;
      }
      scrollToTab(index);
    }
  }, [activeIndex, indicatorW, indicatorX, scrollToTab]);

  // If initialIndex changes before user interaction, update active tab
  useEffect(() => {
    if (
      !hasUserSwitchedRef.current &&
      typeof initialIndex === "number" &&
      initialIndex >= 0 &&
      Array.isArray(tabs) &&
      initialIndex < tabs.length
    ) {
      if (initialIndex !== activeIndex) {
        setActiveIndex(initialIndex);
        lastSelectedIndexRef.current = initialIndex;
        activeTabIdRef.current = tabs[initialIndex]?.id;
        if (Platform.OS !== "web") {
          pagerRef.current?.setPageWithoutAnimation(initialIndex);
        }
        updateIndicator(initialIndex, false);
        scrollToTab(initialIndex);
      }
    }
  }, [initialIndex, tabs, activeIndex, updateIndicator, scrollToTab]);

  // Handle dynamic changes in tabs array (e.g., Live tab removed when match ends)
  useEffect(() => {
    if (!Array.isArray(tabs) || tabs.length === 0) return;

    const currentId = activeTabIdRef.current;
    if (currentId) {
      const foundIdx = tabs.findIndex((t) => t.id === currentId);
      if (foundIdx !== -1) {
        if (foundIdx !== activeIndex) {
          setActiveIndex(foundIdx);
          lastSelectedIndexRef.current = foundIdx;
          if (Platform.OS !== "web") {
            pagerRef.current?.setPageWithoutAnimation(foundIdx);
          }
          updateIndicator(foundIdx, false);
          scrollToTab(foundIdx);
        }
        return;
      }
    }

    // Active tab was removed or not found
    const targetIdx = Math.min(
      Math.max(0, typeof initialIndex === "number" ? initialIndex : 0),
      tabs.length - 1
    );
    setActiveIndex(targetIdx);
    lastSelectedIndexRef.current = targetIdx;
    activeTabIdRef.current = tabs[targetIdx]?.id;
    if (Platform.OS !== "web") {
      pagerRef.current?.setPageWithoutAnimation(targetIdx);
    }
    updateIndicator(targetIdx, false);
    scrollToTab(targetIdx);
  }, [tabs]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
    return (
      <View
        style={[
          styles.container,
          {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: finalBackgroundColor,
          },
        ]}
      >
        <Text style={[styles.defaultText, { color: finalInactiveColor }]}>
          No tabs available
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { flex: 1, backgroundColor: finalBackgroundColor }]}>
      {/* Scrollable Tab Bar */}
      <View
        style={[
          styles.tabBarContainer,
          {
            height: tabBarHeight,
            backgroundColor: finalTabBarBackground,
            borderBottomColor: isDarkMode ? "#37474F" : "#E3F2FD",
          },
        ]}
      >
        <ScrollView
          ref={tabBarScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[
            styles.tabBarContent,
            tabs.length <= 4 && { minWidth: "100%" },
          ]}
        >
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex;
            return (
              <TouchableOpacity
                key={tab.id || `tab_btn_${index}`}
                onPress={() => handleTabPress(index)}
                onLayout={(e) => onTabLayout(index, e)}
                style={[
                  styles.tabButton,
                  {
                    minWidth: Math.max(SCREEN_WIDTH / Math.min(tabs.length, 4), 60),
                  },
                  tabStyle,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? finalActiveColor : finalInactiveColor,
                      fontWeight: isActive ? "600" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label || tab.name || `Tab ${index}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Underline Indicator */}
          <Animated.View
            style={[
              styles.indicator,
              {
                height: underlineHeight,
                backgroundColor: finalUnderlineColor,
              },
              animatedIndicatorStyle,
            ]}
          />
        </ScrollView>
      </View>

      {/* Pages View */}
      {Platform.OS === "web" ? (
        <View style={[{ flex: 1 }, contentStyle]}>
          {tabs[activeIndex]?.content || null}
        </View>
      ) : (
        <PagerView
          ref={pagerRef}
          style={[{ flex: 1 }, contentStyle]}
          initialPage={safeInitialIndex}
          onPageSelected={handlePageSelected}
          onPageScroll={handlePageScroll}
          scrollEnabled={enableSwipeGesture}
        >
          {tabs.map((tab, index) => (
            <View
              key={tab.id || `tab_page_${index}`}
              collapsable={false}
              style={styles.page}
            >
              {tab.content || <View />}
            </View>
          ))}
        </PagerView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    position: "relative",
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 14,
    textTransform: "none",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    borderRadius: 2,
  },
  page: {
    flex: 1,
  },
  defaultText: {
    fontSize: 16,
  },
});

export default TabSwitch;
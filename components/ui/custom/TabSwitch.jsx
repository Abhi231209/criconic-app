import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const Tab = createMaterialTopTabNavigator();

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
  animationDuration = 300,
  gestureSensitivity = 1.5,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  // Blue/Cyan color scheme
  const defaultActiveColor = '#2196F3'; // Cyan
  const defaultInactiveColor = isDarkMode ? '#90A4AE' : '#78909C'; // Blue-gray
  const defaultUnderlineColor = '#2196F3'; // Blue
  const defaultBackgroundColor = isDarkMode ? '#121212' : '#FFFFFF';
  const defaultTabBarBackground = isDarkMode ? '#1E1E1E' : '#FFFFFF';
  const defaultIndicatorBackground = isDarkMode ? '#333333' : '#F5F5F5';

  // Use provided colors or fall back to blue/cyan defaults
  const finalActiveColor = activeColor || defaultActiveColor;
  const finalInactiveColor = inactiveColor || defaultInactiveColor;
  const finalUnderlineColor = underlineColor || defaultUnderlineColor;
  const finalBackgroundColor = backgroundColor || defaultBackgroundColor;
  const finalTabBarBackground = defaultTabBarBackground;
  const finalIndicatorBackground = defaultIndicatorBackground;

  // Safety check for tabs array
  if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
    console.warn('TabSwitch: tabs prop is invalid or empty');
    return (
      <View style={[styles.container, { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: finalBackgroundColor 
      }]}>
        <Text style={[styles.defaultText, { color: finalInactiveColor }]}>
          No tabs available
        </Text>
      </View>
    );
  }

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const contentStyleRef = useRef(contentStyle);
  contentStyleRef.current = contentStyle;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Render tab screens with stable children callbacks rather than newly instantiated component functions
  const renderTabScreens = () => {
    return tabs.map((tab, index) => {
      const routeName = `Tab_${index}`;

      return (
        <Tab.Screen
          key={tab.id || `tab_${index}`}
          name={routeName}
          options={{
            tabBarLabel: tab.label || tab.name || `Tab${index}`,
          }}
          listeners={{
            tabPress: () => {
              if (onChangeRef.current) {
                try {
                  onChangeRef.current(tab, index);
                } catch (error) {
                  console.error('Error in onChange callback:', error);
                }
              }
            },
          }}
        >
          {() => {
            const currentTab = tabsRef.current?.[index];
            if (currentTab?.content) {
              return currentTab.content;
            }
            if (Array.isArray(contentStyleRef.current?.content)) {
              return contentStyleRef.current.content[index] || <View />;
            }
            return <View />;
          }}
        </Tab.Screen>
      );
    });
  };

  // Get the initial route name based on initialIndex
  const getInitialRouteName = () => {
    const safeIndex = Math.min(Math.max(0, initialIndex), tabs.length - 1);
    return `Tab_${safeIndex}`;
  };

  return (
    <View style={[styles.container, { flex: 1, backgroundColor: finalBackgroundColor }]}>
      <Tab.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          tabBarLabelStyle: { 
            fontSize: 14, 
            fontWeight: '500',
            textTransform: 'none',
          },
          tabBarIndicatorStyle: { 
            backgroundColor: finalUnderlineColor,
            height: underlineHeight,
          },
          tabBarStyle: { 
            backgroundColor: finalTabBarBackground,
            height: tabBarHeight,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#37474F' : '#E3F2FD',
          },
          tabBarActiveTintColor: finalActiveColor,
          tabBarInactiveTintColor: finalInactiveColor,
          tabBarPressColor: 'transparent',
          tabBarPressOpacity: 0.8,
          tabBarBounces: false,
          tabBarScrollEnabled: tabs.length > 3,
          tabBarContentContainerStyle: { 
            paddingHorizontal: 10,
            alignItems: 'center',
          },
          tabBarItemStyle: { 
            paddingVertical: 10,
            minWidth: SCREEN_WIDTH / Math.min(tabs.length, 4),
          },
          tabBarIndicatorContainerStyle: { 
            paddingHorizontal: 10,
          },
          tabBarGap: 0,
          swipeEnabled: enableSwipeGesture,
          animationEnabled: true,
          lazy: true,
        }}
      >
        {renderTabScreens()}
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  defaultText: {
    fontSize: 16,
  },
});

export default TabSwitch;
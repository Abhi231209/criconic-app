// components/ui/custom/SwipeableTabs.jsx
import React, { useRef, useEffect } from 'react';
import { View, PanResponder, Dimensions, Animated } from 'react-native';
import ThemedText from './ThemedText';

const { width } = Dimensions.get('window');

const SwipeableTabs = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  children,
  isDarkMode 
}) => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([
      null,
      { dx: pan.x }
    ], { useNativeDriver: false }),
    onPanResponderRelease: (e, gestureState) => {
      if (Math.abs(gestureState.dx) > width * 0.2) {
        const currentIndex = tabs.findIndex(tab => tab.value === activeTab);
        if (gestureState.dx > 0) {
          // Swipe right - go to previous tab
          const newIndex = Math.max(0, currentIndex - 1);
          onTabChange(tabs[newIndex].value);
        } else {
          // Swipe left - go to next tab
          const newIndex = Math.min(tabs.length - 1, currentIndex + 1);
          onTabChange(tabs[newIndex].value);
        }
      }
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true
      }).start();
    }
  });

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

export default SwipeableTabs;
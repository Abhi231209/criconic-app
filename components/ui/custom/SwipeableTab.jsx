// components/ui/custom/SwipeableTabs.jsx
import React, { useRef, useEffect } from 'react';
import { View, PanResponder, Dimensions } from 'react-native';
import ThemedText from './ThemedText';

const { width } = Dimensions.get('window');

const SwipeableTabs = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  children,
  isDarkMode 
}) => {
  const tabsRef = useRef(tabs);
  const activeTabRef = useRef(activeTab);
  const onTabChangeRef = useRef(onTabChange);

  useEffect(() => {
    tabsRef.current = tabs;
    activeTabRef.current = activeTab;
    onTabChangeRef.current = onTabChange;
  }, [tabs, activeTab, onTabChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        // Only capture if horizontal movement is dominant and exceeds minimum threshold
        return (
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (e, gestureState) => {
        const currentTabs = tabsRef.current || [];
        const currentActive = activeTabRef.current;
        const changeTab = onTabChangeRef.current;

        if (Math.abs(gestureState.dx) > width * 0.2) {
          const currentIndex = currentTabs.findIndex((tab) => tab.value === currentActive);
          if (currentIndex !== -1 && changeTab) {
            if (gestureState.dx > 0) {
              // Swipe right - go to previous tab
              const newIndex = Math.max(0, currentIndex - 1);
              changeTab(currentTabs[newIndex].value);
            } else {
              // Swipe left - go to next tab
              const newIndex = Math.min(currentTabs.length - 1, currentIndex + 1);
              changeTab(currentTabs[newIndex].value);
            }
          }
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

export default SwipeableTabs;
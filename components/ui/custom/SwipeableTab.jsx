// components/ui/custom/SwipeableTabs.jsx
import React, { useRef, useEffect, useContext } from 'react';
import { View, PanResponder, Dimensions } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const getTabValue = (tab) => {
  if (!tab) return '';
  if (typeof tab === 'string') return tab;
  return tab.value ?? tab.id ?? tab.name ?? tab.key ?? '';
};

const SwipeableTabs = ({ 
  tabs = [], 
  activeTab, 
  onTabChange, 
  children,
  isDarkMode 
}) => {
  const navContext = useContext(NavigationContext);
  const tabsRef = useRef(tabs);
  const activeTabRef = useRef(activeTab);
  const onTabChangeRef = useRef(onTabChange);

  useEffect(() => {
    tabsRef.current = tabs || [];
    activeTabRef.current = activeTab;
    onTabChangeRef.current = onTabChange;
  }, [tabs, activeTab, onTabChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        // Only capture horizontal movements that clearly dominate vertical scrolling
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const isExceedingThreshold = Math.abs(gestureState.dx) > 25;
        return isHorizontal && isExceedingThreshold;
      },
      onMoveShouldSetPanResponderCapture: (e, gestureState) => {
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
        const isExceedingThreshold = Math.abs(gestureState.dx) > 35;
        return isHorizontal && isExceedingThreshold;
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (e, gestureState) => {
        const currentTabs = tabsRef.current || [];
        const currentActive = activeTabRef.current;
        const changeTab = onTabChangeRef.current;

        if (!currentTabs.length || !changeTab) return;

        const isHorizontalSwipe =
          Math.abs(gestureState.dx) > 40 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);

        if (isHorizontalSwipe) {
          const currentIndex = currentTabs.findIndex(
            (t) => getTabValue(t) === currentActive
          );

          if (currentIndex !== -1) {
            if (gestureState.dx < 0 && currentIndex < currentTabs.length - 1) {
              // Swiped left -> advance to next tab
              const nextVal = getTabValue(currentTabs[currentIndex + 1]);
              changeTab(nextVal);
            } else if (gestureState.dx > 0 && currentIndex > 0) {
              // Swiped right -> go back to previous tab
              const prevVal = getTabValue(currentTabs[currentIndex - 1]);
              changeTab(prevVal);
            }
          }
        }
      },
    })
  ).current;

  const content = (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );

  if (navContext) {
    return (
      <NavigationContext.Provider value={navContext}>
        {content}
      </NavigationContext.Provider>
    );
  }

  return content;
};

export default SwipeableTabs;
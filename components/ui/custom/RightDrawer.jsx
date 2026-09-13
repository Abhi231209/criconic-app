import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  PanResponder,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RightDrawer = ({ 
  isVisible, 
  onClose, 
  children, 
  animationDuration = 250,
  overlayOpacity = 0.5 
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(windowWidth * 0.88, 380);

  // modalVisible keeps the modal mounted during exit animations
  const [modalVisible, setModalVisible] = useState(isVisible);
  const slideAnim = useRef(new Animated.Value(drawerWidth)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Render modal when isVisible is true OR when exit animation is in progress
  const shouldRender = isVisible || modalVisible;

  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);
      slideAnim.setValue(drawerWidth);
      overlayAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: false,
        }),
        Animated.timing(overlayAnim, {
          toValue: overlayOpacity,
          duration: animationDuration,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: drawerWidth,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        setModalVisible(false);
      });
    }
  }, [isVisible, drawerWidth, animationDuration, overlayOpacity, modalVisible, slideAnim, overlayAnim]);

  // Pan responder for swipe right to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dx > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > drawerWidth * 0.25) {
          onClose?.();
        } else {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop Overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.backdrop,
            {
              opacity: overlayAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Drawer Panel */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
              transform: [{ translateX: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
            {/* Drag Handle */}
            <View style={[styles.dragHandle, { backgroundColor: isDarkMode ? '#334155' : '#CBD5E1' }]} />
            
            {/* Content */}
            <View style={styles.content}>
              {children}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: '#000000',
  },
  drawer: {
    height: '100%',
    shadowColor: '#000000',
    shadowOffset: {
      width: -4,
      height: 0,
    },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 24,
  },
  safeArea: {
    flex: 1,
  },
  dragHandle: {
    width: 4,
    height: 44,
    position: 'absolute',
    left: 2,
    top: '50%',
    marginTop: -22,
    borderRadius: 2,
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
});

export default RightDrawer;
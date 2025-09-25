import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
  PanResponder,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const DRAWER_WIDTH = screenWidth * 0.9;

const RightDrawer = ({ 
  isVisible, 
  onClose, 
  children, 
  animationDuration = 300,
  overlayOpacity = 0.5 
}) => {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Open drawer
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: overlayOpacity,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close drawer
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // Pan responder for swipe to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 80;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > DRAWER_WIDTH * 0.3) {
          onClose();
        } else {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Overlay */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.overlayBackground,
              {
                opacity: overlayAnim,
              },
            ]}
          />
        </TouchableOpacity>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />
          
          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
  },
  // overlayBackground: {
  //   flex: 1,
  //   backgroundColor: '#000000',
  // },
  drawer: {
    width: DRAWER_WIDTH,
    // height: screenHeight,
    // backgroundColor: '#ffffff',
    // shadowColor: '#000',
    // shadowOffset: {
    //   width: -2,
    //   height: 0,
    // },
    // shadowOpacity: 0.25,
    // shadowRadius: 3.84,
    // elevation: 5,
  },
  dragHandle: {
    width: 4,
    height: 40,
    backgroundColor: '#e0e0e0',
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -20,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  content: {
    flex: 1,
    paddingLeft: 8,
  },
});

export default RightDrawer;
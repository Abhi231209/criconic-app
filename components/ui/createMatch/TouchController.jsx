import React from 'react';
import { View, StyleSheet } from 'react-native';

export const TouchController = ({ onTouch }) => {
  return (
    <View
      style={StyleSheet.absoluteFill}
      onTouchStart={onTouch}
    />
  );
};
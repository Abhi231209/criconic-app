// components/PlayerAvatar.jsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';

const PlayerAvatar = ({ player, size = 40, onPress }) => {
  const colorScheme = useColorScheme();
      const isDarkMode = colorScheme === 'dark';
  
  // Get initials from player name
  const getInitials = (name) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8
        },
        onPress && { backgroundColor: isDarkMode ? '#3B82F6' : '#2563EB' }
      ]}
    >
      <Text 
        style={{
          color: isDarkMode ? '#FFFFFF' : '#1F2937',
          fontWeight: 'bold',
          fontSize: size * 0.35
        }}
      >
        {getInitials(player.name)}
      </Text>
    </TouchableOpacity>
  );
};

export default PlayerAvatar;
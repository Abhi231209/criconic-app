// components/PlayerAvatar.jsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';

const PlayerAvatar = ({ player, size = 40, onPress }) => {
  const colorScheme = useColorScheme();
      const isDarkMode = colorScheme === 'dark';
  
  // Get initials from player name
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'P';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'P';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  
  const playerName = player?.name || player?.username || player?.playerName || 'Player';

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
        {getInitials(playerName)}
      </Text>
    </TouchableOpacity>
  );
};

export default PlayerAvatar;
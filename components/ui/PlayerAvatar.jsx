// components/PlayerAvatar.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { getImageFullUrl } from '@/utils';

const PlayerAvatar = ({ player, size = 40, onPress, style }) => {
  const [hasError, setHasError] = useState(false);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const rawImgUri =
    player?.profileImg ||
    player?.profileImage ||
    player?.image ||
    player?.avatar ||
    player?.photo ||
    player?.raw?.profileImg ||
    player?.raw?.profileImage ||
    player?.raw?.image ||
    player?.raw?.avatar ||
    player?.raw?.photo ||
    (typeof player === 'object' && typeof player?.image === 'string' ? player.image : null);

  const imgUri = rawImgUri ? getImageFullUrl(rawImgUri) : null;

  React.useEffect(() => {
    setHasError(false);
  }, [imgUri]);

  // Get initials from player name
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'P';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'P';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const playerName = player?.name || player?.username || player?.playerName || 'Player';

  const hasValidImage = imgUri && typeof imgUri === 'string' && imgUri.trim().length > 0 && !hasError;

  const content = hasValidImage ? (
    <Image
      source={{ uri: imgUri.trim(), cache: "force-cache" }}
      onError={() => setHasError(true)}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
      resizeMode="cover"
    />
  ) : (
    <Text
      style={{
        color: isDarkMode ? '#FFFFFF' : '#1F2937',
        fontWeight: 'bold',
        fontSize: size * 0.35,
      }}
    >
      {getInitials(playerName)}
    </Text>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDarkMode ? '#334155' : '#E2E8F0',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        onPress && { backgroundColor: isDarkMode ? '#3B82F6' : '#2563EB' },
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
};

export default PlayerAvatar;
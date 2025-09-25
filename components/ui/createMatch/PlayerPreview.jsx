import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { User, Plus, X } from "lucide-react-native";

const COLORS = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  secondary: '#10B981',
  accent: '#8B5CF6',
  danger: '#EF4444',
  warning: '#F59E0B',
  light: {
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  },
  dark: {
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
    border: '#374151',
  }
};

export default function PlayerPreview({
  playerId,
  name,
  description,
  action,
  playerInfo,
  showButton,
  onAction,
  isDarkMode = false
}) {
  const handlePress = () => {
    if (onAction && showButton) {
      onAction(playerInfo, action);
    }
  };

  const getButtonStyle = () => {
    if (showButton === "Add") {
      return [styles.button, styles.addButton];
    } else if (showButton === "Remove") {
      return [styles.button, styles.removeButton];
    }
    return [styles.button, styles.disabledButton];
  };

  const getButtonText = () => {
    if (showButton === "Add") {
      return "Add";
    } else if (showButton === "Remove") {
      return "Remove";
    }
    return "Played";
  };

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <View style={styles.playerInfo}>
        <View style={styles.avatar}>
          <User size={24} color={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary} />
        </View>
        <View style={styles.details}>
          <Text style={[styles.name, isDarkMode ? styles.darkText : styles.lightText]}>
            {name}
          </Text>
          <Text style={[styles.role, isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary]}>
            {description}
          </Text>
        </View>
      </View>
      
      {showButton && (
        <TouchableOpacity
          style={getButtonStyle()}
          onPress={handlePress}
          disabled={!showButton}
        >
          <Text style={styles.buttonText}>
            {getButtonText()}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  lightContainer: {
    backgroundColor: COLORS.light.card,
  },
  darkContainer: {
    backgroundColor: COLORS.dark.card,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  darkAvatar: {
    backgroundColor: '#374151',
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lightText: {
    color: COLORS.light.text,
  },
  darkText: {
    color: COLORS.dark.text,
  },
  role: {
    fontSize: 14,
  },
  lightTextSecondary: {
    color: COLORS.light.textSecondary,
  },
  darkTextSecondary: {
    color: COLORS.dark.textSecondary,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  removeButton: {
    backgroundColor: COLORS.danger,
  },
  disabledButton: {
    backgroundColor: COLORS.light.border,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
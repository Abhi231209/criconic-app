import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  useColorScheme,
} from "react-native";
import ThemedText from "../custom/ThemedText";
import { X } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

// Player Card Component for the popup
const PlayerCard = ({ 
  playerName, 
  isSelected, 
  onPress, 
  isDarkMode 
}) => (
  <TouchableOpacity
    style={[
      styles.playerCard,
      isDarkMode ? styles.darkPlayerCard : styles.lightPlayerCard,
      isSelected && styles.selectedPlayerCard
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <ThemedText style={[
      styles.playerName,
      isDarkMode ? styles.darkText : styles.lightText
    ]}>
      {playerName}
    </ThemedText>
    {isSelected && (
      <View style={styles.selectedIndicator} />
    )}
  </TouchableOpacity>
);

// Button Component
const Button = ({ 
  title, 
  onPress, 
  variant = "primary",
  isDarkMode 
}) => {
  const isOutline = variant === "outline";
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline 
          ? [
              styles.outlineButton,
              isDarkMode ? styles.darkOutlineButton : styles.lightOutlineButton
            ]
          : styles.primaryButton
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ThemedText style={[
        styles.buttonText,
        isOutline 
          ? (isDarkMode ? styles.darkOutlineText : styles.lightOutlineText)
          : styles.primaryButtonText
      ]}>
        {title}
      </ThemedText>
    </TouchableOpacity>
  );
};

export default function ReplaceBatterPopup({
  players = [],
  team,
  matchID,
  visible = false,
  onClose = () => {},
  onSelect,
}) {
//   const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const handleClick = (playerId) => {
    setSelectedPlayer(playerId);
  };

  const handleDone = () => {
    if (!selectedPlayer) return;
    
    onClose();
    if (onSelect) {
      onSelect(selectedPlayer);
    }
    // Navigate to the change squad screen with selected player
    // router.push(`/match-change-squad/${team}/${matchID}/${selectedPlayer}`);
  };

  const handleClose = () => {
    setSelectedPlayer(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer,
          isDarkMode ? styles.darkModalContainer : styles.lightModalContainer
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <ThemedText style={[
                styles.title,
                isDarkMode ? styles.darkText : styles.lightText
              ]}>
                Replace Batter
              </ThemedText>
              <ThemedText style={[
                styles.description,
                isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
              ]}>
                * Stats for the current match will be transferred to new batter
              </ThemedText>
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
            >
              <X size={24} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
            </TouchableOpacity>
          </View>

          {/* Players List */}
          <ScrollView 
            style={styles.playersContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.playersGrid}>
              {players && players.length > 0 ? (
                players.map((player, index) => {
                  const pId = player.playerId || player.id || player._id || index;
                  const pName = player.name || player.username || player.playerName || `Player ${index + 1}`;
                  return (
                    <PlayerCard
                      key={pId.toString()}
                      playerName={pName}
                      isSelected={selectedPlayer === pId}
                      onPress={() => handleClick(pId)}
                      isDarkMode={isDarkMode}
                    />
                  );
                })
              ) : (
                <ThemedText style={[
                  styles.description,
                  isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary,
                  { textAlign: 'center', padding: 20, width: '100%' }
                ]}>
                  No batters available to replace
                </ThemedText>
              )}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleClose}
              isDarkMode={isDarkMode}
            />
            <Button
              title="Done"
              onPress={handleDone}
              isDarkMode={isDarkMode}
              disabled={!selectedPlayer}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  lightModalContainer: {
    backgroundColor: COLORS.light.background,
  },
  darkModalContainer: {
    backgroundColor: COLORS.dark.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
  },
  playersContainer: {
    maxHeight: 300,
    padding: 16,
  },
  playersGrid: {
    gap: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lightPlayerCard: {
    backgroundColor: COLORS.light.card,
  },
  darkPlayerCard: {
    backgroundColor: COLORS.dark.background,
  },
  selectedPlayerCard: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  selectedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  lightOutlineButton: {
    borderColor: COLORS.light.border,
  },
  darkOutlineButton: {
    borderColor: COLORS.dark.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  lightOutlineText: {
    color: COLORS.light.text,
  },
  darkOutlineText: {
    color: COLORS.dark.text,
  },
  // Text Styles
  lightText: {
    color: COLORS.light.text,
  },
  darkText: {
    color: COLORS.dark.text,
  },
  lightTextSecondary: {
    color: COLORS.light.textSecondary,
  },
  darkTextSecondary: {
    color: COLORS.dark.textSecondary,
  },
};
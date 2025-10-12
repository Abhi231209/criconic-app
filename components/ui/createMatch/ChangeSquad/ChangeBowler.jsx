import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { useRouter } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";

const COLORS = {
  primary: "#DC2626",
  secondary: "#16A34A",
  accent: "#EA580C",
  light: {
    background: "#FFFFFF",
    card: "#F8FAFC",
    text: "#1E293B",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    inputBackground: "#FFFFFF",
  },
  dark: {
    background: "#0F172A",
    card: "#1E293B",
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    border: "#334155",
    inputBackground: "#1E293B",
  },
};

// Player Card Component
const PlayerCard = ({ 
  player, 
  isSelected, 
  onPress, 
  isDarkMode 
}) => {
  const selectedPlayerCardStyle = isSelected ? {
    borderColor: COLORS.primary,
    backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.05)',
  } : {};

  return (
    <TouchableOpacity
      style={[
        styles.playerCard,
        isDarkMode ? styles.darkPlayerCard : styles.lightPlayerCard,
        selectedPlayerCardStyle
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.playerInfo}>
        <Text style={[
          styles.playerName,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          {player.username || player.name}
        </Text>
        {player.role && (
          <Text style={[
            styles.playerRole,
            isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
          ]}>
            {player.role}
          </Text>
        )}
      </View>
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <View style={styles.selectedDot} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Button Component
const ButtonNormal = ({ 
  children, 
  onPress, 
  loading = false,
  disabled = false,
  style 
}) => (
  <TouchableOpacity
    style={[
      styles.button,
      disabled && styles.disabledButton,
      style
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color="#FFFFFF" size="small" />
    ) : (
      <Text style={styles.buttonText}>{children}</Text>
    )}
  </TouchableOpacity>
);

export default function ChangeBowler() {
//   const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  let props = {}
  
  // Get parameters from route - you might need to adjust this based on your routing setup
  const { teamId, matchId, playerId } = props || {};
  
  const [squadPlayer, setSquadPlayer] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isRemoveLoading, setIsRemoveLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPlayerCanChanged = async () => {
    try {
      setLoading(true);
      // Replace with your actual API call
      // const res = await request(`api/matches/getPlayerToReplaced/${matchId}/${teamId}`, {
      //   method: "GET",
      // });
      
      // Mock data - replace with actual API response
      const mockPlayers = [
        { id: 1, username: "Virat Kohli", role: "Batsman" },
        { id: 2, username: "MS Dhoni", role: "Wicketkeeper" },
        { id: 3, username: "Rohit Sharma", role: "Batsman" },
        { id: 4, username: "Jasprit Bumrah", role: "Bowler" },
        { id: 5, username: "Ravindra Jadeja", role: "All-rounder" },
      ];
      
      setSquadPlayer(mockPlayers);
    } catch (error) {
      Alert.alert("Error", "Failed to load players");
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (playerId) => {
    setSelectedPlayer(playerId);
  };

  const handleAddNew = () => {
    // Navigate to ChangeSquad screen
    router.push(`/changesquad/${teamId}/${matchId}`);
  };

  const handleReplace = async () => {
    if (!selectedPlayer) return;
    
    setIsRemoveLoading(true);
    try {
      const body = {
        selectedPlayer,
        playerToRemove: playerId,
        matchId,
        teamId,
      };
      
      // Replace with your actual API call
      // const res = await request(`api/matches/replacePlayer`, {
      //   method: "PUT",
      //   data: body,
      // });
      
      // Mock success response
      const mockSuccess = true; // Replace with actual response check: res.data.success
      
      if (mockSuccess) {
        Alert.alert("Success", "Player replaced successfully");
        
        // Navigate back
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push("/"); // Navigate to home if can't go back
        }
      } else {
        Alert.alert("Error", "Failed to replace player");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong");
      console.error("Error replacing player:", error);
    } finally {
      setIsRemoveLoading(false);
    }
  };

  useEffect(() => {
    if (matchId && teamId) {
      fetchPlayerCanChanged();
    }
  }, [matchId, teamId]);

  if (loading) {
    return (
      <SafeAreaView style={[
        styles.container,
        isDarkMode ? styles.darkContainer : styles.lightContainer,
        styles.centered
      ]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[
          styles.loadingText,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          Loading players...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode ? styles.darkContainer : styles.lightContainer
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
        </TouchableOpacity>
        <Text style={[
          styles.headerTitle,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          Select Player
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Instruction Section */}
        <View style={styles.instructionSection}>
          <Text style={[
            styles.instructionText,
            isDarkMode ? styles.darkText : styles.lightText
          ]}>
            Select player from below or
          </Text>
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={handleAddNew}
            activeOpacity={0.7}
          >
            <Plus size={16} color={COLORS.primary} />
            <Text style={styles.addNewButtonText}>Add new</Text>
          </TouchableOpacity>
        </View>

        {/* Players List */}
        <FlatList
          data={squadPlayer}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <PlayerCard
              player={item}
              isSelected={selectedPlayer === item.id}
              onPress={() => handleClick(item.id)}
              isDarkMode={isDarkMode}
            />
          )}
          contentContainerStyle={styles.playersList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[
                styles.emptyText,
                isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
              ]}>
                No players available
              </Text>
              <ButtonNormal onPress={handleAddNew} style={styles.emptyButton}>
                Add New Player
              </ButtonNormal>
            </View>
          }
        />
      </View>

      {/* Replace Button */}
      {selectedPlayer && (
        <View style={styles.footer}>
          <ButtonNormal
            onPress={handleReplace}
            loading={isRemoveLoading}
            style={styles.replaceButton}
          >
            Replace Player
          </ButtonNormal>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightContainer: {
    backgroundColor: COLORS.light.background,
  },
  darkContainer: {
    backgroundColor: COLORS.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instructionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addNewButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  playersList: {
    gap: 8,
    paddingBottom: 16,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lightPlayerCard: {
    backgroundColor: COLORS.light.card,
  },
  darkPlayerCard: {
    backgroundColor: COLORS.dark.card,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerRole: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  replaceButton: {
    backgroundColor: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    minWidth: 150,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
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
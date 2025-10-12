import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Plus, X, Check, ArrowLeft } from "lucide-react-native";
import * as lodash from "lodash";
import ThemedText from "@/components/ui/custom/ThemedText";


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

const BUTTON_ENUM = {
  ADD: 1,
  REMOVE: 2,
  NONE: 3,
};

// Custom Components
const SearchBar = ({ placeholder, onChange, value, isDarkMode }) => (
  <View style={[
    styles.searchContainer,
    isDarkMode ? styles.darkSearchContainer : styles.lightSearchContainer
  ]}>
    <Search size={20} color={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary} />
    <TextInput
      style={[
        styles.searchInput,
        isDarkMode ? styles.darkText : styles.lightText
      ]}
      placeholder={placeholder}
      placeholderTextColor={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary}
      value={value}
      onChangeText={onChange}
    />
  </View>
);

const PlayerCard = ({ 
  player, 
  action, 
  onActionPress, 
  isDarkMode,
  isPlayedPlayer 
}) => {
  const getButtonConfig = () => {
    switch (action) {
      case BUTTON_ENUM.ADD:
        return {
          text: "Add",
          style: styles.addButton,
          textStyle: styles.addButtonText,
          icon: Plus
        };
      case BUTTON_ENUM.REMOVE:
        return {
          text: "Remove",
          style: styles.removeButton,
          textStyle: styles.removeButtonText,
          icon: X
        };
      default:
        return null;
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <View style={[
      styles.playerCard,
      isDarkMode ? styles.darkPlayerCard : styles.lightPlayerCard
    ]}>
      <View style={styles.playerInfo}>
        <ThemedText style={[
          styles.playerName,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          {player.name || player.username}
        </ThemedText>
        <ThemedText style={[
          styles.playerRole,
          isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
        ]}>
          {player.role}
        </ThemedText>
      </View>
      
      {buttonConfig && !isPlayedPlayer && (
        <TouchableOpacity
          style={[styles.actionButton, buttonConfig.style]}
          onPress={() => onActionPress(player, action)}
          activeOpacity={0.7}
        >
          <buttonConfig.icon size={16} color={action === BUTTON_ENUM.ADD ? "#FFFFFF" : COLORS.primary} />
          <ThemedText style={buttonConfig.textStyle}>{buttonConfig.text}</ThemedText>
        </TouchableOpacity>
      )}
      
      {isPlayedPlayer && (
        <View style={styles.playedBadge}>
          <ThemedText style={styles.playedBadgeText}>Played</ThemedText>
        </View>
      )}
    </View>
  );
};

const TabButton = ({ title, isActive, onPress, isDarkMode }) => (
  <TouchableOpacity
    style={[
      styles.tabButton,
      isActive && styles.activeTabButton,
      isDarkMode ? styles.darkTabButton : styles.lightTabButton
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <ThemedText style={[
      styles.tabButtonText,
      isActive && styles.activeTabButtonText,
      isDarkMode ? styles.darkText : styles.lightText
    ]}>
      {title}
    </ThemedText>
  </TouchableOpacity>
);

const AddPlayerModal = ({ visible, onClose, teamID, onPlayerAdded, isDarkMode }) => {
  const [playerName, setPlayerName] = useState("");
  const [playerRole, setPlayerRole] = useState("");

  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert("Error", "Please enter player name");
      return;
    }

    // Simulate API call - Replace with your actual API
    try {
      // const response = await request(`api/teams/${teamID}/players`, {
      //   method: "POST",
      //   data: { name: playerName, role: playerRole }
      // });
      
      // Mock success
      Alert.alert("Success", "Player added successfully");
      setPlayerName("");
      setPlayerRole("");
      onPlayerAdded();
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to add player");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.modalContainer,
          isDarkMode ? styles.darkContainer : styles.lightContainer
        ]}
      >
        <View style={styles.modalHeader}>
          <ThemedText style={[
            styles.modalTitle,
            isDarkMode ? styles.darkText : styles.lightText
          ]}>
            Add New Player
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <TextInput
            style={[
              styles.input,
              isDarkMode ? styles.darkInput : styles.lightInput,
              isDarkMode ? styles.darkText : styles.lightText
            ]}
            placeholder="Player Name"
            placeholderTextColor={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary}
            value={playerName}
            onChangeText={setPlayerName}
          />
          
          <TextInput
            style={[
              styles.input,
              isDarkMode ? styles.darkInput : styles.lightInput,
              isDarkMode ? styles.darkText : styles.lightText
            ]}
            placeholder="Player Role (e.g., Batsman, Bowler)"
            placeholderTextColor={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary}
            value={playerRole}
            onChangeText={setPlayerRole}
          />

          <TouchableOpacity
            style={[styles.addPlayerButton, !playerName.trim() && styles.disabledButton]}
            onPress={handleAddPlayer}
            disabled={!playerName.trim()}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.addPlayerButtonText}>Add Player</ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Mock API function - Replace with your actual API calls
const request = async (url, options = {}) => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ status: 200, data: {} });
    }, 1000);
  });
};

export default function ChangeSquad() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  // const router = useRouter();
  
  // Get team and match data from route params or context
  // For now, using mock data - replace with actual data fetching
  const [teamId, setTeamId] = useState("1"); // Get from route params
  const [matchId, setMatchId] = useState("1"); // Get from route params
  const [teamData, setTeamData] = useState(null);
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [playedPlayer, setPlayedPlayer] = useState({});
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState({});
  const [playerToRemove, setPlayerToRemove] = useState({});
  const [playerToAdd, setPlayerToAdd] = useState({});
  const [addPlayerModalVisible, setAddPlayerModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch team data and match data
  useEffect(() => {
    fetchTeamData();
    fetchMatchPlayedPlayer();
  }, []);

  useEffect(() => {
    const filtered = teamPlayers.filter(player =>
      (player?.name || player?.username || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setFilteredPlayers(filtered);
  }, [searchTerm, teamPlayers]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      // Replace with your actual API call
      // const res = await request(`api/teams/${teamId}`, { method: "GET" });
      
      // Mock data
      const mockTeamData = {
        id: "1",
        name: "Team A",
        players: [
          { id: 1, name: "Virat Kohli", role: "Batsman", username: "vkohli" },
          { id: 2, name: "MS Dhoni", role: "Wicketkeeper", username: "msdhoni" },
          { id: 3, name: "Rohit Sharma", role: "Batsman", username: "rsharma" },
          { id: 4, name: "Jasprit Bumrah", role: "Bowler", username: "jbumrah" },
          { id: 5, name: "Ravindra Jadeja", role: "All-rounder", username: "rjadeja" },
          { id: 6, name: "Hardik Pandya", role: "All-rounder", username: "hpandya" },
        ]
      };
      
      setTeamData(mockTeamData);
      setTeamPlayers(mockTeamData.players);
    } catch (error) {
      Alert.alert("Error", "Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchPlayedPlayer = async () => {
    try {
      // Replace with your actual API call
      // const res = await request(`api/matches/getPlayedPlayer/${matchId}/${teamId}`, { method: "GET" });
      
      // Mock data
      const mockPlayedPlayers = { 1: true, 2: true }; // Players who have already played
      setPlayedPlayer(mockPlayedPlayers);
      
      const mockSelectedPlayers = { 1: "Virat Kohli", 2: "MS Dhoni", 3: "Rohit Sharma" };
      setSelectedPlayer(mockSelectedPlayers);
    } catch (error) {
      Alert.alert("Error", "Failed to load match data");
    }
  };

  const handleRemove = (playerInfo) => {
    const playerId = playerInfo.id;
    const playerName = playerInfo.username || playerInfo.name;

    if (playerToAdd[playerId]) {
      const playerToAddClone = lodash.cloneDeep(playerToAdd);
      delete playerToAddClone[playerId];
      setPlayerToAdd(playerToAddClone);
    } else {
      const playerToRemoveClone = lodash.cloneDeep(playerToRemove);
      playerToRemoveClone[playerId] = playerName;
      setPlayerToRemove(playerToRemoveClone);
    }

    if (selectedPlayer[playerId]) {
      const selectedPlayerClone = lodash.cloneDeep(selectedPlayer);
      delete selectedPlayerClone[playerId];
      setSelectedPlayer(selectedPlayerClone);
    }
  };

  const handleAdd = (playerInfo) => {
    const playerId = playerInfo.id;
    const playerName = playerInfo.username || playerInfo.name;

    if (playerToRemove[playerId]) {
      const playerToRemoveClone = lodash.cloneDeep(playerToRemove);
      delete playerToRemoveClone[playerId];
      setPlayerToRemove(playerToRemoveClone);
    } else {
      const playerToAddClone = lodash.cloneDeep(playerToAdd);
      playerToAddClone[playerId] = playerName;
      setPlayerToAdd(playerToAddClone);
    }

    if (!selectedPlayer[playerId]) {
      const selectedPlayerClone = lodash.cloneDeep(selectedPlayer);
      selectedPlayerClone[playerId] = playerName;
      setSelectedPlayer(selectedPlayerClone);
    }
  };

  const handleButtonAction = (playerInfo, action) => {
    switch (action) {
      case BUTTON_ENUM.REMOVE:
        handleRemove(playerInfo);
        break;
      case BUTTON_ENUM.ADD:
        handleAdd(playerInfo);
        break;
      default:
        console.log("No action");
    }
  };

  const handleAddRemovePlayer = async () => {
    try {
      const body = {
        playerToAdd,
        playerToRemove,
        matchId,
        teamId,
      };
      
      // Replace with your actual API call
      // const res = await request(`api/matches/addRemovePlayer`, {
      //   method: "PUT",
      //   data: body,
      // });

      if (true) { // Replace with actual response check
        setPlayerToRemove({});
        setPlayerToAdd({});
        Alert.alert("Success", "Squad updated successfully");
        // Optionally navigate back or refresh data
        // router.back();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update squad");
    }
  };

  const handleDone = async () => {
    if (activeTab === 1) {
      // Add player logic - handled by modal
      return;
    } else {
      // Save squad changes
      if (lodash.size(playerToRemove) > 0 || lodash.size(playerToAdd) > 0) {
        await handleAddRemovePlayer();
      } else {
        Alert.alert("Info", "No changes to save");
      }
    }
  };

  const hasChanges = lodash.size(playerToRemove) > 0 || lodash.size(playerToAdd) > 0;

  if (loading) {
    return (
      <SafeAreaView style={[
        styles.container,
        isDarkMode ? styles.darkContainer : styles.lightContainer,
        styles.centered
      ]}>
        <ThemedText style={isDarkMode ? styles.darkText : styles.lightText}>
          Loading...
        </ThemedText>
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
          // onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
        </TouchableOpacity>
        <ThemedText style={[
          styles.headerTitle,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          Change Squad
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Team Info */}
      <View style={styles.teamInfo}>
        <ThemedText style={[
          styles.teamName,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          {teamData?.name}
        </ThemedText>
        <ThemedText style={[
          styles.teamStats,
          isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
        ]}>
          {teamPlayers.length} players • {Object.keys(selectedPlayer).length} in squad
        </ThemedText>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton
          title="MY SQUAD"
          isActive={activeTab === 0}
          onPress={() => setActiveTab(0)}
          isDarkMode={isDarkMode}
        />
        <TabButton
          title="ADD PLAYER"
          isActive={activeTab === 1}
          onPress={() => setActiveTab(1)}
          isDarkMode={isDarkMode}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 0 ? (
          // My Squad Tab
          <View style={styles.tabContent}>
            <View style={styles.searchSection}>
              <SearchBar
                placeholder="Quick Search"
                onChange={setSearchTerm}
                value={searchTerm}
                isDarkMode={isDarkMode}
              />
              <TouchableOpacity
                style={[
                  styles.addButtonLarge,
                  isDarkMode ? styles.darkAddButton : styles.lightAddButton
                ]}
                onPress={() => setAddPlayerModalVisible(true)}
                activeOpacity={0.7}
              >
                <Plus size={20} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
                <ThemedText style={[
                  styles.addButtonText,
                  isDarkMode ? styles.darkText : styles.lightText
                ]}>
                  Add Player
                </ThemedText>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredPlayers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const action = !selectedPlayer[item.id]
                  ? BUTTON_ENUM.ADD
                  : !playedPlayer[item.id]
                  ? BUTTON_ENUM.REMOVE
                  : BUTTON_ENUM.NONE;

                return (
                  <PlayerCard
                    player={item}
                    action={action}
                    onActionPress={handleButtonAction}
                    isDarkMode={isDarkMode}
                    isPlayedPlayer={playedPlayer[item.id]}
                  />
                );
              }}
              contentContainerStyle={styles.playersList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <ThemedText style={[
                  styles.emptyText,
                  isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
                ]}>
                  No players found
                </ThemedText>
              }
            />
          </View>
        ) : (
          // Add Player Tab
          <View style={styles.tabContent}>
            <View style={styles.addPlayerContent}>
              <ThemedText style={[
                styles.addPlayerTitle,
                isDarkMode ? styles.darkText : styles.lightText
              ]}>
                Add New Players to Your Squad
              </ThemedText>
              <ThemedText style={[
                styles.addPlayerDescription,
                isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
              ]}>
                Click the button below to add new players to your team
              </ThemedText>
              
              <TouchableOpacity
                style={styles.addPlayerCta}
                onPress={() => setAddPlayerModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={24} color="#FFFFFF" />
                <ThemedText style={styles.addPlayerCtaText}>Add New Player</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Done Button */}
      {hasChanges && activeTab === 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.doneButtonText}>
              Save Changes
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Player Modal */}
      <AddPlayerModal
        visible={addPlayerModalVisible}
        onClose={() => setAddPlayerModalVisible(false)}
        teamID={teamId}
        onPlayerAdded={fetchTeamData}
        isDarkMode={isDarkMode}
      />
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
  teamInfo: {
    padding: 16,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  teamStats: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  lightTabButton: {
    borderBottomColor: COLORS.light.border,
  },
  darkTabButton: {
    borderBottomColor: COLORS.dark.border,
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  lightSearchContainer: {
    backgroundColor: COLORS.light.card,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  darkSearchContainer: {
    backgroundColor: COLORS.dark.card,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  lightAddButton: {
    backgroundColor: COLORS.light.card,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  darkAddButton: {
    backgroundColor: COLORS.dark.card,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
  },
  addButtonText: {
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
  },
  lightPlayerCard: {
    backgroundColor: COLORS.light.card,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  darkPlayerCard: {
    backgroundColor: COLORS.dark.card,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  removeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  playedBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  playedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  addPlayerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addPlayerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  addPlayerDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  addPlayerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addPlayerCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  lightInput: {
    borderColor: COLORS.light.border,
    backgroundColor: COLORS.light.inputBackground,
  },
  darkInput: {
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.inputBackground,
  },
  addPlayerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  addPlayerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Plus, X, Check, ArrowLeft, Users, UserCheck } from "lucide-react-native";
import * as lodash from "lodash";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { request, teamsApi } from "@/utils/api";
import SCREENS from "@/screens";
import { COLORS } from "@/theme/colors";

const BUTTON_ENUM = {
  ADD: 1,
  REMOVE: 2,
  NONE: 3,
};

// Robust player ID extractor across backend/database models
const extractPlayerId = (p) => {
  if (!p) return "";
  if (typeof p === "string") return p;
  if (typeof p === "number") return String(p);
  if (p.id) {
    if (typeof p.id === "object") {
      if (p.id._id) return String(p.id._id);
      if (p.id.id) return String(p.id.id);
    }
    return String(p.id);
  }
  if (p._id) {
    if (typeof p._id === "object") {
      if (p._id._id) return String(p._id._id);
      if (p._id.id) return String(p._id.id);
    }
    return String(p._id);
  }
  if (p.playerId) {
    if (typeof p.playerId === "object") {
      if (p.playerId._id) return String(p.playerId._id);
      if (p.playerId.id) return String(p.playerId.id);
    }
    return String(p.playerId);
  }
  return "";
};

const getPlayerName = (p, fallback = "Player") => {
  if (!p) return fallback;
  if (typeof p.id === "object" && (p.id.name || p.id.username)) {
    return p.id.name || p.id.username;
  }
  return p.name || p.username || p.playerName || fallback;
};

const getPlayerRole = (p, fallback = "Player") => {
  if (!p) return fallback;
  if (typeof p.id === "object" && p.id.role) {
    return p.id.role;
  }
  return p.role || fallback;
};

const mergePlayers = (baseList = [], extraList = []) => {
  const map = new Map();
  (baseList || []).forEach((p) => {
    const id = extractPlayerId(p);
    if (id) map.set(id, p);
  });
  (extraList || []).forEach((p) => {
    const id = extractPlayerId(p);
    if (id && !map.has(id)) {
      map.set(id, p);
    }
  });
  return Array.from(map.values());
};

// Custom Search Bar
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

// Player Card
const PlayerCard = ({ 
  player, 
  action, 
  onActionPress, 
  isDarkMode,
  isPlayedPlayer,
  isInSquad = false
}) => {
  const pName = getPlayerName(player);
  const pRole = getPlayerRole(player);

  return (
    <View style={[
      styles.playerCard,
      isDarkMode ? styles.darkPlayerCard : styles.lightPlayerCard,
      isInSquad && (isDarkMode ? styles.darkSelectedPlayerCard : styles.lightSelectedPlayerCard)
    ]}>
      <View style={styles.playerInfo}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <ThemedText style={[
            styles.playerName,
            isDarkMode ? styles.darkText : styles.lightText
          ]}>
            {pName}
          </ThemedText>
          {isInSquad && (
            <View style={styles.inSquadBadge}>
              <Check size={12} color="#16A34A" />
              <ThemedText style={styles.inSquadBadgeText}>In Squad</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={[
          styles.playerRole,
          isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
        ]}>
          {pRole}
        </ThemedText>
      </View>
      
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {isPlayedPlayer ? (
          <View style={styles.playedBadge}>
            <ThemedText style={styles.playedBadgeText}>Played</ThemedText>
          </View>
        ) : action === BUTTON_ENUM.REMOVE ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => onActionPress(player, action)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={15} color={COLORS.primary} />
            <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
          </TouchableOpacity>
        ) : action === BUTTON_ENUM.ADD ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => onActionPress(player, action)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={15} color="#FFFFFF" />
            <ThemedText style={styles.addButtonText}>Add</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
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
  const [adding, setAdding] = useState(false);

  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert("Error", "Please enter player name");
      return;
    }

    try {
      setAdding(true);
      if (teamsApi?.addPlayerToTeam) {
        await teamsApi.addPlayerToTeam(teamID, {
          name: playerName.trim(),
          role: playerRole.trim() || "Player",
        });
      } else {
        await request(`api/teams/${teamID}/players`, {
          method: "POST",
          data: { name: playerName.trim(), role: playerRole.trim() || "Player" },
          errorAlert: false,
        });
      }

      Alert.alert("Success", "Player added successfully");
      setPlayerName("");
      setPlayerRole("");
      onPlayerAdded?.();
      onClose?.();
    } catch (error) {
      console.warn("[ChangeSquad] Failed to add player:", error);
      Alert.alert("Error", "Failed to add player");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
            style={[styles.addPlayerButton, (!playerName.trim() || adding) && styles.disabledButton]}
            onPress={handleAddPlayer}
            disabled={!playerName.trim() || adding}
            activeOpacity={0.8}
          >
            {adding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.addPlayerButtonText}>Add Player</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function ChangeSquad(props) {
  const route = useRoute();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  // Real team and match data from route params or props
  const teamId =
    route?.params?.teamId ||
    route?.params?.team?.teamId ||
    route?.params?.team?._id ||
    route?.params?.team?.id ||
    props?.route?.params?.teamId ||
    props?.teamId ||
    "1";

  const matchId =
    route?.params?.matchId ||
    props?.route?.params?.matchId ||
    props?.matchId ||
    "1";

  // Initial squad seed from navigation parameters
  const initialSquad = route?.params?.squad || route?.params?.team?.players || [];

  const [teamData, setTeamData] = useState(() => {
    return route?.params?.team || props?.team || null;
  });
  
  const [activeTab, setActiveTab] = useState(0);
  const [filterTab, setFilterTab] = useState("ALL"); // ALL | SQUAD | BENCH
  const [searchTerm, setSearchTerm] = useState("");
  
  // Initialize with initialSquad if provided so players appear immediately
  const [selectedPlayer, setSelectedPlayer] = useState(() => {
    const sel = {};
    if (Array.isArray(initialSquad)) {
      initialSquad.forEach((player) => {
        const pId = extractPlayerId(player);
        if (pId) sel[pId] = getPlayerName(player) || 1;
      });
    }
    return sel;
  });

  const [teamPlayers, setTeamPlayers] = useState(() => {
    return Array.isArray(initialSquad) ? initialSquad : [];
  });

  const [playedPlayer, setPlayedPlayer] = useState({});
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [playerToRemove, setPlayerToRemove] = useState({});
  const [playerToAdd, setPlayerToAdd] = useState({});
  const [addPlayerModalVisible, setAddPlayerModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Resilient Back Navigation: guaranteed never to trap the user
  const handleGoBack = useCallback(() => {
    try {
      if (navigation?.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      if (props?.navigation?.canGoBack && props.navigation.canGoBack()) {
        props.navigation.goBack();
        return;
      }
    } catch (e) {
      console.warn("[ChangeSquad] navigation.goBack() check failed:", e);
    }

    // Fallback if canGoBack is false
    if (matchId && matchId !== "1") {
      (navigation || props?.navigation)?.navigate(SCREENS.ScorerScreen, { matchId });
    } else if ((navigation || props?.navigation)?.navigate) {
      (navigation || props?.navigation)?.navigate(SCREENS.Home);
    }
  }, [navigation, props?.navigation, matchId]);

  // Hardware back press on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!navigation.isFocused()) return false;
        handleGoBack();
        return true;
      };
      const backSubscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => backSubscription.remove();
    }, [navigation, handleGoBack])
  );

  // Fetch team data and match data on load
  useEffect(() => {
    fetchTeamData();
    fetchMatchPlayedPlayer();
  }, [teamId, matchId]);

  // Filter players when search term or teamPlayers change
  useEffect(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      setFilteredPlayers(teamPlayers);
      return;
    }
    const filtered = teamPlayers.filter((player) => {
      const name = getPlayerName(player, "").toLowerCase();
      const role = getPlayerRole(player, "").toLowerCase();
      return name.includes(query) || role.includes(query);
    });
    setFilteredPlayers(filtered);
  }, [searchTerm, teamPlayers]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const res = await request(`api/teams/${teamId}`, { method: "GET", errorAlert: false });
      if (res?.data) {
        const teamObj = Array.isArray(res.data) ? res.data[0] : (res.data?.content || res.data);
        if (teamObj) {
          setTeamData((prev) => prev || teamObj);
          const fetchedPlayers = teamObj?.players || [];
          setTeamPlayers((prev) => mergePlayers(fetchedPlayers, prev));
        }
      }
    } catch (error) {
      console.warn("[ChangeSquad] Failed to load team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchPlayedPlayer = async () => {
    try {
      const res = await request(`api/matches/getPlayedPlayer/${matchId}/${teamId}`, {
        method: "GET",
        errorAlert: false,
      });
      if (res?.data) {
        const cannotRemove =
          res.data?.content?.cannotRemove ||
          res.data?.playedPlayers ||
          res.data?.cannotRemove ||
          {};
        const normalizedCannotRemove = {};
        Object.keys(cannotRemove).forEach((k) => {
          normalizedCannotRemove[String(k)] = 1;
        });
        setPlayedPlayer(normalizedCannotRemove);

        const squadList = res.data?.content?.selectedSquad || res.data?.selectedSquad;
        if (Array.isArray(squadList) && squadList.length > 0) {
          const sel = {};
          squadList.forEach((player) => {
            const pId = extractPlayerId(player);
            if (pId) sel[pId] = getPlayerName(player) || 1;
          });
          setSelectedPlayer(sel);
          // Merge match squad into teamPlayers so none are ever missing
          setTeamPlayers((prev) => mergePlayers(prev, squadList));
        } else if (res.data?.selectedPlayers) {
          setSelectedPlayer(res.data.selectedPlayers);
        }
      }
    } catch (error) {
      console.warn("[ChangeSquad] Failed to load match player data:", error);
    }
  };

  const handleRemove = (playerInfo) => {
    const playerId = extractPlayerId(playerInfo);
    const playerName = getPlayerName(playerInfo);
    if (!playerId) return;

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
    const playerId = extractPlayerId(playerInfo);
    const playerName = getPlayerName(playerInfo);
    if (!playerId) return;

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
        break;
    }
  };

  const handleAddRemovePlayer = async () => {
    try {
      setIsSaving(true);
      const body = {
        playerToAdd,
        playerToRemove,
        matchId,
        teamId,
      };
      
      const res = await request(`api/matches/addRemovePlayer`, {
        method: "PUT",
        data: body,
      });

      if (res?.status === 200 || res?.data?.success || res?.data) {
        setPlayerToRemove({});
        setPlayerToAdd({});
        Alert.alert("Success", "Squad updated successfully");
        props?.cb?.();
        route?.params?.cb?.();
        handleGoBack();
      } else {
        Alert.alert("Error", res?.data?.message || "Failed to update squad");
      }
    } catch (error) {
      console.warn("[ChangeSquad] Save squad error:", error);
      Alert.alert("Error", "Failed to update squad");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDone = async () => {
    if (activeTab === 1) {
      return;
    } else {
      if (lodash.size(playerToRemove) > 0 || lodash.size(playerToAdd) > 0) {
        await handleAddRemovePlayer();
      } else {
        Alert.alert("Info", "No changes to save");
      }
    }
  };

  const hasChanges = lodash.size(playerToRemove) > 0 || lodash.size(playerToAdd) > 0;
  const changesCount = lodash.size(playerToRemove) + lodash.size(playerToAdd);

  // Partition players into Selected (In Squad) vs Available (Bench)
  const { inSquadPlayers, benchPlayers } = useMemo(() => {
    const inSquad = [];
    const bench = [];
    (filteredPlayers || []).forEach((player) => {
      const pId = extractPlayerId(player);
      if (selectedPlayer[pId]) {
        inSquad.push(player);
      } else {
        bench.push(player);
      }
    });
    return { inSquadPlayers: inSquad, benchPlayers: bench };
  }, [filteredPlayers, selectedPlayer]);

  const selectedCount = Object.keys(selectedPlayer).length;

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode ? styles.darkContainer : styles.lightContainer
    ]}>
      {/* Persistent Header with Large Touch Target */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleGoBack} 
          style={styles.backButton}
          activeOpacity={0.6}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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

      {/* Team Info Banner */}
      <View style={styles.teamInfo}>
        <ThemedText style={[
          styles.teamName,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          {teamData?.name || teamData?.title || "Match Squad"}
        </ThemedText>
        <ThemedText style={[
          styles.teamStats,
          isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
        ]}>
          {teamPlayers.length} Total Players • <Text style={{ color: COLORS.secondary, fontWeight: "700" }}>{selectedCount} in Squad</Text>
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
            {/* Quick Search and Add Player Button */}
            <View style={styles.searchSection}>
              <SearchBar
                placeholder="Quick Search players..."
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
                <Plus size={18} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
                <ThemedText style={[
                  styles.addButtonText,
                  isDarkMode ? styles.darkText : styles.lightText
                ]}>
                  New
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterTab === "ALL" ? styles.filterChipActive : (isDarkMode ? styles.darkFilterChip : styles.lightFilterChip)
                ]}
                onPress={() => setFilterTab("ALL")}
                activeOpacity={0.7}
              >
                <ThemedText style={[
                  styles.filterChipText,
                  filterTab === "ALL" ? styles.filterChipTextActive : (isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary)
                ]}>
                  All ({filteredPlayers.length})
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterTab === "SQUAD" ? styles.filterChipActive : (isDarkMode ? styles.darkFilterChip : styles.lightFilterChip)
                ]}
                onPress={() => setFilterTab("SQUAD")}
                activeOpacity={0.7}
              >
                <ThemedText style={[
                  styles.filterChipText,
                  filterTab === "SQUAD" ? styles.filterChipTextActive : (isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary)
                ]}>
                  In Squad ({inSquadPlayers.length})
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterTab === "BENCH" ? styles.filterChipActive : (isDarkMode ? styles.darkFilterChip : styles.lightFilterChip)
                ]}
                onPress={() => setFilterTab("BENCH")}
                activeOpacity={0.7}
              >
                <ThemedText style={[
                  styles.filterChipText,
                  filterTab === "BENCH" ? styles.filterChipTextActive : (isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary)
                ]}>
                  Bench ({benchPlayers.length})
                </ThemedText>
              </TouchableOpacity>
            </View>

            {loading && teamPlayers.length === 0 ? (
              <View style={[styles.centered, { flex: 1, paddingVertical: 40 }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <ThemedText style={[{ marginTop: 12 }, isDarkMode ? styles.darkText : styles.lightText]}>
                  Loading squad players...
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.playersList}
                showsVerticalScrollIndicator={false}
              >
                {/* SECTION 1: IN SQUAD / PLAYING XI */}
                {(filterTab === "ALL" || filterTab === "SQUAD") && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionHeaderTitleRow}>
                        <UserCheck size={16} color={COLORS.secondary} />
                        <ThemedText style={[styles.sectionHeaderTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                          PLAYING SQUAD
                        </ThemedText>
                        <View style={[styles.sectionCountBadge, styles.sectionCountBadgeActive]}>
                          <ThemedText style={[styles.sectionCountText, { color: COLORS.secondary }]}>
                            {inSquadPlayers.length}
                          </ThemedText>
                        </View>
                      </View>
                    </View>

                    {inSquadPlayers.length === 0 ? (
                      <ThemedText style={[
                        styles.emptySectionText,
                        isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
                      ]}>
                        {searchTerm ? "No matching squad players" : "No players in squad. Add from bench below."}
                      </ThemedText>
                    ) : (
                      inSquadPlayers.map((item) => {
                        const pId = extractPlayerId(item);
                        const isPlayed = !!playedPlayer[pId];
                        const action = !isPlayed ? BUTTON_ENUM.REMOVE : BUTTON_ENUM.NONE;
                        return (
                          <PlayerCard
                            key={`squad-${pId || Math.random()}`}
                            player={item}
                            action={action}
                            onActionPress={handleButtonAction}
                            isDarkMode={isDarkMode}
                            isPlayedPlayer={isPlayed}
                            isInSquad={true}
                          />
                        );
                      })
                    )}
                  </View>
                )}

                {/* SECTION 2: BENCH / AVAILABLE PLAYERS */}
                {(filterTab === "ALL" || filterTab === "BENCH") && (
                  <View style={{ marginBottom: 24 }}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionHeaderTitleRow}>
                        <Users size={16} color={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary} />
                        <ThemedText style={[styles.sectionHeaderTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                          BENCH / AVAILABLE
                        </ThemedText>
                        <View style={styles.sectionCountBadge}>
                          <ThemedText style={[styles.sectionCountText, isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary]}>
                            {benchPlayers.length}
                          </ThemedText>
                        </View>
                      </View>
                    </View>

                    {benchPlayers.length === 0 ? (
                      <ThemedText style={[
                        styles.emptySectionText,
                        isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
                      ]}>
                        {searchTerm ? "No matching bench players" : "No bench players available."}
                      </ThemedText>
                    ) : (
                      benchPlayers.map((item) => {
                        const pId = extractPlayerId(item);
                        return (
                          <PlayerCard
                            key={`bench-${pId || Math.random()}`}
                            player={item}
                            action={BUTTON_ENUM.ADD}
                            onActionPress={handleButtonAction}
                            isDarkMode={isDarkMode}
                            isPlayedPlayer={false}
                            isInSquad={false}
                          />
                        );
                      })
                    )}
                  </View>
                )}
              </ScrollView>
            )}
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
                Click the button below to register a new player to your team and squad
              </ThemedText>
              
              <TouchableOpacity
                style={styles.addPlayerCta}
                onPress={() => setAddPlayerModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={22} color="#FFFFFF" />
                <ThemedText style={styles.addPlayerCtaText}>Add New Player</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Done / Save Changes Floating Footer */}
      {hasChanges && activeTab === 0 && (
        <View style={[styles.footer, isDarkMode ? styles.darkFooter : styles.lightFooter]}>
          <TouchableOpacity
            style={[styles.doneButton, isSaving && styles.disabledButton]}
            onPress={handleDone}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.doneButtonText}>
                Save Changes ({changesCount})
              </ThemedText>
            )}
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
    justifyContent: "center",
    alignItems: "center",
  },
  lightContainer: {
    backgroundColor: COLORS.light.background,
  },
  darkContainer: {
    backgroundColor: COLORS.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },
  teamInfo: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  teamName: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 4,
  },
  teamStats: {
    fontSize: 14,
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
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
    fontWeight: "600",
  },
  activeTabButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 15,
  },
  addButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
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
    fontSize: 13,
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  lightFilterChip: {
    borderColor: COLORS.light.border,
    backgroundColor: COLORS.light.card,
  },
  darkFilterChip: {
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.card,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  sectionHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sectionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  sectionCountBadgeActive: {
    backgroundColor: "rgba(22, 163, 74, 0.15)",
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptySectionText: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  playersList: {
    paddingBottom: 32,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
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
  lightSelectedPlayerCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  darkSelectedPlayerCard: {
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.4)",
  },
  inSquadBadge: {
    backgroundColor: "rgba(22, 163, 74, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.3)",
  },
  inSquadBadgeText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
  },
  playerInfo: {
    flex: 1,
    marginRight: 8,
  },
  playerName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  playerRole: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 5,
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  removeButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  removeButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  playedBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  playedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  addPlayerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  addPlayerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  addPlayerDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  addPlayerCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addPlayerCtaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  lightFooter: {
    backgroundColor: COLORS.light.background,
    borderTopColor: COLORS.light.border,
  },
  darkFooter: {
    backgroundColor: COLORS.dark.background,
    borderTopColor: COLORS.dark.border,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    padding: 14,
    fontSize: 15,
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
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  addPlayerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
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

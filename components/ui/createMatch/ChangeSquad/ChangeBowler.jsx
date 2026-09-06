import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  useColorScheme,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Plus } from "lucide-react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { request } from "@/utils/api";
import SCREENS from "@/screens";
import { COLORS } from "@/theme/colors";

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
          {player.username || player.name || player.playerName || "Player"}
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

export default function ChangeBowler(props) {
  let route;
  let navigation;
  try {
    route = useRoute();
  } catch (e) {}
  try {
    navigation = useNavigation();
  } catch (e) {}

  const nav = props?.navigation || navigation;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  // Get parameters from props or route
  const teamId = props?.teamId || route?.params?.teamId;
  const matchId = props?.matchId || route?.params?.matchId;
  const playerId = props?.playerId || route?.params?.playerId;
  const playerName = props?.playerName || route?.params?.playerName;
  const fallbackSquad = props?.squad || route?.params?.squad || [];

  const [squadPlayer, setSquadPlayer] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isRemoveLoading, setIsRemoveLoading] = useState(false);
  const [loading, setLoading] = useState(false);

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
      console.warn("[ChangeBowler] navigation.goBack() failed:", e);
    }
    if (matchId && matchId !== "1") {
      (navigation || props?.navigation)?.navigate(SCREENS.ScorerScreen, { matchId });
    } else if ((navigation || props?.navigation)?.navigate) {
      (navigation || props?.navigation)?.navigate(SCREENS.Home);
    }
  }, [navigation, props?.navigation, matchId]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!navigation.isFocused()) return false;
        handleGoBack();
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [navigation, handleGoBack])
  );

  const fetchPlayerCanChanged = async () => {
    if (!matchId || !teamId) {
      if (fallbackSquad && fallbackSquad.length > 0) {
        const filtered = fallbackSquad.filter(
          (p) => !playerId || String(p.id || p._id || p.playerId) !== String(playerId)
        );
        setSquadPlayer(filtered.length > 0 ? filtered : fallbackSquad);
      }
      return;
    }
    try {
      setLoading(true);
      const res = await request(`api/matches/getPlayerToReplaced/${matchId}/${teamId}`, {
        method: "GET",
        errorAlert: false,
      });
      const list =
        res?.data?.finalPlayerList ||
        res?.data?.data ||
        (Array.isArray(res?.data) ? res.data : []);
      if (Array.isArray(list) && list.length > 0) {
        const filtered = list.filter(
          (p) => !playerId || String(p.id || p._id || p.playerId) !== String(playerId)
        );
        setSquadPlayer(filtered.length > 0 ? filtered : list);
      } else if (fallbackSquad && fallbackSquad.length > 0) {
        const filtered = fallbackSquad.filter(
          (p) => !playerId || String(p.id || p._id || p.playerId) !== String(playerId)
        );
        setSquadPlayer(filtered.length > 0 ? filtered : fallbackSquad);
      } else {
        // Fallback: fetch team directly from api/teams/${teamId}
        const teamRes = await request(`api/teams/${teamId}`, {
          method: "GET",
          errorAlert: false,
        });
        const teamPlayers = teamRes?.data?.players || teamRes?.data?.data?.players || [];
        if (Array.isArray(teamPlayers) && teamPlayers.length > 0) {
          const filtered = teamPlayers.filter(
            (p) => !playerId || String(p.id || p._id || p.playerId) !== String(playerId)
          );
          setSquadPlayer(filtered.length > 0 ? filtered : teamPlayers);
        } else {
          setSquadPlayer([]);
        }
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      if (fallbackSquad && fallbackSquad.length > 0) {
        const filtered = fallbackSquad.filter(
          (p) => !playerId || String(p.id || p._id || p.playerId) !== String(playerId)
        );
        setSquadPlayer(filtered.length > 0 ? filtered : fallbackSquad);
      } else {
        try {
          const teamRes = await request(`api/teams/${teamId}`, {
            method: "GET",
            errorAlert: false,
          });
          const teamPlayers = teamRes?.data?.players || teamRes?.data?.data?.players || [];
          if (Array.isArray(teamPlayers) && teamPlayers.length > 0) {
            const filtered = teamPlayers.filter(
              (p) => !playerId || String(p.id || p._id || p.playerId) !== String(playerId)
            );
            setSquadPlayer(filtered.length > 0 ? filtered : teamPlayers);
          } else {
            setSquadPlayer([]);
          }
        } catch (e) {
          setSquadPlayer([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (pId) => {
    setSelectedPlayer(pId);
  };

  const handleAddNew = () => {
    const params = {
      teamId,
      matchId,
      squad: squadPlayer,
      team: route?.params?.team,
    };
    if (navigation?.navigate) {
      navigation.navigate(SCREENS.ChangeSquad, params);
    } else if (nav?.navigate) {
      nav.navigate(SCREENS.ChangeSquad, params);
    }
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
      
      const res = await request(`api/matches/replacePlayer`, {
        method: "PUT",
        data: body,
      });
      
      const isSuccess = res?.status === 200 || res?.data?.success;
      
      if (isSuccess) {
        Alert.alert("Success", "Player replaced successfully");
        props?.cb?.();
        route?.params?.cb?.();
        handleGoBack();
      } else {
        Alert.alert("Error", res?.data?.message || "Failed to replace player");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong");
      console.error("Error replacing player:", error);
    } finally {
      setIsRemoveLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerCanChanged();
  }, [matchId, teamId]);

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode ? styles.darkContainer : styles.lightContainer
    ]}>
      {/* Header — ALWAYS visible */}
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
        <Text style={[
          styles.headerTitle,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          {playerName ? `Replace ${playerName}` : "Select Player"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={[styles.centered, { flex: 1, paddingVertical: 40 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[
              styles.loadingText,
              isDarkMode ? styles.darkText : styles.lightText
            ]}>
              Loading players...
            </Text>
          </View>
        ) : (
          <>
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
              keyExtractor={(item, index) =>
                (item.id || item._id || item.playerId || index).toString()
              }
              renderItem={({ item }) => {
                const currentId = item.id || item._id || item.playerId;
                return (
                  <PlayerCard
                    player={item}
                    isSelected={selectedPlayer === currentId}
                    onPress={() => handleClick(currentId)}
                    isDarkMode={isDarkMode}
                  />
                );
              }}
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
          </>
        )}
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
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
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
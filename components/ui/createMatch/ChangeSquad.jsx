import React, { useState , useEffect} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import Checkbox from "expo-checkbox";
import SwipeableTabs from "../custom/SwipeableTab";
import AddPlayer from "../create/AddPlayer";
import { Button } from "@gluestack-ui/themed";
// import request from "@/utils/api";
import _ from "lodash";
import { StyleSheet } from "react-native-css-interop";

// Define your color scheme
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
    inputBg: '#F9FAFB',
  },
  dark: {
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
    border: '#374151',
    inputBg: '#2D3748',
  }
};

const BUTTON_ENUM = {
  ADD: 1,
  REMOVE: 2,
  NONE: 3,
};

export default function ChangeSquad() {
  const route = useRoute();
  const navigation = useNavigation();
  const { teamId, matchId } = route.params || {};
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [playedPlayer, setPlayedPlayer] = useState({});
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState({});
  const [playerToRemove, setPlayerToRemove] = useState({});
  const [playerToAdd, setPlayerToAdd] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [team , setTeam] = useState({})

  const fetchTeam = async () => {
    // try {
    //   const res = await request(`api/teams/${teamId}`, {
    //     method: "GET",
    //   });
    //   if (res?.data) {
    //     setTeamPlayers(res?.data[0]?.players || []);
    //   }
    // } catch (error) {
    //   console.error("Error fetching team:", error);
    // }
  };

  const fetchMatchPlayedPlayer = async () => {
    // try {
    //   const res = await request(
    //     `api/matches/getPlayedPlayer/${matchId}/${teamId}`,
    //     {
    //       method: "GET",
    //     }
    //   );
    //   if (res.data) {
    //     setPlayedPlayer(res?.data.content.cannotRemove || {});
    //     let selectedPlayerObj = {};
    //     res?.data.content.selectedSquad?.forEach((player) => {
    //       selectedPlayerObj[player.id] = 1;
    //     });
    //     setSelectedPlayer(selectedPlayerObj);
    //   }
    // } catch (error) {
    //   console.error("Error fetching played players:", error);
    // }
  };

  const addRemovePlayer = async () => {
    // try {
    //   const body = {
    //     playerToAdd,
    //     playerToRemove,
    //     matchId,
    //     teamId,
    //   };
    //   const res = await request(`api/matches/addRemovePlayer`, {
    //     method: "PUT",
    //     data: body,
    //   });
    //   if (res.status == 200) {
    //     setPlayerToRemove({});
    //     setPlayerToAdd({});
    //     Alert.alert("Success", "Squad updated successfully");
    //     navigation.goBack();
    //   }
    // } catch (error) {
    //   console.error("Error updating squad:", error);
    //   Alert.alert("Error", "Failed to update squad");
    // }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTeam(), fetchMatchPlayedPlayer()]);
    setRefreshing(false);
  };

  useEffect(() => {
    onRefresh();
  }, []);

  useEffect(() => {
    const filtered = teamPlayers.filter((player) =>
      (player?.name || player?.username || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setFilteredPlayers(filtered);
  }, [searchTerm, teamPlayers]);

  const handleRemove = (playerInfo) => {
    const playerId = playerInfo.id;
    const playerName = playerInfo.username || playerInfo.name;
    
    if (playerToAdd[playerId]) {
      const playerToAddClone = { ...playerToAdd };
      delete playerToAddClone[playerId];
      setPlayerToAdd(playerToAddClone);
    }
    
    const playerToRemoveClone = { ...playerToRemove };
    playerToRemoveClone[playerId] = playerName;
    setPlayerToRemove(playerToRemoveClone);
    
    if (selectedPlayer[playerId]) {
      const selectedPlayerClone = { ...selectedPlayer };
      delete selectedPlayerClone[playerId];
      setSelectedPlayer(selectedPlayerClone);
    }
  };

  const handleAdd = (playerInfo) => {
    const playerId = playerInfo.id;
    const playerName = playerInfo.username || playerInfo.name;
    
    if (playerToRemove[playerId]) {
      const playerToRemoveClone = { ...playerToRemove };
      delete playerToRemoveClone[playerId];
      setPlayerToRemove(playerToRemoveClone);
    }
    
    const playerToAddClone = { ...playerToAdd };
    playerToAddClone[playerId] = playerName;
    setPlayerToAdd(playerToAddClone);
    
    const selectedPlayerClone = { ...selectedPlayer };
    selectedPlayerClone[playerId] = playerName;
    setSelectedPlayer(selectedPlayerClone);
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

  // const renderPlayerItem = ({ item }) => {
  //   const action = !selectedPlayer[item.id]
  //     ? BUTTON_ENUM.ADD
  //     : !playedPlayer[item.id]
  //     ? BUTTON_ENUM.REMOVE
  //     : BUTTON_ENUM.NONE;

  //   return (
  //     <View style={[styles.playerItem, isDarkMode ? styles.darkPlayerItem : styles.lightPlayerItem]}>
  //       <PlayerPreview
  //         playerId={item.id}
  //         name={item.name || item.username}
  //         description={item.role}
  //         action={action}
  //         playerInfo={item}
  //         showButton={
  //           action === BUTTON_ENUM.ADD
  //             ? "Add"
  //             : action === BUTTON_ENUM.REMOVE
  //             ? "Remove"
  //             : ""
  //         }
  //         onAction={handleButtonAction}
  //         isDarkMode={isDarkMode}
  //       />
  //     </View>
  //   );
  // };

  const hasChanges = Object.keys(playerToRemove).length > 0 || Object.keys(playerToAdd).length > 0;

  return (
    <SafeAreaView
          className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
        >
          {/* Header */}
          <View
            className={`px-4 py-4 border-b flex-row items-center justify-between ${
              isDarkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="p-2 mr-2"
            >
              <Ionicons name="arrow-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
              Select Squad for {team.name}
            </ThemedText>
            <View style={{ width: 24 }} />
          </View>
    
          {/* Selected Count */}
          <View className={`p-3 ${isDarkMode ? "bg-gray-800" : "bg-blue-50"}`}>
            <ThemedText className="text-center text-gray-900 dark:text-white">
              {selectedPlayers.length} players selected
            </ThemedText>
          </View>
    
          {/* Tabs */}
          <View
            className={`flex-row ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } border-b border-gray-300 dark:border-gray-700`}
          >
            {renderTabButton("mySquad", "My Squad", "people")}
            {renderTabButton("addPlayer", "Add Player", "person-add")}
          </View>
    
          {/* Select All Button */}
          {activeTab === "mySquad" && (
            <TouchableOpacity
              onPress={selectAllPlayers}
              className={`mx-3 my-2 p-2 rounded-xl flex-row items-center justify-center ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border border-gray-300 dark:border-gray-700`}
            >
              <Ionicons
                name={
                  selectedPlayers.length === playersWithImages.length
                    ? "checkbox"
                    : "square-outline"
                }
                size={20}
                color="#3B82F6"
                style={{ marginRight: 8 }}
              />
              <ThemedText className="text-blue-500 font-semibold">
                {selectedPlayers.length === playersWithImages.length
                  ? "Deselect All"
                  : "Select All"}
              </ThemedText>
            </TouchableOpacity>
          )}
    
          {/* Main Content with proper scrolling */}
          <View className="flex-1">
            {/* My Squad Tab */}
            {activeTab === "mySquad" && (
              <FlatList
                data={playersWithImages}
                keyExtractor={(item) => item.id}
                className="px-3"
                renderItem={({ item }) =>
                  renderPlayerCard({ item, isMySquad: false })
                }
              />
            )}
    
            {/* Add Player Tab */}
            {activeTab === "addPlayer" && (
              <AddPlayer showHeader={false} />
            )}
          </View>
    
          {/* Save Button */}
          <View className="p-3 border-t border-gray-200 dark:border-gray-700">
            <TouchableOpacity
              onPress={handleSaveSquad}
              disabled={selectedPlayers.length === 0}
              className={`p-3 rounded-xl ${
                selectedPlayers.length === 0 ? "bg-gray-400" : "bg-blue-500"
              }`}
            >
              <ThemedText className="text-white text-center text-base font-semibold">
                Save Squad ({selectedPlayers.length} players)
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
  );
}

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   lightContainer: {
//     backgroundColor: COLORS.light.background,
//   },
//   darkContainer: {
//     backgroundColor: COLORS.dark.background,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.light.border,
//   },
//   darkTabContainer: {
//     borderBottomColor: COLORS.dark.border,
//   },
//   tab: {
//     flex: 1,
//     paddingVertical: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   activeTab: {
//     borderBottomWidth: 2,
//     borderBottomColor: COLORS.primary,
//   },
//   tabText: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: COLORS.light.textSecondary,
//   },
//   darkTabText: {
//     color: COLORS.dark.textSecondary,
//   },
//   activeTabText: {
//     color: COLORS.primary,
//     fontWeight: '600',
//   },
//   tabContent: {
//     flex: 1,
//     padding: 16,
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     borderRadius: 12,
//     marginBottom: 16,
//   },
//   lightSearchContainer: {
//     backgroundColor: COLORS.light.inputBg,
//     borderWidth: 1,
//     borderColor: COLORS.light.border,
//   },
//   darkSearchContainer: {
//     backgroundColor: COLORS.dark.inputBg,
//     borderWidth: 1,
//     borderColor: COLORS.dark.border,
//   },
//   searchInput: {
//     flex: 1,
//     marginLeft: 8,
//     fontSize: 16,
//   },
//   lightInput: {
//     color: COLORS.light.text,
//   },
//   darkInput: {
//     color: COLORS.dark.text,
//   },
//   listContent: {
//     paddingBottom: 80,
//   },
//   playerItem: {
//     marginBottom: 12,
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   lightPlayerItem: {
//     backgroundColor: COLORS.light.card,
//     borderWidth: 1,
//     borderColor: COLORS.light.border,
//   },
//   darkPlayerItem: {
//     backgroundColor: COLORS.dark.card,
//     borderWidth: 1,
//     borderColor: COLORS.dark.border,
//   },
//   buttonContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     padding: 16,
//     backgroundColor: 'rgba(255, 255, 255, 0.9)',
//   },
//   darkButtonContainer: {
//     backgroundColor: 'rgba(30, 30, 30, 0.9)',
//   },
//   doneButton: {
//     backgroundColor: COLORS.primary,
//     borderRadius: 12,
//     padding: 16,
//     alignItems: 'center',
//   },
//   doneButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   comingSoon: {
//     textAlign: 'center',
//     fontSize: 18,
//     marginTop: 40,
//     opacity: 0.7,
//   },
//   lightText: {
//     color: COLORS.light.text,
//   },
//   darkText: {
//     color: COLORS.dark.text,
//   },
// });
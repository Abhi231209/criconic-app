import React, { useState } from "react";
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

export default function SelectSquadScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  let { team, teamType, onSquadSelect } = route.params;

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const playersWithImages = [
    {
      id: "1",
      name: "Virat Kohli",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/253802.png",
      position: "Batsman",
      rating: 5,
      isCaptain: true,
    },
    {
      id: "2",
      name: "Jasprit Bumrah",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/625383.png",
      position: "Bowler",
      rating: 5,
      isViceCaptain: true,
    },
    {
      id: "3",
      name: "Rohit Sharma",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/34102.png",
      position: "Batsman",
      rating: 4,
    },
    {
      id: "4",
      name: "Ravindra Jadeja",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/234675.png",
      position: "All-rounder",
      rating: 4,
    },
    {
      id: "5",
      name: "KL Rahul",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/422108.png",
      position: "Wicketkeeper",
      rating: 4,
    },
    {
      id: "6",
      name: "Mohammed Shami",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/481896.png",
      position: "Bowler",
      rating: 4,
    },
    {
      id: "7",
      name: "Rishabh Pant",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/684175.png",
      position: "Wicketkeeper",
      rating: 4,
    },
    {
      id: "8",
      name: "Hardik Pandya",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/625371.png",
      position: "All-rounder",
      rating: 4,
    },
    {
      id: "9",
      name: "Ravichandran Ashwin",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/26429.png",
      position: "Bowler",
      rating: 4,
    },
    {
      id: "10",
      name: "Shreyas Iyer",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/641307.png",
      position: "Batsman",
      rating: 3,
    },
    {
      id: "11",
      name: "Yuzvendra Chahal",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/447253.png",
      position: "Bowler",
      rating: 3,
    },
    {
      id: "12",
      name: "Shubman Gill",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/1070168.png",
      position: "Batsman",
      rating: 4,
    },
    {
      id: "13",
      name: "Suryakumar Yadav",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/446507.png",
      position: "Batsman",
      rating: 4,
    },
    {
      id: "14",
      name: "Axar Patel",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/457249.png",
      position: "All-rounder",
      rating: 3,
    },
    {
      id: "15",
      name: "Kuldeep Yadav",
      image:
        "https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_320/lsci/players/IMG/559235.png",
      position: "Bowler",
      rating: 3,
    },
  ];

  const [selectedPlayers, setSelectedPlayers] = useState(["1", "2"]);
  const [activeTab, setActiveTab] = useState("mySquad");

  const togglePlayerSelection = (playerId) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter((id) => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const selectAllPlayers = () => {
    if (selectedPlayers.length === playersWithImages.length) {
      setSelectedPlayers([]);
    } else {
      const allPlayerIds = playersWithImages.map((player) => player.id);
      setSelectedPlayers(allPlayerIds);
    }
  };

  const handleSaveSquad = () => {
    const squad = playersWithImages.filter((player) =>
      selectedPlayers.includes(player.id)
    );
    onSquadSelect(squad);
  };

  const renderTabButton = (tabName, label, iconName) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tabName)}
      className={`flex-1 py-3 px-2 items-center justify-center ${
        activeTab === tabName
          ? "border-b-2 border-blue-500"
          : "border-b border-gray-300 dark:border-gray-700"
      }`}
    >
      <Ionicons
        name={iconName}
        size={20}
        color={
          activeTab === tabName ? "#3B82F6" : isDarkMode ? "#9CA3AF" : "#6B7280"
        }
      />
      <ThemedText
        className={`text-xs mt-1 ${
          activeTab === tabName
            ? "text-blue-500 font-semibold"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderPlayerCard = ({ item, isMySquad = false }) => (
    <View
      className={`p-3 rounded-xl mb-2 flex-row items-center ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-sm`}
    >
      <Image
        source={{ uri: item.image }}
        className="w-10 h-10 rounded-full mr-3"
        defaultSource={require("../../../assets/Logo.png")}
      />

      <View className="flex-1">
        <View className="flex-row items-center">
          <ThemedText className="text-base font-semibold text-gray-900 dark:text-white">
            {item.name}
          </ThemedText>
          {item.isCaptain && (
            <View className="ml-2 bg-yellow-500 px-2 py-1 rounded-full">
              <ThemedText className="text-xs text-white">C</ThemedText>
            </View>
          )}
          {item.isViceCaptain && (
            <View className="ml-2 bg-blue-500 px-2 py-1 rounded-full">
              <ThemedText className="text-xs text-white">VC</ThemedText>
            </View>
          )}
        </View>
        {/* <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
          {item.position} • ⭐{item.rating}/5
        </ThemedText> */}
      </View>

      {isMySquad ? (
        <TouchableOpacity
          onPress={() => togglePlayerSelection(item.id)}
          className="p-2"
        >
          <Ionicons name="remove-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => togglePlayerSelection(item.id)}
          className="p-2"
        >
          <Ionicons
            name={
              selectedPlayers.includes(item.id)
                ? "checkmark-circle"
                : "add-circle"
            }
            size={24}
            color={selectedPlayers.includes(item.id) ? "#10B981" : "#3B82F6"}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // Define tabs for SwipeableTabs
  const tabs = [
    { value: "mySquad", label: "My Squad" },
    { value: "addPlayer", label: "Add Player" },
  ];

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

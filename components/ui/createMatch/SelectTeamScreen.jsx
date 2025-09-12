import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import SwipeableTabs from "../custom/SwipeableTab";

export default function SelectTeamScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { teamType, onTeamSelect, onSquadSelect } = route.params;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("myTeams");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchTeams = () => {
      setTimeout(() => {
        const mockTeams = [
          { 
            id: "1", 
            name: "Mumbai Indians", 
            location: "Mumbai, India",
            image: "https://example.com/mumbai-indians.jpg",
            players: Array(20).fill().map((_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` })),
            isMyTeam: true
          },
          { 
            id: "2", 
            name: "Chennai Super Kings", 
            location: "Chennai, India",
            image: "https://example.com/chennai-super-kings.jpg",
            players: Array(18).fill().map((_, i) => ({ id: `c${i+1}`, name: `CSK Player ${i+1}` })),
            isMyTeam: true
          },
          { 
            id: "3", 
            name: "Royal Challengers", 
            location: "Bangalore, India",
            image: "https://example.com/royal-challengers.jpg",
            players: Array(22).fill().map((_, i) => ({ id: `r${i+1}`, name: `RCB Player ${i+1}` })),
            isMyTeam: false
          },
          { 
            id: "4", 
            name: "Kolkata Knight Riders", 
            location: "Kolkata, India",
            image: "https://example.com/kkr.jpg",
            players: Array(19).fill().map((_, i) => ({ id: `k${i+1}`, name: `KKR Player ${i+1}` })),
            isMyTeam: false
          },
        ];
        setTeams(mockTeams);
        setLoading(false);
      }, 500);
    };

    fetchTeams();
  }, []);

  const handleTeamSelect = (team) => {
    navigation.navigate(SCREENS.SelectSquadScreen, {
      team,
      teamType,
      onSquadSelect: (squad) => {
        onTeamSelect(team);
        onSquadSelect(team, squad, teamType);
        navigation.goBack();
      }
    });
  };

  const handleCreateTeam = () => {
    navigation.navigate(SCREENS.CreateTeam, {
      onTeamCreated: (newTeam) => {
        const updatedTeams = [...teams, {...newTeam, isMyTeam: true}];
        setTeams(updatedTeams);
        setActiveTab("myTeams");
      }
    });
  };

  // Filter teams based on active tab and search query
  const getFilteredTeams = () => {
    let filtered = teams;
    
    // Filter by tab
    if (activeTab === "myTeams") {
      filtered = filtered.filter(team => team.isMyTeam);
    } else if (activeTab === "opponentTeams") {
      filtered = filtered.filter(team => !team.isMyTeam);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
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
        color={activeTab === tabName ? "#3B82F6" : isDarkMode ? "#9CA3AF" : "#6B7280"}
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

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <ThemedText className="text-gray-900 dark:text-white">Loading teams...</ThemedText>
      </SafeAreaView>
    );
  }

  // Define tabs for SwipeableTabs
  const tabs = [
    { value: "myTeams", label: "My Teams" },
    { value: "opponentTeams", label: "Opponent Teams" },
    { value: "create", label: "Create Team" },
    { value: "search", label: "Search" },
  ];

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header */}
      <View
        className={`px-4 py-4 border-b flex-row items-center ${
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
          Select {teamType === "teamA" ? "Team A" : "Team B"}
        </ThemedText>
      </View>

      {/* Tabs */}
      <View
        className={`flex-row ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } border-b border-gray-300 dark:border-gray-700`}
      >
        {renderTabButton("myTeams", "My Teams", "people")}
        {renderTabButton("opponentTeams", "Opponents", "shield")}
        {renderTabButton("create", "Create", "add-circle")}
        {renderTabButton("search", "Search", "search")}
      </View>

      {/* Swipeable Content */}
      <SwipeableTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
      >
        {/* My Teams Tab */}
        {activeTab === "myTeams" && (
          <TeamList 
            teams={getFilteredTeams()} 
            onTeamSelect={handleTeamSelect}
            isDarkMode={isDarkMode}
            emptyMessage="No teams available. Create one!"
          />
        )}

        {/* Opponent Teams Tab */}
        {activeTab === "opponentTeams" && (
          <TeamList 
            teams={getFilteredTeams()} 
            onTeamSelect={handleTeamSelect}
            isDarkMode={isDarkMode}
            emptyMessage="No opponent teams available."
          />
        )}

        {/* Create Team Tab */}
        {activeTab === "create" && (
          <CreateTeamTab onCreateTeam={handleCreateTeam} isDarkMode={isDarkMode} />
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <SearchTab 
            teams={getFilteredTeams()} 
            onTeamSelect={handleTeamSelect}
            isDarkMode={isDarkMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
      </SwipeableTabs>
    </SafeAreaView>
  );
}

// Team List Component
const TeamList = ({ teams, onTeamSelect, isDarkMode, emptyMessage }) => {
  return (
    <View className="flex-1 p-4">
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onTeamSelect(item)}
            className={`p-4 rounded-xl mb-3 flex-row items-center ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <Image
              source={{ uri: item.image || "https://via.placeholder.com/50" }}
              className="w-12 h-12 rounded-full mr-3"
              defaultSource={require("../../../assets/stadium-background-image.jpg")}
            />
            <View className="flex-1">
              <ThemedText className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                {item.name}
              </ThemedText>
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                {item.location} • {item.players.length} players
              </ThemedText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-10">
            <ThemedText className="text-gray-500 dark:text-gray-400">
              {emptyMessage}
            </ThemedText>
          </View>
        }
      />
    </View>
  );
};

// Create Team Tab Component
const CreateTeamTab = ({ onCreateTeam, isDarkMode }) => {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <TouchableOpacity
        onPress={onCreateTeam}
        className={`p-6 rounded-xl items-center justify-center ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm w-full max-w-xs border ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <Ionicons
          name="add-circle"
          size={48}
          color="#3B82F6"
          style={{ marginBottom: 16 }}
        />
        <ThemedText className="text-blue-500 font-semibold text-lg text-center">
          Create New Team
        </ThemedText>
        <ThemedText className="text-gray-500 dark:text-gray-400 text-center mt-2">
          Build your own team with custom players and strategies
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

// Search Tab Component
const SearchTab = ({ teams, onTeamSelect, isDarkMode, searchQuery, setSearchQuery }) => {
  return (
    <View className="flex-1 p-4">
      <View
        className={`flex-row items-center p-3 rounded-xl mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm border ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <Ionicons
          name="search"
          size={20}
          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder="Search teams..."
          placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="flex-1 text-gray-900 dark:text-white"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onTeamSelect(item)}
            className={`p-4 rounded-xl mb-3 flex-row items-center ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <Image
              source={{ uri: item.image || "https://via.placeholder.com/50" }}
              className="w-12 h-12 rounded-full mr-3"
              defaultSource={require("../../../assets/stadium-background-image.jpg")}
            />
            <View className="flex-1">
              <ThemedText className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                {item.name}
              </ThemedText>
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                {item.location} • {item.players.length} players
              </ThemedText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-10">
            <ThemedText className="text-gray-500 dark:text-gray-400">
              {searchQuery ? "No teams found. Try a different search." : "Search for teams by name or location"}
            </ThemedText>
          </View>
        }
      />
    </View>
  );
};
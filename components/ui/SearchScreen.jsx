import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { searchApi } from "@/utils/api";

export default function SearchScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("teams");
  const [isSearching, setIsSearching] = useState(false);

  // HARDCODED SAMPLE DATA - COMMENTED OUT (API ONLY)
  /*
  const sampleTeams = [
    {
      id: "1",
      name: "Mumbai Indians",
      shortName: "MI",
      logo: null,
      matches: 14,
      wins: 9,
      losses: 5,
      players: 25,
    },
    {
      id: "2",
      name: "Chennai Super Kings",
      shortName: "CSK",
      logo: null,
      matches: 14,
      wins: 8,
      losses: 6,
      players: 24,
    },
    {
      id: "3",
      name: "Royal Challengers Bangalore",
      shortName: "RCB",
      logo: null,
      matches: 14,
      wins: 7,
      losses: 7,
      players: 23,
    },
  ];

  const samplePlayers = [
    {
      id: "1",
      name: "Virat Kohli",
      team: "RCB",
      role: "Batsman",
      matches: 237,
      runs: 7263,
      image: null,
    },
    {
      id: "2",
      name: "Rohit Sharma",
      team: "MI",
      role: "Batsman",
      matches: 243,
      runs: 5876,
      image: null,
    },
    {
      id: "3",
      name: "Jasprit Bumrah",
      team: "MI",
      role: "Bowler",
      matches: 120,
      wickets: 145,
      image: null,
    },
  ];

  const sampleTournaments = [
    {
      id: "1",
      name: "IPL 2024",
      shortName: "IPL24",
      teams: 10,
      status: "ongoing",
      matches: 74,
      progress: 65,
    },
    {
      id: "2",
      name: "T20 World Cup 2024",
      shortName: "T20WC24",
      teams: 20,
      status: "upcoming",
      matches: 55,
      progress: 0,
    },
    {
      id: "3",
      name: "Big Bash League 2023-24",
      shortName: "BBL13",
      teams: 8,
      status: "completed",
      matches: 44,
      progress: 100,
    },
  ];

  const sampleMatches = [
    {
      id: "1",
      team1: "MI",
      team2: "CSK",
      score: "MI 145/4 (15) vs CSK 132/6 (15)",
      result: "MI won by 13 runs",
      date: "2 hours ago",
      tournament: "IPL 2024",
    },
    {
      id: "2",
      team1: "RCB",
      team2: "KKR",
      score: "RCB 205/3 (20) vs KKR 208/4 (19.2)",
      result: "KKR won by 6 wickets",
      date: "1 day ago",
      tournament: "IPL 2024",
    },
    {
      id: "3",
      team1: "DC",
      team2: "SRH",
      score: "DC 189/5 (20) vs SRH 190/4 (19.1)",
      result: "SRH won by 6 wickets",
      date: "2 days ago",
      tournament: "IPL 2024",
    },
  ];
  */

  const [searchResults, setSearchResults] = useState({
    teams: [],
    players: [],
    tournaments: [],
    matches: [],
  });

  const performSearch = async (text = searchQuery) => {
    const q = text.trim();
    if (!q) {
      setSearchResults({ teams: [], players: [], tournaments: [], matches: [] });
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchApi.search(q);
      const list = Array.isArray(res?.data) ? res.data : [];
      const teams = list.find((item) => item.key?.toLowerCase() === "team")?.data || [];
      const players = list.find((item) => item.key?.toLowerCase() === "player")?.data || [];
      const tournaments = list.find((item) => item.key?.toLowerCase() === "tournament")?.data || [];
      const matches = list.find((item) => item.key?.toLowerCase() === "match")?.data || [];

      setSearchResults({
        teams: Array.isArray(teams) ? teams : [],
        players: Array.isArray(players) ? players : [],
        tournaments: Array.isArray(tournaments) ? tournaments : [],
        matches: Array.isArray(matches) ? matches : [],
      });
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults({ teams: [], players: [], tournaments: [], matches: [] });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else if (!searchQuery.trim()) {
        setSearchResults({ teams: [], players: [], tournaments: [], matches: [] });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const tabs = [
    { id: "teams", label: "Teams", icon: "people-outline" },
    { id: "players", label: "Players", icon: "person-outline" },
    { id: "tournaments", label: "Tournaments", icon: "trophy-outline" },
    { id: "matches", label: "Matches", icon: "calendar-outline" },
  ];

  const TabButton = ({ tab }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab.id)}
      className={`flex-1 py-3 px-2 items-center rounded-lg mx-1 ${
        activeTab === tab.id
          ? "bg-blue-600"
          : isDarkMode
          ? "bg-gray-800"
          : "bg-gray-200"
      }`}
    >
      <Ionicons
        name={tab.icon}
        size={18}
        color={
          activeTab === tab.id ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"
        }
      />
      <ThemedText
        className={`text-xs mt-1 font-medium ${
          activeTab === tab.id
            ? "text-white"
            : isDarkMode
            ? "text-gray-400"
            : "text-gray-600"
        }`}
      >
        {tab.label}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderTeamItem = ({ item }) => {
    const name = item.title || item.name || "Unknown Team";
    const shortName = item.shortName || name.slice(0, 3).toUpperCase();
    const playersCount = Array.isArray(item.players) ? item.players.length : (item.players || 0);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate(SCREENS.TeamProfile, { team: item })}
        className={`p-4 rounded-xl mb-3 ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}
      >
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
            <ThemedText className="text-blue-600 font-bold">
              {shortName}
            </ThemedText>
          </View>
          <View className="flex-1">
            <ThemedText className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {name}
            </ThemedText>
            <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              {item.location ? `${item.location} • ` : ""}{playersCount} Players
            </ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlayerItem = ({ item }) => {
    const name = item.username || item.name || "Player";
    const role = item.role || "Player";
    const mobile = item.mobile || "";

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate(SCREENS.PlayerProfile, { player: item, playerId: item._id || item.id || item.playerId })}
        className={`p-4 rounded-xl mb-3 ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}
      >
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-gray-300 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          </View>
          <View className="flex-1">
            <ThemedText className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {name}
            </ThemedText>
            <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              {role}{mobile ? ` • ${mobile}` : ""}
            </ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderTournamentItem = ({ item }) => {
    const name = item.title || item.name || "Tournament";
    const status = item.status || "upcoming";
    const teamsCount = Array.isArray(item.teams) ? item.teams.length : (item.teams || 0);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate(SCREENS.TournamentProfile, { tournament: item })}
        className={`p-4 rounded-xl mb-3 ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <ThemedText className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {name}
          </ThemedText>
          <View className={`px-3 py-1 rounded-full ${
            status === "ongoing" ? "bg-green-100" : 
            status === "upcoming" ? "bg-blue-100" : "bg-gray-100"
          }`}>
            <ThemedText className={`text-xs ${
              status === "ongoing" ? "text-green-800" : 
              status === "upcoming" ? "text-blue-800" : "text-gray-800"
            }`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </ThemedText>
          </View>
        </View>
        <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}>
          {item.shortName ? `${item.shortName} • ` : ""}{teamsCount} teams
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const renderMatchItem = ({ item }) => {
    const team1 = item.firstBattingTeam?.title || item.team1 || "Team 1";
    const team2 = item.secondBattingTeam?.title || item.team2 || "Team 2";
    const status = item.status || "upcoming";
    const result = item.result?.resultString || item.result || (status ? `Status: ${status}` : "Scheduled");

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate(SCREENS.MatchDetails, { match: item })}
        className={`p-4 rounded-xl mb-3 ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}
      >
        {item.tournament?.title && (
          <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}>
            {item.tournament?.title}
          </ThemedText>
        )}
        <ThemedText className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-900"} mb-2`}>
          {team1} vs {team2}
        </ThemedText>
        <View className="flex-row justify-between items-center">
          <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            {status}
          </ThemedText>
          <ThemedText className="text-sm font-medium text-green-600">
            {result}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="items-center justify-center py-10">
      <Ionicons 
        name={activeTab === "teams" ? "people-outline" : 
              activeTab === "players" ? "person-outline" :
              activeTab === "tournaments" ? "trophy-outline" : "calendar-outline"} 
        size={48} 
        color={isDarkMode ? "#4B5563" : "#9CA3AF"} 
      />
      <ThemedText className={`text-lg mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        {searchQuery ? "No results found" : "Search for " + tabs.find(t => t.id === activeTab)?.label.toLowerCase()}
      </ThemedText>
      <ThemedText className={`text-sm mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
        {searchQuery ? "Try different keywords" : "Type to start searching"}
      </ThemedText>
    </View>
  );

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
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#FFFFFF" : "#000000"} />
        </TouchableOpacity>

        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          Search
        </ThemedText>

        <View className="p-2" />
      </View>

      {/* Search Bar */}
      <View className={`p-4 ${isDarkMode ? "bg-gray-800" : "bg-white"} border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
        <View className={`flex-row items-center px-3 py-2 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <TextInput
            placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`}
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => performSearch()}
            className={`flex-1 ml-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Tabs */}
      <View className={`px-4 py-3 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <View className="flex-row justify-between">
          {tabs.map((tab) => (
            <TabButton key={tab.id} tab={tab} />
          ))}
        </View>
      </View>

      {/* Search Results */}
      <View className="flex-1 px-4">
        {isSearching ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={isDarkMode ? "#3B82F6" : "#2563EB"} />
            <ThemedText className={`mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Searching...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={searchResults[activeTab] || []}
            keyExtractor={(item) => (item._id || item.id || Math.random()).toString()}
            renderItem={
              activeTab === "teams" ? renderTeamItem :
              activeTab === "players" ? renderPlayerItem :
              activeTab === "tournaments" ? renderTournamentItem :
              renderMatchItem
            }
            contentContainerStyle={{ paddingVertical: 16 }}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
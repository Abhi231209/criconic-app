import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import SwipeableTabs from "../custom/SwipeableTab";
import { teamsApi, searchApi } from "@/utils/api";
import debounce from "lodash/debounce";

export default function SelectTeamScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { teamType, otherTeamId, selectedOpponentTeamId } = route.params || {};
  const blockedTeamId = otherTeamId || selectedOpponentTeamId;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("myTeams");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const normalizeTeam = (t, isMy = false) => {
    const raw = t?.team?.[0] || t;
    const teamId = String(raw?._id || raw?.id || raw?.teamId || "");
    const teamName = raw?.teamName || raw?.title || raw?.name || "Unnamed Team";
    return {
      ...raw,
      id: teamId,
      _id: teamId,
      teamId,
      name: teamName,
      title: teamName,
      location: raw?.location || "Location not specified",
      image: raw?.teamLogo || raw?.logoImage || raw?.image || raw?.logo || null,
      players: Array.isArray(raw?.players) ? raw.players : [],
      isMyTeam: isMy,
    };
  };

  const fetchTeams = async () => {
    try {
      const [myRes, oppRes] = await Promise.all([
        teamsApi.getMyTeams().catch(() => null),
        teamsApi.getOpponentTeams().catch(() => null),
      ]);

      let myData = [];
      if (Array.isArray(myRes?.data)) {
        myData = myRes.data.map((t) => normalizeTeam(t, true));
      }

      const rawOppList = Array.isArray(oppRes?.data?.content)
        ? oppRes.data.content
        : Array.isArray(oppRes?.data)
        ? oppRes.data
        : [];
      const oppData = rawOppList.map((t) => normalizeTeam(t, false));

      // Combine and deduplicate
      const combined = [...myData];
      const seenIds = new Set(myData.map((t) => t.id).filter(Boolean));
      for (const t of oppData) {
        if (t.id && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          combined.push(t);
        }
      }

      setTeams(combined);
    } catch (error) {
      console.warn("[SelectTeam] Failed to fetch teams:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const debouncedTeamSearch = useCallback(
    debounce(async (query) => {
      if (!query || !query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      try {
        const res = await searchApi.search(query.trim(), "team");
        const list =
          res?.data?.[0]?.data ||
          (Array.isArray(res?.data) ? res.data : []);
        setSearchResults(
          (Array.isArray(list) ? list : []).map((t) => normalizeTeam(t, false))
        );
      } catch (err) {
        console.warn("[SelectTeamScreen] Global search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleSearchQueryChange = (text) => {
    setSearchQuery(text);
    if (!text || !text.trim()) {
      debouncedTeamSearch.cancel();
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debouncedTeamSearch(text);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTeams();
  };

  const handleTeamSelect = (team) => {
    const selectedId = team?._id || team?.id || team?.teamId;
    if (
      blockedTeamId &&
      selectedId &&
      String(blockedTeamId) === String(selectedId)
    ) {
      Alert.alert(
        "Invalid Selection",
        "Team A and Team B cannot be the same team. Please choose a different opponent."
      );
      return;
    }

    navigation.navigate(SCREENS.SelectSquadScreen, {
      team,
      teamType,
    });
  };

  const handleCreateTeam = () => {
    navigation.navigate(SCREENS.CreateTeam, {
      onTeamCreated: (newTeam) => {
        if (newTeam) {
          const normalized = normalizeTeam(newTeam, true);
          setTeams((prev) => [normalized, ...prev]);
          setActiveTab("myTeams");
        }
      },
    });
  };

  // Filter teams based on active tab
  const getFilteredTeams = () => {
    let filtered = teams;
    if (activeTab === "myTeams") {
      filtered = filtered.filter((t) => t.isMyTeam);
    } else if (activeTab === "opponentTeams") {
      filtered = filtered.filter((t) => !t.isMyTeam);
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
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        {/* Opponent Teams Tab */}
        {activeTab === "opponentTeams" && (
          <TeamList 
            teams={getFilteredTeams()} 
            onTeamSelect={handleTeamSelect}
            isDarkMode={isDarkMode}
            emptyMessage="No opponent teams available."
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        {/* Create Team Tab */}
        {activeTab === "create" && (
          <CreateTeamTab onCreateTeam={handleCreateTeam} isDarkMode={isDarkMode} />
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <SearchTab 
            teams={searchResults} 
            isSearching={isSearching}
            onTeamSelect={handleTeamSelect}
            isDarkMode={isDarkMode}
            searchQuery={searchQuery}
            setSearchQuery={handleSearchQueryChange}
          />
        )}
      </SwipeableTabs>
    </SafeAreaView>
  );
}

// Team List Component
const TeamList = ({ teams, onTeamSelect, isDarkMode, emptyMessage, refreshing, onRefresh }) => {
  return (
    <View className="flex-1 p-4">
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              colors={["#2563EB"]}
              tintColor="#2563EB"
            />
          ) : undefined
        }
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
                {item.location} • {item.players?.length || 0} players
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

// Search Tab Component with Live Global Search
const SearchTab = ({ teams, isSearching, onTeamSelect, isDarkMode, searchQuery, setSearchQuery }) => {
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
          placeholder="Search all teams globally..."
          placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="flex-1 text-gray-900 dark:text-white"
        />
        {isSearching ? (
          <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 6 }} />
        ) : null}
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
                {item.location} • {item.players?.length || 0} players
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
              {isSearching
                ? "Searching teams..."
                : searchQuery
                ? "No teams found matching your search."
                : "Type a team name to search across Criconic."}
            </ThemedText>
          </View>
        }
      />
    </View>
  );
};
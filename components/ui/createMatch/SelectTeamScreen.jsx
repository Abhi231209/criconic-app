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
import { teamsApi, searchApi, tournamentsApi } from "@/utils/api";
import { getImageFullUrl } from "@/utils";
import debounce from "lodash/debounce";
import { showGlobalAlert } from "@/components/ui/custom/AppAlertModal";

// In-memory cache for instant pre-scorer screen loading
let cachedTeams = null;
let cachedTournamentTeams = {};

export default function SelectTeamScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { teamType, otherTeamId, selectedOpponentTeamId, tournamentId } = route.params || {};
  const blockedTeamId = otherTeamId || selectedOpponentTeamId;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [teams, setTeams] = useState(() => cachedTeams || []);
  const [tournamentTeams, setTournamentTeams] = useState(() => (tournamentId && cachedTournamentTeams[tournamentId]) || []);
  const [tournamentTitle, setTournamentTitle] = useState("");
  const [loading, setLoading] = useState(() => {
    if (tournamentId) {
      return !cachedTournamentTeams[tournamentId] && !cachedTeams;
    }
    return !cachedTeams;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(tournamentId ? "tournamentTeams" : "myTeams");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [oppPage, setOppPage] = useState(1);
  const [hasMoreOpp, setHasMoreOpp] = useState(true);
  const [loadingMoreOpp, setLoadingMoreOpp] = useState(false);

  const normalizeTeam = (t, isMy = false) => {
    const raw = t?.teamId && typeof t.teamId === "object" ? { ...t.teamId, ...t } : (t?.team?.[0] || t);
    const teamId = String(raw?._id || raw?.id || raw?.teamId || "");
    const teamName = raw?.teamName || raw?.title || raw?.name || "Unnamed Team";
    const rawImg = raw?.teamLogo || raw?.logoImage || raw?.image || raw?.logo || null;
    
    // Safely extract players without them getting overwritten by an empty outer array
    const rawPlayers =
      (Array.isArray(t?.teamId?.players) && t.teamId.players.length > 0)
        ? t.teamId.players
        : (Array.isArray(t?.players) && t.players.length > 0)
        ? t.players
        : (Array.isArray(raw?.players) && raw.players.length > 0)
        ? raw.players
        : [];

    return {
      ...raw,
      id: teamId,
      _id: teamId,
      teamId,
      name: teamName,
      title: teamName,
      location: raw?.location || "Location not specified",
      image: rawImg ? (rawImg.startsWith("http") ? rawImg : getImageFullUrl(rawImg)) : null,
      players: rawPlayers,
      isMyTeam: isMy,
    };
  };

  const fetchTeams = async () => {
    try {
      // 1. Fetch My Teams first for instant display
      teamsApi.getMyTeams().then((myRes) => {
        if (Array.isArray(myRes?.data)) {
          const myData = myRes.data.map((t) => normalizeTeam(t, true));
          setTeams((prev) => {
            const seen = new Set(myData.map((t) => t.id).filter(Boolean));
            const existingOpp = prev.filter((t) => !t.isMyTeam && !seen.has(t.id));
            const updated = [...myData, ...existingOpp];
            cachedTeams = updated;
            return updated;
          });
          if (tournamentId) {
            setTournamentTeams((prev) =>
              prev.map((tt) => {
                if (!tt.players || tt.players.length === 0) {
                  const match = myData.find((m) => String(m.id) === String(tt.id));
                  if (match?.players?.length > 0) return { ...tt, players: match.players };
                }
                return tt;
              })
            );
          }
          setLoading(false);
        }
      }).catch(() => {});

      // 2. Fetch Opponents in parallel
      teamsApi.getOpponentTeams().then((oppRes) => {
        const rawOppList = Array.isArray(oppRes?.data?.content)
          ? oppRes.data.content
          : Array.isArray(oppRes?.data)
          ? oppRes.data
          : [];
        const oppData = rawOppList.map((t) => normalizeTeam(t, false));
        setTeams((prev) => {
          const seen = new Set(prev.map((t) => t.id).filter(Boolean));
          const newOpp = oppData.filter((t) => t.id && !seen.has(t.id));
          const updated = [...prev, ...newOpp];
          cachedTeams = updated;
          return updated;
        });
        if (tournamentId) {
          setTournamentTeams((prev) =>
            prev.map((tt) => {
              if (!tt.players || tt.players.length === 0) {
                const match = oppData.find((m) => String(m.id) === String(tt.id));
                if (match?.players?.length > 0) return { ...tt, players: match.players };
              }
              return tt;
            })
          );
        }
        setLoading(false);
      }).catch(() => {});

      // 3. Fetch Tournament data if applicable
      if (tournamentId) {
        tournamentsApi.getTournamentById(tournamentId).then((tournRes) => {
          let tData =
            tournRes?.data?.content ||
            tournRes?.data?.tournament ||
            tournRes?.data;
          if (tData?.content) tData = tData.content;
          if (tData) {
            setTournamentTitle(tData.title || tData.name || "Tournament");
            if (Array.isArray(tData.teams)) {
              const currentAllTeams = cachedTeams || [];
              const parsedTeams = tData.teams.map((t) => {
                const innerTeam = t?.teamId && typeof t.teamId === "object" ? { ...t.teamId, ...t } : (t?.team?.[0] || t);
                const normalized = normalizeTeam(innerTeam, false);
                const tId = normalized.id;
                
                // Cross-reference: if tournament team has 0 players, populate from My Teams / Opponents!
                if (!normalized.players || normalized.players.length === 0) {
                  const matched = currentAllTeams.find((ct) => String(ct.id) === String(tId));
                  if (matched && Array.isArray(matched.players) && matched.players.length > 0) {
                    normalized.players = matched.players;
                  }
                }
                return normalized;
              });

              setTournamentTeams(parsedTeams);
              cachedTournamentTeams[tournamentId] = parsedTeams;

              // Background-fetch details for any tournament teams still missing players
              parsedTeams.forEach((pt) => {
                if (!pt.players || pt.players.length === 0) {
                  teamsApi.getTeamById(pt.id).then((teamDetailRes) => {
                    const teamDataObj = Array.isArray(teamDetailRes?.data)
                      ? teamDetailRes.data[0]
                      : (teamDetailRes?.data?.data || teamDetailRes?.data?.team || teamDetailRes?.data);
                    const pl = teamDataObj?.players;
                    if (Array.isArray(pl) && pl.length > 0) {
                      setTournamentTeams((prev) => {
                        const updated = prev.map((item) =>
                          item.id === pt.id ? { ...item, players: pl } : item
                        );
                        cachedTournamentTeams[tournamentId] = updated;
                        return updated;
                      });
                    }
                  }).catch(() => {});
                }
              });
            }
          }
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });
      }
    } catch (error) {
      console.warn("[SelectTeam] Failed to fetch teams:", error);
    } finally {
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

  const loadMoreOpponents = async () => {
    if (loading || loadingMoreOpp || !hasMoreOpp || isSearching || searchQuery) return;
    try {
      setLoadingMoreOpp(true);
      const nextP = oppPage + 1;
      const oppRes = await teamsApi.getOpponentTeams({ params: { page: nextP, limit: 15 } });
      const rawOppList = Array.isArray(oppRes?.data?.content)
        ? oppRes.data.content
        : Array.isArray(oppRes?.data)
        ? oppRes.data
        : [];
      if (rawOppList.length > 0) {
        const oppData = rawOppList.map((t) => normalizeTeam(t, false));
        setTeams((prev) => {
          const seen = new Set(prev.map((t) => t.id).filter(Boolean));
          const newOpp = oppData.filter((t) => t.id && !seen.has(t.id));
          const updated = [...prev, ...newOpp];
          cachedTeams = updated;
          return updated;
        });
        setOppPage(nextP);
        setHasMoreOpp(rawOppList.length >= 15);
      } else {
        setHasMoreOpp(false);
      }
    } catch (e) {
      console.warn("[SelectTeam] Failed to load more opponents:", e);
    } finally {
      setLoadingMoreOpp(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setOppPage(1);
    setHasMoreOpp(true);
    fetchTeams();
  };

  const handleTeamSelect = (team) => {
    const selectedId = team?._id || team?.id || team?.teamId;
    if (
      blockedTeamId &&
      selectedId &&
      String(blockedTeamId) === String(selectedId)
    ) {
      showGlobalAlert({
        title: "Invalid Selection",
        message: "Team A and Team B cannot be the same team. Please choose a different opponent.",
        type: "warning",
      });
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

  const [quickSearchQuery, setQuickSearchQuery] = useState("");

  // Filter teams based on active tab, blockedTeamId, and quickSearchQuery
  const getFilteredTeams = () => {
    let filtered = teams;
    if (activeTab === "myTeams") {
      filtered = filtered.filter((t) => t.isMyTeam);
    } else if (activeTab === "opponentTeams") {
      filtered = filtered.filter((t) => !t.isMyTeam);
    }

    if (blockedTeamId) {
      filtered = filtered.filter(
        (t) => String(t.id || t._id || t.teamId) !== String(blockedTeamId)
      );
    }

    if (quickSearchQuery.trim()) {
      const q = quickSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.name || t.title || "").toLowerCase().includes(q) ||
          (t.shortName || "").toLowerCase().includes(q) ||
          (t.location || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const getFilteredTournamentTeams = () => {
    let list = tournamentTeams;
    if (blockedTeamId) {
      list = list.filter(
        (t) => String(t.id || t._id || t.teamId) !== String(blockedTeamId)
      );
    }
    if (quickSearchQuery.trim()) {
      const q = quickSearchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.name || t.title || "").toLowerCase().includes(q) ||
          (t.shortName || "").toLowerCase().includes(q) ||
          (t.location || "").toLowerCase().includes(q)
      );
    }
    return list;
  };

  const getFilteredSearchResults = () => {
    let list = searchResults;
    if (blockedTeamId) {
      list = list.filter(
        (t) => String(t.id || t._id || t.teamId) !== String(blockedTeamId)
      );
    }
    return list;
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
    ...(tournamentId ? [{ value: "tournamentTeams", label: "Tournament" }] : []),
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
        <View className="flex-1">
          <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
            Select {teamType === "teamA" ? "Team A" : "Team B"}
          </ThemedText>
          {tournamentTitle ? (
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="trophy" size={13} color="#EAB308" />
              <ThemedText className="text-xs text-yellow-600 dark:text-yellow-400 font-medium ml-1" numberOfLines={1}>
                {tournamentTitle}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <View
        className={`flex-row ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } border-b border-gray-300 dark:border-gray-700`}
      >
        {tournamentId ? renderTabButton("tournamentTeams", "Tournament", "trophy") : null}
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
        {/* Tournament Teams Tab */}
        {activeTab === "tournamentTeams" && (
          <TeamList 
            teams={getFilteredTournamentTeams()} 
            onTeamSelect={handleTeamSelect}
            isDarkMode={isDarkMode}
            emptyMessage={tournamentTitle ? `No teams registered in ${tournamentTitle} yet.` : "No tournament teams found."}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onCreateTeam={handleCreateTeam}
            searchQuery={quickSearchQuery}
            onSearchChange={setQuickSearchQuery}
          />
        )}

        {/* My Teams Tab */}
        {activeTab === "myTeams" && (
          <TeamList 
            teams={getFilteredTeams()} 
            onTeamSelect={handleTeamSelect}
            isDarkMode={isDarkMode}
            emptyMessage="No teams available. Create one!"
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onCreateTeam={handleCreateTeam}
            searchQuery={quickSearchQuery}
            onSearchChange={setQuickSearchQuery}
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
            onCreateTeam={handleCreateTeam}
            searchQuery={quickSearchQuery}
            onSearchChange={setQuickSearchQuery}
            onEndReached={loadMoreOpponents}
            loadingMore={loadingMoreOpp}
          />
        )}

        {/* Create Team Tab */}
        {activeTab === "create" && (
          <CreateTeamTab onCreateTeam={handleCreateTeam} isDarkMode={isDarkMode} />
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <SearchTab 
            teams={getFilteredSearchResults()} 
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
const TeamList = ({
  teams,
  onTeamSelect,
  isDarkMode,
  emptyMessage,
  refreshing,
  onRefresh,
  onCreateTeam,
  searchQuery,
  onSearchChange,
  onEndReached,
  loadingMore,
}) => {
  return (
    <View className="flex-1 p-4">
      {/* Quick Search Bar */}
      <View
        className={`flex-row items-center px-3 py-2 rounded-xl mb-3 border ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } shadow-sm`}
      >
        <Ionicons
          name="search"
          size={18}
          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder="Quick search teams by name or location..."
          placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          value={searchQuery}
          onChangeText={onSearchChange}
          className={`flex-1 text-sm ${isDarkMode ? "text-white" : "text-gray-900"} py-1`}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={teams}
        keyExtractor={(item, idx) => item?.id ? String(item.id) : `team_${idx}`}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View className="py-3 items-center justify-center">
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )
        }
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
              source={item.image ? { uri: item.image } : null}
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
          <View className="items-center justify-center py-12 px-4">
            <View
              className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
                isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-blue-50 border border-blue-100"
              }`}
            >
              <Ionicons name="shield-outline" size={32} color={isDarkMode ? "#60A5FA" : "#2563EB"} />
            </View>
            <ThemedText className={`text-base font-bold text-center mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {searchQuery ? "No Matching Teams" : "No Teams Available"}
            </ThemedText>
            <ThemedText className="text-gray-500 dark:text-gray-400 text-xs text-center mb-5 max-w-xs">
              {searchQuery
                ? `No teams matched "${searchQuery}". Try a different name or search globally.`
                : emptyMessage || "Create a team now to start playing matches!"}
            </ThemedText>
            {onCreateTeam && !searchQuery ? (
              <TouchableOpacity
                onPress={onCreateTeam}
                activeOpacity={0.85}
                className="flex-row items-center bg-blue-600 px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/30"
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <ThemedText className="text-white text-sm font-bold">
                  Create New Team
                </ThemedText>
              </TouchableOpacity>
            ) : null}
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
        keyExtractor={(item, idx) => item?.id ? String(item.id) : `search_team_${idx}`}
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
              source={item.image ? { uri: item.image } : null}
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
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard from "@/components/ui/ScoreCard";
import SCREENS from "@/screens";
import AnimatedFooter from "./AnimatedFooter";
import { matchesApi, tournamentsApi, teamsApi, request } from "@/utils/api";
import { useSelector } from "react-redux";
import User from "@/utils/User";

export default function MyCricket() {
  const navigation = useNavigation();
  const authUser = useSelector((state) => state.auth?.user);
  const userId = User.id || authUser?._id || authUser?.id;

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState("matches");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [recentMatches, setRecentMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);

  const fetchData = async () => {
    try {
      // 1. Fetch user matches and platform matches (matching sports-arena Matches.jsx)
      const matchPromises = [];
      // Always fetch latest platform matches so newly created matches appear immediately
      matchPromises.push(
        request("api/matches/ids?page=1&items=50", { method: "GET", errorAlert: false }).catch(() => null)
      );
      matchPromises.push(
        matchesApi.getMatches({ self: 1, ...(userId ? { userId } : {}) }, { errorAlert: false }).catch(() => null)
      );
      if (userId) {
        matchPromises.push(
          matchesApi.getMatches({ playerId: userId }, { errorAlert: false }).catch(() => null)
        );
        matchPromises.push(
          request(`api/matches/ids?playerId=${userId}`, { method: "GET", errorAlert: false }).catch(() => null)
        );
      }

      const [matchesResList, tourRes, teamsRes] = await Promise.all([
        Promise.all(matchPromises),
        tournamentsApi.getMyTournaments({ errorAlert: false }).catch(() => null),
        teamsApi.getMyTeams({ errorAlert: false }).catch(() => null),
      ]);

      // Process matches
      const extractArray = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.content)) return res.content;
        if (Array.isArray(res?.data?.content)) return res.data.content;
        if (Array.isArray(res?.data?.matches)) return res.data.matches;
        if (Array.isArray(res?.data)) return res.data;
        return [];
      };

      const rawCombined = matchesResList.flatMap(extractArray);

      // Deduplicate by match ID
      const seenIds = new Set();
      const uniqueMatches = [];
      for (const m of rawCombined) {
        const id = String(m?._id || m?.id || m?.matchId || "");
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueMatches.push(m);
        }
      }

      setRecentMatches(
        uniqueMatches.map((m) => ({
          id: String(m._id || m.id || m.matchId),
          matchId: String(m._id || m.id || m.matchId),
          team1:
            m?.teams?.[0]?.title ||
            m?.teams?.[0]?.name ||
            m?.teams?.[0]?.teamName ||
            "Team 1",
          team2:
            m?.teams?.[1]?.title ||
            m?.teams?.[1]?.name ||
            m?.teams?.[1]?.teamName ||
            "Team 2",
          score: m.title || "Match",
          result: m.status || "Scheduled",
          status: m.status || "SCHEDULED",
          date: m.startDate
            ? new Date(m.startDate).toLocaleDateString()
            : "Recent",
          raw: m,
        }))
      );

      // Process tournaments
      const tourList = tourRes?.data?.content || tourRes?.data || [];
      if (Array.isArray(tourList)) {
        setTournaments(
          tourList.map((t) => ({
            id: String(t._id || t.id || t.slug),
            name: t.title || t.name || "Tournament",
            teams: Array.isArray(t.teams) ? t.teams.length : t.maxTeams || 0,
            matches: Array.isArray(t.matches) ? t.matches.length : 0,
            status: t.status || "Ongoing",
            prize: t.prizeMoney ? `₹${t.prizeMoney}` : null,
            raw: t,
          }))
        );
      }

      // Process teams
      const teamList = teamsRes?.data || [];
      if (Array.isArray(teamList)) {
        setTeams(
          teamList.map((tm) => {
            const raw = tm?.team?.[0] || tm;
            return {
              id: String(raw._id || raw.id),
              name: raw.title || raw.name || "Team",
              shortName:
                raw.shortName ||
                (raw.title ? raw.title.slice(0, 3).toUpperCase() : "TM"),
              players: Array.isArray(raw.players) ? raw.players.length : 0,
              matches: Array.isArray(raw.matches) ? raw.matches.length : 0,
              wins: raw.wins || 0,
              raw,
            };
          })
        );
      }
    } catch (error) {
      console.warn("[MyCricket] Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [userId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const TabButton = ({ title, tabName, icon }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tabName)}
      className={`flex-1 py-4 px-2 items-center rounded-lg mx-1 ${
        activeTab === tabName
          ? "bg-blue-600"
          : isDarkMode
            ? "bg-gray-800"
            : "bg-gray-200"
      }`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          activeTab === tabName ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"
        }
      />
      <ThemedText
        className={`text-xs mt-1 font-medium ${
          activeTab === tabName
            ? "text-white"
            : isDarkMode
              ? "text-gray-400"
              : "text-gray-600"
        }`}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderMatchesTab = () => (
    <FlatList
      data={recentMatches}
      keyExtractor={(item, index) => item?.id || String(index)}
      renderItem={({ item }) => (
        <View className="mb-4 w-full max-w-md self-center">
          <ScoreCard
            matchId={item.id}
            match={item.raw || item}
          />
        </View>
      )}
      ListHeaderComponent={
        <View className="flex-row justify-between items-center w-full max-w-md self-center mb-4 mt-2">
          <ThemedText
            className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            My Matches
          </ThemedText>
          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.CreateMatch)}
            className="flex-row items-center bg-blue-600 px-3.5 py-1.5 rounded-full shadow-sm"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <ThemedText className="text-white text-xs font-bold ml-1">Create Match</ThemedText>
          </TouchableOpacity>
        </View>
      }
      ListEmptyComponent={
        <View className="items-center py-8 w-full">
          <Ionicons
            name="trophy-outline"
            size={48}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <ThemedText
            className={`text-lg mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            No matches found
          </ThemedText>
          <ThemedText
            className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
          >
            Create your first match to get started
          </ThemedText>
          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.CreateMatch)}
            className="mt-4 flex-row items-center bg-blue-600 px-4 py-2 rounded-xl shadow-sm"
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <ThemedText className="text-white text-sm font-semibold ml-1.5">
              Create Match
            </ThemedText>
          </TouchableOpacity>
        </View>
      }
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ paddingBottom: 80 }}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
    />
  );

  const renderTournamentsTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ alignItems: "center", paddingBottom: 80 }}
    >
      {/* Header row with Create Tournament action */}
      <View className="flex-row justify-between items-center w-full max-w-md mb-4 mt-2">
        <ThemedText
          className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          Your Tournaments
        </ThemedText>
        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.CreateTournament)}
          className="flex-row items-center bg-blue-600 px-3.5 py-1.5 rounded-full shadow-sm"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <ThemedText className="text-white text-xs font-bold ml-1">Create Tournament</ThemedText>
        </TouchableOpacity>
      </View>

      {tournaments.map((tournament) => (
        <TouchableOpacity
          key={tournament.id}
          className={`p-4 rounded-xl mb-4 w-full max-w-md ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
          onPress={() =>
            navigation.navigate(SCREENS.TournamentProfile, {
              tournament: tournament.raw || tournament,
              tournamentID: tournament.id,
            })
          }
        >
          <View className="flex-row justify-between items-start mb-2">
            <ThemedText
              className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              {tournament.name}
            </ThemedText>
            <View
              className={`px-3 py-1 rounded-full ${
                tournament.status === "Ongoing"
                  ? "bg-green-100"
                  : tournament.status === "Completed"
                    ? "bg-gray-100"
                    : "bg-blue-100"
              }`}
            >
              <ThemedText
                className={`text-xs font-medium ${
                  tournament.status === "Ongoing"
                    ? "text-green-800"
                    : tournament.status === "Completed"
                      ? "text-gray-800"
                      : "text-blue-800"
                }`}
              >
                {tournament.status}
              </ThemedText>
            </View>
          </View>

          <View className="flex-row justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons
                name="people-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <ThemedText
                className={`text-sm ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                {tournament.teams} teams
              </ThemedText>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <ThemedText
                className={`text-sm ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                {tournament.matches} matches
              </ThemedText>
            </View>
          </View>

          {/* Prize Money - Only show if available */}
          {tournament.prize ? (
            <View className="flex-row justify-between items-center mb-2">
              <ThemedText
                className={`text-sm font-medium ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}
              >
                🏆 {tournament.prize}
              </ThemedText>
            </View>
          ) : (
            <View className="mb-2">
              <ThemedText
                className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
              >
                No prize money
              </ThemedText>
            </View>
          )}

          <View className="flex-row justify-between items-center">
            <ThemedText
              className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
            >
              Click to view details
            </ThemedText>
            <TouchableOpacity className="p-2">
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      {tournaments.length === 0 && (
        <View className="items-center py-8 w-full">
          <Ionicons
            name="trophy-outline"
            size={48}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <ThemedText
            className={`text-lg mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            No tournaments found
          </ThemedText>
          <ThemedText
            className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
          >
            Create your first tournament to get started
          </ThemedText>
          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.CreateTournament)}
            className="mt-4 flex-row items-center bg-blue-600 px-4 py-2 rounded-xl shadow-sm"
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <ThemedText className="text-white text-sm font-semibold ml-1.5">
              Create Tournament
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderTeamsTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ alignItems: "center", paddingBottom: 80 }}
    >
      {/* Header row with Create Team action */}
      <View className="flex-row justify-between items-center w-full max-w-md mb-4 mt-2">
        <ThemedText
          className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          Your Teams
        </ThemedText>
        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.CreateTeam)}
          className="flex-row items-center bg-blue-600 px-3.5 py-1.5 rounded-full shadow-sm"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <ThemedText className="text-white text-xs font-bold ml-1">Create Team</ThemedText>
        </TouchableOpacity>
      </View>

      {teams.map((team) => (
        <TouchableOpacity
          key={team.id}
          className={`p-4 rounded-xl mb-4 w-full max-w-md ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
          onPress={() =>
            navigation.navigate(SCREENS.TeamProfile, {
              team: team.raw || team,
              teamId: team.id,
            })
          }
        >
          <View className="flex-row justify-between items-start mb-3">
            <View>
              <ThemedText
                className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {team.name}
              </ThemedText>
              <ThemedText
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                ({team.shortName})
              </ThemedText>
            </View>
            <View className={`px-3 py-1 rounded-full bg-blue-100`}>
              <ThemedText className="text-xs font-medium text-blue-800">
                {team.wins} Wins
              </ThemedText>
            </View>
          </View>

          <View className="flex-row justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name="people-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <ThemedText
                className={`text-sm ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                {team.players} players
              </ThemedText>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <ThemedText
                className={`text-sm ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                {team.matches} matches
              </ThemedText>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {teams.length === 0 && (
        <View className="items-center py-8 w-full">
          <Ionicons
            name="people-outline"
            size={48}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <ThemedText
            className={`text-lg mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            No teams found
          </ThemedText>
          <ThemedText
            className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
          >
            Create your first team to get started
          </ThemedText>
          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.CreateTeam)}
            className="mt-4 flex-row items-center bg-blue-600 px-4 py-2 rounded-xl shadow-sm"
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <ThemedText className="text-white text-sm font-semibold ml-1.5">
              Create Team
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header with Back Button */}
      <View
        className={`px-4 py-4 border-b flex-row items-center ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <View className="flex-1">
          <ThemedText className="text-2xl font-bold text-gray-900 dark:text-white">
            My Cricket
          </ThemedText>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your cricket activities
          </ThemedText>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className={`px-4 py-3 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <View className="flex-row justify-between">
          <TabButton
            title="Matches"
            tabName="matches"
            icon="calendar-outline"
          />
          <TabButton
            title="Tournaments"
            tabName="tournaments"
            icon="trophy-outline"
          />
          <TabButton title="Teams" tabName="teams" icon="people-outline" />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563EB"]}
              tintColor={isDarkMode ? "#2563EB" : "#2563EB"}
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {activeTab === "matches" && renderMatchesTab()}
          {activeTab === "tournaments" && renderTournamentsTab()}
          {activeTab === "teams" && renderTeamsTab()}
        </ScrollView>
      </View>

      <AnimatedFooter currentTab="My Cricket" />
    </SafeAreaView>
  );
}

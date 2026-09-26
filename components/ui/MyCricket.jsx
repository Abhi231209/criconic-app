import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard from "@/components/ui/ScoreCard";
import SCREENS from "@/screens";
import AnimatedFooter from "./AnimatedFooter";
import { matchesApi, tournamentsApi, teamsApi, request } from "@/utils/api";
import { getImageFullUrl } from "@/utils";
import { useSelector } from "react-redux";
import User from "@/utils/User";

export default function MyCricket({ route: propRoute }) {
  const navigation = useNavigation();
  const route = propRoute || useRoute();
  const insets = useSafeAreaInsets();
  const authUser = useSelector((state) => state.auth?.user);
  const userId = User.id || authUser?._id || authUser?.id;
  const isAdmin = Boolean(
    authUser?.role === 1 ||
    authUser?.role === 2 ||
    User?.isAdmin?.() ||
    User?.user?.role === 1 ||
    User?.user?.role === 2
  );

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const resolveTab = (val) => {
    if (!val) return null;
    const lower = String(val).toLowerCase().trim();
    if (lower === "tournament" || lower === "tournaments") return "tournaments";
    if (lower === "team" || lower === "teams") return "teams";
    if (lower === "match" || lower === "matches") return "matches";
    return null;
  };

  const incomingTab = resolveTab(route?.params?.initialTab || route?.params?.tab);
  const [activeTab, setActiveTab] = useState(incomingTab || "matches");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(0);

  const [recentMatches, setRecentMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matchPage, setMatchPage] = useState(1);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "MATCH_DELETED",
      ({ matchId: delId }) => {
        if (!delId) return;
        const strDelId = String(delId);
        setRecentMatches((prev) =>
          prev.filter((m) => {
            const id = String(m?._id || m?.id || m?.matchId || m);
            return id !== strDelId;
          })
        );
      }
    );
    return () => sub.remove();
  }, []);

  const deriveTournamentStatus = (t) => {
    const rawStatus = String(t?.status || "").trim();
    if (!rawStatus) return "Ongoing";
    const lower = rawStatus.toLowerCase();
    if (lower === "cancelled" || lower === "abandoned") return "Cancelled";
    if (lower === "completed" || lower === "finished") return "Completed";
    if (lower === "upcoming") return "Upcoming";
    if (lower === "ongoing") return "Ongoing";
    return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  };

  const mapMatchItem = (m) => ({
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
  });

  const extractArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.content?.tournaments)) return res.content.tournaments;
    if (Array.isArray(res?.content?.teams)) return res.content.teams;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.data?.content?.tournaments)) return res.data.content.tournaments;
    if (Array.isArray(res?.data?.content?.teams)) return res.data.content.teams;
    if (Array.isArray(res?.data?.content)) return res.data.content;
    if (Array.isArray(res?.data?.teams)) return res.data.teams;
    if (Array.isArray(res?.data?.matches)) return res.data.matches;
    if (Array.isArray(res?.data?.tournaments)) return res.data.tournaments;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const fetchData = async (isManual = false) => {
    if (isManual || (!recentMatches.length && !tournaments.length && !teams.length)) {
      setLoading(true);
    }
    try {
      setMatchPage(1);
      setHasMoreMatches(true);

      // Scoped user matches: matches where user is creator/organizer (self=1) or participating player
      const matchPromises = [];
      if (userId) {
        matchPromises.push(
          matchesApi.getMatches({ self: 1, userId, page: 1, limit: 12 }, { errorAlert: false }).catch(() => null)
        );
        matchPromises.push(
          request(`api/matches/ids?playerId=${userId}&page=1&items=12`, { method: "GET", errorAlert: false }).catch(() => null)
        );
      } else {
        matchPromises.push(
          matchesApi.getMatches({ self: 1, page: 1, limit: 12 }, { errorAlert: false }).catch(() => null)
        );
      }

      // Scoped tournaments: tournaments organized by user or where user's team participates
      const tourPromises = [
        tournamentsApi.getMyTournaments({ errorAlert: false }).catch(() => null),
        ...(userId
          ? [request(`api/tournaments/withUser?userId=${userId}&limit=50`, { method: "GET", errorAlert: false }).catch(() => null)]
          : []),
      ];

      // Scoped teams: enriched with matches and wins directly from backend
      const teamEndpoint = userId
        ? `api/users/withTeam/${userId}?isAdmin=${isAdmin ? 1 : 0}`
        : `api/users/withTeam?isAdmin=${isAdmin ? 1 : 0}`;

      const [matchesResList, tourResList, teamRes] = await Promise.all([
        Promise.all(matchPromises),
        Promise.all(tourPromises),
        request(teamEndpoint, { method: "GET", errorAlert: false }).catch(() => null),
      ]);

      // Process user matches
      const rawMatchesCombined = matchesResList.flatMap(extractArray);
      const seenMatchIds = new Set();
      const uniqueMatches = [];
      for (const m of rawMatchesCombined) {
        const id = String(m?._id || m?.id || m?.matchId || "");
        if (id && !seenMatchIds.has(id)) {
          seenMatchIds.add(id);
          uniqueMatches.push(m);
        }
      }

      setRecentMatches(uniqueMatches.map(mapMatchItem));
      setHasMoreMatches(uniqueMatches.length >= 6);

      // Process user tournaments
      const rawTourList = tourResList.flatMap(extractArray);
      const seenTourIds = new Set();
      const uniqueTournaments = [];
      for (const item of rawTourList) {
        const t = item?.tournament || item;
        const id = String(t?._id || t?.id || t?.slug || "");
        if (id && !seenTourIds.has(id)) {
          seenTourIds.add(id);
          uniqueTournaments.push(t);
        }
      }

      setTournaments(
        uniqueTournaments.map((t) => {
          const rawEntryFee = t?.entryFee;
          const entryFee = (rawEntryFee !== undefined && rawEntryFee !== null && rawEntryFee !== "" && Number(rawEntryFee) !== 0 && rawEntryFee !== "0")
            ? (String(rawEntryFee).startsWith("₹") ? String(rawEntryFee) : `₹${rawEntryFee}`)
            : null;

          return {
            id: String(t._id || t.id || t.slug),
            name: t.title || t.name || "Tournament",
            teams: Array.isArray(t.teams) ? t.teams.length : t.maxTeams || 0,
            matches: Array.isArray(t.matches) ? t.matches.length : 0,
            status: deriveTournamentStatus(t),
            prize: t.prizeMoney ? (String(t.prizeMoney).startsWith("₹") ? String(t.prizeMoney) : `₹${t.prizeMoney}`) : null,
            entryFee,
            raw: t,
          };
        })
      );

      // Process user teams (read stats directly from backend without N+1 calls)
      const rawTeamList = extractArray(teamRes);
      const seenTeamIds = new Set();
      const uniqueTeams = [];
      for (const tm of rawTeamList) {
        const raw = tm?.team?.[0] || tm;
        const id = String(raw?._id || raw?.id || "");
        if (id && !seenTeamIds.has(id)) {
          seenTeamIds.add(id);
          const matches = Array.isArray(raw.matches)
            ? raw.matches.length
            : (raw.matches || raw.stat?.totalMatches || raw.stats?.matches || 0);
          const wins = raw.wins || raw.stat?.matchesWon || raw.stats?.won || 0;

          uniqueTeams.push({
            id,
            name: raw.title || raw.name || "Team",
            shortName:
              raw.shortName ||
              (raw.title ? raw.title.slice(0, 3).toUpperCase() : "TM"),
            logo: raw.teamLogo || raw.logo || null,
            location: raw.location || null,
            players: Array.isArray(raw.players) ? raw.players.length : 0,
            matches: Number(matches) || 0,
            wins: Number(wins) || 0,
            raw,
          });
        }
      }
      setTeams(uniqueTeams);
    } catch (error) {
      console.warn("[MyCricket] Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreMatches = async () => {
    if (loading || loadingMoreMatches || !hasMoreMatches || !userId) return;
    try {
      setLoadingMoreMatches(true);
      const nextPage = matchPage + 1;
      const resList = await Promise.all([
        matchesApi.getMatches({ self: 1, userId, page: nextPage, limit: 12 }, { errorAlert: false }).catch(() => null),
        request(`api/matches/ids?playerId=${userId}&page=${nextPage}&items=12`, { method: "GET", errorAlert: false }).catch(() => null),
      ]);
      const rawCombined = resList.flatMap(extractArray);
      if (rawCombined.length > 0) {
        setRecentMatches((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const newItems = rawCombined
            .filter((m) => {
              const id = String(m?._id || m?.id || m?.matchId || "");
              return id && !seen.has(id);
            })
            .map(mapMatchItem);
          return [...prev, ...newItems];
        });
        setMatchPage(nextPage);
        setHasMoreMatches(rawCombined.length >= 6);
      } else {
        setHasMoreMatches(false);
      }
    } catch (e) {
      console.warn("[MyCricket] Failed to load more matches:", e);
    } finally {
      setLoadingMoreMatches(false);
    }
  };

  useEffect(() => {
    const tab = resolveTab(route?.params?.initialTab || route?.params?.tab);
    if (tab) {
      setActiveTab(tab);
    }
  }, [route?.params?.initialTab, route?.params?.tab]);

  useEffect(() => {
    lastFetchRef.current = Date.now();
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const tab = resolveTab(route?.params?.initialTab || route?.params?.tab);
      if (tab) {
        setActiveTab(tab);
      }
      // Throttle tab focus fetch to 45s to avoid freezing UI or re-fetching repeatedly
      if (Date.now() - lastFetchRef.current > 45000) {
        lastFetchRef.current = Date.now();
        fetchData();
      }
    }, [userId, route?.params?.initialTab, route?.params?.tab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    lastFetchRef.current = Date.now();
    fetchData(true);
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
        loading ? (
          <View className="items-center py-16 w-full">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
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
        )
      }
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      onEndReached={loadMoreMatches}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMoreMatches ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563EB"]}
          tintColor="#2563EB"
        />
      }
    />
  );


  const renderTournamentsTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ alignItems: "center", paddingBottom: 120 + insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563EB"]}
          tintColor="#2563EB"
        />
      }
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
              className={`text-lg font-bold flex-1 mr-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
            >
              {tournament.name}
            </ThemedText>
            <View
              className={`px-3 py-1 rounded-full ${
                tournament.status === "Ongoing"
                  ? isDarkMode ? "bg-green-900/40" : "bg-green-100"
                  : tournament.status === "Completed"
                    ? isDarkMode ? "bg-gray-700" : "bg-gray-100"
                    : isDarkMode ? "bg-blue-900/40" : "bg-blue-100"
              }`}
            >
              <ThemedText
                className={`text-xs font-semibold ${
                  tournament.status === "Ongoing"
                    ? isDarkMode ? "text-green-400" : "text-green-800"
                    : tournament.status === "Completed"
                      ? isDarkMode ? "text-gray-300" : "text-gray-800"
                      : isDarkMode ? "text-blue-400" : "text-blue-800"
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

          {/* Prize Money & Entry Fee - Only show when available */}
          <View className="flex-row justify-between items-center mb-2">
            {tournament.prize ? (
              <ThemedText
                className={`text-sm font-medium ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}
              >
                🏆 {tournament.prize}
              </ThemedText>
            ) : (
              <ThemedText
                className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
              >
                No prize money
              </ThemedText>
            )}
            {tournament.entryFee ? (
              <View className={`px-2.5 py-0.5 rounded-full ${isDarkMode ? "bg-amber-900/40" : "bg-amber-100"}`}>
                <ThemedText className={`text-xs font-semibold ${isDarkMode ? "text-amber-400" : "text-amber-800"}`}>
                  Entry: {tournament.entryFee}
                </ThemedText>
              </View>
            ) : null}
          </View>

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

      {loading ? (
        <View className="items-center py-16 w-full">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : tournaments.length === 0 ? (
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
      ) : null}
    </ScrollView>
  );

  const renderTeamsTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ alignItems: "center", paddingBottom: 120 + insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563EB"]}
          tintColor="#2563EB"
        />
      }
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
          className={`p-4 rounded-2xl mb-3 w-full max-w-md ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate(SCREENS.TeamProfile, {
              team: team.raw || team,
              teamId: String(team.id || ""),
              canEdit: true,
            })
          }
        >
          <View className="flex-row items-center mb-3">
            {/* Team Logo / Avatar */}
            {team.logo ? (
              <Image
                source={{ uri: getImageFullUrl(team.logo) }}
                className="w-12 h-12 rounded-full mr-3 bg-gray-200"
                resizeMode="cover"
              />
            ) : (
              <View
                className={`w-12 h-12 rounded-full mr-3 items-center justify-center ${
                  isDarkMode ? "bg-blue-900" : "bg-blue-100"
                }`}
              >
                <ThemedText
                  className={`font-bold text-base ${
                    isDarkMode ? "text-blue-300" : "text-blue-700"
                  }`}
                >
                  {team.shortName || "TM"}
                </ThemedText>
              </View>
            )}

            <View className="flex-1 mr-2">
              <ThemedText
                numberOfLines={1}
                className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {team.name}
              </ThemedText>
              <View className="flex-row items-center mt-0.5">
                <ThemedText
                  className={`text-xs font-semibold mr-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  ({team.shortName})
                </ThemedText>
                {team.location ? (
                  <View className="flex-row items-center">
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                    <ThemedText
                      numberOfLines={1}
                      className={`text-xs ml-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {team.location}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>

            <View className={`px-3 py-1 rounded-full ${isDarkMode ? "bg-green-900/40" : "bg-green-100"}`}>
              <ThemedText className={`text-xs font-bold ${isDarkMode ? "text-green-400" : "text-green-800"}`}>
                {team.wins} {team.wins === 1 ? "Win" : "Wins"}
              </ThemedText>
            </View>
          </View>

          <View className="flex-row justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60">
            <View className="flex-row items-center">
              <Ionicons
                name="people-outline"
                size={15}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <ThemedText
                className={`text-xs ml-1.5 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                {team.players} players
              </ThemedText>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="calendar-outline"
                size={15}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <ThemedText
                className={`text-xs ml-1.5 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                {team.matches} {team.matches === 1 ? "match" : "matches"}
              </ThemedText>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {loading ? (
        <View className="items-center py-16 w-full">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : teams.length === 0 ? (
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
      ) : null}
    </ScrollView>
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
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
        {activeTab === "matches" && renderMatchesTab()}
        {activeTab === "tournaments" && renderTournamentsTab()}
        {activeTab === "teams" && renderTeamsTab()}
      </View>

      <AnimatedFooter currentTab="My Cricket" />
    </SafeAreaView>
  );
}

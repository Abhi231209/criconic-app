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
import { getImageFullUrl, formatIndianCurrencyWords } from "@/utils";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import User from "@/utils/User";
import { useSocket } from "@/contexts/SocketContext";
import { listPendingMatches, listScoredMatchIds } from "@/utils/offlineActionQueue";
import { slimMatch } from "@/utils/savedLists";

// A request that got an answer. A failed one (no connection, server error)
// comes back from `request` as an error response instead of throwing, and
// must not be read as "the user has nothing".
const isOk = (res) => Boolean(res && res.status >= 200 && res.status < 300);

const cacheKey = (userId) => `@criconic_my_cricket_${userId || "guest"}`;

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
  // The last load didn't get through; what's shown is the saved copy (if any).
  const [loadFailed, setLoadFailed] = useState(false);
  const lastFetchRef = useRef(0);
  const { isConnected } = useSocket();

  // Scoring recorded offline that hasn't been uploaded yet: [{ matchId, count }].
  const [pendingScoring, setPendingScoring] = useState([]);
  // Matches scored on this phone — their card offers scoring even when the
  // server can't be asked whether this user may score them.
  const [scoredHere, setScoredHere] = useState(() => new Set());

  const loadOfflineScoringState = useCallback(async () => {
    const [pending, scored] = await Promise.all([listPendingMatches(), listScoredMatchIds()]);
    setPendingScoring(pending);
    setScoredHere(new Set(scored.map(String)));
  }, []);

  const [recentMatches, setRecentMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matchPage, setMatchPage] = useState(1);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false);

  useEffect(() => {
    const subMatch = DeviceEventEmitter.addListener(
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

    const subTourn = DeviceEventEmitter.addListener("TOURNAMENT_UPDATED", () => {
      lastFetchRef.current = 0;
      fetchData(false);
    });

    const subTeam = DeviceEventEmitter.addListener("TEAM_UPDATED", ({ teamId: updatedId, team: updatedTeam, isDeleted } = {}) => {
      if (isDeleted && updatedId) {
        setTeams((prev) => prev.filter((t) => String(t.id) !== String(updatedId)));
      } else if (updatedId && updatedTeam) {
        setTeams((prev) =>
          prev.map((t) => {
            if (String(t.id) === String(updatedId)) {
              return {
                ...t,
                name: updatedTeam.title || updatedTeam.name || t.name,
                shortName: updatedTeam.shortName || t.shortName,
                logo: updatedTeam.teamLogo || updatedTeam.logo || t.logo,
                location: updatedTeam.location || t.location,
                raw: { ...(t.raw || {}), ...updatedTeam },
              };
            }
            return t;
          })
        );
      }
      lastFetchRef.current = 0;
      fetchData(false);
    });

    const subSynced = DeviceEventEmitter.addListener("OFFLINE_SCORES_SYNCED", () => {
      loadOfflineScoringState();
      lastFetchRef.current = 0;
      fetchData(false);
    });

    return () => {
      subMatch.remove();
      subTourn.remove();
      subTeam.remove();
      subSynced.remove();
    };
  }, [userId, isAdmin]);

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

  const mapMatchItem = (m) => {
    const rawId = m?._id || m?.id || m?.matchId || (typeof m === "string" ? m : "");
    const id = String(rawId);
    return {
      id,
      matchId: id,
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
      score: m?.title || "Match",
      result: m?.status || "Scheduled",
      status: m?.status || "SCHEDULED",
      date: m?.startDate
        ? new Date(m.startDate).toLocaleDateString()
        : "Recent",
      raw: typeof m === "object" && m !== null ? m : { _id: id, id },
    };
  };

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

      // A list is only replaced by what a request that got through returned;
      // if none did, what's on screen (or the saved copy) stays.
      const matchesLoaded = matchesResList.some(isOk);
      const tournamentsLoaded = tourResList.some(isOk);
      const teamsLoaded = isOk(teamRes);
      setLoadFailed(!(matchesLoaded && tournamentsLoaded && teamsLoaded));
      const saved = {};

      // Process user matches
      const rawMatchesCombined = matchesResList.filter(isOk).flatMap(extractArray);
      const seenMatchIds = new Set();
      const uniqueMatches = [];
      for (const m of rawMatchesCombined) {
        const id = String(m?._id || m?.id || m?.matchId || "");
        if (id && !seenMatchIds.has(id)) {
          seenMatchIds.add(id);
          uniqueMatches.push(m);
        }
      }

      if (matchesLoaded) {
        setRecentMatches(uniqueMatches.map(mapMatchItem));
        setHasMoreMatches(uniqueMatches.length >= 6);
        saved.matches = uniqueMatches.map(slimMatch);
      }

      // Process user tournaments
      const rawTourList = tourResList.filter(isOk).flatMap(extractArray);
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

      const tournamentList = uniqueTournaments.map((t) => {
          const rawEntryFee = t?.entryFee;
          const entryFee = (rawEntryFee !== undefined && rawEntryFee !== null && rawEntryFee !== "" && Number(rawEntryFee) !== 0 && rawEntryFee !== "0")
            ? formatIndianCurrencyWords(rawEntryFee)
            : null;

          return {
            id: String(t._id || t.id || t.slug),
            name: t.title || t.name || "Tournament",
            teams: Array.isArray(t.teams) ? t.teams.length : t.maxTeams || 0,
            matches: Array.isArray(t.matches) ? t.matches.length : 0,
            status: deriveTournamentStatus(t),
            prize: formatIndianCurrencyWords(t.prizeMoney),
            entryFee,
            raw: t,
          };
        });
      if (tournamentsLoaded) {
        setTournaments(tournamentList);
        saved.tournaments = tournamentList;
      }

      // Process user teams (read stats directly from backend without N+1 calls)
      const rawTeamList = teamsLoaded ? extractArray(teamRes) : [];
      const seenTeamIds = new Set();
      const uniqueTeams = [];
      for (const tm of rawTeamList) {
        const raw = tm?.team?.[0] || tm;
        const id = String(raw?._id || raw?.id || "");
        if (id && !seenTeamIds.has(id)) {
          seenTeamIds.add(id);
          const matches = Array.isArray(raw.matches)
            ? raw.matches.length
            : (raw.totalTeamMatches ?? raw.matches ?? raw.stat?.totalMatches ?? raw.stats?.matches ?? 0);
          const wins = raw.wins ?? raw.stat?.matchesWon ?? raw.stats?.won ?? 0;

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
      if (teamsLoaded) {
        setTeams(uniqueTeams);
        saved.teams = uniqueTeams;
      }

      // Keep a copy for the next time this screen opens without a connection.
      if (Object.keys(saved).length) {
        AsyncStorage.getItem(cacheKey(userId))
          .then((raw) =>
            AsyncStorage.setItem(
              cacheKey(userId),
              JSON.stringify({ ...(raw ? JSON.parse(raw) : {}), ...saved })
            )
          )
          .catch(() => {});
      }
    } catch (error) {
      console.warn("[MyCricket] Failed to fetch data:", error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadingMoreRef = useRef(false);

  const loadMoreMatches = async () => {
    if (loading || loadingMoreMatches || loadingMoreRef.current || !hasMoreMatches || !userId) return;
    loadingMoreRef.current = true;
    setLoadingMoreMatches(true);
    try {
      const nextPage = matchPage + 1;
      const resList = await Promise.all([
        matchesApi.getMatches({ self: 1, userId, page: nextPage, limit: 12 }, { errorAlert: false }).catch(() => null),
        request(`api/matches/ids?playerId=${userId}&page=${nextPage}&items=12`, { method: "GET", errorAlert: false }).catch(() => null),
      ]);
      if (!resList.some(isOk)) return; // not loaded: try this page again later
      const rawCombined = resList.filter(isOk).flatMap(extractArray);
      if (rawCombined.length > 0) {
        setRecentMatches((prev) => {
          const seen = new Set();
          const result = [];
          for (const item of prev) {
            const id = String(item?.id || item?.matchId || item?._id || "");
            if (id && !seen.has(id)) {
              seen.add(id);
              result.push(item);
            }
          }
          for (const m of rawCombined) {
            const mapped = mapMatchItem(m);
            const id = String(mapped.id || "");
            if (id && !seen.has(id)) {
              seen.add(id);
              result.push(mapped);
            }
          }
          return result;
        });
        setMatchPage(nextPage);
        setHasMoreMatches(rawCombined.length >= 6);
      } else {
        setHasMoreMatches(false);
      }
    } catch (e) {
      console.warn("[MyCricket] Failed to load more matches:", e);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreMatches(false);
    }
  };

  useEffect(() => {
    const tab = resolveTab(route?.params?.initialTab || route?.params?.tab);
    if (tab) {
      setActiveTab(tab);
    }
  }, [route?.params?.initialTab, route?.params?.tab]);

  // Opens with the saved copy of the lists (so they show without a
  // connection too), then loads the current ones. Runs again once the logged
  // in user is known, if it wasn't when the screen opened.
  useEffect(() => {
    let cancelled = false;
    // Marked before the saved copy is read, so the focus handler below
    // doesn't start a second load of its own.
    lastFetchRef.current = Date.now();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(cacheKey(userId));
        const saved = raw ? JSON.parse(raw) : null;
        if (saved && !cancelled) {
          if (Array.isArray(saved.matches)) {
            setRecentMatches((prev) => (prev.length ? prev : saved.matches.map(mapMatchItem)));
          }
          if (Array.isArray(saved.tournaments)) {
            setTournaments((prev) => (prev.length ? prev : saved.tournaments));
          }
          if (Array.isArray(saved.teams)) {
            setTeams((prev) => (prev.length ? prev : saved.teams));
          }
          setLoading(false);
        }
      } catch (e) {
        console.warn("[MyCricket] Failed to read saved lists:", e);
      }
      if (cancelled) return;
      lastFetchRef.current = Date.now();
      fetchData();
    })();
    loadOfflineScoringState();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // The connection is back after a load that didn't get through: load again.
  useEffect(() => {
    if (isConnected && loadFailed) {
      lastFetchRef.current = Date.now();
      fetchData(false);
    }
  }, [isConnected]);

  useFocusEffect(
    useCallback(() => {
      const tab = resolveTab(route?.params?.initialTab || route?.params?.tab);
      if (tab) {
        setActiveTab(tab);
      }
      loadOfflineScoringState();
      const hasRefreshParam = Boolean(route?.params?.refresh);
      // Throttle tab focus fetch to 15s unless refresh requested or never fetched
      if (hasRefreshParam || Date.now() - lastFetchRef.current > 15000) {
        lastFetchRef.current = Date.now();
        fetchData(false);
      }
    }, [userId, route?.params?.initialTab, route?.params?.tab, route?.params?.refresh, loadOfflineScoringState])
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

  // Shown on every tab when the last load didn't get through, instead of
  // letting an empty list read as "you have none".
  const renderLoadFailedNotice = () =>
    loadFailed && !loading ? (
      <View
        className={`flex-row items-center px-3 py-2.5 rounded-xl mt-2 border ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <Ionicons name="cloud-offline-outline" size={20} color={isDarkMode ? "#FBBF24" : "#D97706"} />
        <ThemedText
          className={`flex-1 text-xs ml-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
        >
          Couldn't load the latest from the server. Check your internet connection
          {recentMatches.length || tournaments.length || teams.length ? " — showing what was saved on this phone." : "."}
        </ThemedText>
        <TouchableOpacity
          onPress={onRefresh}
          className="bg-blue-600 px-3 py-1.5 rounded-full ml-2"
          activeOpacity={0.8}
        >
          <ThemedText className="text-white text-xs font-bold">Retry</ThemedText>
        </TouchableOpacity>
      </View>
    ) : null;

  const renderMatchesTab = () => (
    <FlatList
      data={recentMatches}
      keyExtractor={(item, index) =>
        item?.id ? `${item.id}-${index}` : String(index)
      }
      renderItem={({ item }) => (
        <View className="mb-2">
          <ScoreCard
            matchId={item.id}
            match={
              scoredHere.has(String(item.id))
                ? { ...(item.raw || item), accessToUpdate: true }
                : item.raw || item
            }
            fullWidth={true}
          />
        </View>
      )}
      ListHeaderComponent={
        <View>
          {renderLoadFailedNotice()}
          {pendingScoring.map(({ matchId, count }) => {
            const match = recentMatches.find((m) => String(m.id) === String(matchId));
            return (
              <TouchableOpacity
                key={matchId}
                onPress={() => navigation.navigate(SCREENS.ScorerScreen, { matchId })}
                className="flex-row items-center bg-amber-500 px-3 py-2.5 rounded-xl mt-2"
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-offline-outline" size={20} color="#000000" />
                <View className="flex-1 ml-2">
                  <ThemedText className="text-sm font-bold text-black" numberOfLines={1}>
                    {match ? `${match.team1} vs ${match.team2}` : "Match scored offline"}
                  </ThemedText>
                  <ThemedText className="text-xs text-black">
                    {count} scoring action{count === 1 ? "" : "s"} not uploaded yet — saved on this phone. Tap to continue scoring.
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#000000" />
              </TouchableOpacity>
            );
          })}
          <View className="flex-row justify-between items-center mb-3 mt-2">
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
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : loadFailed ? (
          // The notice above already says the load failed; "No matches
          // found" here would be wrong.
          null
        ) : (
          <View className="items-center py-8">
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
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 120 + insets.bottom,
      }}
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
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 120 + insets.bottom,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563EB"]}
          tintColor="#2563EB"
        />
      }
    >
      {renderLoadFailedNotice()}
      {/* Header row with Create Tournament action */}
      <View className="flex-row justify-between items-center mb-3 mt-2">
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

      {tournaments.map((tournament, idx) => (
        <TouchableOpacity
          key={tournament.id ? `${tournament.id}-${idx}` : idx}
          className={`p-4 rounded-xl mb-4 w-full ${
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
            {(() => {
              const tStatus = String(tournament.status || "Upcoming").trim();
              const lower = tStatus.toLowerCase();
              const isOngoing = lower === "ongoing" || lower === "live";
              const isDone = lower === "completed" || lower === "ended";
              const badgeBg = isOngoing
                ? (isDarkMode ? "bg-emerald-950/80 border-emerald-500/50" : "bg-emerald-50 border-emerald-300")
                : isDone
                ? (isDarkMode ? "bg-slate-700/60 border-slate-600" : "bg-slate-100 border-slate-300")
                : (isDarkMode ? "bg-blue-950/80 border-blue-500/50" : "bg-blue-50 border-blue-300");
              const badgeText = isOngoing
                ? (isDarkMode ? "text-emerald-400" : "text-emerald-800")
                : isDone
                ? (isDarkMode ? "text-slate-200" : "text-slate-700")
                : (isDarkMode ? "text-blue-400" : "text-blue-800");

              return (
                <View className={`px-2.5 py-1 rounded-full border flex-row items-center ${badgeBg}`}>
                  {isOngoing && <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />}
                  <ThemedText className={`text-xs font-semibold ${badgeText}`}>
                    {tStatus}
                  </ThemedText>
                </View>
              );
            })()}
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
      ) : tournaments.length === 0 && !loadFailed ? (
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
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 120 + insets.bottom,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563EB"]}
          tintColor="#2563EB"
        />
      }
    >
      {renderLoadFailedNotice()}
      {/* Header row with Create Team action */}
      <View className="flex-row justify-between items-center mb-3 mt-2">
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

      {teams.map((team, idx) => (
        <TouchableOpacity
          key={team.id ? `${team.id}-${idx}` : idx}
          className={`p-4 rounded-2xl mb-3 w-full ${
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
      ) : teams.length === 0 && !loadFailed ? (
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
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate(SCREENS.Home);
            }
          }}
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

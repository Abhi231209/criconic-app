import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard from "@/components/ui/ScoreCard";
import SwipeableTabs from "../custom/SwipeableTab";
import { useSelector } from "react-redux";
import SCREENS from "@/screens";
import { tournamentsApi, matchesApi, request } from "@/utils/api";
import { getImageFullUrl, MATCH_STATUS, getMatchStatusDisplay } from "@/utils";
import User from "@/utils/User";

export default function TournamentProfile() {
   const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState({
    batting: false,
    bowling: false
  });

  // HARDCODED TOURNAMENT DATA - COMMENTED OUT (API ONLY)
  /*
  // Sample tournament data
  const tournament = {
    id: "1",
    name: "IPL 2024",
    shortName: "IPL24",
    logo: null,
    startDate: "2024-03-22",
    endDate: "2024-05-26",
    location: "India",
    organizer: "BCCI",
    teams: 10,
    status: "ongoing",
    format: "Round Robin + Playoffs",
    prizeMoney: "₹20 Crores",
    ballType: "Leather",
  };

  // Sample data for different tabs
  const liveMatches = [
    {
      id: "1",
      team1: "MI",
      team2: "CSK",
      score: "MI 145/4 (15) vs CSK 132/6 (15)",
      result: "Live",
      date: "Live",
      isLive: true,
    },
    {
      id: "2",
      team1: "RCB",
      team2: "KKR",
      score: "RCB 89/3 (10) vs KKR 75/2 (10)",
      result: "Live",
      date: "Live",
      isLive: true,
    },
  ];

  const upcomingMatches = [
    {
      id: "3",
      team1: "MI",
      team2: "RCB",
      date: "Tomorrow, 7:30 PM",
      venue: "Wankhede Stadium",
    },
    {
      id: "4",
      team1: "CSK",
      team2: "KKR",
      date: "Apr 15, 3:30 PM",
      venue: "Chepauk Stadium",
    },
    {
      id: "5",
      team1: "DC",
      team2: "SRH",
      date: "Apr 16, 7:30 PM",
      venue: "Arun Jaitley Stadium",
    },
  ];

  const recentMatches = [
    {
      id: "6",
      team1: "MI",
      team2: "CSK",
      score: "MI 185/5 (20) vs CSK 176/8 (20)",
      result: "MI won by 9 runs",
      date: "2 hours ago",
    },
    {
      id: "7",
      team1: "RCB",
      team2: "KKR",
      score: "RCB 205/3 (20) vs KKR 208/4 (19.2)",
      result: "KKR won by 6 wickets",
      date: "1 day ago",
    },
  ];

  const teams = [
    {
      id: "1",
      name: "Mumbai Indians",
      shortName: "MI",
      matches: 14,
      wins: 9,
      losses: 5,
      points: 18,
      recentForm: ["W", "W", "L", "W", "W"],
      netRunRate: "+0.385",
    },
    {
      id: "2",
      name: "Chennai Super Kings",
      shortName: "CSK",
      matches: 14,
      wins: 8,
      losses: 6,
      points: 16,
      recentForm: ["W", "L", "W", "W", "L"],
      netRunRate: "+0.220",
    },
    {
      id: "3",
      name: "Royal Challengers Bangalore",
      shortName: "RCB",
      matches: 14,
      wins: 7,
      losses: 7,
      points: 14,
      recentForm: ["L", "W", "L", "W", "W"],
      netRunRate: "+0.150",
    },
  ];

  const battingLeaderboard = [
    {
      id: "1",
      name: "Virat Kohli",
      team: "RCB",
      runs: 639,
      average: 53.25,
      strikeRate: 148.12,
    },
    {
      id: "2",
      name: "Rohit Sharma",
      team: "MI",
      runs: 587,
      average: 48.91,
      strikeRate: 152.33,
    },
    {
      id: "3",
      name: "KL Rahul",
      team: "LSG",
      runs: 545,
      average: 45.41,
      strikeRate: 144.56,
    },
    {
      id: "4",
      name: "Shubman Gill",
      team: "GT",
      runs: 523,
      average: 47.54,
      strikeRate: 139.25,
    },
    {
      id: "5",
      name: "Suryakumar Yadav",
      team: "MI",
      runs: 498,
      average: 41.50,
      strikeRate: 155.23,
    },
  ];

  const bowlingLeaderboard = [
    {
      id: "1",
      name: "Jasprit Bumrah",
      team: "MI",
      wickets: 22,
      economy: 7.2,
      average: 18.3,
    },
    {
      id: "2",
      name: "Yuzvendra Chahal",
      team: "RR",
      wickets: 20,
      economy: 8.1,
      average: 19.8,
    },
    {
      id: "3",
      name: "Kagiso Rabada",
      team: "PBKS",
      wickets: 18,
      economy: 8.4,
      average: 21.2,
    },
    {
      id: "4",
      name: "Jofra Archer",
      team: "MI",
      wickets: 16,
      economy: 8.0,
      average: 22.5,
    },
    {
      id: "5",
      name: "Rashid Khan",
      team: "GT",
      wickets: 15,
      economy: 7.5,
      average: 20.1,
    },
  ];
  */

  // LIVE API STATE
  const passedTournament = route.params?.tournament || null;
  const tournamentId =
    route.params?.tournamentId ||
    route.params?.tournamentID ||
    route.params?.id ||
    route.params?.slug ||
    passedTournament?._id ||
    passedTournament?.id ||
    passedTournament?.slug ||
    passedTournament?.raw?._id;

  const [tournamentData, setTournamentData] = useState(
    passedTournament?.raw || passedTournament
  );
  const [matchesList, setMatchesList] = useState([]);
  const [teamsList, setTeamsList] = useState(
    passedTournament?.teams || passedTournament?.raw?.teams || []
  );
  const [pointsTable, setPointsTable] = useState([]);
  const [battingLeaderboard, setBattingLeaderboard] = useState([]);
  const [bowlingLeaderboard, setBowlingLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(!passedTournament);

  useEffect(() => {
    if (!tournamentId) return;
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const [tournRes, matchesRes, pointsRes, batLeadRes, bowlLeadRes] =
          await Promise.allSettled([
            tournamentsApi.getTournamentById(tournamentId),
            tournamentsApi.getMatchesByTournament(tournamentId),
            tournamentsApi.getPointsTable(tournamentId),
            request(`api/tournaments/leaderboard/${tournamentId}?type=batting`).catch(() => null),
            request(`api/tournaments/leaderboard/${tournamentId}?type=fielding`).catch(() => null),
          ]);

        if (!isMounted) return;

        let tData = null;
        if (tournRes.status === "fulfilled" && tournRes.value) {
          tData =
            tournRes.value?.data?.content ||
            tournRes.value?.data?.tournament ||
            tournRes.value?.data;
          if (tData?.content) tData = tData.content;
          if (tData) {
            setTournamentData(tData);
            if (Array.isArray(tData.teams)) {
              setTeamsList(tData.teams);
            }
          }
        }

        const extractMatches = (res) => {
          if (!res) return [];
          const list =
            res?.data?.content ||
            res?.data?.matches ||
            res?.data?.data ||
            res?.data;
          if (Array.isArray(list)) return list;
          if (Array.isArray(res?.content)) return res.content;
          if (Array.isArray(res?.matches)) return res.matches;
          return [];
        };

        let loadedMatches = [];
        if (matchesRes.status === "fulfilled" && matchesRes.value) {
          loadedMatches = extractMatches(matchesRes.value);
        }

        // Secondary fetch: If loadedMatches is empty and we have a MongoDB _id from tData
        const actualTournamentId = tData?._id || tData?.id;
        if (
          loadedMatches.length === 0 &&
          actualTournamentId &&
          String(actualTournamentId) !== String(tournamentId)
        ) {
          try {
            const secondaryMatchesRes = await tournamentsApi.getMatchesByTournament(
              actualTournamentId
            );
            const secondaryList = extractMatches(secondaryMatchesRes);
            if (secondaryList.length > 0) {
              loadedMatches = secondaryList;
            }
          } catch (e) {
            console.warn("[TournamentProfile] Secondary matches fetch failed:", e);
          }
        }

        // Third fallback: Query matchesApi with tournamentID
        if (loadedMatches.length === 0 && (actualTournamentId || tournamentId)) {
          const idToUse = actualTournamentId || tournamentId;
          try {
            const fallbackRes = await matchesApi.getMatches({ tournamentID: idToUse });
            const fbList = extractMatches(fallbackRes);
            if (fbList.length > 0) {
              loadedMatches = fbList;
            }
          } catch (e) {
            // ignore
          }
        }

        // Fourth fallback: Check tData.matches directly
        if (
          loadedMatches.length === 0 &&
          Array.isArray(tData?.matches) &&
          tData.matches.length > 0
        ) {
          loadedMatches = tData.matches;
        }

        setMatchesList(loadedMatches);

        if (pointsRes.status === "fulfilled" && pointsRes.value) {
          let ptData =
            pointsRes.value?.data?.pointsTable ||
            pointsRes.value?.data?.content ||
            pointsRes.value?.data;
          if (ptData?.pointsTable) ptData = ptData.pointsTable;
          setPointsTable(Array.isArray(ptData) ? ptData : []);
        }

        if (batLeadRes.status === "fulfilled" && batLeadRes.value) {
          const batStats =
            batLeadRes.value?.data?.stats ||
            batLeadRes.value?.stats ||
            batLeadRes.value?.data;
          if (Array.isArray(batStats)) {
            setBattingLeaderboard(batStats);
          }
        }

        if (bowlLeadRes.status === "fulfilled" && bowlLeadRes.value) {
          const bowlStats =
            bowlLeadRes.value?.data?.stats ||
            bowlLeadRes.value?.stats ||
            bowlLeadRes.value?.data;
          if (Array.isArray(bowlStats)) {
            setBowlingLeaderboard(bowlStats);
          }
        }
      } catch (err) {
        console.warn("[TournamentProfile] Error loading tournament details:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  const formatDate = (dateVal) => {
    if (!dateVal) return null;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(dateVal);
    }
  };

  const rawStart = tournamentData?.date?.start || tournamentData?.startDate;
  const rawEnd = tournamentData?.date?.end || tournamentData?.endDate;
  const formattedStart = formatDate(rawStart);
  const formattedEnd = formatDate(rawEnd);
  const dateRangeDisplay =
    formattedStart && formattedEnd
      ? formattedStart === formattedEnd
        ? formattedStart
        : `${formattedStart} - ${formattedEnd}`
      : formattedStart || formattedEnd || "TBD";

  const locPart = tournamentData?.location || "";
  const cityPart = tournamentData?.city || "";
  const locationDisplay =
    locPart && cityPart && locPart !== cityPart
      ? `${locPart}, ${cityPart}`
      : locPart || cityPart || "Not specified";

  let organizerDisplay = "Organizer";
  let organizerContact = null;
  if (Array.isArray(tournamentData?.organizer) && tournamentData.organizer.length > 0) {
    const org0 = tournamentData.organizer[0];
    organizerDisplay =
      typeof org0 === "object"
        ? org0?.username || org0?.name || "Organizer"
        : String(org0);
    organizerContact = org0?.mobile || null;
  } else if (typeof tournamentData?.organizer === "string") {
    organizerDisplay = tournamentData.organizer;
  } else if (tournamentData?.organizer?.username) {
    organizerDisplay = tournamentData.organizer.username;
    organizerContact = tournamentData.organizer.mobile || null;
  } else if (tournamentData?.organizerName) {
    organizerDisplay = tournamentData.organizerName;
  }

  // Derived tournament object
  const tournament = {
    id: tournamentData?._id || tournamentData?.id || tournamentId || "",
    name: tournamentData?.title || tournamentData?.name || "Tournament",
    shortName:
      tournamentData?.slug ||
      tournamentData?.shortName ||
      (tournamentData?.title
        ? tournamentData.title.substring(0, 4).toUpperCase()
        : "TMT"),
    logo:
      tournamentData?.logoImage ||
      tournamentData?.bannerImage ||
      tournamentData?.logo ||
      null,
    banner: tournamentData?.bannerImage || null,
    startDate: formattedStart || "TBD",
    endDate: formattedEnd || "TBD",
    dateRange: dateRangeDisplay,
    location: locationDisplay,
    organizer: organizerDisplay,
    organizerContact,
    teams:
      (Array.isArray(tournamentData?.teams) ? tournamentData.teams.length : null) ||
      teamsList.length ||
      0,
    status: tournamentData?.status || "upcoming",
    format: tournamentData?.format || tournamentData?.category || "Standard",
    prizeMoney: tournamentData?.prizeMoney || "Not Specified",
    ballType: tournamentData?.ballType
      ? String(tournamentData.ballType).toUpperCase()
      : "Standard",
  };

  const isMatchLive = (m) => {
    const s = String(m?.status || "").toUpperCase();
    const display = getMatchStatusDisplay(m?.status);
    return (
      Boolean(m?.isLive) ||
      display === "Live" ||
      s === "LIVE" ||
      s === "IN_PROGRESS" ||
      s === "1" ||
      m?.status === 1 ||
      s === MATCH_STATUS.MATCH_IN_PROGRESS ||
      s === MATCH_STATUS.MATCH_STARTED ||
      s === MATCH_STATUS.INNINGS_I ||
      s === MATCH_STATUS.INNINGS_II ||
      s === MATCH_STATUS.MATCH_RESUMED ||
      s === MATCH_STATUS.TOSS
    );
  };

  const isMatchCompleted = (m) => {
    const s = String(m?.status || "").toUpperCase();
    const display = getMatchStatusDisplay(m?.status);
    return (
      Boolean(m?.isCompleted) ||
      display === "End" ||
      s === "COMPLETED" ||
      s === "FINISHED" ||
      s === "END" ||
      s === "2" ||
      m?.status === 2 ||
      s === MATCH_STATUS.MATCH_COMPLETED ||
      s === MATCH_STATUS.MATCH_ENDED ||
      s === MATCH_STATUS.MATCH_TIE ||
      s === MATCH_STATUS.MATCH_CANCELLED ||
      s === MATCH_STATUS.MATCH_SUSPENDED
    );
  };

  const isMatchUpcoming = (m) => {
    const s = String(m?.status || "").toUpperCase();
    const display = getMatchStatusDisplay(m?.status);
    return (
      display === "Upcoming" ||
      s === "UPCOMING" ||
      s === "SCHEDULED" ||
      s === "PENDING" ||
      s === "0" ||
      m?.status === 0 ||
      s === MATCH_STATUS.MATCH_SCHEDULED ||
      s === MATCH_STATUS.MATCH_CREATED ||
      s === MATCH_STATUS.MATCH_DETAILS_ENTERED ||
      s === MATCH_STATUS.MATCH_OPENER_SELECTED
    );
  };

  const liveMatches = matchesList.filter(isMatchLive);
  const recentMatches = matchesList.filter(
    (m) => isMatchCompleted(m) && !isMatchLive(m)
  );
  const upcomingMatches = matchesList.filter(
    (m) => isMatchUpcoming(m) && !isMatchLive(m) && !isMatchCompleted(m)
  );
  const otherMatches = matchesList.filter(
    (m) => !isMatchLive(m) && !isMatchCompleted(m) && !isMatchUpcoming(m)
  );

  const authUser = useSelector((state) => state.auth?.user);
  const currentUserId = String(
    authUser?._id || authUser?.id || User.id || User.user?._id || User.user?.id || ""
  );
  const isAdmin = Boolean(
    User.isAdmin() || authUser?.role === 1 || authUser?.role === 2
  );

  const isOrganizer = Array.isArray(tournamentData?.organizer)
    ? tournamentData.organizer.some((o) => {
        const oId = String(o?._id || o?.id || o || "");
        return Boolean(oId && oId === currentUserId);
      })
    : typeof tournamentData?.organizer === "object"
    ? Boolean(String(tournamentData.organizer?._id || tournamentData.organizer?.id || "") === currentUserId)
    : Boolean(String(tournamentData?.organizer || "") === currentUserId);

  const isCreator = Boolean(
    (tournamentData?.createdBy && String(tournamentData.createdBy?._id || tournamentData.createdBy) === currentUserId) ||
    (tournamentData?.userId && String(tournamentData.userId?._id || tournamentData.userId) === currentUserId) ||
    (tournamentData?.user && String(tournamentData.user?._id || tournamentData.user) === currentUserId)
  );

  const canCreateMatch = Boolean(currentUserId) && (isAdmin || isOrganizer || isCreator);

  const handleCreateTournamentMatch = () => {
    navigation.navigate(SCREENS.CreateMatch, {
      tournamentId: tournament.id,
      tournamentID: tournament.id,
      tournament: tournamentData || tournament,
      returnScreen: SCREENS.TournamentProfile,
    });
  };

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: "information-circle-outline",
    },
    { value: "matches", label: "Matches", icon: "calendar-outline" },
    { value: "teams", label: "Teams", icon: "people-outline" },
    { value: "standings", label: "Standings", icon: "trophy-outline" },
    { value: "leaderboard", label: "Leaderboard", icon: "stats-chart-outline" },
  ];

  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const TabButton = ({ title, tabName, icon }) => (
    <TouchableOpacity
      onPress={() => switchTab(tabName)}
      className={`flex-1 py-3 px-2 items-center rounded-lg mx-1 ${
        activeTab === tabName
          ? "bg-blue-600"
          : isDarkMode
          ? "bg-gray-800"
          : "bg-gray-200"
      }`}
    >
      <Ionicons
        name={icon}
        size={18}
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

  const renderLeaderboardItem = (item, index, type) => {
    const playerName =
      item.playerName ||
      item.name ||
      item.player?.username ||
      item.playerId?.username ||
      "Player";
    const teamName =
      item.teamName ||
      item.team ||
      item.teamId?.shortName ||
      item.teamId?.title ||
      "";
    const primaryStat =
      type === "batting"
        ? `${item.runs ?? item.totalRuns ?? 0} runs`
        : `${item.wickets ?? item.totalWickets ?? 0} wkts`;
    const secondaryStat =
      type === "batting"
        ? `Avg: ${item.battingAverage ?? item.average ?? item.avg ?? "0.00"} • SR: ${item.strikeRate ?? item.sr ?? "0.00"}`
        : `Eco: ${item.economyRate ? parseFloat(item.economyRate).toFixed(2) : (item.economy ?? item.econ ?? "0.00")} • Inn: ${item.matchesPlayed ?? item.innings ?? 0}`;

    return (
      <View
        key={item.id || item._id || `${type}_${index}`}
        className={`p-3 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1 mr-2">
            <ThemedText
              className={`text-lg font-bold mr-3 ${
                index < 3
                  ? "text-yellow-600"
                  : isDarkMode
                  ? "text-gray-400"
                  : "text-gray-600"
              }`}
            >
              #{index + 1}
            </ThemedText>
            {item.profileImg ? (
              <Image
                source={{ uri: getImageFullUrl(item.profileImg) }}
                className="w-10 h-10 rounded-full mr-3 bg-gray-200 dark:bg-gray-700"
                resizeMode="cover"
              />
            ) : null}
            <View className="flex-1">
              <ThemedText
                numberOfLines={1}
                className={`font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {playerName}
              </ThemedText>
              {teamName ? (
                <ThemedText
                  numberOfLines={1}
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {teamName}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <View className="items-end">
            <ThemedText
              className={`text-sm font-semibold ${
                type === "batting"
                  ? isDarkMode
                    ? "text-green-400"
                    : "text-green-600"
                  : isDarkMode
                  ? "text-blue-400"
                  : "text-blue-600"
              }`}
            >
              {primaryStat}
            </ThemedText>
            <ThemedText
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {secondaryStat}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderOverview = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
      nestedScrollEnabled={true}
    >
      {/* Tournament Info Card */}
      <View
        className={`p-5 rounded-xl mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm`}
      >
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3 dark:bg-blue-900/40">
            <Ionicons name="trophy-outline" size={20} color="#3B82F6" />
          </View>
          <ThemedText
            className={`text-xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Tournament Information
          </ThemedText>
        </View>

        <View className="space-y-4">
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Ionicons 
                name="calendar-outline" 
                size={16} 
                color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                style={{marginRight: 8}}
              />
              <ThemedText
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Dates
              </ThemedText>
            </View>
            <ThemedText
              className={`font-medium ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {tournament.dateRange}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Ionicons 
                name="location-outline" 
                size={16} 
                color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                style={{marginRight: 8}}
              />
              <ThemedText
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Ground / Location
              </ThemedText>
            </View>
            <ThemedText
              className={`font-medium max-w-[60%] text-right ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {tournament.location}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Ionicons 
                name="business-outline" 
                size={16} 
                color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                style={{marginRight: 8}}
              />
              <ThemedText
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Organizer
              </ThemedText>
            </View>
            <ThemedText
              className={`font-medium ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {tournament.organizer}
            </ThemedText>
          </View>

          {tournament.organizerContact ? (
            <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center">
                <Ionicons 
                  name="call-outline" 
                  size={16} 
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                  style={{marginRight: 8}}
                />
                <ThemedText
                  className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Contact
                </ThemedText>
              </View>
              <ThemedText
                className={`font-medium ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {tournament.organizerContact}
              </ThemedText>
            </View>
          ) : null}

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Ionicons 
                name="grid-outline" 
                size={16} 
                color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                style={{marginRight: 8}}
              />
              <ThemedText
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Format / Category
              </ThemedText>
            </View>
            <ThemedText
              className={`font-medium ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {tournament.format}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Ionicons 
                name="baseball-outline" 
                size={16} 
                color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                style={{marginRight: 8}}
              />
              <ThemedText
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Ball Type
              </ThemedText>
            </View>
            <ThemedText
              className={`font-medium ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {tournament.ballType}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <View className="flex-row items-center">
              <Ionicons 
                name="people-outline" 
                size={16} 
                color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                style={{marginRight: 8}}
              />
              <ThemedText
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Total Teams
              </ThemedText>
            </View>
            <ThemedText
              className={`font-medium ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {tournament.teams}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Prize Information */}
      <View
        className={`p-5 rounded-xl mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm`}
      >
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3 dark:bg-amber-900/40">
            <Ionicons name="gift-outline" size={20} color="#F59E0B" />
          </View>
          <ThemedText
            className={`text-xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Prize Information
          </ThemedText>
        </View>

        <View className="space-y-4">
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Ionicons 
                name="cash-outline" 
                size={16} 
                color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                style={{marginRight: 8}}
              />
              <ThemedText
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Prize Money
              </ThemedText>
            </View>
            <ThemedText
              className={`font-bold ${
                isDarkMode ? "text-yellow-400" : "text-yellow-600"
              }`}
            >
              {tournament.prizeMoney}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <View className="flex-row items-center">
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                style={{marginRight: 8}}
              />
              <ThemedText
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Status
              </ThemedText>
            </View>
            <View
              className={`px-3 py-1 rounded-full ${
                tournament.status === "ongoing"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : tournament.status === "completed"
                  ? "bg-gray-100 dark:bg-gray-700"
                  : "bg-blue-100 dark:bg-blue-900/30"
              }`}
            >
              <ThemedText
                className={`text-xs font-medium ${
                  tournament.status === "ongoing"
                    ? "text-green-800 dark:text-green-400"
                    : tournament.status === "completed"
                    ? "text-gray-800 dark:text-gray-400"
                    : "text-blue-800 dark:text-blue-400"
                }`}
              >
                {tournament.status.charAt(0).toUpperCase() +
                  tournament.status.slice(1)}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Leaderboard Section */}
      <View className="mb-4">
        <View className="flex-row items-center mb-3">
          <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-2 dark:bg-purple-900/30">
            <Ionicons name="stats-chart-outline" size={16} color="#8B5CF6" />
          </View>
          <ThemedText
            className={`text-xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Top Performers
          </ThemedText>
        </View>

        {/* Batting Leaderboard Dropdown */}
        <View
          className={`rounded-xl mb-4 overflow-hidden ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <TouchableOpacity
            onPress={() => toggleSection("batting")}
            className="flex-row justify-between items-center p-4"
          >
            <View className="flex-row items-center">
              <ThemedText className="text-lg mr-2">🏏</ThemedText>
              <ThemedText
                className={`text-lg font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Batting Leaders
              </ThemedText>
            </View>
            <Ionicons
              name={expandedSections.batting ? "chevron-up" : "chevron-down"}
              size={24}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>

          {expandedSections.batting && (
            <View>
              {battingLeaderboard.length > 0 ? (
                battingLeaderboard.map((item, index) => 
                  renderLeaderboardItem(item, index, "batting")
                )
              ) : (
                <View className="p-4 items-center">
                  <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    No batting stats recorded yet
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Bowling Leaderboard Dropdown */}
        <View
          className={`rounded-xl mb-4 overflow-hidden ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <TouchableOpacity
            onPress={() => toggleSection("bowling")}
            className="flex-row justify-between items-center p-4"
          >
            <View className="flex-row items-center">
              <ThemedText className="text-lg mr-2">🎯</ThemedText>
              <ThemedText
                className={`text-lg font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Bowling Leaders
              </ThemedText>
            </View>
            <Ionicons
              name={expandedSections.bowling ? "chevron-up" : "chevron-down"}
              size={24}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>

          {expandedSections.bowling && (
            <View>
              {bowlingLeaderboard.length > 0 ? (
                bowlingLeaderboard.map((item, index) => 
                  renderLeaderboardItem(item, index, "bowling")
                )
              ) : (
                <View className="p-4 items-center">
                  <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    No bowling stats recorded yet
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderMatches = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, alignItems: "center" }}
    >
      {/* Create Match Banner for Authorized Organizers / Admins */}
      {canCreateMatch && (
        <TouchableOpacity
          onPress={handleCreateTournamentMatch}
          className="w-full max-w-md bg-blue-600 py-3.5 px-4 rounded-xl flex-row items-center justify-center mb-4 shadow-sm"
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          <ThemedText className="text-white font-bold ml-2 text-base">
            Create Tournament Match
          </ThemedText>
        </TouchableOpacity>
      )}

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <>
          <ThemedText
            className={`text-lg font-bold mb-4 w-full max-w-md ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            🔴 Live Matches
          </ThemedText>

          {liveMatches.map((match) => (
            <View key={match._id || match.id} className="mb-4 w-full max-w-md">
              <ScoreCard
                match={match}
                matchId={match._id || match.id}
                fullWidth
              />
            </View>
          ))}
        </>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <>
          <ThemedText
            className={`text-lg font-bold mb-4 mt-2 w-full max-w-md ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            ⏰ Upcoming Matches
          </ThemedText>

          {upcomingMatches.map((match) => (
            <View key={match._id || match.id} className="mb-4 w-full max-w-md">
              <ScoreCard
                match={match}
                matchId={match._id || match.id}
                fullWidth
              />
            </View>
          ))}
        </>
      )}

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <>
          <ThemedText
            className={`text-lg font-bold mb-4 mt-4 w-full max-w-md ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            📊 Recent Matches
          </ThemedText>

          {recentMatches.map((match) => (
            <View key={match._id || match.id} className="mb-4 w-full max-w-md">
              <ScoreCard
                match={match}
                matchId={match._id || match.id}
                fullWidth
              />
            </View>
          ))}
        </>
      )}

      {/* Other Matches */}
      {otherMatches.length > 0 && (
        <>
          <ThemedText
            className={`text-lg font-bold mb-4 mt-4 w-full max-w-md ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            🏏 Other Matches
          </ThemedText>

          {otherMatches.map((match) => (
            <View key={match._id || match.id} className="mb-4 w-full max-w-md">
              <ScoreCard
                match={match}
                matchId={match._id || match.id}
                fullWidth
              />
            </View>
          ))}
        </>
      )}

      {matchesList.length === 0 && (
        <View className="py-12 items-center justify-center">
          <Ionicons name="baseball-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText className={`text-center mt-3 font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No matches scheduled or played yet
          </ThemedText>
          {canCreateMatch && (
            <TouchableOpacity
              onPress={handleCreateTournamentMatch}
              className="mt-4 bg-blue-600 px-5 py-2.5 rounded-full flex-row items-center shadow-sm"
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <ThemedText className="text-white font-semibold ml-1">
                Create First Match
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderTeams = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
    >
      {teamsList.length > 0 ? (
        <FlatList
          data={teamsList}
          keyExtractor={(item, index) => item.teamId?._id || item._id || item.id || String(index)}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const teamTitle = item.teamId?.title || item.title || item.name || "Team";
            const teamShort = item.teamId?.shortName || item.shortName || (typeof teamTitle === 'string' ? teamTitle.substring(0, 3).toUpperCase() : "TM");
            const teamLogo = item.teamId?.teamLogo || item.teamLogo || item.logo || null;
            const teamLoc = item.location || item.teamId?.location || "";

            return (
              <TouchableOpacity
                onPress={() => {
                  const targetTeamId = item.teamId?._id || item._id || item.id;
                  if (targetTeamId) {
                    navigation.navigate(SCREENS.TeamProfile, { teamId: targetTeamId, team: item });
                  }
                }}
                className={`p-4 rounded-lg mb-3 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } shadow-sm`}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center flex-1 mr-2">
                    {teamLogo ? (
                      <Image
                        source={{ uri: getImageFullUrl(teamLogo) }}
                        className="w-11 h-11 rounded-full mr-3 bg-gray-200 dark:bg-gray-700"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                        <ThemedText className="font-bold text-blue-600 dark:text-blue-400">
                          {teamShort.substring(0, 3)}
                        </ThemedText>
                      </View>
                    )}
                    <View className="flex-1">
                      <ThemedText
                        numberOfLines={1}
                        className={`font-semibold text-base ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {teamTitle}
                      </ThemedText>
                      <ThemedText
                        numberOfLines={1}
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {teamShort}{teamLoc ? ` • ${teamLoc}` : ""}
                      </ThemedText>
                    </View>
                  </View>

                  <View className="items-end">
                    <ThemedText
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {item.matches ?? item.totalMatches ?? 0} matches
                    </ThemedText>
                    <ThemedText
                      className={`text-xs ${
                        isDarkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      {item.wins ?? item.totalWins ?? 0} wins • {item.losses ?? item.totalLosses ?? 0} losses
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View className="py-12 items-center justify-center">
          <Ionicons name="people-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText className={`text-center mt-3 font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No teams registered in this tournament yet
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );

  const renderStandings = () => {
    const standingsData = pointsTable.length > 0 ? pointsTable : teamsList;
    return (
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
      >
        {standingsData.length > 0 ? (
          <FlatList
            data={standingsData}
            keyExtractor={(item, index) => item.team?._id || item.teamId?._id || item._id || item.id || item.teamName || String(index)}
            scrollEnabled={false}
            renderItem={({ item, index }) => {
              const teamName = item.teamName || item.team?.title || item.teamId?.title || item.title || item.name || "Team";
              const shortName = item.team?.shortName || item.teamId?.shortName || item.shortName || (typeof teamName === 'string' ? teamName.substring(0, 3).toUpperCase() : "TM");
              const pts = item.points ?? item.pts ?? ((item.totalWins ?? item.wins ?? 0) * 2);
              const matchesPlayed = item.totalMatches ?? item.matches ?? item.played ?? item.p ?? 0;
              const wins = item.totalWins ?? item.wins ?? item.w ?? 0;
              const losses = item.totalLosses ?? item.losses ?? item.l ?? 0;
              const nrr = item.totalNRR ?? item.netRunRate ?? item.nrr ?? "0.000";
              const form = Array.isArray(item.last5Results) ? item.last5Results : (Array.isArray(item.recentForm) ? item.recentForm : []);

              return (
                <View
                  className={`p-4 rounded-lg mb-3 ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <ThemedText
                        className={`text-lg font-bold mr-3 ${
                          index < 4
                            ? "text-yellow-600"
                            : isDarkMode
                            ? "text-gray-400"
                            : "text-gray-600"
                        }`}
                      >
                        #{index + 1}
                      </ThemedText>
                      <View>
                        <ThemedText
                          className={`font-semibold ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {teamName}
                        </ThemedText>
                        <ThemedText
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {shortName}
                        </ThemedText>
                      </View>
                    </View>

                    <View className="items-end">
                      <ThemedText
                        className={`text-sm font-semibold ${
                          isDarkMode ? "text-green-400" : "text-green-600"
                        }`}
                      >
                        {pts} pts
                      </ThemedText>
                    </View>
                  </View>

                  <View className="flex-row justify-between mb-2">
                    <ThemedText
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Matches: {matchesPlayed}
                    </ThemedText>
                    <ThemedText
                      className={`text-sm ${
                        isDarkMode ? "text-green-400" : "text-green-600"
                      }`}
                    >
                      Wins: {wins}
                    </ThemedText>
                    <ThemedText
                      className={`text-sm ${
                        isDarkMode ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      Losses: {losses}
                    </ThemedText>
                  </View>

                  <View className="flex-row justify-between">
                    <ThemedText
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      NRR: {nrr}
                    </ThemedText>
                    {form.length > 0 && (
                      <View className="flex-row">
                        {form.map((f, idx) => (
                          <View
                            key={idx}
                            className={`w-5 h-5 rounded-full mx-1 items-center justify-center ${
                              f === "W" ? "bg-green-100" : "bg-red-100"
                            }`}
                          >
                            <ThemedText
                              className={`text-xs ${
                                f === "W" ? "text-green-800" : "text-red-800"
                              }`}
                            >
                              {f}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        ) : (
          <View className="py-12 items-center justify-center">
            <Ionicons name="trophy-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <ThemedText className={`text-center mt-3 font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Standings will be updated once matches are played
            </ThemedText>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderLeaderboard = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
    >
      {/* Batting Leaderboard */}
      <ThemedText
        className={`text-lg font-bold mb-3 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        🏏 Batting Leaderboard
      </ThemedText>

      {battingLeaderboard.length > 0 ? (
        battingLeaderboard.map((player, index) =>
          renderLeaderboardItem(player, index, "batting")
        )
      ) : (
        <View className="py-6 items-center justify-center">
          <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No batting statistics available yet
          </ThemedText>
        </View>
      )}

      {/* Bowling Leaderboard */}
      <ThemedText
        className={`text-lg font-bold mb-3 mt-6 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        🎯 Bowling Leaderboard
      </ThemedText>

      {bowlingLeaderboard.length > 0 ? (
        bowlingLeaderboard.map((player, index) =>
          renderLeaderboardItem(player, index, "bowling")
        )
      ) : (
        <View className="py-6 items-center justify-center">
          <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No bowling statistics available yet
          </ThemedText>
        </View>
      )}
    </ScrollView>
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
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>

        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          Tournament Profile
        </ThemedText>

        <View className="flex-row items-center">
          {canCreateMatch && (
            <TouchableOpacity
              onPress={handleCreateTournamentMatch}
              className="p-2 mr-1"
              accessibilityLabel="Create Match"
            >
              <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.EditTournament, { tournament: tournamentData || tournament })}
            className="p-2"
          >
            <Ionicons name="create-outline" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tournament Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        className="p-6"
      >
        <View className="items-center mb-2">
          {tournament.logo ? (
            <Image
              source={{ uri: getImageFullUrl(tournament.logo) }}
              className="w-20 h-20 rounded-full mb-3 bg-white/20"
              resizeMode="cover"
            />
          ) : (
            <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-3">
              <ThemedText className="text-2xl font-bold text-white">
                {tournament.shortName.substring(0, 4)}
              </ThemedText>
            </View>
          )}
          <ThemedText className="text-2xl font-bold text-white text-center">
            {tournament.name}
          </ThemedText>
          <ThemedText className="text-blue-100 mt-1">
            {tournament.location} • {tournament.organizer}
          </ThemedText>
        </View>

        <View className="flex-row justify-center mt-3">
          <View className="bg-white/20 rounded-full px-4 py-1 mx-1">
            <ThemedText className="text-white text-sm">
              📅 {tournament.dateRange}
            </ThemedText>
          </View>
          <View className="bg-white/20 rounded-full px-4 py-1 mx-1">
            <ThemedText className="text-white text-sm">
              👥 {tournament.teams} Teams
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation with vertical spacing */}
      <View className={`px-4 py-3 mb-3 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <View className="flex-row justify-between">
          {tabs.map((tab) => (
            <TabButton
              key={tab.value}
              title={tab.label}
              tabName={tab.value}
              icon={tab.icon}
            />
          ))}
        </View>
      </View>

      {/* Content with Swipeable Tabs or Loading Spinner */}
      {isLoading && !tournamentData ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#2563EB" />
          <ThemedText className={`mt-3 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Loading tournament details...
          </ThemedText>
        </View>
      ) : (
        <SwipeableTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={switchTab}
          isDarkMode={isDarkMode}
        >
          <View className="flex-1">
            {activeTab === "overview" && renderOverview()}
            {activeTab === "matches" && renderMatches()}
            {activeTab === "teams" && renderTeams()}
            {activeTab === "standings" && renderStandings()}
            {activeTab === "leaderboard" && renderLeaderboard()}
          </View>
        </SwipeableTabs>
      )}
    </SafeAreaView>
  );
}
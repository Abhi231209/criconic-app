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
import SCREENS from "@/screens";
import { tournamentsApi, request } from "@/utils/api";

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
  const tournamentId = route.params?.tournamentId || passedTournament?._id || passedTournament?.id || route.params?.id;

  const [tournamentData, setTournamentData] = useState(passedTournament);
  const [matchesList, setMatchesList] = useState([]);
  const [teamsList, setTeamsList] = useState(passedTournament?.teams || []);
  const [pointsTable, setPointsTable] = useState([]);
  const [battingLeaderboard, setBattingLeaderboard] = useState([]);
  const [bowlingLeaderboard, setBowlingLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([
      tournamentsApi.getTournamentById(tournamentId),
      tournamentsApi.getMatchesByTournament(tournamentId),
      tournamentsApi.getPointsTable(tournamentId),
      request(`api/tournaments/leaderboard/${tournamentId}?type=batting`).catch(() => null),
      request(`api/tournaments/leaderboard/${tournamentId}?type=fielding`).catch(() => null),
    ]).then(([tournRes, matchesRes, pointsRes, batLeadRes, bowlLeadRes]) => {
      if (!isMounted) return;
      setIsLoading(false);

      if (tournRes.status === "fulfilled" && tournRes.value) {
        const tData = tournRes.value.tournament || tournRes.value.data || tournRes.value;
        if (tData) {
          setTournamentData(tData);
          if (Array.isArray(tData.teams)) {
            setTeamsList(tData.teams);
          }
        }
      }

      if (matchesRes.status === "fulfilled" && matchesRes.value) {
        const mData = matchesRes.value.matches || matchesRes.value.data || (Array.isArray(matchesRes.value) ? matchesRes.value : []);
        setMatchesList(Array.isArray(mData) ? mData : []);
      }

      if (pointsRes.status === "fulfilled" && pointsRes.value) {
        const ptData = pointsRes.value.pointsTable || pointsRes.value.data || (Array.isArray(pointsRes.value) ? pointsRes.value : []);
        setPointsTable(Array.isArray(ptData) ? ptData : []);
      }

      if (batLeadRes.status === "fulfilled" && batLeadRes.value?.stats) {
        setBattingLeaderboard(Array.isArray(batLeadRes.value.stats) ? batLeadRes.value.stats : []);
      }

      if (bowlLeadRes.status === "fulfilled" && bowlLeadRes.value?.stats) {
        setBowlingLeaderboard(Array.isArray(bowlLeadRes.value.stats) ? bowlLeadRes.value.stats : []);
      }
    }).catch((err) => {
      if (isMounted) setIsLoading(false);
      console.log("Error loading tournament details:", err);
    });

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  // Derived tournament object
  const tournament = {
    id: tournamentData?._id || tournamentData?.id || tournamentId || "",
    name: tournamentData?.title || tournamentData?.name || "Tournament",
    shortName: tournamentData?.slug || tournamentData?.shortName || (tournamentData?.title ? tournamentData.title.substring(0, 4).toUpperCase() : "TMT"),
    logo: tournamentData?.logoImage || tournamentData?.bannerImage || tournamentData?.logo || null,
    startDate: tournamentData?.date?.start ? new Date(tournamentData.date.start).toLocaleDateString() : (tournamentData?.startDate || "TBD"),
    endDate: tournamentData?.date?.end ? new Date(tournamentData.date.end).toLocaleDateString() : (tournamentData?.endDate || "TBD"),
    location: tournamentData?.location || tournamentData?.city || "Not specified",
    organizer: typeof tournamentData?.organizer === "string" ? tournamentData.organizer : (tournamentData?.organizer?.[0]?.username || tournamentData?.organizerName || "Organizer"),
    teams: (tournamentData?.teams && tournamentData.teams.length) || teamsList.length || 0,
    status: tournamentData?.status || "upcoming",
    format: tournamentData?.format || "Standard",
    prizeMoney: tournamentData?.prizeMoney || "Not Specified",
    ballType: tournamentData?.ballType || "Standard",
  };

  const liveMatches = matchesList.filter((m) => m.status === "live" || m.isLive);
  const upcomingMatches = matchesList.filter((m) => m.status === "upcoming");
  const recentMatches = matchesList.filter((m) => m.status === "completed" || m.status === "finished");

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

  const renderLeaderboardItem = (item, index, type) => (
    <View
      key={item.id || item._id || index}
      className={`p-3 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
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
          <View>
            <ThemedText
              className={`font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {item.name || item.player?.username || item.playerId?.username || "Player"}
            </ThemedText>
            <ThemedText
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {item.team || item.teamName || item.teamId?.shortName || item.teamId?.title || ""}
            </ThemedText>
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
            {type === "batting" ? `${item.runs ?? item.totalRuns ?? 0} runs` : `${item.wickets ?? item.totalWickets ?? 0} wickets`}
          </ThemedText>
          <ThemedText
            className={`text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {type === "batting"
              ? `Avg: ${item.average ?? item.avg ?? "0.00"} • SR: ${item.strikeRate ?? item.sr ?? "0.00"}`
              : `Eco: ${item.economy ?? item.econ ?? "0.00"} • Avg: ${item.average ?? item.avg ?? "0.00"}`}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  const renderOverview = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      {/* Tournament Info Card */}
      <View
        className={`p-5 rounded-xl mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm`}
      >
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
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
              {tournament.startDate} to {tournament.endDate}
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
                Location
              </ThemedText>
            </View>
            <ThemedText
              className={`font-medium ${
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
                Format
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
          <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3">
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
            <View className="max-h-64">
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
            <View className="max-h-64">
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, alignItems: "center" }}
    >
      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <>
          <ThemedText
            className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            🔴 Live Matches
          </ThemedText>

          {liveMatches.map((match) => (
            <View key={match._id || match.id} className="mb-4 w-full max-w-md">
              <ScoreCard
                match={match}
                onPress={() => console.log("Live match pressed:", match._id || match.id)}
              />
            </View>
          ))}
        </>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <>
          <ThemedText
            className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            ⏰ Upcoming Matches
          </ThemedText>

          {upcomingMatches.map((match) => (
            <TouchableOpacity
              key={match._id || match.id}
              className={`p-4 rounded-xl mb-3 w-full max-w-md ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <View className="flex-row justify-between items-center mb-2">
                <ThemedText
                  className={`font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {match.team1?.title || match.team1 || "Team 1"} vs {match.team2?.title || match.team2 || "Team 2"}
                </ThemedText>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#666"}
                />
              </View>

              <View className="flex-row justify-between">
                <ThemedText
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  📅 {match.date ? new Date(match.date).toLocaleDateString() : (match.date || "Upcoming")}
                </ThemedText>
                <ThemedText
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  🏟️ {match.venue || match.location || "Ground"}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <>
          <ThemedText
            className={`text-lg font-bold mb-4 mt-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            📊 Recent Matches
          </ThemedText>

          {recentMatches.map((match) => (
            <View key={match._id || match.id} className="mb-4 w-full max-w-md">
              <ScoreCard
                match={match}
                onPress={() => console.log("Recent match pressed:", match._id || match.id)}
              />
            </View>
          ))}
        </>
      )}

      {liveMatches.length === 0 && upcomingMatches.length === 0 && recentMatches.length === 0 && (
        <View className="py-12 items-center justify-center">
          <Ionicons name="baseball-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText className={`text-center mt-3 font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No matches scheduled or played yet
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );

  const renderTeams = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      {teamsList.length > 0 ? (
        <FlatList
          data={teamsList}
          keyExtractor={(item, index) => item.teamId?._id || item._id || item.id || String(index)}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const teamTitle = item.teamId?.title || item.title || item.name || "Team";
            const teamShort = item.teamId?.shortName || item.shortName || (typeof teamTitle === 'string' ? teamTitle.substring(0, 3).toUpperCase() : "TM");
            return (
              <TouchableOpacity
                className={`p-4 rounded-lg mb-3 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } shadow-sm`}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <ThemedText
                      className={`font-semibold text-lg ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {teamTitle}
                    </ThemedText>
                    <ThemedText
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      ({teamShort})
                    </ThemedText>
                  </View>

                  <View className="items-end">
                    <ThemedText
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {item.matches ?? 0} matches
                    </ThemedText>
                    <ThemedText
                      className={`text-xs ${
                        isDarkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      {item.wins ?? 0} wins • {item.losses ?? 0} losses
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      >
        {standingsData.length > 0 ? (
          <FlatList
            data={standingsData}
            keyExtractor={(item, index) => item.team?._id || item.teamId?._id || item._id || item.id || String(index)}
            scrollEnabled={false}
            renderItem={({ item, index }) => {
              const teamName = item.team?.title || item.teamId?.title || item.title || item.name || "Team";
              const shortName = item.team?.shortName || item.teamId?.shortName || item.shortName || (typeof teamName === 'string' ? teamName.substring(0, 3).toUpperCase() : "TM");
              const pts = item.points ?? item.pts ?? 0;
              const matchesPlayed = item.matches ?? item.played ?? item.p ?? 0;
              const wins = item.wins ?? item.w ?? 0;
              const losses = item.losses ?? item.l ?? 0;
              const nrr = item.netRunRate ?? item.nrr ?? "0.000";
              const form = Array.isArray(item.recentForm) ? item.recentForm : [];

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
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
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

        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.EditTournament, { tournament: tournamentData || tournament })}
          className="p-2"
        >
          <Ionicons name="create-outline" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Tournament Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        className="p-6"
      >
        <View className="items-center mb-2">
          <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-3">
            <ThemedText className="text-3xl font-bold text-white">
              {tournament.shortName}
            </ThemedText>
          </View>
          <ThemedText className="text-2xl font-bold text-white text-center">
            {tournament.name}
          </ThemedText>
          <ThemedText className="text-blue-100 mt-1">
            {tournament.location} • {tournament.organizer}
          </ThemedText>
        </View>

        <View className="flex-row justify-center mt-4">
          <View className="bg-white/20 rounded-full px-4 py-1 mx-2">
            <ThemedText className="text-white text-sm">
              {tournament.startDate} - {tournament.endDate}
            </ThemedText>
          </View>
          <View className="bg-white/20 rounded-full px-4 py-1 mx-2">
            <ThemedText className="text-white text-sm">
              {tournament.teams} Teams
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View className={`px-4 py-3 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
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

      {/* Content with Swipeable Tabs */}
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
    </SafeAreaView>
  );
}
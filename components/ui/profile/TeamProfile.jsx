import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  FlatList,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard from "@/components/ui/ScoreCard";
import Dropdown from "@/components/ui/custom/Dropdown";
import SwipeableTabs from "../custom/SwipeableTab";
import SCREENS from "@/screens";
import { teamsApi } from "@/utils/api";

export default function TeamProfile() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState("stats");
  const [leaderboardType, setLeaderboardType] = useState("batting");

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  const route = useRoute();
  const routeTeam = route?.params?.team;
  const teamId =
    route?.params?.teamId ||
    routeTeam?._id ||
    routeTeam?.id ||
    routeTeam?.teamId;

  const [teamData, setTeamData] = useState(() => {
    if (Array.isArray(routeTeam)) return routeTeam[0];
    return routeTeam || null;
  });
  const [teamStats, setTeamStats] = useState(null);
  const [teamMatches, setTeamMatches] = useState([]);
  const [battingLeaderboard, setBattingLeaderboard] = useState([]);
  const [bowlingLeaderboard, setBowlingLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);

    // 1. Fetch Team Profile Details
    teamsApi
      .getTeamById(teamId)
      .then((res) => {
        const raw = Array.isArray(res?.data)
          ? res.data[0]
          : res?.data?.data || res?.data;
        if (raw) {
          setTeamData(raw);
        }
      })
      .catch((err) => console.log("[TeamProfile] Fetch team error:", err))
      .finally(() => setLoading(false));

    // 2. Fetch Team Stats (matches, won, NR, toss, battingFirst, battingSecond)
    teamsApi
      .getTeamByIds([teamId])
      .catch(() => {});

    // Live team stats from matches
    const fetchAuxiliaryData = async () => {
      try {
        const { request } = await import("@/utils/api");

        // Fetch stats
        request(`api/teams/getTeamStat/${teamId}`, { method: "GET", errorAlert: false })
          .then((res) => {
            if (res?.data?.success && res.data.stats) {
              setTeamStats(res.data.stats);
            }
          })
          .catch(() => {});

        // Fetch team matches
        request(`api/matches/getMatchByTeam/${teamId}`, { method: "GET", errorAlert: false })
          .then((res) => {
            if (res?.data?.matches && Array.isArray(res.data.matches)) {
              setTeamMatches(res.data.matches);
            }
          })
          .catch(() => {});

        // Fetch batting leaderboard
        request(`api/teams/getBatsmenLeaderBoard/${teamId}`, { method: "GET", errorAlert: false })
          .then((res) => {
            if (res?.data?.success && Array.isArray(res.data.stats)) {
              setBattingLeaderboard(res.data.stats);
            }
          })
          .catch(() => {});

        // Fetch bowling leaderboard
        request(`api/teams/getBowlingLeaderBoard/${teamId}`, { method: "GET", errorAlert: false })
          .then((res) => {
            if (res?.data?.success && Array.isArray(res.data.stats)) {
              setBowlingLeaderboard(res.data.stats);
            }
          })
          .catch(() => {});
      } catch (e) {
        console.warn("[TeamProfile] Error loading auxiliary team data:", e);
      }
    };

    fetchAuxiliaryData();
  }, [teamId]);

  // Dynamic team data derived from route / API / stats
  const team = {
    id: teamData?._id || teamData?.id || teamData?.teamId || teamId || "1",
    name: teamData?.title || teamData?.name || "Team",
    shortName:
      teamData?.shortName ||
      (teamData?.title ? teamData.title.slice(0, 3).toUpperCase() : "TM"),
    matches: teamStats?.matches || teamData?.matches || 0,
    wins: teamStats?.won || teamData?.wins || 0,
    losses:
      (teamStats?.matches || 0) - (teamStats?.won || 0) - (teamStats?.NR || 0) >= 0
        ? (teamStats?.matches || 0) - (teamStats?.won || 0) - (teamStats?.NR || 0)
        : teamData?.losses || 0,
    ties: teamStats?.NR || teamData?.ties || 0,
    winPercentage: teamStats?.matches
      ? Math.round(((teamStats.won || 0) / teamStats.matches) * 100)
      : teamData?.winPercentage ||
        (teamData?.matches
          ? Math.round(((teamData?.wins || 0) / teamData.matches) * 100)
          : 0),
    tossWins: teamStats?.toss || teamData?.tossWins || 0,
    batFirst: teamStats?.battingFirst || teamData?.batFirst || 0,
    fieldFirst: teamStats?.battingSecond || teamData?.fieldFirst || 0,
    logoImage: teamData?.logoImage || null,
  };

  // HARDCODED SAMPLE TEAM DATA - COMMENTED OUT (API ONLY)
  /*
  const team = {
    id: "1",
    name: "Mumbai Indians",
    shortName: "MI",
    matches: 231,
    wins: 129,
    losses: 98,
    ties: 4,
    winPercentage: 56.28,
    tossWins: 118,
    batFirst: 67,
    fieldFirst: 52,
  };

  const squad = [
    {
      id: "1",
      name: "Rohit Sharma",
      matches: 231,
      runs: 5879,
      average: 42.5,
      strikeRate: 145.3,
    },
    {
      id: "2",
      name: "Jasprit Bumrah",
      matches: 120,
      wickets: 145,
      economy: 7.2,
      best: "4/14",
    },
    {
      id: "3",
      name: "Suryakumar Yadav",
      matches: 123,
      runs: 2345,
      average: 38.2,
      strikeRate: 155.6,
    },
  ];

  const battingLeaderboard = [
    {
      id: "1",
      name: "Rohit Sharma",
      runs: 5879,
      average: 42.5,
      strikeRate: 145.3,
      matches: 231,
    },
    {
      id: "2",
      name: "Suryakumar Yadav",
      runs: 2345,
      average: 38.2,
      strikeRate: 155.6,
      matches: 123,
    },
    {
      id: "3",
      name: "Ishan Kishan",
      runs: 1452,
      average: 35.4,
      strikeRate: 142.8,
      matches: 75,
    },
  ];

  const bowlingLeaderboard = [
    {
      id: "1",
      name: "Jasprit Bumrah",
      wickets: 145,
      economy: 7.2,
      average: 18.3,
      best: "4/14",
      matches: 120,
    },
    {
      id: "2",
      name: "Lasith Malinga",
      wickets: 170,
      economy: 7.1,
      average: 19.8,
      best: "5/13",
      matches: 122,
    },
    {
      id: "3",
      name: "Hardik Pandya",
      wickets: 42,
      economy: 8.1,
      average: 32.6,
      best: "3/17",
      matches: 92,
    },
  ];
  */

  const recentMatches =
    Array.isArray(teamMatches) && teamMatches.length > 0
      ? teamMatches
      : Array.isArray(teamData?.recentMatches)
      ? teamData.recentMatches
      : [];

  const squad = Array.isArray(teamData?.players)
    ? teamData.players.map((p, idx) => ({
        id: p._id || p.id || p.playerId || idx.toString(),
        name:
          p.name ||
          p.username ||
          p.playerName ||
          p.title ||
          `Player ${idx + 1}`,
        matches: p.matches || 0,
        runs: p.runs || 0,
        wickets: p.wickets || 0,
        average: p.average || 0,
        strikeRate: p.strikeRate || 0,
      }))
    : [];

  const leaderboardOptions = [
    { label: "🏏 Batting Leaderboard", value: "batting" },
    { label: "🎯 Bowling Leaderboard", value: "bowling" },
  ];

  const tabs = [
    { value: "matches", label: "Matches", icon: "calendar-outline" },
    { value: "squad", label: "Squad", icon: "people-outline" },
    { value: "leaderboard", label: "Leaderboard", icon: "trophy-outline" },
    { value: "stats", label: "Stats", icon: "stats-chart-outline" },
  ];

  const animateContent = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const switchTab = (tabName) => {
    setActiveTab(tabName);
    animateContent();
  };

  React.useEffect(() => {
    animateContent();
  }, [activeTab]);

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

  const renderMatches = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <ScrollView
        className="px-4 mt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: "center" }}
      >
        <ThemedText
          className={`text-lg font-bold mb-4 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Recent Matches
        </ThemedText>

        {recentMatches.length === 0 ? (
          <View className="py-12 items-center">
            <Ionicons name="calendar-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              No recent matches found
            </ThemedText>
          </View>
        ) : (
          recentMatches.map((match) => (
            <View key={match.id} className="mb-4 w-full max-w-md">
              <ScoreCard
                match={match}
                onPress={() => console.log("Match pressed:", match.id)}
              />
            </View>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );

  const renderSquad = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <FlatList
        data={squad}
        keyExtractor={(item) => item.id}
        className="px-4 mt-4"
        ListEmptyComponent={
          <View className="py-12 items-center">
            <Ionicons name="people-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              No squad members found
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
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
                  {item.name}
                </ThemedText>
                <ThemedText
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {item.matches} matches
                </ThemedText>
              </View>

              <View className="items-end">
                {item.runs > 0 && (
                  <ThemedText
                    className={`font-semibold ${
                      isDarkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {item.runs} runs
                  </ThemedText>
                )}
                {item.wickets > 0 && (
                  <ThemedText
                    className={`font-semibold ${
                      isDarkMode ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    {item.wickets} wickets
                  </ThemedText>
                )}
                {item.average > 0 && (
                  <ThemedText
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Avg: {item.average}
                  </ThemedText>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </Animated.View>
  );

  const renderLeaderboard = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <ScrollView className="px-4 mt-4" showsVerticalScrollIndicator={false}>
        {/* Leaderboard Type Selector */}
        <View className="mb-4">
          <ThemedText
            className={`text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Select Leaderboard Type
          </ThemedText>
          <Dropdown
            options={leaderboardOptions}
            selectedValue={leaderboardType}
            onValueChange={setLeaderboardType}
            placeholder="Select leaderboard type"
            iconColor="#2563EB"
          />
        </View>

        {leaderboardType === "batting" ? (
          <>
            <ThemedText
              className={`text-lg font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              🏏 Batting Leaderboard
            </ThemedText>

            {battingLeaderboard.length === 0 ? (
              <View className="py-12 items-center">
                <Ionicons name="trophy-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
                <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  No batting leaderboard data available
                </ThemedText>
              </View>
            ) : (
              battingLeaderboard.map((player, index) => (
                <View
                  key={player.id}
                  className={`p-3 rounded-lg mb-2 ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  }`}
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
                          {player.name}
                        </ThemedText>
                        <ThemedText
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {player.matches} matches
                        </ThemedText>
                      </View>
                    </View>

                    <View className="items-end">
                      <ThemedText
                        className={`text-sm font-semibold ${
                          isDarkMode ? "text-green-400" : "text-green-600"
                        }`}
                      >
                        {player.runs} runs
                      </ThemedText>
                      <ThemedText
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        SR: {player.strikeRate} • Avg: {player.average}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <ThemedText
              className={`text-lg font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              🎯 Bowling Leaderboard
            </ThemedText>

            {bowlingLeaderboard.length === 0 ? (
              <View className="py-12 items-center">
                <Ionicons name="trophy-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
                <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  No bowling leaderboard data available
                </ThemedText>
              </View>
            ) : (
              bowlingLeaderboard.map((player, index) => (
                <View
                  key={player.id}
                  className={`p-3 rounded-lg mb-2 ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  }`}
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
                          {player.name}
                        </ThemedText>
                        <ThemedText
                          className={`text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {player.matches} matches
                        </ThemedText>
                      </View>
                    </View>

                    <View className="items-end">
                      <ThemedText
                        className={`text-sm font-semibold ${
                          isDarkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                      >
                        {player.wickets} wickets
                      </ThemedText>
                      <ThemedText
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Eco: {player.economy} • Avg: {player.average}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );

  const renderStats = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <ScrollView className="px-4 mt-4" showsVerticalScrollIndicator={false}>
        {/* Performance Stats */}
        <View
          className={`p-4 rounded-xl mb-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <ThemedText
            className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Team Statistics
          </ThemedText>

          <View className="flex-row justify-around mb-4">
            <View className="items-center">
              <ThemedText
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                {team.matches}
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Matches
              </ThemedText>
            </View>

            <View className="items-center">
              <ThemedText
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              >
                {team.wins}
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Wins
              </ThemedText>
            </View>

            <View className="items-center">
              <ThemedText
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                {team.losses}
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Losses
              </ThemedText>
            </View>

            <View className="items-center">
              <ThemedText
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {team.ties}
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Ties
              </ThemedText>
            </View>
          </View>

          <View className="flex-row justify-around mb-4">
            <View className="items-center">
              <ThemedText
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-yellow-400" : "text-yellow-600"
                }`}
              >
                {team.tossWins}
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Toss Wins
              </ThemedText>
            </View>

            <View className="items-center">
              <ThemedText
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-purple-400" : "text-purple-600"
                }`}
              >
                {team.batFirst}
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Bat First
              </ThemedText>
            </View>

            <View className="items-center">
              <ThemedText
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                {team.fieldFirst}
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Field First
              </ThemedText>
            </View>
          </View>

          <View className="items-center">
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Win Percentage
            </ThemedText>
            <ThemedText
              className={`text-xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {team.winPercentage}%
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header with Back Button and Edit */}
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
          Team Profile
        </ThemedText>

        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.EditTeam)}
          className="p-2"
        >
          <Ionicons name="create-outline" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Team Header */}
      <View className={`p-4 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <View className="items-center mb-4">
          <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-2">
            <ThemedText className="text-2xl font-bold text-blue-800">
              {team.shortName}
            </ThemedText>
          </View>
          <ThemedText className="text-2xl font-bold text-gray-900 dark:text-white">
            {team.name}
          </ThemedText>
        </View>
      </View>

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
          {activeTab === "matches" && renderMatches()}
          {activeTab === "squad" && renderSquad()}
          {activeTab === "leaderboard" && renderLeaderboard()}
          {activeTab === "stats" && renderStats()}
        </View>
      </SwipeableTabs>
    </SafeAreaView>
  );
}

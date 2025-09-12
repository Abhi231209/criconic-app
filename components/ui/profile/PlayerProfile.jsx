import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard from "@/components/ui/ScoreCard";
import SwipeableTabs from "../custom/SwipeableTab";
import SCREENS from "@/screens";

export default function PlayerProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState("overview");
  const [activeStatsTab, setActiveStatsTab] = useState("batting");
  const [activeBallType, setActiveBallType] = useState("all");
  const [expandedSections, setExpandedSections] = useState({
    batting: false,
    bowling: false,
    achievements: false
  });

  // Sample player data
  const player = {
    id: "1",
    name: "Virat Kohli",
    shortName: "V Kohli",
    team: "RCB",
    nationality: "Indian",
    age: 35,
    role: "Batsman",
    battingStyle: "Right Handed",
    bowlingStyle: "Right Arm Medium",
    photo: null,
    debut: "2008-08-18",
    matches: 237,
    runs: 7263,
    wickets: 4,
    highestScore: 113,
    bestBowling: "2/25",
    average: 37.25,
    strikeRate: 130.02,
    economy: 8.52,
  };

  // Stats data by ball type
  const battingStats = {
    all: {
      matches: 237,
      innings: 229,
      runs: 7263,
      average: 37.25,
      strikeRate: 130.02,
      highest: 113,
      centuries: 8,
      fifties: 50,
      fours: 643,
      sixes: 234
    },
    leather: {
      matches: 180,
      innings: 175,
      runs: 5820,
      average: 39.32,
      strikeRate: 128.45,
      highest: 113,
      centuries: 7,
      fifties: 40,
      fours: 512,
      sixes: 180
    },
    tennis: {
      matches: 57,
      innings: 54,
      runs: 1443,
      average: 28.86,
      strikeRate: 138.72,
      highest: 98,
      centuries: 1,
      fifties: 10,
      fours: 131,
      sixes: 54
    }
  };

  const bowlingStats = {
    all: {
      matches: 237,
      innings: 42,
      wickets: 4,
      average: 112.5,
      economy: 8.52,
      bestBowling: "2/25",
      strikeRate: 79.2,
      maidens: 0,
      fourWickets: 0,
      fiveWickets: 0
    },
    leather: {
      matches: 180,
      innings: 30,
      wickets: 3,
      average: 126.3,
      economy: 8.45,
      bestBowling: "2/25",
      strikeRate: 89.7,
      maidens: 0,
      fourWickets: 0,
      fiveWickets: 0
    },
    tennis: {
      matches: 57,
      innings: 12,
      wickets: 1,
      average: 98.0,
      economy: 8.72,
      bestBowling: "1/18",
      strikeRate: 67.4,
      maidens: 0,
      fourWickets: 0,
      fiveWickets: 0
    }
  };

  // Sample matches data
  const liveMatches = [
    {
      id: "1",
      team1: "RCB",
      team2: "CSK",
      score: "RCB 145/4 (15) vs CSK 132/6 (15)",
      result: "Live",
      date: "Live",
      isLive: true,
      playerPerformance: "78(52)"
    },
    {
      id: "2",
      team1: "RCB",
      team2: "MI",
      score: "RCB 89/3 (10) vs MI 75/2 (10)",
      result: "Live",
      date: "Live",
      isLive: true,
      playerPerformance: "45(32)"
    },
  ];

  const recentMatches = [
    {
      id: "3",
      team1: "RCB",
      team2: "KKR",
      score: "RCB 196/4 (20) vs KKR 172/8 (20)",
      result: "RCB won by 24 runs",
      date: "2 days ago",
      playerPerformance: "83(59)"
    },
    {
      id: "4",
      team1: "RCB",
      team2: "DC",
      score: "RCB 182/6 (20) vs DC 183/4 (19.1)",
      result: "DC won by 6 wickets",
      date: "5 days ago",
      playerPerformance: "45(32)"
    },
    {
      id: "5",
      team1: "RCB",
      team2: "SRH",
      score: "RCB 205/3 (20) vs SRH 208/4 (19.2)",
      result: "SRH won by 6 wickets",
      date: "1 week ago",
      playerPerformance: "78(52)"
    },
  ];

  // Sample teams data (teams the player has played for)
  const teams = [
    {
      id: "1",
      name: "Royal Challengers Bangalore",
      shortName: "RCB",
      seasons: "2008-2024",
      matches: 237,
      runs: 7263,
      wickets: 4,
      role: "Batsman"
    },
    {
      id: "2",
      name: "India",
      shortName: "IND",
      seasons: "2008-2024",
      matches: 115,
      runs: 4050,
      wickets: 2,
      role: "Batsman"
    },
  ];

  // Sample achievements data
  const achievements = [
    {
      id: "1",
      title: "Orange Cap Winner",
      tournament: "IPL 2016",
      description: "Most runs in the tournament (973 runs)"
    },
    {
      id: "2",
      title: "Player of the Tournament",
      tournament: "IPL 2016",
      description: "Outstanding performance throughout"
    },
    {
      id: "3",
      title: "Fastest to 5000 runs",
      tournament: "IPL",
      description: "Reached 5000 runs in 157 innings"
    },
  ];

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: "person-outline",
    },
    { value: "stats", label: "Stats", icon: "stats-chart-outline" },
    { value: "matches", label: "Matches", icon: "calendar-outline" },
    { value: "teams", label: "Teams", icon: "shirt-outline" },
    { value: "achievements", label: "Achievements", icon: "trophy-outline" },
  ];

  const statsTabs = [
    { value: "batting", label: "Batting", icon: "baseball-outline" },
    { value: "bowling", label: "Bowling", icon: "baseball-outline" },
  ];

  const ballTypeTabs = [
    { value: "all", label: "All", icon: "globe-outline" },
    { value: "leather", label: "Leather", icon: "american-football-outline" },
    { value: "tennis", label: "Tennis", icon: "tennisball-outline" },
  ];

  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  const switchStatsTab = (tabName) => {
    setActiveStatsTab(tabName);
  };

  const switchBallType = (ballType) => {
    setActiveBallType(ballType);
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

  const StatsTabButton = ({ title, tabName, icon }) => (
    <TouchableOpacity
      onPress={() => switchStatsTab(tabName)}
      className={`flex-row items-center px-4 py-3 rounded-lg mx-1 ${
        activeStatsTab === tabName
          ? isDarkMode ? "bg-blue-700" : "bg-blue-600"
          : isDarkMode ? "bg-gray-700" : "bg-gray-200"
      }`}
    >
      <Ionicons
        name={icon}
        size={16}
        color={
          activeStatsTab === tabName ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"
        }
        style={{ marginRight: 6 }}
      />
      <ThemedText
        className={`font-medium ${
          activeStatsTab === tabName
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

  const BallTypeButton = ({ title, ballType, icon }) => (
    <TouchableOpacity
      onPress={() => switchBallType(ballType)}
      className={`flex-row items-center px-3 py-2 rounded-lg mx-1 ${
        activeBallType === ballType
          ? isDarkMode ? "bg-blue-700" : "bg-blue-600"
          : isDarkMode ? "bg-gray-700" : "bg-gray-200"
      }`}
    >
      <Ionicons
        name={icon}
        size={14}
        color={
          activeBallType === ballType ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"
        }
        style={{ marginRight: 4 }}
      />
      <ThemedText
        className={`text-sm ${
          activeBallType === ballType
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

  const StatRow = ({ label, value }) => (
    <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
      <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
        {label}
      </ThemedText>
      <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
        {value}
      </ThemedText>
    </View>
  );

  const renderOverview = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      {/* Player Info Card */}
      <View
        className={`p-5 rounded-xl mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm`}
      >
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="person-outline" size={20} color="#3B82F6" />
          </View>
          <ThemedText
            className={`text-xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Player Information
          </ThemedText>
        </View>

        <View className="space-y-4">
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Full Name
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.name}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Team
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.team}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Nationality
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.nationality}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Age
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.age}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Role
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.role}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Batting Style
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.battingStyle}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Bowling Style
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.bowlingStyle}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Career Summary */}
      <View
        className={`p-5 rounded-xl mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm`}
      >
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="trending-up-outline" size={20} color="#10B981" />
          </View>
          <ThemedText
            className={`text-xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Career Summary
          </ThemedText>
        </View>

        <View className="space-y-4">
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Debut
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.debut}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Matches
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.matches}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Runs
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.runs}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Wickets
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.wickets}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Highest Score
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.highestScore}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Best Bowling
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.bestBowling}
            </ThemedText>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStats = () => (
    <View className="flex-1">
      {/* Stats Tabs */}
      <View className="flex-row justify-center my-4">
        {statsTabs.map((tab) => (
          <StatsTabButton
            key={tab.value}
            title={tab.label}
            tabName={tab.value}
            icon={tab.icon}
          />
        ))}
      </View>

      {/* Ball Type Tabs */}
      <View className="flex-row justify-center mb-4">
        {ballTypeTabs.map((tab) => (
          <BallTypeButton
            key={tab.value}
            title={tab.label}
            ballType={tab.value}
            icon={tab.icon}
          />
        ))}
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      >
        {activeStatsTab === "batting" && (
          <View
            className={`p-5 rounded-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm`}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="baseball-outline" size={20} color="#3B82F6" />
              </View>
              <ThemedText
                className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Batting Statistics
              </ThemedText>
            </View>

            <View className="space-y-4">
              <StatRow label="Matches" value={battingStats[activeBallType].matches} />
              <StatRow label="Innings" value={battingStats[activeBallType].innings} />
              <StatRow label="Runs" value={battingStats[activeBallType].runs} />
              <StatRow label="Average" value={battingStats[activeBallType].average} />
              <StatRow label="Strike Rate" value={battingStats[activeBallType].strikeRate} />
              <StatRow label="Highest Score" value={battingStats[activeBallType].highest} />
              <StatRow label="Centuries" value={battingStats[activeBallType].centuries} />
              <StatRow label="Fifties" value={battingStats[activeBallType].fifties} />
              <StatRow label="Fours" value={battingStats[activeBallType].fours} />
              <StatRow label="Sixes" value={battingStats[activeBallType].sixes} />
            </View>
          </View>
        )}

        {activeStatsTab === "bowling" && (
          <View
            className={`p-5 rounded-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm`}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="baseball-outline" size={20} color="#10B981" />
              </View>
              <ThemedText
                className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Bowling Statistics
              </ThemedText>
            </View>

            <View className="space-y-4">
              <StatRow label="Matches" value={bowlingStats[activeBallType].matches} />
              <StatRow label="Innings" value={bowlingStats[activeBallType].innings} />
              <StatRow label="Wickets" value={bowlingStats[activeBallType].wickets} />
              <StatRow label="Average" value={bowlingStats[activeBallType].average} />
              <StatRow label="Economy" value={bowlingStats[activeBallType].economy} />
              <StatRow label="Best Bowling" value={bowlingStats[activeBallType].bestBowling} />
              <StatRow label="Strike Rate" value={bowlingStats[activeBallType].strikeRate} />
              <StatRow label="Maidens" value={bowlingStats[activeBallType].maidens} />
              <StatRow label="4 Wickets" value={bowlingStats[activeBallType].fourWickets} />
              <StatRow label="5 Wickets" value={bowlingStats[activeBallType].fiveWickets} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderMatches = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
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
            <View key={match.id} className="mb-4">
              <ScoreCard
                match={match}
                onPress={() => console.log("Live match pressed:", match.id)}
              />
              <View className={`p-3 rounded-b-lg ${isDarkMode ? "bg-gray-700" : "bg-blue-50"}`}>
                <ThemedText className={`text-sm font-medium ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
                  {player.shortName}: {match.playerPerformance}
                </ThemedText>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Recent Matches */}
      <ThemedText
        className={`text-lg font-bold mb-4 mt-6 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        📊 Recent Matches
      </ThemedText>

      {recentMatches.map((match) => (
        <TouchableOpacity
          key={match.id}
          className={`p-4 rounded-xl mb-3 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
          onPress={() => {
            // Navigate to match details
          }}
        >
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {match.date}
            </ThemedText>
            <View className="flex-row items-center">
              <Ionicons
                name="chevron-forward-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </View>
          </View>

          <ThemedText
            className={`text-base font-semibold mb-1 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {match.team1} vs {match.team2}
          </ThemedText>

          <ThemedText
            className={`text-sm mb-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {match.score}
          </ThemedText>

          <View className="flex-row justify-between items-center">
            <ThemedText
              className={`text-sm ${
                match.result.includes("won")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {match.result}
            </ThemedText>
            <ThemedText
              className={`text-sm font-medium ${
                isDarkMode ? "text-blue-400" : "text-blue-600"
              }`}
            >
              {match.playerPerformance}
            </ThemedText>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        className={`p-4 rounded-xl items-center mt-2 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm`}
        onPress={() => {
          // Navigate to all matches
        }}
      >
        <ThemedText
          className={`text-blue-600 font-medium ${
            isDarkMode ? "text-blue-400" : "text-blue-600"
          }`}
        >
          View All Matches
        </ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTeams = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      <ThemedText
        className={`text-lg font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Teams Played For
      </ThemedText>

      {teams.map((team) => (
        <TouchableOpacity
          key={team.id}
          className={`p-4 rounded-xl mb-3 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
          onPress={() => {
            // Navigate to team details
          }}
        >
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText
              className={`text-lg font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {team.name}
            </ThemedText>
            <View className="flex-row items-center">
              <Ionicons
                name="chevron-forward-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </View>
          </View>

          <View className="flex-row justify-between items-center mb-2">
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Seasons
            </ThemedText>
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {team.seasons}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center mb-2">
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Matches
            </ThemedText>
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {team.matches}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center mb-2">
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Role
            </ThemedText>
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {team.role}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center">
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Runs/Wickets
            </ThemedText>
            <ThemedText
              className={`text-sm ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {team.runs} / {team.wickets}
            </ThemedText>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderAchievements = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      <ThemedText
        className={`text-lg font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Player Achievements
      </ThemedText>

      {achievements.map((achievement) => (
        <View
          key={achievement.id}
          className={`p-4 rounded-xl mb-3 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <View className="flex-row items-start mb-2">
            <View className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mr-3 mt-1">
              <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <ThemedText
                className={`text-lg font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {achievement.title}
              </ThemedText>
              <ThemedText
                className={`text-sm font-medium mb-1 ${
                  isDarkMode ? "text-yellow-400" : "text-yellow-600"
                }`}
              >
                {achievement.tournament}
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {achievement.description}
              </ThemedText>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}
    >
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="pt-4 pb-6 px-4"
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full items-center justify-center bg-black/20"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <ThemedText className="text-white text-xl font-bold">
            Player Profile
          </ThemedText>
          <TouchableOpacity
                    onPress={() => navigation.navigate(SCREENS.EditPlayerProfile)}
                    className="p-2"
                  >
                    <Ionicons name="create-outline" size={24} color="#2563EB" />
                  </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          <View className="w-20 h-20 rounded-full bg-white items-center justify-center mr-4">
            {player.photo ? (
              <Image
                source={{ uri: player.photo }}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <Ionicons name="person" size={40} color="#3B82F6" />
            )}
          </View>
          <View>
            <ThemedText className="text-white text-2xl font-bold">
              {player.name}
            </ThemedText>
            <ThemedText className="text-blue-100 text-base">
              {player.shortName}
            </ThemedText>
            <View className="flex-row items-center mt-1">
              <View
                className={`px-2 py-1 rounded-md ${
                  isDarkMode ? "bg-gray-800/50" : "bg-white/20"
                }`}
              >
                <ThemedText className="text-white text-xs">
                  {player.role}
                </ThemedText>
              </View>
              <View
                className={`px-2 py-1 rounded-md ml-2 ${
                  isDarkMode ? "bg-gray-800/50" : "bg-white/20"
                }`}
              >
                <ThemedText className="text-white text-xs">
                  {player.team}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View
        className={`flex-row p-2 ${isDarkMode ? "bg-gray-800" : "bg-gray-200"}`}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.value}
            title={tab.label}
            tabName={tab.value}
            icon={tab.icon}
          />
        ))}
      </View>

      {/* Tab Content */}
      <View className="flex-1 mt-2">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "stats" && renderStats()}
        {activeTab === "matches" && renderMatches()}
        {activeTab === "teams" && renderTeams()}
        {activeTab === "achievements" && renderAchievements()}
      </View>
    </SafeAreaView>
  );
}
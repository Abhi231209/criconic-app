import React, { useState } from "react";
import { View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, { 
  FadeIn, 
  FadeInDown, 
  ZoomIn, 
  SlideInRight,
  LightSpeedInLeft,
  FlipInXUp,
  BounceInDown,
  StretchInX,
  PinwheelIn,
  Layout
} from "react-native-reanimated";
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome5, 
  MaterialCommunityIcons
} from '@expo/vector-icons';
import ThemedText from "../custom/ThemedText";
import { useColorScheme } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

export default function MatchSummary({ matchData }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const [expandedSection, setExpandedSection] = useState(null);
  
  const isDark = colorScheme === "dark";

  const colors = {
    primary: isDark ? "#3b82f6" : "#2563eb",
    secondary: isDark ? "#fbbf24" : "#f59e0b",
    background: isDark ? "#0f172a" : "#f1f5f9",
    card: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f1f5f9" : "#1e293b",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
  };

  // Sample match data
  const matchInfo = {
    team1: {
      name: "WF-W",
      score: "145/6",
      overs: "20.0",
      result: "won by 40 runs"
    },
    team2: {
      name: "BP-W",
      score: "105/9",
      overs: "20.0",
      result: ""
    },
    venue: "Sydney Cricket Ground",
    date: "May 15, 2023",
    matchType: "T20 Women's League"
  };

  const manOfTheMatch = {
    name: "Ellyse Perry",
    team: "WF-W",
    role: "All-rounder",
    performance: {
      runs: 55,
      balls: 43,
      fours: 6,
      sixes: 2,
      wickets: 2,
      economy: 5.2
    },
    avatar: "🏏"
  };

  const topBatters = [
    { name: "Ellyse Perry", team: "WF-W", runs: 55, balls: 43, fours: 6, sixes: 2, sr: 127.91 },
    { name: "Alyssa Healy", team: "WF-W", runs: 42, balls: 32, fours: 5, sixes: 1, sr: 131.25 },
    { name: "Sophie Devine", team: "BP-W", runs: 38, balls: 35, fours: 4, sixes: 0, sr: 108.57 }
  ];

  const topBowlers = [
    { name: "S Ismail", team: "WF-W", wickets: 3, runs: 16, overs: "4.0", economy: 4.00 },
    { name: "M Schutt", team: "WF-W", wickets: 2, runs: 22, overs: "4.0", economy: 5.50 },
    { name: "M Taylor", team: "BP-W", wickets: 2, runs: 28, overs: "4.0", economy: 7.00 }
  ];

  const keyMoments = [
    { over: "10.3", description: "Perry reaches 50 with a boundary", type: "milestone" },
    { over: "12.5", description: "Ismail takes 2 wickets in 3 balls", type: "breakthrough" },
    { over: "16.2", description: "Healy's quickfire 42 comes to an end", type: "wicket" },
    { over: "19.1", description: "WF-W seal the victory with a yorker", type: "decisive" }
  ];

  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  const PerformanceCard = ({ title, children, isExpanded, onPress, index }) => (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 100).duration(500)}
      onPress={onPress}
      className={`rounded-lg p-4 mb-4 border ${
        isDark ? "border-gray-600" : "border-gray-200"
      } ${isExpanded ? (isDark ? "bg-gray-800" : "bg-white") : (isDark ? "bg-gray-800" : "bg-gray-50")}`}
    >
      <View className="flex-row justify-between items-center">
        <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 24 }}>
          {title}
        </ThemedText>
        <MaterialIcons 
          name={isExpanded ? "expand-less" : "expand-more"} 
          size={24} 
          color={isDark ? "#94a3b8" : "#64748b"} 
        />
      </View>
      {isExpanded && (
        <AnimatedView 
          entering={FadeIn.duration(300)}
          exiting={FadeIn.duration(200)}
          layout={Layout.springify()}
        >
          {children}
        </AnimatedView>
      )}
    </AnimatedPressable>
  );

  const StatBadge = ({ value, label, color }) => (
    <View className={`items-center p-2 rounded-lg ${
      isDark ? "bg-gray-700" : "bg-gray-100"
    }`} style={{ flex: 1, marginHorizontal: 4, maxWidth: "23%" }}>
      <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20, fontSize: 14 }}>
        {value}
      </ThemedText>
      <ThemedText className="text-xs mt-1" style={{ color, lineHeight: 16 }}>
        {label}
      </ThemedText>
    </View>
  );

  return (
    <ScrollView 
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
    >
      {/* Match Header */}
      <Animated.View 
        entering={FadeIn.duration(600)}
        className={`p-6 ${isDark ? "bg-gray-800" : "bg-blue-50"} items-center`}
      >
        <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-blue-800"} mb-2`} style={{ lineHeight: 20 }}>
          {matchInfo.matchType}
        </ThemedText>
        
        <View className="flex-row justify-center items-center w-full mb-4">
          <View className="items-center flex-1">
            <ThemedText className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 28 }}>
              {matchInfo.team1.name}
            </ThemedText>
            <ThemedText className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 32 }}>
              {matchInfo.team1.score}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              ({matchInfo.team1.overs} Ov)
            </ThemedText>
          </View>
          
          <View className="mx-4 items-center">
            <ThemedText className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 24 }}>
              vs
            </ThemedText>
          </View>
          
          <View className="items-center flex-1">
            <ThemedText className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 28 }}>
              {matchInfo.team2.name}
            </ThemedText>
            <ThemedText className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 32 }}>
              {matchInfo.team2.score}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              ({matchInfo.team2.overs} Ov)
            </ThemedText>
          </View>
        </View>
        
        <Animated.View 
          entering={BounceInDown.delay(200).duration(600)}
          className={`px-4 py-2 rounded-full ${isDark ? "bg-green-800" : "bg-green-100"}`}
        >
          <ThemedText className={`font-bold ${isDark ? "text-green-200" : "text-green-800"}`} style={{ lineHeight: 20 }}>
            {matchInfo.team1.name} {matchInfo.team1.result}
          </ThemedText>
        </Animated.View>
        
        <ThemedText className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
          {matchInfo.venue} • {matchInfo.date}
        </ThemedText>
      </Animated.View>

      {/* Man of the Match */}
      <Animated.View 
        entering={LightSpeedInLeft.delay(300).duration(600)}
        className={`p-6 mx-4 my-6 rounded-2xl border ${
          isDark ? "bg-amber-900/20 border-amber-700" : "bg-amber-100 border-amber-200"
        }`}
        style={{ elevation: 4 }}
      >
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <ThemedText className={`text-sm font-semibold ${
              isDark ? "text-amber-300" : "text-amber-700"
            }`} style={{ lineHeight: 20 }}>
              Player of the Match
            </ThemedText>
            <ThemedText className={`text-2xl font-bold mt-1 ${
              isDark ? "text-white" : "text-gray-900"
            }`} style={{ lineHeight: 32 }}>
              {manOfTheMatch.name}
            </ThemedText>
            <ThemedText className={`mt-1 ${isDark ? "text-amber-200" : "text-amber-800"}`} style={{ lineHeight: 20 }}>
              {manOfTheMatch.team} • {manOfTheMatch.role}
            </ThemedText>
          </View>
          
          <View className={`w-14 h-14 rounded-full items-center justify-center ${
            isDark ? "bg-amber-800" : "bg-amber-200"
          }`}>
            <ThemedText className="text-2xl">{manOfTheMatch.avatar}</ThemedText>
          </View>
        </View>
        
        <View className="flex-row justify-between" style={{ marginHorizontal: -4 }}>
          <StatBadge 
            value={manOfTheMatch.performance.runs} 
            label="Runs" 
            color={isDark ? "#fbbf24" : "#f59e0b"} 
          />
          <StatBadge 
            value={manOfTheMatch.performance.balls} 
            label="Balls" 
            color={isDark ? "#fbbf24" : "#f59e0b"} 
          />
          <StatBadge 
            value={manOfTheMatch.performance.wickets} 
            label="Wickets" 
            color={isDark ? "#fbbf24" : "#f59e0b"} 
          />
          <StatBadge 
            value={manOfTheMatch.performance.economy} 
            label="Economy" 
            color={isDark ? "#fbbf24" : "#f59e0b"} 
          />
        </View>
      </Animated.View>

      {/* Top Performers Section */}
      <View className="px-4 pb-6">
        <ThemedText className={`text-xl font-bold mb-4 px-2 ${
          isDark ? "text-white" : "text-gray-900"
        }`} style={{ lineHeight: 28 }}>
          Top Performers
        </ThemedText>

        {/* Top Batters */}
        <PerformanceCard 
          title="Top Batters"
          isExpanded={expandedSection === 'batters'}
          onPress={() => toggleSection('batters')}
          index={0}
        >
          {topBatters.map((batter, index) => (
            <View
              key={index}
              className={`flex-row justify-between items-center py-3 ${
                index < topBatters.length - 1 ? (isDark ? "border-b border-gray-700" : "border-b border-gray-200") : ""
              }`}
            >
              <View className="flex-1">
                <ThemedText className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                  {batter.name}
                </ThemedText>
                <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                  {batter.team}
                </ThemedText>
              </View>
              
              <View className="flex-row">
                <View className="items-center mr-4">
                  <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                    {batter.runs}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                    Runs
                  </ThemedText>
                </View>
                
                <View className="items-center mr-4">
                  <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                    {batter.sr}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                    SR
                  </ThemedText>
                </View>
                
                <View className="items-center">
                  <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                    {batter.fours}/{batter.sixes}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                    4s/6s
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </PerformanceCard>

        {/* Top Bowlers */}
        <PerformanceCard 
          title="Top Bowlers"
          isExpanded={expandedSection === 'bowlers'}
          onPress={() => toggleSection('bowlers')}
          index={1}
        >
          {topBowlers.map((bowler, index) => (
            <View
              key={index}
              className={`flex-row justify-between items-center py-3 ${
                index < topBowlers.length - 1 ? (isDark ? "border-b border-gray-700" : "border-b border-gray-200") : ""
              }`}
            >
              <View className="flex-1">
                <ThemedText className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                  {bowler.name}
                </ThemedText>
                <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                  {bowler.team}
                </ThemedText>
              </View>
              
              <View className="flex-row">
                <View className="items-center mr-4">
                  <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                    {bowler.wickets}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                    Wkts
                  </ThemedText>
                </View>
                
                <View className="items-center mr-4">
                  <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                    {bowler.runs}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                    Runs
                  </ThemedText>
                </View>
                
                <View className="items-center">
                  <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                    {bowler.economy}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                    Econ
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </PerformanceCard>

        {/* Key Moments */}
        <PerformanceCard 
          title="Key Moments"
          isExpanded={expandedSection === 'moments'}
          onPress={() => toggleSection('moments')}
          index={2}
        >
          {keyMoments.map((moment, index) => (
            <View
              key={index}
              className={`flex-row items-start py-3 ${
                index < keyMoments.length - 1 ? (isDark ? "border-b border-gray-700" : "border-b border-gray-200") : ""
              }`}
            >
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                isDark ? "bg-gray-700" : "bg-gray-100"
              }`}>
                <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                  {moment.over}
                </ThemedText>
              </View>
              
              <View className="flex-1">
                <ThemedText className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                  {moment.description}
                </ThemedText>
                <ThemedText className={`text-xs mt-1 ${
                  moment.type === 'milestone' ? (isDark ? "text-green-400" : "text-green-700") :
                  moment.type === 'breakthrough' ? (isDark ? "text-blue-400" : "text-blue-700") :
                  moment.type === 'wicket' ? (isDark ? "text-red-400" : "text-red-700") :
                  (isDark ? "text-purple-400" : "text-purple-700")
                }`} style={{ lineHeight: 16 }}>
                  {moment.type.charAt(0).toUpperCase() + moment.type.slice(1)}
                </ThemedText>
              </View>
            </View>
          ))}
        </PerformanceCard>
      </View>

      {/* Match Statistics */}
      <Animated.View 
        entering={FlipInXUp.delay(500).duration(600)}
        className={`p-6 mx-4 my-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"}`}
        style={{ elevation: 2 }}
      >
        <ThemedText className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 24 }}>
          Match Statistics
        </ThemedText>
        
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <ThemedText className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`} style={{ lineHeight: 32 }}>
              8
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              Sixes
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className={`text-2xl font-bold ${isDark ? "text-green-400" : "text-green-600"}`} style={{ lineHeight: 32 }}>
              21
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              Fours
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className={`text-2xl font-bold ${isDark ? "text-red-400" : "text-red-600"}`} style={{ lineHeight: 32 }}>
              15
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              Wickets
            </ThemedText>
          </View>
        </View>
        
        <View className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
          <View 
            className="h-full rounded-full bg-blue-500" 
            style={{ width: '65%' }}
          />
        </View>
        <View className="flex-row justify-between mt-1">
          <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
            WF-W 65%
          </ThemedText>
          <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
            BP-W 35%
          </ThemedText>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
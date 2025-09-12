import React, { useState } from "react";
import { View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, { 
  FadeIn, 
  FadeInDown, 
  SlideInRight
} from "react-native-reanimated";
import { 
  Ionicons, 
  MaterialIcons, 
  MaterialCommunityIcons
} from '@expo/vector-icons';
import ThemedText from "../custom/ThemedText";
import { useColorScheme } from "react-native";
import { convertBallToOvers } from "@/utils/Common";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FullScoreCard({
  score,
  isChasing,
  inning_I,
  description,
  isFirstInning,
}) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const [activeTab, setActiveTab] = useState("batting");
  const [activeInning, setActiveInning] = useState(1); // 1 for first inning, 2 for second inning
  
  const isDark = colorScheme === "dark";

  const colors = {
    primary: isDark ? "#3b82f6" : "#2563eb",
    secondary: isDark ? "#fbbf24" : "#f59e0b",
    background: isDark ? "#0f172a" : "#f1f5f9",
    card: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f1f5f9" : "#1e293b",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    muted: isDark ? "#1e293b" : "#f1f5f9",
    mutedForeground: isDark ? "#94a3b8" : "#64748b",
  };

  // Sample data structure for both innings
  const sampleInning1 = {
    batting: {
      battingTeam: "WF-W",
      score: {
        runs: 145,
        wicket: 6,
        over: "20.0",
        CRR: 7.25,
        projectedScore: 160
      },
      isSuperOver: false
    },
    playedBatsman: [
      { id: 1, name: "E Perry", runs: 55, ballsFaced: 43, fours: 6, sixes: 2, sr: 127.91, notOut: false, howOut: "c Taylor b Ismail" },
      { id: 2, name: "A Healy", runs: 42, ballsFaced: 32, fours: 5, sixes: 1, sr: 131.25, notOut: false, howOut: "b Schutt" },
      { id: 3, name: "B Mooney", runs: 28, ballsFaced: 24, fours: 3, sixes: 0, sr: 116.67, notOut: true },
    ],
    extras: 12,
    batsmanUpcoming: [
      { id: 4, name: "A Gardner" },
      { id: 5, name: "A Sutherland" }
    ],
    bowling: {
      allBowlers: [
        { id: 6, name: "S Ismail", over: 4.0, maiden: 1, runsGiven: 28, wicketsTaken: 2, eco: 7.00 },
        { id: 7, name: "M Schutt", over: 4.0, maiden: 0, runsGiven: 32, wicketsTaken: 1, eco: 8.00 },
        { id: 8, name: "M Taylor", over: 3.2, maiden: 0, runsGiven: 26, wicketsTaken: 0, eco: 7.80 },
      ]
    },
    fallOfWickets: [
      { batsman: { id: 2, name: "A Healy" }, teamRuns: 42, teamOvers: "5.3" },
      { batsman: { id: 1, name: "E Perry" }, teamRuns: 98, teamOvers: "14.1" },
    ],
    inningNumber: 1,
    description: "WF-W 1st Innings"
  };

  const sampleInning2 = {
    batting: {
      battingTeam: "BP-W",
      score: {
        runs: 105,
        wicket: 9,
        over: "20.0",
        CRR: 5.25,
        projectedScore: 0
      },
      isSuperOver: false
    },
    playedBatsman: [
      { id: 9, name: "S Devine", runs: 38, ballsFaced: 35, fours: 4, sixes: 0, sr: 108.57, notOut: false, howOut: "c Healy b Perry" },
      { id: 10, name: "S Bates", runs: 24, ballsFaced: 28, fours: 2, sixes: 0, sr: 85.71, notOut: false, howOut: "b Sutherland" },
      { id: 11, name: "A Kerr", runs: 18, ballsFaced: 20, fours: 1, sixes: 0, sr: 90.00, notOut: true },
    ],
    extras: 8,
    batsmanUpcoming: [
      { id: 12, name: "L Tahuhu" }
    ],
    bowling: {
      allBowlers: [
        { id: 13, name: "E Perry", over: 4.0, maiden: 0, runsGiven: 22, wicketsTaken: 2, eco: 5.50 },
        { id: 14, name: "A Sutherland", over: 4.0, maiden: 1, runsGiven: 18, wicketsTaken: 3, eco: 4.50 },
        { id: 15, name: "J Jonassen", over: 3.0, maiden: 0, runsGiven: 20, wicketsTaken: 1, eco: 6.67 },
      ]
    },
    fallOfWickets: [
      { batsman: { id: 10, name: "S Bates" }, teamRuns: 45, teamOvers: "8.2" },
      { batsman: { id: 9, name: "S Devine" }, teamRuns: 82, teamOvers: "16.5" },
    ],
    inningNumber: 2,
    description: "BP-W 2nd Innings - Target: 146"
  };

  // Use provided score or sample data
  const inning1Data = inning_I || sampleInning1;
  const inning2Data = score || sampleInning2;
  
  const currentInning = activeInning === 1 ? inning1Data : inning2Data;
  const isSecondInningComplete = inning2Data.batting.score.wicket === 9 || 
                                 inning2Data.batting.score.over === "20.0";

  // Function to get batsman description
  const getBatsmenDescription = (player) => {
    if (player.notOut) return "not out";
    if (player.howOut) return player.howOut;
    return "";
  };

  const redirectToPlayerProfile = (player) => {
    // Navigate to player profile
    console.log("Navigate to player profile:", player.id);
  };

  const InningButton = ({ inningNumber, isActive }) => (
    <Pressable
      onPress={() => setActiveInning(inningNumber)}
      className={`flex-1 py-3 rounded-lg mx-1 items-center ${
        isActive 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700" : "bg-gray-200")
      }`}
    >
      <ThemedText className={`font-medium ${
        isActive ? "text-white" : (isDark ? "text-gray-300" : "text-gray-700")
      }`}>
        Inning {inningNumber}
      </ThemedText>
    </Pressable>
  );

  const TabButton = ({ value, label, isActive }) => (
    <Pressable
      onPress={() => setActiveTab(value)}
      className={`flex-1 py-2 rounded-lg mx-1 items-center ${
        isActive 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700" : "bg-gray-200")
      }`}
    >
      <ThemedText className={`text-sm font-medium ${
        isActive ? "text-white" : (isDark ? "text-gray-300" : "text-gray-700")
      }`}>
        {label}
      </ThemedText>
    </Pressable>
  );

  const TableHeaderCell = ({ children, width }) => (
    <View className={`py-2 ${width || "flex-1"} items-center`}>
      <ThemedText className={`text-xs font-bold ${
        isDark ? "text-gray-300" : "text-gray-600"
      }`}>
        {children}
      </ThemedText>
    </View>
  );

  const TableCell = ({ children, width, center = true }) => (
    <View className={`py-2 ${width || "flex-1"} ${center ? "items-center" : ""}`}>
      <ThemedText className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
        {children}
      </ThemedText>
    </View>
  );

  return (
    <ScrollView 
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
    >
      {/* Inning Selection */}
      <View className={`mx-4 mt-4 p-1 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
        <View className="flex-row">
          <InningButton inningNumber={1} isActive={activeInning === 1} />
          <InningButton inningNumber={2} isActive={activeInning === 2} />
        </View>
      </View>

      {/* Match Header */}
      <Animated.View 
        entering={FadeIn.duration(600)}
        className={`p-4 ${isDark ? "bg-gray-800" : "bg-blue-50"} rounded-lg mx-4 my-4`}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <View className="flex-row items-center">
              <ThemedText className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {currentInning.batting.battingTeam}
              </ThemedText>
              {currentInning.batting.isSuperOver && (
                <View className={`ml-2 px-2 py-1 rounded-full ${isDark ? "bg-red-800" : "bg-red-100"}`}>
                  <ThemedText className={`text-xs ${isDark ? "text-red-100" : "text-red-800"}`}>
                    Super Over
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
              {currentInning.description}
            </ThemedText>
          </View>

          <View className="items-end">
            <ThemedText className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {currentInning.batting.score.runs}
              <ThemedText className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                /{currentInning.batting.score.wicket}
              </ThemedText>
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
              {currentInning.batting.score.over} Ov
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              CRR: {currentInning.batting.score.CRR}
            </ThemedText>
            {activeInning === 2 && !isSecondInningComplete && currentInning.batting.score.projectedScore && (
              <ThemedText className={`text-sm ${isDark ? "text-green-400" : "text-green-600"} mt-1`}>
                Proj: {currentInning.batting.score.projectedScore}
              </ThemedText>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Match Result Banner for Completed 2nd Inning */}
      {activeInning === 2 && isSecondInningComplete && (
        <Animated.View 
          entering={FadeInDown.duration(500)}
          className={`mx-4 p-3 rounded-lg ${isDark ? "bg-green-800" : "bg-green-100"} mb-4`}
        >
          <ThemedText className={`text-center font-bold ${isDark ? "text-green-100" : "text-green-800"}`}>
            {inning1Data.batting.battingTeam} won by {inning1Data.batting.score.runs - inning2Data.batting.score.runs} runs
          </ThemedText>
        </Animated.View>
      )}

      {/* Tabs */}
      <View className={`mx-4 mb-4 p-1 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
        <View className="flex-row">
          <TabButton value="batting" label="Batting" isActive={activeTab === "batting"} />
          <TabButton value="bowling" label="Bowling" isActive={activeTab === "bowling"} />
        </View>
      </View>

      {/* Batting Tab Content */}
      {activeTab === "batting" && (
        <Animated.View 
          entering={SlideInRight.duration(500)}
          className="mx-4 mb-4"
        >
          {/* Batting Table Header */}
          <View className={`flex-row rounded-t-lg p-2 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
            <TableHeaderCell width="w-2/5">Batter</TableHeaderCell>
            <TableHeaderCell>R</TableHeaderCell>
            <TableHeaderCell>B</TableHeaderCell>
            <TableHeaderCell>4s</TableHeaderCell>
            <TableHeaderCell>6s</TableHeaderCell>
            <TableHeaderCell>SR</TableHeaderCell>
          </View>

          {/* Batting Table Rows */}
          {currentInning.playedBatsman.map((player, index) => (
            <View 
              key={player.id} 
              className={`flex-row p-2 border-b ${
                isDark ? "border-gray-700" : "border-gray-200"
              } ${index % 2 === 0 ? (isDark ? "bg-gray-800" : "bg-white") : (isDark ? "bg-gray-900" : "bg-gray-50")}`}
            >
              <TableCell width="w-2/5" center={false}>
                <Pressable onPress={() => redirectToPlayerProfile(player)}>
                  <ThemedText className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {player.name}
                    {player.notOut && (
                      <ThemedText className={isDark ? "text-green-400" : "text-green-600"}>*</ThemedText>
                    )}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {getBatsmenDescription(player)}
                  </ThemedText>
                </Pressable>
              </TableCell>
              <TableCell>{player.runs}</TableCell>
              <TableCell>{player.ballsFaced}</TableCell>
              <TableCell>{player.fours}</TableCell>
              <TableCell>{player.sixes}</TableCell>
              <TableCell>{player.sr}</TableCell>
            </View>
          ))}

          {/* Additional Stats */}
          <View className="flex-row mt-4">
            <View className={`flex-1 p-3 rounded-lg mr-2 ${isDark ? "bg-gray-800" : "bg-white"}`}>
              <View className="flex-row justify-between items-center">
                <ThemedText className={isDark ? "text-gray-400" : "text-gray-600"}>
                  Extras
                </ThemedText>
                <ThemedText className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {currentInning.extras || 0}
                </ThemedText>
              </View>
            </View>

            {currentInning.batsmanUpcoming && currentInning.batsmanUpcoming.length > 0 && (
              <View className={`flex-1 p-3 rounded-lg ml-2 ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mb-1`}>
                  Yet to Bat
                </ThemedText>
                <View className="flex-row flex-wrap">
                  {currentInning.batsmanUpcoming.map((player, index) => (
                    <Pressable 
                      key={player.id} 
                      onPress={() => redirectToPlayerProfile(player)}
                      className="mr-1"
                    >
                      <ThemedText className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                        {player.name}
                        {index < currentInning.batsmanUpcoming.length - 1 ? "," : ""}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Bowling Tab Content */}
      {activeTab === "bowling" && (
        <Animated.View 
          entering={SlideInRight.duration(500)}
          className="mx-4 mb-4"
        >
          {/* Bowling Table Header */}
          <View className={`flex-row rounded-t-lg p-2 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
            <TableHeaderCell width="w-2/5">Bowler</TableHeaderCell>
            <TableHeaderCell>O</TableHeaderCell>
            <TableHeaderCell>M</TableHeaderCell>
            <TableHeaderCell>R</TableHeaderCell>
            <TableHeaderCell>W</TableHeaderCell>
            <TableHeaderCell>ECO</TableHeaderCell>
          </View>

          {/* Bowling Table Rows */}
          {currentInning.bowling.allBowlers.map((player, index) => (
            <View 
              key={player.id} 
              className={`flex-row p-2 border-b ${
                isDark ? "border-gray-700" : "border-gray-200"
              } ${index % 2 === 0 ? (isDark ? "bg-gray-800" : "bg-white") : (isDark ? "bg-gray-900" : "bg-gray-50")}`}
            >
              <TableCell width="w-2/5" center={false}>
                <Pressable onPress={() => redirectToPlayerProfile(player)}>
                  <ThemedText className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {player.name}
                  </ThemedText>
                </Pressable>
              </TableCell>
              <TableCell>{player.over}</TableCell>
              <TableCell>{player.maiden}</TableCell>
              <TableCell>{player.runsGiven}</TableCell>
              <TableCell>{player.wicketsTaken}</TableCell>
              <TableCell>{player.eco}</TableCell>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Fall of Wickets */}
      {currentInning.fallOfWickets && currentInning.fallOfWickets.length > 0 && (
        <Animated.View 
          entering={FadeInDown.duration(500)}
          className={`mx-4 p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-white"} mb-6`}
        >
          <ThemedText className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Fall of Wickets
          </ThemedText>
          
          <View className="flex-row flex-wrap">
            {currentInning.fallOfWickets.map((wicket, i) => (
              <View key={i} className="w-1/2 mb-2">
                <View className="flex-row justify-between items-center pr-2">
                  <Pressable onPress={() => redirectToPlayerProfile(wicket.batsman)}>
                    <ThemedText className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                      {i + 1}. {wicket.batsman.name}
                    </ThemedText>
                  </Pressable>
                  <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {wicket.teamRuns} ({wicket.teamOvers})
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}
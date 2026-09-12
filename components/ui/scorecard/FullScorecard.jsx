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
import PlayerAvatar from "../custom/PlayerAvatar";
import { useColorScheme } from "react-native";
import { convertBallToOvers, getBatsmenDescription, calculateCRR } from "@/utils/Common";
import SCREENS from "@/screens";

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

  const emptyInning = {
    batting: {
      battingTeam: "Team",
      score: {
        runs: 0,
        wicket: 0,
        over: "0.0",
        CRR: "0.00",
        projectedScore: 0
      },
      isSuperOver: false
    },
    playedBatsman: [],
    extras: 0,
    batsmanUpcoming: [],
    bowling: {
      allBowlers: []
    },
    fallOfWickets: [],
    inningNumber: 1,
    description: ""
  };

  const getInningData = (rawInning, fallbackTeam) => {
    if (!rawInning) return { ...emptyInning, batting: { ...emptyInning.batting, battingTeam: fallbackTeam } };
    const innRuns = rawInning.batting?.score?.runs ?? rawInning.score?.runs ?? rawInning.runs ?? 0;
    const innOvers = rawInning.batting?.score?.over ?? rawInning.score?.over ?? rawInning.overs ?? "0.0";
    const computedCRR = calculateCRR(innRuns, innOvers);

    return {
      batting: {
        battingTeam: rawInning.batting?.battingTeam || rawInning.battingTeam || fallbackTeam,
        score: {
          runs: innRuns,
          wicket: rawInning.batting?.score?.wicket ?? rawInning.score?.wicket ?? rawInning.wickets ?? 0,
          over: innOvers,
          CRR: (computedCRR !== "0.00" ? computedCRR : (rawInning.batting?.score?.CRR ?? rawInning.score?.CRR ?? "0.00")),
          projectedScore: rawInning.batting?.score?.projectedScore ?? rawInning.score?.projectedScore ?? 0,
        },
        isSuperOver: rawInning.isSuperOver || false,
      },
      playedBatsman: Array.isArray(rawInning.playedBatsman) ? rawInning.playedBatsman : (Array.isArray(rawInning.batsman) ? rawInning.batsman : []),
      extras: rawInning.extras ?? 0,
      batsmanUpcoming: (Array.isArray(rawInning.batsmanUpcoming) && rawInning.batsmanUpcoming.length > 0)
        ? rawInning.batsmanUpcoming
        : (Array.isArray(score?.batsmanUpcoming) ? score.batsmanUpcoming : []),
      bowling: {
        allBowlers: Array.isArray(rawInning.bowling?.allBowlers) ? rawInning.bowling.allBowlers : (Array.isArray(rawInning.bowling?.bowlers) ? rawInning.bowling.bowlers : (Array.isArray(rawInning.bowlers) ? rawInning.bowlers : [])),
      },
      fallOfWickets: Array.isArray(rawInning.fallOfWickets) ? rawInning.fallOfWickets : [],
      inningNumber: rawInning.inningNumber || 1,
      description: rawInning.description || "",
    };
  };

  const inningsList = Array.isArray(score?.inning) && score.inning.length > 0
    ? score.inning.map((inn, idx) => ({
        number: idx + 1,
        label: inn?.isSuperOver ? `Super Over ${Math.ceil((idx + 1) / 2)}` : `Inning ${idx + 1}`,
        data: getInningData(inn, score?.teams?.[idx % 2]?.title || `Inning ${idx + 1}`)
      }))
    : [
        {
          number: 1,
          label: "Inning 1",
          data: getInningData(inning_I || score, score?.teams?.[0]?.title || "Inning 1")
        }
      ];

  const selectedInningObj = inningsList.find(i => i.number === activeInning) || inningsList[0];
  const currentInning = selectedInningObj?.data || emptyInning;

  const isSecondInningComplete = (inningsList[1]?.data?.batting?.score?.wicket >= 10) || 
                                 (inningsList[1]?.data?.batting?.score?.over === "20.0");

  const redirectToPlayerProfile = (player) => {
    if (!player) return;
    const playerId = player?.playerId || player?.id || player?._id;
    navigation.navigate(SCREENS.PlayerProfile, {
      player: typeof player === "object" ? player : { name: player },
      playerId: playerId,
      matchId: score?._id || score?.id,
      match: score,
    });
  };

  const InningButton = ({ inningNumber, label, isActive }) => (
    <Pressable
      onPress={() => setActiveInning(inningNumber)}
      className={`py-2 px-4 rounded-lg mx-1 items-center flex-1 ${
        isActive 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700" : "bg-gray-200")
      }`}
    >
      <ThemedText className={`font-medium text-center ${
        isActive ? "text-white" : (isDark ? "text-gray-300" : "text-gray-700")
      }`}>
        {label || `Inning ${inningNumber}`}
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
      {inningsList.length > 1 && (
        <View className={`mx-4 mt-4 p-1 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {inningsList.map((item) => (
              <InningButton
                key={item.number}
                inningNumber={item.number}
                label={item.label}
                isActive={activeInning === item.number}
              />
            ))}
          </ScrollView>
        </View>
      )}

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
          {(currentInning?.playedBatsman || []).length > 0 ? (
            currentInning.playedBatsman.map((player, index) => (
              <View 
                key={player?.id || player?._id || player?.playerId || index} 
                className={`flex-row p-2 border-b ${
                  isDark ? "border-gray-700" : "border-gray-200"
                } ${index % 2 === 0 ? (isDark ? "bg-gray-800" : "bg-white") : (isDark ? "bg-gray-900" : "bg-gray-50")}`}
              >
                <TableCell width="w-2/5" center={false}>
                  <Pressable onPress={() => redirectToPlayerProfile(player)} className="flex-row items-center">
                    <PlayerAvatar player={player} size={28} className="mr-2" />
                    <View className="flex-1">
                      <ThemedText className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {player?.name || player?.username || player?.playerName || "Batter"}
                        {player?.notOut && (
                          <ThemedText className={isDark ? "text-green-400" : "text-green-600"}>*</ThemedText>
                        )}
                      </ThemedText>
                      <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} numberOfLines={1}>
                        {getBatsmenDescription(player)}
                      </ThemedText>
                    </View>
                  </Pressable>
                </TableCell>
                <TableCell>{player?.runs ?? 0}</TableCell>
                <TableCell>{player?.ballsFaced ?? player?.balls ?? 0}</TableCell>
                <TableCell>{player?.fours ?? 0}</TableCell>
                <TableCell>{player?.sixes ?? 0}</TableCell>
                <TableCell>{player?.sr ?? "0.00"}</TableCell>
              </View>
            ))
          ) : (
            <View className="py-4 items-center">
              <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                No batting data available
              </ThemedText>
            </View>
          )}

          {/* Additional Stats */}
          <View className="flex-row mt-4">
            <View className={`flex-1 p-3 rounded-lg mr-2 ${isDark ? "bg-gray-800" : "bg-white"}`}>
              <View className="flex-row justify-between items-center">
                <ThemedText className={isDark ? "text-gray-400" : "text-gray-600"}>
                  Extras
                </ThemedText>
                <ThemedText className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {currentInning?.extras || 0}
                </ThemedText>
              </View>
            </View>

            {Array.isArray(currentInning?.batsmanUpcoming) && currentInning.batsmanUpcoming.length > 0 && (
              <View className={`flex-1 p-3 rounded-lg ml-2 ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mb-1`}>
                  Yet to Bat
                </ThemedText>
                <View className="flex-row flex-wrap">
                  {currentInning.batsmanUpcoming.map((player, index) => {
                    const upcomingName = typeof player === "string" 
                      ? player 
                      : (player?.name || player?.username || player?.playerName || "Player");
                    return (
                      <Pressable 
                        key={player?.id || player?._id || player?.playerId || index} 
                        onPress={() => redirectToPlayerProfile(player)}
                        className="mr-1.5 mb-1"
                      >
                        <ThemedText className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                          {upcomingName}
                          {index < currentInning.batsmanUpcoming.length - 1 ? "," : ""}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
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
          {(currentInning?.bowling?.allBowlers || []).length > 0 ? (
            currentInning.bowling.allBowlers.map((player, index) => (
              <View 
                key={player?.id || player?._id || player?.playerId || index} 
                className={`flex-row p-2 border-b ${
                  isDark ? "border-gray-700" : "border-gray-200"
                } ${index % 2 === 0 ? (isDark ? "bg-gray-800" : "bg-white") : (isDark ? "bg-gray-900" : "bg-gray-50")}`}
              >
                <TableCell width="w-2/5" center={false}>
                  <Pressable 
                    onPress={() => redirectToPlayerProfile(player)}
                    className="flex-row items-center"
                  >
                    <PlayerAvatar player={player} size={28} className="mr-2" />
                    <View className="flex-1">
                      <ThemedText className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                        {player?.name || player?.username || player?.playerName || "Bowler"}
                      </ThemedText>
                    </View>
                  </Pressable>
                </TableCell>
                <TableCell>{player?.over ?? "0.0"}</TableCell>
                <TableCell>{player?.maiden ?? 0}</TableCell>
                <TableCell>{player?.runsGiven ?? player?.runs ?? 0}</TableCell>
                <TableCell>{player?.wicketsTaken ?? player?.wickets ?? 0}</TableCell>
                <TableCell>{player?.eco ?? "0.00"}</TableCell>
              </View>
            ))
          ) : (
            <View className="py-4 items-center">
              <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                No bowling data available
              </ThemedText>
            </View>
          )}
        </Animated.View>
      )}

      {/* Fall of Wickets */}
      {Array.isArray(currentInning?.fallOfWickets) && currentInning.fallOfWickets.length > 0 && (
        <Animated.View 
          entering={FadeInDown.duration(500)}
          className={`mx-4 p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-white"} mb-6`}
        >
          <ThemedText className={`font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Fall of Wickets
          </ThemedText>
          
          <View className="flex-row flex-wrap">
            {currentInning.fallOfWickets.map((wicket, i) => {
              const batsmanName = typeof wicket?.batsman === "string" 
                ? wicket.batsman 
                : (wicket?.batsman?.name || wicket?.batsman?.username || wicket?.batsman?.playerName || "Wicket");
              const bowlerName = typeof wicket?.bowler === "string" 
                ? wicket.bowler 
                : (wicket?.bowler?.name || wicket?.bowler?.username || wicket?.bowler?.playerName || "");

              return (
                <View key={i} className="w-1/2 mb-2">
                  <View className="flex-row justify-between items-center pr-2">
                    <Pressable onPress={() => redirectToPlayerProfile(wicket?.batsman)}>
                      <ThemedText className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                        {i + 1}. {batsmanName}
                      </ThemedText>
                      {bowlerName ? (
                        <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          b {bowlerName}
                        </ThemedText>
                      ) : null}
                    </Pressable>
                    <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {wicket?.teamRuns ?? 0} ({wicket?.teamOvers ?? "0.0"})
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}
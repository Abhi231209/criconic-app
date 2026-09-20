import React, { useState, useEffect } from "react";
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
import {
  convertBallToOvers,
  getBatsmenDescription,
  calculateCRR, MATCH_STATUS,
  resolvePlayerDisplayName,
  isMongoObjectId,
} from "@/utils/Common";
import SCREENS from "@/screens";
import WagonPitchViewerModal from "../createMatch/WagonPitchViewerModal";
import analytics from "@/utils/analytics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FullScoreCard({
  score,
  isChasing,
  inning_I,
  description,
  matchId,
}) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const [activeTab, setActiveTab] = useState("batting");
  const [activeInning, setActiveInning] = useState(isChasing ? 2 : 1); // defaults to whichever innings is currently live

  // Keep the displayed innings in sync with the match's live innings (e.g. when
  // the match transitions from 1st to 2nd innings while this screen is open).
  useEffect(() => {
    setActiveInning(isChasing ? 2 : 1);
  }, [isChasing]);
  const [trackerModalVisible, setTrackerModalVisible] = useState(false);
  const [trackerModalTab, setTrackerModalTab] = useState("wagon");
  const [trackerModalRole, setTrackerModalRole] = useState("all");
  const [selectedTrackerPlayer, setSelectedTrackerPlayer] = useState(null);

  // Build comprehensive player lookup map to prevent raw ObjectIds from leaking
  const playerMap = React.useMemo(() => {
    const map = new Map();
    const add = (p) => {
      if (!p) return;
      const id = String(p?.playerId || p?._id || p?.id || (typeof p === "string" && isMongoObjectId(p) ? p : ""));
      const name = typeof p === "string" ? (!isMongoObjectId(p) ? p : "") : (p?.name || p?.username || p?.playerName);
      if (id && name && !isMongoObjectId(name)) {
        map.set(id, String(name).trim());
      }
    };

    (score?.teams || []).forEach((t) => (t?.players || []).forEach(add));
    (score?.squads || []).forEach((s) => (s?.players || []).forEach(add));
    (score?.inning || []).forEach((inn) => {
      (inn?.playedBatsman || []).forEach(add);
      (inn?.batsman || []).forEach(add);
      (inn?.batsmanUpcoming || []).forEach(add);
      (inn?.bowling?.allBowlers || []).forEach(add);
      (inn?.bowling?.bowlers || []).forEach(add);
      (inn?.bowlers || []).forEach(add);
    });
    add(score?.bowler);
    (score?.bowling?.lastTwoBowlers || []).forEach(add);
    (score?.bowling?.allBowlers || []).forEach(add);
    return map;
  }, [score]);

  const handleBatsmanPress = (player) => {
    const pid = player?.playerId || player?._id || player?.id || "";
    analytics.logVisualizerView("wagon_wheel", pid, score?._id || score?.id, {
      player_name: resolvePlayerDisplayName(player, playerMap) || "",
      role: "batsman",
    });
    setSelectedTrackerPlayer(player);
    setTrackerModalTab("wagon");
    setTrackerModalRole("batsman");
    setTrackerModalVisible(true);
  };

  const handleBowlerPress = (player) => {
    const pid = player?.playerId || player?._id || player?.id || "";
    analytics.logVisualizerView("pitch_map", pid, score?._id || score?.id, {
      player_name: resolvePlayerDisplayName(player, playerMap) || "",
      role: "bowler",
    });
    setSelectedTrackerPlayer(player);
    setTrackerModalTab("pitch");
    setTrackerModalRole("bowler");
    setTrackerModalVisible(true);
  };
  
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

  const getInningData = (rawInning, fallbackTeam, inningIdx = 0) => {
    if (!rawInning) return { ...emptyInning, batting: { ...emptyInning.batting, battingTeam: fallbackTeam } };

    const innRuns =
      rawInning.batting?.score?.runs ??
      rawInning.score?.runs ??
      rawInning.totalRuns ??
      rawInning.runs ??
      0;
    const innOvers =
      rawInning.batting?.score?.over ??
      rawInning.score?.over ??
      rawInning.totalOvers ??
      rawInning.overs ??
      "0.0";
    const innWickets =
      rawInning.batting?.score?.wicket ??
      rawInning.score?.wicket ??
      rawInning.totalWickets ??
      rawInning.wickets ??
      0;

    const computedCRR = calculateCRR(innRuns, innOvers);
    const isSuperOver = Boolean(
      rawInning.isSuperOver ||
      rawInning.batting?.isSuperOver ||
      rawInning.isSuperOverInning ||
      (typeof inningIdx === "number" && inningIdx >= 2)
    );

    const battingTeamTitle =
      rawInning.batting?.battingTeam ||
      score?.teams?.find(t => String(t.teamId || t._id || t.id) === String(rawInning.battingTeam))?.title ||
      score?.teams?.find(t => String(t.teamId || t._id || t.id) === String(rawInning.battingId))?.title ||
      rawInning.battingTeam ||
      fallbackTeam;

    const rawBatsmen =
      (Array.isArray(rawInning.playedBatsman) && rawInning.playedBatsman.length > 0)
        ? rawInning.playedBatsman
        : (Array.isArray(rawInning.batsman) && rawInning.batsman.length > 0)
        ? rawInning.batsman
        : (Array.isArray(rawInning.batting?.batsman) ? rawInning.batting.batsman : []);

    const rawBowlers =
      (Array.isArray(rawInning.bowling?.allBowlers) && rawInning.bowling.allBowlers.length > 0)
        ? rawInning.bowling.allBowlers
        : (Array.isArray(rawInning.bowling?.bowlers) && rawInning.bowling.bowlers.length > 0)
        ? rawInning.bowling.bowlers
        : (Array.isArray(rawInning.bowlers) && rawInning.bowlers.length > 0)
        ? rawInning.bowlers
        : [];

    return {
      batting: {
        battingTeam: battingTeamTitle,
        score: {
          runs: innRuns,
          wicket: innWickets,
          over: innOvers,
          CRR: (computedCRR !== "0.00" ? computedCRR : (rawInning.batting?.score?.CRR ?? rawInning.score?.CRR ?? "0.00")),
          projectedScore: rawInning.batting?.score?.projectedScore ?? rawInning.score?.projectedScore ?? 0,
        },
        isSuperOver: isSuperOver,
      },
      playedBatsman: rawBatsmen,
      extras: rawInning.extras ?? 0,
      batsmanUpcoming: (Array.isArray(rawInning.batsmanUpcoming) && rawInning.batsmanUpcoming.length > 0)
        ? rawInning.batsmanUpcoming
        : (Array.isArray(score?.batsmanUpcoming) ? score.batsmanUpcoming : []),
      bowling: {
        allBowlers: rawBowlers,
      },
      fallOfWickets: Array.isArray(rawInning.fallOfWickets) ? rawInning.fallOfWickets : [],
      inningNumber: rawInning.inningNumber || (inningIdx + 1),
      description: rawInning.description || "",
    };
  };

  let superOverCounter = 0;
  const resolvedInningsList = (() => {
    if (Array.isArray(score?.inning) && score.inning.length > 0) {
      return score.inning.map((inn, idx) => {
        const fallbackInning = idx === 0 ? (score?.innings_1 || score?.score?.innings_1) : (score?.innings_2 || score?.score?.innings_2);
        return fallbackInning ? { ...fallbackInning, ...inn } : inn;
      });
    }
    const raw1 = score?.innings_1 || score?.score?.innings_1 || inning_I;
    const raw2 = score?.innings_2 || score?.score?.innings_2;
    const list = [];
    if (raw1) list.push(raw1);
    if (raw2 && (raw2.totalRuns || raw2.totalOvers || raw2.batsman?.length || raw2.score?.runs)) list.push(raw2);
    if (list.length === 0 && score) list.push(score);
    return list;
  })();

  const inningsList = resolvedInningsList.map((inn, idx) => {
    const isSuperOver = Boolean(
      inn?.isSuperOver ||
      inn?.batting?.isSuperOver ||
      inn?.isSuperOverInning ||
      idx >= 2
    );
    let label = `Inning ${idx + 1}`;
    if (isSuperOver) {
      superOverCounter += 1;
      label = `Super Over ${superOverCounter}`;
    }
    const fallbackTeamName = score?.teams?.[idx % 2]?.title || score?.teams?.[idx % 2]?.name || (isSuperOver ? `Super Over ${superOverCounter}` : `Inning ${idx + 1}`);
    return {
      number: idx + 1,
      label,
      data: getInningData(inn, fallbackTeamName, idx)
    };
  });

  const selectedInningObj = inningsList.find(i => i.number === activeInning) || inningsList[0];
  const currentInning = selectedInningObj?.data || emptyInning;

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
      onPress={() => {
        analytics.logAction("switch_inning", "scorecard", { inning_number: inningNumber });
        setActiveInning(inningNumber);
      }}
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
      onPress={() => {
        analytics.logTabChange(value, "scorecard_tabs");
        setActiveTab(value);
      }}
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
            {activeInning === 1 && currentInning.batting.score.projectedScore && (
              <ThemedText className={`text-sm ${isDark ? "text-green-400" : "text-green-600"} mt-1`}>
                Proj: {currentInning.batting.score.projectedScore}
              </ThemedText>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Match Result Banner */}
      {score?.matchCurrentStatus === MATCH_STATUS.MATCH_ENDED && description ? (
        <Animated.View
          entering={FadeInDown.duration(500)}
          className={`mx-4 p-3 rounded-lg ${isDark ? "bg-green-800" : "bg-green-100"} mb-4`}
        >
          <ThemedText className={`text-center font-bold ${isDark ? "text-green-100" : "text-green-800"}`}>
            {description}
          </ThemedText>
        </Animated.View>
      ) : null}

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
            <View className="w-5" />
          </View>

          {/* Batting Table Rows */}
          {(currentInning?.playedBatsman || []).length > 0 ? (
            currentInning.playedBatsman.map((player, index) => (
              <Pressable 
                key={player?.id || player?._id || player?.playerId || index} 
                onPress={() => handleBatsmanPress(player)}
                className={`flex-row items-center p-2 border-b ${
                  isDark ? "border-gray-700" : "border-gray-200"
                } ${index % 2 === 0 ? (isDark ? "bg-gray-800" : "bg-white") : (isDark ? "bg-gray-900" : "bg-gray-50")}`}
              >
                <TableCell width="w-2/5" center={false}>
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        redirectToPlayerProfile(player);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <PlayerAvatar player={player} size={28} className="mr-2" />
                    </Pressable>
                    <View className="flex-1 pr-1">
                      <ThemedText className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {resolvePlayerDisplayName(player, playerMap) || "Batter"}
                        {player?.notOut && (
                          <ThemedText className={isDark ? "text-green-400" : "text-green-600"}>*</ThemedText>
                        )}
                      </ThemedText>
                      <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} numberOfLines={1}>
                        {getBatsmenDescription(player, playerMap)}
                      </ThemedText>
                    </View>
                  </View>
                </TableCell>
                <TableCell>{player?.runs ?? 0}</TableCell>
                <TableCell>{player?.ballsFaced ?? player?.balls ?? 0}</TableCell>
                <TableCell>{player?.fours ?? 0}</TableCell>
                <TableCell>{player?.sixes ?? 0}</TableCell>
                <TableCell>{player?.sr ?? "0.00"}</TableCell>
                <View className="w-5 items-center justify-center">
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isDark ? "#94A3B8" : "#64748B"}
                  />
                </View>
              </Pressable>
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
            <View className="w-5" />
          </View>

          {/* Bowling Table Rows */}
          {(currentInning?.bowling?.allBowlers || []).length > 0 ? (
            currentInning.bowling.allBowlers.map((player, index) => (
              <Pressable 
                key={player?.id || player?._id || player?.playerId || index} 
                onPress={() => handleBowlerPress(player)}
                className={`flex-row items-center p-2 border-b ${
                  isDark ? "border-gray-700" : "border-gray-200"
                } ${index % 2 === 0 ? (isDark ? "bg-gray-800" : "bg-white") : (isDark ? "bg-gray-900" : "bg-gray-50")}`}
              >
                <TableCell width="w-2/5" center={false}>
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        redirectToPlayerProfile(player);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <PlayerAvatar player={player} size={28} className="mr-2" />
                    </Pressable>
                    <View className="flex-1 pr-1">
                      <ThemedText className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                        {resolvePlayerDisplayName(player, playerMap) || "Bowler"}
                      </ThemedText>
                    </View>
                  </View>
                </TableCell>
                <TableCell>{player?.over ?? "0.0"}</TableCell>
                <TableCell>{player?.maiden ?? 0}</TableCell>
                <TableCell>{player?.runsGiven ?? player?.runs ?? 0}</TableCell>
                <TableCell>{player?.wicketsTaken ?? player?.wickets ?? 0}</TableCell>
                <TableCell>{player?.eco ?? "0.00"}</TableCell>
                <View className="w-5 items-center justify-center">
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isDark ? "#94A3B8" : "#64748B"}
                  />
                </View>
              </Pressable>
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

      {/* Fall of Wickets with Delivery Detail */}
      {Array.isArray(currentInning?.fallOfWickets) && currentInning.fallOfWickets.length > 0 && (
        <Animated.View 
          entering={FadeInDown.duration(500)}
          className={`mx-4 p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-white"} mb-6`}
        >
          <View className="flex-row items-center justify-between mb-3">
            <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Fall of Wickets
            </ThemedText>
          </View>
          
          <View className="flex-row flex-wrap">
            {currentInning.fallOfWickets.map((wicket, i) => {
              const batsmanName = resolvePlayerDisplayName(wicket?.batsman, playerMap) || "Batter";
              const bowlerName = resolvePlayerDisplayName(wicket?.bowler, playerMap);

              return (
                <View
                  key={i}
                  className={`w-full mb-2 p-2.5 rounded-xl border ${
                    isDark ? "bg-gray-750/70 border-gray-700" : "bg-gray-50/90 border-gray-200"
                  }`}
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1 pr-2">
                      <ThemedText className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {i + 1}. {batsmanName}
                      </ThemedText>
                      {bowlerName ? (
                        <ThemedText className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          b {bowlerName}
                        </ThemedText>
                      ) : null}
                    </View>
                    <View className="items-end">
                      <ThemedText className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {wicket?.teamRuns ?? 0}
                      </ThemedText>
                      <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        ({wicket?.teamOvers ?? "0.0"} ov)
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Wagon Wheel & Pitch Map Bottom Sheet Modal for Player */}
      <WagonPitchViewerModal
        visible={trackerModalVisible}
        onClose={() => setTrackerModalVisible(false)}
        initialTab={trackerModalTab}
        initialPlayer={selectedTrackerPlayer}
        playerRole={trackerModalRole}
        initialInning={activeInning}
        inningsList={inningsList}
        matchId={matchId || score?._id || score?.id}
        matchDetails={score?.matchDetails || score}
        score={score}
        onViewProfile={redirectToPlayerProfile}
      />
    </ScrollView>
  );
}
import React, { useRef, useState } from "react";
import { View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, { 
  FadeIn, 
  FadeInDown, 
  ZoomIn, 
  SlideInRight,
  LightSpeedInLeft,
  FlipInXUp
} from "react-native-reanimated";
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome5, 
  MaterialCommunityIcons
} from '@expo/vector-icons';
import ThemedText from "../custom/ThemedText";
import { convertBallToOvers, calculateCRR } from "@/utils/Common";
import { useColorScheme } from "react-native";
import SCREENS from "@/screens";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function MatchLive({ score }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef();
  const colorScheme = useColorScheme();
  const [showCommentary, setShowCommentary] = useState(false);
  
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

  const getRecentOversFromScore = (scoreData) => {
    if (Array.isArray(scoreData?.recentOvers) && scoreData.recentOvers.length > 0) {
      return scoreData.recentOvers.map((o, idx) => {
        if (Array.isArray(o)) {
          return {
            over: idx + 1,
            balls: o,
          };
        }
        return {
          over: o?.over ?? o?.overNumber ?? o?.overNo ?? idx + 1,
          balls: Array.isArray(o?.balls)
            ? o.balls
            : Array.isArray(o?.deliveries)
            ? o.deliveries
            : typeof o?.balls === "string"
            ? o.balls.split("").filter(Boolean)
            : [],
        };
      });
    }

    const currentInn = scoreData?.currentInnings || scoreData?.currentInning || 1;
    const innObj = scoreData?.score?.[`innings_${currentInn}`] || scoreData?.[`innings_${currentInn}`];
    const rawOvers = innObj?.overs || scoreData?.overs;
    if (Array.isArray(rawOvers) && rawOvers.length > 0) {
      const parsed = rawOvers
        .map((o, idx) => {
          if (Array.isArray(o)) {
            return { over: idx + 1, balls: o };
          }
          if (Array.isArray(o?.balls)) {
            return { over: o.overNumber || idx + 1, balls: o.balls };
          }
          return null;
        })
        .filter(Boolean);
      if (parsed.length > 0) {
        return parsed.slice(-8).reverse();
      }
    }

    const comments = Array.isArray(scoreData?.fullCommentary) && scoreData.fullCommentary.length > 0
      ? scoreData.fullCommentary
      : (Array.isArray(scoreData?.commentary) ? scoreData.commentary : []);

    const overMap = {};
    if (comments.length > 0) {
      const chronological = [...comments].reverse();
      chronological.forEach((c) => {
        const overStr = c?.ballNumber || c?.over;
        if (!overStr || typeof overStr !== "string") return;
        const parts = overStr.split(".");
        const overIndex = parseInt(parts[0], 10);
        if (isNaN(overIndex)) return;
        const overNum = overIndex + 1;
        if (!overMap[overNum]) {
          overMap[overNum] = [];
        }
        const runVal = (c.runs !== undefined && c.runs !== null && c.runs !== "") ? c.runs : "0";
        overMap[overNum].push(c.isWicket ? "W" : runVal);
      });
    }

    // Add / override current over if score.currentOver has deliveries
    if (Array.isArray(scoreData?.currentOver) && scoreData.currentOver.length > 0) {
      const currentOverNumber = Math.floor(parseFloat(scoreData?.batting?.score?.over || "0")) + 1;
      overMap[currentOverNumber] = scoreData.currentOver;
    }

    const sortedOvers = Object.keys(overMap)
      .map(Number)
      .sort((a, b) => b - a)
      .map((overNum) => ({
        over: overNum,
        balls: overMap[overNum],
      }));

    if (sortedOvers.length > 0) {
      return sortedOvers.slice(0, 8);
    }

    return [];
  };

  const recentOvers = getRecentOversFromScore(score);

  const currentBatsmen = (Array.isArray(score?.batsman) ? score.batsman : []).map((b) => ({
    playerId: b?.playerId || b?.id || b?._id,
    name: b?.name || b?.username || "Batter",
    runs: b?.runs ?? 0,
    balls: b?.ballsFaced ?? b?.balls ?? 0,
    fours: b?.fours ?? 0,
    sixes: b?.sixes ?? 0,
    sr: b?.sr ?? (b?.ballsFaced ? ((b.runs / b.ballsFaced) * 100).toFixed(1) : "0.00"),
    isBatting: !!b?.isStrikeEnd
  }));

  const bObj = score?.bowler || score?.bowling?.lastTwoBowlers?.[0] || {};
  const currentBowler = {
    playerId: bObj.playerId || bObj.id || bObj._id,
    name: bObj.name || bObj.username || "Bowler",
    wickets: bObj.wicketsTaken ?? 0,
    runs: bObj.runsGiven ?? 0,
    balls: bObj.balls ?? 0,
    economy: bObj.eco ?? "0.00"
  };

  const commentaryData = (Array.isArray(score?.commentary) ? score.commentary : []).map((c, idx) => ({
    over: c?.over || String(idx + 1),
    ball: "",
    comment: c?.message || c?.comment || (typeof c === "string" ? c : "")
  }));

  const BallIndicator = ({ ball, index }) => {
    let displayVal = "0";
    let bgClass = isDark ? "bg-gray-600" : "bg-gray-300";

    if (typeof ball === "object" && ball !== null) {
      if (ball.isWicket) {
        displayVal = "W";
        bgClass = "bg-red-500";
      } else if (ball.ballType === "wide" || ball.type === "wide") {
        displayVal = ball.runs && Number(ball.runs) > 1 ? `${ball.runs}Wd` : "Wd";
        bgClass = "bg-orange-500";
      } else if (ball.ballType === "no-ball" || ball.type === "no-ball") {
        displayVal = ball.runs && Number(ball.runs) > 1 ? `${ball.runs}Nb` : "Nb";
        bgClass = "bg-orange-500";
      } else {
        const runs = ball.runs ?? ball.run ?? ball.score ?? 0;
        const numRuns = Number(runs);
        displayVal = String(runs);
        if (numRuns === 4 || (ball.isBoundary && numRuns === 4)) {
          bgClass = "bg-blue-500";
        } else if (numRuns === 6) {
          bgClass = "bg-green-500";
        } else if (numRuns === 0) {
          bgClass = isDark ? "bg-gray-700" : "bg-gray-300";
        } else {
          bgClass = isDark ? "bg-gray-600" : "bg-gray-400";
        }
      }
    } else {
      const strVal = String(ball ?? "0").trim();
      const u = strVal.toUpperCase();
      displayVal = strVal;
      if (u === "W" || u === "OUT") {
        bgClass = "bg-red-500";
      } else if (u === "4") {
        bgClass = "bg-blue-500";
      } else if (u === "6") {
        bgClass = "bg-green-500";
      } else if (u.includes("LB") || u.includes("B")) {
        bgClass = "bg-purple-500";
      } else if (u.includes("WD") || u.includes("NB")) {
        bgClass = "bg-orange-500";
      } else if (u === "0") {
        bgClass = isDark ? "bg-gray-700" : "bg-gray-300";
      } else {
        bgClass = isDark ? "bg-gray-600" : "bg-gray-400";
      }
    }

    return (
      <View
        className={`w-7 h-7 rounded-full items-center justify-center mx-0.5 ${bgClass}`}
      >
        <ThemedText className="text-white font-bold text-xs">
          {displayVal}
        </ThemedText>
      </View>
    );
  };

  const OverCard = ({ over, balls = [], index = 0 }) => {
    const ballList = Array.isArray(balls)
      ? balls
      : typeof balls === "string"
      ? balls.split("").filter(Boolean)
      : [];

    return (
      <Animated.View 
        entering={SlideInRight.delay(index * 100)}
        className={`p-3 rounded-lg mx-2 min-w-[100px] border ${
          isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
        }`}
      >
        <ThemedText className={`text-center font-bold text-xs mb-2 ${
          isDark ? "text-white" : "text-gray-900"
        }`}>
          Over {over}
        </ThemedText>
        <View className="flex-row justify-center flex-wrap gap-1">
          {ballList.map((ball, ballIndex) => (
            <BallIndicator key={ballIndex} ball={ball} />
          ))}
        </View>
      </Animated.View>
    );
  };

  const ProgressBar = ({ percentage, color }) => (
    <View className={`h-2 rounded-full overflow-hidden mt-1 ${
      isDark ? "bg-gray-600" : "bg-gray-200"
    }`}>
      <View 
        className="h-full rounded-full"
        style={{ 
          width: `${Math.min(Math.max(percentage || 0, 0), 100)}%`,
          backgroundColor: color
        }}
      />
    </View>
  );

  const CommentaryItem = ({ item, index }) => (
    <Animated.View 
      entering={FadeInDown.delay(Math.min(index, 6) * 40)}
      className={`p-3 border-b ${
        isDark ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <View className="flex-row items-start">
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          isDark ? "bg-gray-700" : "bg-gray-100"
        }`}>
          <ThemedText className={`font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}>
            {item.over}.{item.ball}
          </ThemedText>
        </View>
        <View className="flex-1">
          <ThemedText className={isDark ? "text-gray-300" : "text-gray-700"}>
            {item.comment}
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <ScrollView 
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
    >
      {/* Match Status Header */}
      {/* <View className={`p-4 ${
        isDark ? "bg-gradient-to-b from-blue-900 to-blue-800" : "bg-gradient-to-b from-blue-500 to-blue-400"
      }`}>
        <ThemedText className="text-white text-lg font-bold text-center mb-2">
          BP-W need 40 runs in 5 balls
        </ThemedText>
        
        <View className="flex-row justify-between items-center mb-3">
          <View className="items-center flex-1">
            <ThemedText className="text-white font-semibold">WF-W</ThemedText>
            <ProgressBar percentage={100} color="#10b981" />
            <ThemedText className="text-green-400 text-xs mt-1">100%</ThemedText>
          </View>
          
          <View className="items-center flex-1">
            <ThemedText className="text-white font-semibold">BP-W</ThemedText>
            <ProgressBar percentage={0} color="#ef4444" />
            <ThemedText className="text-red-400 text-xs mt-1">0%</ThemedText>
          </View>
        </View>

        <ThemedText className="text-blue-100 text-sm text-center">
          Run Rate: 5.84* • Projected: 120
        </ThemedText>
      </View> */}

      {/* Recent Overs Scroll */}
      <View className={`p-4 border-b ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <ThemedText className={`font-semibold text-center mb-3 ${
          isDark ? "text-white" : "text-gray-900"
        }`}>
          Recent Overs
        </ThemedText>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-2"
        >
          {recentOvers.length > 0 ? (
            recentOvers.map((over, index) => (
              <OverCard key={index} over={over?.over ?? index + 1} balls={over?.balls || []} index={index} />
            ))
          ) : (
            <View className="py-2 px-4 items-center">
              <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                No recent overs recorded yet
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Current Batsmen */}
      <View className={`p-4 border-b ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <ThemedText className={`font-semibold text-center mb-3 ${
          isDark ? "text-white" : "text-gray-900"
        }`}>
          Current Batters
        </ThemedText>

        <View className={`rounded-lg p-3 ${
          isDark ? "bg-gray-700" : "bg-gray-100"
        }`}>
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText className={`text-sm font-semibold flex-1 ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>Batter</ThemedText>
            <ThemedText className={`text-sm font-semibold w-16 text-center ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>R(B)</ThemedText>
            <ThemedText className={`text-sm font-semibold w-10 text-center ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>4S</ThemedText>
            <ThemedText className={`text-sm font-semibold w-10 text-center ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>6S</ThemedText>
            <ThemedText className={`text-sm font-semibold w-14 text-center ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>SR</ThemedText>
          </View>

          {currentBatsmen.length > 0 ? (
            currentBatsmen.map((batsman, index) => (
              <View key={index} className={`flex-row justify-between items-center py-2 border-b ${
                isDark ? "border-gray-600" : "border-gray-300"
              } last:border-b-0`}>
                <Pressable 
                  className="flex-1"
                  onPress={() => redirectToPlayerProfile(batsman)}
                >
                  <ThemedText className={`text-sm font-semibold ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}>
                    {batsman.name} {batsman.isBatting && "⚡"}
                  </ThemedText>
                </Pressable>
                <ThemedText className={`text-sm w-16 text-center ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  {batsman.runs}({batsman.balls})
                </ThemedText>
                <ThemedText className={`text-sm w-10 text-center ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  {batsman.fours}
                </ThemedText>
                <ThemedText className={`text-sm w-10 text-center ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  {batsman.sixes}
                </ThemedText>
                <ThemedText className={`text-sm w-14 text-center ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  {batsman.sr}
                </ThemedText>
              </View>
            ))
          ) : (
            <View className="py-2 items-center">
              <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                No active batters at the crease
              </ThemedText>
            </View>
          )}

          <View className={`flex-row justify-between items-center mt-3 pt-3 border-t ${
            isDark ? "border-gray-600" : "border-gray-300"
          }`}>
            <ThemedText className={isDark ? "text-gray-400 text-xs" : "text-gray-500 text-xs"}>
              P'ship: {score?.partnerships?.totalRuns ?? 0}({score?.partnerships?.balls ?? 0})
            </ThemedText>
            <ThemedText className={isDark ? "text-gray-400 text-xs" : "text-gray-500 text-xs"}>
              Last Wkt: {score?.prompt?.[2] || "None"}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Current Bowler */}
      <View className={`p-4 border-b ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <ThemedText className={`font-semibold text-center mb-3 ${
          isDark ? "text-white" : "text-gray-900"
        }`}>
          Current Bowler
        </ThemedText>

        <View className={`rounded-lg p-4 ${
          isDark ? "bg-gray-700" : "bg-gray-100"
        }`}>
          <View className="flex-row justify-between items-center mb-3">
            <Pressable onPress={() => redirectToPlayerProfile(currentBowler)}>
              <ThemedText className={`font-semibold text-lg ${
                isDark ? "text-blue-400" : "text-blue-600"
              }`}>
                {currentBowler.name}
              </ThemedText>
            </Pressable>
            <View className="bg-red-500 px-2 py-1 rounded">
              <ThemedText className="text-white text-xs font-bold">
                {currentBowler.wickets}-{currentBowler.runs}
              </ThemedText>
            </View>
          </View>

          <View className="flex-row justify-between">
            <View className="items-center">
              <ThemedText className={isDark ? "text-gray-400 text-xs" : "text-gray-600 text-xs"}>
                Balls
              </ThemedText>
              <ThemedText className={isDark ? "text-white font-semibold" : "text-gray-900 font-semibold"}>
                {currentBowler.balls}
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText className={isDark ? "text-gray-400 text-xs" : "text-gray-600 text-xs"}>
                Econ
              </ThemedText>
              <ThemedText className={isDark ? "text-white font-semibold" : "text-gray-900 font-semibold"}>
                {currentBowler.economy}
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText className={isDark ? "text-gray-400 text-xs" : "text-gray-600 text-xs"}>
                Overs
              </ThemedText>
              <ThemedText className={isDark ? "text-white font-semibold" : "text-gray-900 font-semibold"}>
                {convertBallToOvers(currentBowler.balls)}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Run Rate Projection */}
      <View className={`p-4 border-b ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <ThemedText className={`font-semibold text-center mb-3 ${
          isDark ? "text-white" : "text-gray-900"
        }`}>
          Run Rate Projection
        </ThemedText>

        <View className={`rounded-lg p-4 ${
          isDark ? "bg-gray-700" : "bg-gray-100"
        }`}>
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText className={isDark ? "text-gray-400 text-sm" : "text-gray-600 text-sm"}>
              Current
            </ThemedText>
            <ThemedText className="text-green-500 font-semibold">
              {(calculateCRR(score?.batting?.score?.runs, score?.batting?.score?.over) !== "0.00" 
                ? calculateCRR(score?.batting?.score?.runs, score?.batting?.score?.over) 
                : (score?.batting?.score?.CRR || "0.00"))}*
            </ThemedText>
          </View>
          
          <ThemedText className={`text-xs text-center mt-2 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}>
            Projected Score as per current Run Rate: {score?.batting?.score?.projectedScore || "-"}
          </ThemedText>
        </View>
      </View>

      {/* Commentary Section */}
      {showCommentary && (
        <View className={`p-4 border-b ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <ThemedText className={`font-semibold text-center mb-3 ${
            isDark ? "text-white" : "text-gray-900"
          }`}>
            Ball-by-Ball Commentary
          </ThemedText>
          
          <View className={`rounded-lg ${
            isDark ? "bg-gray-700" : "bg-gray-100"
          }`}>
            {commentaryData.length > 0 ? (
              commentaryData.map((item, index) => (
                <CommentaryItem key={index} item={item} index={index} />
              ))
            ) : (
              <View className="p-4 items-center">
                <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  No commentary available for this match yet
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      )}

      {/* View Commentary Button */}
      <Pressable 
        className={`mx-4 my-4 p-4 rounded-lg items-center ${
          isDark ? "bg-blue-600" : "bg-blue-500"
        }`}
        onPress={() => setShowCommentary(!showCommentary)}
      >
        <ThemedText className="text-white font-semibold">
          {showCommentary ? "Hide Commentary ▲" : "View Commentary ▼"}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}
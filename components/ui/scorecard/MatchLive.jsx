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
import { convertBallToOvers } from "@/utils/Common";
import { useColorScheme } from "react-native";

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

  // Sample data
  const recentOvers = [
    { over: 18.1, balls: ["1", "1", "1", "4", "2", "W"] },
    { over: 18.2, balls: ["1", "1lb", "1", "5", "4", "6"] },
    { over: 18.3, balls: ["W", "2", "1", "4", "1", "1"] },
    { over: 18.4, balls: ["4", "6", "2", "W", "1", "1"] },
    { over: 18.5, balls: ["1", "2", "6", "4", "W", "1"] },
  ];

  const currentBatsmen = [
    { name: "M Schutt ✓", runs: 3, balls: 4, fours: 0, sixes: 0, sr: 75.00, isBatting: true },
    { name: "M Taylor", runs: 2, balls: 2, fours: 0, sixes: 0, sr: 100.00, isBatting: false }
  ];

  const currentBowler = { name: "S Ismail", wickets: 3, runs: 16, balls: 20, economy: 4.00 };

  // Sample commentary data
  const commentaryData = [
    { over: 18.1, ball: 1, comment: "Good length delivery, pushed to mid-off for a single" },
    { over: 18.1, ball: 2, comment: "Full toss, driven to deep cover for another run" },
    { over: 18.1, ball: 3, comment: "Short and wide, cut away to point for a single" },
    { over: 18.1, ball: 4, comment: "FOUR! Beautiful cover drive to the boundary" },
    { over: 18.1, ball: 5, comment: "Pushed to deep midwicket, they take two" },
    { over: 18.1, ball: 6, comment: "OUT! Caught behind! The bowler gets the breakthrough" },
  ];

  const BallIndicator = ({ ball, index }) => (
    <View
      className={`w-7 h-7 rounded-full items-center justify-center mx-0.5 ${
        ball === "W" ? "bg-red-500" :
        ball === "4" ? "bg-blue-500" :
        ball === "6" ? "bg-green-500" :
        ball === "1lb" ? "bg-purple-500" :
        isDark ? "bg-gray-600" : "bg-gray-300"
      }`}
    >
      <ThemedText className="text-white font-bold text-xs">
        {ball}
      </ThemedText>
    </View>
  );

  const OverCard = ({ over, balls, index }) => (
    <Animated.View 
      entering={SlideInRight.delay(index * 100)}
      className={`p-3 rounded-lg mx-2 min-w-[100px] border ${
        isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
      }`}
    >
      <ThemedText className={`text-center font-bold text-xs mb-2 ${
        isDark ? "text-white" : "text-gray-900"
      }`}>
        {over}th Over
      </ThemedText>
      <View className="flex-row justify-center flex-wrap gap-1">
        {balls.map((ball, ballIndex) => (
          <BallIndicator key={ballIndex} ball={ball} />
        ))}
      </View>
    </Animated.View>
  );

  const ProgressBar = ({ percentage, color }) => (
    <View className={`h-2 rounded-full overflow-hidden mt-1 ${
      isDark ? "bg-gray-600" : "bg-gray-200"
    }`}>
      <View 
        className="h-full rounded-full"
        style={{ 
          width: `${percentage}%`,
          backgroundColor: color
        }}
      />
    </View>
  );

  const CommentaryItem = ({ item, index }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 50)}
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
          {recentOvers.map((over, index) => (
            <OverCard key={index} over={over.over} balls={over.balls} index={index} />
          ))}
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

          {currentBatsmen.map((batsman, index) => (
            <View key={index} className={`flex-row justify-between items-center py-2 border-b ${
              isDark ? "border-gray-600" : "border-gray-300"
            } last:border-b-0`}>
              <ThemedText className={`text-sm flex-1 ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                {batsman.name} {batsman.isBatting && "⚡"}
              </ThemedText>
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
          ))}

          <View className={`flex-row justify-between items-center mt-3 pt-3 border-t ${
            isDark ? "border-gray-600" : "border-gray-300"
          }`}>
            <ThemedText className={isDark ? "text-gray-400 text-xs" : "text-gray-500 text-xs"}>
              P'ship: 3(3)
            </ThemedText>
            <ThemedText className={isDark ? "text-gray-400 text-xs" : "text-gray-500 text-xs"}>
              Last Wkt: Ellyse Perry 55(43)
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
            <ThemedText className={`font-semibold text-lg ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              {currentBowler.name}
            </ThemedText>
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
              5.84*
            </ThemedText>
          </View>
          
          <View className="flex-row justify-between mb-4">
            {[5.5, 6.0, 6.5].map((rate, index) => (
              <View key={index} className="items-center">
                <ThemedText className={isDark ? "text-gray-400 text-xs" : "text-gray-600 text-xs"}>
                  RR {rate}
                </ThemedText>
                <ThemedText className={isDark ? "text-white font-semibold" : "text-gray-900 font-semibold"}>
                  {Math.round(120 * (rate/5.84))}
                </ThemedText>
              </View>
            ))}
          </View>

          <ThemedText className={`text-xs text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}>
            Projected Score as per current Run Rate: 120
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
            {commentaryData.map((item, index) => (
              <CommentaryItem key={index} item={item} index={index} />
            ))}
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
import React, { useState, useCallback } from "react";
import { View, ScrollView, Pressable, useWindowDimensions, ActivityIndicator, RefreshControl } from "react-native";
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MatchFullCommentary({ matchId }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
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

  // Sample commentary data - current page
  const currentCommentary = [
    { id: 1, over: 19.6, event: "wicket", description: "OUT! Caught by Taylor! Ismail gets her third wicket.", runs: "W", batsman: "M Schutt", bowler: "S Ismail" },
    { id: 2, over: 19.5, event: "run", description: "Pushed to deep cover for a single.", runs: "1", batsman: "M Schutt", bowler: "S Ismail" },
    { id: 3, over: 19.4, event: "boundary", description: "FOUR! Beautiful drive through the covers.", runs: "4", batsman: "M Schutt", bowler: "S Ismail" },
    { id: 4, over: 19.3, event: "run", description: "Worked away to midwicket for a single.", runs: "1", batsman: "A Gardner", bowler: "S Ismail" },
    { id: 5, over: 19.2, event: "wicket", description: "OUT! Bowled! Cleaned up the middle stump.", runs: "W", batsman: "A Sutherland", bowler: "S Ismail" },
    { id: 6, over: 19.1, event: "six", description: "SIX! Massive hit over long-on!", runs: "6", batsman: "A Sutherland", bowler: "S Ismail" },
  ];

  // Sample older commentary data
  const olderCommentary = [
    { id: 7, over: 18.6, event: "run", description: "Dabbed to third man for a single.", runs: "1", batsman: "A Gardner", bowler: "M Schutt" },
    { id: 8, over: 18.5, event: "run", description: "Pushed to mid-off for a quick single.", runs: "1", batsman: "A Sutherland", bowler: "M Schutt" },
    { id: 9, over: 18.4, event: "boundary", description: "FOUR! Elegant flick off the pads.", runs: "4", batsman: "A Sutherland", bowler: "M Schutt" },
    { id: 10, over: 18.3, event: "run", description: "Nudged to square leg for a single.", runs: "1", batsman: "A Gardner", bowler: "M Schutt" },
    { id: 11, over: 18.2, event: "dot", description: "Beaten outside off stump. Good delivery.", runs: "0", batsman: "A Gardner", bowler: "M Schutt" },
    { id: 12, over: 18.1, event: "run", description: "Worked away to deep square leg for a single.", runs: "1", batsman: "A Sutherland", bowler: "M Schutt" },
    { id: 13, over: 17.6, event: "boundary", description: "FOUR! Cut away fiercely behind point.", runs: "4", batsman: "A Gardner", bowler: "M Taylor" },
    { id: 14, over: 17.5, event: "run", description: "Pushed to long-on for a single.", runs: "1", batsman: "A Sutherland", bowler: "M Taylor" },
    { id: 15, over: 17.4, event: "run", description: "Dropped in the covers, quick single taken.", runs: "1", batsman: "A Gardner", bowler: "M Taylor" },
    { id: 16, over: 17.3, event: "boundary", description: "FOUR! Pulled away with authority.", runs: "4", batsman: "A Gardner", bowler: "M Taylor" },
    { id: 17, over: 17.2, event: "run", description: "Worked to midwicket for a single.", runs: "1", batsman: "A Sutherland", bowler: "M Taylor" },
    { id: 18, over: 17.1, event: "dot", description: "Defended back to the bowler.", runs: "0", batsman: "A Sutherland", bowler: "M Taylor" },
  ];

  const [commentaryData, setCommentaryData] = useState(currentCommentary);

  // Match info
  const matchInfo = {
    team1: "WF-W",
    team2: "BP-W",
    score: "145/6",
    over: "20.0",
    currentBatsmen: ["A Gardner", "A Sutherland"],
    currentBowler: "S Ismail"
  };

  // Load older commentary
  const loadOlderCommentary = useCallback(() => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      if (page >= 3) {
        // No more data to load
        setHasMore(false);
      } else {
        // Add older commentary to the beginning of the list
        setCommentaryData(prev => [...olderCommentary, ...prev]);
        setPage(prev => prev + 1);
      }
      setLoading(false);
    }, 1000);
  }, [loading, hasMore, page]);

  // Refresh commentary
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    
    // Simulate refresh delay
    setTimeout(() => {
      setCommentaryData(currentCommentary);
      setPage(1);
      setHasMore(true);
      setRefreshing(false);
    }, 1000);
  }, []);

  // Filter commentary based on selection
  const filteredCommentary = commentaryData.filter(item => {
    if (activeFilter === "all") return true;
    if (activeFilter === "wickets") return item.event === "wicket";
    if (activeFilter === "boundaries") return item.event === "boundary" || item.event === "six";
    if (activeFilter === "recent") return item.over >= 18.0;
    return true;
  });

  const FilterButton = ({ label, value, icon }) => (
    <Pressable
      onPress={() => setActiveFilter(value)}
      className={`flex-row items-center py-2 px-4 rounded-full mx-1 ${
        activeFilter === value 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700" : "bg-gray-200")
      }`}
    >
      {icon && (
        <MaterialIcons 
          name={icon} 
          size={16} 
          color={activeFilter === value ? "#fff" : (isDark ? "#94a3b8" : "#64748b")} 
          style={{ marginRight: 4 }}
        />
      )}
      <ThemedText className={`text-xs font-medium ${
        activeFilter === value ? "text-white" : (isDark ? "text-gray-300" : "text-gray-700")
      }`}>
        {label}
      </ThemedText>
    </Pressable>
  );

  const getEventIcon = (event) => {
    switch(event) {
      case "wicket": return "sports-cricket";
      case "boundary": return "bolt";
      case "six": return "whatshot";
      case "run": return "directions-run";
      default: return "fiber-manual-record";
    }
  };

  const getEventColor = (event) => {
    switch(event) {
      case "wicket": return isDark ? "#ef4444" : "#dc2626";
      case "boundary": return isDark ? "#3b82f6" : "#2563eb";
      case "six": return isDark ? "#f59e0b" : "#d97706";
      case "run": return isDark ? "#10b981" : "#059669";
      default: return isDark ? "#94a3b8" : "#64748b";
    }
  };

  const CommentaryItem = ({ item }) => (
    <View className={`flex-row p-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
      <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
        isDark ? "bg-gray-700" : "bg-gray-100"
      }`}>
        <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          {item.over}
        </ThemedText>
      </View>
      
      <View className="flex-1">
        <View className="flex-row items-center mb-1 flex-wrap">
          <MaterialIcons 
            name={getEventIcon(item.event)} 
            size={16} 
            color={getEventColor(item.event)} 
            style={{ marginTop: 2 }}
          />
          
          <View className="flex-row items-center ml-2">
            <ThemedText className={`text-sm font-medium ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              {item.batsman}
            </ThemedText>
            
            <ThemedText className={`mx-1 ${isDark ? "text-gray-400" : "text-gray-500"}`} style={{ lineHeight: 20 }}>
              to
            </ThemedText>
            
            <ThemedText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {item.bowler}
            </ThemedText>
          </View>
          
          <View className="ml-2" style={{ alignSelf: 'flex-start' }}>
            <View className={`px-2 py-1 rounded-full ${
              item.event === "wicket" ? (isDark ? "bg-red-900/30" : "bg-red-100") :
              item.event === "boundary" ? (isDark ? "bg-blue-900/30" : "bg-blue-100") :
              item.event === "six" ? (isDark ? "bg-amber-900/30" : "bg-amber-100") :
              (isDark ? "bg-gray-700" : "bg-gray-200")
            }`} style={{ minWidth: 24, alignItems: 'center' }}>
              <ThemedText className={`text-xs font-bold ${
                item.event === "wicket" ? (isDark ? "text-red-400" : "text-red-700") :
                item.event === "boundary" ? (isDark ? "text-blue-400" : "text-blue-700") :
                item.event === "six" ? (isDark ? "text-amber-400" : "text-amber-700") :
                (isDark ? "text-gray-400" : "text-gray-700")
              }`}>
                {item.runs}
              </ThemedText>
            </View>
          </View>
        </View>
        
        <ThemedText className={`mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          {item.description}
        </ThemedText>
      </View>
    </View>
  );

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;
    // Load more when scrolled near the top
    if (contentOffset.y < 100 && hasMore && !loading) {
      loadOlderCommentary();
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Match Status Bar */}
      <View className={`p-4 ${isDark ? "bg-gray-800" : "bg-blue-50"} border-b ${
        isDark ? "border-gray-700" : "border-blue-100"
      }`}>
        <View className="flex-row justify-between items-center">
          <View>
            <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {matchInfo.team1} vs {matchInfo.team2}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {matchInfo.score} ({matchInfo.over} Ov)
            </ThemedText>
          </View>
          
          <View className="items-end">
            <ThemedText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Batting: {matchInfo.currentBatsmen.join(", ")}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Bowling: {matchInfo.currentBowler}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Filter Bar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className={`p-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
      >
        <FilterButton label="All" value="all" icon="all-inclusive" />
        <FilterButton label="Wickets" value="wickets" icon="sports-cricket" />
        <FilterButton label="Boundaries" value="boundaries" icon="bolt" />
        <FilterButton label="Recent" value="recent" icon="schedule" />
      </ScrollView>

      {/* Commentary List */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? "#3b82f6" : "#2563eb"]}
            tintColor={isDark ? "#3b82f6" : "#2563eb"}
          />
        }
      >
        {/* Load More Indicator */}
        {loading && (
          <View className="py-4 items-center justify-center">
            <ActivityIndicator size="small" color={isDark ? "#3b82f6" : "#2563eb"} />
            <ThemedText className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Loading older commentary...
            </ThemedText>
          </View>
        )}

        {/* No More Data Indicator */}
        {!hasMore && (
          <View className="py-4 items-center justify-center">
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              No older commentary available
            </ThemedText>
          </View>
        )}

        {filteredCommentary.length > 0 ? (
          filteredCommentary.map((item, index) => (
            <Animated.View 
              key={item.id}
              entering={FadeInDown.delay(index * 50).duration(400)}
            >
              <CommentaryItem item={item} />
            </Animated.View>
          ))
        ) : (
          <View className="items-center justify-center p-8">
            <MaterialIcons 
              name="comment" 
              size={48} 
              color={isDark ? "#94a3b8" : "#cbd5e1"} 
            />
            <ThemedText className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              No commentary available for this filter
            </ThemedText>
          </View>
        )}

        {/* Load More Button (alternative to scroll-based loading) */}
        {hasMore && !loading && (
          <Pressable 
            onPress={loadOlderCommentary}
            className={`mx-4 my-4 p-3 rounded-lg items-center ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
          >
            <ThemedText className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Load Older Commentary
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>

      {/* Live Indicator */}
      <View className={`p-3 flex-row items-center justify-center ${
        isDark ? "bg-gray-800" : "bg-blue-50"
      }`}>
        <View className={`w-2 h-2 rounded-full mr-2 ${isDark ? "bg-red-500" : "bg-red-600"}`} />
        <ThemedText className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          LIVE - Commentary updating
        </ThemedText>
      </View>
    </View>
  );
}
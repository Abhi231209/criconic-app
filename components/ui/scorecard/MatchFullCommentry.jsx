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
import { matchesApi } from "@/utils/api";
import SCREENS from "@/screens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MatchFullCommentary({ matchId, score }) {
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

  // HARDCODED SAMPLE COMMENTARY DATA - COMMENTED OUT (API ONLY)
  /*
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

  // Match info
  const matchInfo = {
    team1: "WF-W",
    team2: "BP-W",
    score: "145/6",
    over: "20.0",
    currentBatsmen: ["A Gardner", "A Sutherland"],
    currentBowler: "S Ismail"
  };
  */

  const redirectToPlayerProfile = (playerOrName) => {
    if (!playerOrName) return;
    const playerObj = typeof playerOrName === "object" ? playerOrName : { name: playerOrName, username: playerOrName };
    const playerId = playerObj?.playerId || playerObj?.id || playerObj?._id;
    navigation.navigate(SCREENS.PlayerProfile, {
      player: playerObj,
      playerId,
      matchId: matchId || score?._id || score?.id,
      match: score,
    });
  };

  // Extract all known players from match data for intelligent name resolution
  const allMatchPlayers = React.useMemo(() => {
    const list = [];
    const seen = new Set();
    const add = (p) => {
      if (!p) return;
      const name = p.name || p.username || p.playerName;
      const id = p.id || p._id || p.playerId;
      if (name && typeof name === "string" && name.trim().length > 1 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ id, name: name.trim(), username: name.trim() });
      }
    };
    (score?.teams || []).forEach((t) => {
      (t?.players || []).forEach(add);
    });
    (score?.inning || []).forEach((inn) => {
      (inn?.playedBatsman || []).forEach(add);
      (inn?.batsman || []).forEach(add);
      (inn?.batsmanUpcoming || []).forEach(add);
      (inn?.bowling?.allBowlers || []).forEach(add);
      (inn?.bowling?.bowlers || []).forEach(add);
      (inn?.bowlers || []).forEach(add);
    });
    (score?.batsman || []).forEach(add);
    add(score?.bowler);
    return list.sort((a, b) => b.name.length - a.name.length);
  }, [score]);

  const parseCommentaryItem = useCallback((c, idx, pageNum = 1) => {
    const runsVal = c?.runs !== undefined && c?.runs !== null ? String(c.runs) : "";
    const eventVal = runsVal.toUpperCase() === "W" || c?.type === "wicket" || c?.isWicket ? "wicket" 
      : runsVal === "4" || c?.runs === 4 || (c?.isBoundary && runsVal === "4") ? "boundary" 
      : runsVal === "6" || c?.runs === 6 ? "six" 
      : "run";
    const desc = c?.comment || c?.message || (typeof c === "string" ? c : "");

    let bMan = c?.batsman?.name || c?.batsman?.username || (typeof c?.batsman === "string" ? c.batsman : "");
    let bObj = typeof c?.batsman === "object" ? c.batsman : null;
    let bowl = c?.bowler?.name || c?.bowler?.username || (typeof c?.bowler === "string" ? c.bowler : "");
    let bowlObj = typeof c?.bowler === "object" ? c.bowler : null;

    // Pattern 1: Regex "Bowler to Batter"
    if ((!bMan || !bowl) && desc) {
      const toMatch = desc.match(/(?:No Ball!|Wide!|)\s*([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?:\s+Free Hit|\s+for|\s*$|\.)/i);
      if (toMatch) {
        if (!bowl) bowl = toMatch[1].trim();
        if (!bMan) bMan = toMatch[2].trim();
      }
    }

    // Pattern 2: Match against known players in match
    if ((!bMan || !bowl) && desc && allMatchPlayers.length > 0) {
      const found = allMatchPlayers.filter(p => desc.toLowerCase().includes(p.name.toLowerCase()));
      if (found.length >= 2) {
        if (!bowl) {
          bowl = found[0].name;
          bowlObj = found[0];
        }
        if (!bMan) {
          bMan = found[1].name;
          bObj = found[1];
        }
      } else if (found.length === 1) {
        if (!bMan) {
          bMan = found[0].name;
          bObj = found[0];
        }
      }
    }

    return {
      id: c?._id || `${pageNum}-${idx}`,
      over: c?.ballNumber || c?.over || "",
      event: eventVal,
      description: desc,
      runs: runsVal,
      batsman: bMan,
      bowler: bowl,
      batsmanObj: bObj,
      bowlerObj: bowlObj,
    };
  }, [allMatchPlayers]);

  // Map incoming score commentary as initial fallback
  const rawInitial = Array.isArray(score?.fullCommentary) 
    ? score.fullCommentary 
    : (Array.isArray(score?.commentary) ? score.commentary : []);
  const initialList = rawInitial.map((c, idx) => parseCommentaryItem(c, idx, 1));

  const [commentaryData, setCommentaryData] = useState(initialList);

  const inn = score?.inning?.[score?.inning?.length - 1] || score;
  const matchInfo = {
    team1: score?.teams?.[0]?.title || "Team 1",
    team2: score?.teams?.[1]?.title || "Team 2",
    score: `${inn?.batting?.score?.runs ?? 0}/${inn?.batting?.score?.wicket ?? 0}`,
    over: inn?.batting?.score?.over || "0.0",
    currentBatsmen: (Array.isArray(score?.batsman) ? score.batsman : []).map((b) => b?.name || "Batter"),
    currentBowler: score?.bowler?.name || score?.bowling?.lastTwoBowlers?.[0]?.name || "Bowler"
  };

  // Fetch live commentary from API
  const fetchCommentary = useCallback(async (pageNum = 1, append = false) => {
    if (!matchId) return;
    try {
      setLoading(true);
      const res = await matchesApi.getCommentary(matchId, pageNum, 20);
      const rawComments = res?.data?.data || res?.data?.comments || res?.comments || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      const comments = Array.isArray(rawComments) ? rawComments : [];
      const formatted = comments.map((c, idx) => parseCommentaryItem(c, idx, pageNum));

      if (append) {
        setCommentaryData((prev) => [...prev, ...formatted]);
      } else if (formatted.length > 0) {
        setCommentaryData(formatted);
      }

      const totalPage = res?.data?.totalPage || res?.totalPage || 1;
      setHasMore(pageNum < totalPage && formatted.length > 0);
      setLoading(false);
    } catch (err) {
      console.log("Error loading commentary:", err);
      setLoading(false);
    }
  }, [matchId, parseCommentaryItem]);

  React.useEffect(() => {
    if (matchId) {
      fetchCommentary(1, false);
    }
  }, [matchId, fetchCommentary]);

  React.useEffect(() => {
    const rawScoreComments = Array.isArray(score?.fullCommentary) && score.fullCommentary.length > 0
      ? score.fullCommentary
      : (Array.isArray(score?.commentary) ? score.commentary : []);

    if (rawScoreComments.length > 0 && commentaryData.length === 0) {
      const mapped = rawScoreComments.map((c, idx) => parseCommentaryItem(c, idx, 1));
      setCommentaryData(mapped);
    }
  }, [score?.commentary, score?.fullCommentary, parseCommentaryItem]);

  // Load older commentary
  const loadOlderCommentary = useCallback(() => {
    if (loading || !hasMore || !matchId) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCommentary(nextPage, true);
  }, [loading, hasMore, matchId, page, fetchCommentary]);

  // Refresh commentary
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    if (matchId) {
      await fetchCommentary(1, false);
    }
    setRefreshing(false);
  }, [matchId, fetchCommentary]);

  // Filter commentary based on selection
  const filteredCommentary = (Array.isArray(commentaryData) ? commentaryData : []).filter(item => {
    if (activeFilter === "all") return true;
    if (activeFilter === "wickets") return item.event === "wicket";
    if (activeFilter === "boundaries") return item.event === "boundary" || item.event === "six";
    if (activeFilter === "recent") return item.over >= 18.0;
    return true;
  });

  const FilterButton = ({ label, value, icon }) => (
    <Pressable
      onPress={() => setActiveFilter(value)}
      className={`flex-row items-center py-1 px-2.5 rounded-full mx-1 ${
        activeFilter === value 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700/60" : "bg-gray-200")
      }`}
    >
      {icon && (
        <MaterialIcons 
          name={icon} 
          size={13} 
          color={activeFilter === value ? "#fff" : (isDark ? "#94a3b8" : "#64748b")} 
          style={{ marginRight: 3 }}
        />
      )}
      <ThemedText className={`text-[11px] font-semibold ${
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
          
          {(item.bowler || item.batsman) ? (
            <View className="flex-row items-center ml-2 flex-wrap">
              {item.bowler ? (
                <Pressable onPress={() => redirectToPlayerProfile(item.bowlerObj || item.bowler)}>
                  <ThemedText className={`text-sm font-semibold underline ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}>
                    {item.bowler}
                  </ThemedText>
                </Pressable>
              ) : null}
              
              {item.bowler && item.batsman ? (
                <ThemedText className={`mx-1.5 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`} style={{ lineHeight: 20 }}>
                  to
                </ThemedText>
              ) : null}
              
              {item.batsman ? (
                <Pressable onPress={() => redirectToPlayerProfile(item.batsmanObj || item.batsman)}>
                  <ThemedText className={`text-sm font-semibold underline ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}>
                    {item.batsman}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          
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
      {/* Compact Match Status Bar */}
      {(matchInfo.currentBatsmen?.length > 0 || (matchInfo.currentBowler && matchInfo.currentBowler !== "Bowler")) ? (
        <View className={`py-1.5 px-3 ${isDark ? "bg-gray-800/80" : "bg-blue-50/80"} border-b ${
          isDark ? "border-gray-700" : "border-blue-100"
        }`}>
          <View className="flex-row justify-between items-center">
            <ThemedText className={`text-[11px] ${isDark ? "text-gray-300" : "text-gray-700"} flex-1 mr-2`} numberOfLines={1}>
              <ThemedText className="font-semibold">Bat: </ThemedText>
              {matchInfo.currentBatsmen?.length > 0 ? matchInfo.currentBatsmen.join(", ") : "None"}
            </ThemedText>
            <ThemedText className={`text-[11px] ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={1}>
              <ThemedText className="font-semibold">Bowl: </ThemedText>
              {matchInfo.currentBowler}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {/* Filter Bar */}
      <View className={`py-1.5 px-2 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 2 }}
        >
          <FilterButton label="All" value="all" icon="all-inclusive" />
          <FilterButton label="Wickets" value="wickets" icon="sports-cricket" />
          <FilterButton label="Boundaries" value="boundaries" icon="bolt" />
          <FilterButton label="Recent" value="recent" icon="schedule" />
        </ScrollView>
      </View>

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
              key={item?.id || `comm_${index}`}
              entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(300)}
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
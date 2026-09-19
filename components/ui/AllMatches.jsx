import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard, { MATCH_CACHE } from "@/components/ui/ScoreCard";
import { matchesApi, request } from "@/utils/api";
import { MATCH_STATUS, getMatchStatusDisplay } from "@/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

export default function AllMatches() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "MATCH_DELETED",
      ({ matchId: delId }) => {
        if (!delId) return;
        const strDelId = String(delId);
        setMatches((prev) =>
          prev.filter((m) => {
            const id = String(m?._id || m?.id || m?.matchId || m);
            return id !== strDelId;
          })
        );
      }
    );
    return () => sub.remove();
  }, []);

  const fetchMatches = useCallback(async (pageNum = 1, shouldAppend = false) => {
    try {
      if (pageNum === 1 && !shouldAppend) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const [idsRes, listRes] = await Promise.all([
        request(`api/matches/ids?page=${pageNum}&items=12`, { method: "GET", errorAlert: false }).catch(() => null),
        matchesApi.getMatches({ page: pageNum, limit: 12 }, { errorAlert: false }).catch(() => null),
      ]);

      const extractArray = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.content)) return res.content;
        if (Array.isArray(res?.data?.content)) return res.data.content;
        if (Array.isArray(res?.data?.matches)) return res.data.matches;
        if (Array.isArray(res?.data)) return res.data;
        return [];
      };

      const rawCombined = [
        ...extractArray(listRes),
        ...extractArray(idsRes),
      ];

      // Deduplicate by match ID, prioritizing rich objects with teams
      const matchMap = new Map();
      for (const m of rawCombined) {
        if (!m) continue;
        const id = String(m._id || m.id || m.matchId || (typeof m === "string" ? m : ""));
        if (!id) continue;
        if (!matchMap.has(id)) {
          matchMap.set(id, m);
        } else {
          const existing = matchMap.get(id);
          const hasTeams = (obj) => Array.isArray(obj?.teams) && obj.teams.length > 0;
          if (!hasTeams(existing) && hasTeams(m)) {
            matchMap.set(id, m);
          }
        }
      }

      const fetchedList = Array.from(matchMap.values());
      if (shouldAppend) {
        setMatches((prev) => {
          const prevMap = new Map(prev.map((item) => [String(item._id || item.id || item.matchId || item), item]));
          fetchedList.forEach((m) => {
            const id = String(m._id || m.id || m.matchId || m);
            if (!prevMap.has(id)) {
              prevMap.set(id, m);
            }
          });
          return Array.from(prevMap.values());
        });
      } else {
        setMatches(fetchedList);
      }

      setPage(pageNum);
      setHasMore(fetchedList.length >= 6);
    } catch (err) {
      console.warn("[AllMatches] Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches(1, false);
  }, [fetchMatches]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchMatches(1, false);
  }, [fetchMatches]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchMatches(page + 1, true);
    }
  }, [fetchMatches, loading, loadingMore, hasMore, page]);

  // Filter & Search
  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return matches.filter((item) => {
      const matchId = String(item?._id || item?.id || item?.matchId || (typeof item === "string" ? item : ""));
      const cached = matchId ? MATCH_CACHE.get(matchId) : null;
      const fullItem = cached?.matchDetails || item;

      // Resolve status
      const rawStatus =
        fullItem?.status ||
        fullItem?.matchCurrentStatus ||
        item?.status ||
        item?.matchCurrentStatus ||
        "";
      const displayStatus = (getMatchStatusDisplay(rawStatus) || "").toLowerCase();
      const isLive =
        displayStatus === "live" ||
        rawStatus === MATCH_STATUS.MATCH_IN_PROGRESS ||
        rawStatus === MATCH_STATUS.MATCH_STARTED;
      const isCompleted =
        displayStatus === "end" ||
        rawStatus === MATCH_STATUS.MATCH_ENDED ||
        rawStatus === MATCH_STATUS.MATCH_COMPLETED;
      const isUpcoming = !isLive && !isCompleted;

      // Status filter
      if (activeFilter === "live" && !isLive) return false;
      if (activeFilter === "completed" && !isCompleted) return false;
      if (activeFilter === "upcoming" && !isUpcoming) return false;

      // Search query
      if (!q) return true;

      const title = (fullItem?.title || item?.title || "").toLowerCase();

      const team1 = (
        fullItem?.teams?.[0]?.title ||
        fullItem?.teams?.[0]?.name ||
        fullItem?.teams?.[0]?.teamName ||
        fullItem?.team1?.name ||
        fullItem?.teamA ||
        item?.teams?.[0]?.title ||
        item?.teams?.[0]?.name ||
        item?.teams?.[0]?.teamName ||
        item?.team1?.name ||
        ""
      ).toLowerCase();

      const team2 = (
        fullItem?.teams?.[1]?.title ||
        fullItem?.teams?.[1]?.name ||
        fullItem?.teams?.[1]?.teamName ||
        fullItem?.team2?.name ||
        fullItem?.teamB ||
        item?.teams?.[1]?.title ||
        item?.teams?.[1]?.name ||
        item?.teams?.[1]?.teamName ||
        item?.team2?.name ||
        ""
      ).toLowerCase();

      const tournament = (
        fullItem?.tournament?.title ||
        fullItem?.tournament?.name ||
        (typeof fullItem?.tournament === "string" ? fullItem?.tournament : "") ||
        item?.tournament?.title ||
        item?.tournament?.name ||
        (typeof item?.tournament === "string" ? item?.tournament : "")
      ).toLowerCase();

      const venue = (
        fullItem?.venue ||
        fullItem?.address ||
        fullItem?.location ||
        fullItem?.city ||
        item?.venue ||
        item?.address ||
        item?.location ||
        ""
      ).toLowerCase();

      return (
        title.includes(q) ||
        team1.includes(q) ||
        team2.includes(q) ||
        tournament.includes(q) ||
        venue.includes(q)
      );
    });
  }, [matches, searchQuery, activeFilter]);

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Top Header */}
      <View
        className={`px-4 py-3.5 border-b flex-row items-center justify-between ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-1.5 -ml-1 rounded-full"
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkMode ? "#FFFFFF" : "#1E293B"}
          />
        </TouchableOpacity>

        <ThemedText className="text-lg font-bold">
          All Matches
        </ThemedText>

        <View className="w-8" />
      </View>

      {/* Search Input */}
      <View className="px-4 pt-3 pb-1">
        <View
          className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
            isDarkMode
              ? "bg-gray-800/90 border-gray-700 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={isDarkMode ? "#9CA3AF" : "#64748B"}
          />
          <TextInput
            placeholder="Search by team, tournament, venue..."
            placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className={`flex-1 ml-2.5 text-sm ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Ionicons
                name="close-circle"
                size={18}
                color={isDarkMode ? "#9CA3AF" : "#64748B"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="px-4 py-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.id)}
                activeOpacity={0.8}
                className={`px-4 py-1.5 rounded-full mr-2 border ${
                  isActive
                    ? "bg-blue-600 border-blue-500"
                    : isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <ThemedText
                  className={`text-xs font-semibold ${
                    isActive
                      ? "text-white"
                      : isDarkMode
                      ? "text-gray-300"
                      : "text-gray-700"
                  }`}
                >
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Match Cards List */}
      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#2563EB" />
          <ThemedText
            className={`mt-3 text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Loading matches...
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item, index) =>
            String(item?._id || item?.id || item?.matchId || item || index)
          }
          renderItem={({ item }) => (
            <View className="mb-2">
              <ScoreCard
                fullWidth={true}
                match={typeof item === "object" ? item : null}
                matchId={typeof item === "string" ? item : item?._id || item?.id}
                startDate={item?.startDate || item?.createdAt}
              />
            </View>
          )}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563EB"]}
              tintColor={isDarkMode ? "#60A5FA" : "#2563EB"}
            />
          }
          ListEmptyComponent={
            <View className="py-16 items-center justify-center px-4">
              <View
                className={`w-14 h-14 rounded-full items-center justify-center mb-3 ${
                  isDarkMode ? "bg-gray-800" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name="trophy-outline"
                  size={26}
                  color={isDarkMode ? "#64748B" : "#94A3B8"}
                />
              </View>
              <ThemedText
                className={`text-base font-bold mb-1 ${
                  isDarkMode ? "text-gray-200" : "text-gray-800"
                }`}
              >
                No matches found
              </ThemedText>
              <ThemedText
                className={`text-xs text-center max-w-[260px] ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {searchQuery
                  ? `No matches found matching "${searchQuery}". Try a different keyword.`
                  : "No matches available in this category."}
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center justify-center">
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : (
              <View style={{ height: 32 }} />
            )
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

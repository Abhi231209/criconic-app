import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import SCREENS from "@/screens";
import { rankingsApi } from "@/utils/api";

export default function PlayerRankings() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(route.params?.initialRegion || null);

  const [activeTab, setActiveTab] = useState("overall");
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRegions = useCallback(async () => {
    setLoadingRegions(true);
    try {
      const res = await rankingsApi.getRegions();
      const list = res?.data?.regions || [];
      setRegions(list);
      if (!selectedRegion && list.length > 0) {
        setSelectedRegion(list[0]);
      }
    } catch (err) {
      console.warn("[PlayerRankings] Failed to load regions:", err);
    } finally {
      setLoadingRegions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const loadRankings = useCallback(async () => {
    if (!selectedRegion) return;
    setLoadingPlayers(true);
    try {
      const res = await rankingsApi.getRankings(selectedRegion, activeTab, { limit: 30 });
      setPlayers(res?.data?.players || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      console.warn("[PlayerRankings] Failed to load rankings:", err);
      setPlayers([]);
      setTotal(0);
    } finally {
      setLoadingPlayers(false);
      setRefreshing(false);
    }
  }, [selectedRegion, activeTab]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRankings();
  };

  const tabs = [
    { value: "overall", label: "Overall" },
    { value: "batting", label: "Batting" },
    { value: "bowling", label: "Bowling" },
  ];

  const renderKeyStat = (player) => {
    if (activeTab === "bowling") {
      return `${player.stats?.wickets ?? 0} wkts • Eco ${player.stats?.eco ?? "0.00"}`;
    }
    return `${player.stats?.runs ?? 0} runs • Avg ${player.stats?.avg ?? 0}`;
  };

  const rankBadgeColor = (rank) => {
    if (rank === 1) return "#F59E0B"; // gold
    if (rank === 2) return "#9CA3AF"; // silver
    if (rank === 3) return "#B45309"; // bronze
    return isDarkMode ? "#374151" : "#E5E7EB";
  };

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      <View className={`flex-row items-center px-4 py-3 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={22} color={isDarkMode ? "#FFFFFF" : "#111827"} />
        </TouchableOpacity>
        <ThemedText className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          Local Rankings
        </ThemedText>
      </View>

      {/* Region picker */}
      {loadingRegions ? (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" />
        </View>
      ) : regions.length === 0 ? (
        <View className="px-4 py-6 items-center">
          <Ionicons name="location-outline" size={32} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText className={`text-sm text-center mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No regions available yet — teams need a location set before players can be ranked locally.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        >
          {regions.map((region) => (
            <TouchableOpacity
              key={region}
              onPress={() => setSelectedRegion(region)}
              className={`px-4 py-2 rounded-full ${
                selectedRegion === region
                  ? "bg-blue-600"
                  : isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <ThemedText
                className={`text-sm font-semibold ${
                  selectedRegion === region ? "text-white" : isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {region}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Batting / Bowling / Overall tabs */}
      {selectedRegion && (
        <View className={`mx-4 mb-2 p-1 rounded-lg flex-row ${isDarkMode ? "bg-gray-800" : "bg-gray-200"}`}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              onPress={() => setActiveTab(tab.value)}
              className={`flex-1 py-2 rounded-md items-center ${
                activeTab === tab.value ? (isDarkMode ? "bg-blue-600" : "bg-blue-500") : ""
              }`}
            >
              <ThemedText
                className={`text-sm font-medium ${
                  activeTab === tab.value ? "text-white" : isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Ranked list */}
      {selectedRegion && (
        <>
          <View className="px-4 pb-1">
            <ThemedText className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              {total} player{total === 1 ? "" : "s"} in {selectedRegion}
            </ThemedText>
          </View>
          {loadingPlayers ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              data={players}
              keyExtractor={(item) => String(item.playerId)}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <View className="items-center py-16">
                  <Ionicons name="trophy-outline" size={40} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
                  <ThemedText className={`text-sm mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    No {activeTab === "overall" ? "" : activeTab} contributions recorded yet in {selectedRegion}
                  </ThemedText>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(SCREENS.PlayerProfile, { playerId: item.playerId })
                  }
                  className={`flex-row items-center p-3 mb-2 rounded-xl ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <View
                    className="w-7 h-7 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: rankBadgeColor(item.rank) }}
                  >
                    <ThemedText className="text-xs font-extrabold text-white">{item.rank}</ThemedText>
                  </View>
                  <PlayerAvatar player={{ name: item.name }} size={36} />
                  <View className="flex-1 ml-3">
                    <ThemedText className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} numberOfLines={1}>
                      {item.team ? `${item.team} • ` : ""}
                      {renderKeyStat(item)}
                    </ThemedText>
                  </View>
                  <ThemedText className={`text-sm font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                    {item.score}
                  </ThemedText>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

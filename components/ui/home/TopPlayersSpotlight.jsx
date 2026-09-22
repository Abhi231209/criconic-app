import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import SCREENS from "@/screens";
import { rankingsApi } from "@/utils/api";
import useAppTheme from "@/hooks/useAppTheme";

const MEDAL_COLORS = ["#F59E0B", "#94A3B8", "#D97706"];

export default function TopPlayersSpotlight() {
  const navigation = useNavigation();
  const { isDarkMode } = useAppTheme();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    rankingsApi
      .getRankings({ type: "overall", limit: 8 }, "overall", { limit: 8 })
      .then((res) => {
        if (!isMounted) return;
        setPlayers(res?.data?.players || []);
      })
      .catch(() => {
        if (isMounted) setPlayers([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!loading && players.length === 0) {
    return null;
  }

  return (
    <View className="mb-5">
      <View className="flex-row justify-between items-center mb-3 mt-1">
        <View className="flex-row items-center">
          <View className="w-1.5 h-4 rounded-full bg-blue-600 mr-2" />
          <ThemedText
            className={`text-lg font-bold tracking-tight ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Top Players
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.PlayerRankings)}
          activeOpacity={0.7}
          className={`flex-row items-center px-2.5 py-1 rounded-full ${
            isDarkMode ? "bg-gray-800" : "bg-blue-50"
          }`}
        >
          <ThemedText
            className={`text-xs font-semibold mr-1 ${
              isDarkMode ? "text-blue-400" : "text-blue-600"
            }`}
          >
            Rankings
          </ThemedText>
          <Ionicons
            name="chevron-forward"
            size={12}
            color={isDarkMode ? "#60A5FA" : "#2563EB"}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="py-6 items-center justify-center">
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
        >
          {players.map((player, index) => (
            <TouchableOpacity
              key={player.playerId || player._id || index}
              activeOpacity={0.8}
              onPress={() =>
                player.playerId &&
                navigation.navigate(SCREENS.PlayerProfile, {
                  playerId: player.playerId,
                })
              }
              className={`rounded-2xl border p-3.5 items-center ${
                isDarkMode
                  ? "bg-gray-800/80 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
              style={{
                width: 108,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDarkMode ? 0.25 : 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View
                className="rounded-full items-center justify-center mb-2"
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: MEDAL_COLORS[index] || (isDarkMode ? "#334155" : "#E2E8F0"),
                  position: "absolute",
                  top: 8,
                  left: 8,
                  zIndex: 2,
                }}
              >
                <ThemedText style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>
                  {player.rank || index + 1}
                </ThemedText>
              </View>

              <View className="mt-2 mb-2">
                <PlayerAvatar player={player} size={52} />
              </View>

              <ThemedText
                numberOfLines={1}
                className={`text-xs font-bold text-center ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {player.name}
              </ThemedText>
              <ThemedText
                numberOfLines={1}
                className={`text-[10px] text-center mt-0.5 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {player.stats?.runs ?? 0} runs
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

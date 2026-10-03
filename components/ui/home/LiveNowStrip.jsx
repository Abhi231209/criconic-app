import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard from "@/components/ui/ScoreCard";
import SCREENS from "@/screens";
import { matchesApi } from "@/utils/api";
import { getMatchStatusDisplay } from "@/utils/Common";

// Matches being played right now, at the top of Home. Hidden when nothing is
// live. "Live" is decided by the server (a live status and a change in the
// last day). Each card keeps its own score current over the socket.
// refreshKey: bump it to load the list again (pull-to-refresh, back on Home).
export default function LiveNowStrip({ refreshKey = 0 }) {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === "dark";
  const [matches, setMatches] = useState([]);

  const load = useCallback(async () => {
    const res = await matchesApi.getMatches({ status: "live", limit: 10 }, { errorAlert: false });
    const list = res?.data?.matches;
    // No list means the request failed: keep what is shown. The status check
    // covers a server from before ?status=live, which returns every match.
    if (Array.isArray(list)) {
      setMatches(list.filter((m) => getMatchStatusDisplay(m?.status) === "Live"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!matches.length) return null;

  return (
    <View className="mb-1">
      <View className="flex-row justify-between items-center mb-3 mt-4">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
          <ThemedText
            className={`text-lg font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            Live now
          </ThemedText>
          <View className={`ml-2 px-2 py-0.5 rounded-full ${isDarkMode ? "bg-red-500/20" : "bg-red-50"}`}>
            <ThemedText className={`text-xs font-bold ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
              {matches.length}
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.AllMatches, { initialFilter: "live" })}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="See all live matches"
          className={`flex-row items-center px-2.5 py-1 rounded-full ${isDarkMode ? "bg-gray-800" : "bg-blue-50"}`}
        >
          <ThemedText className={`text-xs font-semibold mr-1 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
            See all
          </ThemedText>
          <Ionicons name="chevron-forward" size={12} color={isDarkMode ? "#60A5FA" : "#2563EB"} />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={matches}
        keyExtractor={(item) => String(item?._id || item?.id)}
        renderItem={({ item, index }) => (
          <View style={{ marginRight: index !== matches.length - 1 ? 12 : 0 }}>
            <ScoreCard
              matchId={String(item?._id || item?.id)}
              match={item}
              startDate={item?.startDate}
            />
          </View>
        )}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        contentContainerStyle={{ paddingVertical: 4 }}
      />
    </View>
  );
}

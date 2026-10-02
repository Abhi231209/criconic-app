import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import User from "@/utils/User";
import { request, searchApi } from "@/utils/api";

// Single wicket: a player-vs-player contest. Pick the two players here; the
// server creates the match (with a side for each player) and the usual match
// details → toss → openers flow continues from there.
const playerId = (p) => String(p?._id || p?.id || p?.playerId || "");
const initials = (name = "") =>
  String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export default function SingleWicketSetup() {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === "dark";

  const [players, setPlayers] = useState([null, null]);
  const [activeSlot, setActiveSlot] = useState(null); // 0 | 1 | null
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const searchSeq = useRef(0);

  const me = User?.id ? { _id: User.id, username: User.name || "Me" } : null;

  useEffect(() => {
    const term = query.trim();
    if (activeSlot === null || term.length < 2) {
      setResults([]);
      return undefined;
    }
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchApi.search(term, "player");
        if (seq !== searchSeq.current) return;
        const groups = Array.isArray(res?.data) ? res.data : [];
        const found = groups.find((g) => g?.key === "Player")?.data || [];
        setResults(found);
      } finally {
        if (seq === searchSeq.current) setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, activeSlot]);

  const otherSlotPlayerId = activeSlot === null ? "" : playerId(players[1 - activeSlot]);

  const pick = (player) => {
    if (!player || activeSlot === null) return;
    if (playerId(player) === otherSlotPlayerId) {
      Alert.alert("Already picked", "Choose two different players.");
      return;
    }
    setPlayers((prev) => {
      const next = [...prev];
      next[activeSlot] = { _id: playerId(player), username: player.username || player.name || "Player" };
      return next;
    });
    setActiveSlot(null);
    setQuery("");
    setResults([]);
  };

  const canCreate = players[0] && players[1] && playerId(players[0]) !== playerId(players[1]);

  const handleCreate = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    try {
      const res = await request("api/matches/single-wicket/create", {
        method: "POST",
        data: { players: players.map(playerId) },
      });
      const matchId = res?.data?.data?.matchID;
      if (!matchId) {
        throw new Error(res?.data?.message || "Could not create the match. Please try again.");
      }
      const side = (p) => ({ name: p.username, title: p.username });
      navigation.replace(SCREENS.MatchDetailsScreen, {
        matchId,
        matchType: "single_wicket",
        teamA: side(players[0]),
        teamB: side(players[1]),
        teamASquad: [{ id: players[0]._id, username: players[0].username }],
        teamBSquad: [{ id: players[1]._id, username: players[1].username }],
      });
    } catch (error) {
      Alert.alert("Single Wicket", String(error?.message || error));
    } finally {
      setIsCreating(false);
    }
  };

  const card = isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";

  // Plain render functions, not components: a component defined in here
  // would remount (and drop keyboard focus) on every keystroke.
  const renderPlayerSlot = (index) => {
    const player = players[index];
    const isActive = activeSlot === index;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setActiveSlot(isActive ? null : index);
          setQuery("");
          setResults([]);
        }}
        className={`flex-row items-center p-4 rounded-2xl border-2 ${
          isActive ? "border-blue-500" : isDarkMode ? "border-gray-700" : "border-gray-200"
        } ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
      >
        <View className="w-11 h-11 rounded-full items-center justify-center bg-blue-500 mr-3">
          {player ? (
            <ThemedText className="text-white font-bold">{initials(player.username)}</ThemedText>
          ) : (
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
          )}
        </View>
        <View className="flex-1">
          <ThemedText className={`text-xs ${muted}`}>{`Player ${index + 1}`}</ThemedText>
          <ThemedText className="text-base font-semibold text-gray-900 dark:text-white">
            {player ? player.username : "Choose player"}
          </ThemedText>
        </View>
        <Ionicons
          name={isActive ? "chevron-up" : "chevron-down"}
          size={18}
          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
        />
      </TouchableOpacity>
    );
  };

  const renderSearchPanel = () => (
    <View className={`mt-2 p-3 rounded-2xl border ${card}`}>
      <TextInput
        autoFocus
        value={query}
        onChangeText={setQuery}
        placeholder="Search players by name or code"
        placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
        className={`px-3 py-2.5 rounded-xl ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}
      />
      {me && playerId(me) !== otherSlotPlayerId && (
        <TouchableOpacity onPress={() => pick(me)} className="flex-row items-center py-3" activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={22} color="#2563EB" />
          <ThemedText className="ml-2 font-semibold text-blue-600 dark:text-blue-400">Me</ThemedText>
        </TouchableOpacity>
      )}
      {isSearching && <ActivityIndicator style={{ marginVertical: 10 }} color="#2563EB" />}
      {!isSearching && query.trim().length >= 2 && results.length === 0 && (
        <ThemedText className={`text-sm py-3 ${muted}`}>No players found</ThemedText>
      )}
      {results.slice(0, 15).map((p) => (
        <TouchableOpacity
          key={playerId(p)}
          onPress={() => pick(p)}
          activeOpacity={0.7}
          className={`flex-row items-center py-2.5 border-t ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
        >
          <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-500 mr-3">
            <ThemedText className="text-white text-xs font-bold">{initials(p.username)}</ThemedText>
          </View>
          <View className="flex-1">
            <ThemedText className="text-gray-900 dark:text-white">{p.username || "Player"}</ThemedText>
            {Boolean(p.sharingCode) && (
              <ThemedText className={`text-xs ${muted}`}>{p.sharingCode}</ThemedText>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <View
        className={`px-4 py-3 border-b flex-row items-center ${
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
        }`}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            isDarkMode ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          <Ionicons name="arrow-back" size={20} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <View>
          <ThemedText className="text-lg font-bold text-gray-900 dark:text-white">Single Wicket</ThemedText>
          <ThemedText className={`text-xs ${muted}`}>Player vs player</ThemedText>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className={`p-4 rounded-2xl border mb-5 ${card}`}>
          <ThemedText className={`text-sm ${muted}`}>
            Each player bats alone until they're out or their overs run out, while the other bowls.
            Then they swap. The higher score wins.
          </ThemedText>
        </View>

        {renderPlayerSlot(0)}
        {activeSlot === 0 && renderSearchPanel()}

        <View className="items-center my-3">
          <ThemedText className="text-sm font-bold text-blue-600 dark:text-blue-400">VS</ThemedText>
        </View>

        {renderPlayerSlot(1)}
        {activeSlot === 1 && renderSearchPanel()}

        <TouchableOpacity
          onPress={handleCreate}
          disabled={!canCreate || isCreating}
          activeOpacity={0.8}
          className={`mt-8 py-4 rounded-2xl items-center ${canCreate ? "bg-blue-600" : "bg-gray-400"}`}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText className="text-white font-bold text-base">Continue to Match Details</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

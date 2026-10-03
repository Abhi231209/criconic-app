import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Animated,
  Easing,
  Alert,
  BackHandler,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import ThemedText from "@/components/ui/custom/ThemedText";
import RightDrawer from "@/components/ui/custom/RightDrawer";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import MatchSetting from "./MatchSetting";
import SCREENS from "@/screens";
import { matchesApi } from "@/utils/api";
import { useSocket } from "@/contexts/SocketContext";
import { MATCH_STATUS, matchRedirectBasedOnStatus, confirmLeavePreScore } from "@/utils";
import analytics from "@/utils/analytics";

export default function TossScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { emit, isConnected } = useSocket();
  const {
    teamA: initialTeamA,
    teamB: initialTeamB,
    teamASquad: initialTeamASquad,
    teamBSquad: initialTeamBSquad,
    matchDetails,
    matchId,
  } = route.params || {};

  const resolvedMatchId =
    matchId ||
    route.params?.matchID ||
    matchDetails?._id ||
    matchDetails?.id;

  const [teamA, setTeamA] = useState(initialTeamA);
  const [teamB, setTeamB] = useState(initialTeamB);
  const [teamASquad, setTeamASquad] = useState(initialTeamASquad || []);
  const [teamBSquad, setTeamBSquad] = useState(initialTeamBSquad || []);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [tossResult, setTossResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const [decision, setDecision] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tossCompleted, setTossCompleted] = useState(false);
  const [isStatusChecked, setIsStatusChecked] = useState(false);
  const isLeavingRef = useRef(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  // Live Settings Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Mount status validation
  useEffect(() => {
    if (!matchId) {
      setIsStatusChecked(true);
      return;
    }

    matchesApi
      .getMatchById(matchId)
      .then((res) => {
        const m = res?.data;
        if (!m) {
          setIsStatusChecked(true);
          return;
        }

        const isLimitedOvers = m.type !== "test";
        const hasValidOvers = !isLimitedOvers || Number(m.totalOvers) > 0;
        const hasLocation = Boolean(m.location?.trim() || m.address?.trim());
        const isDetailsIncomplete = !hasValidOvers || !hasLocation;

        // If status is MATCH_CREATED, MATCH_SCHEDULED, or match details are incomplete and user didn't just come from MatchDetailsScreen -> redirect back to MatchDetailsScreen
        if (
          m.status === MATCH_STATUS.MATCH_CREATED ||
          m.status === MATCH_STATUS.MATCH_SCHEDULED ||
          (!route.params?.fromMatchDetails && isDetailsIncomplete)
        ) {
          if (!route.params?.fromMatchDetails && !route.params?.matchDetails) {
            isLeavingRef.current = true;
            navigation.replace(SCREENS.MatchDetailsScreen, { matchId, ...route.params });
            return;
          }
          if (m.status === MATCH_STATUS.MATCH_CREATED) {
            matchesApi
              .updateMatch(matchId, {
                updateField: {
                  status: MATCH_STATUS.MATCH_DETAILS_ENTERED,
                },
              })
              .catch(() => {});
          }
        }

        // If status is TOSS, toss is already completed -> redirect forward to PlayerSelectionScreen
        if (m.status === MATCH_STATUS.TOSS) {
          setTossCompleted(true);
          isLeavingRef.current = true;
          navigation.replace(SCREENS.PlayerSelectionScreen, { matchId, ...route.params });
          return;
        }

        // If status is MATCH_OPENER_SELECTED or later -> redirect to ScorerScreen
        if (
          m.status &&
          m.status !== MATCH_STATUS.MATCH_DETAILS_ENTERED &&
          m.status !== MATCH_STATUS.MATCH_CREATED &&
          m.status !== MATCH_STATUS.MATCH_SCHEDULED
        ) {
          const target = matchRedirectBasedOnStatus(matchId, m.status);
          isLeavingRef.current = true;
          navigation.replace(target.screen, target.params);
          return;
        }

        // Populate teams if missing
        if (m.teams && m.teams.length >= 2) {
          const t0 = {
            name: m.teams[0].title || m.teams[0].teamName || "Team A",
            title: m.teams[0].title,
            _id: m.teams[0].teamId || m.teams[0]._id,
            id: m.teams[0].teamId || m.teams[0].id,
            teamId: m.teams[0].teamId,
            teamLogo: m.teams[0].teamLogo || m.teams[0].logo || m.teams[0].image,
            image: m.teams[0].teamLogo || m.teams[0].logo || m.teams[0].image,
          };
          const t1 = {
            name: m.teams[1].title || m.teams[1].teamName || "Team B",
            title: m.teams[1].title,
            _id: m.teams[1].teamId || m.teams[1]._id,
            id: m.teams[1].teamId || m.teams[1].id,
            teamId: m.teams[1].teamId,
            teamLogo: m.teams[1].teamLogo || m.teams[1].logo || m.teams[1].image,
            image: m.teams[1].teamLogo || m.teams[1].logo || m.teams[1].image,
          };
          setTeamA((prev) => ({ ...t0, ...prev, image: prev?.image || prev?.logo || t0.image }));
          setTeamB((prev) => ({ ...t1, ...prev, image: prev?.image || prev?.logo || t1.image }));
          if (teamASquad.length === 0 && m.teams[0].players) setTeamASquad(m.teams[0].players);
          if (teamBSquad.length === 0 && m.teams[1].players) setTeamBSquad(m.teams[1].players);
        }

        if (m.score?.toss?.winningTeam) {
          setTossCompleted(true);
        }

        setIsStatusChecked(true);
      })
      .catch((err) => {
        console.warn("[TossScreen] Error loading match status:", err);
        setIsStatusChecked(true);
      });
  }, [matchId]);

  const handleBack = () => {
    confirmLeavePreScore({
      navigation,
      route,
      onLeave: () => {
        isLeavingRef.current = true;
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      isLeavingRef.current = false;

      const backAction = () => {
        if (!navigation.isFocused()) return false;
        handleBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

      const unsubscribe = navigation.addListener("beforeRemove", (e) => {
        const actionType = e.data?.action?.type;
        if (actionType !== "GO_BACK" && actionType !== "POP") return;
        if (isLeavingRef.current || !navigation.isFocused()) return;
        e.preventDefault();
        handleBack();
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation, tossCompleted, matchId, teamA, teamB, teamASquad, teamBSquad, matchDetails])
  );

  const flipCoin = () => {
    if (isFlipping) return;

    setIsFlipping(true);
    setTossResult(null);

    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const spins = 4;
    const finalValue = result === "Heads" ? spins * 360 : spins * 360 + 180;

    flipAnimation.setValue(0);

    Animated.timing(flipAnimation, {
      toValue: finalValue,
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTossResult(result);
      setIsFlipping(false);
    });
  };

  const getTeamId = (t) => {
    if (!t) return "";
    return String(t._id || t.id || t.teamId || "");
  };

  const isWinnerTeamA = Boolean(
    winner &&
    ((getTeamId(winner) && getTeamId(teamA) && getTeamId(winner) === getTeamId(teamA)) ||
     (winner.name && teamA?.name && winner.name === teamA.name) ||
     (winner.title && teamA?.title && winner.title === teamA.title))
  );

  const isWinnerTeamB = Boolean(
    winner &&
    ((getTeamId(winner) && getTeamId(teamB) && getTeamId(winner) === getTeamId(teamB)) ||
     (winner.name && teamB?.name && winner.name === teamB.name) ||
     (winner.title && teamB?.title && winner.title === teamB.title))
  );

  const proceedToMatch = async () => {
    if (!winner || !decision) {
      Alert.alert(
        "Selection Required",
        `Please select a ${!winner ? "team" : "decision"}.`
      );
      return;
    }

    setIsSubmitting(true);

    const isWagonWheelEnabled =
      route.params?.isWagonWheelEnabled ??
      matchDetails?.recordWagonWheel ??
      matchDetails?.config?.recordWagonWheel ??
      false;

    const isPitchMapEnabled =
      route.params?.isPitchMapEnabled ??
      matchDetails?.recordPitchMap ??
      matchDetails?.config?.recordPitchMap ??
      false;

    const navParams = {
      matchId,
      teamA,
      teamB,
      teamASquad,
      teamBSquad,
      matchDetails,
      tossWinner: winner,
      tossDecision: decision,
      tossResult,
      isWagonWheelEnabled,
      isPitchMapEnabled,
      tournamentId: route.params?.tournamentId || route.params?.tournamentID,
      fromTournament: Boolean(route.params?.fromTournament),
      returnScreen: route.params?.returnScreen,
    };

    if (matchId && winner) {
      try {
        const winningTeamId = winner._id || winner.id || winner.teamId;
        const tossPayload = {
          toss: {
            winningTeam: winningTeamId,
            decision: decision === "Bat" ? "BAT" : "FIELD",
          },
        };

        const res = await matchesApi.toss(matchId, tossPayload);
        analytics.logAction("toss_decision", "match", {
          match_id: matchId,
          winner: winner?.title || winner?.name || "",
          decision: decision === "Bat" ? "BAT" : "FIELD",
        });
        if (res?.data?.success || res?.status === 200 || res?.status === 202) {
          setTossCompleted(true);
          isLeavingRef.current = true;
          navigation.navigate(SCREENS.PlayerSelectionScreen, navParams);
        } else {
          Alert.alert("Error", res?.data?.message || "Failed to record toss on server.");
        }
      } catch (err) {
        console.warn("[Toss] Failed to record toss on server:", err);
        Alert.alert("Notice", "Network error recording toss. Continuing to player selection.");
        isLeavingRef.current = true;
        navigation.navigate(SCREENS.PlayerSelectionScreen, navParams);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      isLeavingRef.current = true;
      setIsSubmitting(false);
      navigation.navigate(SCREENS.PlayerSelectionScreen, navParams);
    }
  };

  // Interpolate the flip animation for front and back of coin
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 360],
    outputRange: ["180deg", "540deg"],
  });

  // Gate render until status-check API resolves to prevent flash-before-redirect.
  if (!isStatusChecked) {
    return <View style={{ flex: 1, backgroundColor: isDarkMode ? "#111827" : "#f9fafb" }} />;
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header matching Criconic style */}
      <View
        className={`px-4 py-3.5 border-b flex-row items-center justify-between ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={handleBack}
            className="p-1.5 mr-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
            Toss
          </ThemedText>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Pre-match Live Setup button */}
          <TouchableOpacity
            onPress={() => {
              const tournamentId =
                route.params?.tournamentId ||
                route.params?.tournamentID ||
                matchDetails?.tournamentID ||
                matchDetails?.tournament?._id;
              navigation.navigate(SCREENS.GoLiveSetup, {
                matchId: resolvedMatchId,
                tournamentId: typeof tournamentId === "object" ? tournamentId?._id || tournamentId?.id : tournamentId,
              });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
            className="flex-row items-center px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/70 border border-red-300 dark:border-red-800"
          >
            <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
            <ThemedText className="text-xs font-bold text-red-600 dark:text-red-400">
              Live Setup
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsDrawerOpen(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            className="p-1.5 rounded-full"
          >
            <Ionicons name="settings-outline" size={22} color={isDarkMode ? "#FFFFFF" : "#1F2937"} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1: Who won the Toss ? (Matching Web Toss) */}
        <View className="mb-6">
          <ThemedText className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Who won the Toss ?
          </ThemedText>
          <View className="flex-row gap-3">
            {/* Team A Card */}
            <TouchableOpacity
              onPress={() => setWinner(teamA)}
              activeOpacity={0.8}
              className={`flex-1 rounded-2xl overflow-hidden border-2 items-center justify-between shadow-sm ${
                isWinnerTeamA
                  ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30"
                  : isDarkMode
                  ? "border-gray-700 bg-gray-800"
                  : "border-gray-200 bg-white"
              }`}
            >
              <View className="p-4 items-center justify-center w-full min-h-[115px]">
                <PlayerAvatar
                  player={{
                    ...teamA,
                    image: teamA?.teamLogo || teamA?.logo || teamA?.image,
                    name: teamA?.title || teamA?.name || "Team A",
                  }}
                  size={76}
                />
                {isWinnerTeamA && (
                  <View className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 shadow-sm">
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View
                className={`w-full py-2.5 px-2 items-center ${
                  isWinnerTeamA
                    ? "bg-blue-600"
                    : isDarkMode
                    ? "bg-gray-700"
                    : "bg-gray-200"
                }`}
              >
                <ThemedText
                  numberOfLines={1}
                  className={`text-sm font-bold text-center ${
                    isWinnerTeamA ? "text-white" : isDarkMode ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {teamA?.title || teamA?.name || "Team A"}
                </ThemedText>
              </View>
            </TouchableOpacity>

            {/* Team B Card */}
            <TouchableOpacity
              onPress={() => setWinner(teamB)}
              activeOpacity={0.8}
              className={`flex-1 rounded-2xl overflow-hidden border-2 items-center justify-between shadow-sm ${
                isWinnerTeamB
                  ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30"
                  : isDarkMode
                  ? "border-gray-700 bg-gray-800"
                  : "border-gray-200 bg-white"
              }`}
            >
              <View className="p-4 items-center justify-center w-full min-h-[115px]">
                <PlayerAvatar
                  player={{
                    ...teamB,
                    image: teamB?.teamLogo || teamB?.logo || teamB?.image,
                    name: teamB?.title || teamB?.name || "Team B",
                  }}
                  size={76}
                />
                {isWinnerTeamB && (
                  <View className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 shadow-sm">
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View
                className={`w-full py-2.5 px-2 items-center ${
                  isWinnerTeamB
                    ? "bg-blue-600"
                    : isDarkMode
                    ? "bg-gray-700"
                    : "bg-gray-200"
                }`}
              >
                <ThemedText
                  numberOfLines={1}
                  className={`text-sm font-bold text-center ${
                    isWinnerTeamB ? "text-white" : isDarkMode ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {teamB?.title || teamB?.name || "Team B"}
                </ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Winner of the toss elected to ? (Matching Web Toss) */}
        <View className="mb-6">
          <ThemedText className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Winner of the toss elected to ?
          </ThemedText>
          <View className="flex-row gap-3">
            {/* Bat Card */}
            <TouchableOpacity
              onPress={() => setDecision("Bat")}
              activeOpacity={0.8}
              className={`flex-1 rounded-2xl overflow-hidden border-2 items-center justify-between shadow-sm ${
                decision === "Bat"
                  ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30"
                  : isDarkMode
                  ? "border-gray-700 bg-gray-800"
                  : "border-gray-200 bg-white"
              }`}
            >
              <View className="p-4 items-center justify-center w-full min-h-[115px]">
                <MaterialCommunityIcons
                  name="cricket"
                  size={58}
                  color={decision === "Bat" ? "#2563EB" : isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
                {decision === "Bat" && (
                  <View className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 shadow-sm">
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View
                className={`w-full py-2.5 px-2 items-center ${
                  decision === "Bat"
                    ? "bg-blue-600"
                    : isDarkMode
                    ? "bg-gray-700"
                    : "bg-gray-200"
                }`}
              >
                <ThemedText
                  className={`text-sm font-bold ${
                    decision === "Bat" ? "text-white" : isDarkMode ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  Bat
                </ThemedText>
              </View>
            </TouchableOpacity>

            {/* Ball Card */}
            <TouchableOpacity
              onPress={() => setDecision("Bowl")}
              activeOpacity={0.8}
              className={`flex-1 rounded-2xl overflow-hidden border-2 items-center justify-between shadow-sm ${
                decision === "Bowl"
                  ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30"
                  : isDarkMode
                  ? "border-gray-700 bg-gray-800"
                  : "border-gray-200 bg-white"
              }`}
            >
              <View className="p-4 items-center justify-center w-full min-h-[115px]">
                <MaterialCommunityIcons
                  name="baseball"
                  size={58}
                  color={decision === "Bowl" ? "#2563EB" : isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
                {decision === "Bowl" && (
                  <View className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 shadow-sm">
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View
                className={`w-full py-2.5 px-2 items-center ${
                  decision === "Bowl"
                    ? "bg-blue-600"
                    : isDarkMode
                    ? "bg-gray-700"
                    : "bg-gray-200"
                }`}
              >
                <ThemedText
                  className={`text-sm font-bold ${
                    decision === "Bowl" ? "text-white" : isDarkMode ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  Ball
                </ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Tap to flip a coin (Matching Web Toss) */}
        <View className="items-center mb-6">
          <ThemedText className="text-base font-bold mb-3 text-gray-900 dark:text-white">
            {isFlipping
              ? "Flipping..."
              : tossResult
              ? `It's ${tossResult}!`
              : "Tap to flip a coin"}
          </ThemedText>

          <TouchableOpacity
            onPress={flipCoin}
            disabled={isFlipping}
            activeOpacity={0.85}
            className="w-28 h-28 rounded-full items-center justify-center my-2"
          >
            <View style={{ width: "100%", height: "100%", position: "relative" }}>
              {/* Front Side (Heads) */}
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#F59E0B",
                    borderRadius: 9999,
                    borderWidth: 4,
                    borderColor: "#D97706",
                    backfaceVisibility: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 6,
                  },
                  {
                    transform: [{ rotateY: frontInterpolate }],
                  },
                ]}
              >
                <MaterialCommunityIcons name="trophy" size={28} color="#FFFFFF" />
                <ThemedText className="text-white font-black text-xs uppercase tracking-wider mt-1">
                  HEADS
                </ThemedText>
              </Animated.View>

              {/* Back Side (Tails) */}
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#D97706",
                    borderRadius: 9999,
                    borderWidth: 4,
                    borderColor: "#B45309",
                    backfaceVisibility: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 5,
                    elevation: 6,
                  },
                  {
                    transform: [{ rotateY: backInterpolate }],
                  },
                ]}
              >
                <MaterialCommunityIcons name="cricket" size={28} color="#FFFFFF" />
                <ThemedText className="text-white font-black text-xs uppercase tracking-wider mt-1">
                  TAILS
                </ThemedText>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Selection feedback summary */}
        {winner && decision && (
          <View
            className={`p-3.5 rounded-xl border flex-row items-center justify-center mb-4 ${
              isDarkMode
                ? "bg-blue-950/40 border-blue-800"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <Ionicons name="checkmark-circle" size={18} color="#2563EB" style={{ marginRight: 6 }} />
            <ThemedText className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              {(winner?.title || winner?.name || "Team")} won the toss & elected to {decision === "Bat" ? "Bat" : "Ball"} first
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Button Bar - ALWAYS VISIBLE (Matching Web Next Button) */}
      <View
        className={`px-4 py-3 border-t ${
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <TouchableOpacity
          onPress={proceedToMatch}
          disabled={isSubmitting}
          activeOpacity={0.85}
          className={`w-full py-4 rounded-xl flex-row items-center justify-center bg-blue-600 ${
            isSubmitting ? "bg-blue-400" : ""
          }`}
        >
          {isSubmitting && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <ThemedText className="text-white text-lg font-bold">
            {isSubmitting ? "Saving Toss..." : "Next"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Right Drawer for Match & Live Settings */}
      <RightDrawer
        isVisible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <MatchSetting
          matchId={resolvedMatchId}
          onClose={() => setIsDrawerOpen(false)}
          matchDetails={matchDetails}
          isPreScorer={true}
          score={{
            batting: winner ? (decision === "Bat" ? winner : (winner?._id === teamA?._id ? teamB : teamA)) : teamA,
            bowling: winner ? (decision === "Bowl" ? winner : (winner?._id === teamA?._id ? teamB : teamA)) : teamB,
            teams: [teamA, teamB],
            tournament: matchDetails?.tournament,
          }}
        />
      </RightDrawer>
    </SafeAreaView>
  );
}

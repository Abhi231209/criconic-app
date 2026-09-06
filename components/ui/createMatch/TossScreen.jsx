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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { matchesApi } from "@/utils/api";
import { MATCH_STATUS, matchRedirectBasedOnStatus, confirmLeavePreScore } from "@/utils";

export default function TossScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    teamA: initialTeamA,
    teamB: initialTeamB,
    teamASquad: initialTeamASquad,
    teamBSquad: initialTeamBSquad,
    matchDetails,
    matchId,
  } = route.params || {};

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

        // If status is MATCH_CREATED and not coming from MatchDetailsScreen -> redirect back to MatchDetailsScreen
        if (m.status === MATCH_STATUS.MATCH_CREATED) {
          if (!route.params?.fromMatchDetails && !route.params?.matchDetails) {
            isLeavingRef.current = true;
            navigation.replace(SCREENS.MatchDetailsScreen, { matchId, ...route.params });
            return; // do NOT setIsStatusChecked — we're redirecting away
          }
          // If arriving from MatchDetailsScreen, ensure backend has status: MATCH_DETAILS_ENTERED
          matchesApi
            .updateMatch(matchId, {
              updateField: {
                status: MATCH_STATUS.MATCH_DETAILS_ENTERED,
              },
            })
            .catch(() => {});
        }

        // If status is TOSS, toss is already completed -> redirect forward to PlayerSelectionScreen
        if (m.status === MATCH_STATUS.TOSS) {
          setTossCompleted(true);
          isLeavingRef.current = true;
          navigation.replace(SCREENS.PlayerSelectionScreen, { matchId, ...route.params });
          return; // do NOT setIsStatusChecked — we're redirecting away
        }

        // If status is MATCH_OPENER_SELECTED or later -> redirect to ScorerScreen
        if (
          m.status &&
          m.status !== MATCH_STATUS.MATCH_DETAILS_ENTERED &&
          m.status !== MATCH_STATUS.MATCH_CREATED
        ) {
          const target = matchRedirectBasedOnStatus(matchId, m.status);
          isLeavingRef.current = true;
          navigation.replace(target.screen, target.params);
          return; // do NOT setIsStatusChecked — we're redirecting away
        }

        // Populate teams if missing
        if (m.teams && m.teams.length >= 2) {
          if (!teamA) setTeamA({ name: m.teams[0].title, _id: m.teams[0].teamId, id: m.teams[0].teamId });
          if (!teamB) setTeamB({ name: m.teams[1].title, _id: m.teams[1].teamId, id: m.teams[1].teamId });
          if (teamASquad.length === 0 && m.teams[0].players) setTeamASquad(m.teams[0].players);
          if (teamBSquad.length === 0 && m.teams[1].players) setTeamBSquad(m.teams[1].players);
        }

        if (m.score?.toss?.winningTeam) {
          setTossCompleted(true);
        }

        // Status check done — safe to render TossScreen UI
        setIsStatusChecked(true);
      })
      .catch((err) => {
        console.warn("[TossScreen] Error loading match status:", err);
        setIsStatusChecked(true); // ungate even on error
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
    setWinner(null);
    setDecision(null);

    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const spins = 3;
    const finalValue = result === "Heads" ? spins * 360 : spins * 360 + 180;

    flipAnimation.setValue(0);

    Animated.timing(flipAnimation, {
      toValue: finalValue,
      duration: 2000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTossResult(result);
      setIsFlipping(false);
    });
  };

  const selectWinner = (selectedTeam) => {
    setWinner(selectedTeam);
  };

  const makeDecision = (selectedDecision) => {
    setDecision(selectedDecision);
  };

  const proceedToMatch = async () => {
    if (!winner || !decision) {
      Alert.alert(
        "Selection Required",
        `Please select ${!winner ? "which team won the toss" : "whether they elect to bat or bowl"}.`
      );
      return;
    }

    setIsSubmitting(true);

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
        if (res?.data?.success || res?.status === 200 || res?.status === 202) {
          setTossCompleted(true);
          isLeavingRef.current = true;
          navigation.navigate(SCREENS.PlayerSelectionScreen, {
            matchId,
            teamA,
            teamB,
            teamASquad,
            teamBSquad,
            matchDetails,
            tossWinner: winner,
            tossDecision: decision,
            tossResult,
          });
        } else {
          Alert.alert("Error", res?.data?.message || "Failed to record toss on server.");
        }
      } catch (err) {
        console.warn("[Toss] Failed to record toss on server:", err);
        Alert.alert("Notice", "Network error recording toss. Continuing to player selection.");
        isLeavingRef.current = true;
        navigation.navigate(SCREENS.PlayerSelectionScreen, {
          matchId,
          teamA,
          teamB,
          teamASquad,
          teamBSquad,
          matchDetails,
          tossWinner: winner,
          tossDecision: decision,
          tossResult,
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      isLeavingRef.current = true;
      setIsSubmitting(false);
      navigation.navigate(SCREENS.PlayerSelectionScreen, {
        matchId,
        teamA,
        teamB,
        teamASquad,
        teamBSquad,
        matchDetails,
        tossWinner: winner,
        tossDecision: decision,
        tossResult,
      });
    }
  };

  // Interpolate the flip animation for front and back of coin
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "180deg", "360deg"],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  // Get 2 key players from each team
  const getKeyPlayers = (squad, count = 2) => {
    return squad.slice(0, count).map((player) => player.name);
  };

  const teamAKeyPlayers = getKeyPlayers(teamASquad);
  const teamBKeyPlayers = getKeyPlayers(teamBSquad);

  // Gate render until status-check API resolves to prevent flash-before-redirect.
  if (!isStatusChecked) {
    return <View style={{ flex: 1, backgroundColor: isDarkMode ? "#111827" : "#f9fafb" }} />;
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header */}
      <View
        className={`px-4 py-4 border-b flex-row items-center ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <TouchableOpacity
          onPress={handleBack}
          className="p-2 mr-2"
        >
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          Toss Time
        </ThemedText>
      </View>

      <View className="flex-1 p-6 items-center justify-center">
        {/* Teams Display with Player Preview */}
        <View
          className={`p-4 rounded-xl mb-8 w-full ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <ThemedText className="text-lg font-bold text-center mb-4 text-gray-900 dark:text-white">
            {teamA?.name} vs {teamB?.name}
          </ThemedText>

          <View className="flex-row justify-between mb-4">
            <View className="items-center flex-1">
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Team A
              </ThemedText>
              <ThemedText className="text-base font-semibold text-gray-900 dark:text-white text-center">
                {teamA?.name}
              </ThemedText>
              <View className="mt-2">
                {teamAKeyPlayers.map((player, index) => (
                  <ThemedText
                    key={index}
                    className="text-xs text-gray-500 dark:text-gray-400 text-center"
                  >
                    {player}
                  </ThemedText>
                ))}
              </View>
            </View>

            <View className="items-center justify-center px-4">
              <ThemedText className="text-2xl font-bold text-gray-900 dark:text-white">
                VS
              </ThemedText>
            </View>

            <View className="items-center flex-1">
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Team B
              </ThemedText>
              <ThemedText className="text-base font-semibold text-gray-900 dark:text-white text-center">
                {teamB?.name}
              </ThemedText>
              <View className="mt-2">
                {teamBKeyPlayers.map((player, index) => (
                  <ThemedText
                    key={index}
                    className="text-xs text-gray-500 dark:text-gray-400 text-center"
                  >
                    {player}
                  </ThemedText>
                ))}
              </View>
            </View>
          </View>

          <ThemedText className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {teamASquad.length} vs {teamBSquad.length} players
          </ThemedText>
        </View>

        {/* Coin Container */}
        <View className="items-center mb-8">
          <ThemedText className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {tossResult
              ? `It's ${tossResult}!`
              : "Flip the coin to decide toss"}
          </ThemedText>

          <TouchableOpacity
            onPress={flipCoin}
            disabled={isFlipping}
            className="w-32 h-32 rounded-full items-center justify-center mb-4"
          >
            <View
              style={{ width: "100%", height: "100%", position: "relative" }}
            >
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
                  },
                  {
                    transform: [
                      {
                        rotateY: flipAnimation.interpolate({
                          inputRange: [0, 180],
                          outputRange: ["0deg", "180deg"],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <ThemedText className="text-white font-bold text-lg">
                  H
                </ThemedText>
                <ThemedText className="text-white text-sm">Heads</ThemedText>
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
                    backgroundColor: "#F59E0B",
                    borderRadius: 9999,
                    borderWidth: 4,
                    borderColor: "#D97706",
                    backfaceVisibility: "hidden",
                  },
                  {
                    transform: [
                      {
                        rotateY: flipAnimation.interpolate({
                          inputRange: [0, 180],
                          outputRange: ["180deg", "360deg"],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <ThemedText className="text-white font-bold text-lg">
                  T
                </ThemedText>
                <ThemedText className="text-white text-sm">Tails</ThemedText>
              </Animated.View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={flipCoin}
            disabled={isFlipping}
            className={`px-6 py-3 rounded-full ${
              isFlipping ? "bg-gray-400" : "bg-blue-500"
            }`}
          >
            <ThemedText className="text-white font-semibold">
              {isFlipping ? "Flipping..." : "Flip Coin"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Winner Selection */}
        {tossResult && !winner && (
          <View
            className={`p-4 rounded-xl w-full mb-6 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <ThemedText className="text-lg font-semibold mb-4 text-center text-gray-900 dark:text-white">
              Who won the toss?
            </ThemedText>

            <View className="flex-row justify-between space-x-4">
              <TouchableOpacity
                onPress={() => selectWinner(teamA)}
                className={`flex-1 p-4 rounded-xl items-center ${
                  isDarkMode ? "bg-gray-700" : "bg-blue-50"
                } border-2 border-blue-300`}
              >
                <ThemedText className="font-semibold text-gray-900 dark:text-white text-center">
                  {teamA?.name}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => selectWinner(teamB)}
                className={`flex-1 p-4 rounded-xl items-center ${
                  isDarkMode ? "bg-gray-700" : "bg-blue-50"
                } border-2 border-blue-300`}
              >
                <ThemedText className="font-semibold text-gray-900 dark:text-white text-center">
                  {teamB?.name}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Decision Selection */}
        {winner && !decision && (
          <View
            className={`p-4 rounded-xl w-full mb-6 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <ThemedText className="text-lg font-semibold mb-4 text-center text-gray-900 dark:text-white">
              {winner.name} won the toss. What will they do?
            </ThemedText>

            <View className="flex-row justify-between space-x-4">
              <TouchableOpacity
                onPress={() => makeDecision("Bat")}
                className={`flex-1 p-4 rounded-xl items-center ${
                  isDarkMode ? "bg-gray-700" : "bg-green-50"
                } border-2 border-green-300`}
              >
                <Ionicons name="baseball" size={24} color="#10B981" />
                <ThemedText className="font-semibold text-gray-900 dark:text-white mt-2">
                  Bat First
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => makeDecision("Bowl")}
                className={`flex-1 p-4 rounded-xl items-center ${
                  isDarkMode ? "bg-gray-700" : "bg-blue-50"
                } border-2 border-blue-300`}
              >
                <Ionicons name="speedometer" size={24} color="#3B82F6" />
                <ThemedText className="font-semibold text-gray-900 dark:text-white mt-2">
                  Bowl First
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Selected Winner and Decision */}
        {winner && decision && (
          <View
            className={`p-4 rounded-xl w-full mb-6 ${
              isDarkMode ? "bg-green-900/20" : "bg-green-100"
            } border-2 border-green-400`}
          >
            <ThemedText className="text-lg font-semibold mb-2 text-center text-green-800 dark:text-green-200">
              Toss Decision
            </ThemedText>
            <ThemedText className="text-xl font-bold text-center text-green-800 dark:text-green-200">
              {winner.name}
            </ThemedText>
            <ThemedText className="text-lg text-center text-green-700 dark:text-green-300 mt-2">
              chose to {decision.toLowerCase()} first
            </ThemedText>
            <ThemedText className="text-sm text-center text-green-600 dark:text-green-400 mt-1">
              {tossResult}
            </ThemedText>
          </View>
        )}

        {/* Proceed Button */}
        {winner && decision && (
          <TouchableOpacity
            onPress={proceedToMatch}
            disabled={isSubmitting}
            className={`px-8 py-4 rounded-xl flex-row items-center justify-center ${
              isSubmitting ? "bg-blue-400" : "bg-blue-500"
            }`}
          >
            {isSubmitting && (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <ThemedText className="text-white text-lg font-semibold">
              {isSubmitting ? "Saving Toss..." : "Select Players"}
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Instructions */}
        {!tossResult && (
          <View
            className={`p-4 rounded-xl mt-8 ${
              isDarkMode ? "bg-gray-800/50" : "bg-blue-50"
            }`}
          >
            <ThemedText className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Flip the coin to decide which team wins the toss and chooses
              whether to bat or bowl first.
            </ThemedText>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  BackHandler,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { LinearGradient } from "expo-linear-gradient";
import { confirmLeavePreScore, getImageFullUrl } from "@/utils";
import User from "@/utils/User";
import squadSelectionStore from "./squadSelectionStore";
import { matchesApi, tournamentsApi } from "@/utils/api";

export default function CreateMatch() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [teamASquad, setTeamASquad] = useState([]);
  const [teamBSquad, setTeamBSquad] = useState([]);

  // Tournament integration & state
  const initialTournament = route.params?.tournament || null;
  const initialTournamentId =
    route.params?.tournamentId ||
    route.params?.tournamentID ||
    initialTournament?._id ||
    initialTournament?.id ||
    null;

  const [tournamentId, setTournamentId] = useState(initialTournamentId);
  const [selectedTournament, setSelectedTournament] = useState(initialTournament);
  const [authorizedTournaments, setAuthorizedTournaments] = useState([]);
  const [tournamentSearchQuery, setTournamentSearchQuery] = useState("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTournamentPickerModal, setShowTournamentPickerModal] = useState(false);
  const hasPromptedRef = useRef(Boolean(initialTournamentId));

  const filteredTournaments = useMemo(() => {
    if (!tournamentSearchQuery || !tournamentSearchQuery.trim()) {
      return authorizedTournaments;
    }
    const q = tournamentSearchQuery.trim().toLowerCase();
    return authorizedTournaments.filter((t) => {
      const name = String(t?.title || t?.name || "").toLowerCase();
      const loc = String(t?.location || t?.city || "").toLowerCase();
      const cat = String(t?.category || t?.tournamentType || t?.format || "").toLowerCase();
      return name.includes(q) || loc.includes(q) || cat.includes(q);
    });
  }, [authorizedTournaments, tournamentSearchQuery]);

  const authUser = useSelector((state) => state.auth?.user);
  const currentUserId = String(
    authUser?._id || authUser?.id || User.id || User.user?._id || User.user?.id || ""
  );
  const isAdmin = Boolean(
    User.isAdmin() || authUser?.role === 1 || authUser?.role === 2
  );

  // Check if user has tournaments with authority if not navigated from a tournament
  useEffect(() => {
    if (initialTournamentId) {
      if (!selectedTournament) {
        tournamentsApi
          .getTournamentById(initialTournamentId)
          .then((res) => {
            const tData =
              res?.data?.content || res?.data?.tournament || res?.data;
            if (tData) setSelectedTournament(tData.content || tData);
          })
          .catch(() => {});
      }
      return;
    }

    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;

    tournamentsApi
      .getMyTournaments()
      .then((res) => {
        const tourList = res?.data?.content || res?.data || [];
        if (!Array.isArray(tourList) || tourList.length === 0) return;

        const authorized = tourList.filter((t) => {
          if (isAdmin) return true;
          const isOrg = Array.isArray(t?.organizer)
            ? t.organizer.some((o) => {
                const oId = String(o?._id || o?.id || o || "");
                return Boolean(oId && oId === currentUserId);
              })
            : typeof t?.organizer === "object"
            ? Boolean(String(t.organizer?._id || t.organizer?.id || "") === currentUserId)
            : Boolean(String(t?.organizer || "") === currentUserId);

          const isCreator = Boolean(
            (t?.createdBy && String(t.createdBy?._id || t.createdBy) === currentUserId) ||
            (t?.userId && String(t.userId?._id || t.userId) === currentUserId) ||
            (t?.user && String(t.user?._id || t.user) === currentUserId)
          );

          return isOrg || isCreator;
        });

        if (authorized.length > 0) {
          setAuthorizedTournaments(authorized);
          setShowTypeModal(true);
        }
      })
      .catch((err) => {
        console.warn("[CreateMatch] Failed to check user tournaments:", err);
      });
  }, [initialTournamentId, currentUserId, isAdmin]);

  // Detect initiator screen before match creation flow
  const routes = navigation.getState?.()?.routes || [];
  const preScoreScreens = [
    SCREENS.CreateMatch,
    SCREENS.SelectTeamScreen,
    SCREENS.SelectSquadScreen,
    SCREENS.MatchDetailsScreen,
  ];
  const priorRoute = [...routes].reverse().find((r) => !preScoreScreens.includes(r.name));
  const initiatorScreen = route.params?.returnScreen || priorRoute?.name || SCREENS.Home;

  const isLeavingRef = useRef(false);

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

      // Consume squad selection result from SelectSquadScreen (written via squadSelectionStore)
      if (squadSelectionStore.pending) {
        const { selectedTeam, selectedSquad, teamType } = squadSelectionStore.pending;
        squadSelectionStore.pending = null;
        if (teamType === "teamA") {
          setTeamA(selectedTeam);
          setTeamASquad(selectedSquad || []);
        } else if (teamType === "teamB") {
          setTeamB(selectedTeam);
          setTeamBSquad(selectedSquad || []);
        }
      }

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
    }, [navigation, route])
  );

  const handleTeamSelection = (teamType) => {
    isLeavingRef.current = true;
    const otherTeam = teamType === "teamA" ? teamB : teamA;
    const otherTeamId = otherTeam?._id || otherTeam?.id || otherTeam?.teamId;
    navigation.navigate(SCREENS.SelectTeamScreen, {
      teamType,
      otherTeamId,
      tournamentId,
    });
  };

  const isReady =
    teamA && teamB && teamASquad.length > 0 && teamBSquad.length > 0;

  const [isCreating, setIsCreating] = useState(false);

  const isValidObjectId = (id) =>
    typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

  const handleContinue = async () => {
    if (!isReady || isCreating) return;

    const teamAId = String(teamA?._id || teamA?.id || teamA?.teamId || "");
    const teamBId = String(teamB?._id || teamB?.id || teamB?.teamId || "");

    if (!isValidObjectId(teamAId)) {
      Alert.alert(
        "Invalid Team A",
        "Team A is missing a valid identifier. Please reselect Team A."
      );
      return;
    }
    if (!isValidObjectId(teamBId)) {
      Alert.alert(
        "Invalid Team B",
        "Team B is missing a valid identifier. Please reselect Team B."
      );
      return;
    }
    if (teamAId === teamBId) {
      Alert.alert(
        "Duplicate Teams",
        "Team A and Team B cannot be the same team. Please choose a different opponent."
      );
      return;
    }
    if (!teamASquad || teamASquad.length === 0) {
      Alert.alert("Squad Required", "Please select a playing squad for Team A.");
      return;
    }
    if (!teamBSquad || teamBSquad.length === 0) {
      Alert.alert("Squad Required", "Please select a playing squad for Team B.");
      return;
    }

    setIsCreating(true);
    try {
      const sanitizePlayer = (p) => {
        const rawId = p?.id?._id || p?.id || p?._id;
        const idStr =
          rawId && typeof rawId === "object"
            ? String(rawId._id || rawId.id || "")
            : String(rawId || "");
        const playerObj = {
          username: p?.username || p?.name || "Player",
        };
        if (isValidObjectId(idStr)) {
          playerObj.id = idStr;
        }
        return playerObj;
      };

      const teamsPayload = [
        {
          teamId: teamAId,
          teamName: teamA?.name || teamA?.title || "Team A",
          teamLogo: teamA?.image || teamA?.logo,
          players: (teamASquad || []).map(sanitizePlayer),
        },
        {
          teamId: teamBId,
          teamName: teamB?.name || teamB?.title || "Team B",
          teamLogo: teamB?.image || teamB?.logo,
          players: (teamBSquad || []).map(sanitizePlayer),
        },
      ];

      const dataToSend = {
        teams: teamsPayload,
      };

      if (tournamentId) {
        dataToSend.tournamentID = tournamentId;
      }

      const res = await matchesApi.createMatch(dataToSend);
      const matchId =
        res?.data?.data?.matchID ||
        res?.data?.data?._id ||
        res?.data?.matchID ||
        res?.data?._id;

      if (!matchId) {
        const errMsg =
          res?.data?.message ||
          res?.data?.error?.[0]?.message ||
          res?.data?.error?.[0] ||
          res?.data?.reason ||
          "Could not create match on server. Please check your network or try again.";
        throw new Error(String(errMsg));
      }

      isLeavingRef.current = true;
      navigation.navigate(SCREENS.MatchDetailsScreen, {
        matchId,
        teamA,
        teamB,
        teamASquad,
        teamBSquad,
        returnScreen: initiatorScreen,
        tournamentId,
      });
    } catch (error) {
      console.warn("[CreateMatch] Error creating match:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error?.[0]?.message ||
        error?.response?.data?.error?.[0] ||
        error?.message ||
        "Could not create match on server. Please check your network.";
      Alert.alert("Match Creation Error", String(errorMsg));
    } finally {
      setIsCreating(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "TM";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const TeamCard = ({ title, team, squad, teamType }) => (
    <View className="flex-1">
      <View className="flex-row items-center justify-between mb-2">
        <ThemedText
          className={`text-xs font-bold uppercase tracking-wider ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {title}
        </ThemedText>
        {team && (
          <TouchableOpacity
            onPress={() => handleTeamSelection(teamType)}
            activeOpacity={0.7}
          >
            <ThemedText className="text-xs font-semibold text-blue-500">
              Change
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={() => handleTeamSelection(teamType)}
        activeOpacity={0.85}
        className={`p-5 rounded-2xl items-center justify-center border ${
          team
            ? isDarkMode
              ? "bg-gray-800 border-gray-700 shadow-md shadow-black/30"
              : "bg-white border-blue-100 shadow-md shadow-blue-900/5"
            : isDarkMode
            ? "bg-gray-800/40 border-dashed border-gray-700"
            : "bg-blue-50/40 border-dashed border-blue-300"
        }`}
        style={{ minHeight: 130 }}
      >
        {team ? (
          <View className="items-center">
            <View
              className={`w-14 h-14 rounded-full items-center justify-center mb-2.5 ${
                teamType === "teamA"
                  ? "bg-blue-600/15 border border-blue-500/30"
                  : "bg-amber-600/15 border border-amber-500/30"
              }`}
            >
              <ThemedText
                className={`text-base font-extrabold ${
                  teamType === "teamA" ? "text-blue-500" : "text-amber-500"
                }`}
              >
                {getInitials(team.name)}
              </ThemedText>
            </View>

            <ThemedText
              numberOfLines={1}
              className={`text-base font-bold text-center ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {team.name}
            </ThemedText>

            <View className="mt-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20">
              <ThemedText className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                {squad.length > 0
                  ? `${squad.length} Players Selected`
                  : "Squad Pending"}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View className="items-center py-2">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${
                isDarkMode ? "bg-gray-700" : "bg-blue-100/70"
              }`}
            >
              <Ionicons
                name="add"
                size={24}
                color={isDarkMode ? "#93C5FD" : "#2563EB"}
              />
            </View>
            <ThemedText
              className={`text-sm font-semibold ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
              }`}
            >
              Select {title}
            </ThemedText>
            <ThemedText
              className={`text-[11px] mt-0.5 ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Tap to choose squad
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header */}
      <View
        className={`px-4 py-3 border-b flex-row items-center justify-between ${
          isDarkMode
            ? "bg-gray-900 border-gray-800"
            : "bg-white border-gray-100"
        }`}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              isDarkMode ? "bg-gray-800" : "bg-gray-100"
            }`}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={isDarkMode ? "#FFFFFF" : "#1E293B"}
            />
          </TouchableOpacity>
          <View>
            <ThemedText
              className={`text-lg font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Create Match
            </ThemedText>
            <ThemedText
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Step 1 of 3: Team Face-off
            </ThemedText>
          </View>
        </View>

        <View className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
          <ThemedText className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
            FIXTURE
          </ThemedText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Tournament Info Banner / Status Chip */}
        {selectedTournament || tournamentId ? (
          <View
            className={`p-3.5 rounded-2xl mb-5 border flex-row items-center justify-between ${
              isDarkMode
                ? "bg-blue-950/30 border-blue-800/60"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-9 h-9 rounded-full bg-blue-600 items-center justify-center mr-3">
                <Ionicons name="trophy" size={18} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <ThemedText className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Tournament Match
                </ThemedText>
                <ThemedText
                  numberOfLines={1}
                  className={`font-bold text-sm ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {selectedTournament?.title ||
                    selectedTournament?.name ||
                    "Tournament Match"}
                </ThemedText>
              </View>
            </View>

            {authorizedTournaments.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowTypeModal(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600"
                activeOpacity={0.7}
              >
                <ThemedText className="text-white text-xs font-semibold">
                  Change
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : authorizedTournaments.length > 0 ? (
          <View
            className={`p-3 rounded-xl mb-5 border flex-row items-center justify-between ${
              isDarkMode
                ? "bg-gray-800/60 border-gray-700"
                : "bg-gray-100 border-gray-200"
            }`}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Ionicons
                name="baseball-outline"
                size={18}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                style={{ marginRight: 8 }}
              />
              <ThemedText
                className={`text-xs ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Match Type: <ThemedText className="font-bold">Single Match</ThemedText>
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => setShowTypeModal(true)}
              className="px-3 py-1 rounded-lg bg-blue-600/10 dark:bg-blue-500/20"
              activeOpacity={0.7}
            >
              <ThemedText className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Link Tournament
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Matchup Banner */}
        <View className="mb-6">
          <ThemedText
            className={`text-xl font-extrabold text-center ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Select Competing Teams
          </ThemedText>
          <ThemedText
            className={`text-xs text-center mt-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Pick both teams and their playing squads to schedule the match
          </ThemedText>
        </View>

        {/* Team A Selection */}
        <TeamCard
          title="Team A"
          team={teamA}
          squad={teamASquad}
          teamType="teamA"
        />

        {/* Electric VS Badge Divider */}
        <View className="items-center my-4">
          <LinearGradient
            colors={["#2563EB", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-12 h-12 rounded-full items-center justify-center border-2 border-white dark:border-gray-900"
            style={{
              shadowColor: "#2563EB",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
              elevation: 5,
            }}
          >
            <ThemedText className="font-black text-sm text-white tracking-widest">
              VS
            </ThemedText>
          </LinearGradient>
        </View>

        {/* Team B Selection */}
        <TeamCard
          title="Team B"
          team={teamB}
          squad={teamBSquad}
          teamType="teamB"
        />

        {/* Status / Guidance Pill */}
        {!isReady && (
          <View
            className={`mt-6 p-3.5 rounded-xl flex-row items-center border ${
              isDarkMode
                ? "bg-gray-800/60 border-gray-700"
                : "bg-blue-50/70 border-blue-200"
            }`}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={isDarkMode ? "#60A5FA" : "#2563EB"}
            />
            <ThemedText
              className={`text-xs font-medium ml-2 flex-1 ${
                isDarkMode ? "text-blue-300" : "text-blue-800"
              }`}
            >
              {!teamA && !teamB
                ? "Choose Team A and Team B to unlock match details"
                : !teamA
                ? "Please select Team A to continue"
                : !teamB
                ? "Please select Team B to continue"
                : teamASquad.length === 0
                ? "Select playing squad for Team A"
                : "Select playing squad for Team B"}
            </ThemedText>
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isReady || isCreating}
          activeOpacity={0.88}
          className="mt-8 rounded-xl overflow-hidden"
          style={{
            shadowColor: "#2563EB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isReady && !isCreating ? 0.3 : 0,
            shadowRadius: 8,
            elevation: isReady && !isCreating ? 4 : 0,
          }}
        >
          <LinearGradient
            colors={
              isReady && !isCreating
                ? ["#2563EB", "#1D4ED8"]
                : isDarkMode
                ? ["#374151", "#1F2937"]
                : ["#CBD5E1", "#94A3B8"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 items-center justify-center flex-row"
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
            ) : null}
            <ThemedText
              className={`text-base font-bold mr-1.5 ${
                isReady && !isCreating
                  ? "text-white"
                  : isDarkMode
                  ? "text-gray-400"
                  : "text-gray-200"
              }`}
            >
              {isCreating ? "Creating Match..." : "Proceed to Match Details"}
            </ThemedText>
            {isReady && !isCreating && (
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Match Type Selection Modal */}
      <Modal
        visible={showTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View
            className={`w-full max-w-md rounded-2xl p-6 ${
              isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
            } shadow-2xl`}
          >
            <View className="items-center mb-5">
              <View className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mb-3">
                <Ionicons name="trophy-outline" size={28} color="#2563EB" />
              </View>
              <ThemedText className="text-xl font-bold text-center text-gray-900 dark:text-white">
                Select Match Type
              </ThemedText>
              <ThemedText className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1 px-4">
                Is this match for one of your tournaments or a standalone single match?
              </ThemedText>
            </View>

            {/* Option 1: Single Match */}
            <TouchableOpacity
              onPress={() => {
                setTournamentId(null);
                setSelectedTournament(null);
                setShowTypeModal(false);
              }}
              activeOpacity={0.8}
              className={`p-4 rounded-xl border mb-3 flex-row items-center ${
                !tournamentId
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                  : isDarkMode
                  ? "border-gray-700 bg-gray-900/50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <View className="w-11 h-11 rounded-full bg-blue-500/10 items-center justify-center mr-3.5">
                <Ionicons name="baseball-outline" size={22} color="#2563EB" />
              </View>
              <View className="flex-1">
                <ThemedText className="font-bold text-base text-gray-900 dark:text-white">
                  Single Match
                </ThemedText>
                <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Standalone friendly or casual match between two teams
                </ThemedText>
              </View>
              {!tournamentId && (
                <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
              )}
            </TouchableOpacity>

            {/* Option 2: Tournament Match */}
            <TouchableOpacity
              onPress={() => {
                setShowTypeModal(false);
                if (authorizedTournaments.length === 1) {
                  const t = authorizedTournaments[0];
                  setSelectedTournament(t);
                  setTournamentId(String(t._id || t.id || t.slug));
                } else if (authorizedTournaments.length > 1) {
                  setShowTournamentPickerModal(true);
                }
              }}
              activeOpacity={0.8}
              className={`p-4 rounded-xl border mb-4 flex-row items-center ${
                tournamentId
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                  : isDarkMode
                  ? "border-gray-700 bg-gray-900/50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <View className="w-11 h-11 rounded-full bg-amber-500/10 items-center justify-center mr-3.5">
                <Ionicons name="trophy" size={22} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <ThemedText className="font-bold text-base text-gray-900 dark:text-white">
                  Tournament Match
                </ThemedText>
                <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Attach to {authorizedTournaments.length > 1 ? "one of your tournaments" : authorizedTournaments[0]?.title || authorizedTournaments[0]?.name || "your tournament"}
                </ThemedText>
              </View>
              {tournamentId ? (
                <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {/* Close / Dismiss */}
            <TouchableOpacity
              onPress={() => setShowTypeModal(false)}
              className="py-2.5 items-center justify-center"
            >
              <ThemedText className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tournament Picker Modal */}
      <Modal
        visible={showTournamentPickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowTournamentPickerModal(false);
          setTournamentSearchQuery("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-black/60 justify-end"
        >
          <View
            className={`w-full max-h-[80%] rounded-t-3xl p-5 pb-8 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
              <View className="flex-1 mr-2">
                <ThemedText className="text-lg font-bold text-gray-900 dark:text-white">
                  Select Tournament
                </ThemedText>
                <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                  {authorizedTournaments.length} tournament{authorizedTournaments.length !== 1 ? "s" : ""} available
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowTournamentPickerModal(false);
                  setTournamentSearchQuery("");
                }}
                className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700"
              >
                <Ionicons name="close" size={20} color={isDarkMode ? "#FFF" : "#333"} />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View
              className={`flex-row items-center px-3 py-2 rounded-xl mb-3 border ${
                isDarkMode ? "bg-gray-700/60 border-gray-600" : "bg-gray-100 border-gray-200"
              }`}
            >
              <Ionicons
                name="search"
                size={18}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                style={{ marginRight: 8 }}
              />
              <TextInput
                placeholder="Search tournaments by name or location..."
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={tournamentSearchQuery}
                onChangeText={setTournamentSearchQuery}
                className="flex-1 text-sm text-gray-900 dark:text-white py-1"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {tournamentSearchQuery ? (
                <TouchableOpacity onPress={() => setTournamentSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Virtualized FlatList for High Performance */}
            <FlatList
              data={filteredTournaments}
              keyExtractor={(item) => String(item._id || item.id || item.slug)}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              renderItem={({ item: t }) => {
                const tId = String(t._id || t.id || t.slug);
                const isSelected = tournamentId === tId;
                const tName = t.title || t.name || "Tournament";
                const tLoc = t.location || t.city || "";
                const logo = t.logoImage || t.bannerImage || t.logo;

                return (
                  <TouchableOpacity
                    key={tId}
                    onPress={() => {
                      setSelectedTournament(t);
                      setTournamentId(tId);
                      setShowTournamentPickerModal(false);
                      setTournamentSearchQuery("");
                    }}
                    activeOpacity={0.8}
                    className={`p-3.5 rounded-xl border mb-2.5 flex-row items-center justify-between ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                        : isDarkMode
                        ? "border-gray-700 bg-gray-900/50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      {logo ? (
                        <Image
                          source={{ uri: getImageFullUrl(logo) }}
                          className="w-10 h-10 rounded-full mr-3 bg-gray-200 dark:bg-gray-700"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3">
                          <ThemedText className="font-bold text-sm text-blue-600 dark:text-blue-400">
                            {(tName || "T").substring(0, 2).toUpperCase()}
                          </ThemedText>
                        </View>
                      )}
                      <View className="flex-1">
                        <ThemedText
                          numberOfLines={1}
                          className="font-bold text-sm text-gray-900 dark:text-white"
                        >
                          {tName}
                        </ThemedText>
                        {tLoc ? (
                          <ThemedText
                            numberOfLines={1}
                            className="text-xs text-gray-500 dark:text-gray-400"
                          >
                            📍 {tLoc}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="items-center justify-center py-10">
                  <Ionicons
                    name="search-outline"
                    size={36}
                    color={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    style={{ marginBottom: 8 }}
                  />
                  <ThemedText className="text-gray-500 dark:text-gray-400 text-sm">
                    {tournamentSearchQuery
                      ? `No tournaments found matching "${tournamentSearchQuery}"`
                      : "No tournaments available"}
                  </ThemedText>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
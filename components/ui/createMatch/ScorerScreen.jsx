import React, { useEffect, useRef, useState, createContext, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  useColorScheme,
  StyleSheet,
  Alert,
  BackHandler,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, useIsFocused, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import CustomRunModal from "./CustomRunModal";
import { MATCH_ACTION, MATCH_STATUS, MATCH_STATUS_STAGE } from "@/utils/Common";
import { matchRedirectBasedOnStatus } from "@/utils";
import MatchHeader from "./MatchHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { matchesApi, teamsApi, request, apiUrl } from "@/utils/api";
import { SOCKET_URL } from "@/config";
import { io } from "socket.io-client";
import BallPreview from "./BallPreview";
import ThemedText from "../custom/ThemedText";
import CustomPopup from "../custom/CustomPopup";
import QuickActions from "./QuickActions";
import { useBottomSheet } from "../custom/CustomBottomSheet";
import PitchMap from "./PitchMap";
import OutOptions from "./OutOptions";
import SCREENS from "@/screens";
import User from "@/utils/User";

export const ScorerScreenContext = createContext(null);

export default function ScorerScreen() {
  const { openSheet, closeSheet } = useBottomSheet();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      console.log(`📡 [ScorerScreen Dedicated Socket EMIT] ${event}:`, data);
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event, callback) => {
    socketRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    socketRef.current?.off(event, callback);
  }, []);

  const authUser = useSelector((state) => state.auth?.user);
  const userId =
    User.id ||
    authUser?._id ||
    authUser?.id ||
    authUser?.userId ||
    authUser?.user?._id ||
    authUser?.user?.id;


  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const matchID =
    route.params?.matchId ||
    route.params?.matchID ||
    route.params?.matchDetails?._id ||
    route.params?.matchDetails?.id ||
    route.params?.match?._id ||
    route.params?.match?.id;

  console.log("[ScorerScreen] Resolved matchID:", matchID, "| route.params keys:", Object.keys(route.params || {}));

  const [score, setScore] = useState({});
  const [matchDetails, setMatchDetails] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  // Guard: prevents rendering scorer UI while the initial status-check API is in flight.
  // This eliminates the "flash before redirect" flicker when match status is still in pre-scoring.
  const [isStatusChecked, setIsStatusChecked] = useState(false);

  // Dynamic In-Match Sheet / Modal States
  const [nextBatterModalVisible, setNextBatterModalVisible] = useState(false);
  const [availableBatters, setAvailableBatters] = useState([]);
  const [nextBowlerModalVisible, setNextBowlerModalVisible] = useState(false);
  const [availableBowlers, setAvailableBowlers] = useState([]);
  const [inningsCompleteModalVisible, setInningsCompleteModalVisible] = useState(false);
  const [matchCompleteModalVisible, setMatchCompleteModalVisible] = useState(false);

  // Custom Runs & Extras Modal State (WD, NB, BYE, LB, 5,7)
  const [showCustomRunsModal, setShowCustomRunsModal] = useState(false);
  const [customModalDescription, setCustomModalDescription] = useState({
    title: "Enter Custom Runs",
    type: "cr",
  });

  // Out Options Modal State
  const [showOutModal, setShowOutModal] = useState(false);

  // Strike Selection Modal State (Post-wicket flow)
  const [selectStrikerModalVisible, setSelectStrikerModalVisible] = useState(false);
  const [strikerCandidates, setStrikerCandidates] = useState([]);
  const pendingWicketFlowRef = useRef(null);

  const handleShowCustomRunsModal = (title, type) => {
    setCustomModalDescription({ title, type });
    setShowCustomRunsModal(true);
  };

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState(null);

  const isLeavingRef = useRef(false);
  const scoreRef = useRef(score);
  const matchDetailsRef = useRef(matchDetails);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    matchDetailsRef.current = matchDetails;
  }, [matchDetails]);

  // Stable refs for socket event handlers — these are updated whenever the real
  // callbacks change, but the socket effect uses the *ref wrapper* so it never
  // re-subscribes just because score or matchDetails changed.
  const handleOverCompleteRef = useRef(null);
  const handleInningsCompleteRef = useRef(null);
  const handleWicketRef = useRef(null);
  const isFirstTimeScoreLoadedRef = useRef(true);
  const pendingResumeSheetRef = useRef(null);

  // Back Navigation Trap with confirmation
  const handleLeaveScoring = useCallback(() => {
    Alert.alert(
      "Leave Live Scoring?",
      "Your match progress is saved and live. You can resume anytime from My Cricket.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave Match",
          style: "destructive",
          onPress: () => {
            isLeavingRef.current = true;
            navigation.navigate(SCREENS.MyCricket);
          },
        },
      ]
    );
  }, [navigation]);

  const handleGoHome = useCallback(() => {
    Alert.alert(
      "Return to Home?",
      "Your match progress is saved and live. You can resume anytime from My Cricket.",
      [
        { text: "Stay Scoring", style: "cancel" },
        {
          text: "Go to Home",
          onPress: () => {
            isLeavingRef.current = true;
            navigation.navigate(SCREENS.Home);
          },
        },
      ]
    );
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      isLeavingRef.current = false;

      const backAction = () => {
        if (!navigation.isFocused()) {
          return false;
        }
        handleLeaveScoring();
        return true; // prevent default back popping
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      const unsubscribe = navigation.addListener("beforeRemove", (e) => {
        const actionType = e.data?.action?.type;
        if (actionType !== "GO_BACK" && actionType !== "POP") return;
        if (isLeavingRef.current || !navigation.isFocused()) return;
        e.preventDefault();
        handleLeaveScoring();
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation, handleLeaveScoring])
  );

  const openPopup = (content) => {
    setPopupContent(content);
    setIsPopupOpen(true);
  };
  const closePopup = () => {
    setIsPopupOpen(false);
    setPopupContent(null);
  };

  const onRefresh = () => {
    if (!matchID) return;

    setRefreshing(true);
    // Rejoin room and also fetch the formatted score via REST as a fallback.
    emit("score", { matchId: matchID, matchID });
    Promise.all([
      matchesApi.getMatchScore(matchID),
      matchesApi.getMatchById(matchID),
    ])
      .then(([scoreRes, matchRes]) => {
        const formatted = scoreRes?.data;
        if (formatted && typeof formatted === "object" && formatted.success !== false) {
          const hasScoreShape = formatted.batting || formatted.batsman || formatted.bowler;
          if (hasScoreShape) setScore(formatted);
        }
        if (matchRes?.data) {
          setMatchDetails(matchRes.data);
        }
      })
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", async () => {
      onRefresh();

      if (pendingResumeSheetRef.current) {
        const sheetToResume = pendingResumeSheetRef.current;
        pendingResumeSheetRef.current = null;

        try {
          const [matchRes, scoreRes] = await Promise.all([
            matchesApi.getMatchById(matchID),
            matchesApi.getMatchScore(matchID),
          ]);
          const updatedMatch = matchRes?.data;
          const updatedScore = scoreRes?.data;
          if (updatedMatch) setMatchDetails(updatedMatch);
          if (updatedScore && typeof updatedScore === "object") setScore(updatedScore);

          const allTeams = updatedMatch?.teams || [];
          const currentScore = updatedScore || scoreRef.current || {};
          const battingId = String(currentScore?.batting?.battingId || currentScore?.batting?.teamId || "");
          const bowlingId = String(currentScore?.bowling?.bowlingId || currentScore?.bowling?.teamId || "");

          if (sheetToResume === "nextBatter") {
            const bTeam = allTeams.find((t) => battingId && String(t.teamId || t.id || t._id) === battingId) || allTeams[0];
            let squad = [...(bTeam?.players || bTeam?.squad || [])];

            if (battingId) {
              try {
                const teamRes = await teamsApi.getTeamById(battingId);
                const teamObj = Array.isArray(teamRes?.data) ? teamRes.data[0] : (teamRes?.data?.content || teamRes?.data);
                if (teamObj?.players && Array.isArray(teamObj.players)) {
                  const map = new Map();
                  squad.forEach((p) => {
                    const id = String(p.id || p._id || p.playerId || p.name);
                    if (id) map.set(id, p);
                  });
                  teamObj.players.forEach((p) => {
                    const id = String(p.id || p._id || p.playerId || p.name);
                    if (id && !map.has(id)) map.set(id, p);
                  });
                  squad = Array.from(map.values());
                }
              } catch (e) {
                console.warn("[FOCUS-RESUME] Failed to fetch batting team squad:", e);
              }
            }

            const activeBatsmenIds = (currentScore?.batsman || []).map((b) => String(b.id || b.playerId || b._id));
            const outBatsmenIds = (currentScore?.outBatsman || []).map((b) => String(b.id || b.playerId || b._id));
            const eligible = squad.filter((p) => !activeBatsmenIds.includes(String(p.id || p._id || p.playerId)) && !outBatsmenIds.includes(String(p.id || p._id || p.playerId)));
            setAvailableBatters(eligible.length > 0 ? eligible : squad);
            setNextBatterModalVisible(true);
          } else if (sheetToResume === "nextBowler") {
            const bowlTeam = allTeams.find((t) => bowlingId && String(t.teamId || t.id || t._id) === bowlingId) || allTeams[1] || allTeams[0];
            let squad = [...(bowlTeam?.players || bowlTeam?.squad || [])];

            if (bowlingId) {
              try {
                const teamRes = await teamsApi.getTeamById(bowlingId);
                const teamObj = Array.isArray(teamRes?.data) ? teamRes.data[0] : (teamRes?.data?.content || teamRes?.data);
                if (teamObj?.players && Array.isArray(teamObj.players)) {
                  const map = new Map();
                  squad.forEach((p) => {
                    const id = String(p.id || p._id || p.playerId || p.name);
                    if (id) map.set(id, p);
                  });
                  teamObj.players.forEach((p) => {
                    const id = String(p.id || p._id || p.playerId || p.name);
                    if (id && !map.has(id)) map.set(id, p);
                  });
                  squad = Array.from(map.values());
                }
              } catch (e) {
                console.warn("[FOCUS-RESUME] Failed to fetch bowling team squad:", e);
              }
            }

            const currentBowlerId = String(currentScore?.bowler?.playerId || currentScore?.bowler?.id || currentScore?.bowler?._id || "");
            const eligible = squad.filter((p) => String(p.id || p._id || p.playerId) !== currentBowlerId);
            setAvailableBowlers(eligible.length > 0 ? eligible : squad);
            setNextBowlerModalVisible(true);
          }
        } catch (err) {
          console.warn("[FOCUS-RESUME] Error refreshing squad after adding player:", err);
          if (sheetToResume === "nextBatter") setNextBatterModalVisible(true);
          else if (sheetToResume === "nextBowler") setNextBowlerModalVisible(true);
        }
      }
    });
    return () => {
      unsubscribeFocus();
    };
  }, [navigation, matchID]);

  const scoreHandler = useCallback(
    (data) => {
      console.log("[SOCKET-SCORE] 📡 Received 'score' event");

      if (!data || typeof data !== "object") {
        console.warn("[SOCKET-SCORE] ⚠️ data is null or not an object");
        return;
      }

      if (data.success === false) {
        console.warn("[SOCKET-SCORE] ⚠️ Ignoring failed score payload:", data?.message);
        return;
      }

      // Filter incoming score by matchId to prevent cross-talk between matches
      const incomingMatchId =
        data.matchId ||
        data.matchID ||
        data._id ||
        data.id ||
        data.fullCommentary?.[0]?.match;

      if (incomingMatchId && matchID && String(incomingMatchId) !== String(matchID)) {
        console.warn(
          `[SOCKET-SCORE] ⛔ Discarded score update for different match: ${incomingMatchId} (current: ${matchID})`
        );
        return;
      }

      console.log("[SOCKET-SCORE] data.batting:", JSON.stringify(data?.batting));
      console.log("[SOCKET-SCORE] data.batsman count:", data?.batsman?.length);
      console.log("[SOCKET-SCORE] data.bowler:", JSON.stringify(data?.bowler));

      const hasScoreShape =
        data.batting || data.batsman || data.bowler || data.inning || data.teams;
      if (hasScoreShape) {
        console.log("[SOCKET-SCORE] ✅ Calling setScore for match:", matchID);
        setScore(data);
      } else {
        console.warn("[SOCKET-SCORE] ⚠️ No score shape found, skipping setScore");
      }
    },
    [matchID]
  );


  // Wicket & Next Batter Flow
  const handleWicket = useCallback(
    (type = 1, callSelectStrike = false, options = {}) => {
      const latestScore = scoreRef.current || {};
      const latestMatchDetails = matchDetailsRef.current || {};
      const currentStatus = latestScore?.matchCurrentStatus?.toUpperCase();

      if (
        currentStatus === "INNINGS_I_ENDED" ||
        currentStatus === "MATCH_ENDED" ||
        currentStatus === "MATCH_COMPLETED"
      ) {
        return;
      }

      const allTeams = latestMatchDetails?.teams || latestScore?.teams || [];
      const battingId = String(
        latestScore?.batting?.battingId ||
        latestScore?.batting?.teamId ||
        ""
      );
      const battingTeamData =
        allTeams.find((t) => battingId && String(t.teamId || t.id || t._id) === battingId) ||
        allTeams[0] || { players: [] };
      const battingSquad = battingTeamData?.players || battingTeamData?.squad || [];

      // Validation 1: singleBatsmanAllowed check (when only 1 batter remains, they bat alone)
      if (
        latestScore?.matchConfig?.singleBatsmanAllowed &&
        latestScore?.currentInningWicket === battingSquad.length - 2
      ) {
        console.log("[WICKET] singleBatsmanAllowed and 1 batsman remains alone — skipping incoming batter");
        return;
      }

      // Validation 2: all-out check (no incoming batters left)
      const maxWickets = latestScore?.matchConfig?.singleBatsmanAllowed
        ? battingSquad.length
        : Math.max(0, battingSquad.length - 1);
      if (
        battingSquad.length > 0 &&
        latestScore?.currentInningWicket >= maxWickets
      ) {
        console.log("[WICKET] All out reached — skipping incoming batter");
        return;
      }

      // Snapshot active batsmen before the wicket so we always know the surviving partner
      const snapshotActiveBatsmen = (latestScore?.batsman || []).map((b) => ({
        id: b.id || b.playerId || b._id,
        playerId: b.playerId || b.id || b._id,
        name: b.name || b.username,
        username: b.name || b.username,
        isStrikeEnd: b.isStrikeEnd,
      }));

      pendingWicketFlowRef.current = {
        type,
        callSelectStrike,
        options,
        activeBatsmen: snapshotActiveBatsmen,
      };

      const activeBatsmenIds = (latestScore?.batsman || []).map((b) =>
        String(b.id || b.playerId || b._id)
      );
      const outBatsmenIds = (latestScore?.outBatsman || []).map((b) =>
        String(b.id || b.playerId || b._id)
      );

      const eligibleBatters =
        latestScore?.batsmanUpcoming && latestScore.batsmanUpcoming.length > 0
          ? latestScore.batsmanUpcoming
          : battingSquad.filter(
              (p) =>
                !activeBatsmenIds.includes(String(p.id || p._id || p.playerId)) &&
                !outBatsmenIds.includes(String(p.id || p._id || p.playerId))
            );

      setAvailableBatters(eligibleBatters);
      setNextBatterModalVisible(true);
    },
    []
  );
  handleWicketRef.current = handleWicket;

  const handleSelectNextBatter = (player) => {
    const pendingFlow = pendingWicketFlowRef.current;
    const isNonStrikerWicket = pendingFlow?.type === 2;
    const shouldPromptStrike = Boolean(pendingFlow?.callSelectStrike);
    const outBatmanId = String(pendingFlow?.options?.outBatman || "");

    const newBatterId = player.id || player._id || player.playerId;
    const newBatterName = player.name || player.username;

    const data = {
      userId,
      matchId: matchID,
      action: "BATSMAN_SELECTED",
      data: {
        batsman: {
          name: newBatterName,
          id: newBatterId,
          isStrikeEnd: isNonStrikerWicket ? false : true,
        },
      },
    };
    emit("update-score", data);
    setNextBatterModalVisible(false);

    if (shouldPromptStrike) {
      // Find surviving partner:
      // 1. Look in snapshot taken at wicket time
      const snapshotBatsmen = pendingFlow?.activeBatsmen || [];
      const currentLiveBatsmen = (scoreRef.current?.batsman || []).map((b) => ({
        id: b.id || b.playerId || b._id,
        playerId: b.playerId || b.id || b._id,
        name: b.name || b.username,
        username: b.name || b.username,
        isStrikeEnd: b.isStrikeEnd,
      }));

      // A surviving batter is one whose ID != outBatmanId
      let survivingBatter = snapshotBatsmen.find((b) => {
        const bId = String(b.id || b.playerId || "");
        return bId && outBatmanId && bId !== outBatmanId;
      });

      // Fallback 2: Check current live batsmen for someone who is not outBatmanId and not the incoming player
      if (!survivingBatter) {
        survivingBatter = currentLiveBatsmen.find((b) => {
          const bId = String(b.id || b.playerId || "");
          const isNotOut = outBatmanId ? bId !== outBatmanId : true;
          const isNotNew = String(newBatterId) !== bId;
          return isNotOut && isNotNew;
        });
      }

      // Fallback 3: First available live batsman who is not the newly selected one
      if (!survivingBatter) {
        survivingBatter = currentLiveBatsmen.find(
          (b) => String(b.id || b.playerId || "") !== String(newBatterId)
        ) || snapshotBatsmen[0];
      }

      const survivingBatterObj = survivingBatter
        ? {
            id: survivingBatter.id || survivingBatter.playerId,
            playerId: survivingBatter.playerId || survivingBatter.id,
            name: survivingBatter.name || survivingBatter.username || "Surviving Batsman",
            username: survivingBatter.name || survivingBatter.username || "Surviving Batsman",
          }
        : null;

      const newBatterObj = {
        id: newBatterId,
        playerId: newBatterId,
        name: newBatterName || "Incoming Batsman",
        username: newBatterName || "Incoming Batsman",
      };

      const candidates = [survivingBatterObj, newBatterObj].filter(Boolean);
      console.log("[STRIKE-SELECTION] Resolved striker candidates:", JSON.stringify(candidates));
      setStrikerCandidates(candidates);
      setSelectStrikerModalVisible(true);
    }

    pendingWicketFlowRef.current = null;
  };

  const handleSelectStriker = (player) => {
    const strikerId = player.id || player._id || player.playerId;
    const data = {
      userId,
      matchId: matchID,
      action: "SET_STRIKER",
      data: {
        striker: strikerId,
      },
    };
    emit("set-striker", data);
    setSelectStrikerModalVisible(false);
  };

  // Over Complete & Next Bowler Flow
  const handleOverComplete = useCallback(() => {
    const latestScore = scoreRef.current || {};
    const latestMatchDetails = matchDetailsRef.current || {};

    if (
      latestScore?.matchCurrentStatus?.toUpperCase() === "INNINGS_I_ENDED" ||
      latestScore?.matchCurrentStatus?.toUpperCase() === "MATCH_COMPLETED" ||
      latestScore?.matchCurrentStatus?.toUpperCase() === "MATCH_ENDED"
    ) {
      return;
    }

    const allTeams = latestMatchDetails?.teams || latestScore?.teams || [];
    const battingId = String(
      latestScore?.batting?.battingId ||
      latestScore?.batting?.teamId ||
      ""
    );
    const bowlingTitle = String(
      latestScore?.bowling?.teamName || ""
    ).toLowerCase().trim();

    const getTeamIdHelper = (team) => {
      if (!team) return "";
      if (typeof team.teamId === "object" && team.teamId?._id) return String(team.teamId._id);
      if (team.teamId) return String(team.teamId);
      if (team._id) return String(team._id);
      if (team.id) return String(team.id);
      return "";
    };

    let bowlTeam = null;
    const tossDecision = latestMatchDetails?.score?.toss?.decision;
    const tossWinningTeam = String(latestMatchDetails?.score?.toss?.winningTeam?._id || latestMatchDetails?.score?.toss?.winningTeam || "");

    if (tossDecision === "BAT" && tossWinningTeam && allTeams.length >= 2) {
      allTeams.forEach((team) => {
        if (getTeamIdHelper(team) !== tossWinningTeam) bowlTeam = team;
      });
    } else if (tossDecision === "FIELD" && tossWinningTeam && allTeams.length >= 2) {
      allTeams.forEach((team) => {
        if (getTeamIdHelper(team) === tossWinningTeam) bowlTeam = team;
      });
    }

    if (latestMatchDetails?.currentInnings && latestMatchDetails.currentInnings != 1 && bowlTeam) {
      bowlTeam = allTeams.find((t) => t !== bowlTeam);
    }

    if (!bowlTeam && battingId) {
      bowlTeam = allTeams.find((t) => getTeamIdHelper(t) !== battingId);
    }

    if (!bowlTeam && bowlingTitle) {
      bowlTeam = allTeams.find((t) => {
        const title = (t?.title || t?.name || t?.teamId?.name || t?.teamId?.title || "").toLowerCase().trim();
        return title === bowlingTitle;
      });
    }

    if (!bowlTeam) bowlTeam = allTeams[1] || allTeams[0] || { players: [] };

    let bowlingSquad = bowlTeam?.players || bowlTeam?.squad || [];
    const bowlTeamId = getTeamIdHelper(bowlTeam) || latestScore?.bowling?.bowlingId || latestScore?.bowling?.teamId || "";

    const applyBowlers = (squad) => {
      const currentBowlerId = String(
        latestScore?.bowler?.playerId ||
          latestScore?.bowler?.id ||
          latestScore?.bowler?._id ||
          ""
      );
      const eligibleBowlers = squad.filter((p) => {
        const pId = String(p.id || p._id || p.playerId || "");
        if (currentBowlerId && pId && pId === currentBowlerId) return false;
        return true;
      });
      console.log(
        "[OVER-COMPLETE] Resolved bowlingTeam:",
        bowlTeam?.title || bowlTeam?.name,
        "squad count:",
        squad.length,
        "eligible count:",
        eligibleBowlers.length
      );
      setAvailableBowlers(eligibleBowlers.length > 0 ? eligibleBowlers : squad);
      setNextBowlerModalVisible(true);
    };

    if (bowlingSquad.length === 0 && bowlTeamId) {
      request(`api/teams/${bowlTeamId}`, { method: "GET", errorAlert: false })
        .then((res) => {
          const fetchedPlayers = res?.data?.players || res?.data?.data?.players || (Array.isArray(res?.data) ? res.data[0]?.players : []);
          if (Array.isArray(fetchedPlayers) && fetchedPlayers.length > 0) {
            applyBowlers(fetchedPlayers);
          } else {
            applyBowlers(bowlingSquad);
          }
        })
        .catch(() => {
          applyBowlers(bowlingSquad);
        });
    } else {
      applyBowlers(bowlingSquad);
    }
  }, []);
  handleOverCompleteRef.current = handleOverComplete;

  const handleSelectNextBowler = (player) => {
    const data = {
      userId,
      matchId: matchID,
      action: "BOWLER_SELECTED",
      data: {
        bowler: player.id || player._id || player.playerId,
        name: player.name || player.username,
      },
    };
    emit("update-score", data);
    setNextBowlerModalVisible(false);
  };

  // Innings Complete Flow
  const handleInningsComplete = useCallback(() => {
    setInningsCompleteModalVisible(true);
  }, []);
  handleInningsCompleteRef.current = handleInningsComplete;

  const handleStartInningsTwo = () => {
    updateScore("END_OF_INNINGS", {});
    setInningsCompleteModalVisible(false);
    isLeavingRef.current = true;
    navigation.navigate(SCREENS.PlayerSelectionScreen, {
      matchId: matchID,
      ...route.params,
    });
  };

  useEffect(() => {
    if (!score || Object.keys(score).length === 0) return;

    if (score?.matchCurrentStatus === MATCH_STATUS.INNINGS_I_ENDED) {
      setInningsCompleteModalVisible(true);
    } else if (score?.matchCurrentStatus === MATCH_STATUS.MATCH_COMPLETED) {
      setMatchCompleteModalVisible(true);
    }

    // Mid-match check on initial load (matches web ScorerScreen.jsx lines 554-578)
    if (isFirstTimeScoreLoadedRef.current) {
      const bowlerSelectionCondition =
        score?.bowler &&
        !score?.bowler?.isBowlingCurrentOver &&
        (score?.matchCurrentStatus === MATCH_STATUS.MATCH_STARTED ||
          score?.matchCurrentStatus === MATCH_STATUS.INNINGS_I ||
          score?.matchCurrentStatus === MATCH_STATUS.INNINGS_II);

      if (bowlerSelectionCondition) {
        handleOverCompleteRef.current?.();
      }

      const batsmanSelectionCondition =
        (score?.batsman?.length === 0 ||
          (score?.batsman?.length === 1 &&
            !matchDetails?.config?.singleBatsmanAllowed)) &&
        score?.batsmanUpcoming?.length;

      if (batsmanSelectionCondition) {
        handleWicketRef.current?.();
      }

      isFirstTimeScoreLoadedRef.current = false;
    }
  }, [score, matchDetails]);

  useEffect(() => {
    if (!matchID) {
      console.warn("[MOUNT] ⚠️ matchID is undefined/null — skipping API fetch. route.params:", JSON.stringify(route.params));
      setIsStatusChecked(true);
      return;
    }

    console.log("[MOUNT] 🔵 Starting API fetch for matchID:", matchID);
    console.log("[MOUNT] URLs: GET api/matches/" + matchID + " | POST api/matches/" + matchID);

    Promise.all([
      matchesApi.getMatchById(matchID),
      matchesApi.getMatchScore(matchID),
    ])
      .then(([matchRes, scoreRes]) => {
        // --- Log raw responses ---
        console.log("[MOUNT] matchRes HTTP status:", matchRes?.status);
        console.log("[MOUNT] matchRes.data type:", typeof matchRes?.data);
        console.log("[MOUNT] matchRes.data.status:", matchRes?.data?.status);
        console.log("[MOUNT] matchRes.data._id:", matchRes?.data?._id);

        console.log("[MOUNT] scoreRes HTTP status:", scoreRes?.status);
        console.log("[MOUNT] scoreRes.data type:", typeof scoreRes?.data);
        console.log("[MOUNT] scoreRes.data.success:", scoreRes?.data?.success);
        console.log("[MOUNT] scoreRes.data.batting:", JSON.stringify(scoreRes?.data?.batting));
        console.log("[MOUNT] scoreRes.data.batsman:", JSON.stringify(scoreRes?.data?.batsman));
        console.log("[MOUNT] scoreRes.data.bowler:", JSON.stringify(scoreRes?.data?.bowler));
        console.log("[MOUNT] scoreRes.data.matchCurrentStatus:", scoreRes?.data?.matchCurrentStatus);
        console.log("[MOUNT] scoreRes.data keys:", Object.keys(scoreRes?.data || {}));

        // --- Status redirect check ---
        if (matchRes?.data) {
          const m = matchRes.data;
          setMatchDetails(m);

          if (
            m.status === MATCH_STATUS.MATCH_CREATED ||
            m.status === MATCH_STATUS.MATCH_DETAILS_ENTERED ||
            m.status === MATCH_STATUS.TOSS
          ) {
            console.log("[MOUNT] 🔀 Redirecting away from ScorerScreen, status:", m.status);
            isLeavingRef.current = true;
            const target = matchRedirectBasedOnStatus(matchID, m.status);
            navigation.replace(target.screen, target.params);
            return;
          }
        }

        // --- Set score state ---
        const formatted = scoreRes?.data;
        const hasBatting = !!formatted?.batting;
        const hasBatsman = !!formatted?.batsman;
        const hasBowler = !!formatted?.bowler;

        console.log("[MOUNT] Score shape check — hasBatting:", hasBatting, "hasBatsman:", hasBatsman, "hasBowler:", hasBowler);

        if (formatted && typeof formatted === "object" && formatted.success !== false) {
          if (hasBatting || hasBatsman || hasBowler) {
            console.log("[MOUNT] ✅ Calling setScore with formatted data");
            setScore(formatted);
          } else {
            console.warn("[MOUNT] ⚠️ score response missing batting/batsman/bowler. Keys:", Object.keys(formatted));
          }
        } else {
          console.warn("[MOUNT] ⚠️ score response invalid. success:", formatted?.success, "message:", formatted?.message);
        }

        console.log("[MOUNT] ✅ Calling setIsStatusChecked(true)");
        setIsStatusChecked(true);
      })
      .catch((err) => {
        console.error("[MOUNT] ❌ API fetch error:", err?.message || err);
        setIsStatusChecked(true);
      });
  }, [matchID, navigation]);







  useEffect(() => {
    if (!matchID) return;

    // Reset previous match score immediately so stale match data never renders
    setScore({});
    setMatchDetails(null);
    setIsStatusChecked(false);

    const socketUrl = SOCKET_URL;
    console.log("🔌 [ScorerScreen] Initializing dedicated match socket for:", matchID);

    const socketConn = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 15000,
    });
    socketRef.current = socketConn;

    const joinRoom = () => {
      console.log("🔌 [ScorerScreen Dedicated Socket] Joining room:", matchID);
      socketConn.emit("score", { matchId: matchID, matchID });
      setIsConnected(true);
    };

    const handleInningsStartSocket = () => {
      isLeavingRef.current = true;
      navigation.navigate(SCREENS.PlayerSelectionScreen, { matchId: matchID });
    };

    const stableOverComplete = (...args) => handleOverCompleteRef.current?.(...args);
    const stableInningsComplete = (...args) => handleInningsCompleteRef.current?.(...args);

    socketConn.on("connect", joinRoom);
    socketConn.on("reconnect", joinRoom);
    socketConn.on("disconnect", () => setIsConnected(false));
    socketConn.on("score", scoreHandler);
    socketConn.on("over-complete", stableOverComplete);
    socketConn.on("innings-complete", stableInningsComplete);
    socketConn.on("INNINGS_START", handleInningsStartSocket);

    if (socketConn.connected) {
      joinRoom();
    }

    return () => {
      console.log("🔌 [ScorerScreen] Disconnecting dedicated socket for match:", matchID);
      socketConn.off("connect", joinRoom);
      socketConn.off("reconnect", joinRoom);
      socketConn.off("score", scoreHandler);
      socketConn.off("over-complete", stableOverComplete);
      socketConn.off("innings-complete", stableInningsComplete);
      socketConn.off("INNINGS_START", handleInningsStartSocket);
      socketConn.disconnect();
      socketRef.current = null;
    };
  }, [matchID, scoreHandler, navigation]);



  const updateScore = (action, data = {}) => {
    const effectiveUserId = userId || User.id;
    if (!matchID) {
      Alert.alert("Match not ready", "Please reopen this match and try again.");
      return;
    }

    if (!effectiveUserId) {
      Alert.alert("Login required", "Please log in again before scoring.");
      return;
    }

    const payload = {
      userId: effectiveUserId,
      matchId: matchID,
      action,
      data,
    };
    console.log("[UPDATE-SCORE] 🟢 Emitting 'update-score' event:");
    console.log("[UPDATE-SCORE] action:", action);
    console.log("[UPDATE-SCORE] matchId:", matchID);
    console.log("[UPDATE-SCORE] userId:", effectiveUserId);
    console.log("[UPDATE-SCORE] data:", JSON.stringify(data));
    emit("update-score", payload);
  };


  const handleBall = ({
    runs = 0,
    runType = "bat",
    isWicket = false,
    ballType = "ball",
    isBoundary = false,
    dismissalInfo = null,
    dontCountTheball = false,
    actionBatsmen = null,
    canBatAgain = false,
    isStrikeEnd = undefined,
  }) => {
    const latestScore = scoreRef.current || {};

    console.log("[HANDLE-BALL] latestScore.batsman:", JSON.stringify(latestScore?.batsman));
    console.log("[HANDLE-BALL] latestScore.bowler:", JSON.stringify(latestScore?.bowler));

    const activeStriker =
      latestScore?.batsman?.find((b) => b?.isStrikeEnd)?.playerId ||
      latestScore?.batsman?.find((b) => b?.isStrikeEnd)?.id ||
      latestScore?.batsman?.[0]?.playerId ||
      latestScore?.batsman?.[0]?.id ||
      route.params?.striker?.id ||
      route.params?.striker?._id ||
      route.params?.striker?.playerId;

    const activeBowler =
      latestScore?.bowler?.playerId ||
      latestScore?.bowler?._id ||
      latestScore?.bowler?.id ||
      route.params?.bowler?.id ||
      route.params?.bowler?._id ||
      route.params?.bowler?.playerId;

    console.log("[HANDLE-BALL] resolved activeStriker:", activeStriker);
    console.log("[HANDLE-BALL] resolved activeBowler:", activeBowler);

    if (!activeStriker || !activeBowler) {
      console.warn("[HANDLE-BALL] ⚠️ Missing striker or bowler — aborting");
      Alert.alert(
        "Selection Required",
        "Please ensure both striker and bowler are selected before scoring."
      );
      return;
    }

    const ballData = {
      bowler: activeBowler,
      batsman: activeStriker,
      runs,
      runType,
      isWicket,
      isBoundary: isBoundary || (runType === "bat" && ballType === "ball" && (runs === 4 || runs === 6)),
      ballType,
      dismissalInfo,
      actionBatsmen: actionBatsmen || (isWicket ? activeStriker : undefined),
      canBatAgain: Boolean(canBatAgain),
      dontCountTheball: dontCountTheball || ballType === "wide" || ballType === "no-ball",
    };

    if (isStrikeEnd !== undefined) {
      ballData.isStrikeEnd = isStrikeEnd;
    }

    updateScore(MATCH_ACTION.MATCH_BALL, ballData);
    // Note: Wicket handling is triggered by OutOptions via onWicket() with proper strike & batsman options
  };

  const handleUndo = () => {
    updateScore(MATCH_ACTION.UNDO_LAST_BALL, {});
  };

  const handleChangeStrike = () => {
    updateScore(MATCH_ACTION.CHANGE_STRIKE, {});
  };

  const leftButtons = [
    ["0", "1", "2"],
    ["3", "4\nFour", "6\nSIX"],
    ["WD", "NB", "BYE"],
  ];

  const rightButtons = ["UNDO", "5,7", "OUT", "LB"];

  // ─── RENDER-TIME DEBUG ────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════");
  console.log("[RENDER] isStatusChecked:", isStatusChecked);
  console.log("[RENDER] matchID:", matchID);
  console.log("[RENDER] score.batting:", score?.batting);
  console.log("[RENDER] score.batsman:", score?.batsman);
  console.log("[RENDER] score.bowler:", score?.bowler);
  console.log("[RENDER] score.totalOvers:", score?.totalOvers);
  console.log("[RENDER] score keys:", Object.keys(score || {}));
  console.log("═══════════════════════════════════════════════");

  // Gate render until the initial status-check API call completes.
  if (!isStatusChecked) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <ThemedText
          style={{
            marginTop: 16,
            fontSize: 15,
            fontWeight: "600",
            color: isDarkMode ? "#94a3b8" : "#64748b",
          }}
        >
          Loading match scorer...
        </ThemedText>
      </View>
    );
  }

  const allTeams = matchDetails?.teams || score?.teams || [];
  const battingTeamId = String(score?.batting?.battingId || score?.batting?.teamId || "");
  const bowlingTeamTitle = String(score?.bowling?.teamName || "").toLowerCase().trim();

  const getTeamId = (team) => {
    if (!team) return "";
    if (typeof team.teamId === "object" && team.teamId?._id) return String(team.teamId._id);
    if (team.teamId) return String(team.teamId);
    if (team._id) return String(team._id);
    if (team.id) return String(team.id);
    return "";
  };

  const getTeamTitle = (team, fallback = "") => {
    if (!team) return fallback;
    if (typeof team.teamId === "object" && (team.teamId?.name || team.teamId?.title)) {
      return team.teamId?.name || team.teamId?.title;
    }
    return team.name || team.title || fallback;
  };

  let resolvedBattingObj = null;
  let resolvedBowlingObj = null;

  const tossDecision = matchDetails?.score?.toss?.decision;
  const tossWinningTeam = String(matchDetails?.score?.toss?.winningTeam?._id || matchDetails?.score?.toss?.winningTeam || "");

  if (tossDecision === "BAT" && tossWinningTeam && allTeams.length >= 2) {
    allTeams.forEach((team) => {
      const tId = getTeamId(team);
      if (tId === tossWinningTeam) {
        resolvedBattingObj = team;
      } else {
        resolvedBowlingObj = team;
      }
    });
  } else if (tossDecision === "FIELD" && tossWinningTeam && allTeams.length >= 2) {
    allTeams.forEach((team) => {
      const tId = getTeamId(team);
      if (tId === tossWinningTeam) {
        resolvedBowlingObj = team;
      } else {
        resolvedBattingObj = team;
      }
    });
  }

  if (matchDetails?.currentInnings && matchDetails.currentInnings != 1 && resolvedBattingObj && resolvedBowlingObj) {
    [resolvedBattingObj, resolvedBowlingObj] = [resolvedBowlingObj, resolvedBattingObj];
  }

  if (!resolvedBattingObj && battingTeamId) {
    resolvedBattingObj = allTeams.find((t) => getTeamId(t) === battingTeamId);
    resolvedBowlingObj = allTeams.find((t) => getTeamId(t) !== battingTeamId);
  }

  if (!resolvedBowlingObj && bowlingTeamTitle) {
    resolvedBowlingObj = allTeams.find((t) => getTeamTitle(t).toLowerCase().trim() === bowlingTeamTitle);
    if (resolvedBowlingObj && !resolvedBattingObj) {
      resolvedBattingObj = allTeams.find((t) => t !== resolvedBowlingObj);
    }
  }

  if (!resolvedBattingObj) resolvedBattingObj = allTeams[0] || { players: [] };
  if (!resolvedBowlingObj) resolvedBowlingObj = allTeams.find((t) => t !== resolvedBattingObj) || allTeams[1] || allTeams[0] || { players: [] };

  const battingTeamData = {
    ...resolvedBattingObj,
    ...score?.batting,
    teamId: getTeamId(resolvedBattingObj) || battingTeamId || "",
    teamName: score?.batting?.teamName || getTeamTitle(resolvedBattingObj, "Batting Team"),
    players: resolvedBattingObj?.players || resolvedBattingObj?.squad || [],
  };

  const bowlingTeamData = {
    ...resolvedBowlingObj,
    ...score?.bowling,
    teamId: getTeamId(resolvedBowlingObj) || score?.bowling?.bowlingId || score?.bowling?.teamId || "",
    teamName: score?.bowling?.teamName || getTeamTitle(resolvedBowlingObj, "Bowling Team"),
    players: resolvedBowlingObj?.players || resolvedBowlingObj?.squad || [],
  };

  return (
    <ScorerScreenContext.Provider value={{ score }}>
      <View style={{ flex: 1, backgroundColor: isDarkMode ? "#111827" : "#ffffff" }}>
        {/* Top safe area for status bar: primary blue */}
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "#3B82F6" }} />
        {/* Main content safe area: matches screen theme */}
        <SafeAreaView
          edges={["left", "right", "bottom"]}
          style={{ flex: 1, backgroundColor: isDarkMode ? "#111827" : "#ffffff" }}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, backgroundColor: isDarkMode ? "#111827" : "#ffffff" }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
          {/* Connection status banner */}
          {!isConnected && (
            <View className="bg-amber-500 py-1.5 px-4 flex-row items-center justify-center">
              <ThemedText className="text-xs text-black font-semibold">
                Connecting to live scoring server...
              </ThemedText>
            </View>
          )}

          {/* Header — no flex-1 here, it must size to its own content */}
          <View className="bg-primary">
            <MatchHeader
              matchID={matchID}
              bowlingTeam={score?.bowling}
              battingTeam={score?.batting}
              currentOver={score?.batting?.score?.over}
              batsmen={score?.batsman}
              bowler={score?.bowler}
              showHomeIcon={true}
              showSetting={true}
              navigation={navigation}
              discription={"Scorer Screen"}
              handleInningsComplete={handleInningsComplete}
              onBack={handleLeaveScoring}
              onHome={handleGoHome}
              matchDetails={matchDetails}
              score={score}
              cb={() => emit("score", { matchId: matchID, matchID })}
            />
          </View>

          {/* Score display */}
          <View
            style={[
              styles.scoreContainer,
              isDarkMode ? styles.scoreContainerDark : styles.scoreContainerLight,
            ]}
            className="items-center justify-center bg-primary"
          >
            <ThemedText className="text-4xl font-bold text-white">
              {`${score?.batting?.score?.runs ?? 0}/${score?.batting?.score?.wicket ?? 0}`}
            </ThemedText>
            <ThemedText className="text-2xl text-gray-200">
              {`(${score?.batting?.score?.over ?? 0}/${score?.totalOvers ?? 0})`}
            </ThemedText>
            <ThemedText className="text-xl text-gray-400">
              {score?.description || ""}
            </ThemedText>
          </View>

          {/* Batsmen */}
          <View
            className={`flex-row items-center justify-between px-4 py-2 border-t ${
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-blue-50/70 border-gray-200"
            }`}
          >
            <ThemedText className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Current Batsmen (🏏 On Strike)
            </ThemedText>
            <TouchableOpacity
              onPress={handleChangeStrike}
              className="px-3 py-1 bg-blue-600 rounded-full flex-row items-center"
              activeOpacity={0.7}
            >
              <ThemedText className="text-white text-xs font-semibold">
                🔄 Change Strike
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View
            className={`flex-row border-b ${
              isDarkMode
                ? "border-gray-700 bg-gray-900"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            {score?.batsman?.map((b, idx) => (
              <View key={idx} className="flex-1 p-3 items-center">
                <ThemedText
                  className={`text-xl font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {b?.isStrikeEnd ? "🏏 " : ""}
                  {b?.name}
                </ThemedText>
                {b?.ballsFaced === 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <ThemedText
                      className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                    >
                      0 (0)
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => {
                        const bTeamId =
                          score?.batting?.battingId ||
                          score?.batting?.teamId ||
                          battingTeamData?.teamId ||
                          battingTeamData?.id ||
                          battingTeamData?._id;
                        navigation.navigate(SCREENS.ChangeBowler, {
                          teamId: bTeamId,
                          matchId: matchID,
                          playerId: b?.playerId || b?.id || b?._id,
                          playerName: b?.name || b?.username,
                          squad: battingTeamData?.players || battingTeamData?.squad || [],
                          cb: onRefresh,
                        });
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: isDarkMode ? "#374151" : "#e5e7eb",
                      }}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={{ fontSize: 11, color: "#3b82f6", fontWeight: "600" }}>
                        Replace
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ThemedText
                    className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                  >
                    {b?.runs || 0} ({b?.ballsFaced || 0})
                  </ThemedText>
                )}
              </View>
            ))}
          </View>

          {/* Bowler / Current Over */}
          <ScrollView
            horizontal
            className={`p-2 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
            style={{ maxHeight: 40 }}
            showsHorizontalScrollIndicator={false}
          >
            <View className="flex-row gap-2 items-center">
              {(score?.currentOver && score?.currentOver?.length > 0
                ? score.currentOver
                : []
              ).map((run, idx) => (
                <BallPreview key={idx} ball={run} run={run} />
              ))}
              {(!score?.currentOver || score?.currentOver?.length === 0) && (
                <ThemedText className="text-xs text-gray-400 pl-2">
                  This Over: 0 balls
                </ThemedText>
              )}
            </View>
          </ScrollView>

          <View
            className={`p-3 flex-row justify-between items-center border-b ${
              isDarkMode
                ? "border-gray-700 bg-gray-900"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ThemedText
                className={`${isDarkMode ? "text-white" : "text-gray-800"}`}
              >
                ⚾ {score?.bowler?.name || ""}
              </ThemedText>
              {(!score?.currentOver || score?.currentOver?.length === 0) && (
                <TouchableOpacity
                  onPress={() => {
                    const bowlTeamId =
                      score?.bowling?.bowlingId ||
                      score?.bowling?.teamId ||
                      bowlingTeamData?.teamId ||
                      bowlingTeamData?.id ||
                      bowlingTeamData?._id;
                    navigation.navigate(SCREENS.ChangeBowler, {
                      teamId: bowlTeamId,
                      matchId: matchID,
                      playerId: score?.bowler?.playerId || score?.bowler?.id || score?.bowler?._id,
                      playerName: score?.bowler?.name || score?.bowler?.username,
                      squad: bowlingTeamData?.players || bowlingTeamData?.squad || [],
                      cb: onRefresh,
                    });
                  }}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: isDarkMode ? "#374151" : "#e5e7eb",
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText style={{ fontSize: 11, color: "#3b82f6", fontWeight: "600" }}>
                    Change
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
            <ThemedText
              className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              {score?.bowler?.over}-{score?.bowler?.maiden}-
              {score?.bowler?.runsGiven}-{score?.bowler?.wicketsTaken}
            </ThemedText>
          </View>

          {/* Pending Wicket Batter Selection Banner */}
          {pendingWicketFlowRef.current && !nextBatterModalVisible && (
            <TouchableOpacity
              onPress={() => setNextBatterModalVisible(true)}
              style={{
                backgroundColor: "#dc2626",
                paddingVertical: 10,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginHorizontal: 12,
                marginTop: 8,
                marginBottom: 8,
                borderRadius: 10,
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Ionicons name="alert-circle" size={20} color="#ffffff" />
                <ThemedText style={{ color: "#ffffff", fontWeight: "700", fontSize: 13, flex: 1 }}>
                  Wicket fallen! Tap here to select next batter
                </ThemedText>
              </View>
              <Ionicons name="arrow-forward-circle" size={22} color="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Run Buttons */}
          <View
            style={[
              styles.container,
              isDarkMode ? styles.containerDark : styles.containerLight,
            ]}
          >
            {/* Left Section */}
            <View style={styles.leftSection}>
              {leftButtons.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                  {row.map((label, colIndex) => {
                    const onPress = () => {
                      switch (label) {
                        case "0":
                        case "1":
                        case "2":
                        case "3":
                          handleBall({ runs: parseInt(label, 10), runType: "bat", ballType: "ball" });
                          break;
                        case "4\nFour":
                          handleBall({ runs: 4, runType: "bat", isBoundary: true, ballType: "ball" });
                          break;
                        case "6\nSIX":
                          handleBall({ runs: 6, runType: "bat", isBoundary: true, ballType: "ball" });
                          break;
                        case "WD":
                          handleShowCustomRunsModal("Wide Ball", "wd");
                          break;
                        case "NB":
                          handleShowCustomRunsModal("No Ball", "nb");
                          break;
                        case "BYE":
                          handleShowCustomRunsModal("Bye Run", "bye");
                          break;
                        default:
                          console.log("Unhandled button:", label);
                      }
                    };

                    return (
                      <TouchableOpacity
                        key={colIndex}
                        style={[
                          styles.button,
                          isDarkMode ? styles.buttonDark : styles.buttonLight,
                        ]}
                        onPress={onPress}
                      >
                        <ThemedText
                          style={[
                            styles.text,
                            isDarkMode ? styles.textDark : styles.textLight,
                          ]}
                        >
                          {label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Right Section */}
            <View style={styles.rightSection}>
              {rightButtons.map((label, index) => {
                const onPress = () => {
                  switch (label) {
                    case "UNDO":
                      handleUndo();
                      break;
                    case "5,7":
                      handleShowCustomRunsModal("Custom Runs", "cr");
                      break;
                    case "OUT":
                      console.log("[SCORER-SCREEN] Tapped OUT keypad button! Opening dismissal options...");
                      setShowOutModal(true);
                      break;
                    case "LB":
                      handleShowCustomRunsModal("Leg Bye Run", "lb");
                      break;
                    default:
                      console.log("Unhandled button:", label);
                  }
                };

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isDarkMode ? styles.buttonDark : styles.buttonLight,
                    ]}
                    onPress={onPress}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[
                        styles.text,
                        isDarkMode ? styles.textDark : styles.textLight,
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Quick Actions */}
          <QuickActions
            matchID={matchID}
            bowlingTeam={bowlingTeamData}
            battingTeam={battingTeamData}
            currentOver={score?.batting?.score?.over}
            batsmen={score?.batsman}
            bowler={score?.bowler}
            navigation={navigation}
            cb={() => emit("score", { matchId: matchID })}
          />
        </ScrollView>


      {/* Next Batter Selection Sheet */}
      {nextBatterModalVisible && isFocused && (
        <View style={styles.sheetOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setNextBatterModalVisible(false)}
          />
          <View
            style={[
              styles.sheetContent,
              { backgroundColor: isDarkMode ? "#1e293b" : "#ffffff" },
            ]}
          >
            {/* Header */}
            <View style={{ marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 18, fontWeight: "bold", color: isDarkMode ? "#f8fafc" : "#0f172a" }}>
                  Select Next Batter
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                  A wicket has fallen. Pick incoming batsman.
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setNextBatterModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={22} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>

            {/* Top Action Buttons: Add Player & Undo Last Ball */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  pendingResumeSheetRef.current = "nextBatter";
                  setNextBatterModalVisible(false);
                  closeSheet?.();
                  navigation.navigate(SCREENS.ChangeSquad, {
                    teamId: battingTeamData.teamId,
                    matchId: matchID,
                    team: battingTeamData,
                    squad: battingTeamData?.players,
                  });
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: isDarkMode ? "#334155" : "#e5e7eb",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={16} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
                <ThemedText style={{ fontSize: 13, fontWeight: "600", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                  + Add Player
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleUndo();
                  pendingWicketFlowRef.current = null;
                  setNextBatterModalVisible(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: isDarkMode ? "#451a1a" : "#fee2e2",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={16} color="#dc2626" />
                <ThemedText style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}>
                  Undo Last Ball
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Batters List */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableBatters.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Ionicons name="alert-circle-outline" size={40} color="#f59e0b" style={{ marginBottom: 8 }} />
                  <ThemedText style={{ textAlign: "center", fontWeight: "600", fontSize: 15, color: isDarkMode ? "#f3f4f6" : "#1f2937" }}>
                    No more batters available in squad
                  </ThemedText>
                  <ThemedText style={{ textAlign: "center", fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginTop: 4, paddingHorizontal: 20 }}>
                    Please tap "+ Add Player" above to add a player to the squad, or tap "Undo Last Ball" if this wicket was recorded by mistake.
                  </ThemedText>
                </View>
              ) : (
                availableBatters.map((player, idx) => {
                  const pName = player?.name || player?.username || `Player ${idx + 1}`;
                  const initials = pName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "P";
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSelectNextBatter(player)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        marginBottom: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
                        borderWidth: 1,
                        borderColor: isDarkMode ? "#475569" : "#e2e8f0",
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: isDarkMode ? "#1e293b" : "#dbeafe",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <ThemedText style={{ fontSize: 14, fontWeight: "bold", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                          {initials}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#f8fafc" : "#0f172a" }}>
                          {pName}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                          {player?.position || "Batsman"}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Select Striker Sheet (Prompt who takes strike post-wicket) */}
      {selectStrikerModalVisible && isFocused && (
        <View style={styles.sheetOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => {}}
          />
          <View
            style={[
              styles.sheetContent,
              { maxHeight: "55%", backgroundColor: isDarkMode ? "#1e293b" : "#ffffff" },
            ]}
          >
            <View style={{ marginBottom: 16 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: "bold", color: isDarkMode ? "#f8fafc" : "#0f172a" }}>
                Who is on Strike?
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                Select which batsman faces the next delivery
              </ThemedText>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {strikerCandidates.map((player, idx) => {
                const pName = player?.name || player?.username || `Player ${idx + 1}`;
                const initials = pName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "P";
                return (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      marginBottom: 8,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
                      borderWidth: 1,
                      borderColor: isDarkMode ? "#475569" : "#e2e8f0",
                    }}
                    onPress={() => handleSelectStriker(player)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: isDarkMode ? "#1e293b" : "#dbeafe",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <ThemedText style={{ fontSize: 14, fontWeight: "bold", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                          {initials}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#f8fafc" : "#0f172a" }}>
                          {pName}
                        </ThemedText>
                      </View>
                    </View>
                    <Ionicons name="flash-outline" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Next Bowler Selection Sheet */}
      {nextBowlerModalVisible && isFocused && (
        <View style={styles.sheetOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setNextBowlerModalVisible(false)}
          />
          <View
            style={[
              styles.sheetContent,
              { backgroundColor: isDarkMode ? "#1e293b" : "#ffffff" },
            ]}
          >
            {/* Header */}
            <View style={{ marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 18, fontWeight: "bold", color: isDarkMode ? "#f8fafc" : "#0f172a" }}>
                  Over Completed!
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                  Select bowler for the next over (consecutive overs not allowed)
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setNextBowlerModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={22} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>

            {/* Top Action Buttons: Add Player & Undo Last Ball */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  pendingResumeSheetRef.current = "nextBowler";
                  setNextBowlerModalVisible(false);
                  closeSheet?.();
                  navigation.navigate(SCREENS.ChangeSquad, {
                    teamId: bowlingTeamData.teamId,
                    matchId: matchID,
                    team: bowlingTeamData,
                    squad: bowlingTeamData?.players,
                  });
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: isDarkMode ? "#334155" : "#e5e7eb",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={16} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
                <ThemedText style={{ fontSize: 13, fontWeight: "600", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                  + Add Player
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleUndo();
                  setNextBowlerModalVisible(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: isDarkMode ? "#451a1a" : "#fee2e2",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={16} color="#dc2626" />
                <ThemedText style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}>
                  Undo Last Ball
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Bowlers List */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableBowlers.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Ionicons name="alert-circle-outline" size={40} color="#f59e0b" style={{ marginBottom: 8 }} />
                  <ThemedText style={{ textAlign: "center", fontWeight: "600", fontSize: 15, color: isDarkMode ? "#f3f4f6" : "#1f2937" }}>
                    No other bowlers available in squad
                  </ThemedText>
                  <ThemedText style={{ textAlign: "center", fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginTop: 4, paddingHorizontal: 20 }}>
                    Please tap "+ Add Player" to add a bowler, or tap "Undo Last Ball" to revert the previous delivery.
                  </ThemedText>
                </View>
              ) : (
                availableBowlers.map((player, idx) => {
                  const pName = player?.name || player?.username || `Player ${idx + 1}`;
                  const initials = pName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "P";
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSelectNextBowler(player)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        marginBottom: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
                        borderWidth: 1,
                        borderColor: isDarkMode ? "#475569" : "#e2e8f0",
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: isDarkMode ? "#1e293b" : "#dbeafe",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <ThemedText style={{ fontSize: 14, fontWeight: "bold", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                          {initials}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#f8fafc" : "#0f172a" }}>
                          {pName}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                          {player?.position || "Bowler"}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* End of Innings Dialog */}
      {inningsCompleteModalVisible && isFocused && (
        <View style={styles.dialogOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setInningsCompleteModalVisible(false)}
          />
          <View
            style={[
              styles.dialogCard,
              { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" },
            ]}
          >
            <TouchableOpacity 
              onPress={() => setInningsCompleteModalVisible(false)}
              style={{ position: "absolute", top: 16, right: 16, padding: 6, zIndex: 10 }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
            </TouchableOpacity>

            <ThemedText style={{ fontSize: 22, fontWeight: "bold", marginBottom: 8, marginTop: 4 }}>
              🏏 End of Innings 1
            </ThemedText>
            <ThemedText style={{ fontSize: 15, color: "#9ca3af", textAlign: "center", marginBottom: 16 }}>
              {`${score?.batting?.teamName || "Team"} scored ${score?.batting?.score?.runs || 0}/${score?.batting?.score?.wicket || 0} in ${score?.batting?.score?.over || 0} overs.`}
            </ThemedText>
            <View
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 12,
                backgroundColor: isDarkMode ? "#111827" : "#eff6ff",
                marginBottom: 20,
                alignItems: "center",
              }}
            >
              <ThemedText style={{ fontSize: 13, color: "#3b82f6", fontWeight: "600" }}>
                Target for {score?.bowling?.teamName || "Chasing Team"}
              </ThemedText>
              <ThemedText style={{ fontSize: 28, fontWeight: "bold", color: isDarkMode ? "#60a5fa" : "#1d4ed8", marginTop: 4 }}>
                {(score?.batting?.score?.runs || 0) + 1} runs
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={handleStartInningsTwo}
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#2563eb",
                alignItems: "center",
              }}
              activeOpacity={0.8}
            >
              <ThemedText style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}>
                Select Innings 2 Openers
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setInningsCompleteModalVisible(false)}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                marginTop: 10,
                borderWidth: 1,
                borderColor: isDarkMode ? "#374151" : "#d1d5db",
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <ThemedText style={{ color: isDarkMode ? "#d1d5db" : "#4b5563", fontSize: 15, fontWeight: "600" }}>
                Cancel / Resume Innings
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Match Completed Dialog */}
      {matchCompleteModalVisible && isFocused && (
        <View style={styles.dialogOverlay} pointerEvents="box-none">
          <View style={styles.sheetBackdrop} />
          <View
            style={[
              styles.dialogCard,
              { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" },
            ]}
          >
            <ThemedText style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
              🏆 Match Completed!
            </ThemedText>
            <ThemedText style={{ fontSize: 15, color: "#10b981", fontWeight: "600", textAlign: "center", marginBottom: 20 }}>
              {score?.description || "Congratulations to the winners!"}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                setMatchCompleteModalVisible(false);
                isLeavingRef.current = true;
                navigation.navigate(SCREENS.MatchScoreCard, { matchId: matchID });
              }}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                backgroundColor: "#2563eb",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <ThemedText style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}>
                View Full Scorecard
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setMatchCompleteModalVisible(false);
                isLeavingRef.current = true;
                navigation.navigate(SCREENS.Home);
              }}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#9ca3af",
                alignItems: "center",
              }}
            >
              <ThemedText style={{ fontSize: 16, fontWeight: "600" }}>
                Return to Home
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Custom Runs & Extras Modal (WD, NB, BYE, LB, 5,7) */}
      <CustomRunModal
        visible={showCustomRunsModal}
        onClose={() => setShowCustomRunsModal(false)}
        customModalDiscription={customModalDescription}
        action={(params) => {
          handleBall(params);
          setShowCustomRunsModal(false);
        }}
      />

      {/* Dismissal / Out Options Sheet & Sub-modals */}
      <OutOptions
        visible={showOutModal}
        onClose={() => setShowOutModal(false)}
        handelBall={handleBall}
        onWicket={handleWicket}
        bowler={score?.bowler}
        batsmans={{
          firstBatter: score?.batsman?.[0],
          secondBatter: score?.batsman?.[1],
        }}
        bowlingTeam={bowlingTeamData}
        battingTeam={battingTeamData}
      />
      </SafeAreaView>
      </View>
    </ScorerScreenContext.Provider>
  );
}

const styles = StyleSheet.create({
  scoreContainer: {
    // Generous breathing room above and below the score display hero section
    paddingVertical: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    height: 300,
  },
  containerLight: {
    backgroundColor: "#E8F9FF", // gray-100
  },
  containerDark: {
    backgroundColor: "#000",
  },
  leftSection: {
    flex: 3,
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  buttonLight: {
    backgroundColor: "#dee2e6",
    borderColor: "#e5e7eb", // gray-200
  },
  buttonDark: {
    backgroundColor: "#0a0f1c",
    borderColor: "#1a2333",
  },
  rightSection: {
    flex: 1,
    justifyContent: "space-between",
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  textLight: {
    color: "#111827", // gray-900
  },
  textDark: {
    color: "#fff",
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 9999,
    elevation: 9999,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheetContent: {
    maxHeight: "75%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 20,
  },
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  dialogCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 25,
  },
});

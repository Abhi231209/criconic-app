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
import { matchRedirectBasedOnStatus, calculateOversLeft, calculateProjectedResult } from "@/utils";
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
import { useAlert } from "@/contexts/AlertContext";
import OutOptions from "./OutOptions";
import BallTrackerModal from "./BallTrackerModal";
import WagonPitchViewerModal from "./WagonPitchViewerModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MatchSettingEnum } from "@/utils/Common";
import SCREENS from "@/screens";
import User from "@/utils/User";
import analytics from "@/utils/analytics";
import {
  generateActionId,
  loadQueue as loadPendingActionQueue,
  enqueueAction as enqueuePendingAction,
  removeAction as removePendingAction,
  purgeStaleActions,
  clearQueue,
} from "@/utils/offlineActionQueue";

// ─── Offline Action Queue Helpers ────────────────────────────────────────────
// Persists pending scorer actions in AsyncStorage so they survive reconnects
// and app restarts. Each queue is keyed by matchId.

// Save a pending action and return the updated queue length for UI display.

export const ScorerScreenContext = createContext(null);

export default function ScorerScreen() {
  const { openSheet, closeSheet } = useBottomSheet();
  const { showAlert } = useAlert();
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

  // Same as `emit`, but resolves once the server acks the specific action
  // (or times out) instead of firing and forgetting. Used by the offline
  // action queue to know definitively when a queued action has been applied,
  // so it can be safely removed from disk.
  const emitWithAck = useCallback((event, data, timeoutMs = 10000) => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ success: false, timedOut: false });
        return;
      }
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ success: false, timedOut: true });
      }, timeoutMs);
      socketRef.current.emit(event, data, (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(response || { success: true });
      });
    });
  }, []);

  const authUser = useSelector((state) => state.auth?.user);
  const userId =
    authUser?.id ||
    authUser?._id ||
    User?.id;

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

  // Pending offline-queued actions not yet confirmed by the server.
  const [pendingActionCount, setPendingActionCount] = useState(0);
  const isFlushingQueueRef = useRef(false);

  // Transient "Powerplay started/ended" banner, shown briefly on the
  // powerplay-start/powerplay-end socket events the server emits from
  // Match.ball().
  const [powerplayBanner, setPowerplayBanner] = useState(null);
  const powerplayBannerTimeoutRef = useRef(null);
  const showPowerplayBanner = useCallback((message) => {
    setPowerplayBanner(message);
    if (powerplayBannerTimeoutRef.current) clearTimeout(powerplayBannerTimeoutRef.current);
    powerplayBannerTimeoutRef.current = setTimeout(() => setPowerplayBanner(null), 4000);
  }, []);

  // Sends every locally-queued, unconfirmed action for this match to the
  // server, in order, one at a time — waiting for each ack before sending
  // the next so a backlog built up while offline can't be applied out of
  // order. Re-reads the queue fresh on every pass (rather than a fixed
  // snapshot) so it naturally coalesces with a live tap's own send attempt —
  // `isFlushingQueueRef` ensures only one of them is ever actively emitting
  // for this match at a time, avoiding a double-send race between the two.
  // Stops only on network timeouts, removes completed/rejected items,
  // and requests a single consolidated score update once complete.
  const flushPendingActionQueue = useCallback(async () => {
    if (!matchID || isFlushingQueueRef.current) return;
    isFlushingQueueRef.current = true;
    try {
      const queue = await loadPendingActionQueue(matchID);
      if (!queue.length) {
        setPendingActionCount(0);
        return;
      }

      console.log(`[OFFLINE-QUEUE] Flushing ${queue.length} pending actions for match ${matchID}...`);
      for (const item of queue) {
        if (!socketRef.current?.connected) break;
        try {
          const response = await emitWithAck(
            "update-score",
            {
              userId: item.userId,
              matchId: matchID,
              action: item.action,
              data: item.data,
              actionId: item.actionId,
            },
            5000
          );

          // Remove the action if it succeeded, or if the server responded (avoiding permanent stuck queues).
          // Only preserve the item if the socket timed out without reaching the server.
          if (response?.success || response?.timedOut === false) {
            await removePendingAction(matchID, item.actionId);
          } else {
            break;
          }
        } catch (e) {
          console.warn("[OFFLINE-QUEUE] Error flushing item:", e);
          break;
        }
      }

      const remaining = await loadPendingActionQueue(matchID);
      setPendingActionCount(remaining.length);

      // Once the backlog is flushed, fetch the authoritative score once
      if (socketRef.current?.connected) {
        socketRef.current.emit("score", { matchId: matchID, matchID });
      }
    } finally {
      isFlushingQueueRef.current = false;
    }
  }, [matchID, emitWithAck]);

  // Seed the pending count from disk immediately on mount, independent of
  // connection state — so a leftover queue from a previous session (e.g. the
  // app was killed while offline) shows accurately even before the socket
  // manages to connect for the first time.
  useEffect(() => {
    if (!matchID) return;
    loadPendingActionQueue(matchID).then((queue) => setPendingActionCount(queue.length));
  }, [matchID]);

  const [score, setScore] = useState({});
  const [matchDetails, setMatchDetails] = useState(null);

  const isSuperOver = Boolean(
    score?.isSuperOver ||
    score?.score?.isSuperOver ||
    score?.["innings_" + (score?.currentInnings || matchDetails?.currentInnings || 1)]?.isSuperOver ||
    score?.status === MATCH_STATUS.SUPER_OVER ||
    score?.matchCurrentStatus === MATCH_STATUS.SUPER_OVER ||
    matchDetails?.status === MATCH_STATUS.SUPER_OVER ||
    matchDetails?.isSuperOver ||
    route.params?.isSuperOver ||
    route.params?.status === MATCH_STATUS.SUPER_OVER
  );

  const [refreshing, setRefreshing] = useState(false);
  const [isStatusChecked, setIsStatusChecked] = useState(false);

  // Dynamic In-Match Sheet / Modal States
  const [nextBatterModalVisible, setNextBatterModalVisible] = useState(false);
  const [availableBatters, setAvailableBatters] = useState([]);
  const [nextBowlerModalVisible, setNextBowlerModalVisible] = useState(false);
  const [availableBowlers, setAvailableBowlers] = useState([]);
  const [inningsCompleteModalVisible, setInningsCompleteModalVisible] = useState(false);
  const [matchCompleteModalVisible, setMatchCompleteModalVisible] = useState(false);
  const [matchTiedModalVisible, setMatchTiedModalVisible] = useState(false);
  const [committeeEndModalVisible, setCommitteeEndModalVisible] = useState(false);
  const [committeeWinnerTeam, setCommitteeWinnerTeam] = useState(null);
  const [isEndingInnings, setIsEndingInnings] = useState(false);
  const handleInningsStartSocketRef = useRef(null);

  const [matchStatus, setMatchStatus] = useState({
    isInningCompleted: false,
    isMatchCompleted: false,
    isMatchEnded: false,
    isMatchTied: false,
  });

  const matchStatusHandler = useCallback((type, value) => {
    if (typeof type === "boolean") {
      setMatchStatus({
        isInningCompleted: type,
        isMatchCompleted: type,
        isMatchEnded: type,
        isMatchTied: type,
      });
      if (!type) {
        setInningsCompleteModalVisible(false);
        setMatchCompleteModalVisible(false);
        setMatchTiedModalVisible(false);
        setCommitteeEndModalVisible(false);
      }
      return;
    }
    setMatchStatus((prev) => ({ ...prev, [type]: value }));
    if (value) {
      setNextBatterModalVisible(false);
      setNextBowlerModalVisible(false);
      setShowCustomRunsModal(false);
      setShowOutModal(false);
      setSelectStrikerModalVisible(false);
    }
  }, []);

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

  // Custom Runs & Extras Modal State (WD, NB, BYE, LB, 5,7)
  const [showCustomRunsModal, setShowCustomRunsModal] = useState(false);
  const [customModalDescription, setCustomModalDescription] = useState({
    title: "Enter Custom Runs",
    type: "cr",
  });

  // Out Options Modal State
  const [showOutModal, setShowOutModal] = useState(false);

  // Check-based Wagon Wheel & Pitch Map Tracking States
  const [isWagonWheelChecked, setIsWagonWheelChecked] = useState(
    route.params?.isWagonWheelEnabled !== undefined ? Boolean(route.params.isWagonWheelEnabled) : true
  );
  const [isPitchMapChecked, setIsPitchMapChecked] = useState(
    route.params?.isPitchMapEnabled !== undefined ? Boolean(route.params.isPitchMapEnabled) : true
  );
  const [showBallTrackerModal, setShowBallTrackerModal] = useState(false);
  const [pendingBallParams, setPendingBallParams] = useState(null);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewerInitialTab, setViewerInitialTab] = useState("wagon");
  const [sessionDeliveries, setSessionDeliveries] = useState([]);

  // Hydrate Wagon Wheel & Pitch Map checks from AsyncStorage, route params and match config
  useEffect(() => {
    if (!matchID) return;
    (async () => {
      try {
        const storedWagon = await AsyncStorage.getItem(`@criconic_ww_${matchID}`);
        const storedPitch = await AsyncStorage.getItem(`@criconic_pm_${matchID}`);
        if (storedWagon !== null) {
          setIsWagonWheelChecked(storedWagon === "true");
        } else if (route.params?.isWagonWheelEnabled !== undefined) {
          setIsWagonWheelChecked(Boolean(route.params.isWagonWheelEnabled));
        } else if (matchDetails?.config?.recordWagonWheel !== undefined) {
          const ww = matchDetails.config.recordWagonWheel;
          setIsWagonWheelChecked(typeof ww === "boolean" ? ww : !!ww?.active);
        }
        if (storedPitch !== null) {
          setIsPitchMapChecked(storedPitch === "true");
        } else if (route.params?.isPitchMapEnabled !== undefined) {
          setIsPitchMapChecked(Boolean(route.params.isPitchMapEnabled));
        } else if (matchDetails?.config?.recordPitchMap !== undefined) {
          const pm = matchDetails.config.recordPitchMap;
          setIsPitchMapChecked(typeof pm === "boolean" ? pm : !!pm?.active);
        }
      } catch (e) {
        console.warn("[CHECK-BASE] Error hydrating checks:", e);
      }
    })();
  }, [matchID, matchDetails?.config?.recordWagonWheel, matchDetails?.config?.recordPitchMap, route.params?.isWagonWheelEnabled, route.params?.isPitchMapEnabled]);

  const toggleWagonWheelCheck = async () => {
    const nextVal = !isWagonWheelChecked;
    setIsWagonWheelChecked(nextVal);
    try {
      await AsyncStorage.setItem(`@criconic_ww_${matchID}`, String(nextVal));
      request(`api/matches/${matchID}/settings`, {
        method: "PUT",
        data: { action: MatchSettingEnum.RECORD_WAGON_WHEEL, data: nextVal },
      }).catch(() => {});
    } catch {}
  };

  const togglePitchMapCheck = async () => {
    const nextVal = !isPitchMapChecked;
    setIsPitchMapChecked(nextVal);
    try {
      await AsyncStorage.setItem(`@criconic_pm_${matchID}`, String(nextVal));
      request(`api/matches/${matchID}/settings`, {
        method: "PUT",
        data: { action: MatchSettingEnum.RECORD_PITCH_MAP, data: nextVal },
      }).catch(() => {});
    } catch {}
  };

  // Strike Selection Modal State (Post-wicket flow)
  const [selectStrikerModalVisible, setSelectStrikerModalVisible] = useState(false);
  const [strikerCandidates, setStrikerCandidates] = useState([]);
  const pendingWicketFlowRef = useRef(null);
  const checkAndPromptNextBatterRef = useRef(null);

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
    showAlert({
      title: "Leave Live Scoring?",
      message:
        "Your match progress is saved and live. You can resume anytime from My Cricket.",
      type: "danger",
      confirmText: "Leave Match",
      cancelText: "Stay",
      onConfirm: () => {
        isLeavingRef.current = true;
        const cameFromTournament = Boolean(
          route.params?.fromTournament ||
          route.params?.cameFromTournament ||
          route.params?.returnScreen === SCREENS.TournamentProfile
        );
        const currentDetails = matchDetailsRef.current;
        const tournamentId =
          route.params?.tournamentId ||
          route.params?.tournamentID ||
          currentDetails?.tournamentId ||
          currentDetails?.tournamentID ||
          currentDetails?.tournament?._id ||
          currentDetails?.tournament;

        if (cameFromTournament && tournamentId) {
          if (navigation.reset) {
            navigation.reset({
              index: 0,
              routes: [{ name: SCREENS.TournamentProfile, params: { tournamentId } }],
            });
          } else {
            navigation.navigate(SCREENS.TournamentProfile, { tournamentId });
          }
          return;
        }

        // Return to whichever screen actually launched the match-creation
        // flow (threaded through as returnScreen via CreateMatch →
        // MatchDetailsScreen → PlayerSelectionScreen → TossScreen →
        // ScorerScreen), instead of always dropping back to Home — the
        // intermediate setup screens themselves can't be revisited (Home's
        // own focus effect strips them from history), so a plain goBack()
        // isn't an option here.
        const returnScreen = route.params?.returnScreen;
        if (returnScreen && returnScreen !== SCREENS.Home) {
          if (navigation.reset) {
            navigation.reset({
              index: 0,
              routes: [{ name: returnScreen }],
            });
          } else {
            navigation.navigate(returnScreen);
          }
          return;
        }

        if (navigation.reset) {
          navigation.reset({
            index: 0,
            routes: [{ name: SCREENS.Home }],
          });
        } else {
          navigation.navigate(SCREENS.Home);
        }
      },
    });
  }, [navigation, showAlert, route.params]);

  const handleGoHome = useCallback(() => {
    showAlert({
      title: "Return to Home?",
      message:
        "Your match progress is saved and live. You can resume anytime from My Cricket.",
      type: "danger",
      confirmText: "Go to Home",
      cancelText: "Stay Scoring",
      onConfirm: () => {
        isLeavingRef.current = true;
        if (navigation.reset) {
          navigation.reset({
            index: 0,
            routes: [{ name: SCREENS.Home }],
          });
        } else {
          navigation.navigate(SCREENS.Home);
        }
      },
    });
  }, [navigation, showAlert]);

  const lastFocusFetchRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      isLeavingRef.current = false;

      // Always request score refresh on focus
      if (socketRef.current && matchID) {
        socketRef.current.emit("score", { matchId: matchID, matchID });
      }
      if (matchID) {
        matchesApi
          .getMatchById(matchID)
          .then((res) => {
            if (res?.data) {
              setMatchDetails(res.data);
            }
          })
          .catch(() => {});
      }

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
    }, [navigation, handleLeaveScoring, matchID])
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

            const outBatsmenIds = [
              ...(currentScore?.outBatsman || []).map((b) => String(b.id || b.playerId || b._id)),
              ...(currentScore?.fallOfWickets || []).map((f) => String(f.batsman?.playerId || f.batsman?._id || f.batsman?.id)),
              ...(currentScore?.batsman || []).filter((b) => b.notOut === false || b.dismissalInfo).map((b) => String(b.id || b.playerId || b._id)),
            ];
            const outSet = new Set(outBatsmenIds.filter(Boolean));
            const activeBatsmenIds = (currentScore?.batsman || [])
              .filter((b) => b.notOut !== false && !b.dismissalInfo)
              .map((b) => String(b.id || b.playerId || b._id))
              .filter((id) => !outSet.has(id));
            const activeSet = new Set(activeBatsmenIds);
            const eligible = squad.filter((p) => {
              const pid = String(p.id || p._id || p.playerId);
              return !activeSet.has(pid) && !outSet.has(pid);
            });
            setAvailableBatters(eligible);
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

      // While actively flushing a backlog of offline actions, suppress
      // intermediate per-ball renders so the UI does not visually replay the match.
      if (isFlushingQueueRef.current) {
        console.log("[SOCKET-SCORE] Suppressing intermediate score update during queue flush");
        return;
      }

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
      const isSuperOverInn = Boolean(
        latestScore?.isSuperOver ||
        latestScore?.score?.isSuperOver ||
        latestScore?.["innings_" + (latestScore?.currentInnings || 1)]?.isSuperOver ||
        matchDetails?.status === MATCH_STATUS.SUPER_OVER ||
        route.params?.isSuperOver
      );
      const maxWickets = isSuperOverInn
        ? 2
        : latestScore?.matchConfig?.singleBatsmanAllowed
        ? battingSquad.length
        : Math.max(0, battingSquad.length - 1);
      const isOddInning = ((latestScore?.currentInnings || latestScore?.currentInning || 1) % 2 === 1);

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

      if (
        (isSuperOverInn || battingSquad.length > 0) &&
        latestScore?.currentInningWicket >= maxWickets
      ) {
        console.log("[WICKET] All out reached — skipping incoming batter");
        if (isOddInning) {
          console.log("[WICKET] Inning all out — setting isInningCompleted");
          matchStatusHandler("isInningCompleted", true);
          handleInningsCompleteRef.current?.();
        } else {
          setCommitteeEndModalVisible(true);
        }
        return;
      }

      const allOutBatsmenIds = [
        ...(latestScore?.outBatsman || []).map((b) => String(b.id || b.playerId || b._id)),
        ...(latestScore?.fallOfWickets || []).map((f) => String(f.batsman?.playerId || f.batsman?._id || f.batsman?.id)),
        ...(latestScore?.batsman || []).filter((b) => b.notOut === false || b.dismissalInfo).map((b) => String(b.id || b.playerId || b._id)),
        ...(options?.outBatman ? [String(options.outBatman)] : []),
      ];
      const outSet = new Set(allOutBatsmenIds.filter(Boolean));

      const activeBatsmenIds = (latestScore?.batsman || [])
        .filter((b) => b.notOut !== false && !b.dismissalInfo)
        .map((b) => String(b.id || b.playerId || b._id))
        .filter((id) => !outSet.has(id));
      const activeSet = new Set(activeBatsmenIds);

      const candidateList =
        Array.isArray(latestScore?.batsmanUpcoming) && latestScore.batsmanUpcoming.length > 0
          ? latestScore.batsmanUpcoming
          : battingSquad;

      const eligibleBatters = candidateList.filter((p) => {
        const pid = String(p.id || p._id || p.playerId);
        return !activeSet.has(pid) && !outSet.has(pid);
      });

      setAvailableBatters(eligibleBatters);
      // Only open next batter modal immediately if ball tracker is not active/pending.
      // If ball tracker is active, next batter modal will open as soon as the tracker confirms or skips.
      if (!showBallTrackerModal && !pendingBallParams) {
        setNextBatterModalVisible(true);
      }
    },
    [showBallTrackerModal, pendingBallParams]
  );
  handleWicketRef.current = handleWicket;

  const handleSelectNextBatter = (player) => {
    // If there was a pending ball that hasn't been committed yet, flush it now
    if (pendingBallParams) {
      console.log("[WICKET] Flushing pendingBallParams before selecting next batter");
      const p = { ...pendingBallParams };
      setPendingBallParams(null);
      handleBall(p);
    }

    const pendingFlow = pendingWicketFlowRef.current;
    const isNonStrikerWicket = pendingFlow?.type === 2;
    const shouldPromptStrike = Boolean(pendingFlow?.callSelectStrike);
    const rawOutId =
      pendingFlow?.options?.outBatman?.playerId ||
      pendingFlow?.options?.outBatman?.id ||
      pendingFlow?.options?.outBatman?._id ||
      pendingFlow?.options?.outBatman ||
      "";
    const outBatmanId = typeof rawOutId === "object" ? "" : String(rawOutId);

    const newBatterId = String(player.id || player._id || player.playerId || "");
    const newBatterName = player.name || player.username;

    updateScore(MATCH_ACTION.BATSMAN_SELECTED, {
      batsman: {
        name: newBatterName,
        id: newBatterId,
        isStrikeEnd: isNonStrikerWicket ? false : true,
      },
    });
    setNextBatterModalVisible(false);

    // Optimistically update score.batsman so the incoming batsman and strike indicator appear immediately
    setScore((prev) => {
      if (!prev) return prev;
      const curBatsmen = prev.batsman || [];

      // Determine who was out:
      let resolvedOutId = outBatmanId;
      if (!resolvedOutId) {
        const striker = curBatsmen.find((b) => b?.isStrikeEnd);
        const nonStriker = curBatsmen.find((b) => !b?.isStrikeEnd);
        resolvedOutId = isNonStrikerWicket
          ? String(nonStriker?.playerId || nonStriker?.id || nonStriker?._id || "")
          : String(striker?.playerId || striker?.id || striker?._id || "");
      }

      // Mark the out batsman as out in the batsman history
      const updatedExistingBatsmen = curBatsmen.map((b) => {
        const bId = String(b?.playerId || b?.id || b?._id || "");
        if (resolvedOutId && bId === resolvedOutId) {
          return {
            ...b,
            notOut: false,
            dismissalInfo: b.dismissalInfo || { dismissalType: "out" },
            isStrikeEnd: false,
          };
        }
        return b;
      });

      // Find the surviving partner (must NOT be the outed batsman and NOT the incoming batter)
      const surviving = updatedExistingBatsmen.filter((b) => {
        const bId = String(b?.playerId || b?.id || b?._id || "");
        const isOut = b?.notOut === false || Boolean(b?.dismissalInfo) || (resolvedOutId && bId === resolvedOutId);
        const isNew = bId === newBatterId;
        return !isOut && !isNew;
      });

      const survivingPartner = surviving[0];

      const incomingBatter = {
        name: newBatterName,
        id: newBatterId,
        playerId: newBatterId,
        notOut: true,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        sr: 0,
        isStrikeEnd: isNonStrikerWicket ? false : true,
      };

      if (survivingPartner) {
        survivingPartner.isStrikeEnd = isNonStrikerWicket ? true : false;
      }

      const activeTwo = isNonStrikerWicket
        ? (survivingPartner ? [survivingPartner, incomingBatter] : [incomingBatter])
        : (survivingPartner ? [incomingBatter, survivingPartner] : [incomingBatter]);

      const outBatsmen = updatedExistingBatsmen.filter(
        (b) => b?.notOut === false || Boolean(b?.dismissalInfo) || (resolvedOutId && String(b?.playerId || b?.id || b?._id || "") === resolvedOutId)
      );

      return {
        ...prev,
        batsman: activeTwo,
        playedBatsman: [...(prev.playedBatsman || updatedExistingBatsmen), incomingBatter],
      };
    });

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
        notOut: b.notOut,
        dismissalInfo: b.dismissalInfo,
      }));

      // Determine resolvedOutId
      let resolvedOutId = outBatmanId;
      if (!resolvedOutId) {
        const striker = snapshotBatsmen.find((b) => b?.isStrikeEnd);
        const nonStriker = snapshotBatsmen.find((b) => !b?.isStrikeEnd);
        resolvedOutId = String(
          isNonStrikerWicket
            ? (nonStriker?.id || nonStriker?.playerId || "")
            : (striker?.id || striker?.playerId || "")
        );
      }

      // A surviving batter is one whose ID != resolvedOutId, not the new batter, and not out
      let survivingBatter = snapshotBatsmen.find((b) => {
        const bId = String(b.id || b.playerId || "");
        return bId && (!resolvedOutId || bId !== resolvedOutId) && bId !== newBatterId;
      });

      // Fallback 2: Check current live batsmen for someone who is not resolvedOutId and not the incoming player
      if (!survivingBatter) {
        survivingBatter = currentLiveBatsmen.find((b) => {
          const bId = String(b.id || b.playerId || "");
          const isNotOut = b.notOut !== false && !b.dismissalInfo && (!resolvedOutId || bId !== resolvedOutId);
          const isNotNew = bId !== newBatterId;
          return isNotOut && isNotNew;
        });
      }

      // Fallback 3: First available batsman who is neither resolvedOutId nor newBatterId
      if (!survivingBatter) {
        survivingBatter = currentLiveBatsmen.find((b) => {
          const bId = String(b.id || b.playerId || "");
          return (!resolvedOutId || bId !== resolvedOutId) && bId !== newBatterId;
        }) || snapshotBatsmen.find((b) => {
          const bId = String(b.id || b.playerId || "");
          return (!resolvedOutId || bId !== resolvedOutId) && bId !== newBatterId;
        });
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
    const strikerName = player?.name;
    const data = {
      userId: userId || User?.id,
      matchId: matchID,
      action: "SET_STRIKER",
      data: {
        striker: strikerId,
      },
    };
    emit("set-striker", data);
    setSelectStrikerModalVisible(false);

    setScore((prevScore) => {
      if (!prevScore || !Array.isArray(prevScore?.batsman)) return prevScore;
      const targetIdStr = String(strikerId);
      const updatedBatsman = prevScore.batsman.map((b) => {
        const matchesId =
          strikerId &&
          (String(b?.playerId || "") === targetIdStr ||
            String(b?.id || "") === targetIdStr ||
            String(b?._id || "") === targetIdStr);
        const matchesName = strikerName && b?.name && b.name === strikerName;
        return {
          ...b,
          isStrikeEnd: Boolean(matchesId || matchesName),
        };
      });
      const newScore = { ...prevScore, batsman: updatedBatsman };
      scoreRef.current = newScore;
      return newScore;
    });
  };

  const checkAndPromptNextBatterAfterSquadUpdate = useCallback((freshMatch) => {
    const curScore = scoreRef.current;
    if (!curScore || !freshMatch) return;

    // Must have at least 1 wicket fallen! If 0 wickets, openers are batting, never prompt next batter!
    const currentWickets = Number(curScore?.batting?.score?.wicket ?? curScore?.currentInningWicket ?? 0);
    if (currentWickets <= 0 || currentWickets >= 10) return;

    // Must have score properly populated with at least the 2 opening batsmen
    if (!Array.isArray(curScore?.batsman) || curScore.batsman.length < 2) return;

    const currentInn = curScore?.currentInnings || freshMatch?.currentInnings || 1;
    const isSuperOverInn = Boolean(
      curScore?.isSuperOver ||
      curScore?.score?.isSuperOver ||
      curScore?.["innings_" + currentInn]?.isSuperOver ||
      curScore?.matchCurrentStatus === "SUPER_OVER" ||
      curScore?.matchCurrentStatus === MATCH_STATUS.SUPER_OVER
    );
    if (isSuperOverInn && currentWickets >= 2) return;

    // Requirement: Inning resume only applies if overs are still remaining
    const innOversMax = isSuperOverInn ? 1 : Number(curScore?.totalOvers || freshMatch?.totalOvers || 20);
    const currentOverStr = String(curScore?.batting?.score?.over || "0");
    const [completedOvers] = currentOverStr.split(".").map(Number);
    const isOverFinished = completedOvers >= innOversMax;
    if (isOverFinished) {
      console.log("[SQUAD-RESUME] Overs completed, not prompting incoming batter");
      return;
    }

    // Check surviving batsmen on pitch
    const allOutBatsmenIds = [
      ...(curScore?.outBatsman || []).map((b) => String(b.id || b.playerId || b._id)),
      ...(curScore?.fallOfWickets || []).map((f) => String(f.batsman?.playerId || f.batsman?._id || f.batsman?.id)),
      ...(curScore?.batsman || []).filter((b) => b.notOut === false || b.dismissalInfo).map((b) => String(b.id || b.playerId || b._id)),
    ];
    const outSet = new Set(allOutBatsmenIds.filter(Boolean));

    const activeBatsmenIds = (curScore?.batsman || [])
      .filter((b) => b.notOut !== false && !b.dismissalInfo)
      .map((b) => String(b.id || b.playerId || b._id))
      .filter((id) => !outSet.has(id));
    const activeSet = new Set(activeBatsmenIds);

    const singleBatsmanAllowed = Boolean(freshMatch?.config?.singleBatsmanAllowed || curScore?.matchConfig?.singleBatsmanAllowed);

    // If 2 batsmen are already active on the pitch, never prompt next batter
    if (activeBatsmenIds.length >= (singleBatsmanAllowed ? 1 : 2)) {
      return;
    }

    if (activeBatsmenIds.length <= (singleBatsmanAllowed ? 0 : 1)) {
      const allTeams = freshMatch?.teams || curScore?.teams || [];
      const battingId = String(
        curScore?.batting?.battingId ||
        curScore?.batting?.teamId ||
        curScore?.battingTeam ||
        ""
      );
      const resolvedBattingTeam =
        allTeams.find((t) => battingId && String(t.teamId || t.id || t._id) === battingId) ||
        allTeams[0] || { players: [] };
      const updatedBattingSquad = resolvedBattingTeam?.players || resolvedBattingTeam?.squad || [];

      const candidateList =
        Array.isArray(curScore?.batsmanUpcoming) && curScore.batsmanUpcoming.length > 0
          ? curScore.batsmanUpcoming
          : updatedBattingSquad;

      const eligible = candidateList.filter((p) => {
        const pid = String(p.id || p._id || p.playerId);
        return !activeSet.has(pid) && !outSet.has(pid);
      });

      if (eligible.length > 0) {
        console.log("[SQUAD-RESUME] Found newly eligible incoming batters:", eligible.length);
        setInningsCompleteModalVisible(false);
        matchStatusHandler("isInningCompleted", false);
        setAvailableBatters(eligible);
        setNextBatterModalVisible(true);
      }
    }
  }, [matchStatusHandler]);
  checkAndPromptNextBatterRef.current = checkAndPromptNextBatterAfterSquadUpdate;

  const handleSquadUpdatedAfterWicket = useCallback(async () => {
    try {
      console.log("[SQUAD-UPDATE] Player added to squad after wicket/innings complete");
      setInningsCompleteModalVisible(false);
      matchStatusHandler("isInningCompleted", false);

      const [mRes, sRes] = await Promise.all([
        matchesApi.getMatchById(matchID),
        matchesApi.getMatchScore(matchID),
      ]);

      const freshMatch = mRes?.data;
      const freshScore = sRes?.data;
      if (freshMatch) setMatchDetails(freshMatch);
      if (freshScore) setScore(freshScore);

      checkAndPromptNextBatterAfterSquadUpdate(freshMatch);
    } catch (err) {
      console.warn("[SQUAD-UPDATE] Error refreshing squad after wicket:", err);
    }
  }, [matchID, checkAndPromptNextBatterAfterSquadUpdate, matchStatusHandler]);

  // Over Complete & Next Bowler Flow
  const handleOverComplete = useCallback(() => {
    const latestScore = scoreRef.current || {};
    const latestMatchDetails = matchDetailsRef.current || {};

    const currentStatus = latestScore?.matchCurrentStatus?.toUpperCase();
    if (
      currentStatus === "INNINGS_I_ENDED" ||
      currentStatus === "INNINGS_BREAK" ||
      currentStatus === "MATCH_COMPLETED" ||
      currentStatus === "MATCH_ENDED"
    ) {
      return;
    }

    const currentOver = parseFloat(latestScore?.batting?.score?.over || 0);
    const totalOvers = parseFloat(latestScore?.totalOvers || latestMatchDetails?.totalOvers || 0);
    const isSuperOver = Boolean(
      latestScore?.isSuperOver ||
      latestMatchDetails?.isSuperOver ||
      latestScore?.status === "SUPER_OVER" ||
      latestScore?.matchCurrentStatus === "SUPER_OVER" ||
      latestScore?.status === MATCH_STATUS.SUPER_OVER ||
      latestScore?.matchCurrentStatus === MATCH_STATUS.SUPER_OVER
    );
    const effectiveTotalOvers = isSuperOver ? 1 : totalOvers;
    const isOddInning = ((latestScore?.currentInnings || latestScore?.currentInning || latestMatchDetails?.currentInnings || 1) % 2 === 1);

    if (isOddInning && effectiveTotalOvers > 0 && Math.floor(currentOver) >= effectiveTotalOvers) {
      console.log("[OVER-COMPLETE] Inning overs complete — setting isInningCompleted");
      matchStatusHandler("isInningCompleted", true);
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
  const handleInningsComplete = useCallback(({ isMatchEndedByCommittee = false } = {}) => {
    const currentInn = score?.currentInnings || matchDetails?.currentInnings || 1;
    const isOddInning = (currentInn % 2 === 1);

    if (isOddInning) {
      setInningsCompleteModalVisible(true);
    } else {
      setCommitteeEndModalVisible(true);
    }
  }, [score?.currentInnings, matchDetails?.currentInnings]);
  handleInningsCompleteRef.current = handleInningsComplete;

  const handleStartInningsTwo = () => {
    Alert.alert(
      "End Innings",
      "Are you sure you want to end this innings? This will proceed to Innings 2 openers selection.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Innings",
          onPress: () => {
            setIsEndingInnings(true);
            updateScore("END_OF_INNINGS", {});
            setInningsCompleteModalVisible(false);

            // Fallback in case INNINGS_START socket event is delayed or dropped
            setTimeout(() => {
              if (!isLeavingRef.current) {
                handleInningsStartSocketRef.current?.();
              }
            }, 4000);
          },
        },
      ]
    );
  };

  const handleSuperOver = () => {
    updateScore(MATCH_ACTION.SUPER_OVER, {});
    setMatchTiedModalVisible(false);
  };

  const handleDeclareTied = () => {
    Alert.alert(
      "Declare Match Tied",
      "End the match as a tie? This action cannot be reversed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Declare Tied",
          onPress: () => {
            updateScore(MATCH_ACTION.MATCH_TIE, {});
            setMatchTiedModalVisible(false);
          },
        },
      ]
    );
  };

  const handleMatchComplete = () => {
    Alert.alert(
      "Match Complete",
      "End of match is an irreversible action. Make sure you want to continue.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Match",
          onPress: () => {
            updateScore(MATCH_ACTION.END_OF_MATCH, {});
            setMatchCompleteModalVisible(false);
            isLeavingRef.current = true;
            setTimeout(() => {
              if (navigation.reset) {
                navigation.reset({
                  index: 1,
                  routes: [
                    { name: SCREENS.Home },
                    { name: SCREENS.MatchScoreCard, params: { matchId: matchID } },
                  ],
                });
              } else {
                navigation.navigate(SCREENS.MatchScoreCard, { matchId: matchID });
              }
            }, 1000);
          },
        },
      ]
    );
  };

  const handleEndMatchCommittee = (winnerTeamId, prompt) => {
    updateScore("END_OF_INNINGS", {
      isMatchEndedByCommittee: true,
      winnerTeamId,
      prompt,
    });
    setCommitteeEndModalVisible(false);
  };

  useEffect(() => {
    if (isLeavingRef.current) return;
    if (!score || Object.keys(score).length === 0) return;

    const currentStatus = String(score?.matchCurrentStatus || score?.status || "").toUpperCase();
    const isSuperOverInn = Boolean(
      score?.isSuperOver ||
      score?.score?.isSuperOver ||
      score?.["innings_" + (score?.currentInnings || 1)]?.isSuperOver ||
      currentStatus === "SUPER_OVER" ||
      currentStatus === MATCH_STATUS.SUPER_OVER ||
      route.params?.isSuperOver
    );
    const currentInn = score?.currentInnings || matchDetails?.currentInnings || 1;
    const isOddInning = (currentInn % 2 === 1);
    const innOversMax = isSuperOverInn ? 1 : Number(score?.totalOvers || matchDetails?.totalOvers || 20);
    const currentOverStr = String(score?.batting?.score?.over || "0");
    const [completedOvers] = currentOverStr.split(".").map(Number);
    const isOverFinished = completedOvers >= innOversMax;
    const currentWickets = Number(score?.batting?.score?.wicket ?? score?.currentInningWicket ?? 0);
    const allTeams = matchDetails?.teams || score?.teams || [];
    const battingId = String(
      score?.batting?.battingId ||
      score?.batting?.teamId ||
      ""
    );
    const resolvedBattingTeam =
      allTeams.find((t) => battingId && String(t.teamId || t.id || t._id) === battingId) ||
      allTeams[0] || { players: [] };
    const currentBattingSquad = resolvedBattingTeam?.players || resolvedBattingTeam?.squad || [];
    const squadCount = currentBattingSquad.length > 0 ? currentBattingSquad.length : 11;
    const maxWicketsAllowed = isSuperOverInn
      ? 2
      : (score?.matchConfig?.singleBatsmanAllowed ? squadCount : Math.max(1, squadCount - 1));
    const isAllOut = currentWickets >= maxWicketsAllowed;
    const canContinueInning = !isOverFinished && currentWickets < 10 && !isAllOut;

    if (
      (currentStatus === "INNINGS_I_ENDED" ||
      currentStatus === "INNINGS_BREAK" ||
      currentStatus === MATCH_STATUS.INNINGS_I_ENDED ||
      currentStatus === MATCH_STATUS.INNINGS_BREAK ||
      (isSuperOverInn && isOddInning && (isOverFinished || isAllOut))) &&
      !canContinueInning
    ) {
      if (isOddInning || !isInningsTwo) {
        matchStatusHandler("isInningCompleted", true);
        setInningsCompleteModalVisible(true);
      }
    } else if (
      currentStatus === "MATCH_COMPLETED" ||
      currentStatus === MATCH_STATUS.MATCH_COMPLETED ||
      (isSuperOverInn && !isOddInning && (isOverFinished || isAllOut))
    ) {
      const lastInningRuns = Number(score?.lastInningScore ?? 0);
      const curRuns = Number(score?.batting?.score?.runs ?? 0);
      if (isSuperOverInn && curRuns === lastInningRuns && (isOverFinished || isAllOut)) {
        matchStatusHandler("isMatchTied", true);
        setMatchTiedModalVisible(true);
      } else {
        matchStatusHandler("isMatchCompleted", true);
        setMatchCompleteModalVisible(true);
      }
    } else if (
      currentStatus === "MATCH_ENDED" ||
      currentStatus === MATCH_STATUS.MATCH_ENDED
    ) {
      matchStatusHandler("isMatchEnded", true);
      setMatchCompleteModalVisible(true);
    } else if (
      currentStatus === "MATCH_TIE" ||
      currentStatus === MATCH_STATUS.MATCH_TIE ||
      score?.isMatchTied
    ) {
      matchStatusHandler("isMatchTied", true);
      setMatchTiedModalVisible(true);
    } else {
      matchStatusHandler(false);
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

          // Purge any stale offline actions that the server has already applied/saved
          const serverUpdatedTs = new Date(
            formatted?.modifiedTime || formatted?.updatedAt || matchRes?.data?.updatedAt || 0
          ).getTime();
          if (serverUpdatedTs > 0) {
            purgeStaleActions(matchID, serverUpdatedTs).then((remaining) => {
              setPendingActionCount(remaining.length);
            });
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

    // Reset previous match score only if navigating to a different match
    setScore((prev) => {
      const prevMatchId = prev?.matchId || prev?.matchID || prev?._id || prev?.id;
      if (prevMatchId && String(prevMatchId) === String(matchID)) {
        return prev;
      }
      return {};
    });
    setMatchDetails(null);
    setIsStatusChecked(false);

    const socketUrl = SOCKET_URL;
    console.log("🔌 [ScorerScreen] Initializing dedicated match socket for:", matchID);

    const socketConn = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      // Keep retrying indefinitely — a scorer at a ground with a longer
      // outage shouldn't have their socket give up and go silent after ~15s.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
    });
    socketRef.current = socketConn;

    const joinRoom = () => {
      console.log("🔌 [ScorerScreen Dedicated Socket] Joining room:", matchID);
      socketConn.emit("score", { matchId: matchID, matchID });
      setIsConnected(true);
      flushPendingActionQueue();
    };

    const handleInningsStartSocket = () => {
      setIsEndingInnings(false);
      setInningsCompleteModalVisible(false);
      setMatchTiedModalVisible(false);
      setCommitteeEndModalVisible(false);
      isLeavingRef.current = true;

      const currentLatestScore = scoreRef.current || score;
      const isSuperOver =
        currentLatestScore?.matchCurrentStatus === MATCH_STATUS.SUPER_OVER ||
        currentLatestScore?.status === MATCH_STATUS.SUPER_OVER ||
        currentLatestScore?.matchCurrentStatus === "SUPER_OVER";

      const nextInn = (currentLatestScore?.currentInning || 1) + 1;
      const inning1Runs =
        currentLatestScore?.batting?.score?.runs ??
        currentLatestScore?.innings_1?.totalRuns ??
        currentLatestScore?.lastInningScore ??
        0;
      const computedTarget = Number(inning1Runs) + 1;

      navigation.navigate(SCREENS.PlayerSelectionScreen, {
        ...route.params,
        matchId: matchID,
        matchID: matchID,
        isInningsTwo: true,
        currentInnings: nextInn,
        action: "END_OF_INNINGS",
        targetScore: computedTarget,
        isSuperOver: isSuperOver,
        striker: null,
        nonStriker: null,
        bowler: null,
        battingTeam: null,
        bowlingTeam: null,
      });
    };
    handleInningsStartSocketRef.current = handleInningsStartSocket;

    const stableOverComplete = (...args) => handleOverCompleteRef.current?.(...args);
    const stableInningsComplete = () => {
      matchStatusHandler("isInningCompleted", true);
      handleInningsCompleteRef.current?.();
    };
    const handlePowerplayStart = (data) => {
      showPowerplayBanner(`🏏 Powerplay is ON — first ${data?.oversCount ?? ""} overs`);
    };
    const handlePowerplayEnd = () => {
      showPowerplayBanner("🏁 Powerplay overs complete");
    };

    socketConn.on("connect", joinRoom);
    socketConn.on("reconnect", joinRoom);
    socketConn.on("disconnect", () => setIsConnected(false));
    socketConn.on("score", scoreHandler);
    socketConn.on("over-complete", stableOverComplete);
    socketConn.on("innings-complete", stableInningsComplete);
    socketConn.on("INNINGS_START", handleInningsStartSocket);
    socketConn.on("powerplay-start", handlePowerplayStart);
    socketConn.on("powerplay-end", handlePowerplayEnd);

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
      socketConn.off("powerplay-start", handlePowerplayStart);
      socketConn.off("powerplay-end", handlePowerplayEnd);
      socketConn.disconnect();
      socketRef.current = null;
    };
  }, [matchID, scoreHandler, navigation, flushPendingActionQueue, showPowerplayBanner]);



  const updateScore = async (action, data = {}) => {
    const effectiveUserId = userId || User.id;
    if (!matchID) {
      Alert.alert("Match not ready", "Please reopen this match and try again.");
      return;
    }

    if (!effectiveUserId) {
      Alert.alert("Login required", "Please log in again before scoring.");
      return;
    }

    analytics.logScorerAction(action, matchID, {
      runs: data?.runs,
      run_type: data?.runType,
      is_wicket: !!data?.isWicket,
      ball_type: data?.ballType,
    });

    // Generate a unique ID for this action so it can be tracked in the queue
    const actionId = generateActionId();
    const payload = {
      userId: effectiveUserId,
      matchId: matchID,
      action,
      data,
      actionId,
    };
    console.log("[UPDATE-SCORE] action:", action, "matchId:", matchID);

    // 1. If connected and not flushing, send directly over the socket
    if (!isFlushingQueueRef.current && socketRef.current?.connected) {
      try {
        const response = await emitWithAck("update-score", payload, 5000);
        if (response?.success) {
          // Successfully acknowledged and recorded by server! No disk write needed.
          return;
        }
      } catch (err) {
        console.warn("[UPDATE-SCORE] Online emit failed, will queue offline:", err);
      }
    }

    // 2. Offline or ack failed/timed out: persist to offline queue in AsyncStorage
    console.log("[UPDATE-SCORE] Queueing action offline:", action, actionId);
    try {
      const queue = await enqueuePendingAction(matchID, {
        actionId,
        userId: effectiveUserId,
        action,
        data,
      });
      setPendingActionCount(queue.length);
    } catch (queueErr) {
      console.warn("[UPDATE-SCORE] Error queueing pending action:", queueErr);
    }
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
    wagonWheel = null,
    pitchMap = null,
  }) => {
    const latestScore = scoreRef.current || {};

    console.log("[HANDLE-BALL] latestScore.batsman:", JSON.stringify(latestScore?.batsman));
    console.log("[HANDLE-BALL] latestScore.bowler:", JSON.stringify(latestScore?.bowler));

    const activeStriker =
      latestScore?.batsman?.find((b) => b?.isStrikeEnd)?.playerId ||
      latestScore?.batsman?.find((b) => b?.isStrikeEnd)?.id ||
      latestScore?.batsman?.find((b) => b?.isStrikeEnd)?._id ||
      latestScore?.batsman?.[0]?.playerId ||
      latestScore?.batsman?.[0]?.id ||
      latestScore?.batsman?.[0]?._id ||
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
      ...(wagonWheel ? { wagonWheel } : {}),
      ...(pitchMap ? { pitchMap } : {}),
    };

    if (isStrikeEnd !== undefined) {
      ballData.isStrikeEnd = isStrikeEnd;
    }

    updateScore(MATCH_ACTION.MATCH_BALL, ballData);

    if (wagonWheel || pitchMap) {
      const activeStrikerName =
        latestScore?.batsman?.find((b) => (b?.playerId || b?.id || b?._id) === activeStriker)?.name ||
        "Striker";
      const activeBowlerName = latestScore?.bowler?.name || "Bowler";

      const currentOverValue = parseFloat(latestScore?.batting?.score?.over || 0);
      const overNumber = Math.floor(currentOverValue) + 1;
      const ballNumber = (latestScore?.currentOver?.length || 0) + 1;

      setSessionDeliveries((prev) => [
        {
          ...ballData,
          runs,
          runType,
          isBoundary: ballData.isBoundary,
          isWicket,
          wagonWheel,
          pitchMap,
          batsman: activeStriker,
          batsmanName: activeStrikerName,
          bowler: activeBowler,
          bowlerName: activeBowlerName,
          overNumber,
          ballNumber,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    }
    // Note: Wicket handling is triggered by OutOptions via onWicket() with proper strike & batsman options
  };

  // Smart scoring interceptor: prompts BallTrackerModal when either check is
  // ON and relevant to the delivery/dismissal.
  // 1) Mankaded / Retired / Timed Out / non-deliveries: no ball was bowled towards
  //    the pitch and no shot was played, so Pitch Map and Wagon Wheel are both bypassed completely.
  // 2) Bowled / LBW / Stumped / Wide / Byes / Leg-byes: a ball was bowled (Pitch Map relevant),
  //    but no shot was played with the bat into the field (Wagon Wheel bypassed).
  // 3) Batting shots & catches (Caught, Run Out off bat, normal runs): both Pitch Map & Wagon Wheel relevant.
  const scoreBall = (params) => {
    const ballType = String(params?.ballType || "").toLowerCase();
    const runType = String(params?.runType || "").toLowerCase();
    const dismissalType = String(
      params?.dismissalInfo?.dismissalType ||
      params?.dismissalType ||
      ""
    ).toLowerCase();

    // 1. Check if an actual delivery was bowled towards the pitch
    const isMankaded = ballType === "mankaded" || dismissalType === "mankaded";
    const isRetired = Boolean(params?.dontCountTheball) || dismissalType.includes("retire");
    const isTimedOut = dismissalType === "timed out";
    const isNoDelivery = isMankaded || isRetired || isTimedOut;

    // 2. Check if a shot was hit with the bat into the field
    const isBowled = dismissalType === "bowled";
    const isLbw = dismissalType === "lbw";
    const isStumped = dismissalType === "stumped";
    const isWide = ballType === "wide" || runType === "wide";
    const isByeOrLegBye =
      runType === "bye" ||
      runType === "leg-bye" ||
      ballType === "bye" ||
      ballType === "leg-bye";
    const isNoBatShot = isNoDelivery || isBowled || isLbw || isStumped || isWide || isByeOrLegBye;

    const effectivePitchMap = isPitchMapChecked && !isNoDelivery;
    const effectiveWagonWheel = isWagonWheelChecked && !isNoBatShot;

    if (effectiveWagonWheel || effectivePitchMap) {
      setPendingBallParams({
        ...params,
        isBowled,
        isLbw,
        isStumped,
        isWide,
        isMankaded,
        isNoDelivery,
        isNoBatShot,
      });
      setShowBallTrackerModal(true);
    } else {
      handleBall(params);
    }
  };

  const handleTrackerConfirm = ({ wagonWheel, pitchMap }) => {
    setShowBallTrackerModal(false);
    if (!pendingBallParams) return;
    const finalParams = {
      ...pendingBallParams,
      ...(wagonWheel ? { wagonWheel } : {}),
      ...(pitchMap ? { pitchMap } : {}),
    };
    setPendingBallParams(null);
    handleBall(finalParams);

    // If a wicket is pending, prompt next batter selection after scoring is committed
    if (pendingWicketFlowRef.current) {
      setTimeout(() => {
        setNextBatterModalVisible(true);
      }, 300);
    }
  };

  const handleTrackerSkip = () => {
    setShowBallTrackerModal(false);
    if (!pendingBallParams) return;
    const finalParams = { ...pendingBallParams };
    setPendingBallParams(null);
    handleBall(finalParams);

    // If a wicket is pending, prompt next batter selection after scoring is committed
    if (pendingWicketFlowRef.current) {
      setTimeout(() => {
        setNextBatterModalVisible(true);
      }, 300);
    }
  };

  const handleTrackerCancel = () => {
    setShowBallTrackerModal(false);
    setPendingBallParams(null);
    pendingWicketFlowRef.current = null;
    setNextBatterModalVisible(false);
  };

  const handleUndo = () => {
    setNextBatterModalVisible(false);
    setNextBowlerModalVisible(false);
    setSelectStrikerModalVisible(false);
    setInningsCompleteModalVisible(false);
    setMatchCompleteModalVisible(false);
    setMatchTiedModalVisible(false);
    setCommitteeEndModalVisible(false);
    pendingWicketFlowRef.current = null;
    updateScore(MATCH_ACTION.UNDO_LAST_BALL, {});
  };

  const handleChangeStrike = (targetPlayer = null) => {
    // Prevent React Native GestureResponderEvent from being treated as a player object
    const isPlayer =
      targetPlayer &&
      typeof targetPlayer === "object" &&
      !targetPlayer.nativeEvent &&
      !targetPlayer._dispatchInstances &&
      Boolean(targetPlayer.playerId || targetPlayer.id || targetPlayer._id || targetPlayer.name);

    const currentBatsmen = scoreRef.current?.batsman || score?.batsman || [];
    if (!currentBatsmen || currentBatsmen.length < 2) {
      console.warn("[CHANGE-STRIKE] Need at least 2 batsmen to change strike, got:", currentBatsmen?.length);
      return;
    }

    let nextStriker;
    if (isPlayer) {
      nextStriker = targetPlayer;
    } else {
      // Toggle mode: switch to the other batsman
      const currentStriker = currentBatsmen.find((b) => b?.isStrikeEnd);
      if (currentStriker) {
        nextStriker =
          currentBatsmen.find((b) => b !== currentStriker && !b?.isStrikeEnd) ||
          currentBatsmen.find((b) => b !== currentStriker) ||
          currentBatsmen[1];
      } else {
        nextStriker = currentBatsmen[1] || currentBatsmen[0];
      }
    }

    if (!nextStriker) return;

    const nextStrikerId =
      nextStriker?.playerId || nextStriker?.id || nextStriker?._id;
    const nextStrikerName = nextStriker?.name;

    console.log("[CHANGE-STRIKE] Switching strike to:", nextStrikerName, nextStrikerId);

    // 1. Optimistic UI update so scorer immediately sees the bat icon move
    setScore((prevScore) => {
      if (!prevScore || !Array.isArray(prevScore?.batsman)) return prevScore;
      const updatedBatsman = prevScore.batsman.map((b) => {
        const matchesId =
          nextStrikerId &&
          (String(b?.playerId || "") === String(nextStrikerId) ||
            String(b?.id || "") === String(nextStrikerId) ||
            String(b?._id || "") === String(nextStrikerId));
        const matchesName =
          nextStrikerName && b?.name && b.name === nextStrikerName;
        const matchesRef = b === nextStriker;

        const isThisNewStriker = Boolean(matchesId || matchesName || matchesRef);
        return {
          ...b,
          isStrikeEnd: isThisNewStriker,
        };
      });
      const newScore = {
        ...prevScore,
        batsman: updatedBatsman,
      };
      scoreRef.current = newScore;
      return newScore;
    });

    // 2. Send MATCH_ACTION.CHANGE_STRIKE with target striker
    const payloadData = nextStrikerId
      ? { striker: nextStrikerId }
      : nextStrikerName
      ? { striker: nextStrikerName }
      : {};
    updateScore(MATCH_ACTION.CHANGE_STRIKE, payloadData);

    // 3. Also send dedicated 'set-striker' socket event to ensure DB sync
    if (nextStrikerId) {
      emit("set-striker", {
        userId: userId || User?.id,
        matchId: matchID,
        action: "SET_STRIKER",
        data: {
          striker: nextStrikerId,
        },
      });
    }
  };

  const leftButtons = [
    ["0", "1", "2"],
    ["3", "4\nFour", "6\nSIX"],
    ["WD", "NB", "BYE"],
  ];

  const rightButtons = ["UNDO", "5,7", "OUT", "LB"];



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

  const currentInnNumber = Number(score?.currentInnings || matchDetails?.currentInnings || route.params?.currentInnings || 1);
  const isEvenInningsNumber = currentInnNumber % 2 === 0;
  const isInningsTwo = Boolean(
    (route.params?.isInningsTwo && isEvenInningsNumber) ||
    currentInnNumber === 2 ||
    isEvenInningsNumber ||
    score?.matchCurrentStatus === MATCH_STATUS.INNINGS_II
  );

  if (isInningsTwo && resolvedBattingObj && resolvedBowlingObj) {
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

  const hasTopBanner = Boolean(
    !isConnected ||
    (isConnected && pendingActionCount > 0) ||
    powerplayBanner ||
    (Number(score?.powerplayOvers) > 0 &&
      parseFloat(score?.batting?.score?.over || "0") < Number(score.powerplayOvers)) ||
    Boolean(score?.dls?.applied || matchDetails?.config?.dls?.applied)
  );

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
                {pendingActionCount > 0
                  ? `Offline — ${pendingActionCount} action${pendingActionCount === 1 ? "" : "s"} will sync automatically`
                  : "Connecting to live scoring server..."}
              </ThemedText>
            </View>
          )}
          {isConnected && pendingActionCount > 0 && (
            <View className="bg-blue-500 py-1.5 px-4 flex-row items-center justify-center">
              <ThemedText className="text-xs text-white font-semibold">
                Syncing {pendingActionCount} pending action{pendingActionCount === 1 ? "" : "s"}...
              </ThemedText>
            </View>
          )}

          {/* Transient powerplay start/end banner */}
          {powerplayBanner && (
            <View className="bg-green-600 py-1.5 px-4 flex-row items-center justify-center">
              <ThemedText className="text-xs text-white font-semibold">
                {powerplayBanner}
              </ThemedText>
            </View>
          )}

          {/* Persistent "in powerplay" badge while the current over is within it */}
          {Number(score?.powerplayOvers) > 0 &&
            parseFloat(score?.batting?.score?.over || "0") < Number(score.powerplayOvers) && (
              <View className="bg-green-100 py-1 px-4 flex-row items-center justify-center">
                <ThemedText className="text-xs text-green-800 font-bold">
                  🏏 Powerplay • Overs 1–{score.powerplayOvers}
                </ThemedText>
              </View>
          )}

          {/* DLS Active Banner */}
          {(() => {
            const dls = score?.dls || matchDetails?.config?.dls;
            if (!dls?.applied) return null;
            return (
              <View className="bg-indigo-600 py-1.5 px-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <ThemedText className="text-xs text-white font-bold mr-1.5">
                    🌧️ DLS Applied:
                  </ThemedText>
                  <ThemedText className="text-xs text-indigo-100 font-semibold">
                    Target {dls.revisedTarget} runs ({dls.revisedOvers} ov)
                  </ThemedText>
                </View>
                {dls.dlsPar !== undefined && (
                  <ThemedText className="text-xs text-yellow-300 font-bold">
                    Par: {dls.dlsPar}
                  </ThemedText>
                )}
              </View>
            );
          })()}

          {/* Header — no flex-1 here, it must size to its own content */}
          <View className="bg-primary">
            <MatchHeader
              matchID={matchID}
              bowlingTeam={score?.bowling}
              battingTeam={score?.batting}
              currentOver={score?.batting?.score?.over}
              batsmen={score?.batsman?.filter((b) => b?.notOut !== false && !b?.dismissalInfo)?.slice(0, 2)}
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
              onSettingsChange={(newSettings) => {
                if (newSettings[MatchSettingEnum.RECORD_WAGON_WHEEL] !== undefined) {
                  const val = !!newSettings[MatchSettingEnum.RECORD_WAGON_WHEEL];
                  setIsWagonWheelChecked(val);
                  AsyncStorage.setItem(`@criconic_ww_${matchID}`, String(val)).catch(() => {});
                }
                if (newSettings[MatchSettingEnum.RECORD_PITCH_MAP] !== undefined) {
                  const val = !!newSettings[MatchSettingEnum.RECORD_PITCH_MAP];
                  setIsPitchMapChecked(val);
                  AsyncStorage.setItem(`@criconic_pm_${matchID}`, String(val)).catch(() => {});
                }
                if (newSettings[MatchSettingEnum.DLS] !== undefined) {
                  const dlsVal = newSettings[MatchSettingEnum.DLS];
                  setScore((prev) => ({
                    ...prev,
                    dls: dlsVal,
                    ...(dlsVal?.applied && dlsVal?.revisedTarget
                      ? {
                          target: dlsVal.revisedTarget,
                          lastInningScore: dlsVal.revisedTarget - 1,
                          totalOvers: dlsVal.revisedOvers || prev?.totalOvers,
                        }
                      : {}),
                  }));
                }
              }}
            />
          </View>

          {/* Score display */}
          <View
            style={[
              styles.scoreContainer,
              { paddingVertical: hasTopBanner ? 8 : 18 ,flex:1},
              isDarkMode ? styles.scoreContainerDark : styles.scoreContainerLight,
            ]}
            className="items-center justify-center bg-primary"
          >
            <ThemedText className={`${hasTopBanner ? "text-3xl" : "text-4xl"} font-bold text-white`}>
              {`${score?.batting?.score?.runs ?? 0}/${score?.batting?.score?.wicket ?? 0}`}
            </ThemedText>
            <ThemedText className={`${hasTopBanner ? "text-lg" : "text-2xl"} text-gray-200`}>
              {`(${score?.batting?.score?.over ?? 0}/${score?.totalOvers ?? 0})`}
            </ThemedText>
            {Boolean(score?.description) && (
              <ThemedText className={`${hasTopBanner ? "text-xs" : "text-sm"} text-gray-300 mt-0.5 text-center px-4`}>
                {score.description}
              </ThemedText>
            )}
            {(() => {
              const currentInn = score?.currentInnings || matchDetails?.currentInnings || 1;
              const isChasing = currentInn % 2 === 0;
              const isSuper = Boolean(
                score?.isSuperOver ||
                score?.score?.isSuperOver ||
                score?.["innings_" + currentInn]?.isSuperOver ||
                matchDetails?.status === MATCH_STATUS.SUPER_OVER ||
                route.params?.isSuperOver
              );
              const target = score?.target || (score?.lastInningScore !== undefined && score?.lastInningScore !== null ? Number(score.lastInningScore) + 1 : null);
              if (!isChasing || !target) return null;

              const curRuns = Number(score?.batting?.score?.runs ?? 0);
              const runsNeeded = Math.max(0, target - curRuns);
              const maxOvers = isSuper ? 1 : Number(score?.totalOvers || 20);
              const [ov, b] = String(score?.batting?.score?.over || "0").split(".").map(Number);
              const ballsBowled = (ov || 0) * 6 + (b || 0);
              const ballsLeft = Math.max(0, maxOvers * 6 - ballsBowled);

              return (
                <View
                  style={{
                    marginTop: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 3,
                    borderRadius: 12,
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ThemedText style={{ fontSize: 13, fontWeight: "700", color: "#fef08a" }}>
                    🎯 Target: {target}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: "#f1f5f9", fontWeight: "500" }}>
                    • Need {runsNeeded} {runsNeeded === 1 ? "run" : "runs"} in {ballsLeft} {ballsLeft === 1 ? "ball" : "balls"}
                  </ThemedText>
                </View>
              );
            })()}
            {Boolean(score?.dls?.applied) && (
              <View
                style={{
                  marginTop: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  borderRadius: 8,
                  backgroundColor: "rgba(0, 0, 0, 0.25)",
                }}
              >
                <ThemedText className="text-xs text-yellow-300 font-bold text-center">
                  Target: {score.dls.revisedTarget} (DLS in {score.dls.revisedOvers} ov)
                </ThemedText>
              </View>
            )}
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
              onPress={() => handleChangeStrike()}
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
            {score?.batsman
              ?.filter((b) => b?.notOut !== false && !b?.dismissalInfo)
              ?.slice(0, 2)
              ?.map((b, idx, arr) => {
                const hasStriker = arr.some((item) => item?.isStrikeEnd);
                const showStrikeIcon = b?.isStrikeEnd || (!hasStriker && idx === 0);
                return (
                  <TouchableOpacity
                    key={idx}
                    className={`flex-1 p-3 items-center ${
                      showStrikeIcon
                        ? isDarkMode
                          ? "bg-blue-900/20 border-b-2 border-blue-500"
                          : "bg-blue-50 border-b-2 border-blue-500"
                        : ""
                    }`}
                    activeOpacity={showStrikeIcon ? 1 : 0.6}
                    onPress={() => {
                      if (!showStrikeIcon) {
                        handleChangeStrike(b);
                      }
                    }}
                  >
                    <ThemedText
                      className={`text-xl font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {showStrikeIcon ? "🏏 " : ""}
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
                    {!showStrikeIcon && (
                      <ThemedText
                        style={{ fontSize: 10, marginTop: 2 }}
                        className="text-blue-500 font-medium"
                      >
                        (tap for strike)
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                );
              })}
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

          {/* Quick View Actions for Wagon Wheel & Pitch Map */}
          {/* <View
            style={[
              styles.trackingToolbar,
              {
                backgroundColor: isDarkMode ? "#111827" : "#F8FAFC",
                borderColor: isDarkMode ? "#1F2937" : "#E2E8F0",
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, width: "100%" }}>
              <TouchableOpacity
                onPress={() => {
                  setViewerInitialTab("wagon");
                  setShowViewerModal(true);
                }}
                style={[
                  styles.quickViewBtn,
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 7,
                    backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
                    borderColor: isDarkMode ? "#374151" : "#CBD5E1",
                  },
                ]}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.quickViewBtnText, { fontSize: 12, color: isDarkMode ? "#93C5FD" : "#2563EB" }]}>
                  🏏 View Wagon Wheel
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setViewerInitialTab("pitch");
                  setShowViewerModal(true);
                }}
                style={[
                  styles.quickViewBtn,
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 7,
                    backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
                    borderColor: isDarkMode ? "#374151" : "#CBD5E1",
                  },
                ]}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.quickViewBtnText, { fontSize: 12, color: isDarkMode ? "#6EE7B7" : "#059669" }]}>
                  🎯 View Pitch Map
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View> */}

          {/* Run Buttons */}
          <View
            style={[
              styles.container,
              isDarkMode ? styles.containerDark : styles.containerLight,
            ]}
          >
            {/* Left Section */}
            <View style={styles.leftSection}>
              {matchStatus.isInningCompleted ? (
                <View
                  style={[
                    styles.inningCompleteCard,
                    {
                      backgroundColor: isDarkMode ? "#111827" : "#f8fafc",
                      borderColor: isDarkMode ? "#1f2937" : "#e2e8f0",
                    },
                  ]}
                >
                  <View style={styles.inningCompleteBadge}>
                    <Ionicons name="flag" size={22} color="#2563eb" />
                    <ThemedText style={styles.inningCompleteTitle}>
                      {isSuperOver ? "Super Over Innings 1 Complete" : "Innings 1 Complete"}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.inningCompleteSub,
                      { color: isDarkMode ? "#9ca3af" : "#64748b" },
                    ]}
                  >
                    Tap End Innings to proceed or tap UNDO to revert the last ball
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.endInningsMainBtn}
                    onPress={() => handleStartInningsTwo()}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={styles.endInningsMainBtnText}>
                      End Innings
                    </ThemedText>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10, width: "100%" }}>
                    <TouchableOpacity
                      onPress={() => handleUndo()}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? "#451a1a" : "#fee2e2",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 4,
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-undo-outline" size={15} color="#dc2626" />
                      <ThemedText style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>
                        Undo Last Ball
                      </ThemedText>
                    </TouchableOpacity>

                    {Number(score?.batting?.score?.wicket || 0) < 10 && !isSuperOver && (
                      <TouchableOpacity
                        onPress={() => {
                          navigation.navigate(SCREENS.ChangeSquad, {
                            teamId: battingTeamData?.teamId || battingTeamData?.id,
                            matchId: matchID,
                            team: battingTeamData,
                            squad: battingTeamData?.players,
                            initialTab: 1,
                            cb: handleSquadUpdatedAfterWicket,
                          });
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          gap: 4,
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="person-add-outline" size={15} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
                        <ThemedText style={{ fontSize: 12, fontWeight: "600", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                          + Add Player
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (matchStatus.isMatchCompleted || matchStatus.isMatchEnded) ? (
                <View
                  style={[
                    styles.inningCompleteCard,
                    {
                      backgroundColor: isDarkMode ? "#111827" : "#f8fafc",
                      borderColor: isDarkMode ? "#1f2937" : "#e2e8f0",
                    },
                  ]}
                >
                  <View style={styles.inningCompleteBadge}>
                    <Ionicons name="trophy" size={22} color="#10b981" />
                    <ThemedText style={[styles.inningCompleteTitle, { color: "#10b981" }]}>
                      Match Complete
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.inningCompleteSub,
                      { color: isDarkMode ? "#9ca3af" : "#64748b" },
                    ]}
                  >
                    {score?.description || "All balls bowled or target reached"}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.endInningsMainBtn, { backgroundColor: "#dc2626" }]}
                    onPress={handleMatchComplete}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={styles.endInningsMainBtnText}>
                      End Match
                    </ThemedText>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10, width: "100%" }}>
                    <TouchableOpacity
                      onPress={() => handleUndo()}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? "#451a1a" : "#fee2e2",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 4,
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-undo-outline" size={15} color="#dc2626" />
                      <ThemedText style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>
                        Undo Last Ball
                      </ThemedText>
                    </TouchableOpacity>

                    {Number(score?.batting?.score?.wicket || 0) < 10 && (
                      <TouchableOpacity
                        onPress={() => {
                          navigation.navigate(SCREENS.ChangeSquad, {
                            teamId: battingTeamData?.teamId || battingTeamData?.id,
                            matchId: matchID,
                            team: battingTeamData,
                            squad: battingTeamData?.players,
                            initialTab: 1,
                            cb: handleSquadUpdatedAfterWicket,
                          });
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          gap: 4,
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="person-add-outline" size={15} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
                        <ThemedText style={{ fontSize: 12, fontWeight: "600", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                          + Add Player
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                leftButtons.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.row}>
                    {row.map((label, colIndex) => {
                      const onPress = () => {
                        switch (label) {
                          case "0":
                          case "1":
                          case "2":
                          case "3":
                            scoreBall({ runs: parseInt(label, 10), runType: "bat", ballType: "ball" });
                            break;
                          case "4\nFour":
                            scoreBall({ runs: 4, runType: "bat", isBoundary: true, ballType: "ball" });
                            break;
                          case "6\nSIX":
                            scoreBall({ runs: 6, runType: "bat", isBoundary: true, ballType: "ball" });
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
                ))
              )}
            </View>

            {/* Right Section */}
            <View style={styles.rightSection}>
              {rightButtons.map((label, index) => {
                const isUndo = label === "UNDO";
                const isDisabled = matchStatus.isInningCompleted && !isUndo;

                const onPress = () => {
                  if (isDisabled) return;
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
                      isUndo && matchStatus.isInningCompleted && {
                        backgroundColor: "#2563eb",
                        borderColor: "#1d4ed8",
                      },
                      isDisabled && { opacity: 0.25 },
                    ]}
                    onPress={onPress}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[
                        styles.text,
                        isDarkMode ? styles.textDark : styles.textLight,
                        isUndo && matchStatus.isInningCompleted && {
                          color: "#ffffff",
                          fontWeight: "bold",
                        },
                        isDisabled && { color: isDarkMode ? "#4b5563" : "#9ca3af" },
                      ]}
                    >
                      {isUndo && matchStatus.isInningCompleted ? "UNDO ↩" : label}
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
            batsmen={score?.batsman?.filter((b) => b?.notOut !== false && !b?.dismissalInfo)?.slice(0, 2)}
            bowler={score?.bowler}
            navigation={navigation}
            disabled={Boolean(matchStatus.isInningCompleted)}
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

            <ThemedText style={{ fontSize: 22, fontWeight: "bold", marginBottom: 8, marginTop: 4, color: isDarkMode ? "#ffffff" : "#111827" }}>
              {isSuperOver ? "🏏 End of Super Over Innings 1" : "🏏 End of Innings 1"}
            </ThemedText>
            <ThemedText style={{ fontSize: 15, color: isDarkMode ? "#d1d5db" : "#4b5563", textAlign: "center", marginBottom: 16 }}>
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

            {/* If wickets < 10 (or team ran out of squad players): give them options to revert decision / add player */}
            {Number(score?.batting?.score?.wicket || 0) < 10 && !isSuperOver && (
              <View
                style={{
                  width: "100%",
                  backgroundColor: isDarkMode ? "#1e293b" : "#f1f5f9",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <ThemedText style={{ fontSize: 13, color: isDarkMode ? "#cbd5e1" : "#475569", textAlign: "center", marginBottom: 8 }}>
                  Team has lost {score?.batting?.score?.wicket || 0} wickets. You can add a player to the squad or undo the last ball.
                </ThemedText>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setInningsCompleteModalVisible(false);
                      navigation.navigate(SCREENS.ChangeSquad, {
                        teamId: battingTeamData?.teamId || battingTeamData?.id,
                        matchId: matchID,
                        team: battingTeamData,
                        squad: battingTeamData?.players,
                        initialTab: 1,
                        cb: handleSquadUpdatedAfterWicket,
                      });
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 4,
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-add-outline" size={15} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
                    <ThemedText style={{ fontSize: 12, fontWeight: "600", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                      + Add Player
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      handleUndo();
                      setInningsCompleteModalVisible(false);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: isDarkMode ? "#451a1a" : "#fee2e2",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 4,
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-undo-outline" size={15} color="#dc2626" />
                    <ThemedText style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>
                      Undo Last Ball
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* If 10 wickets or super over: always allow Undo Last Ball */}
            {(Number(score?.batting?.score?.wicket || 0) >= 10 || isSuperOver) && (
              <View style={{ width: "100%", marginBottom: 14 }}>
                <TouchableOpacity
                  onPress={() => {
                    handleUndo();
                    setInningsCompleteModalVisible(false);
                  }}
                  style={{
                    width: "100%",
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? "#451a1a" : "#fee2e2",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 4,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-undo-outline" size={15} color="#dc2626" />
                  <ThemedText style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}>
                    Undo Last Ball
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

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
                {isSuperOver ? "Select Super Over Innings 2 Openers" : "Select Innings 2 Openers"}
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

      {/* Ending Innings Loading Indicator */}
      {isEndingInnings && (
        <View style={styles.sheetBackdrop}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#2563eb" />
            <ThemedText style={{ color: "#ffffff", marginTop: 12, fontSize: 16, fontWeight: "600" }}>
              Ending Innings...
            </ThemedText>
            <ThemedText style={{ color: "#9ca3af", marginTop: 4, fontSize: 12 }}>
              Setting up Innings 2 openers
            </ThemedText>
          </View>
        </View>
      )}

      {/* Match Completed Dialog */}
      {matchCompleteModalVisible && isFocused && (
        <View style={styles.dialogOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setMatchCompleteModalVisible(false)}
          />
          <View
            style={[
              styles.dialogCard,
              { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" },
            ]}
          >
            <TouchableOpacity 
              onPress={() => setMatchCompleteModalVisible(false)}
              style={{ position: "absolute", top: 16, right: 16, padding: 6, zIndex: 10 }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
            </TouchableOpacity>

            <ThemedText style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8, marginTop: 4, color: isDarkMode ? "#ffffff" : "#111827" }}>
              🏆 Match Completed!
            </ThemedText>
            <ThemedText style={{ fontSize: 15, color: "#10b981", fontWeight: "600", textAlign: "center", marginBottom: 16 }}>
              {score?.description || "Congratulations to the winners!"}
            </ThemedText>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, width: "100%" }}>
              <TouchableOpacity
                onPress={() => {
                  handleUndo();
                  setMatchCompleteModalVisible(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? "#451a1a" : "#fee2e2",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 4,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={15} color="#dc2626" />
                <ThemedText style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>
                  Undo Last Ball
                </ThemedText>
              </TouchableOpacity>

              {Number(score?.batting?.score?.wicket || 0) < 10 && (
                <TouchableOpacity
                  onPress={() => {
                    setMatchCompleteModalVisible(false);
                    navigation.navigate(SCREENS.ChangeSquad, {
                      teamId: battingTeamData?.teamId || battingTeamData?.id,
                      matchId: matchID,
                      team: battingTeamData,
                      squad: battingTeamData?.players,
                      initialTab: 1,
                      cb: handleSquadUpdatedAfterWicket,
                    });
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 4,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add-outline" size={15} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
                  <ThemedText style={{ fontSize: 12, fontWeight: "600", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                    + Add Player
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleMatchComplete}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                backgroundColor: "#dc2626",
                alignItems: "center",
                marginBottom: 10,
              }}
              activeOpacity={0.8}
            >
              <ThemedText style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}>
                End Match
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMatchCompleteModalVisible(false);
                isLeavingRef.current = true;
                if (navigation.reset) {
                  navigation.reset({
                    index: 1,
                    routes: [
                      { name: SCREENS.Home },
                      { name: SCREENS.MatchScoreCard, params: { matchId: matchID } },
                    ],
                  });
                } else {
                  navigation.navigate(SCREENS.MatchScoreCard, { matchId: matchID });
                }
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
              onPress={() => setMatchCompleteModalVisible(false)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDarkMode ? "#374151" : "#d1d5db",
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <ThemedText style={{ color: isDarkMode ? "#d1d5db" : "#4b5563", fontSize: 15, fontWeight: "600" }}>
                Cancel / Review Scorecard
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Match Tied Dialog (Super Over / Declare Tied) */}
      {matchTiedModalVisible && isFocused && (
        <View style={styles.dialogOverlay} pointerEvents="box-none">
          <View style={styles.sheetBackdrop} />
          <View
            style={[
              styles.dialogCard,
              { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" },
            ]}
          >
            <ThemedText style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8, textAlign: "center" }}>
              🤝 Match Tied!
            </ThemedText>
            <ThemedText style={{ fontSize: 15, color: isDarkMode ? "#9ca3af" : "#4b5563", textAlign: "center", marginBottom: 20 }}>
              The scores are level at the end of the match. Choose an option to proceed:
            </ThemedText>

            {/* If wickets < 10 (or team ran out of squad players): give them options to revert decision / add player */}
            {Number(score?.batting?.score?.wicket || 0) < 10 && !isSuperOver && (
              <View style={{ width: "100%", marginBottom: 14 }}>
                <View
                  style={{
                    backgroundColor: isDarkMode ? "#1e293b" : "#f1f5f9",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <ThemedText style={{ fontSize: 13, color: isDarkMode ? "#cbd5e1" : "#475569", textAlign: "center", marginBottom: 8 }}>
                    Team has lost {score?.batting?.score?.wicket || 0} wickets. You can add a player to continue batting or undo the last ball if recorded in error.
                  </ThemedText>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setMatchTiedModalVisible(false);
                        navigation.navigate(SCREENS.ChangeSquad, {
                          teamId: battingTeamData?.teamId || battingTeamData?.id,
                          matchId: matchID,
                          team: battingTeamData,
                          squad: battingTeamData?.players,
                          initialTab: 1,
                        });
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 4,
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="person-add-outline" size={15} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
                      <ThemedText style={{ fontSize: 12, fontWeight: "600", color: isDarkMode ? "#60a5fa" : "#2563eb" }}>
                        + Add Player
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        handleUndo();
                        setMatchTiedModalVisible(false);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? "#451a1a" : "#fee2e2",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 4,
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-undo-outline" size={15} color="#dc2626" />
                      <ThemedText style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>
                        Undo Last Ball
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSuperOver}
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#2563eb",
                alignItems: "center",
                marginBottom: 10,
              }}
              activeOpacity={0.8}
            >
              <ThemedText style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}>
                Start Super Over
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeclareTied}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDarkMode ? "#374151" : "#d1d5db",
                alignItems: "center",
                marginBottom: 8,
              }}
              activeOpacity={0.7}
            >
              <ThemedText style={{ color: isDarkMode ? "#d1d5db" : "#4b5563", fontSize: 15, fontWeight: "600" }}>
                Declare Match Tied
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                handleUndo();
                setMatchTiedModalVisible(false);
              }}
              style={{
                width: "100%",
                padding: 10,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo-outline" size={15} color="#ef4444" />
              <ThemedText style={{ color: "#ef4444", fontSize: 13, fontWeight: "600" }}>
                Undo Last Ball
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* End Match Committee / Innings 2 Confirmation Dialog */}
      {committeeEndModalVisible && isFocused && (
        <View style={styles.dialogOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setCommitteeEndModalVisible(false)}
          />
          <View
            style={[
              styles.dialogCard,
              { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff", maxHeight: "85%" },
            ]}
          >
            <TouchableOpacity 
              onPress={() => setCommitteeEndModalVisible(false)}
              style={{ position: "absolute", top: 16, right: 16, padding: 6, zIndex: 10 }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
            </TouchableOpacity>

            <ThemedText style={{ fontSize: 22, fontWeight: "bold", marginBottom: 6, color: "#0d9488" }}>
              End the Match
            </ThemedText>
            <ThemedText style={{ fontSize: 13, color: isDarkMode ? "#9ca3af" : "#6b7280", marginBottom: 14 }}>
              Ending the match is irreversible. Please review the current status and confirm your decision.
            </ThemedText>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
              {/* Current Score */}
              <View style={{ marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: isDarkMode ? "#111827" : "#f1f5f9" }}>
                <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#9ca3af" : "#64748b" }}>Current Score:</ThemedText>
                <ThemedText style={{ fontSize: 15, fontWeight: "bold", marginTop: 2 }}>
                  {(() => {
                    const isSuperOver = Boolean(
                      score?.isSuperOver ||
                      score?.status === MATCH_STATUS.SUPER_OVER ||
                      score?.matchCurrentStatus === MATCH_STATUS.SUPER_OVER
                    );
                    const oversText = isSuperOver
                      ? "in the Super Over"
                      : `in ${score?.totalOvers || 0} overs`;
                    return `${score?.bowling?.teamName || "Team A"} ${score?.lastInningScore || 0}/${score?.lastInningWickets || 0} ${oversText}`;
                  })()}
                </ThemedText>
              </View>

              {/* Chasing Status */}
              <View style={{ marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: isDarkMode ? "#111827" : "#f1f5f9" }}>
                <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#9ca3af" : "#64748b" }}>Chasing Status:</ThemedText>
                <ThemedText style={{ fontSize: 15, fontWeight: "bold", marginTop: 2 }}>
                  {(() => {
                    const isSuperOver = Boolean(
                      score?.isSuperOver ||
                      score?.status === MATCH_STATUS.SUPER_OVER ||
                      score?.matchCurrentStatus === MATCH_STATUS.SUPER_OVER
                    );
                    const runsNeeded = Math.max(0, (score?.lastInningScore || 0) - (score?.batting?.score?.runs || 0));
                    const oversText = isSuperOver
                      ? "in the Super Over"
                      : `in ${calculateOversLeft(score?.totalOvers || 0, score?.batting?.score?.over || 0)} overs`;
                    return `${score?.batting?.teamName || "Team B"} needs ${runsNeeded} runs ${oversText}`;
                  })()}
                </ThemedText>
              </View>

              {/* Projected Result */}
              <View style={{ marginBottom: 14, padding: 10, borderRadius: 8, backgroundColor: isDarkMode ? "#111827" : "#fef9c3" }}>
                <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#9ca3af" : "#854d0e" }}>Projected Result:</ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: "bold", color: "#ca8a04", marginTop: 2 }}>
                  {calculateProjectedResult(
                    { title: score?.bowling?.teamName || "Team A" },
                    {
                      title: score?.batting?.teamName || "Team B",
                      runs: score?.batting?.score?.runs || 0,
                      wickets: score?.batting?.score?.wicket || 0,
                    },
                    score?.lastInningScore || 0,
                    calculateOversLeft(score?.totalOvers || 0, score?.batting?.score?.over || 0),
                    score?.totalOvers || 20
                  )}
                </ThemedText>
              </View>

              {/* Select Winning Team */}
              <ThemedText style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                Select Winning Team:
              </ThemedText>

              {allTeams.map((team, idx) => {
                const tId = getTeamId(team);
                const tTitle = getTeamTitle(team, `Team ${idx + 1}`);
                const isSelected = committeeWinnerTeam === tId;

                return (
                  <TouchableOpacity
                    key={tId || idx}
                    onPress={() => setCommitteeWinnerTeam(tId)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 8,
                      borderWidth: 2,
                      borderColor: isSelected ? "#0d9488" : (isDarkMode ? "#374151" : "#e5e7eb"),
                      backgroundColor: isSelected ? (isDarkMode ? "#134e4a" : "#ccfbf1") : (isDarkMode ? "#1e293b" : "#ffffff"),
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#0d9488" : "#9ca3af"}
                      style={{ marginRight: 10 }}
                    />
                    <ThemedText style={{ fontSize: 16, fontWeight: isSelected ? "bold" : "500" }}>
                      {tTitle}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14, width: "100%" }}>
              <TouchableOpacity
                onPress={() => setCommitteeEndModalVisible(false)}
                style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 }}
              >
                <ThemedText style={{ color: "#9ca3af", fontSize: 15, fontWeight: "600" }}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (!committeeWinnerTeam) {
                    Alert.alert("Select Winner", "Please select a winning team.");
                    return;
                  }
                  const winnerTeamObj = allTeams.find(
                    (t) => String(getTeamId(t)) === String(committeeWinnerTeam)
                  );
                  const winnerTitle = getTeamTitle(winnerTeamObj, "Winning Team");
                  Alert.alert(
                    "End the Match?",
                    "This will end the match now. This action cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "End Match",
                        style: "destructive",
                        onPress: () =>
                          handleEndMatchCommittee(
                            committeeWinnerTeam,
                            `${winnerTitle} win declare by committee`
                          ),
                      },
                    ]
                  );
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 22,
                  borderRadius: 10,
                  backgroundColor: "#0d9488",
                  alignItems: "center",
                }}
                activeOpacity={0.8}
              >
                <ThemedText style={{ color: "#ffffff", fontSize: 15, fontWeight: "bold" }}>
                  End Match
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Custom Runs & Extras Modal (WD, NB, BYE, LB, 5,7) */}
      <CustomRunModal
        visible={showCustomRunsModal}
        onClose={() => setShowCustomRunsModal(false)}
        customModalDiscription={customModalDescription}
        action={(params) => {
          scoreBall(params);
          setShowCustomRunsModal(false);
        }}
      />

      {/* Dismissal / Out Options Sheet & Sub-modals */}
      <OutOptions
        visible={showOutModal}
        onClose={() => setShowOutModal(false)}
        handelBall={scoreBall}
        onWicket={handleWicket}
        bowler={score?.bowler}
        batsmans={{
          firstBatter:
            score?.batsman?.filter((b) => b?.notOut !== false && !b?.dismissalInfo)?.[0] ||
            score?.batsman?.[0],
          secondBatter:
            score?.batsman?.filter((b) => b?.notOut !== false && !b?.dismissalInfo)?.[1] ||
            score?.batsman?.[1],
        }}
        bowlingTeam={bowlingTeamData}
        battingTeam={battingTeamData}
      />

      {/* Ball Tracker Modal (Prompted on scoring when Wagon Wheel or Pitch Map is enabled) */}
      <BallTrackerModal
        visible={showBallTrackerModal}
        onClose={handleTrackerSkip}
        onConfirm={handleTrackerConfirm}
        onSkip={handleTrackerSkip}
        ballContext={{
          runs: pendingBallParams?.runs ?? 0,
          runType: pendingBallParams?.runType ?? "bat",
          ballType: pendingBallParams?.ballType ?? "ball",
          isBoundary: pendingBallParams?.isBoundary ?? false,
          isWicket: pendingBallParams?.isWicket ?? false,
          isBowled: pendingBallParams?.isBowled ?? false,
          dismissalType:
            pendingBallParams?.dismissalInfo?.dismissalType ||
            pendingBallParams?.dismissalType ||
            "",
          strikerName:
            score?.batsman?.find((b) => b?.isStrikeEnd)?.name ||
            score?.batsman?.[0]?.name ||
            "Striker",
          bowlerName: score?.bowler?.name || "Bowler",
          strikerStance:
            (score?.batsman?.find((b) => b?.isStrikeEnd)?.battingStyle ||
             score?.batsman?.[0]?.battingStyle ||
             "")?.toLowerCase()?.includes("left") ? "LHB" : "RHB",
          isBoxCricket:
            matchDetails?.matchType === "box" ||
            matchDetails?.type === "box" ||
            score?.matchType === "box" ||
            score?.type === "box",
          matchType: matchDetails?.matchType || score?.matchType || "",
        }}
        isWagonWheelEnabled={
          isWagonWheelChecked &&
          !pendingBallParams?.isNoBatShot &&
          pendingBallParams?.ballType !== "wide" &&
          !pendingBallParams?.isBowled &&
          !pendingBallParams?.isLbw &&
          !pendingBallParams?.isStumped
        }
        isPitchMapEnabled={
          isPitchMapChecked &&
          !pendingBallParams?.isNoDelivery
        }
      />

      {/* Visual Analytics Viewer Modal (Wagon Wheel & Pitch Map full inspection) */}
      <WagonPitchViewerModal
        visible={showViewerModal}
        onClose={() => setShowViewerModal(false)}
        initialTab={viewerInitialTab}
        matchDetails={matchDetails}
        score={score}
        sessionDeliveries={sessionDeliveries}
        matchId={matchID}
      />
      </SafeAreaView>
      </View>
    </ScorerScreenContext.Provider>
  );
}

const styles = StyleSheet.create({
  vizTagRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 8,
  },
  vizTagButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  vizTagButtonActive: {
    borderColor: "#16a34a",
    backgroundColor: "rgba(22, 163, 74, 0.1)",
  },
  vizTagText: {
    fontSize: 12,
    color: "#6b7280",
  },
  vizTagTextActive: {
    color: "#16a34a",
    fontWeight: "600",
  },
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
  inningCompleteCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
  },
  inningCompleteBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  inningCompleteTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 6,
    color: "#2563eb",
  },
  inningCompleteSub: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  endInningsMainBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  endInningsMainBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  trackingToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  trackingTogglesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trackingToggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackingToggleChipActive: {},
  checkboxBox: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxBoxActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  trackingToggleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  trackingViewActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickViewBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickViewBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

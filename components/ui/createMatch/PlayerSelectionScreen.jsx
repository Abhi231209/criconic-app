import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Modal,
  ScrollView,
  Alert,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { matchesApi, request } from "@/utils/api";
import { useSocket } from "@/contexts/SocketContext";
import { MATCH_STATUS, matchRedirectBasedOnStatus, confirmLeavePreScore } from "@/utils";
import User from "@/utils/User";
import { useSelector } from "react-redux";

export default function PlayerSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { emit } = useSocket();
  const authUser = useSelector((state) => state?.auth?.user);
  const effectiveUserId = User.id || authUser?._id || authUser?.id;

  const { 
    teamA: initialTeamA, 
    teamB: initialTeamB, 
    teamASquad: initialTeamASquad, 
    teamBSquad: initialTeamBSquad, 
    matchDetails, 
    tossWinner, 
    tossDecision 
  } = route.params || {};

  const matchId =
    route.params?.matchId ||
    route.params?.matchID ||
    matchDetails?._id ||
    matchDetails?.id;
  
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const isValidObjectId = (id) =>
    typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

  const isSameTeam = (t1, t2) => {
    if (!t1 || !t2) return false;
    const id1 = String(t1._id || t1.id || t1.teamId?._id || t1.teamId || "");
    const id2 = String(t2._id || t2.id || t2.teamId?._id || t2.teamId || "");
    if (id1 && id2 && id1 === id2) return true;
    const n1 = (t1.name || t1.title || t1.teamName || "").trim().toLowerCase();
    const n2 = (t2.name || t2.title || t2.teamName || "").trim().toLowerCase();
    if (n1 && n2 && n1 === n2) return true;
    return false;
  };

  const normalizePlayer = (p, idx = 0) => {
    if (!p) return null;
    if (typeof p === "string") {
      return { id: p, name: p, username: p, position: "Player" };
    }
    const rawId = p.id?._id || p.id?.id || p.id || p._id || p.playerId;
    const id =
      rawId && typeof rawId === "object"
        ? String(rawId._id || rawId.id || "")
        : String(rawId || `p_${idx}`);

    const rawName =
      p.name ||
      p.username ||
      p.playerName ||
      p.id?.username ||
      p.id?.name ||
      p.id?.playerName ||
      p.user?.username ||
      p.user?.name ||
      p.player?.username ||
      p.player?.name ||
      p.title ||
      (typeof p.id === "string" && !isValidObjectId(p.id) ? p.id : null);

    const name =
      rawName && !String(rawName).startsWith("Player ")
        ? String(rawName)
        : rawName || `Player ${idx + 1}`;

    const username =
      p.username ||
      p.name ||
      p.id?.username ||
      p.id?.name ||
      p.user?.username ||
      p.player?.username ||
      name;

    return {
      ...p,
      id,
      name,
      username,
      position: p.role || p.position || "Player",
    };
  };

  const normalizeSquad = (squad = []) => {
    if (!Array.isArray(squad)) return [];
    return squad.map((p, idx) => normalizePlayer(p, idx)).filter(Boolean);
  };

  const normTeamASquad = normalizeSquad(initialTeamASquad || initialTeamA?.players || []);
  const normTeamBSquad = normalizeSquad(initialTeamBSquad || initialTeamB?.players || []);

  const [teamA, setTeamA] = useState(initialTeamA || { name: "Team A" });
  const [teamB, setTeamB] = useState(initialTeamB || { name: "Team B" });
  const [teamASquad, setTeamASquad] = useState(normTeamASquad);
  const [teamBSquad, setTeamBSquad] = useState(normTeamBSquad);

  const isInningsTwoParam = Boolean(
    route.params?.isInningsTwo ||
    route.params?.currentInnings === 2 ||
    route.params?.innings === 2 ||
    route.params?.action === "END_OF_INNINGS"
  );
  const [isInningsTwo, setIsInningsTwo] = useState(isInningsTwoParam);

  const isSuperOverParam = Boolean(
    route.params?.isSuperOver ||
    route.params?.status === MATCH_STATUS.SUPER_OVER
  );
  const [isSuperOver, setIsSuperOver] = useState(isSuperOverParam);

  // Unambiguously determine batting & bowling teams based on toss winner and decision
  const isWinnerTeamA = isSameTeam(tossWinner, initialTeamA);
  const isWinnerBatting =
    String(tossDecision).toUpperCase() === "BAT" ||
    String(tossDecision).toLowerCase() === "bat";

  const initialBattingTeam = isWinnerBatting
    ? (isWinnerTeamA ? initialTeamA : initialTeamB)
    : (isWinnerTeamA ? initialTeamB : initialTeamA);

  const initialBowlingTeam = isWinnerBatting
    ? (isWinnerTeamA ? initialTeamB : initialTeamA)
    : (isWinnerTeamA ? initialTeamA : initialTeamB);

  // In Inning 2, reverse batting and bowling teams
  const resolvedBattingTeam = isInningsTwoParam ? initialBowlingTeam : initialBattingTeam;
  const resolvedBowlingTeam = isInningsTwoParam ? initialBattingTeam : initialBowlingTeam;

  const isBattingTeamA = isSameTeam(resolvedBattingTeam, initialTeamA);

  const [battingTeam, setBattingTeam] = useState(resolvedBattingTeam || initialTeamA);
  const [bowlingTeam, setBowlingTeam] = useState(resolvedBowlingTeam || initialTeamB);

  const [battingSquad, setBattingSquad] = useState(
    isBattingTeamA ? normTeamASquad : normTeamBSquad
  );
  const [bowlingSquad, setBowlingSquad] = useState(
    isBattingTeamA ? normTeamBSquad : normTeamASquad
  );

  const [striker, setStriker] = useState(null);
  const [nonStriker, setNonStriker] = useState(null);
  const [bowler, setBowler] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openersCompleted, setOpenersCompleted] = useState(false);
  const [isStatusChecked, setIsStatusChecked] = useState(false);
  const [targetScore, setTargetScore] = useState(route.params?.targetScore || null);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (isInningsTwoParam) {
      setIsInningsTwo(true);
      setStriker(null);
      setNonStriker(null);
      setBowler(null);
      setOpenersCompleted(false);
      isLeavingRef.current = false;
      if (route.params?.targetScore) {
        setTargetScore(route.params.targetScore);
      }
    }
    if (route.params?.isSuperOver || route.params?.status === MATCH_STATUS.SUPER_OVER) {
      setIsSuperOver(true);
      setStriker(null);
      setNonStriker(null);
      setBowler(null);
      setOpenersCompleted(false);
      isLeavingRef.current = false;
    }
  }, [isInningsTwoParam, route.params?.currentInnings, route.params?.action, route.params?.targetScore, route.params?.isSuperOver, route.params?.status]);

  const loadMatchData = useCallback(() => {
    if (!matchId) {
      setIsStatusChecked(true);
      return;
    }

    matchesApi
      .getMatchById(matchId)
      .then(async (res) => {
        const m = res?.data;
        if (!m) {
          setIsStatusChecked(true);
          return;
        }

        const statusUpper = String(m.status || "").toUpperCase();
        const isInningBreak =
          statusUpper === "INNINGS_I_ENDED" ||
          statusUpper === "INNINGS_BREAK" ||
          statusUpper === MATCH_STATUS.INNINGS_I_ENDED ||
          statusUpper === MATCH_STATUS.INNINGS_BREAK;

        const isSuperOverMatch =
          isSuperOverParam ||
          Boolean(route.params?.isSuperOver) ||
          statusUpper === "SUPER_OVER" ||
          statusUpper === MATCH_STATUS.SUPER_OVER ||
          Boolean(m.score?.isSuperOver) ||
          Boolean(m.score?.["innings_" + m.currentInnings]?.isSuperOver);

        if (isSuperOverMatch) {
          setIsSuperOver(true);
          setStriker(null);
          setNonStriker(null);
          setBowler(null);
          setOpenersCompleted(false);
        }

        const isSecondInnings =
          isInningsTwoParam ||
          Boolean(route.params?.isInningsTwo) ||
          route.params?.currentInnings === 2 ||
          route.params?.action === "END_OF_INNINGS" ||
          isInningBreak ||
          m.currentInnings === 2 ||
          m.score?.currentInning === 2;

        if (isSuperOverMatch) {
          // Super Over: stay on selection screen until openers are submitted
        } else if (isSecondInnings) {
          setIsInningsTwo(true);
          // Clear any Inning 1 opener selections so Inning 2 openers can be selected fresh
          setStriker(null);
          setNonStriker(null);
          setBowler(null);
          setOpenersCompleted(false);

          const lastScore =
            m.score?.innings_1?.totalRuns ??
            m.score?.innings_1?.score?.runs ??
            m.score?.lastInningScore;
          if (lastScore !== undefined && lastScore !== null) {
            setTargetScore(Number(lastScore) + 1);
          }

          // In web flow: Only redirect to ScorerScreen if match has already advanced to INNINGS_II
          // (which only happens AFTER selectOpener API is submitted for Inning 2)
          if (statusUpper === MATCH_STATUS.INNINGS_II || statusUpper === "INNINGS_II") {
            setOpenersCompleted(true);
            isLeavingRef.current = true;
            navigation.replace(SCREENS.ScorerScreen, {
              ...route.params,
              matchId,
              isInningsTwo: true,
              currentInnings: 2,
            });
            return;
          }
          // Otherwise, stay on PlayerSelectionScreen to let user select Inning 2 openers!
        } else {
          // Standard Inning 1 checks ONLY
          if (m.status === MATCH_STATUS.MATCH_CREATED) {
            isLeavingRef.current = true;
            navigation.replace(SCREENS.MatchDetailsScreen, { matchId, ...route.params });
            return;
          }

          if (m.status === MATCH_STATUS.MATCH_DETAILS_ENTERED) {
            isLeavingRef.current = true;
            navigation.replace(SCREENS.TossScreen, { matchId, ...route.params });
            return;
          }

          const currentInn = m.currentInnings || 1;
          const currentInnObj = m.score?.[`innings_${currentInn}`];
          const hasSuperOverOpeners = Boolean(
            (currentInnObj?.batsman?.length >= 2) ||
            (m.score?.batsman?.length >= 2) ||
            (currentInnObj?.overs?.length > 0) ||
            (currentInnObj?.totalRuns > 0)
          );

          if (isSuperOverMatch && hasSuperOverOpeners && route.params?.action !== "END_OF_INNINGS") {
            setOpenersCompleted(true);
            isLeavingRef.current = true;
            navigation.replace(SCREENS.ScorerScreen, {
              matchId,
              isSuperOver: true,
            });
            return;
          }

          if (
            m.status &&
            m.status !== MATCH_STATUS.TOSS &&
            m.status !== MATCH_STATUS.MATCH_CREATED &&
            m.status !== MATCH_STATUS.MATCH_DETAILS_ENTERED &&
            m.status !== MATCH_STATUS.SUPER_OVER &&
            statusUpper !== "SUPER_OVER" &&
            !isInningBreak &&
            !isInningsTwoParam &&
            !route.params?.isInningsTwo &&
            !isSuperOverMatch
          ) {
            setOpenersCompleted(true);
            const target = matchRedirectBasedOnStatus(matchId, m.status);
            isLeavingRef.current = true;
            navigation.replace(target.screen, target.params);
            return;
          }
        }

        if (m.teams && m.teams.length >= 2) {
          const t0Id = String(m.teams[0]?.teamId?._id || m.teams[0]?.teamId?.id || m.teams[0]?.teamId || "");
          const t1Id = String(m.teams[1]?.teamId?._id || m.teams[1]?.teamId?.id || m.teams[1]?.teamId || "");

          const toss = m.score?.toss;
          const tossWinningTeamId = String(toss?.winningTeam?._id || toss?.winningTeam?.id || toss?.winningTeam || "");
          const tossDecision = String(toss?.decision || "").toUpperCase();

          let inning1BatTeamId = String(
            m.score?.innings_1?.battingTeam?._id ||
            m.score?.innings_1?.battingTeam?.id ||
            m.score?.innings_1?.battingTeam ||
            ""
          );

          if (!inning1BatTeamId) {
            if (tossDecision === "BAT") {
              inning1BatTeamId = tossWinningTeamId;
            } else if (tossDecision === "BOWL") {
              inning1BatTeamId = (t0Id === tossWinningTeamId) ? t1Id : t0Id;
            } else {
              inning1BatTeamId = t0Id;
            }
          }

          let currentBatTeamIdStr = "";
          const innKeyBat = m.score?.[`innings_${m.currentInnings}`]?.battingTeam;
          const innKeyBatId = innKeyBat ? String(innKeyBat?._id || innKeyBat?.id || innKeyBat) : "";
          if (innKeyBatId) {
            currentBatTeamIdStr = innKeyBatId;
          } else if (isSecondInnings) {
            // Inning 2: batting team is the team that was bowling in Inning 1
            const inn2Bat = m.score?.innings_2?.battingTeam;
            const inn2BatId = inn2Bat ? String(inn2Bat?._id || inn2Bat?.id || inn2Bat) : "";
            if (inn2BatId) {
              currentBatTeamIdStr = inn2BatId;
            } else {
              currentBatTeamIdStr = (t0Id === inning1BatTeamId) ? t1Id : t0Id;
            }
          } else {
            currentBatTeamIdStr = inning1BatTeamId;
          }

          const batTeam =
            m.teams.find((t) => {
              const tid = String(t.teamId?._id || t.teamId?.id || t.teamId || "");
              return tid && tid === currentBatTeamIdStr;
            }) || (isSecondInnings ? m.teams[1] : m.teams[0]);

          const bowlTeam =
            m.teams.find((t) => {
              const tid = String(t.teamId?._id || t.teamId?.id || t.teamId || "");
              return tid && tid !== currentBatTeamIdStr;
            }) || (isSecondInnings ? m.teams[0] : m.teams[1]);

          setTeamA({
            name: m.teams[0]?.title || m.teams[0]?.name || "Team A",
            _id: m.teams[0]?.teamId?._id || m.teams[0]?.teamId,
            id: m.teams[0]?.teamId?._id || m.teams[0]?.teamId,
          });
          setTeamB({
            name: m.teams[1]?.title || m.teams[1]?.name || "Team B",
            _id: m.teams[1]?.teamId?._id || m.teams[1]?.teamId,
            id: m.teams[1]?.teamId?._id || m.teams[1]?.teamId,
          });
          setBattingTeam({
            name: batTeam?.title || batTeam?.name || "Batting Team",
            id: batTeam?.teamId?._id || batTeam?.teamId,
            _id: batTeam?.teamId?._id || batTeam?.teamId,
          });
          setBowlingTeam({
            name: bowlTeam?.title || bowlTeam?.name || "Bowling Team",
            id: bowlTeam?.teamId?._id || bowlTeam?.teamId,
            _id: bowlTeam?.teamId?._id || bowlTeam?.teamId,
          });

          const apiBatPlayers = normalizeSquad(batTeam?.players || []);
          const apiBowlPlayers = normalizeSquad(bowlTeam?.players || []);

          const teamIds = [
            String(batTeam?.teamId?._id || batTeam?.teamId?.id || batTeam?.teamId || ""),
            String(bowlTeam?.teamId?._id || bowlTeam?.teamId?.id || bowlTeam?.teamId || ""),
          ].filter((id) => isValidObjectId(id));

          let dbBatPlayers = [];
          let dbBowlPlayers = [];
          const playerMap = new Map();

          const registerPlayerNames = (list) => {
            if (!Array.isArray(list)) return;
            list.forEach((p) => {
              if (!p) return;
              const pId = String(p.id?._id || p.id?.id || p.id || p._id || p.playerId || "");
              const pName =
                (p.name && !String(p.name).startsWith("Player ") ? p.name : null) ||
                (p.username && !String(p.username).startsWith("Player ") ? p.username : null) ||
                p.playerName ||
                p.id?.username ||
                p.id?.name ||
                p.user?.username ||
                p.user?.name ||
                p.player?.username ||
                p.player?.name ||
                p.title;
              if (pId && pName) {
                playerMap.set(pId, String(pName));
              }
            });
          };

          registerPlayerNames(initialTeamASquad);
          registerPlayerNames(initialTeamBSquad);
          registerPlayerNames(normTeamASquad);
          registerPlayerNames(normTeamBSquad);
          registerPlayerNames(batTeam?.players);
          registerPlayerNames(bowlTeam?.players);

          if (teamIds.length > 0) {
            try {
              const teamsRes = await request("api/teams/getTeamsByIds", {
                method: "POST",
                data: { teamIds },
              });
              const dbTeams = teamsRes?.data || [];
              if (Array.isArray(dbTeams) && dbTeams.length > 0) {
                const dbBat =
                  dbTeams.find(
                    (t) =>
                      String(t._id || t.id) ===
                      String(batTeam?.teamId?._id || batTeam?.teamId?.id || batTeam?.teamId)
                  ) || dbTeams[0];
                const dbBowl =
                  dbTeams.find(
                    (t) =>
                      String(t._id || t.id) ===
                      String(bowlTeam?.teamId?._id || bowlTeam?.teamId?.id || bowlTeam?.teamId)
                  ) ||
                  dbTeams[1] ||
                  dbTeams[0];

                dbBatPlayers = normalizeSquad(dbBat?.players || []);
                dbBowlPlayers = normalizeSquad(dbBowl?.players || []);

                registerPlayerNames(dbBat?.players);
                registerPlayerNames(dbBowl?.players);
              }
            } catch (err) {
              console.warn("[PlayerSelectionScreen] Error fetching teams by IDs:", err);
            }
          }

          const isBatTeamA_api = isSameTeam(batTeam, initialTeamA);
          const routeBatSquad = isBatTeamA_api ? normTeamASquad : normTeamBSquad;
          const routeBowlSquad = isBatTeamA_api ? normTeamBSquad : normTeamASquad;

          const resolveSquad = (routeSquad, apiList, dbList) => {
            const list =
              apiList && apiList.length > 0
                ? apiList
                : routeSquad && routeSquad.length > 0
                ? routeSquad
                : dbList && dbList.length > 0
                ? dbList
                : [];

            return list.map((p, idx) => {
              const pId = String(
                p.id?._id || p.id?.id || p.id || p._id || p.playerId || `p_${idx}`
              );
              const resolvedName =
                playerMap.get(pId) ||
                (p.name && !String(p.name).startsWith("Player ") ? p.name : null) ||
                (p.username && !String(p.username).startsWith("Player ") ? p.username : null) ||
                (p.playerName && !String(p.playerName).startsWith("Player ") ? p.playerName : null) ||
                (apiList?.[idx]?.name && !String(apiList[idx].name).startsWith("Player ") ? apiList[idx].name : null) ||
                (apiList?.[idx]?.username && !String(apiList[idx].username).startsWith("Player ") ? apiList[idx].username : null) ||
                (dbList?.[idx]?.name && !String(dbList[idx].name).startsWith("Player ") ? dbList[idx].name : null) ||
                (dbList?.[idx]?.username && !String(dbList[idx].username).startsWith("Player ") ? dbList[idx].username : null) ||
                p.name ||
                p.username ||
                `Player ${idx + 1}`;

              return {
                ...p,
                id: pId,
                name: resolvedName,
                username: resolvedName,
              };
            });
          };

          setBattingSquad(resolveSquad(routeBatSquad, apiBatPlayers, dbBatPlayers));
          setBowlingSquad(resolveSquad(routeBowlSquad, apiBowlPlayers, dbBowlPlayers));
        }

        // Status check done — safe to render PlayerSelectionScreen UI
        setIsStatusChecked(true);
      })
      .catch((err) => {
        console.warn("[PlayerSelectionScreen] Status check error:", err);
        setIsStatusChecked(true); // ungate even on error
      });
  }, [matchId, isInningsTwoParam, route.params?.currentInnings]);

  useEffect(() => {
    loadMatchData();
  }, [loadMatchData]);

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

      const isSecondInn = Boolean(
        route.params?.isInningsTwo ||
        route.params?.currentInnings === 2 ||
        route.params?.innings === 2 ||
        route.params?.action === "END_OF_INNINGS"
      );
      const isSuper = Boolean(
        route.params?.isSuperOver ||
        route.params?.status === MATCH_STATUS.SUPER_OVER
      );

      if (isSecondInn || isSuper) {
        if (isSecondInn) setIsInningsTwo(true);
        if (isSuper) setIsSuperOver(true);
        setStriker(null);
        setNonStriker(null);
        setBowler(null);
        setOpenersCompleted(false);
      }

      loadMatchData();

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
    }, [navigation, matchId, route.params?.isInningsTwo, route.params?.currentInnings, route.params?.action, route.params?.isSuperOver, route.params?.status, loadMatchData])
  );

  const openPlayerModal = (role) => {
    setSelectedRole(role);
    setIsModalVisible(true);
  };

  const closePlayerModal = () => {
    setIsModalVisible(false);
    setSelectedRole(null);
  };

  const selectPlayer = (player) => {
    switch (selectedRole) {
      case 'striker':
        setStriker(player);
        break;
      case 'nonStriker':
        setNonStriker(player);
        break;
      case 'bowler':
        setBowler(player);
        break;
    }
    closePlayerModal();
  };

  const handleStartMatch = async () => {
    if (!striker || !nonStriker || !bowler) {
      Alert.alert("Selection Required", "Please select Striker, Non-Striker, and Opening Bowler.");
      return;
    }

    const strikerId = getPlayerId(striker);
    const nonStrikerId = getPlayerId(nonStriker);
    const bowlerId = getPlayerId(bowler);

    if (strikerId === nonStrikerId) {
      Alert.alert("Invalid Selection", "Striker and Non-Striker cannot be the same player.");
      return;
    }

    setIsSubmitting(true);

    try {
      const openerPayload = {
        matchID: matchId,
        players: {
          batsman: [
            {
              name: getPlayerName(striker),
              playerId: strikerId,
              battingPosition: 1,
              isStrikeEnd: true,
            },
            {
              name: getPlayerName(nonStriker),
              playerId: nonStrikerId,
              battingPosition: 2,
              isStrikeEnd: false,
            },
          ],
          bowler: {
            name: getPlayerName(bowler),
            playerId: bowlerId,
          },
        },
      };

      if (matchId) {
        const res = await matchesApi.selectOpener(openerPayload);
        if (!res?.data?.success && res?.status !== 200 && res?.status !== 202) {
          console.warn("[PlayerSelection] selectOpener response:", res?.data);
        }
      }

      // Emit socket start event only if NOT Innings 2 and NOT Super Over (aligning with web flow)
      if (!isInningsTwo && !isSuperOver) {
        emit && emit("start", { matchId, userId: effectiveUserId });
      }

      setOpenersCompleted(true);
      isLeavingRef.current = true;

      const navParams = {
        matchId,
        matchID: matchId,
        teamA,
        teamB,
        teamASquad,
        teamBSquad,
        matchDetails,
        tossWinner,
        tossDecision,
        striker,
        nonStriker,
        bowler,
        battingTeam,
        bowlingTeam,
        isInningsTwo,
        isSuperOver,
        currentInnings: isSuperOver ? (route.params?.currentInnings || 3) : (isInningsTwo ? 2 : 1),
      };

      navigation.navigate(SCREENS.ScorerScreen, navParams);
    } catch (error) {
      console.warn("[PlayerSelection] Error submitting openers:", error);
      Alert.alert("Notice", "Error saving openers. Continuing to Scorer Screen.");
      isLeavingRef.current = true;
      navigation.navigate(SCREENS.ScorerScreen, {
        matchId,
        matchID: matchId,
        teamA,
        teamB,
        teamASquad,
        teamBSquad,
        matchDetails,
        tossWinner,
        tossDecision,
        striker,
        nonStriker,
        bowler,
        battingTeam,
        bowlingTeam,
        isInningsTwo,
        isSuperOver,
        currentInnings: isSuperOver ? (route.params?.currentInnings || 3) : (isInningsTwo ? 2 : 1),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlayerName = (p) => {
    if (!p) return "Player";
    if (typeof p === "string") return p;
    return (
      (p.name && !String(p.name).startsWith("Player ") ? p.name : null) ||
      (p.username && !String(p.username).startsWith("Player ") ? p.username : null) ||
      p.playerName ||
      p.id?.username ||
      p.id?.name ||
      p.user?.username ||
      p.user?.name ||
      p.player?.username ||
      p.player?.name ||
      p.title ||
      p.name ||
      p.username ||
      "Player"
    );
  };

  const getPlayerId = (p) => {
    if (!p) return null;
    if (typeof p === "string") return p;
    const raw = p.id?._id || p.id?.id || p.id || p._id || p.playerId;
    return raw && typeof raw === "object" ? String(raw._id || raw.id || "") : String(raw || "");
  };

  const getPlayerInitials = (p) => {
    const nameStr = getPlayerName(p);
    if (!nameStr || typeof nameStr !== "string") return "P";
    const parts = nameStr.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "P";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvailablePlayers = () => {
    const strikerId = getPlayerId(striker);
    switch (selectedRole) {
      case 'striker':
        return battingSquad || [];
      case 'nonStriker':
        return (battingSquad || []).filter(player => !strikerId || getPlayerId(player) !== strikerId);
      case 'bowler':
        return bowlingSquad || [];
      default:
        return [];
    }
  };

  const renderPlayerItem = (player, index) => {
    const pId = getPlayerId(player);
    const pName = getPlayerName(player);
    const sId = getPlayerId(striker);
    const isDisabled = selectedRole === 'nonStriker' && !!sId && sId === pId;
    
    return (
      <TouchableOpacity
        key={String(pId || pName || index)}
        onPress={() => !isDisabled && selectPlayer(player)}
        disabled={isDisabled}
        className={`p-4 rounded-xl mb-2 flex-row items-center ${
          isDisabled
            ? "bg-gray-300 dark:bg-gray-700 opacity-60"
            : isDarkMode
            ? "bg-gray-800"
            : "bg-white"
        }`}
      >
        <View className={`w-10 h-10 rounded-full mr-3 ${
          isDarkMode ? "bg-gray-700" : "bg-gray-200"
        } items-center justify-center`}>
          <ThemedText className="text-sm font-semibold" style={{ color: isDarkMode ? "#f8fafc" : "#111827" }}>
            {getPlayerInitials(player)}
          </ThemedText>
        </View>
        
        <View className="flex-1">
          <ThemedText className="font-semibold" style={{ color: isDisabled ? (isDarkMode ? "#9ca3af" : "#6b7280") : (isDarkMode ? "#f8fafc" : "#111827") }}>
            {pName}
          </ThemedText>
          {player.position || player.rating ? (
            <ThemedText className="text-sm" style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>
              {player.position || "Player"}{player.rating ? ` • ⭐${player.rating}/5` : ""}
            </ThemedText>
          ) : null}
        </View>
        
        {isDisabled && (
          <ThemedText className="text-xs text-red-500">
            Already striker
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectionButton = (role, selectedPlayer, label) => {
    const isSelected = !!selectedPlayer;
    
    return (
      <TouchableOpacity
        onPress={() => openPlayerModal(role)}
        className={`p-4 rounded-xl mb-4 flex-row items-center justify-between ${
          isSelected
            ? "bg-blue-500"
            : isDarkMode
            ? "bg-gray-800"
            : "bg-white"
        } border-2 ${
          isSelected
            ? "border-blue-600"
            : isDarkMode
            ? "border-gray-700"
            : "border-gray-200"
        }`}
      >
        <View className="flex-1">
          <ThemedText className={`font-semibold ${
            isSelected ? "text-white" : "text-gray-900 dark:text-white"
          }`}>
            {label}
          </ThemedText>
          {selectedPlayer ? (
            <ThemedText className={`text-sm ${
              isSelected ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
            }`}>
              {getPlayerName(selectedPlayer)}
            </ThemedText>
          ) : (
            <ThemedText className={`text-sm ${
              isSelected ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
            }`}>
              Tap to select
            </ThemedText>
          )}
        </View>
        
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isSelected ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"}
        />
      </TouchableOpacity>
    );
  };

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
            {isSuperOver
              ? "Select Players - Super Over"
              : isInningsTwo
              ? "Select Players - Innings 2"
              : "Select Players"}
          </ThemedText>
        </View>

        <View className="flex-1 p-4">
          {/* Match Info */}
          <View className={`p-4 rounded-xl mb-6 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}>
            <ThemedText className="text-lg font-bold text-center mb-2 text-gray-900 dark:text-white">
              {teamA.name} vs {teamB.name}
            </ThemedText>
            
            <View className="flex-row justify-between mt-3">
              <View className="items-center flex-1">
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {isSuperOver ? "Batting (Super Over)" : isInningsTwo ? "Batting" : "Batting First"}
                </ThemedText>
                <ThemedText className="text-base font-semibold text-gray-900 dark:text-white text-center">
                  {battingTeam?.name || battingTeam?.title || "Batting Team"}
                </ThemedText>
              </View>
              
              <View className="items-center flex-1">
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {isSuperOver ? "Bowling (Super Over)" : isInningsTwo ? "Bowling" : "Bowling First"}
                </ThemedText>
                <ThemedText className="text-base font-semibold text-gray-900 dark:text-white text-center">
                  {bowlingTeam?.name || bowlingTeam?.title || "Bowling Team"}
                </ThemedText>
              </View>
            </View>
            
            {isInningsTwo && targetScore ? (
              <ThemedText className="text-sm font-semibold text-blue-600 dark:text-blue-400 text-center mt-3">
                Target: {targetScore} runs
              </ThemedText>
            ) : (
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                {(tossWinner?.name || tossWinner?.title || "Toss Winner")} won the toss and chose to {(tossDecision || "bat").toLowerCase()} first
              </ThemedText>
            )}
          </View>

          {/* Player Selection Buttons */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              {isSuperOver
                ? "Batting Team Selection (Super Over)"
                : isInningsTwo
                ? "Batting Team Selection (Innings 2)"
                : "Batting Team Selection"}
            </ThemedText>
            
            {renderSelectionButton('striker', striker, 'Striker')}
            {renderSelectionButton('nonStriker', nonStriker, 'Non-Striker')}
          </View>

          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              {isSuperOver
                ? "Bowling Team Selection (Super Over)"
                : isInningsTwo
                ? "Bowling Team Selection (Innings 2)"
                : "Bowling Team Selection"}
            </ThemedText>
            
            {renderSelectionButton('bowler', bowler, 'Bowler')}
          </View>

          {/* Start Match Button */}
          <TouchableOpacity
            onPress={handleStartMatch}
            disabled={!striker || !nonStriker || !bowler || isSubmitting}
            className={`p-4 rounded-xl mt-4 flex-row items-center justify-center ${
              !striker || !nonStriker || !bowler || isSubmitting
                ? "bg-gray-400"
                : "bg-blue-500"
            }`}
          >
            {isSubmitting && (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <ThemedText className="text-white text-center text-lg font-semibold">
              {isSubmitting
                ? isSuperOver
                  ? "Starting Super Over..."
                  : isInningsTwo
                  ? "Starting Innings 2..."
                  : "Starting Match..."
                : isSuperOver
                ? "Start Super Over"
                : isInningsTwo
                ? "Start Innings 2"
                : "Start Match"}
            </ThemedText>
          </TouchableOpacity>

          {/* Instructions */}
          <View className={`p-4 rounded-xl mt-6 ${
            isDarkMode ? "bg-gray-800/50" : "bg-blue-50"
          }`}>
            <ThemedText className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
              Instructions:
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              • Select opening batsmen (striker and non-striker) from the batting team
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-300">
              • Select the opening bowler from the bowling team
            </ThemedText>
          </View>
        </View>

        {/* Player Selection Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closePlayerModal}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              className="flex-1 bg-black/50"
              onPress={closePlayerModal}
              activeOpacity={1}
            />
            
            <View className={`max-h-3/4 rounded-t-3xl p-5 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}>
              <View className="flex-row justify-between items-center mb-4">
                <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
                  Select {selectedRole === 'striker' ? 'Striker' : 
                          selectedRole === 'nonStriker' ? 'Non-Striker' : 'Bowler'}
                </ThemedText>
                <TouchableOpacity onPress={closePlayerModal}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDarkMode ? "#FFFFFF" : "#000000"}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-96">
                {getAvailablePlayers().length === 0 ? (
                  <View className="py-8 items-center justify-center">
                    <ThemedText className="text-gray-500 text-sm">No players available to select</ThemedText>
                  </View>
                ) : (
                  getAvailablePlayers().map((player, idx) => renderPlayerItem(player, idx))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
}
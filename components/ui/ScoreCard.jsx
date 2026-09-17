import React, { useState, useEffect, useCallback, useMemo, useContext } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { NavigationContext } from "@react-navigation/native";
import ThemedText from "./custom/ThemedText";
import { MATCH_STATUS, getMatchStatusDisplay } from "@/utils";
import SCREENS from "@/screens";
import { useBottomSheet } from "./custom/CustomBottomSheet";
import MatchActionSheet from "./scorecard/MatchActionSheet";
import useAppTheme from "@/hooks/useAppTheme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSocket } from "@/contexts/SocketContext";
import User from "@/utils/User";

const ACTION_SHEET_SNAP_POINTS = ["72%", "88%"];

// In-memory cache: socket score data keyed by matchId for instant re-renders
export const MATCH_CACHE = new Map();

const getEntityId = (entity) => {
  if (!entity) return null;
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || null;
};

function ScoreCard({
  matchId,
  startDate,
  match,
  onPress,
  isMatch = true,
  smallBanner = false,
  fullWidth = false,
  style,
  navigation: propNavigation,
}) {
  const effectiveMatchId = matchId || match?._id || match?.id || match?.matchId;
  const cachedData = effectiveMatchId ? MATCH_CACHE.get(String(effectiveMatchId)) : null;
  const hasExistingData = Boolean(match?.teams?.length || match?.score || match?.title || cachedData);

  const [loading, setLoading] = useState(!hasExistingData);
  const [matchDetails, setMatchDetails] = useState(match || cachedData?.matchDetails || null);
  const [liveScore, setLiveScore] = useState(match?.score || cachedData?.liveScore || null);
  const [isAccessToUpdate, setIsAccessToUpdate] = useState(
    cachedData?.isAccessToUpdate ?? Boolean(match?.accessToUpdate)
  );
  const { on, off, emit } = useSocket();
  const { theme } = useAppTheme();
  const contextNavigation = useContext(NavigationContext);
  const navigation = propNavigation || contextNavigation;
  const { openSheet, closeSheet } = useBottomSheet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  useEffect(() => {
    if (!effectiveMatchId) return;

    const idStr = String(effectiveMatchId);

    // If we already have data (from prop or cache), show immediately
    setLoading(false);

    // Ask the socket for the latest score — this acts as our "fetch"
    const joinRoom = () => {
      emit("score", {
        matchId: effectiveMatchId,
        matchID: effectiveMatchId,
        getCompleteScore: true,
        user: User.user,
        checkUserAccessToUpdate: true,
      });
    };

    joinRoom();

    const handleScoreUpdate = (data) => {
      if (!data) return;
      const incomingId =
        data.matchId ||
        data.matchID ||
        data._id ||
        data.id ||
        data.match ||
        data.fullCommentary?.[0]?.match;

      if (!incomingId || String(incomingId) !== String(effectiveMatchId)) {
        return;
      }
      if (data.accessToUpdate !== undefined) {
        setIsAccessToUpdate(Boolean(data.accessToUpdate));
      }

      setLiveScore(data);
      if (data?.teams?.length) {
        setMatchDetails((prev) => {
          const updated = {
            ...prev,
            teams: data.teams,
            status: data.matchCurrentStatus || prev?.status,
            tournament: data.tournament || prev?.tournament,
            roundType: data.roundType || prev?.roundType,
          };
          MATCH_CACHE.set(idStr, {
            matchDetails: updated,
            liveScore: data,
            isAccessToUpdate: data.accessToUpdate !== undefined ? Boolean(data.accessToUpdate) : isAccessToUpdate,
            timestamp: Date.now(),
          });
          return updated;
        });
      } else {
        // Cache score-only update
        MATCH_CACHE.set(idStr, {
          matchDetails: matchDetails || match,
          liveScore: data,
          isAccessToUpdate: data.accessToUpdate !== undefined ? Boolean(data.accessToUpdate) : isAccessToUpdate,
          timestamp: Date.now(),
        });
      }
    };

    on("connect", joinRoom);
    on("reconnect", joinRoom);
    on("score", handleScoreUpdate);
    return () => {
      off("connect", joinRoom);
      off("reconnect", joinRoom);
      off("score", handleScoreUpdate);
    };
  }, [effectiveMatchId]);

  const combinedMatch = matchDetails || match || {};
  const currentStatus =
    liveScore?.matchCurrentStatus || combinedMatch.status || "MATCH_SCHEDULED";

  // Match status formatted according to web project ("Live", "End", "Upcoming")
  const matchStatus = useMemo(() => {
    return getMatchStatusDisplay(currentStatus) || "Upcoming";
  }, [currentStatus]);

  const isLive = matchStatus === "Live";
  const isCompleted = matchStatus === "End";
  const isUpcoming = matchStatus === "Upcoming";

  // Check scoring access
  const currentUserId = User.id || User.user?._id || User.user?.id;
  const isUserLoggedIn = Boolean(User.isLogin() || currentUserId);
  const isUserOwnerOrScorer = Boolean(
    isUserLoggedIn &&
    currentUserId && (
      getEntityId(combinedMatch?.userId) === currentUserId ||
      getEntityId(combinedMatch?.createdBy) === currentUserId ||
      getEntityId(combinedMatch?.user) === currentUserId ||
      getEntityId(combinedMatch?.scorer) === currentUserId ||
      (Array.isArray(combinedMatch?.scorers) &&
        combinedMatch.scorers.some((s) => getEntityId(s) === currentUserId)) ||
      (Array.isArray(combinedMatch?.admin) &&
        combinedMatch.admin.some((a) => getEntityId(a) === currentUserId)) ||
      (typeof User.isAdmin === "function" && User.isAdmin())
    )
  );
  const canScore = Boolean(isUserLoggedIn && (isAccessToUpdate || isUserOwnerOrScorer || match?.accessToUpdate));

  // Helper to safely extract string team ID
  const resolveTeamId = (team) => {
    if (!team) return "";
    if (typeof team.teamId === "object" && team.teamId?._id) return String(team.teamId._id);
    if (team.teamId) return String(team.teamId);
    if (team._id) return String(team._id);
    if (team.id) return String(team.id);
    return "";
  };

  // Raw teams from combinedMatch or liveScore
  const rawTeamA = combinedMatch?.teams?.[0] || liveScore?.teams?.[0] || combinedMatch?.team1 || {};
  const rawTeamB = combinedMatch?.teams?.[1] || liveScore?.teams?.[1] || combinedMatch?.team2 || {};

  const teamAId = resolveTeamId(rawTeamA) || "team1";
  const teamBId = resolveTeamId(rawTeamB) || "team2";

  const teamAName =
    rawTeamA.title ||
    rawTeamA.teamName ||
    rawTeamA.name ||
    combinedMatch?.team1?.name ||
    combinedMatch?.team1 ||
    "Team 1";

  const teamBName =
    rawTeamB.title ||
    rawTeamB.teamName ||
    rawTeamB.name ||
    combinedMatch?.team2?.name ||
    combinedMatch?.team2 ||
    "Team 2";

  // Check which team batted first (Innings 1) to ensure Inning 1 team is ALWAYS shown on top (Row 1)
  const inn1Source =
    liveScore?.inning?.[0] ||
    liveScore?.innings_1 ||
    combinedMatch?.score?.innings_1 ||
    combinedMatch?.innings_1;

  const inn1BattingId = String(
    inn1Source?.batting?.battingId ||
    inn1Source?.batting?.teamId ||
    inn1Source?.battingTeam?._id ||
    inn1Source?.battingTeam ||
    inn1Source?.teamId ||
    ""
  ).toLowerCase().trim();

  const inn1BattingName = String(
    inn1Source?.batting?.battingTeam ||
    inn1Source?.battingTeam ||
    inn1Source?.teamName ||
    ""
  ).toLowerCase().trim();

  const isTeamBBattedFirst = Boolean(
    (inn1BattingId && teamBId && (inn1BattingId === teamBId.toLowerCase() || inn1BattingId.includes(teamBId.toLowerCase()))) ||
    (inn1BattingName && teamBName && inn1BattingName === teamBName.toLowerCase().trim())
  );

  // Row 1 is always Innings 1 team, Row 2 is always Innings 2 team
  const team1Name = isTeamBBattedFirst ? teamBName : teamAName;
  const team2Name = isTeamBBattedFirst ? teamAName : teamBName;
  const team1Id = isTeamBBattedFirst ? teamBId : teamAId;
  const team2Id = isTeamBBattedFirst ? teamAId : teamBId;

  // Extract all innings (including Super Over)
  const allInnings = useMemo(() => {
    if (Array.isArray(liveScore?.inning) && liveScore.inning.length > 0) {
      return liveScore.inning;
    }
    if (Array.isArray(combinedMatch?.inning) && combinedMatch.inning.length > 0) {
      return combinedMatch.inning;
    }
    // Fallback: construct from innings_1, innings_2, etc.
    const fromScore = [];
    const src = liveScore?.score || combinedMatch?.score || liveScore || combinedMatch;
    if (src && typeof src === "object") {
      ["innings_1", "innings_2", "innings_3", "innings_4"].forEach((k) => {
        if (src[k] && (src[k].totalRuns !== undefined || src[k].totalOvers !== undefined || src[k].score || src[k].batting)) {
          fromScore.push(src[k]);
        }
      });
    }
    return fromScore;
  }, [liveScore, combinedMatch]);

  // Multi-innings extraction for a team (supports Super Over display)
  const getTeamInningsList = useCallback(
    (tId, tName, isRow1) => {
      const idStr = tId ? String(tId).trim().toLowerCase() : "";
      const nameStr = tName ? String(tName).trim().toLowerCase() : "";

      let matched = allInnings.filter((inn) => {
        const b = inn?.batting || inn;
        const innId = resolveTeamId(b) || String(inn?.teamId || inn?.battingTeam || "").trim().toLowerCase();
        const innName = String(b?.battingTeam || b?.teamName || b?.name || inn?.battingTeam || "").trim().toLowerCase();

        if (idStr && innId && (innId === idStr || innId.includes(idStr) || idStr.includes(innId))) return true;
        if (nameStr && innName && (innName === nameStr || innName.includes(nameStr) || nameStr.includes(innName))) return true;
        return false;
      });

      // Fallback by position: Row 1 = Inning 1 (and SO 1), Row 2 = Inning 2 (and SO 2)
      if (matched.length === 0 && allInnings.length > 0) {
        if (isRow1 && allInnings[0]) {
          matched.push(allInnings[0]);
          if (allInnings.length >= 3 && allInnings[2]) matched.push(allInnings[2]);
        } else if (!isRow1 && allInnings[1]) {
          matched.push(allInnings[1]);
          if (allInnings.length >= 4 && allInnings[3]) matched.push(allInnings[3]);
        }
      }

      if (matched.length > 0) {
        return matched.map((inn, idx) => {
          const b = inn?.batting || inn;
          const runs = b?.score?.runs ?? inn?.totalRuns ?? b?.totalRuns ?? 0;
          const wickets = b?.score?.wicket ?? inn?.totalWickets ?? b?.totalWickets ?? 0;
          const over = b?.score?.over ?? inn?.totalOvers ?? b?.totalOvers ?? "0.0";
          const isSO = Boolean(inn?.isSuperOver || inn?.superOver || idx >= 1);
          return {
            runs,
            wickets,
            over: `${over}`,
            isSuperOver: isSO,
            scoreText: `${runs}/${wickets}`,
            oversText: `${over} ov`,
            label: isSO ? `SO: ${runs}/${wickets} (${over} ov)` : `${runs}/${wickets} (${over} ov)`,
          };
        });
      }

      // Fallback to top-level innings_1 / innings_2
      const fallbackInn = isRow1
        ? (liveScore?.innings_1 || combinedMatch?.score?.innings_1)
        : (liveScore?.innings_2 || combinedMatch?.score?.innings_2);

      if (fallbackInn && (fallbackInn.totalRuns !== undefined || fallbackInn.score?.runs !== undefined)) {
        const runs = fallbackInn.score?.runs ?? fallbackInn.totalRuns ?? 0;
        const wickets = fallbackInn.score?.wicket ?? fallbackInn.totalWickets ?? 0;
        const over = fallbackInn.score?.over ?? fallbackInn.totalOvers ?? "0.0";
        return [
          {
            runs,
            wickets,
            over: `${over}`,
            isSuperOver: false,
            scoreText: `${runs}/${wickets}`,
            oversText: `${over} ov`,
            label: `${runs}/${wickets} (${over} ov)`,
          },
        ];
      }

      return [];
    },
    [allInnings, liveScore, combinedMatch]
  );

  const team1Innings = useMemo(() => {
    return getTeamInningsList(team1Id, team1Name, true);
  }, [getTeamInningsList, team1Id, team1Name]);

  const team2Innings = useMemo(() => {
    return getTeamInningsList(team2Id, team2Name, false);
  }, [getTeamInningsList, team2Id, team2Name]);

  // Description & prompt aligned with web project
  const displayDescription = useMemo(() => {
    const rawPrompt =
      liveScore?.matchResult?.prompt ||
      combinedMatch?.matchResult?.prompt ||
      (Array.isArray(liveScore?.prompt) ? liveScore.prompt[0] : liveScore?.prompt) ||
      (Array.isArray(combinedMatch?.prompt) ? combinedMatch.prompt[0] : combinedMatch?.prompt) ||
      "";

    const rawDescription =
      liveScore?.description ||
      combinedMatch?.description ||
      liveScore?.matchResult?.description ||
      combinedMatch?.matchResult?.description ||
      "";

    const venueStr =
      combinedMatch?.venue ||
      combinedMatch?.address ||
      combinedMatch?.location ||
      "";

    return rawPrompt || rawDescription || venueStr || "";
  }, [liveScore, combinedMatch]);

  const tournamentTitle =
    combinedMatch?.tournament?.title ||
    combinedMatch?.tournament?.name ||
    combinedMatch?.tournament ||
    "Cricket Match";

  const roundType = combinedMatch?.roundType || combinedMatch?.matchType || "Match";
  const matchDate = (() => {
    const raw = combinedMatch?.startDate || startDate;
    if (!raw) return "Scheduled";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const handleOpenActionSheet = () =>{
    console.log("[ScoreCard] Opening action sheet for matchId:", effectiveMatchId, "with scoring access:", canScore);
    openSheet(
      <MatchActionSheet
        closeSheet={closeSheet}
        navigation={navigation}
        matchId={effectiveMatchId}
        matchStatus={matchStatus}
        isAccessToUpdate={canScore}
        score={liveScore}
        matchDetails={combinedMatch}
      />,
      ACTION_SHEET_SNAP_POINTS
    );
  }

  // Requirement 8: If user is logged in and has scoring access, open action sheet; otherwise redirect directly to full scorecard page
  const handlePress = () => {
    console.log("[ScoreCard] Card pressed for matchId:", effectiveMatchId, "isUserLoggedIn:", isUserLoggedIn, "canScore:", canScore, "loading:", loading, "currentUserId:", currentUserId);
    if (isUserLoggedIn && (canScore || (loading && currentUserId))) {
      handleOpenActionSheet();
    } else if (navigation?.navigate) {
      navigation.navigate(SCREENS.MatchScoreCard, {
        matchId: effectiveMatchId,
        initialScore: liveScore,
        initialMatch: combinedMatch,
      });
    }
  }

  // Helper for team initials avatar
  const getInitials = (name) => {
    if (!name) return "CR";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isBattingTeam = (tId) => {
    const batId = liveScore?.batting?.teamId || liveScore?.batting?.battingId;
    return isLive && batId && String(batId) === String(tId);
  };

  return (
    <View
      className={`rounded-2xl overflow-hidden mb-4 border ${
        isDarkMode
          ? "bg-gray-800/90 border-gray-700/80 shadow-black/40"
          : "bg-white border-gray-100 shadow-slate-200"
      }`}
      style={[
        {
          width: fullWidth ? "100%" : 300,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 10,
          elevation: 4,
          marginHorizontal: 4,
          marginVertical: 4,
        },
        style,
      ]}
    >
      <TouchableOpacity
          onPress={handlePress}
        activeOpacity={0.88}
        className="p-4"
      >
        {/* Header: Tournament + Status Badge + Loading Indicator */}
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1 mr-2">
            <ThemedText
              numberOfLines={1}
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {tournamentTitle}
            </ThemedText>
            <ThemedText
              className={`text-[11px] ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {roundType} • {matchDate}
            </ThemedText>
          </View>

          {/* Status Badge & Actions */}
          <View className="flex-row items-center">
            {/* Requirement 8: Loading indicator on card while fetching */}
            {loading && (
              <ActivityIndicator
                size="small"
                color="#3B82F6"
                style={{ marginRight: 6 }}
              />
            )}

            {/* Requirement 2: Status badge matching web project */}
            <View
              className={`px-2.5 py-1 rounded-full flex-row items-center ${
                isLive
                  ? isDarkMode
                    ? "bg-green-950/80 border border-green-800"
                    : "bg-green-50 border border-green-200"
                  : isCompleted
                  ? isDarkMode
                    ? "bg-red-950/80 border border-red-800"
                    : "bg-red-50 border border-red-200"
                  : isDarkMode
                  ? "bg-blue-950/80 border border-blue-800"
                  : "bg-blue-50 border border-blue-200"
              }`}
            >
              {isLive && (
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
              )}
              <ThemedText
                className={`text-[11px] font-bold ${
                  isLive
                    ? isDarkMode
                      ? "text-green-400"
                      : "text-green-600"
                    : isCompleted
                    ? isDarkMode
                      ? "text-red-400"
                      : "text-red-600"
                    : isDarkMode
                    ? "text-blue-400"
                    : "text-blue-600"
                }`}
              >
                {matchStatus}
              </ThemedText>
            </View>

            {/* Match Actions Trigger - Always accessible with 0ms delay */}
            {/* <TouchableOpacity
              onPress={(e) => {
                e?.stopPropagation?.();
                handlePress();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ marginLeft: 6, padding: 4 }}
              activeOpacity={0.6}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={16}
                color={isDarkMode ? "#94A3B8" : "#64748B"}
              />
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Teams & Scores (Requirement 3: supports all innings including Super Over) */}
        <View className="space-y-2.5 py-1">
          {/* Team 1 */}
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className="w-8 h-8 rounded-full items-center justify-center mr-2.5 bg-blue-600/15 border border-blue-500/30"
              >
                <ThemedText className="text-xs font-bold text-blue-500">
                  {getInitials(team1Name)}
                </ThemedText>
              </View>

              <View className="flex-1 flex-row items-center">
                <ThemedText
                  numberOfLines={1}
                  className={`text-sm font-semibold mr-1.5 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {team1Name}
                </ThemedText>
                {isBattingTeam(team1Id) && (
                  <ThemedText className="text-xs">🏏</ThemedText>
                )}
              </View>
            </View>

            {/* Team 1 Scores: displays all innings */}
            <View className="items-end justify-center">
              {loading && team1Innings.length === 0 ? (
                <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 4 }} />
              ) : team1Innings.length > 0 ? (
                <View className="items-end">
                  {team1Innings.map((inn, innIdx) => (
                    <View key={`t1_inn_${innIdx}`} className="flex-row items-baseline">
                      {inn.isSuperOver && (
                        <ThemedText className="text-[10px] font-bold text-amber-500 mr-1">
                          SO:
                        </ThemedText>
                      )}
                      <ThemedText
                        className={`text-sm font-bold ${
                          inn.isSuperOver
                            ? "text-amber-500"
                            : isDarkMode
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {inn.scoreText}
                      </ThemedText>
                      <ThemedText
                        className={`text-[10px] ml-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        ({inn.oversText})
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : (
                <ThemedText
                  className={`text-sm font-bold ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  -
                </ThemedText>
              )}
            </View>
          </View>

          {/* Team 2 */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className="w-8 h-8 rounded-full items-center justify-center mr-2.5 bg-amber-600/15 border border-amber-500/30"
              >
                <ThemedText className="text-xs font-bold text-amber-500">
                  {getInitials(team2Name)}
                </ThemedText>
              </View>

              <View className="flex-1 flex-row items-center">
                <ThemedText
                  numberOfLines={1}
                  className={`text-sm font-semibold mr-1.5 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {team2Name}
                </ThemedText>
                {isBattingTeam(team2Id) && (
                  <ThemedText className="text-xs">🏏</ThemedText>
                )}
              </View>
            </View>

            {/* Team 2 Scores: displays all innings */}
            <View className="items-end justify-center">
              {loading && team2Innings.length === 0 ? (
                <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 4 }} />
              ) : team2Innings.length > 0 ? (
                <View className="items-end">
                  {team2Innings.map((inn, innIdx) => (
                    <View key={`t2_inn_${innIdx}`} className="flex-row items-baseline">
                      {inn.isSuperOver && (
                        <ThemedText className="text-[10px] font-bold text-amber-500 mr-1">
                          SO:
                        </ThemedText>
                      )}
                      <ThemedText
                        className={`text-sm font-bold ${
                          inn.isSuperOver
                            ? "text-amber-500"
                            : isDarkMode
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {inn.scoreText}
                      </ThemedText>
                      <ThemedText
                        className={`text-[10px] ml-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        ({inn.oversText})
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : (
                <ThemedText
                  className={`text-sm font-bold ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  -
                </ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Bottom Banner / Description / Result (Requirement 1: aligned with web project) */}
        <View
          className={`mt-3 pt-2.5 border-t flex-row justify-between items-center ${
            isDarkMode ? "border-gray-700/60" : "border-gray-100"
          }`}
        >
          <ThemedText
            numberOfLines={1}
            className={`text-xs font-medium flex-1 mr-2 ${
              isLive
                ? "text-green-600 dark:text-green-400 font-semibold"
                : isDarkMode
                ? "text-gray-400"
                : "text-gray-600"
            }`}
          >
            {displayDescription}
          </ThemedText>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={isDarkMode ? "#9CA3AF" : "#94A3B8"}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(ScoreCard);

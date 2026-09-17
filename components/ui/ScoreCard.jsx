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
import { matchesApi } from "@/utils/api";
import { useSocket } from "@/contexts/SocketContext";
import User from "@/utils/User";

const ACTION_SHEET_SNAP_POINTS = ["72%", "88%"];

// In-memory cache for instant 0ms restoration of match data and scoring access
const MATCH_CACHE = new Map();
const IN_FLIGHT_REQUESTS = new Map();

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
  const lastScoreKeyRef = React.useRef(null);
  const { theme } = useAppTheme();
  const contextNavigation = useContext(NavigationContext);
  const navigation = propNavigation || contextNavigation;
  const { openSheet, closeSheet } = useBottomSheet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  useEffect(() => {
    if (!effectiveMatchId) return;

    const idStr = String(effectiveMatchId);
    const existingEntry = MATCH_CACHE.get(idStr);
    const isFresh = existingEntry && (Date.now() - (existingEntry.timestamp || 0) < 45000);

    if (!hasExistingData && !isFresh) {
      setLoading(true);
    }

    if (!isFresh) {
      let reqPromise = IN_FLIGHT_REQUESTS.get(idStr);
      if (!reqPromise) {
        reqPromise = Promise.all([
          matchesApi.getMatchById(effectiveMatchId, { params: { private: 1 }, errorAlert: false }).catch(() => null),
          matchesApi.getMatchScore(effectiveMatchId).catch(() => null),
        ]).finally(() => {
          IN_FLIGHT_REQUESTS.delete(idStr);
        });
        IN_FLIGHT_REQUESTS.set(idStr, reqPromise);
      }

      reqPromise
        .then(([matchRes, scoreRes]) => {
          let updatedDetails = null;
          let updatedScore = null;
          let updatedAccess = null;

          const mData = matchRes?.data?.data || matchRes?.data || matchRes?.match;
          if (mData && (mData._id || mData.teams || mData.title)) {
            updatedDetails = mData;
            setMatchDetails(mData);
            if (mData.accessToUpdate !== undefined) {
              updatedAccess = Boolean(mData.accessToUpdate);
              setIsAccessToUpdate(updatedAccess);
            }
            if (mData.score) {
              updatedScore = mData.score;
              setLiveScore((prev) => ({ ...prev, ...mData.score }));
            }
          }
          const sData = scoreRes?.data?.data || scoreRes?.data;
          if (sData && typeof sData === "object" && sData.success !== false) {
            updatedScore = sData;
            setLiveScore((prev) => ({ ...prev, ...sData }));
            if (sData.accessToUpdate !== undefined) {
              updatedAccess = Boolean(sData.accessToUpdate);
              setIsAccessToUpdate(updatedAccess);
            }
          }

          // Cache result with timestamp for instant load next time
          MATCH_CACHE.set(idStr, {
            matchDetails: updatedDetails || mData || match,
            liveScore: updatedScore || sData || match?.score,
            isAccessToUpdate: updatedAccess !== null ? updatedAccess : Boolean(match?.accessToUpdate),
            timestamp: Date.now(),
          });
        })
        .catch((err) => console.log("[ScoreCard] Fetch error:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Connect to socket room for live updates
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

      // Skip re-rendering when this tick carries no actual change for this card.
      // Every mounted ScoreCard listens to the same global "score" event, so on a
      // screen with several live matches this fires often; without this guard every
      // tick forces a re-render (and blocks the JS thread) even for unchanged data,
      // which is what causes the action sheet's open animation to occasionally lag.
      const dataKey = JSON.stringify(data);
      if (dataKey === lastScoreKeyRef.current) {
        return;
      }
      lastScoreKeyRef.current = dataKey;

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
  const isUserOwnerOrScorer = Boolean(
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
  const canScore = Boolean(isAccessToUpdate || isUserOwnerOrScorer || match?.accessToUpdate);

  // Resolve team names
  const team1Name =
    combinedMatch?.teams?.[0]?.title ||
    combinedMatch?.teams?.[0]?.teamName ||
    combinedMatch?.teams?.[0]?.name ||
    liveScore?.teams?.[0]?.title ||
    liveScore?.teams?.[0]?.teamName ||
    liveScore?.teams?.[0]?.name ||
    liveScore?.inning?.[0]?.batting?.name ||
    combinedMatch?.team1?.name ||
    combinedMatch?.team1 ||
    "Team 1";

  const team2Name =
    combinedMatch?.teams?.[1]?.title ||
    combinedMatch?.teams?.[1]?.teamName ||
    combinedMatch?.teams?.[1]?.name ||
    liveScore?.teams?.[1]?.title ||
    liveScore?.teams?.[1]?.teamName ||
    liveScore?.teams?.[1]?.name ||
    liveScore?.inning?.[1]?.batting?.name ||
    combinedMatch?.team2?.name ||
    combinedMatch?.team2 ||
    "Team 2";

  const team1Id =
    combinedMatch?.teams?.[0]?.teamId ||
    combinedMatch?.teams?.[0]?._id ||
    liveScore?.teams?.[0]?.teamId ||
    liveScore?.teams?.[0]?._id ||
    "team1";

  const team2Id =
    combinedMatch?.teams?.[1]?.teamId ||
    combinedMatch?.teams?.[1]?._id ||
    liveScore?.teams?.[1]?.teamId ||
    liveScore?.teams?.[1]?._id ||
    "team2";

  // Extract all innings (including Super Over)
  const allInnings = useMemo(() => {
    if (Array.isArray(liveScore?.inning) && liveScore.inning.length > 0) {
      return liveScore.inning;
    }
    if (Array.isArray(combinedMatch?.inning) && combinedMatch.inning.length > 0) {
      return combinedMatch.inning;
    }
    return [];
  }, [liveScore, combinedMatch]);

  // Fallbacks from standard score objects
  const fallbackTeam1Runs =
    liveScore?.inning?.[0]?.batting?.score?.runs ??
    liveScore?.innings_1?.score?.runs ??
    combinedMatch?.team1Score ??
    "-";
  const fallbackTeam1Wickets =
    liveScore?.inning?.[0]?.batting?.score?.wicket ??
    liveScore?.innings_1?.score?.wicket ??
    "";
  const fallbackTeam1Overs =
    liveScore?.inning?.[0]?.batting?.score?.over ??
    liveScore?.innings_1?.score?.over ??
    combinedMatch?.team1Overs ??
    "0.0";

  const fallbackTeam2Runs =
    liveScore?.inning?.[1]?.batting?.score?.runs ??
    liveScore?.innings_2?.score?.runs ??
    combinedMatch?.team2Score ??
    "-";
  const fallbackTeam2Wickets =
    liveScore?.inning?.[1]?.batting?.score?.wicket ??
    liveScore?.innings_2?.score?.wicket ??
    "";
  const fallbackTeam2Overs =
    liveScore?.inning?.[1]?.batting?.score?.over ??
    liveScore?.innings_2?.score?.over ??
    combinedMatch?.team2Overs ??
    "0.0";

  // Multi-innings extraction for a team (supports Super Over display)
  const getTeamInningsList = useCallback(
    (tId, tName, fbRuns, fbWickets, fbOvers, isTeam1) => {
      const idStr = tId ? String(tId).trim().toLowerCase() : "";
      const nameStr = tName ? String(tName).trim().toLowerCase() : "";

      let matched = allInnings.filter((inn) => {
        const b = inn?.batting || inn;
        const innId = String(b?.battingId || b?.teamId || inn?.teamId || b?._id || "").trim().toLowerCase();
        const innName = String(b?.battingTeam || b?.teamName || b?.name || "").trim().toLowerCase();

        if (idStr && innId && (innId === idStr || innId.includes(idStr) || idStr.includes(innId))) return true;
        if (nameStr && innName && (innName === nameStr || innName.includes(nameStr) || nameStr.includes(innName))) return true;
        return false;
      });

      // Fallback by index if innings exists but ids did not match
      if (matched.length === 0 && allInnings.length > 0) {
        if (allInnings.length >= 2) {
          if (isTeam1 && allInnings[0]) matched.push(allInnings[0]);
          if (!isTeam1 && allInnings[1]) matched.push(allInnings[1]);
          if (allInnings.length >= 3 && isTeam1 && allInnings[2]) matched.push(allInnings[2]);
          if (allInnings.length >= 4 && !isTeam1 && allInnings[3]) matched.push(allInnings[3]);
        } else if (isTeam1 && allInnings[0]) {
          matched.push(allInnings[0]);
        }
      }

      if (matched.length > 0) {
        return matched.map((inn, idx) => {
          const b = inn?.batting || inn;
          const runs = b?.score?.runs ?? 0;
          const wickets = b?.score?.wicket ?? 0;
          const over = b?.score?.over ? `${b.score.over}` : "0.0";
          const isSO = Boolean(inn?.isSuperOver || inn?.superOver || idx >= 1);
          return {
            runs,
            wickets,
            over,
            isSuperOver: isSO,
            scoreText: `${runs}/${wickets}`,
            oversText: `${over} ov`,
            label: isSO ? `SO: ${runs}/${wickets} (${over} ov)` : `${runs}/${wickets} (${over} ov)`,
          };
        });
      }

      if (fbRuns !== undefined && fbRuns !== "-") {
        return [
          {
            runs: fbRuns,
            wickets: fbWickets !== "" ? fbWickets : 0,
            over: fbOvers || "0.0",
            isSuperOver: false,
            scoreText: `${fbRuns}${fbWickets !== "" ? `/${fbWickets}` : ""}`,
            oversText: `${fbOvers} ov`,
            label: `${fbRuns}${fbWickets !== "" ? `/${fbWickets}` : ""} (${fbOvers} ov)`,
          },
        ];
      }

      return [];
    },
    [allInnings]
  );

  const team1Innings = useMemo(() => {
    return getTeamInningsList(team1Id, team1Name, fallbackTeam1Runs, fallbackTeam1Wickets, fallbackTeam1Overs, true);
  }, [getTeamInningsList, team1Id, team1Name, fallbackTeam1Runs, fallbackTeam1Wickets, fallbackTeam1Overs]);

  const team2Innings = useMemo(() => {
    return getTeamInningsList(team2Id, team2Name, fallbackTeam2Runs, fallbackTeam2Wickets, fallbackTeam2Overs, false);
  }, [getTeamInningsList, team2Id, team2Name, fallbackTeam2Runs, fallbackTeam2Wickets, fallbackTeam2Overs]);

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
  const matchDate = combinedMatch?.startDate
    ? new Date(combinedMatch.startDate).toLocaleDateString()
    : startDate || "Scheduled";

  const handleOpenActionSheet = useCallback(() => {
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
  }, [openSheet, closeSheet, navigation, effectiveMatchId, matchStatus, canScore, liveScore, combinedMatch]);

  // Requirement 4: If user has scoring access (or while resolving permissions), open action sheet; otherwise redirect to full scorecard page
  const handlePress = useCallback(() => {
    if (canScore || (loading && currentUserId)) {
      handleOpenActionSheet();
    } else if (navigation?.navigate) {
      navigation.navigate(SCREENS.MatchScoreCard, {
        matchId: effectiveMatchId,
        initialScore: liveScore,
        initialMatch: combinedMatch,
      });
    }
  }, [canScore, loading, currentUserId, handleOpenActionSheet, navigation, effectiveMatchId, liveScore, combinedMatch]);

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
            <TouchableOpacity
              onPress={(e) => {
                e?.stopPropagation?.();
                handleOpenActionSheet();
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
            </TouchableOpacity>
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

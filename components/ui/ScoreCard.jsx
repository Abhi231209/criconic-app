import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useColorScheme,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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

function ScoreCard({
  matchId,
  startDate,
  match,
  onPress,
  isMatch = true,
  smallBanner = false,
  fullWidth = false,
  style,
}) {
  const effectiveMatchId = matchId || match?._id || match?.id || match?.matchId;
  const hasExistingData = Boolean(match?.teams?.length || match?.score || match?.title);
  const [loading, setLoading] = useState(!hasExistingData);
  const [matchDetails, setMatchDetails] = useState(match || null);
  const [liveScore, setLiveScore] = useState(match?.score || null);
  const { on, off, emit } = useSocket();
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const { openSheet, closeSheet } = useBottomSheet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  useEffect(() => {
    if (!effectiveMatchId) return;

    // Fetch live match details from database
    if (!hasExistingData) {
      setLoading(true);
    }
    matchesApi
      .getMatchById(effectiveMatchId, { params: { private: 1 }, errorAlert: false })
      .then((res) => {
        if (res?.data && (res.data._id || res.data.teams || res.data.title)) {
          setMatchDetails(res.data);
          if (res.data.score) setLiveScore(res.data.score);
        }
      })
      .catch((err) => console.log("[ScoreCard] Fetch match error:", err))
      .finally(() => setLoading(false));

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
      // Extract all potential match identifiers from payload
      const incomingId =
        data.matchId ||
        data.matchID ||
        data._id ||
        data.id ||
        data.match ||
        data.fullCommentary?.[0]?.match;

      // Strictly verify that this update belongs to THIS match card
      if (!incomingId || String(incomingId) !== String(effectiveMatchId)) {
        return;
      }

      setLiveScore(data);
      if (data?.teams?.length) {
        setMatchDetails((prev) => ({
          ...prev,
          teams: data.teams,
          status: data.matchCurrentStatus || prev?.status,
          tournament: data.tournament || prev?.tournament,
          roundType: data.roundType || prev?.roundType,
        }));
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
    liveScore?.matchCurrentStatus || combinedMatch.status || "SCHEDULED";

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

  // Resolve team scores and overs
  const team1Runs =
    liveScore?.inning?.[0]?.batting?.score?.runs ??
    liveScore?.innings_1?.score?.runs ??
    combinedMatch?.team1Score ??
    "-";
  const team1Wickets =
    liveScore?.inning?.[0]?.batting?.score?.wicket ??
    liveScore?.innings_1?.score?.wicket ??
    "";
  const team1Overs =
    liveScore?.inning?.[0]?.batting?.score?.over ??
    liveScore?.innings_1?.score?.over ??
    combinedMatch?.team1Overs ??
    "0.0";

  const team2Runs =
    liveScore?.inning?.[1]?.batting?.score?.runs ??
    liveScore?.innings_2?.score?.runs ??
    combinedMatch?.team2Score ??
    "-";
  const team2Wickets =
    liveScore?.inning?.[1]?.batting?.score?.wicket ??
    liveScore?.innings_2?.score?.wicket ??
    "";
  const team2Overs =
    liveScore?.inning?.[1]?.batting?.score?.over ??
    liveScore?.innings_2?.score?.over ??
    combinedMatch?.team2Overs ??
    "0.0";

  const scoreData = {
    matchCurrentStatus: currentStatus,
    tournament: {
      title:
        combinedMatch?.tournament?.title ||
        combinedMatch?.tournament?.name ||
        combinedMatch?.tournament ||
        "Cricket Match",
    },
    roundType: combinedMatch?.roundType || combinedMatch?.matchType || "Match",
    teams: [
      {
        teamId:
          combinedMatch?.teams?.[0]?.teamId ||
          liveScore?.teams?.[0]?.teamId ||
          "team1",
        title: team1Name,
        score:
          team1Runs !== "-"
            ? `${team1Runs}${team1Wickets !== "" ? `/${team1Wickets}` : ""}`
            : "-",
        overs: `${team1Overs}`,
        logo:
          combinedMatch?.teams?.[0]?.teamLogo ||
          combinedMatch?.teams?.[0]?.logoImage ||
          combinedMatch?.teams?.[0]?.image ||
          liveScore?.teams?.[0]?.teamLogo ||
          null,
        isBatting:
          liveScore?.batting?.teamId === (combinedMatch?.teams?.[0]?.teamId || liveScore?.teams?.[0]?.teamId) ||
          false,
      },
      {
        teamId:
          combinedMatch?.teams?.[1]?.teamId ||
          liveScore?.teams?.[1]?.teamId ||
          "team2",
        title: team2Name,
        score:
          team2Runs !== "-"
            ? `${team2Runs}${team2Wickets !== "" ? `/${team2Wickets}` : ""}`
            : "-",
        overs: `${team2Overs}`,
        logo:
          combinedMatch?.teams?.[1]?.teamLogo ||
          combinedMatch?.teams?.[1]?.logoImage ||
          combinedMatch?.teams?.[1]?.image ||
          liveScore?.teams?.[1]?.teamLogo ||
          null,
        isBatting:
          liveScore?.batting?.teamId === (combinedMatch?.teams?.[1]?.teamId || liveScore?.teams?.[1]?.teamId) ||
          false,
      },
    ],
    matchResult: {
      winningTeam:
        combinedMatch?.matchResult?.winningTeam ||
        combinedMatch?.winner ||
        null,
      prompt:
        combinedMatch?.matchResult?.prompt ||
        combinedMatch?.result ||
        combinedMatch?.description ||
        getMatchStatusDisplay(currentStatus, MATCH_STATUS) ||
        "",
    },
    venue:
      combinedMatch?.address ||
      combinedMatch?.venue ||
      combinedMatch?.location ||
      "Cricket Ground",
    date: combinedMatch?.startDate
      ? new Date(combinedMatch.startDate).toLocaleDateString()
      : startDate || "Scheduled",
  };

  const matchStatus = getMatchStatusDisplay(
    scoreData.matchCurrentStatus,
    MATCH_STATUS
  );

  const isLive =
    Boolean(combinedMatch?.isLive) ||
    matchStatus?.toUpperCase().includes("LIVE") ||
    matchStatus?.toUpperCase().includes("INNINGS") ||
    currentStatus === MATCH_STATUS.MATCH_IN_PROGRESS ||
    currentStatus === MATCH_STATUS.MATCH_STARTED ||
    currentStatus === MATCH_STATUS.INNINGS_I ||
    currentStatus === MATCH_STATUS.INNINGS_II;
  const isCompleted =
    Boolean(combinedMatch?.isCompleted) ||
    matchStatus?.toUpperCase() === "END" ||
    matchStatus?.toUpperCase().includes("COMPLETED") ||
    matchStatus?.toUpperCase().includes("FINISHED") ||
    currentStatus === MATCH_STATUS.MATCH_COMPLETED ||
    currentStatus === MATCH_STATUS.MATCH_ENDED;

  const BottomSheetContent = () => (
    <MatchActionSheet
      closeSheet={closeSheet}
      navigation={navigation}
      matchId={effectiveMatchId}
      matchStatus={currentStatus}
    />
  );

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      openSheet(<BottomSheetContent />);
    }
  };

  // Helper for team initials avatar
  const getInitials = (name) => {
    if (!name) return "CR";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isScoreLoading = loading && !liveScore && !matchDetails?.score && !match?.score;

  if (isScoreLoading) {
    return (
      <View
        className={`rounded-2xl overflow-hidden mb-4 border justify-center items-center ${
          isDarkMode
            ? "bg-gray-800/90 border-gray-700/80 shadow-black/40"
            : "bg-white border-gray-100 shadow-slate-200"
        }`}
        style={[
          {
            width: fullWidth ? "100%" : 300,
            height: 170,
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
        <ActivityIndicator size="small" color="#3B82F6" />
        <ThemedText style={{ marginTop: 8, fontSize: 13, fontWeight: "600", color: isDarkMode ? "#94a3b8" : "#64748b" }}>
          Loading score...
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      className={`rounded-2xl overflow-hidden mb-4 border ${
        isDarkMode
          ? "bg-gray-800/90 border-gray-700/80 shadow-black/40"
          : "bg-white border-gray-100 shadow-slate-200"
      } ${loading ? "opacity-70" : "opacity-100"}`}
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
        {/* Header: Tournament + Status Badge */}
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1 mr-2">
            <ThemedText
              numberOfLines={1}
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {scoreData.tournament?.title}
            </ThemedText>
            <ThemedText
              className={`text-[11px] ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {scoreData.roundType} • {scoreData.date}
            </ThemedText>
          </View>

          {/* Status Badge & Actions */}
          <View className="flex-row items-center">
            <View
              className={`px-2.5 py-1 rounded-full flex-row items-center ${
                isLive
                  ? isDarkMode
                    ? "bg-red-950/80 border border-red-800"
                    : "bg-red-50 border border-red-200"
                  : isCompleted
                  ? isDarkMode
                    ? "bg-emerald-950/80 border border-emerald-800"
                    : "bg-emerald-50 border border-emerald-200"
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
                      ? "text-red-400"
                      : "text-red-600"
                    : isCompleted
                    ? isDarkMode
                      ? "text-emerald-400"
                      : "text-emerald-600"
                    : isDarkMode
                    ? "text-blue-400"
                    : "text-blue-600"
                }`}
              >
                {isLive ? "LIVE" : matchStatus.toUpperCase()}
              </ThemedText>
            </View>

            {/* Match Actions Trigger */}
            <TouchableOpacity
              onPress={(e) => {
                e?.stopPropagation?.();
                openSheet(<BottomSheetContent />);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginLeft: 6, padding: 3 }}
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

        {/* Teams & Scores */}
        <View className="space-y-2.5 py-1">
          {scoreData.teams.map((team, idx) => (
            <View
              key={`team-${idx}`}
              className="flex-row justify-between items-center"
            >
              {/* Team Monogram & Title */}
              <View className="flex-row items-center flex-1 mr-2">
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center mr-2.5 ${
                    idx === 0
                      ? "bg-blue-600/15 border border-blue-500/30"
                      : "bg-amber-600/15 border border-amber-500/30"
                  }`}
                >
                  <ThemedText
                    className={`text-xs font-bold ${
                      idx === 0 ? "text-blue-500" : "text-amber-500"
                    }`}
                  >
                    {getInitials(team.title)}
                  </ThemedText>
                </View>

                <View className="flex-1 flex-row items-center">
                  <ThemedText
                    numberOfLines={1}
                    className={`text-sm font-semibold mr-1.5 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {team.title}
                  </ThemedText>
                  {isLive && team.isBatting && (
                    <ThemedText className="text-xs">🏏</ThemedText>
                  )}
                </View>
              </View>

              {/* Team Score */}
              <View className="items-end justify-center">
                {loading && !liveScore && team.score === "-" ? (
                  <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 4 }} />
                ) : (
                  <>
                    <ThemedText
                      className={`text-sm font-bold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {team.score}
                    </ThemedText>
                    <ThemedText
                      className={`text-[11px] ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      ({team.overs} ov)
                    </ThemedText>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Banner / Result / Venue */}
        <View
          className={`mt-3 pt-2.5 border-t flex-row justify-between items-center ${
            isDarkMode ? "border-gray-700/60" : "border-gray-100"
          }`}
        >
          <ThemedText
            numberOfLines={1}
            className={`text-xs font-medium flex-1 mr-2 ${
              isLive
                ? "text-blue-500 dark:text-blue-400"
                : isDarkMode
                ? "text-gray-400"
                : "text-gray-600"
            }`}
          >
            {scoreData.matchResult?.prompt || scoreData.venue}
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

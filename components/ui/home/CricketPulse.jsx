import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { userApi, matchesApi, request } from "@/utils/api";
import User from "@/utils/User";

function formatMatchTime(dateStr) {
  if (!dateStr) return "Scheduled";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Scheduled";

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `Today • ${timeStr}`;
    if (isTomorrow) return `Tomorrow • ${timeStr}`;

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} • ${timeStr}`;
  } catch (e) {
    return "Scheduled";
  }
}

export default function CricketPulse() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const authUser = useSelector((state) => state.auth?.user);
  const userId = User.id || authUser?._id || authUser?.id;
  const isUserLoggedIn = Boolean(User.isLogin() || userId);

  const [loading, setLoading] = useState(false);
  const [pulseMatch, setPulseMatch] = useState(null);
  const [careerStats, setCareerStats] = useState({
    runs: 0,
    wickets: 0,
    matches: 0,
    highest: 0,
    strikeRate: "0.0",
  });

  // Extract initial stats from authUser if present
  useEffect(() => {
    if (authUser?.stats || authUser?.battingStats) {
      const bStats = authUser.stats?.batting || authUser.battingStats || {};
      const bowlStats = authUser.stats?.bowling || authUser.bowlingStats || {};
      setCareerStats({
        runs: Number(bStats.runs || 0),
        wickets: Number(bowlStats.wickets || 0),
        matches: Number(bStats.matches || bowlStats.matches || 0),
        highest: Number(bStats.highestScore || 0),
        strikeRate: String(bStats.strikeRate || "0.0"),
      });
    }
  }, [authUser]);

  const fetchPulseData = useCallback(async () => {
    if (!userId || !isUserLoggedIn) return;
    try {
      setLoading(true);

      // 1. Fetch user profile stats
      const profilePromise = userApi.getProfile(userId).catch(() => null);

      // 2. Fetch user's active/upcoming/recent matches
      const matchesPromise = matchesApi
        .getMatches({ self: 1, userId, limit: 4 }, { errorAlert: false })
        .catch(() => null);

      const idsPromise = request(
        `api/matches/ids?playerId=${userId}&page=1&items=4`,
        { method: "GET", errorAlert: false }
      ).catch(() => null);

      const [profileRes, matchesRes, idsRes] = await Promise.all([
        profilePromise,
        matchesPromise,
        idsPromise,
      ]);

      // Process stats
      const uData =
        profileRes?.data?.content?.playerDetail ||
        profileRes?.data?.data ||
        profileRes?.data?.user;
      if (uData?.stats || uData?.battingStats) {
        const b = uData.stats?.batting || uData.battingStats || {};
        const bw = uData.stats?.bowling || uData.bowlingStats || {};
        setCareerStats({
          runs: Number(b.runs || 0),
          wickets: Number(bw.wickets || 0),
          matches: Number(b.matches || bw.matches || 0),
          highest: Number(b.highestScore || 0),
          strikeRate: String(b.strikeRate || "0.0"),
        });
      }

      // Process matches to find priority match: Live > Upcoming > Recent Completed
      const rawMatches = [
        ...(Array.isArray(matchesRes?.data?.matches)
          ? matchesRes.data.matches
          : Array.isArray(matchesRes?.data?.content)
          ? matchesRes.data.content
          : []),
        ...(Array.isArray(idsRes?.data?.content)
          ? idsRes.data.content
          : Array.isArray(idsRes?.content)
          ? idsRes.content
          : []),
      ];

      const seenIds = new Set();
      const uniqueList = [];
      for (const m of rawMatches) {
        const mId = String(m?._id || m?.id || m?.matchId || "");
        if (mId && !seenIds.has(mId)) {
          seenIds.add(mId);
          uniqueList.push(m);
        }
      }

      // Priority sort: Live > Upcoming > Recent Finished
      const live = uniqueList.find((m) => {
        const st = String(m?.status || "").toLowerCase();
        return (
          st.includes("live") ||
          st.includes("progress") ||
          st === "ongoing" ||
          st === "innings_1" ||
          st === "innings_2"
        );
      });

      const upcoming = uniqueList.find((m) => {
        const st = String(m?.status || "").toLowerCase();
        return (
          st.includes("scheduled") ||
          st.includes("upcoming") ||
          st === "match_scheduled"
        );
      });

      const finished = uniqueList.find((m) => {
        const st = String(m?.status || "").toLowerCase();
        return (
          st.includes("complete") ||
          st.includes("finished") ||
          st === "end" ||
          st === "result"
        );
      });

      setPulseMatch(live || upcoming || finished || null);
    } catch (err) {
      console.warn("[CricketPulse] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, isUserLoggedIn]);

  useEffect(() => {
    fetchPulseData();
  }, [fetchPulseData]);

  // Determine pulse match display metadata
  const matchMeta = useMemo(() => {
    if (!pulseMatch) return null;
    const st = String(pulseMatch?.status || "").toLowerCase();
    const isLive =
      st.includes("live") ||
      st.includes("progress") ||
      st === "ongoing" ||
      st === "innings_1" ||
      st === "innings_2";
    const isCompleted =
      st.includes("complete") ||
      st.includes("finished") ||
      st === "end" ||
      st === "result";

    const team1 =
      pulseMatch?.teams?.[0]?.title ||
      pulseMatch?.teams?.[0]?.name ||
      pulseMatch?.teams?.[0]?.teamName ||
      "Team 1";
    const team2 =
      pulseMatch?.teams?.[1]?.title ||
      pulseMatch?.teams?.[1]?.name ||
      pulseMatch?.teams?.[1]?.teamName ||
      "Team 2";

    const matchTitle =
      pulseMatch?.title || pulseMatch?.tournament?.title || "Match";
    const venue = pulseMatch?.location || pulseMatch?.ground || "Cricket Ground";
    const dateFormatted = formatMatchTime(
      pulseMatch?.startDate || pulseMatch?.createdAt
    );

    return {
      isLive,
      isCompleted,
      team1,
      team2,
      matchTitle,
      venue,
      dateFormatted,
      id: pulseMatch?._id || pulseMatch?.id || pulseMatch?.matchId,
    };
  }, [pulseMatch]);

  // Guest view if user is not logged in
  if (!isUserLoggedIn) {
    return (
      <View className="mb-4">
        <LinearGradient
          colors={
            isDarkMode
              ? ["#111A2E", "#0D1526", "#0A0F1D"]
              : ["#EFF6FF", "#DBEAFE", "#EFF6FF"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`rounded-2xl p-4 border ${
            isDarkMode ? "border-slate-800" : "border-blue-200"
          } shadow-sm`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className={`w-9 h-9 rounded-xl items-center justify-center mr-2.5 ${
                  isDarkMode ? "bg-[#4DD6C7]/15 border border-[#4DD6C7]/30" : "bg-blue-100"
                }`}
              >
                <Ionicons
                  name="pulse"
                  size={18}
                  color={isDarkMode ? "#4DD6C7" : "#2563EB"}
                />
              </View>
              <View>
                <ThemedText
                  className={`text-sm font-black ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Your Cricket Pulse
                </ThemedText>
                <ThemedText className="text-[11px] text-[#4DD6C7] font-semibold">
                  Personal Career & Live Action
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.LoginScreen)}
              className="px-3 py-1.5 rounded-xl bg-[#4DD6C7] shadow-sm shadow-[#4DD6C7]/30"
              activeOpacity={0.8}
            >
              <ThemedText className="text-xs font-black text-slate-950">
                Sign In
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText
            className={`text-xs mt-2.5 leading-relaxed ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Track your personal runs, wickets, MVP awards, and get notified
            whenever your team steps onto the field.
          </ThemedText>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="mb-4">
      {/* Container Card */}
      <LinearGradient
        colors={
          isDarkMode
            ? ["#111A2E", "#0D1526", "#0A0F1D"]
            : ["#FFFFFF", "#F8FAFC", "#F1F5F9"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className={`rounded-2xl p-4 border ${
          isDarkMode
            ? "border-slate-800/90 shadow-lg shadow-black/50"
            : "border-slate-200/90 shadow-sm"
        }`}
      >
        {/* Header Strip */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View
              className={`w-8 h-8 rounded-xl items-center justify-center mr-2 ${
                isDarkMode ? "bg-[#4DD6C7]/15 border border-[#4DD6C7]/30" : "bg-teal-50"
              }`}
            >
              <Ionicons
                name="pulse"
                size={16}
                color={isDarkMode ? "#4DD6C7" : "#0D9488"}
              />
            </View>
            <View>
              <ThemedText
                className={`text-sm font-black ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                Your Cricket Pulse
              </ThemedText>
              <ThemedText className="text-[10px] text-[#4DD6C7] font-semibold tracking-wide">
                SEASON ACTIVITY
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(SCREENS.PlayerProfile, {
                player: authUser,
                playerId: userId,
              })
            }
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <ThemedText className="text-xs font-bold text-[#4DD6C7] mr-0.5">
              Career Profile
            </ThemedText>
            <Ionicons name="chevron-forward" size={14} color="#4DD6C7" />
          </TouchableOpacity>
        </View>

        {/* 1. Next Fixture / Active Match Card */}
        {matchMeta ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              if (matchMeta.isLive) {
                navigation.navigate(SCREENS.MatchScoreCard, {
                  matchId: matchMeta.id,
                  score: pulseMatch,
                });
              } else {
                navigation.navigate(SCREENS.MatchScoreCard, {
                  matchId: matchMeta.id,
                  score: pulseMatch,
                });
              }
            }}
            className={`rounded-xl p-3.5 mb-3 border ${
              matchMeta.isLive
                ? isDarkMode
                  ? "bg-emerald-950/30 border-emerald-500/40"
                  : "bg-emerald-50 border-emerald-200"
                : isDarkMode
                ? "bg-slate-800/60 border-slate-700/60"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                {matchMeta.isLive ? (
                  <View className="flex-row items-center px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 mr-2">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                    <ThemedText className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      LIVE NOW
                    </ThemedText>
                  </View>
                ) : matchMeta.isCompleted ? (
                  <View className="flex-row items-center px-2 py-0.5 rounded-full bg-slate-700/40 border border-slate-600/40 mr-2">
                    <ThemedText className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                      Recent Result
                    </ThemedText>
                  </View>
                ) : (
                  <View className="flex-row items-center px-2 py-0.5 rounded-full bg-[#4DD6C7]/15 border border-[#4DD6C7]/40 mr-2">
                    <Ionicons
                      name="time-outline"
                      size={11}
                      color="#4DD6C7"
                      style={{ marginRight: 3 }}
                    />
                    <ThemedText className="text-[10px] font-bold text-[#8CE9DD] uppercase tracking-wider">
                      Next Fixture
                    </ThemedText>
                  </View>
                )}
                <ThemedText
                  className={`text-[11px] font-medium ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                  numberOfLines={1}
                >
                  {matchMeta.dateFormatted}
                </ThemedText>
              </View>

              <Ionicons
                name="chevron-forward"
                size={14}
                color={isDarkMode ? "#94A3B8" : "#64748B"}
              />
            </View>

            {/* Teams Matchup */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-2">
                <ThemedText
                  className={`text-sm font-bold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                  numberOfLines={1}
                >
                  {matchMeta.team1} vs {matchMeta.team2}
                </ThemedText>
                <View className="flex-row items-center mt-0.5">
                  <Ionicons
                    name="location-sharp"
                    size={11}
                    color="#F59E0B"
                    style={{ marginRight: 3 }}
                  />
                  <ThemedText
                    className={`text-[11px] ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                    numberOfLines={1}
                  >
                    {matchMeta.venue}
                  </ThemedText>
                </View>
              </View>

              <View
                className={`px-3 py-1.5 rounded-lg flex-row items-center ${
                  matchMeta.isLive
                    ? "bg-emerald-500"
                    : isDarkMode
                    ? "bg-slate-700/80 border border-slate-600/50"
                    : "bg-slate-200"
                }`}
              >
                <ThemedText
                  className={`text-[11px] font-bold ${
                    matchMeta.isLive
                      ? "text-slate-950"
                      : isDarkMode
                      ? "text-slate-200"
                      : "text-slate-800"
                  }`}
                >
                  {matchMeta.isLive
                    ? "Live Center"
                    : matchMeta.isCompleted
                    ? "Scorecard"
                    : "Match Hub"}
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate(SCREENS.CreateMatch)}
            className={`rounded-xl p-3.5 mb-3 border flex-row items-center justify-between ${
              isDarkMode
                ? "bg-slate-800/40 border-slate-700/50"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className={`w-9 h-9 rounded-xl items-center justify-center mr-2.5 ${
                  isDarkMode ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50"
                }`}
              >
                <Ionicons name="trophy-outline" size={18} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <ThemedText
                  className={`text-xs font-bold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Ready for today's match?
                </ThemedText>
                <ThemedText
                  className={`text-[11px] ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Start a match or challenge nearby teams
                </ThemedText>
              </View>
            </View>

            <View className="px-3 py-1.5 rounded-lg bg-[#4DD6C7]/15 border border-[#4DD6C7]/40 flex-row items-center">
              <Ionicons
                name="add-circle"
                size={13}
                color="#4DD6C7"
                style={{ marginRight: 3 }}
              />
              <ThemedText className="text-[11px] font-bold text-[#8CE9DD]">
                Play
              </ThemedText>
            </View>
          </TouchableOpacity>
        )}

        {/* 2. Quick Career Stats Strip */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() =>
            navigation.navigate(SCREENS.PlayerProfile, {
              player: authUser,
              playerId: userId,
            })
          }
          className="flex-row items-center justify-between pt-1"
        >
          {/* Stat 1: Runs */}
          <View
            className={`flex-1 py-2 px-1 rounded-xl items-center mr-1.5 border ${
              isDarkMode
                ? "bg-slate-800/50 border-white/5"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <View className="flex-row items-center mb-0.5">
              <MaterialCommunityIcons
                name="cricket"
                size={12}
                color={isDarkMode ? "#4DD6C7" : "#0D9488"}
                style={{ marginRight: 2 }}
              />
              <ThemedText
                className={`text-[10px] font-semibold ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                RUNS
              </ThemedText>
            </View>
            <ThemedText
              className={`text-sm font-black ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {careerStats.runs}
            </ThemedText>
          </View>

          {/* Stat 2: Wickets */}
          <View
            className={`flex-1 py-2 px-1 rounded-xl items-center mr-1.5 border ${
              isDarkMode
                ? "bg-slate-800/50 border-white/5"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <View className="flex-row items-center mb-0.5">
              <Ionicons
                name="baseball-outline"
                size={11}
                color="#F59E0B"
                style={{ marginRight: 2 }}
              />
              <ThemedText
                className={`text-[10px] font-semibold ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                WKTS
              </ThemedText>
            </View>
            <ThemedText
              className={`text-sm font-black ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {careerStats.wickets}
            </ThemedText>
          </View>

          {/* Stat 3: Matches */}
          <View
            className={`flex-1 py-2 px-1 rounded-xl items-center mr-1.5 border ${
              isDarkMode
                ? "bg-slate-800/50 border-white/5"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <View className="flex-row items-center mb-0.5">
              <Ionicons
                name="trophy-outline"
                size={11}
                color="#34D399"
                style={{ marginRight: 2 }}
              />
              <ThemedText
                className={`text-[10px] font-semibold ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                MATCHES
              </ThemedText>
            </View>
            <ThemedText
              className={`text-sm font-black ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {careerStats.matches}
            </ThemedText>
          </View>

          {/* Stat 4: Highest / SR */}
          <View
            className={`flex-1 py-2 px-1 rounded-xl items-center border ${
              isDarkMode
                ? "bg-slate-800/50 border-white/5"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <View className="flex-row items-center mb-0.5">
              <Ionicons
                name="flash-outline"
                size={11}
                color="#60A5FA"
                style={{ marginRight: 2 }}
              />
              <ThemedText
                className={`text-[10px] font-semibold ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                BEST
              </ThemedText>
            </View>
            <ThemedText
              className={`text-sm font-black ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {careerStats.highest > 0
                ? careerStats.highest
                : careerStats.strikeRate !== "0.0"
                ? careerStats.strikeRate
                : "-"}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

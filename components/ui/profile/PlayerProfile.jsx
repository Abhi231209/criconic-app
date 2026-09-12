import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard from "@/components/ui/ScoreCard";
import SwipeableTabs from "../custom/SwipeableTab";
import SCREENS from "@/screens";
import { useSelector } from "react-redux";
import request, { matchesApi, userApi } from "@/utils/api";
import PlayerAvatar from "@/components/ui/custom/PlayerAvatar";

export default function PlayerProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState("overview");
  const [activeStatsTab, setActiveStatsTab] = useState("batting");
  const [activeBallType, setActiveBallType] = useState("all");
  const [expandedSections, setExpandedSections] = useState({
    batting: false,
    bowling: false,
    achievements: false
  });

  const routePlayer = route?.params?.player;
  const routePlayerId = route?.params?.playerId || routePlayer?.id || routePlayer?._id || routePlayer?.playerId || routePlayer?.userId;
  const authUser = useSelector((state) => state?.auth?.user);
  const [fetchedPlayer, setFetchedPlayer] = useState(null);
  const [userStats, setUserStats] = useState(null);

  const [playerMatches, setPlayerMatches] = useState([]);
  const [detailedMatchesMap, setDetailedMatchesMap] = useState({});
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Sanitize routePlayer to strip transient scorecard single-match values so they do not pollute career stats
  const sanitizedRoutePlayer = React.useMemo(() => {
    if (!routePlayer || typeof routePlayer !== "object") return {};
    const {
      runs,
      balls,
      ballsFaced,
      ball,
      ballsPlayed,
      fours,
      sixes,
      sr,
      over,
      overs,
      maiden,
      maidens,
      wickets,
      wicketsTaken,
      runsGiven,
      runsConceded,
      concededRuns,
      eco,
      economy,
      dots,
      dotBalls,
      outStatus,
      dismissal,
      dismissalInfo,
      howOut,
      isOut,
      notOut,
      didBat,
      didBowl,
      currentBowler,
      currentBatsman,
      ...cleanPlayer
    } = routePlayer;
    return cleanPlayer;
  }, [routePlayer]);

  const targetId = routePlayerId || (authUser?._id || authUser?.id);

  useEffect(() => {
    let isMounted = true;
    if (!targetId || String(targetId) === "1") return;

    // 1. Fetch Profile
    const fetchProfile = async () => {
      try {
        let user = null;
        const res = await userApi.getProfile(targetId).catch(() => null);
        user = res?.data?.data || res?.data?.user || res?.data;

        if (!user || (!user._id && !user.id && !user.username)) {
          const fbRes = await request(`api/users/profile/${targetId}`, { method: "GET", errorAlert: false }).catch(() => null);
          user = fbRes?.data?.data || fbRes?.data?.user || fbRes?.data;
        }

        if ((!user || (!user._id && !user.username)) && (!routePlayerId || String(targetId) === String(authUser?._id || authUser?.id))) {
          const authRes = await request("api/auth/status", { method: "GET", errorAlert: false }).catch(() => null);
          user = authRes?.data?.user;
        }

        if (isMounted && user && typeof user === "object") {
          setFetchedPlayer(user);
        }
      } catch (err) {
        console.log("[PlayerProfile] Profile fetch error:", err);
      }
    };
    fetchProfile();

    // 2. Fetch User Stats if available
    request(`api/users/getUserStat/${targetId}`, { method: "GET", errorAlert: false })
      .then((res) => {
        if (!isMounted) return;
        const statsObj = res?.data?.stats || res?.data?.data || res?.data;
        if (statsObj && typeof statsObj === "object") {
          setUserStats(statsObj);
        }
      })
      .catch(() => {});

    // 3. Fetch Player Matches
    setLoadingMatches(true);
    const fetchMatches = async () => {
      try {
        const promises = [
          request(`api/matches/ids?playerId=${targetId}&page=1&items=50`, { method: "GET", errorAlert: false }).catch(() => null),
          matchesApi.getMatches({ playerId: targetId }, { errorAlert: false }).catch(() => null),
          matchesApi.getMatches({ userId: targetId }, { errorAlert: false }).catch(() => null),
        ];

        const [idsRes, matchesRes, userMatchesRes] = await Promise.all(promises);

        const extractMatches = (res) => {
          if (!res) return [];
          if (Array.isArray(res)) return res;
          if (Array.isArray(res?.data?.content)) return res.data.content;
          if (Array.isArray(res?.content)) return res.content;
          if (Array.isArray(res?.data?.matches)) return res.data.matches;
          if (Array.isArray(res?.data?.data)) return res.data.data;
          if (Array.isArray(res?.data)) return res.data;
          return [];
        };

        const rawList = [
          ...extractMatches(idsRes),
          ...extractMatches(matchesRes),
          ...extractMatches(userMatchesRes),
        ];

        if (route?.params?.match) {
          rawList.unshift(route.params.match);
        } else if (route?.params?.matchId) {
          rawList.unshift(route.params.matchId);
        }

        const matchMap = new Map();
        for (const item of rawList) {
          if (!item) continue;
          const id = typeof item === "string" ? item : (item._id || item.id || item.matchId);
          if (!id) continue;
          const idStr = String(id);
          const existing = matchMap.get(idStr);
          if (!existing || (typeof existing === "string" && typeof item === "object")) {
            matchMap.set(idStr, item);
          }
        }

        const combined = Array.from(matchMap.values());
        if (isMounted) {
          setPlayerMatches(combined);
        }

        // Fetch rich match cards in parallel for up to the first 10 matches
        const idsToFetch = combined
          .map((m) => (typeof m === "string" ? m : (m?._id || m?.id || m?.matchId)))
          .filter(Boolean)
          .slice(0, 10);

        if (idsToFetch.length > 0) {
          Promise.allSettled(
            idsToFetch.map((id) =>
              matchesApi.getMatchById(id, { params: { private: 1 }, errorAlert: false })
            )
          )
            .then((results) => {
              if (!isMounted) return;
              const detailsMap = {};
              results.forEach((r, idx) => {
                if (r.status === "fulfilled" && r.value?.data) {
                  const mData = r.value.data;
                  const mId = mData._id || mData.id || idsToFetch[idx];
                  if (mId) detailsMap[String(mId)] = mData;
                }
              });
              setDetailedMatchesMap((prev) => ({ ...prev, ...detailsMap }));
            })
            .catch(() => {});
        }
      } catch (err) {
        console.log("[PlayerProfile] Matches fetch error:", err);
      } finally {
        if (isMounted) setLoadingMatches(false);
      }
    };

    fetchMatches();

    return () => {
      isMounted = false;
    };
  }, [targetId, routePlayerId, authUser?._id, authUser?.id, route?.params?.matchId]);

  const target = {
    ...(sanitizedRoutePlayer || {}),
    ...(fetchedPlayer || (routePlayerId ? null : authUser) || {}),
  };
  const isSelf = Boolean(
    authUser &&
    (String(target?._id || target?.id) === String(authUser?._id || authUser?.id) || (!routePlayer && !routePlayerId))
  );

  const bStats = target?.stats?.batting || target?.battingStats || userStats?.batting || {};
  const bowlStats = target?.stats?.bowling || target?.bowlingStats || userStats?.bowling || {};

  // Aggregate stats across player matches to accurately compute career stats
  const matchDerivedStats = React.useMemo(() => {
    const initStat = () => ({
      matches: 0,
      innings: 0,
      runs: 0,
      average: "0.00",
      strikeRate: "0.00",
      highest: 0,
      centuries: 0,
      fifties: 0,
      fours: 0,
      sixes: 0,
      ballsFaced: 0,
      outs: 0,
      bowlingInnings: 0,
      wickets: 0,
      maidens: 0,
      bowlingBalls: 0,
      concededRuns: 0,
      fourWickets: 0,
      fiveWickets: 0,
      bestWickets: 0,
      bestRuns: 9999,
      bestBowling: "-",
      bowlingAverage: "0.00",
      economy: "0.00",
      bowlingStrikeRate: "0.00",
    });

    const stats = {
      all: initStat(),
      leather: initStat(),
      tennis: initStat(),
    };

    const targetNames = [
      target?.username,
      target?.name,
      target?.playerName,
      sanitizedRoutePlayer?.name,
      sanitizedRoutePlayer?.username,
      routePlayer?.name,
      routePlayer?.username,
      authUser?.username,
      authUser?.name,
    ]
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase());

    const isMatchForPlayer = (p) => {
      if (!p) return false;
      const pId = p.id?._id || p.id?.id || p.id || p._id || p.playerId || p.userId;
      if (pId && targetId && String(pId) === String(targetId)) return true;
      const pName = (p.username || p.name || p.playerName || p.id?.username || p.id?.name || "").toString().trim().toLowerCase();
      if (pName && targetNames.includes(pName)) return true;
      return false;
    };

    const parseBalls = (ov, b) => {
      if (typeof b === "number" && b > 0) return b;
      if (!ov) return 0;
      const parts = String(ov).split(".");
      return (parseInt(parts[0], 10) || 0) * 6 + (parseInt(parts[1], 10) || 0);
    };

    const allMatches = [];
    const seenMatchIds = new Set();

    const addMatchObj = (m) => {
      if (!m || typeof m !== "object") return;
      const id = String(m._id || m.id || m.matchId || "");
      if (id && seenMatchIds.has(id)) return;
      if (id) seenMatchIds.add(id);
      allMatches.push(m);
    };

    if (route?.params?.match) addMatchObj(route.params.match);
    if (route?.params?.score) addMatchObj(route.params.score);

    playerMatches.forEach((m) => {
      if (typeof m === "object") {
        addMatchObj(m);
      } else if (typeof m === "string" && detailedMatchesMap[m]) {
        addMatchObj(detailedMatchesMap[m]);
      }
    });

    Object.values(detailedMatchesMap).forEach(addMatchObj);

    for (const m of allMatches) {
      const rawBallType = (m.ballType || m.score?.ballType || m.ball_type || "").toString().trim().toLowerCase();
      const ballTypeKey = rawBallType.includes("leather") ? "leather" : "tennis";

      let playerInMatch = false;
      let playerBattedInMatch = false;
      let matchBatRuns = 0;
      let matchBalls = 0;
      let matchFours = 0;
      let matchSixes = 0;
      let matchWasOut = false;

      let playerBowledInMatch = false;
      let matchWickets = 0;
      let matchMaidens = 0;
      let matchBowlingBalls = 0;
      let matchConceded = 0;

      const innings = [
        ...(Array.isArray(m.inning) ? m.inning : []),
        ...(Array.isArray(m.score?.inning) ? m.score.inning : []),
        ...(Array.isArray(m.innings) ? m.innings : []),
      ];
      if (m.innings_1 || m.score?.innings_1) innings.push(m.innings_1 || m.score.innings_1);
      if (m.innings_2 || m.score?.innings_2) innings.push(m.innings_2 || m.score.innings_2);

      const squadPlayers = [
        ...(m.teams?.[0]?.players || []),
        ...(m.teams?.[1]?.players || []),
        ...(m.teamA?.players || []),
        ...(m.teamB?.players || []),
      ];
      if (squadPlayers.some(isMatchForPlayer)) {
        playerInMatch = true;
      }

      for (const inn of innings) {
        if (!inn) continue;

        const batsmen = [
          ...(Array.isArray(inn.playedBatsman) ? inn.playedBatsman : []),
          ...(Array.isArray(inn.batsman) ? inn.batsman : []),
          ...(Array.isArray(inn.batting?.batsmen) ? inn.batting.batsmen : []),
          ...(Array.isArray(inn.outBatsman) ? inn.outBatsman : []),
        ];
        const batRec = batsmen.find(isMatchForPlayer);
        if (batRec) {
          playerInMatch = true;
          playerBattedInMatch = true;
          const r = Number(batRec.runs ?? batRec.score ?? 0);
          const b = Number(batRec.ballsFaced ?? batRec.balls ?? batRec.ball ?? batRec.ballsPlayed ?? 0);
          const f = Number(batRec.fours ?? batRec.four ?? 0);
          const s = Number(batRec.sixes ?? batRec.six ?? 0);
          const out = batRec.isOut ?? (batRec.notOut !== undefined ? !batRec.notOut : Boolean(batRec.dismissal || batRec.howOut));
          matchBatRuns += r;
          matchBalls += b;
          matchFours += f;
          matchSixes += s;
          if (out) matchWasOut = true;
        }

        const bowlers = [
          ...(Array.isArray(inn.bowling?.allBowlers) ? inn.bowling.allBowlers : []),
          ...(Array.isArray(inn.bowling?.bowlers) ? inn.bowling.bowlers : []),
          ...(Array.isArray(inn.bowlers) ? inn.bowlers : []),
          ...(Array.isArray(inn.bowling?.lastTwoBowlers) ? inn.bowling.lastTwoBowlers : []),
          ...(inn.bowler ? [inn.bowler] : []),
        ];
        const bowlRec = bowlers.find(isMatchForPlayer);
        if (bowlRec) {
          playerInMatch = true;
          playerBowledInMatch = true;
          const w = Number(bowlRec.wicketsTaken ?? bowlRec.wickets ?? bowlRec.wicket ?? 0);
          const md = Number(bowlRec.maiden ?? bowlRec.maidens ?? 0);
          const c = Number(bowlRec.runsGiven ?? bowlRec.runsConceded ?? bowlRec.concededRuns ?? bowlRec.runs ?? 0);
          const b = parseBalls(bowlRec.over ?? bowlRec.overs, bowlRec.balls);
          matchWickets += w;
          matchMaidens += md;
          matchConceded += c;
          matchBowlingBalls += b;
        }
      }

      if (!playerBattedInMatch) {
        const topBatsmen = [
          ...(Array.isArray(m.batsman) ? m.batsman : []),
          ...(Array.isArray(m.score?.batsman) ? m.score.batsman : []),
        ];
        const topBat = topBatsmen.find(isMatchForPlayer);
        if (topBat) {
          playerInMatch = true;
          playerBattedInMatch = true;
          matchBatRuns = Number(topBat.runs ?? topBat.score ?? 0);
          matchBalls = Number(topBat.ballsFaced ?? topBat.balls ?? 0);
          matchFours = Number(topBat.fours ?? 0);
          matchSixes = Number(topBat.sixes ?? 0);
        }
      }

      if (!playerBowledInMatch) {
        const topBowlers = [
          ...(m.bowler ? [m.bowler] : []),
          ...(m.score?.bowler ? [m.score.bowler] : []),
          ...(Array.isArray(m.bowlers) ? m.bowlers : []),
          ...(Array.isArray(m.score?.bowlers) ? m.score.bowlers : []),
        ];
        const topBowl = topBowlers.find(isMatchForPlayer);
        if (topBowl) {
          playerInMatch = true;
          playerBowledInMatch = true;
          matchWickets = Number(topBowl.wicketsTaken ?? topBowl.wickets ?? 0);
          matchMaidens = Number(topBowl.maiden ?? topBowl.maidens ?? 0);
          matchConceded = Number(topBowl.runsGiven ?? topBowl.runs ?? 0);
          matchBowlingBalls = parseBalls(topBowl.over ?? topBowl.overs, topBowl.balls);
        }
      }

      const targets = [stats.all, stats[ballTypeKey]];
      for (const st of targets) {
        if (playerInMatch) st.matches += 1;
        if (playerBattedInMatch) {
          st.innings += 1;
          st.runs += matchBatRuns;
          st.ballsFaced += matchBalls;
          st.fours += matchFours;
          st.sixes += matchSixes;
          if (matchWasOut) st.outs += 1;
          if (matchBatRuns > st.highest) st.highest = matchBatRuns;
          if (matchBatRuns >= 100) st.centuries += 1;
          else if (matchBatRuns >= 50) st.fifties += 1;
        }
        if (playerBowledInMatch) {
          st.bowlingInnings += 1;
          st.wickets += matchWickets;
          st.maidens += matchMaidens;
          st.bowlingBalls += matchBowlingBalls;
          st.concededRuns += matchConceded;
          if (matchWickets >= 5) st.fiveWickets += 1;
          else if (matchWickets >= 4) st.fourWickets += 1;

          if (
            matchWickets > st.bestWickets ||
            (matchWickets === st.bestWickets && matchConceded < st.bestRuns && matchWickets > 0)
          ) {
            st.bestWickets = matchWickets;
            st.bestRuns = matchConceded;
            st.bestBowling = `${matchWickets}/${matchConceded}`;
          }
        }
      }
    }

    for (const key of ["all", "leather", "tennis"]) {
      const st = stats[key];
      const outs = Math.max(1, st.outs);
      st.average = st.innings > 0 ? (st.runs / outs).toFixed(2) : "0.00";
      st.strikeRate = st.ballsFaced > 0 ? ((st.runs / st.ballsFaced) * 100).toFixed(1) : "0.00";
      st.bowlingAverage = st.wickets > 0 ? (st.concededRuns / st.wickets).toFixed(2) : "0.00";
      st.economy = st.bowlingBalls > 0 ? ((st.concededRuns / st.bowlingBalls) * 6).toFixed(2) : "0.00";
      st.bowlingStrikeRate = st.wickets > 0 ? (st.bowlingBalls / st.wickets).toFixed(1) : "0.00";
      if (st.bestBowling === "-" && st.wickets > 0) {
        st.bestBowling = `${st.bestWickets}/${st.bestRuns}`;
      }
    }

    return stats;
  }, [
    targetId,
    detailedMatchesMap,
    playerMatches,
    target?.username,
    target?.name,
    target?.playerName,
    sanitizedRoutePlayer?.name,
    sanitizedRoutePlayer?.username,
    routePlayer?.name,
    routePlayer?.username,
    authUser?.username,
    authUser?.name,
    route?.params?.match,
    route?.params?.score,
  ]);

  const getBattingStatsForType = (type) => {
    const derived = matchDerivedStats[type] || matchDerivedStats.all;
    if (type === "all") {
      const hasBackend = Number(bStats.matches || bStats.runs || 0) > 0;
      return {
        matches: hasBackend ? (bStats.matches ?? derived.matches) : derived.matches,
        innings: hasBackend ? (bStats.innings ?? bStats.matches ?? derived.innings) : derived.innings,
        runs: hasBackend ? (bStats.runs ?? derived.runs) : derived.runs,
        average: hasBackend ? (bStats.avg ?? derived.average) : derived.average,
        strikeRate: hasBackend ? (bStats.strikeRate ?? derived.strikeRate) : derived.strikeRate,
        highest: hasBackend ? (bStats.highestScore ?? derived.highest) : derived.highest,
        centuries: hasBackend ? (bStats._100s ?? derived.centuries) : derived.centuries,
        fifties: hasBackend ? (bStats._50s ?? derived.fifties) : derived.fifties,
        fours: hasBackend ? (bStats.fours ?? derived.fours) : derived.fours,
        sixes: hasBackend ? (bStats.six ?? derived.sixes) : derived.sixes,
      };
    }
    const backendType = bStats[type] || userStats?.[type]?.batting;
    const hasBackend = Number(backendType?.matches || backendType?.runs || 0) > 0;
    return {
      matches: hasBackend ? (backendType.matches ?? derived.matches) : derived.matches,
      innings: hasBackend ? (backendType.innings ?? derived.innings) : derived.innings,
      runs: hasBackend ? (backendType.runs ?? derived.runs) : derived.runs,
      average: hasBackend ? (backendType.avg ?? derived.average) : derived.average,
      strikeRate: hasBackend ? (backendType.strikeRate ?? derived.strikeRate) : derived.strikeRate,
      highest: hasBackend ? (backendType.highestScore ?? derived.highest) : derived.highest,
      centuries: hasBackend ? (backendType._100s ?? derived.centuries) : derived.centuries,
      fifties: hasBackend ? (backendType._50s ?? derived.fifties) : derived.fifties,
      fours: hasBackend ? (backendType.fours ?? derived.fours) : derived.fours,
      sixes: hasBackend ? (backendType.six ?? derived.sixes) : derived.sixes,
    };
  };

  const getBowlingStatsForType = (type) => {
    const derived = matchDerivedStats[type] || matchDerivedStats.all;
    if (type === "all") {
      const hasBackend = Number(bowlStats.matches || bowlStats.wickets || 0) > 0;
      return {
        matches: hasBackend ? (bowlStats.matches ?? derived.matches) : derived.matches,
        innings: hasBackend ? (bowlStats.innings ?? derived.bowlingInnings) : derived.bowlingInnings,
        wickets: hasBackend ? (bowlStats.wickets ?? derived.wickets) : derived.wickets,
        average: hasBackend ? (bowlStats.avg ?? derived.bowlingAverage) : derived.bowlingAverage,
        economy: hasBackend ? (bowlStats.eco ?? derived.economy) : derived.economy,
        bestBowling: hasBackend ? (bowlStats.bestBowling ?? derived.bestBowling) : derived.bestBowling,
        strikeRate: hasBackend ? (bowlStats.strikeRate ?? derived.bowlingStrikeRate) : derived.bowlingStrikeRate,
        maidens: hasBackend ? (bowlStats.maidens ?? derived.maidens) : derived.maidens,
        fourWickets: hasBackend ? (bowlStats.fourWickets ?? derived.fourWickets) : derived.fourWickets,
        fiveWickets: hasBackend ? (bowlStats.fiveWickets ?? derived.fiveWickets) : derived.fiveWickets,
      };
    }
    const backendType = bowlStats[type] || userStats?.[type]?.bowling;
    const hasBackend = Number(backendType?.matches || backendType?.wickets || 0) > 0;
    return {
      matches: hasBackend ? (backendType.matches ?? derived.matches) : derived.matches,
      innings: hasBackend ? (backendType.innings ?? derived.bowlingInnings) : derived.bowlingInnings,
      wickets: hasBackend ? (backendType.wickets ?? derived.wickets) : derived.wickets,
      average: hasBackend ? (backendType.avg ?? derived.bowlingAverage) : derived.bowlingAverage,
      economy: hasBackend ? (backendType.eco ?? derived.economy) : derived.economy,
      bestBowling: hasBackend ? (backendType.bestBowling ?? derived.bestBowling) : derived.bestBowling,
      strikeRate: hasBackend ? (backendType.strikeRate ?? derived.bowlingStrikeRate) : derived.bowlingStrikeRate,
      maidens: hasBackend ? (backendType.maidens ?? derived.maidens) : derived.maidens,
      fourWickets: hasBackend ? (backendType.fourWickets ?? derived.fourWickets) : derived.fourWickets,
      fiveWickets: hasBackend ? (backendType.fiveWickets ?? derived.fiveWickets) : derived.fiveWickets,
    };
  };

  const battingStats = {
    all: getBattingStatsForType("all"),
    leather: getBattingStatsForType("leather"),
    tennis: getBattingStatsForType("tennis"),
  };

  const bowlingStats = {
    all: getBowlingStatsForType("all"),
    leather: getBowlingStatsForType("leather"),
    tennis: getBowlingStatsForType("tennis"),
  };

  // Dynamic player data derived from fetched data, sanitized route params, or match derived stats
  const player = {
    id: target?._id || target?.id || target?.playerId || routePlayerId || authUser?._id || authUser?.id || "1",
    name: target?.username || target?.name || target?.playerName || sanitizedRoutePlayer?.name || sanitizedRoutePlayer?.username || (isSelf ? authUser?.username : "Player"),
    shortName: target?.shortName || target?.username || target?.name || sanitizedRoutePlayer?.name || (isSelf ? authUser?.username : "Player"),
    team: target?.teams?.[0]?.title || target?.teams?.[0]?.name || target?.team || target?.teamName || sanitizedRoutePlayer?.team || "Unassigned",
    nationality: target?.nationality || target?.location || "India",
    age: target?.age || "-",
    role: target?.role && typeof target.role === "string" ? target.role : (isSelf && typeof authUser?.role === "string" ? authUser.role : (sanitizedRoutePlayer?.role || "Player")),
    battingStyle: target?.battingStyle || target?.batStyle || sanitizedRoutePlayer?.battingStyle || "Right Handed",
    bowlingStyle: target?.bowlingStyle || target?.ballStyle || sanitizedRoutePlayer?.bowlingStyle || "Right Arm Medium",
    photo: target?.profileImg || target?.profileImage || target?.photo || target?.image || target?.avatar || sanitizedRoutePlayer?.profileImg || sanitizedRoutePlayer?.image || (isSelf ? authUser?.profileImage || authUser?.profileImg : null),
    debut: target?.debut || "-",
    matches: battingStats.all.matches || bowlingStats.all.matches || 0,
    runs: battingStats.all.runs,
    wickets: bowlingStats.all.wickets,
    highestScore: battingStats.all.highest,
    bestBowling: bowlingStats.all.bestBowling,
    average: battingStats.all.average,
    strikeRate: battingStats.all.strikeRate,
    economy: bowlingStats.all.economy,
  };

  const teams = React.useMemo(() => {
    const list = (Array.isArray(fetchedPlayer?.teams) && fetchedPlayer.teams.length > 0
      ? fetchedPlayer.teams
      : Array.isArray(target?.teams) ? target.teams : []
    ).map((t, idx) => ({
      id: t?._id || t?.id || t?.teamId?._id || String(idx),
      name: t?.title || t?.name || t?.teamId?.title || "Team",
      shortName: t?.shortName || t?.teamId?.shortName || "",
      seasons: t?.seasons || "Current",
      matches: t?.matches || 0,
      runs: t?.runs || 0,
      wickets: t?.wickets || 0,
      role: t?.role || "Player",
    }));

    // If no teams registered in profile, extract teams from player's matches
    if (list.length === 0) {
      const seenTeamNames = new Set();
      const targetNames = [player.name, target?.username, target?.name].filter(Boolean).map(n => n.toLowerCase());
      const isPlayerMatch = (p) => {
        if (!p) return false;
        const pId = p.id?._id || p.id?.id || p.id || p._id || p.playerId;
        if (pId && targetId && String(pId) === String(targetId)) return true;
        const pName = (p.username || p.name || "").toLowerCase();
        return pName && targetNames.includes(pName);
      };

      const scanTeam = (teamObj) => {
        if (!teamObj) return;
        const tName = teamObj.title || teamObj.name || teamObj.teamName;
        if (!tName || seenTeamNames.has(tName)) return;
        seenTeamNames.add(tName);
        list.push({
          id: teamObj._id || teamObj.id || tName,
          name: tName,
          shortName: teamObj.shortName || "",
          seasons: "Current",
          matches: battingStats.all.matches || 1,
          runs: battingStats.all.runs || 0,
          wickets: bowlingStats.all.wickets || 0,
          role: player.role || "Player",
        });
      };

      playerMatches.forEach((m) => {
        if (typeof m === "object") {
          if (m.teams?.[0]?.players?.some(isPlayerMatch)) scanTeam(m.teams[0]);
          else if (m.teams?.[1]?.players?.some(isPlayerMatch)) scanTeam(m.teams[1]);
          else if (m.teamA?.players?.some(isPlayerMatch)) scanTeam(m.teamA);
          else if (m.teamB?.players?.some(isPlayerMatch)) scanTeam(m.teamB);
        }
      });
      if (list.length === 0 && player.team && player.team !== "Unassigned") {
        list.push({
          id: "curr",
          name: player.team,
          shortName: "",
          seasons: "Current",
          matches: battingStats.all.matches || 0,
          runs: battingStats.all.runs || 0,
          wickets: bowlingStats.all.wickets || 0,
          role: player.role || "Player",
        });
      }
    }
    return list;
  }, [fetchedPlayer?.teams, target?.teams, playerMatches, player.name, player.team, battingStats.all, bowlingStats.all, targetId]);

  const liveMatches = [];
  const recentMatches = [];
  const achievements = React.useMemo(() => {
    const list = [];
    if (battingStats.all.centuries > 0) {
      list.push({
        id: "century",
        title: `${battingStats.all.centuries} Century Club`,
        tournament: "Career Milestones",
        description: `Scored ${battingStats.all.centuries} century(ies) with a career high score of ${battingStats.all.highest}`,
      });
    }
    if (battingStats.all.fifties > 0) {
      list.push({
        id: "fifty",
        title: `${battingStats.all.fifties} Half-Century Milestones`,
        tournament: "Career Milestones",
        description: `Scored ${battingStats.all.fifties} fifty(ies) across career matches`,
      });
    }
    if (bowlingStats.all.fiveWickets > 0) {
      list.push({
        id: "5w",
        title: "5-Wicket Haul",
        tournament: "Career Milestones",
        description: `Took 5 or more wickets in an innings with best figures of ${bowlingStats.all.bestBowling}`,
      });
    } else if (bowlingStats.all.fourWickets > 0) {
      list.push({
        id: "4w",
        title: "4-Wicket Haul",
        tournament: "Career Milestones",
        description: `Took 4 wickets in an innings with best figures of ${bowlingStats.all.bestBowling}`,
      });
    }
    if (battingStats.all.runs >= 100) {
      list.push({
        id: "runs100",
        title: "Century Run Milestone",
        tournament: "Career Milestones",
        description: `Accumulated ${battingStats.all.runs} career runs`,
      });
    }
    if (bowlingStats.all.wickets >= 5) {
      list.push({
        id: "wkt5",
        title: "Wicket-Taker Milestone",
        tournament: "Career Milestones",
        description: `Claimed ${bowlingStats.all.wickets} career wickets`,
      });
    }
    return list;
  }, [battingStats.all, bowlingStats.all]);

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      icon: "person-outline",
    },
    { value: "stats", label: "Stats", icon: "stats-chart-outline" },
    { value: "matches", label: "Matches", icon: "calendar-outline" },
    { value: "teams", label: "Teams", icon: "shirt-outline" },
    { value: "achievements", label: "Achievements", icon: "trophy-outline" },
  ];

  const statsTabs = [
    { value: "batting", label: "Batting", icon: "baseball-outline" },
    { value: "bowling", label: "Bowling", icon: "baseball-outline" },
  ];

  const ballTypeTabs = [
    { value: "all", label: "All", icon: "globe-outline" },
    { value: "leather", label: "Leather", icon: "american-football-outline" },
    { value: "tennis", label: "Tennis", icon: "tennisball-outline" },
  ];

  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  const switchStatsTab = (tabName) => {
    setActiveStatsTab(tabName);
  };

  const switchBallType = (ballType) => {
    setActiveBallType(ballType);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const TabButton = ({ title, tabName, icon }) => (
    <TouchableOpacity
      onPress={() => switchTab(tabName)}
      className={`flex-1 py-3 px-2 items-center rounded-lg mx-1 ${
        activeTab === tabName
          ? "bg-blue-600"
          : isDarkMode
          ? "bg-gray-800"
          : "bg-gray-200"
      }`}
    >
      <Ionicons
        name={icon}
        size={18}
        color={
          activeTab === tabName ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"
        }
      />
      <ThemedText
        className={`text-xs mt-1 font-medium ${
          activeTab === tabName
            ? "text-white"
            : isDarkMode
            ? "text-gray-400"
            : "text-gray-600"
        }`}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );

  const StatsTabButton = ({ title, tabName, icon }) => (
    <TouchableOpacity
      onPress={() => switchStatsTab(tabName)}
      className={`flex-row items-center px-4 py-3 rounded-lg mx-1 ${
        activeStatsTab === tabName
          ? isDarkMode ? "bg-blue-700" : "bg-blue-600"
          : isDarkMode ? "bg-gray-700" : "bg-gray-200"
      }`}
    >
      <Ionicons
        name={icon}
        size={16}
        color={
          activeStatsTab === tabName ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"
        }
        style={{ marginRight: 6 }}
      />
      <ThemedText
        className={`font-medium ${
          activeStatsTab === tabName
            ? "text-white"
            : isDarkMode
            ? "text-gray-400"
            : "text-gray-600"
        }`}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );

  const BallTypeButton = ({ title, ballType, icon }) => (
    <TouchableOpacity
      onPress={() => switchBallType(ballType)}
      className={`flex-row items-center px-3 py-2 rounded-lg mx-1 ${
        activeBallType === ballType
          ? isDarkMode ? "bg-blue-700" : "bg-blue-600"
          : isDarkMode ? "bg-gray-700" : "bg-gray-200"
      }`}
    >
      <Ionicons
        name={icon}
        size={14}
        color={
          activeBallType === ballType ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"
        }
        style={{ marginRight: 4 }}
      />
      <ThemedText
        className={`text-sm ${
          activeBallType === ballType
            ? "text-white"
            : isDarkMode
            ? "text-gray-400"
            : "text-gray-600"
        }`}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );

  const StatRow = ({ label, value }) => (
    <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
      <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
        {label}
      </ThemedText>
      <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
        {value}
      </ThemedText>
    </View>
  );

  const renderOverview = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      {/* Player Info Card */}
      <View
        className={`p-5 rounded-xl mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm`}
      >
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="person-outline" size={20} color="#3B82F6" />
          </View>
          <ThemedText
            className={`text-xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Player Information
          </ThemedText>
        </View>

        <View className="space-y-4">
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Full Name
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.name}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Team
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.team}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Nationality
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.nationality}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Age
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.age}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Role
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.role}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Batting Style
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.battingStyle}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Bowling Style
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.bowlingStyle}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Career Summary */}
      <View
        className={`p-5 rounded-xl mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm`}
      >
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="trending-up-outline" size={20} color="#10B981" />
          </View>
          <ThemedText
            className={`text-xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Career Summary
          </ThemedText>
        </View>

        <View className="space-y-4">
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Debut
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.debut}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Matches
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.matches}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Runs
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.runs}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Wickets
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.wickets}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Highest Score
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.highestScore}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <ThemedText className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Best Bowling
            </ThemedText>
            <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
              {player.bestBowling}
            </ThemedText>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStats = () => (
    <View className="flex-1">
      {/* Stats Tabs */}
      <View className="flex-row justify-center my-4">
        {statsTabs.map((tab) => (
          <StatsTabButton
            key={tab.value}
            title={tab.label}
            tabName={tab.value}
            icon={tab.icon}
          />
        ))}
      </View>

      {/* Ball Type Tabs */}
      <View className="flex-row justify-center mb-4">
        {ballTypeTabs.map((tab) => (
          <BallTypeButton
            key={tab.value}
            title={tab.label}
            ballType={tab.value}
            icon={tab.icon}
          />
        ))}
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      >
        {activeStatsTab === "batting" && (
          <View
            className={`p-5 rounded-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm`}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="baseball-outline" size={20} color="#3B82F6" />
              </View>
              <ThemedText
                className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Batting Statistics
              </ThemedText>
            </View>

            <View className="space-y-4">
              <StatRow label="Matches" value={battingStats[activeBallType].matches} />
              <StatRow label="Innings" value={battingStats[activeBallType].innings} />
              <StatRow label="Runs" value={battingStats[activeBallType].runs} />
              <StatRow label="Average" value={battingStats[activeBallType].average} />
              <StatRow label="Strike Rate" value={battingStats[activeBallType].strikeRate} />
              <StatRow label="Highest Score" value={battingStats[activeBallType].highest} />
              <StatRow label="Centuries" value={battingStats[activeBallType].centuries} />
              <StatRow label="Fifties" value={battingStats[activeBallType].fifties} />
              <StatRow label="Fours" value={battingStats[activeBallType].fours} />
              <StatRow label="Sixes" value={battingStats[activeBallType].sixes} />
            </View>
          </View>
        )}

        {activeStatsTab === "bowling" && (
          <View
            className={`p-5 rounded-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm`}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="baseball-outline" size={20} color="#10B981" />
              </View>
              <ThemedText
                className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Bowling Statistics
              </ThemedText>
            </View>

            <View className="space-y-4">
              <StatRow label="Matches" value={bowlingStats[activeBallType].matches} />
              <StatRow label="Innings" value={bowlingStats[activeBallType].innings} />
              <StatRow label="Wickets" value={bowlingStats[activeBallType].wickets} />
              <StatRow label="Average" value={bowlingStats[activeBallType].average} />
              <StatRow label="Economy" value={bowlingStats[activeBallType].economy} />
              <StatRow label="Best Bowling" value={bowlingStats[activeBallType].bestBowling} />
              <StatRow label="Strike Rate" value={bowlingStats[activeBallType].strikeRate} />
              <StatRow label="Maidens" value={bowlingStats[activeBallType].maidens} />
              <StatRow label="4 Wickets" value={bowlingStats[activeBallType].fourWickets} />
              <StatRow label="5 Wickets" value={bowlingStats[activeBallType].fiveWickets} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderMatches = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      <ThemedText
        className={`text-lg font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Matches
      </ThemedText>

      {loadingMatches ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      ) : playerMatches.length > 0 ? (
        playerMatches.map((m, idx) => {
          const matchId = typeof m === "string" ? m : (m?._id || m?.id || m?.matchId);
          const matchObj = typeof m === "object" ? m : (detailedMatchesMap[String(matchId)] || null);
          return (
            <View key={matchId || idx} className="mb-4">
              <ScoreCard
                matchId={matchId}
                match={matchObj}
                fullWidth={true}
                startDate={matchObj?.startDate || matchObj?.createdAt || m?.startDate || m?.createdAt}
                onPress={() => {
                  navigation.navigate(SCREENS.MatchScoreCard, {
                    matchId: matchId,
                    score: matchObj || null,
                  });
                }}
              />
            </View>
          );
        })
      ) : (
        <View className="items-center justify-center py-12">
          <Ionicons name="calendar-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No match records found
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );

  const renderTeams = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      <ThemedText
        className={`text-lg font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Teams Played For
      </ThemedText>

      {teams.length === 0 ? (
        <View className="items-center justify-center py-12">
          <Ionicons name="shirt-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No team history available
          </ThemedText>
        </View>
      ) : (
        teams.map((team) => (
          <TouchableOpacity
            key={team.id}
            className={`p-4 rounded-xl mb-3 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm`}
            onPress={() => {
              // Navigate to team details
            }}
          >
            <View className="flex-row justify-between items-center mb-2">
              <ThemedText
                className={`text-lg font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {team.name}
              </ThemedText>
              <View className="flex-row items-center">
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </View>
            </View>

            <View className="flex-row justify-between items-center mb-2">
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Seasons
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {team.seasons}
              </ThemedText>
            </View>

            <View className="flex-row justify-between items-center mb-2">
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Matches
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {team.matches}
              </ThemedText>
            </View>

            <View className="flex-row justify-between items-center mb-2">
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Role
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {team.role}
              </ThemedText>
            </View>

            <View className="flex-row justify-between items-center">
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Runs/Wickets
              </ThemedText>
              <ThemedText
                className={`text-sm ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {team.runs} / {team.wickets}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderAchievements = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    >
      <ThemedText
        className={`text-lg font-bold mb-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        Player Achievements
      </ThemedText>

      {achievements.length === 0 ? (
        <View className="items-center justify-center py-12">
          <Ionicons name="trophy-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No achievements recorded
          </ThemedText>
        </View>
      ) : (
        achievements.map((achievement) => (
          <View
            key={achievement.id}
            className={`p-4 rounded-xl mb-3 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm`}
          >
            <View className="flex-row items-start mb-2">
              <View className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mr-3 mt-1">
                <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <ThemedText
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {achievement.title}
                </ThemedText>
                <ThemedText
                  className={`text-sm font-medium mb-1 ${
                    isDarkMode ? "text-yellow-400" : "text-yellow-600"
                  }`}
                >
                  {achievement.tournament}
                </ThemedText>
                <ThemedText
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {achievement.description}
                </ThemedText>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}
    >
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="pt-4 pb-6 px-4"
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full items-center justify-center bg-black/20"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <ThemedText className="text-white text-xl font-bold">
            Player Profile
          </ThemedText>
          {isSelf ? (
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.EditPlayerProfile, { player })}
              className="w-10 h-10 rounded-full items-center justify-center bg-black/20"
            >
              <Ionicons name="create-outline" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10" />
          )}
        </View>

        <View className="flex-row items-center">
          <View className="mr-4">
            <PlayerAvatar
              player={{
                name: player.name,
                username: player.name,
                profileImg: player.photo,
                profileImage: player.photo,
              }}
              size={76}
            />
          </View>
          <View className="flex-1">
            <ThemedText className="text-white text-2xl font-bold" numberOfLines={1}>
              {player.name}
            </ThemedText>
            <ThemedText className="text-blue-100 text-base" numberOfLines={1}>
              {player.shortName}
            </ThemedText>
            <View className="flex-row items-center mt-1">
              <View
                className={`px-2 py-1 rounded-md ${
                  isDarkMode ? "bg-gray-800/50" : "bg-white/20"
                }`}
              >
                <ThemedText className="text-white text-xs">
                  {player.role}
                </ThemedText>
              </View>
              <View
                className={`px-2 py-1 rounded-md ml-2 ${
                  isDarkMode ? "bg-gray-800/50" : "bg-white/20"
                }`}
              >
                <ThemedText className="text-white text-xs">
                  {player.team}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View
        className={`flex-row p-2 ${isDarkMode ? "bg-gray-800" : "bg-gray-200"}`}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.value}
            title={tab.label}
            tabName={tab.value}
            icon={tab.icon}
          />
        ))}
      </View>

      {/* Tab Content */}
      <View className="flex-1 mt-2">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "stats" && renderStats()}
        {activeTab === "matches" && renderMatches()}
        {activeTab === "teams" && renderTeams()}
        {activeTab === "achievements" && renderAchievements()}
      </View>
    </SafeAreaView>
  );
}
import React, { useState, useEffect, useCallback } from "react";
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
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import ScoreCard from "@/components/ui/ScoreCard";
import SCREENS from "@/screens";
import { useSelector } from "react-redux";
import request, { matchesApi, userApi } from "@/utils/api";
import PlayerAvatar from "@/components/ui/custom/PlayerAvatar";

const isCricketRole = (r) => {
  if (!r || typeof r !== "string") return false;
  const clean = r.trim().toLowerCase();
  return [
    "batsman",
    "bowler",
    "all-rounder",
    "all rounder",
    "allrounder",
    "wicket-keeper",
    "wicket keeper",
    "wicketkeeper",
    "wk-batsman",
  ].includes(clean);
};

const normalizeCricketRole = (r) => {
  if (!r || typeof r !== "string") return "Batsman";
  const clean = r.trim().toLowerCase();
  if (clean.includes("wicket") || clean.includes("keeper") || clean.includes("wk")) return "Wicket-keeper";
  if (clean.includes("all")) return "All-rounder";
  if (clean.includes("bowl")) return "Bowler";
  if (clean.includes("bat")) return "Batsman";
  return r;
};

export default function PlayerProfile({ navigation, route = { params: {} } }) {
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

  const candidateNames = React.useMemo(() => {
    return [
      sanitizedRoutePlayer?.name,
      sanitizedRoutePlayer?.username,
      routePlayer?.name,
      routePlayer?.username,
      authUser?.username,
      authUser?.name,
      fetchedPlayer?.username,
      fetchedPlayer?.name,
    ]
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase());
  }, [sanitizedRoutePlayer, routePlayer, authUser, fetchedPlayer]);

  // Helper to ensure a match actually belongs to this player
  const isMatchForPlayer = useCallback(
    (match, pId) => {
      if (!match || !pId) return false;
      if (typeof match === "string") return true; // ID string will be verified when detailed data is fetched
      const pIdStr = String(pId);

      const checkPlayerItem = (p) => {
        if (!p) return false;
        const id = String(
          p?.id?._id || p?.id?.id || p?.id || p?._id || p?.playerId || p?.userId || ""
        );
        if (id && (id === pIdStr || (targetId && id === String(targetId)))) return true;
        const name = String(
          p?.username || p?.name || p?.playerName || p?.id?.username || p?.id?.name || ""
        )
          .trim()
          .toLowerCase();
        if (name && candidateNames.includes(name)) return true;
        return false;
      };

      // 1. Check teams & player rosters
      const teamsToCheck = [
        ...(Array.isArray(match?.teams) ? match.teams : []),
        match?.team1,
        match?.team2,
        match?.teamA,
        match?.teamB,
      ].filter(Boolean);

      for (const team of teamsToCheck) {
        if (Array.isArray(team?.players)) {
          for (const p of team.players) {
            if (checkPlayerItem(p)) return true;
          }
        }
        if (Array.isArray(team?.squad)) {
          for (const p of team.squad) {
            if (checkPlayerItem(p)) return true;
          }
        }
      }

      // 2. Check all innings variations
      const inningsList = [
        ...(Array.isArray(match?.scoreCard) ? match.scoreCard : []),
        ...(Array.isArray(match?.inning) ? match.inning : []),
        ...(Array.isArray(match?.score?.inning) ? match.score.inning : []),
        ...(Array.isArray(match?.innings) ? match.innings : []),
        match?.innings_1,
        match?.innings_2,
        match?.score?.innings_1,
        match?.score?.innings_2,
      ].filter(Boolean);

      for (const inn of inningsList) {
        const batsmen = [
          ...(Array.isArray(inn?.batsman) ? inn.batsman : []),
          ...(Array.isArray(inn?.playedBatsman) ? inn.playedBatsman : []),
          ...(Array.isArray(inn?.batting?.batsmen) ? inn.batting.batsmen : []),
          ...(Array.isArray(inn?.outBatsman) ? inn.outBatsman : []),
        ];
        for (const b of batsmen) {
          if (checkPlayerItem(b)) return true;
        }

        const bowlers = [
          ...(Array.isArray(inn?.bowler) ? inn.bowler : []),
          ...(Array.isArray(inn?.bowling?.allBowlers) ? inn.bowling.allBowlers : []),
          ...(Array.isArray(inn?.bowling?.bowlers) ? inn.bowling.bowlers : []),
          ...(Array.isArray(inn?.bowlers) ? inn.bowlers : []),
          ...(Array.isArray(inn?.bowling?.lastTwoBowlers) ? inn.bowling.lastTwoBowlers : []),
        ];
        for (const bw of bowlers) {
          if (checkPlayerItem(bw)) return true;
        }
      }

      // If match object has no team or scorecard details populated, allow it (from playerId query)
      if (teamsToCheck.length === 0 && inningsList.length === 0) {
        return true;
      }

      return false;
    },
    [targetId, candidateNames]
  );

  // 1. Fetch Profile
  const fetchProfile = useCallback(async () => {
    if (!targetId || String(targetId) === "1") return;
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

      // If user has no teams or unpopulated string team IDs or missing titles, enrich with withTeam endpoint
      if (user && (!Array.isArray(user.teams) || user.teams.length === 0 || typeof user.teams[0] === "string" || (!user.teams[0]?.title && !user.teams[0]?.name))) {
        const withTeamRes = await request(`api/users/withTeam/${targetId}`, { method: "GET", errorAlert: false }).catch(() => null);
        const tList = withTeamRes?.data?.content?.teams || withTeamRes?.data?.teams || withTeamRes?.data?.data?.teams;
        if (Array.isArray(tList) && tList.length > 0) {
          user = { ...user, teams: tList };
        }
      }

      if (user && typeof user === "object") {
        setFetchedPlayer(user);
      }
    } catch (err) {
      console.log("[PlayerProfile] Profile fetch error:", err);
    }
  }, [targetId, routePlayerId, authUser?._id, authUser?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  useEffect(() => {
    let isMounted = true;
    if (!targetId || String(targetId) === "1") return;

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

    // 3. Fetch Player Matches - strictly player-scoped (matching web app apiUrl: api/matches/ids?page=1&items=30&playerId=...)
    setLoadingMatches(true);
    const fetchMatches = async () => {
      try {
        const promises = [
          request(`api/matches/ids?playerId=${targetId}&page=1&items=30`, { method: "GET", errorAlert: false }).catch(() => null),
          matchesApi.getMatches({ playerId: targetId, page: 1, limit: 30 }, { errorAlert: false }).catch(() => null),
        ];

        const [idsRes, matchesRes] = await Promise.all(promises);

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

        const routeMatches = Array.isArray(route?.params?.matches) ? route.params.matches : [];
        const rawList = [
          ...extractMatches(idsRes),
          ...extractMatches(matchesRes),
          ...routeMatches,
        ].filter((m) => isMatchForPlayer(m, targetId));

        // Only include route match if player is confirmed to have played/participated in it
        if (route?.params?.match && isMatchForPlayer(route.params.match, targetId)) {
          rawList.unshift(route.params.match);
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

        // Preload any full match objects already available in combined
        const preloadedDetails = {};
        for (const item of combined) {
          if (item && typeof item === "object") {
            const mId = item._id || item.id || item.matchId;
            if (mId) preloadedDetails[String(mId)] = item;
          }
        }
        if (Object.keys(preloadedDetails).length > 0 && isMounted) {
          setDetailedMatchesMap((prev) => ({ ...prev, ...preloadedDetails }));
        }

        // Fetch rich match cards in parallel for up to the first 10 matches that need fetching
        const idsToFetch = combined
          .filter((m) => typeof m === "string" || !m.teams || !m.teams[0]?.players)
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
                  if (mId && isMatchForPlayer(mData, targetId)) {
                    detailsMap[String(mId)] = mData;
                  }
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
  }, [targetId, routePlayerId, authUser?._id, authUser?.id, route?.params?.matchId, isMatchForPlayer]);

  const isSelf = Boolean(
    authUser &&
    (String(targetId) === String(authUser?._id || authUser?.id) || (!routePlayer && !routePlayerId))
  );

  const target = {
    ...(sanitizedRoutePlayer || {}),
    ...(isSelf ? authUser : {}),
    ...(fetchedPlayer || {}),
  };

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

  const resolveBattingAvg = (rawObj, fallbackAvg) => {
    const runs = Number(rawObj?.runs);
    const innings = Number(rawObj?.innings ?? rawObj?.matches);
    const notOut = Number(rawObj?.notOut || 0);
    if (!isNaN(runs) && !isNaN(innings) && innings > 0) {
      const outs = innings - notOut;
      return outs <= 0 ? (runs > 0 ? runs.toFixed(2) : "0.00") : (runs / outs).toFixed(2);
    }
    return rawObj?.avg ?? fallbackAvg;
  };

  const resolveBowlingAvg = (rawObj, fallbackAvg) => {
    const runs = Number(rawObj?.runsGiven ?? rawObj?.runs);
    const wickets = Number(rawObj?.wickets);
    if (!isNaN(runs) && !isNaN(wickets) && wickets > 0) {
      return (runs / wickets).toFixed(2);
    }
    return rawObj?.avg ?? fallbackAvg;
  };

  const getBattingStatsForType = (type) => {
    const derived = matchDerivedStats[type] || matchDerivedStats.all;
    if (type === "all") {
      const hasBackend = Number(bStats.matches || bStats.runs || 0) > 0;
      return {
        matches: hasBackend ? (bStats.matches ?? derived.matches) : derived.matches,
        innings: hasBackend ? (bStats.innings ?? bStats.matches ?? derived.innings) : derived.innings,
        runs: hasBackend ? (bStats.runs ?? derived.runs) : derived.runs,
        average: hasBackend ? resolveBattingAvg(bStats, derived.average) : derived.average,
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
      average: hasBackend ? resolveBattingAvg(backendType, derived.average) : derived.average,
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
        average: hasBackend ? resolveBowlingAvg(bowlStats, derived.bowlingAverage) : derived.bowlingAverage,
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
      average: hasBackend ? resolveBowlingAvg(backendType, derived.bowlingAverage) : derived.bowlingAverage,
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

  const resolvedRole = (() => {
    // 1. If isSelf, priority to updated authUser if valid cricket role
    if (isSelf) {
      if (isCricketRole(authUser?.role)) return normalizeCricketRole(authUser.role);
      if (isCricketRole(authUser?.playerRole)) return normalizeCricketRole(authUser.playerRole);
      if (isCricketRole(authUser?.playingRole)) return normalizeCricketRole(authUser.playingRole);
    }

    // 2. Fresh fetched profile from server
    if (isCricketRole(fetchedPlayer?.role)) return normalizeCricketRole(fetchedPlayer.role);
    if (isCricketRole(fetchedPlayer?.playerRole)) return normalizeCricketRole(fetchedPlayer.playerRole);
    if (isCricketRole(fetchedPlayer?.playingRole)) return normalizeCricketRole(fetchedPlayer.playingRole);

    // 3. Merged target
    if (isCricketRole(target?.role)) return normalizeCricketRole(target.role);
    if (isCricketRole(target?.playerRole)) return normalizeCricketRole(target.playerRole);
    if (isCricketRole(target?.playingRole)) return normalizeCricketRole(target.playingRole);

    // 4. Initial route player
    if (isCricketRole(sanitizedRoutePlayer?.role)) return normalizeCricketRole(sanitizedRoutePlayer.role);
    if (isCricketRole(sanitizedRoutePlayer?.playerRole)) return normalizeCricketRole(sanitizedRoutePlayer.playerRole);

    // 5. If target has a string role that is not a numeric string or "Player"
    if (target?.role && typeof target.role === "string" && isNaN(Number(target.role)) && target.role.toLowerCase() !== "player") {
      return normalizeCricketRole(target.role);
    }

    return "Batsman";
  })();

  // Dynamic player data derived from fetched data, sanitized route params, or match derived stats
  const player = {
    id: target?._id || target?.id || target?.playerId || routePlayerId || authUser?._id || authUser?.id || "1",
    name: (isSelf ? authUser?.username || authUser?.name : null) || target?.username || target?.name || target?.playerName || sanitizedRoutePlayer?.name || sanitizedRoutePlayer?.username || "Player",
    shortName: (isSelf ? authUser?.shortName : null) || target?.shortName || target?.username || target?.name || sanitizedRoutePlayer?.name || "Player",
    team: target?.teams?.[0]?.title || target?.teams?.[0]?.name || target?.team || target?.teamName || route?.params?.team?.title || route?.params?.team?.name || sanitizedRoutePlayer?.team || "Unassigned",
    nationality: (isSelf ? authUser?.location || authUser?.city || authUser?.nationality : null) || target?.nationality || target?.location || target?.city || "India",
    age: (isSelf && authUser?.age ? String(authUser.age) : null) || (target?.age ? String(target.age) : "-"),
    role: resolvedRole,
    battingStyle: (isSelf ? authUser?.battingStyle || authUser?.batStyle : null) || target?.battingStyle || target?.batStyle || sanitizedRoutePlayer?.battingStyle || "Right Handed",
    bowlingStyle: (isSelf ? authUser?.bowlingStyle || authUser?.ballStyle : null) || target?.bowlingStyle || target?.ballStyle || sanitizedRoutePlayer?.bowlingStyle || "Right Arm Medium",
    photo: (isSelf ? authUser?.profileImage || authUser?.profileImg : null) || target?.profileImg || target?.profileImage || target?.photo || target?.image || target?.avatar || sanitizedRoutePlayer?.profileImg || sanitizedRoutePlayer?.image || null,
    debut: target?.debut || (isSelf ? authUser?.debut : "") || "-",
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
    const rawList = (Array.isArray(fetchedPlayer?.teams) && fetchedPlayer.teams.length > 0
      ? fetchedPlayer.teams
      : Array.isArray(target?.teams) && target.teams.length > 0
      ? target.teams
      : route?.params?.team
      ? [route.params.team]
      : []
    );

    // Build consolidated list of all matches available
    const allMatchesList = [];
    const seenMatchIds = new Set();
    const addMatch = (m) => {
      if (!m || typeof m !== "object") return;
      const mId = String(m._id || m.id || m.matchId || "");
      if (mId && seenMatchIds.has(mId)) return;
      if (mId) seenMatchIds.add(mId);
      allMatchesList.push(m);
    };

    if (route?.params?.match) addMatch(route.params.match);
    if (route?.params?.score) addMatch(route.params.score);
    playerMatches.forEach((m) => {
      if (typeof m === "object") addMatch(m);
      else if (typeof m === "string" && detailedMatchesMap[m]) addMatch(detailedMatchesMap[m]);
    });
    Object.values(detailedMatchesMap || {}).forEach(addMatch);

    const targetNames = [
      player?.name,
      target?.username,
      target?.name,
      target?.playerName,
      sanitizedRoutePlayer?.name,
      sanitizedRoutePlayer?.username,
      authUser?.username,
      authUser?.name,
    ]
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase());

    const isMatchForCurrentPlayer = (p) => {
      if (!p) return false;
      const pId = String(p.id?._id || p.id?.id || p.id || p._id || p.playerId || p.userId || "");
      if (pId && targetId && pId === String(targetId)) return true;
      const pName = (p.username || p.name || p.playerName || p.id?.username || p.id?.name || "").toString().trim().toLowerCase();
      return pName && targetNames.includes(pName);
    };

    // Helper to calculate player's runs and wickets from a match
    const getPlayerStatsFromMatch = (m) => {
      let batRuns = 0;
      let bowlWickets = 0;

      const innings = [
        ...(Array.isArray(m.inning) ? m.inning : []),
        ...(Array.isArray(m.score?.inning) ? m.score.inning : []),
        ...(Array.isArray(m.innings) ? m.innings : []),
        ...(Array.isArray(m.scoreCard) ? m.scoreCard : []),
        ...(Array.isArray(m.score?.scoreCard) ? m.score.scoreCard : []),
      ];
      if (m.innings_1 || m.score?.innings_1) innings.push(m.innings_1 || m.score.innings_1);
      if (m.innings_2 || m.score?.innings_2) innings.push(m.innings_2 || m.score.innings_2);

      innings.forEach((inn) => {
        if (!inn) return;
        const batsmen = [
          ...(Array.isArray(inn.playedBatsman) ? inn.playedBatsman : []),
          ...(Array.isArray(inn.batsman) ? inn.batsman : []),
          ...(Array.isArray(inn.batting?.batsmen) ? inn.batting.batsmen : []),
          ...(Array.isArray(inn.outBatsman) ? inn.outBatsman : []),
        ];
        const batRec = batsmen.find(isMatchForCurrentPlayer);
        if (batRec) {
          batRuns += Number(batRec.runs ?? batRec.score ?? 0);
        }

        const bowlers = [
          ...(Array.isArray(inn.bowling?.allBowlers) ? inn.bowling.allBowlers : []),
          ...(Array.isArray(inn.bowling?.bowlers) ? inn.bowling.bowlers : []),
          ...(Array.isArray(inn.bowlers) ? inn.bowlers : []),
          ...(Array.isArray(inn.bowling?.lastTwoBowlers) ? inn.bowling.lastTwoBowlers : []),
          ...(inn.bowler ? [inn.bowler] : []),
        ];
        const bowlRec = bowlers.find(isMatchForCurrentPlayer);
        if (bowlRec) {
          bowlWickets += Number(bowlRec.wicketsTaken ?? bowlRec.wickets ?? bowlRec.wicket ?? 0);
        }
      });

      if (batRuns === 0) {
        const topBatsmen = [
          ...(Array.isArray(m.batsman) ? m.batsman : []),
          ...(Array.isArray(m.score?.batsman) ? m.score.batsman : []),
        ];
        const topBat = topBatsmen.find(isMatchForCurrentPlayer);
        if (topBat) batRuns = Number(topBat.runs ?? topBat.score ?? 0);
      }

      if (bowlWickets === 0) {
        const topBowlers = [
          ...(m.bowler ? [m.bowler] : []),
          ...(m.score?.bowler ? [m.score.bowler] : []),
          ...(Array.isArray(m.bowlers) ? m.bowlers : []),
          ...(Array.isArray(m.score?.bowlers) ? m.score.bowlers : []),
        ];
        const topBowl = topBowlers.find(isMatchForCurrentPlayer);
        if (topBowl) bowlWickets = Number(topBowl.wicketsTaken ?? topBowl.wickets ?? 0);
      }

      // Check player performance object if present
      const allTeams = [m.teams?.[0], m.teams?.[1], m.teamA, m.teamB].filter(Boolean);
      allTeams.forEach((teamEntry) => {
        const pRec = teamEntry?.players?.find(isMatchForCurrentPlayer);
        if (pRec?.performance?.stats?.batting?.runs != null) {
          batRuns = Math.max(batRuns, Number(pRec.performance.stats.batting.runs || 0));
        }
        if (pRec?.performance?.stats?.bowling?.wickets != null) {
          bowlWickets = Math.max(bowlWickets, Number(pRec.performance.stats.bowling.wickets || 0));
        }
      });

      return { batRuns, bowlWickets };
    };

    // Helper to test if a match involves this team and player played for this team
    const matchBelongsToTeam = (m, teamObj) => {
      const tId = String(teamObj._id || teamObj.id || teamObj.teamId?._id || teamObj.teamId || "").trim();
      const tName = String(teamObj.title || teamObj.name || teamObj.teamName || teamObj.teamId?.title || teamObj.teamId?.name || "").trim().toLowerCase();
      const tShort = String(teamObj.shortName || teamObj.teamId?.shortName || "").trim().toLowerCase();

      const mTeams = [m.teams?.[0], m.teams?.[1], m.teamA, m.teamB].filter(Boolean);
      let matchTeamObj = null;

      for (const mt of mTeams) {
        const mtId = String(mt._id || mt.id || mt.teamId?._id || mt.teamId || "").trim();
        const mtName = String(mt.title || mt.name || mt.teamName || mt.teamId?.title || mt.teamId?.name || "").trim().toLowerCase();
        const mtShort = String(mt.shortName || mt.teamId?.shortName || "").trim().toLowerCase();

        if (
          (tId && mtId && tId === mtId) ||
          (tName && mtName && (tName === mtName || tName.includes(mtName) || mtName.includes(tName))) ||
          (tShort && mtShort && tShort === mtShort)
        ) {
          matchTeamObj = mt;
          break;
        }
      }

      if (!matchTeamObj) return false;

      // Check if player played for this team
      if (matchTeamObj.players?.some(isMatchForCurrentPlayer) || matchTeamObj.squad?.some(isMatchForCurrentPlayer)) {
        return true;
      }

      // If other team exists and contains player, this is NOT the player's team in this match
      const otherTeamObj = mTeams.find((mt) => mt !== matchTeamObj);
      if (otherTeamObj?.players?.some(isMatchForCurrentPlayer) || otherTeamObj?.squad?.some(isMatchForCurrentPlayer)) {
        return false;
      }

      // If player participated anywhere in the match
      return isMatchForPlayer(m, targetId) || isMatchForCurrentPlayer(m);
    };

    const computeTeamDetails = (rawTeam, isOnlyTeam = false) => {
      const teamId = rawTeam?._id || rawTeam?.id || rawTeam?.teamId?._id || rawTeam?.teamId || "1";
      const teamName = rawTeam?.title || rawTeam?.name || rawTeam?.teamName || rawTeam?.teamId?.title || "Team";
      const shortName = rawTeam?.shortName || rawTeam?.teamId?.shortName || "";
      const location = rawTeam?.location || rawTeam?.teamId?.location || "";

      let matchesCount = 0;
      let runsCount = 0;
      let wicketsCount = 0;
      const yearsSet = new Set();

      const hasBackendStats = rawTeam?.matches !== undefined && rawTeam?.matches !== null;
      if (hasBackendStats) {
        matchesCount = Number(rawTeam.matches || 0);
        runsCount = Number(rawTeam.runs || 0);
        wicketsCount = Number(rawTeam.wickets || 0);
      } else {
        // Scan loaded matches for this team
        allMatchesList.forEach((m) => {
          if (matchBelongsToTeam(m, rawTeam)) {
            matchesCount++;
            const { batRuns, bowlWickets } = getPlayerStatsFromMatch(m);
            runsCount += batRuns;
            wicketsCount += bowlWickets;
            const matchDate = m.startDate || m.matchDate || m.createdAt || m.date || m.score?.matchDate;
            if (matchDate) {
              const yr = new Date(matchDate).getFullYear();
              if (!isNaN(yr) && yr > 2000) yearsSet.add(yr);
            }
          }
        });
      }

      // If still 0 and player only has this 1 team (or this is the only team), fallback to career stats
      if (matchesCount === 0 && isOnlyTeam) {
        matchesCount = Number(battingStats.all.matches || bowlingStats.all.matches || bStats.matches || bowlStats.matches || 0);
        runsCount = Number(battingStats.all.runs ?? bStats.runs ?? 0);
        wicketsCount = Number(bowlingStats.all.wickets ?? bowlStats.wickets ?? 0);
      }

      // Determine Seasons
      let seasons = "Current";
      if (rawTeam?.seasons && rawTeam.seasons !== "Current" && rawTeam.seasons !== 0 && rawTeam.seasons !== "0") {
        seasons = String(rawTeam.seasons);
      } else if (yearsSet.size > 0) {
        const sorted = Array.from(yearsSet).sort((a, b) => a - b);
        seasons = sorted.length === 1 ? String(sorted[0]) : `${sorted[0]} - ${sorted[sorted.length - 1]}`;
      } else if (rawTeam?.createdAt) {
        const cYr = new Date(rawTeam.createdAt).getFullYear();
        const curYr = new Date().getFullYear();
        seasons = !isNaN(cYr) && cYr > 2000 ? (cYr === curYr ? String(cYr) : `${cYr} - ${curYr}`) : String(curYr);
      } else {
        const curYr = new Date().getFullYear();
        seasons = `${curYr - 1} - ${curYr}`;
      }

      // A player should have 1 consistent role throughout the app
      const role = resolvedRole;

      return {
        id: teamId,
        name: teamName,
        shortName,
        location,
        seasons,
        matches: matchesCount,
        runs: runsCount,
        wickets: wicketsCount,
        role,
      };
    };

    let list = rawList
      .filter((t) => t && (typeof t === "object" || typeof t === "string"))
      .map((t) => {
        const teamObj = typeof t === "string" ? { _id: t, title: "Team" } : t;
        return computeTeamDetails(teamObj, rawList.length === 1);
      })
      .filter((t) => t.name && t.name !== "Team");

    // If no resolved teams found in profile, extract teams from player's matches
    if (list.length === 0) {
      const seenTeamNames = new Set();
      const discoveredTeams = [];

      allMatchesList.forEach((m) => {
        if (typeof m === "object" && m) {
          const checkAndAdd = (teamEntry) => {
            if (!teamEntry) return;
            const tName = teamEntry.title || teamEntry.name || teamEntry.teamName;
            if (!tName || seenTeamNames.has(tName)) return;
            seenTeamNames.add(tName);
            discoveredTeams.push(teamEntry);
          };

          if (m.teams?.[0]?.players?.some(isMatchForCurrentPlayer)) checkAndAdd(m.teams[0]);
          else if (m.teams?.[1]?.players?.some(isMatchForCurrentPlayer)) checkAndAdd(m.teams[1]);
          else if (m.teamA?.players?.some(isMatchForCurrentPlayer)) checkAndAdd(m.teamA);
          else if (m.teamB?.players?.some(isMatchForCurrentPlayer)) checkAndAdd(m.teamB);
          else if (m.teams?.[0]) checkAndAdd(m.teams[0]);
          else if (m.teams?.[1]) checkAndAdd(m.teams[1]);
        }
      });

      list = discoveredTeams.map((teamEntry) => computeTeamDetails(teamEntry, discoveredTeams.length === 1));

      if (list.length === 0 && player.team && player.team !== "Unassigned") {
        list.push(computeTeamDetails({ title: player.team }, true));
      }
    }

    return list;
  }, [
    fetchedPlayer?.teams,
    target?.teams,
    playerMatches,
    detailedMatchesMap,
    route?.params?.match,
    route?.params?.score,
    player?.name,
    player?.team,
    battingStats.all,
    bowlingStats.all,
    targetId,
    target?.username,
    target?.name,
    target?.role,
    target?.playingRole,
    target?.batStyle,
    target?.ballStyle,
    sanitizedRoutePlayer,
    authUser,
    bStats,
    bowlStats,
    isMatchForPlayer,
  ]);

  const liveMatches = [];
  const recentMatches = [];
  // Career achievement badges — computed server-side (see server/utils/badges.js)
  // from the player's persisted career stats, so thresholds and hat-trick/
  // 5-wicket-haul detection stay in one authoritative place.
  const badges = Array.isArray(fetchedPlayer?.badges) ? fetchedPlayer.badges : [];
  const earnedBadges = badges.filter((b) => b.earned);

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

      {/* Local Rankings CTA */}
      <TouchableOpacity
        onPress={() =>
          navigation.navigate(SCREENS.PlayerRankings, {
            initialRegion: teams?.[0]?.location || undefined,
          })
        }
        activeOpacity={0.8}
        className={`flex-row items-center p-4 rounded-xl mb-4 ${
          isDarkMode ? "bg-blue-900/30" : "bg-blue-50"
        }`}
      >
        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="podium-outline" size={20} color="#3B82F6" />
        </View>
        <View className="flex-1">
          <ThemedText className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            See your local ranking
          </ThemedText>
          <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            {teams?.[0]?.location
              ? `How you rank among players in ${teams[0].location}`
              : "How you rank among players in your area"}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
      </TouchableOpacity>

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
        playerMatches
          .filter((m) => {
            const matchId = typeof m === "string" ? m : (m?._id || m?.id || m?.matchId);
            const matchObj = typeof m === "object" ? m : (detailedMatchesMap[String(matchId)] || null);
            return !matchObj || isMatchForPlayer(matchObj, targetId);
          })
          .map((m, idx) => {
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
              const teamId = team._id || team.id || team.teamId;
              navigation.navigate(SCREENS.TeamProfile, { teamId, team });
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
      <View className="flex-row items-center justify-between mb-4">
        <ThemedText
          className={`text-lg font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Badges
        </ThemedText>
        <ThemedText className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          {earnedBadges.length} / {badges.length} earned
        </ThemedText>
      </View>

      {badges.length === 0 ? (
        <View className="items-center justify-center py-12">
          <Ionicons name="trophy-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No badges available yet
          </ThemedText>
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-between">
          {badges.map((badge) => (
            <View
              key={badge.id}
              style={{ width: "48%" }}
              className={`p-3 rounded-xl mb-3 items-center ${
                badge.earned
                  ? isDarkMode ? "bg-gray-800" : "bg-white"
                  : isDarkMode ? "bg-gray-800/40" : "bg-gray-100"
              } ${badge.earned ? "shadow-sm" : ""}`}
            >
              <View
                className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
                  badge.earned
                    ? isDarkMode ? "bg-yellow-500/20" : "bg-yellow-100"
                    : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <ThemedText style={{ fontSize: 24, opacity: badge.earned ? 1 : 0.35 }}>
                  {badge.icon}
                </ThemedText>
              </View>
              <ThemedText
                className={`text-sm font-semibold text-center ${
                  badge.earned
                    ? isDarkMode ? "text-white" : "text-gray-900"
                    : isDarkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {badge.name}
              </ThemedText>
              <ThemedText
                className={`text-xs text-center mt-1 ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
                numberOfLines={2}
              >
                {badge.description}
              </ThemedText>
              {!badge.earned && (
                <View className="flex-row items-center mt-1.5">
                  <Ionicons name="lock-closed" size={10} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
                  <ThemedText className={`text-[10px] ml-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    Locked
                  </ThemedText>
                </View>
              )}
            </View>
          ))}
        </View>
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
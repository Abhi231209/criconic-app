import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  FlatList,
  ActivityIndicator,
  RefreshControl,
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

  // Matches pagination state
  const [playerMatches, setPlayerMatches] = useState([]);
  const [detailedMatchesMap, setDetailedMatchesMap] = useState({});
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false);
  const [matchesPage, setMatchesPage] = useState(1);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [refreshingMatches, setRefreshingMatches] = useState(false);
  const isFetchingMatchesRef = useRef(false);
  const hasMoreMatchesRef = useRef(true);

  // Teams pagination state
  const [rawFetchedTeams, setRawFetchedTeams] = useState([]);
  const [teamsPage, setTeamsPage] = useState(1);
  const [hasMoreTeams, setHasMoreTeams] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingMoreTeams, setLoadingMoreTeams] = useState(false);
  const [refreshingTeams, setRefreshingTeams] = useState(false);
  const isFetchingTeamsRef = useRef(false);
  const hasMoreTeamsRef = useRef(true);

  // Robust team identifier for deduplication across diverse API payloads
  const getTeamKey = useCallback((t) => {
    if (!t) return "";
    const rawId =
      t._id ||
      t.id ||
      t.teamId?._id ||
      t.teamId?.id ||
      (typeof t.teamId === "string" ? t.teamId : "") ||
      (typeof t === "string" ? t : "");
    const id = String(rawId || "").trim();
    const rawName =
      t.title ||
      t.name ||
      t.teamName ||
      t.teamId?.title ||
      t.teamId?.name ||
      "";
    const name = String(rawName || "").trim().toLowerCase();
    if (id && id !== "undefined" && id !== "[object Object]") {
      return `id:${id}`;
    }
    if (name && name !== "team") {
      return `name:${name}`;
    }
    return "";
  }, []);

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
  }, [
    sanitizedRoutePlayer?.name,
    sanitizedRoutePlayer?.username,
    routePlayer?.name,
    routePlayer?.username,
    authUser?.username,
    authUser?.name,
    fetchedPlayer?.username,
    fetchedPlayer?.name,
  ]);

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
        if (Array.isArray(user.teams) && user.teams.length > 0) {
          setRawFetchedTeams(user.teams);
        }
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

  const MATCHES_PER_PAGE = 10;
  const TEAMS_PER_PAGE = 8;

  // 2. Fetch Matches with Infinite Scroll
  const fetchMatchesPage = useCallback(
    async (pageToFetch = 1, isRefresh = false) => {
      if (!targetId || String(targetId) === "1") return;
      if (isFetchingMatchesRef.current) return;
      if (!isRefresh && !hasMoreMatchesRef.current) return;
      isFetchingMatchesRef.current = true;

      if (isRefresh) {
        setRefreshingMatches(true);
        hasMoreMatchesRef.current = true;
        setHasMoreMatches(true);
      } else if (pageToFetch === 1) {
        setLoadingMatches(true);
      } else {
        setLoadingMoreMatches(true);
      }

      try {
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

        // Query player matches using player-scoped pagination (backend limits to 10 items per page)
        let idsRes = await request(
          `api/matches/ids?playerId=${targetId}&page=${pageToFetch}&items=${MATCHES_PER_PAGE}&limit=${MATCHES_PER_PAGE}`,
          { method: "GET", errorAlert: false }
        ).catch(() => null);

        let extracted = extractMatches(idsRes);

        // Fallback to general matches endpoint if ids endpoint returned nothing on initial page
        if (extracted.length === 0 && pageToFetch === 1) {
          const matchesRes = await matchesApi.getMatches(
            { playerId: targetId, page: 1, limit: MATCHES_PER_PAGE, items: MATCHES_PER_PAGE },
            { errorAlert: false }
          ).catch(() => null);
          extracted = extractMatches(matchesRes);
        }

        const routeMatches = (pageToFetch === 1 && Array.isArray(route?.params?.matches)) ? route.params.matches : [];
        const rawList = [
          ...extracted,
          ...routeMatches,
        ];

        if (pageToFetch === 1 && route?.params?.match) {
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

        const newItems = Array.from(matchMap.values());

        // Check if server returned fewer matches than page size or empty
        if (newItems.length === 0 || extracted.length < MATCHES_PER_PAGE) {
          hasMoreMatchesRef.current = false;
          setHasMoreMatches(false);
        } else {
          hasMoreMatchesRef.current = true;
          setHasMoreMatches(true);
        }

        let addedCount = 0;
        setPlayerMatches((prev) => {
          if (pageToFetch === 1 || isRefresh) {
            return newItems;
          }
          const prevMap = new Map();
          for (const m of prev) {
            const id = typeof m === "string" ? m : (m?._id || m?.id || m?.matchId);
            if (id) prevMap.set(String(id), m);
          }
          for (const m of newItems) {
            const id = typeof m === "string" ? m : (m?._id || m?.id || m?.matchId);
            if (id) {
              const idStr = String(id);
              if (!prevMap.has(idStr)) {
                addedCount++;
                prevMap.set(idStr, m);
              } else if (typeof prevMap.get(idStr) === "string" && typeof m === "object") {
                prevMap.set(idStr, m);
              }
            }
          }
          // If on page > 1 we received 0 brand-new matches, stop further API calls
          if (addedCount === 0) {
            hasMoreMatchesRef.current = false;
            setHasMoreMatches(false);
          }
          return Array.from(prevMap.values());
        });

        setMatchesPage(pageToFetch);

        // Preload any full match objects already available in newItems
        const preloadedDetails = {};
        for (const item of newItems) {
          if (item && typeof item === "object") {
            const mId = item._id || item.id || item.matchId;
            if (mId) preloadedDetails[String(mId)] = item;
          }
        }
        if (Object.keys(preloadedDetails).length > 0) {
          setDetailedMatchesMap((prev) => ({ ...prev, ...preloadedDetails }));
        }

        // Fetch rich match cards in parallel for up to the first 10 matches that need details
        const idsToFetch = newItems
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
              const detailsMap = {};
              results.forEach((r, idx) => {
                if (r.status === "fulfilled" && r.value?.data) {
                  const mData = r.value.data;
                  const mId = mData._id || mData.id || idsToFetch[idx];
                  if (mId) {
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
        isFetchingMatchesRef.current = false;
        setLoadingMatches(false);
        setLoadingMoreMatches(false);
        setRefreshingMatches(false);
      }
    },
    [targetId, route?.params?.matches, route?.params?.match]
  );

  const loadMoreMatches = useCallback(() => {
    if (!hasMoreMatchesRef.current || loadingMatches || loadingMoreMatches || isFetchingMatchesRef.current) {
      return;
    }
    fetchMatchesPage(matchesPage + 1, false);
  }, [loadingMatches, loadingMoreMatches, matchesPage, fetchMatchesPage]);

  const onRefreshMatches = useCallback(() => {
    hasMoreMatchesRef.current = true;
    setHasMoreMatches(true);
    fetchMatchesPage(1, true);
  }, [fetchMatchesPage]);

  // 3. Fetch Teams with Infinite Scroll
  const fetchTeamsPage = useCallback(
    async (pageToFetch = 1, isRefresh = false) => {
      if (!targetId || String(targetId) === "1") return;
      if (isFetchingTeamsRef.current) return;
      if (!isRefresh && !hasMoreTeamsRef.current) return;
      isFetchingTeamsRef.current = true;

      if (isRefresh) {
        setRefreshingTeams(true);
        hasMoreTeamsRef.current = true;
        setHasMoreTeams(true);
      } else if (pageToFetch === 1) {
        setLoadingTeams(true);
      } else {
        setLoadingMoreTeams(true);
      }

      try {
        const withTeamRes = await request(
          `api/users/withTeam/${targetId}`,
          { method: "GET", errorAlert: false }
        ).catch(() => null);

        const list = withTeamRes?.data?.content?.teams || withTeamRes?.data?.teams || [];
        if (Array.isArray(list) && list.length > 0) {
          setRawFetchedTeams(list);
        }
        hasMoreTeamsRef.current = false;
        setHasMoreTeams(false);
        setTeamsPage(pageToFetch);
      } catch (err) {
        console.log("[PlayerProfile] Teams fetch error:", err);
      } finally {
        isFetchingTeamsRef.current = false;
        setLoadingTeams(false);
        setLoadingMoreTeams(false);
        setRefreshingTeams(false);
      }
    },
    [targetId]
  );

  useEffect(() => {
    let isMounted = true;
    if (!targetId || String(targetId) === "1") return;

    fetchProfile();

    // Initial page 1 fetch for matches and teams
    setMatchesPage(1);
    hasMoreMatchesRef.current = true;
    setHasMoreMatches(true);
    fetchMatchesPage(1, false);

    setTeamsPage(1);
    hasMoreTeamsRef.current = true;
    setHasMoreTeams(true);
    fetchTeamsPage(1, false);

    return () => {
      isMounted = false;
    };
  }, [targetId, route?.params?.matchId]);

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

  const getBattingStatsForType = (type) => {
    const s = (type !== "all" && bStats[type]) ? bStats[type] : bStats;
    const runs = Number(s.runs || 0);
    const innings = Number(s.innings ?? s.matches ?? 0);
    const notOut = Number(s.notOut || 0);
    const outs = innings - notOut;
    const computedAvg = outs > 0 ? (runs / outs).toFixed(2) : (runs > 0 ? runs.toFixed(2) : "0.00");
    const avg = s.avg !== undefined ? String(s.avg) : computedAvg;

    return {
      matches: Number(s.matches || 0),
      innings,
      runs,
      average: avg,
      strikeRate: s.strikeRate !== undefined ? String(s.strikeRate) : "0.00",
      highest: Number(s.highestScore || 0),
      centuries: Number(s._100s || 0),
      fifties: Number(s._50s || 0),
      fours: Number(s.fours || 0),
      sixes: Number(s.six || s.sixes || 0),
    };
  };

  const getBowlingStatsForType = (type) => {
    const s = (type !== "all" && bowlStats[type]) ? bowlStats[type] : bowlStats;
    const runsGiven = Number(s.runsGiven ?? s.runs ?? 0);
    const wickets = Number(s.wickets || 0);
    const computedAvg = wickets > 0 ? (runsGiven / wickets).toFixed(2) : "0.00";
    const avg = s.avg !== undefined ? String(s.avg) : computedAvg;

    return {
      matches: Number(s.matches || 0),
      innings: Number(s.innings || 0),
      wickets,
      average: avg,
      economy: s.eco !== undefined ? String(s.eco) : "0.00",
      bestBowling: s.bestBowling || "-",
      strikeRate: s.strikeRate !== undefined ? String(s.strikeRate) : "0.00",
      maidens: Number(s.maidens || 0),
      fourWickets: Number(s.fourWickets ?? s.threeWicketHauls ?? 0),
      fiveWickets: Number(s.fiveWicketHauls ?? 0),
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
    const rawSources = [];
    if (Array.isArray(rawFetchedTeams) && rawFetchedTeams.length > 0) {
      rawSources.push(...rawFetchedTeams);
    }
    if (Array.isArray(fetchedPlayer?.teams) && fetchedPlayer.teams.length > 0) {
      rawSources.push(...fetchedPlayer.teams);
    }
    if (Array.isArray(target?.teams) && target.teams.length > 0) {
      rawSources.push(...target.teams);
    }
    if (route?.params?.team) {
      rawSources.push(route.params.team);
    }

    const map = new Map();
    for (const t of rawSources) {
      if (!t) continue;
      const key = getTeamKey(t);
      if (key && !map.has(key)) {
        const teamObj = typeof t === "string" ? { _id: t, title: "Team" } : t;
        const name = teamObj.title || teamObj.name || teamObj.teamName || "Team";
        if (name === "Team" && rawSources.length > 1) continue;

        map.set(key, {
          id: teamObj._id || teamObj.id || key,
          _id: teamObj._id || teamObj.id,
          name,
          shortName: teamObj.shortName || "",
          location: teamObj.location || "",
          seasons: teamObj.seasons ? String(teamObj.seasons) : "Current",
          matches: Number(teamObj.matches || 0),
          runs: Number(teamObj.runs || 0),
          wickets: Number(teamObj.wickets || 0),
          role: teamObj.role || resolvedRole || "Player",
          teamLogo: teamObj.teamLogo,
        });
      }
    }
    return Array.from(map.values());
  }, [rawFetchedTeams, fetchedPlayer?.teams, target?.teams, route?.params?.team, getTeamKey, resolvedRole]);

  const loadMoreTeams = useCallback(() => {
    if (!hasMoreTeamsRef.current || loadingTeams || loadingMoreTeams || isFetchingTeamsRef.current) {
      return;
    }
    fetchTeamsPage(teamsPage + 1, false);
  }, [loadingTeams, loadingMoreTeams, teamsPage, fetchTeamsPage]);

  const onRefreshTeams = useCallback(() => {
    hasMoreTeamsRef.current = true;
    setHasMoreTeams(true);
    fetchProfile();
    fetchTeamsPage(1, true);
  }, [fetchProfile, fetchTeamsPage]);

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

  const displayedMatches = playerMatches;

  const renderMatches = () => (
    <FlatList 
      className="flex-1" 
      data={displayedMatches}
      keyExtractor={(m, idx) => {
        const matchId = typeof m === "string" ? m : (m?._id || m?.id || m?.matchId);
        return matchId ? String(matchId) : String(idx);
      }}
      renderItem={({ item: m, index: idx }) => {
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
      }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMoreMatches ? loadMoreMatches : null}
      onEndReachedThreshold={0.3}
      refreshControl={
        <RefreshControl
          refreshing={refreshingMatches}
          onRefresh={onRefreshMatches}
          colors={["#3B82F6"]}
          tintColor="#3B82F6"
        />
      }
      ListHeaderComponent={
        <ThemedText
          className={`text-lg font-bold mb-4 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Matches
        </ThemedText>
      }
      ListFooterComponent={
        loadingMoreMatches ? (
          <View className="py-4 items-center justify-center">
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        loadingMatches && displayedMatches.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : (
          <View className="items-center justify-center py-12">
            <Ionicons name="calendar-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              No match records found
            </ThemedText>
          </View>
        )
      }
    />
  );

  const renderTeams = () => (
    <FlatList 
      className="flex-1" 
      data={teams}
      keyExtractor={(team, idx) => {
        const key = getTeamKey(team);
        return key ? key : String(team?.id || team?._id || idx);
      }}
      renderItem={({ item: team }) => (
        <TouchableOpacity
          key={getTeamKey(team) || team.id}
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
      )}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMoreTeams ? loadMoreTeams : null}
      onEndReachedThreshold={0.3}
      refreshControl={
        <RefreshControl
          refreshing={refreshingTeams}
          onRefresh={onRefreshTeams}
          colors={["#3B82F6"]}
          tintColor="#3B82F6"
        />
      }
      ListHeaderComponent={
        <ThemedText
          className={`text-lg font-bold mb-4 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Teams Played For
        </ThemedText>
      }
      ListFooterComponent={
        loadingMoreTeams ? (
          <View className="py-4 items-center justify-center">
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        loadingTeams && teams.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : (
          <View className="items-center justify-center py-12">
            <Ionicons name="shirt-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <ThemedText className={`text-base mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              No team history available
            </ThemedText>
          </View>
        )
      }
    />
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
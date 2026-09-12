import React, { useState, useEffect, useMemo } from "react";
import { View, ScrollView, Pressable, useWindowDimensions, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { 
  Ionicons, 
  MaterialIcons, 
} from '@expo/vector-icons';
import ThemedText from "../custom/ThemedText";
import PlayerAvatar from "../custom/PlayerAvatar";
import request from "@/utils/api";
import SCREENS from "@/screens";

export default function CurrentSquad({ matchId, score }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const [activeTeam, setActiveTeam] = useState("team1");
  const [activeRole, setActiveRole] = useState("all");
  
  const isDark = colorScheme === "dark";

  const colors = {
    primary: isDark ? "#3b82f6" : "#2563eb",
    secondary: isDark ? "#fbbf24" : "#f59e0b",
    background: isDark ? "#0f172a" : "#f1f5f9",
    card: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f1f5f9" : "#1e293b",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
  };

  const squadTeam1 = score?.teams?.[0] || score?.teamA || {};
  const squadTeam2 = score?.teams?.[1] || score?.teamB || {};

  const team1Id =
    squadTeam1?.teamId?._id ||
    squadTeam1?.teamId?.id ||
    squadTeam1?.teamId ||
    squadTeam1?._id ||
    squadTeam1?.id ||
    score?.teamA?._id ||
    score?.teamA?.id ||
    (typeof score?.teamA === "string" ? score.teamA : null);

  const team2Id =
    squadTeam2?.teamId?._id ||
    squadTeam2?.teamId?.id ||
    squadTeam2?.teamId ||
    squadTeam2?._id ||
    squadTeam2?.id ||
    score?.teamB?._id ||
    score?.teamB?.id ||
    (typeof score?.teamB === "string" ? score.teamB : null);

  // Auxiliary team squad players and leaderboard stats
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [team1BattingLeaderboard, setTeam1BattingLeaderboard] = useState([]);
  const [team1BowlingLeaderboard, setTeam1BowlingLeaderboard] = useState([]);
  const [team2BattingLeaderboard, setTeam2BattingLeaderboard] = useState([]);
  const [team2BowlingLeaderboard, setTeam2BowlingLeaderboard] = useState([]);

  useEffect(() => {
    let isMounted = true;
    if (team1Id) {
      request(`api/teams/${team1Id}`, { method: "GET", errorAlert: false })
        .then((res) => {
          if (!isMounted) return;
          const teamObj = Array.isArray(res?.data) ? res.data[0] : (res?.data?.data || res?.data);
          if (Array.isArray(teamObj?.players)) {
            setTeam1Players(teamObj.players);
          }
        })
        .catch(() => {});
      request(`api/teams/getBatsmenLeaderBoard/${team1Id}`, { method: "GET", errorAlert: false })
        .then((res) => {
          if (isMounted && res?.data?.success && Array.isArray(res.data.stats)) {
            setTeam1BattingLeaderboard(res.data.stats);
          }
        })
        .catch(() => {});
      request(`api/teams/getBowlingLeaderBoard/${team1Id}`, { method: "GET", errorAlert: false })
        .then((res) => {
          if (isMounted && res?.data?.success && Array.isArray(res.data.stats)) {
            setTeam1BowlingLeaderboard(res.data.stats);
          }
        })
        .catch(() => {});
    }
    if (team2Id) {
      request(`api/teams/${team2Id}`, { method: "GET", errorAlert: false })
        .then((res) => {
          if (!isMounted) return;
          const teamObj = Array.isArray(res?.data) ? res.data[0] : (res?.data?.data || res?.data);
          if (Array.isArray(teamObj?.players)) {
            setTeam2Players(teamObj.players);
          }
        })
        .catch(() => {});
      request(`api/teams/getBatsmenLeaderBoard/${team2Id}`, { method: "GET", errorAlert: false })
        .then((res) => {
          if (isMounted && res?.data?.success && Array.isArray(res.data.stats)) {
            setTeam2BattingLeaderboard(res.data.stats);
          }
        })
        .catch(() => {});
      request(`api/teams/getBowlingLeaderBoard/${team2Id}`, { method: "GET", errorAlert: false })
        .then((res) => {
          if (isMounted && res?.data?.success && Array.isArray(res.data.stats)) {
            setTeam2BowlingLeaderboard(res.data.stats);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [team1Id, team2Id]);

  // Aggregate current match stats for every player across all innings
  const playerMatchStatsMap = useMemo(() => {
    const map = new Map();

    const recordBatting = (p) => {
      if (!p) return;
      const rawId = p.id?._id || p.id?.id || p.id || p._id || p.playerId || p.userId;
      const idKey = (rawId && typeof rawId === "object" ? String(rawId._id || rawId.id || "") : String(rawId || "")).trim();
      const nameKey = (p.username || p.name || p.playerName || p.id?.username || p.id?.name || "").toString().trim().toLowerCase();
      if (!idKey && !nameKey) return;

      const existing = (idKey && map.get(idKey)) || (nameKey && map.get(nameKey)) || {};

      const runs = Number(p.runs ?? p.score ?? 0);
      const balls = Number(p.ballsFaced ?? p.balls ?? p.ball ?? p.ballsPlayed ?? 0);
      const fours = Number(p.fours ?? p.four ?? 0);
      const sixes = Number(p.sixes ?? p.six ?? 0);
      const strikeRate = p.sr ?? p.strikeRate ?? (balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.00");
      const photo = p.profileImg || p.profileImage || p.photo || p.image || p.avatar || p.id?.profileImg || p.id?.image || null;

      const stat = {
        ...existing,
        didBat: true,
        runs: balls >= (existing.balls || 0) ? runs : (existing.runs ?? runs),
        balls: Math.max(balls, existing.balls || 0),
        fours: Math.max(fours, existing.fours || 0),
        sixes: Math.max(sixes, existing.sixes || 0),
        strikeRate: balls >= (existing.balls || 0) ? strikeRate : (existing.strikeRate ?? strikeRate),
        isOut: p.isOut ?? (p.notOut !== undefined ? !p.notOut : existing.isOut),
        dismissal: p.dismissal || p.dismissalInfo || p.howOut || existing.dismissal,
        profileImg: photo || existing.profileImg,
      };

      if (idKey) map.set(idKey, stat);
      if (nameKey) map.set(nameKey, stat);
    };

    const parseBalls = (ov, b) => {
      if (typeof b === "number" && b > 0) return b;
      if (!ov) return 0;
      const parts = String(ov).split(".");
      return (parseInt(parts[0], 10) || 0) * 6 + (parseInt(parts[1], 10) || 0);
    };

    const recordBowling = (p) => {
      if (!p) return;
      const rawId = p.id?._id || p.id?.id || p.id || p._id || p.playerId || p.userId;
      const idKey = (rawId && typeof rawId === "object" ? String(rawId._id || rawId.id || "") : String(rawId || "")).trim();
      const nameKey = (p.username || p.name || p.playerName || p.id?.username || p.id?.name || "").toString().trim().toLowerCase();
      if (!idKey && !nameKey) return;

      const existing = (idKey && map.get(idKey)) || (nameKey && map.get(nameKey)) || {};

      const balls = parseBalls(p.over ?? p.overs, p.balls);
      const existingBalls = existing.bowlingBalls || 0;
      const overs = p.over ?? p.overs ?? (balls > 0 ? `${Math.floor(balls / 6)}.${balls % 6}` : "0.0");
      const maidens = Number(p.maiden ?? p.maidens ?? 0);
      const concededRuns = Number(p.runsGiven ?? p.runsConceded ?? p.concededRuns ?? p.runs ?? 0);
      const wickets = Number(p.wicketsTaken ?? p.wickets ?? p.wicket ?? 0);
      const economy = p.eco ?? p.economy ?? p.econ ?? (overs && parseFloat(overs) > 0 ? (concededRuns / parseFloat(overs)).toFixed(2) : "0.00");
      const photo = p.profileImg || p.profileImage || p.photo || p.image || p.avatar || p.id?.profileImg || p.id?.image || null;

      const stat = {
        ...existing,
        didBowl: true,
        overs: balls >= existingBalls ? overs : (existing.overs || overs),
        bowlingBalls: Math.max(balls, existingBalls),
        maidens: Math.max(maidens, existing.maidens || 0),
        concededRuns: balls >= existingBalls ? concededRuns : Math.max(concededRuns, existing.concededRuns || 0),
        wickets: Math.max(wickets, existing.wickets || 0),
        economy: balls >= existingBalls ? economy : (existing.economy || economy),
        profileImg: photo || existing.profileImg,
      };

      if (idKey) map.set(idKey, stat);
      if (nameKey) map.set(nameKey, stat);
    };

    if (Array.isArray(score?.inning)) {
      score.inning.forEach((inn) => {
        const batsmen = [
          ...(Array.isArray(inn?.playedBatsman) ? inn.playedBatsman : []),
          ...(Array.isArray(inn?.batsman) ? inn.batsman : []),
          ...(Array.isArray(inn?.batting?.batsmen) ? inn.batting.batsmen : []),
          ...(Array.isArray(inn?.outBatsman) ? inn.outBatsman : []),
        ];
        batsmen.forEach(recordBatting);

        const bowlers = [
          ...(Array.isArray(inn?.bowling?.allBowlers) ? inn.bowling.allBowlers : []),
          ...(Array.isArray(inn?.bowling?.bowlers) ? inn.bowling.bowlers : []),
          ...(Array.isArray(inn?.bowlers) ? inn.bowlers : []),
          ...(Array.isArray(inn?.bowling?.lastTwoBowlers) ? inn.bowling.lastTwoBowlers : []),
          ...(inn?.bowler ? [inn.bowler] : []),
        ];
        bowlers.forEach(recordBowling);
      });
    }

    if (Array.isArray(score?.batsman)) {
      score.batsman.forEach(recordBatting);
    }
    if (Array.isArray(score?.outBatsman)) {
      score.outBatsman.forEach(recordBatting);
    }
    if (score?.bowler) {
      recordBowling(score.bowler);
    }
    if (Array.isArray(score?.bowlers)) {
      score.bowlers.forEach(recordBowling);
    }

    return map;
  }, [score]);

  const redirectToPlayerProfile = (player) => {
    if (!player) return;
    navigation.navigate(SCREENS.PlayerProfile, {
      playerId: player.id || player._id || player.playerId,
      player: {
        id: player.id || player._id || player.playerId,
        _id: player.id || player._id || player.playerId,
        name: player.name || player.username || "Player",
        username: player.username || player.name || "Player",
        role: player.role || "Player",
        battingStyle: player.battingStyle || "Right Handed",
        bowlingStyle: player.bowlingStyle || "Right Arm Medium",
        profileImg: player.profileImg || player.profileImage || player.image || player.photo,
        profileImage: player.profileImage || player.profileImg || player.image || player.photo,
        image: player.image || player.profileImg || player.profileImage || player.photo,
        photo: player.photo || player.profileImg || player.image,
        team: player.teamName || player.team,
        ...(player.raw || {}),
      },
      matchId: matchId || score?._id || score?.id,
      match: score,
    });
  };

  const buildPlayerStats = (p, idx, isTeam1) => {
    const rawId = p?.id?._id || p?.id?.id || p?.id || p?._id || p?.playerId || p?.userId;
    const name = p?.username || p?.name || p?.playerName || p?.id?.username || p?.id?.name || `Player ${idx + 1}`;
    const id = (rawId && typeof rawId === "object" ? String(rawId._id || rawId.id || "") : String(rawId || (p?.name || p?.username ? `${p.name || p.username}_${idx}` : (isTeam1 ? `t1_${idx}` : `t2_${idx}`))));
    
    // Look up in match stats map
    const idKey = id.toString();
    const nameKey = name.trim().toLowerCase();
    const matchStat = (idKey && playerMatchStatsMap.get(idKey)) || (nameKey && playerMatchStatsMap.get(nameKey)) || null;

    // Look up in team squad players fetched from api/teams/${teamId}
    const teamPlayers = isTeam1 ? team1Players : team2Players;
    const teamPlayer = (teamPlayers || []).find((tp) => {
      const tpRawId = tp?._id || tp?.id || tp?.playerId || tp?.id?._id || tp?.id?.id;
      const tpId = (tpRawId && typeof tpRawId === "object" ? String(tpRawId._id || tpRawId.id || "") : String(tpRawId || "")).trim();
      const tpName = (tp?.name || tp?.username || tp?.playerName || tp?.id?.name || tp?.id?.username || "").toString().trim().toLowerCase();
      return (idKey && tpId && tpId === idKey) || (nameKey && tpName && tpName === nameKey);
    });

    // Look up in team leaderboards
    const batLb = isTeam1 ? team1BattingLeaderboard : team2BattingLeaderboard;
    const bowlLb = isTeam1 ? team1BowlingLeaderboard : team2BowlingLeaderboard;

    const lbBat = (batLb || []).find(item => 
      (idKey && String(item.id || item._id) === idKey) ||
      (item.name && item.name.trim().toLowerCase() === nameKey)
    );
    const lbBowl = (bowlLb || []).find(item => 
      (idKey && String(item.id || item._id) === idKey) ||
      (item.name && item.name.trim().toLowerCase() === nameKey)
    );

    const photo =
      p?.profileImg ||
      p?.profileImage ||
      p?.image ||
      p?.photo ||
      p?.avatar ||
      p?.id?.profileImg ||
      p?.id?.profileImage ||
      p?.id?.image ||
      p?.id?.photo ||
      p?.id?.avatar ||
      teamPlayer?.image ||
      teamPlayer?.profileImage ||
      teamPlayer?.profileImg ||
      teamPlayer?.photo ||
      teamPlayer?.avatar ||
      teamPlayer?.id?.profileImg ||
      teamPlayer?.id?.profileImage ||
      teamPlayer?.id?.image ||
      lbBat?.profileImg ||
      lbBat?.profileImage ||
      lbBat?.image ||
      lbBat?.photo ||
      lbBowl?.profileImg ||
      lbBowl?.profileImage ||
      lbBowl?.image ||
      lbBowl?.photo ||
      matchStat?.profileImg ||
      matchStat?.profileImage ||
      matchStat?.image ||
      null;

    const matches = p?.matches || teamPlayer?.matches || lbBat?.matches || lbBowl?.matches || (matchStat?.didBat || matchStat?.didBowl ? 1 : 0);
    const runs = p?.runs ?? teamPlayer?.runs ?? lbBat?.runs ?? (matchStat?.didBat ? matchStat.runs : 0);
    const wickets = p?.wickets ?? teamPlayer?.wickets ?? lbBowl?.wickets ?? (matchStat?.didBowl ? matchStat.wickets : 0);
    const strikeRate = p?.strikeRate ?? teamPlayer?.strikeRate ?? lbBat?.strikeRate ?? (matchStat?.strikeRate || 0);
    const economy = p?.economy ?? teamPlayer?.economy ?? lbBowl?.economy ?? (matchStat?.economy || 0);
    const average = p?.average ?? teamPlayer?.average ?? lbBat?.average ?? 0;

    const role = p?.role || teamPlayer?.role || teamPlayer?.position || (matchStat?.didBowl && matchStat?.didBat ? "All-rounder" : matchStat?.didBowl ? "Bowler" : matchStat?.didBat ? "Batsman" : "Player");
    const isCaptain = Boolean(p?.isCaptain || teamPlayer?.isCaptain);
    const isWicketKeeper = Boolean(p?.isWicketKeeper || teamPlayer?.isWicketKeeper);
    const battingStyle = p?.battingStyle || teamPlayer?.battingStyle || "Right Handed";
    const bowlingStyle = p?.bowlingStyle || teamPlayer?.bowlingStyle || "Right Arm Medium";

    return {
      id,
      _id: p?._id || id,
      name,
      username: name,
      profileImg: photo,
      profileImage: photo,
      image: photo,
      photo: photo,
      avatar: photo,
      role,
      isCaptain,
      isWicketKeeper,
      battingStyle,
      bowlingStyle,
      matches,
      runs,
      wickets,
      strikeRate,
      economy,
      average,
      matchStat,
      raw: { ...p, ...(teamPlayer || {}), profileImg: photo, profileImage: photo, image: photo },
    };
  };

  const rawPlayers1 = (Array.isArray(squadTeam1?.players) && squadTeam1.players.length > 0)
    ? squadTeam1.players
    : (Array.isArray(squadTeam1?.squad) && squadTeam1.squad.length > 0)
    ? squadTeam1.squad
    : (Array.isArray(team1Players) && team1Players.length > 0)
    ? team1Players
    : [];

  const rawPlayers2 = (Array.isArray(squadTeam2?.players) && squadTeam2.players.length > 0)
    ? squadTeam2.players
    : (Array.isArray(squadTeam2?.squad) && squadTeam2.squad.length > 0)
    ? squadTeam2.squad
    : (Array.isArray(team2Players) && team2Players.length > 0)
    ? team2Players
    : [];

  const team1 = {
    name: squadTeam1.title || squadTeam1.name || squadTeam1.teamName || "Team 1",
    shortName: squadTeam1.shortName || (typeof (squadTeam1.title || squadTeam1.name || squadTeam1.teamName) === 'string' ? (squadTeam1.title || squadTeam1.name || squadTeam1.teamName).substring(0, 3).toUpperCase() : "T1"),
    players: rawPlayers1.map((p, idx) => buildPlayerStats(p, idx, true)),
  };

  const team2 = {
    name: squadTeam2.title || squadTeam2.name || squadTeam2.teamName || "Team 2",
    shortName: squadTeam2.shortName || (typeof (squadTeam2.title || squadTeam2.name || squadTeam2.teamName) === 'string' ? (squadTeam2.title || squadTeam2.name || squadTeam2.teamName).substring(0, 3).toUpperCase() : "T2"),
    players: rawPlayers2.map((p, idx) => buildPlayerStats(p, idx, false)),
  };

  const currentTeam = activeTeam === "team1" ? team1 : team2;

  // Filter players based on role
  const filteredPlayers = (Array.isArray(currentTeam?.players) ? currentTeam.players : []).filter(player => {
    if (activeRole === "all") return true;
    if (activeRole === "batsmen") return (player?.role || "").includes("Batsman");
    if (activeRole === "allRounders") return (player?.role || "") === "All-rounder";
    if (activeRole === "bowlers") return (player?.role || "") === "Bowler";
    if (activeRole === "wicketKeepers") return Boolean(player?.isWicketKeeper);
    return true;
  });

  const TeamButton = ({ team, label, isActive }) => (
    <Pressable
      onPress={() => setActiveTeam(team)}
      className={`flex-1 py-1.5 rounded-md mx-0.5 items-center ${
        isActive 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700/60" : "bg-white/80")
      }`}
    >
      <ThemedText className={`text-xs font-semibold ${
        isActive ? "text-white" : (isDark ? "text-gray-300" : "text-gray-700")
      }`} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );

  const RoleButton = ({ value, label, icon, isActive }) => (
    <Pressable
      onPress={() => setActiveRole(value)}
      className={`flex-row items-center py-1 px-2.5 rounded-full mx-1 ${
        isActive 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700/60" : "bg-gray-200")
      }`}
    >
      {icon && (
        <MaterialIcons 
          name={icon} 
          size={13} 
          color={isActive ? "#fff" : (isDark ? "#94a3b8" : "#64748b")} 
          style={{ marginRight: 3 }}
        />
      )}
      <ThemedText className={`text-[11px] font-medium ${
        isActive ? "text-white" : (isDark ? "text-gray-300" : "text-gray-700")
      }`}>
        {label}
      </ThemedText>
    </Pressable>
  );

  const getRoleIcon = (role = "") => {
    if (role.includes("Batsman")) return "person";
    if (role === "All-rounder") return "all-inclusive";
    if (role === "Bowler") return "sports-baseball";
    return "person";
  };

  const getRoleColor = (role = "") => {
    if (role.includes("Batsman")) return isDark ? "#10b981" : "#059669";
    if (role === "All-rounder") return isDark ? "#f59e0b" : "#d97706";
    if (role === "Bowler") return isDark ? "#3b82f6" : "#2563eb";
    return isDark ? "#94a3b8" : "#64748b";
  };

  const PlayerCard = ({ player }) => (
    <Pressable 
      onPress={() => redirectToPlayerProfile(player)}
      className={`p-4 rounded-xl mb-3 ${isDark ? "bg-gray-800" : "bg-white"} border ${isDark ? "border-gray-700/60" : "border-gray-200/80"} shadow-sm active:opacity-80`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Player Avatar */}
          <View className="mr-3">
            <PlayerAvatar player={player} size={42} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center flex-wrap">
              <ThemedText className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>
                {player.name}
              </ThemedText>
              {player.isCaptain && (
                <View className={`ml-2 px-2 py-0.5 rounded-full ${isDark ? "bg-amber-900/40 border border-amber-600/40" : "bg-amber-100 border border-amber-200"}`}>
                  <ThemedText className={`text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                    C
                  </ThemedText>
                </View>
              )}
              {player.isWicketKeeper && (
                <View className={`ml-1.5 px-2 py-0.5 rounded-full ${isDark ? "bg-emerald-900/40 border border-emerald-600/40" : "bg-emerald-100 border border-emerald-200"}`}>
                  <ThemedText className={`text-xs font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                    WK
                  </ThemedText>
                </View>
              )}
            </View>
            
            <View className="flex-row items-center mt-1">
              <MaterialIcons 
                name={getRoleIcon(player.role)} 
                size={14} 
                color={getRoleColor(player.role)} 
              />
              <ThemedText className={`ml-1.5 text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {player.role}
              </ThemedText>
            </View>
          </View>
        </View>
        
        <Ionicons 
          name="chevron-forward" 
          size={18} 
          color={isDark ? "#64748b" : "#94a3b8"} 
        />
      </View>

      {/* Match Performance Badge if player has batted or bowled in this match */}
      {player.matchStat && (
        (player.matchStat.didBat && (player.matchStat.balls > 0 || player.matchStat.runs > 0 || player.matchStat.isOut !== undefined)) ||
        (player.matchStat.didBowl && (player.matchStat.bowlingBalls > 0 || parseFloat(player.matchStat.overs) > 0 || player.matchStat.wickets > 0 || player.matchStat.concededRuns > 0))
      ) && (
        <View className={`mt-3 p-2.5 rounded-lg ${isDark ? "bg-blue-950/40 border border-blue-800/40" : "bg-blue-50 border border-blue-200"}`}>
          <ThemedText className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
            Match Performance
          </ThemedText>
          <View className="flex-row flex-wrap gap-x-3 gap-y-1">
            {player.matchStat.didBat && (player.matchStat.balls > 0 || player.matchStat.runs > 0 || player.matchStat.isOut !== undefined) && (
              <ThemedText className={`text-xs font-semibold ${isDark ? "text-blue-200" : "text-blue-900"}`}>
                🏏 {player.matchStat.runs} ({player.matchStat.balls}b){player.matchStat.fours > 0 ? ` ${player.matchStat.fours}x4` : ""}{player.matchStat.sixes > 0 ? ` ${player.matchStat.sixes}x6` : ""}
              </ThemedText>
            )}
            {player.matchStat.didBowl && (player.matchStat.bowlingBalls > 0 || parseFloat(player.matchStat.overs) > 0 || player.matchStat.wickets > 0 || player.matchStat.concededRuns > 0) && (
              <ThemedText className={`text-xs font-semibold ${isDark ? "text-blue-200" : "text-blue-900"}`}>
                🎯 {player.matchStat.wickets}/{player.matchStat.concededRuns} ({player.matchStat.overs} ov)
              </ThemedText>
            )}
          </View>
        </View>
      )}
      
      <View className={`h-px my-3 ${isDark ? "bg-gray-700/60" : "bg-gray-200"}`} />
      
      {/* Player Styles & Stats Grid */}
      <View className="flex-row justify-between">
        <View className="flex-1">
          <ThemedText className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Batting
          </ThemedText>
          <ThemedText className={`text-xs font-medium mt-0.5 ${isDark ? "text-gray-200" : "text-gray-800"}`} numberOfLines={1}>
            {player.battingStyle}
          </ThemedText>
        </View>
        
        <View className="flex-1">
          <ThemedText className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Bowling
          </ThemedText>
          <ThemedText className={`text-xs font-medium mt-0.5 ${isDark ? "text-gray-200" : "text-gray-800"}`} numberOfLines={1}>
            {player.bowlingStyle}
          </ThemedText>
        </View>
        
        <View className="items-end min-w-[60px]">
          <ThemedText className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Matches
          </ThemedText>
          <ThemedText className={`text-xs font-bold mt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>
            {player.matches}
          </ThemedText>
        </View>
      </View>
      
      <View className="flex-row justify-between mt-2.5 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700/60">
        <View className="flex-1">
          <ThemedText className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Total Runs
          </ThemedText>
          <ThemedText className={`text-xs font-bold mt-0.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
            {player.runs}
            {player.strikeRate ? ` (SR ${player.strikeRate})` : ""}
          </ThemedText>
        </View>
        
        <View className="items-end min-w-[60px]">
          <ThemedText className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Total Wickets
          </ThemedText>
          <ThemedText className={`text-xs font-bold mt-0.5 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
            {player.wickets}
            {player.economy ? ` (Econ ${player.economy})` : ""}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Team Selection */}
      <View className={`mx-3 mt-2 p-1 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
        <View className="flex-row">
          <TeamButton team="team1" label={team1.name} isActive={activeTeam === "team1"} />
          <TeamButton team="team2" label={team2.name} isActive={activeTeam === "team2"} />
        </View>
      </View>

      {/* Role Filters */}
      <View className={`py-1.5 border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-2"
        >
          <RoleButton value="all" label="All" icon="people" isActive={activeRole === "all"} />
          <RoleButton value="batsmen" label="Batsmen" icon="person" isActive={activeRole === "batsmen"} />
          <RoleButton value="allRounders" label="All-rounders" icon="all-inclusive" isActive={activeRole === "allRounders"} />
          <RoleButton value="bowlers" label="Bowlers" icon="sports-baseball" isActive={activeRole === "bowlers"} />
          <RoleButton value="wicketKeepers" label="Keepers" icon="sports-cricket" isActive={activeRole === "wicketKeepers"} />
        </ScrollView>
      </View>

      {/* Player Count */}
      <View className="px-3 py-1">
        <ThemedText className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Showing {filteredPlayers.length} of {currentTeam?.players?.length || 0} players
        </ThemedText>
      </View>

      {/* Players List */}
      <ScrollView 
        className="flex-1 px-4 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {filteredPlayers.length > 0 ? (
          filteredPlayers.map((player, index) => (
            <Animated.View 
              key={player?.id || `player_${index}`}
              entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(300)}
            >
              <PlayerCard player={player} />
            </Animated.View>
          ))
        ) : (
          <View className="items-center justify-center p-8">
            <MaterialIcons 
              name="people-outline" 
              size={48} 
              color={isDark ? "#94a3b8" : "#cbd5e1"} 
            />
            <ThemedText className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              No players found for the selected filter
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Team Summary */}
      <View className={`p-4 border-t ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <View className="flex-row justify-between">
          <View className="items-center">
            <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Total Players
            </ThemedText>
            <ThemedText className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {currentTeam?.players?.length || 0}
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Captain
            </ThemedText>
            <ThemedText className={`text-sm font-medium ${isDark ? "text-amber-400" : "text-amber-600"}`}>
              {currentTeam?.players?.find(p => p?.isCaptain)?.name || "N/A"}
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Wicket Keepers
            </ThemedText>
            <ThemedText className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {(currentTeam?.players || []).filter(p => p?.isWicketKeeper).length}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}
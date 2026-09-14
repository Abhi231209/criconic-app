import React, { useState } from "react";
import { View, ScrollView, Pressable, useWindowDimensions, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome5, 
  MaterialCommunityIcons
} from '@expo/vector-icons';
import ThemedText from "../custom/ThemedText";
import SCREENS from "@/screens";

const StatBadge = React.memo(({ value, label, color, isDark }) => (
  <View className={`items-center p-2 rounded-lg ${
    isDark ? "bg-gray-700" : "bg-gray-100"
  }`} style={{ flex: 1, marginHorizontal: 4, maxWidth: "23%" }}>
    <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20, fontSize: 14 }}>
      {value}
    </ThemedText>
    <ThemedText className="text-xs mt-1" style={{ color, lineHeight: 16 }}>
      {label}
    </ThemedText>
  </View>
));

const PerformanceCard = React.memo(({ title, children, isExpanded, onPress, isDark }) => (
  <Pressable
    onPress={onPress}
    className={`rounded-lg p-4 mb-4 border ${
      isDark ? "border-gray-600" : "border-gray-200"
    } ${isExpanded ? (isDark ? "bg-gray-800" : "bg-white") : (isDark ? "bg-gray-800" : "bg-gray-50")}`}
  >
    <View className="flex-row justify-between items-center">
      <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 24 }}>
        {title}
      </ThemedText>
      <MaterialIcons 
        name={isExpanded ? "expand-less" : "expand-more"} 
        size={24} 
        color={isDark ? "#94a3b8" : "#64748b"} 
      />
    </View>
    {isExpanded ? (
      <View className="mt-2">
        {children}
      </View>
    ) : null}
  </Pressable>
));

export default function MatchSummary({ matchData }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const [expandedSection, setExpandedSection] = useState(null);
  
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

  // HARDCODED SAMPLE MATCH DATA - COMMENTED OUT (API ONLY)
  /*
  // Sample match data
  const matchInfo = {
    team1: {
      name: "WF-W",
      score: "145/6",
      overs: "20.0",
      result: "won by 40 runs"
    },
    team2: {
      name: "BP-W",
      score: "105/9",
      overs: "20.0",
      result: ""
    },
    venue: "Sydney Cricket Ground",
    date: "May 15, 2023",
    matchType: "T20 Women's League"
  };

  const manOfTheMatch = {
    name: "Ellyse Perry",
    team: "WF-W",
    role: "All-rounder",
    performance: {
      runs: 55,
      balls: 43,
      fours: 6,
      sixes: 2,
      wickets: 2,
      economy: 5.2
    },
    avatar: "🏏"
  };

  const topBatters = [
    { name: "Ellyse Perry", team: "WF-W", runs: 55, balls: 43, fours: 6, sixes: 2, sr: 127.91 },
    { name: "Alyssa Healy", team: "WF-W", runs: 42, balls: 32, fours: 5, sixes: 1, sr: 131.25 },
    { name: "Sophie Devine", team: "BP-W", runs: 38, balls: 35, fours: 4, sixes: 0, sr: 108.57 }
  ];

  const topBowlers = [
    { name: "S Ismail", team: "WF-W", wickets: 3, runs: 16, overs: "4.0", economy: 4.00 },
    { name: "M Schutt", team: "WF-W", wickets: 2, runs: 22, overs: "4.0", economy: 5.50 },
    { name: "M Taylor", team: "BP-W", wickets: 2, runs: 28, overs: "4.0", economy: 7.00 }
  ];

  const keyMoments = [
    { over: "10.3", description: "Perry reaches 50 with a boundary", type: "milestone" },
    { over: "12.5", description: "Ismail takes 2 wickets in 3 balls", type: "breakthrough" },
    { over: "16.2", description: "Healy's quickfire 42 comes to an end", type: "wicket" },
    { over: "19.1", description: "WF-W seal the victory with a yorker", type: "decisive" }
  ];
  */

  const redirectToPlayerProfile = (player) => {
    if (!player) return;
    const playerId = player?.playerId || player?.id || player?._id;
    navigation.navigate(SCREENS.PlayerProfile, {
      player: typeof player === "object" ? player : { name: player },
      playerId: playerId,
      matchId: matchData?._id || matchData?.id,
      match: matchData,
    });
  };

  // Distinct team names resolution
  const titleParts = (matchData?.title || "").split(/\s+vs\s+|\s+VS\s+|\s+v\s+/i);
  const titleTeam1 = titleParts[0]?.trim();
  const titleTeam2 = titleParts[1]?.trim();

  const t1 = matchData?.teams?.[0];
  const t2 = matchData?.teams?.[1];
  const t1Name = t1?.title || t1?.teamName || t1?.name || matchData?.teamA?.title || matchData?.teamA?.name;
  const t2Name = t2?.title || t2?.teamName || t2?.name || matchData?.teamB?.title || matchData?.teamB?.name;

  const inn1 = matchData?.inning?.[0];
  const inn1BattingTeam = inn1?.batting?.battingTeam;
  const inn1BowlingTeam = inn1?.bowling?.teamName;

  // Find second inning with distinct batting team
  const inn2 = (matchData?.inning || []).find((inn, idx) => 
    idx > 0 && inn?.batting?.battingTeam && inn?.batting?.battingTeam !== inn1BattingTeam
  ) || matchData?.inning?.[1];

  const team1Name = inn1BattingTeam || t1Name || titleTeam1 || "Team 1";
  let team2Name = (inn2?.batting?.battingTeam && inn2?.batting?.battingTeam !== team1Name)
    ? inn2.batting.battingTeam
    : (inn1BowlingTeam && inn1BowlingTeam !== team1Name)
    ? inn1BowlingTeam
    : (t2Name && t2Name !== team1Name)
    ? t2Name
    : (titleTeam2 && titleTeam2 !== team1Name)
    ? titleTeam2
    : (t1Name && t1Name !== team1Name)
    ? t1Name
    : "Team 2";

  if (team2Name === team1Name) {
    if (titleTeam2 && titleTeam2 !== team1Name) team2Name = titleTeam2;
    else if (t2Name && t2Name !== team1Name) team2Name = t2Name;
    else team2Name = `${team1Name} (Opponent)`;
  }

  // Filter out any super over innings so regular team scores are shown
  const allInnings = Array.isArray(matchData?.inning) ? matchData.inning : [];
  const regularInnings = allInnings.filter(inn => !inn?.isSuperOver);
  const superOverInnings = allInnings.filter(inn => inn?.isSuperOver);

  const team1Inning = regularInnings.find(inn => inn?.batting?.battingTeam === team1Name) || regularInnings[0] || inn1;
  const team2Inning = regularInnings.find(inn => inn?.batting?.battingTeam === team2Name) || (regularInnings[1] !== team1Inning ? regularInnings[1] : (inn2 !== team1Inning ? inn2 : null));

  const isTeam1CurrentlyBatting = matchData?.batting?.battingTeam === team1Name && !matchData?.isSuperOver;
  const isTeam2CurrentlyBatting = matchData?.batting?.battingTeam === team2Name && !matchData?.isSuperOver;

  const team1Score = team1Inning?.batting?.score || (isTeam1CurrentlyBatting ? matchData?.batting?.score : null);
  const team2Score = team2Inning?.batting?.score || (isTeam2CurrentlyBatting ? matchData?.batting?.score : null);

  const status = String(
    matchData?.status ||
    matchData?.matchCurrentStatus ||
    ""
  ).toUpperCase();

  const isSuperOverMatch = Boolean(
    matchData?.isSuperOver ||
    matchData?.score?.isSuperOver ||
    superOverInnings.length > 0 ||
    status.includes("SUPER_OVER") ||
    matchData?.description?.toLowerCase().includes("super over") ||
    matchData?.matchResult?.prompt?.toLowerCase().includes("super over")
  );

  const hasEndedStatus =
    status === "MATCH_COMPLETED" ||
    status === "MATCH_ENDED" ||
    status === "COMPLETED" ||
    status === "END" ||
    Boolean(matchData?.isMatchEnded || matchData?.isMatchCompleted);

  const rawPrompt = matchData?.matchResult?.prompt || matchData?.description || (typeof matchData?.result === "string" ? matchData.result : "") || "";
  const lowerPrompt = rawPrompt.toLowerCase();

  const hasWinningResult = Boolean(
    matchData?.matchResult?.prompt ||
    matchData?.matchResult?.winner ||
    matchData?.matchResult?.winTeam ||
    matchData?.matchResult?.winningTeam ||
    (lowerPrompt.includes("won by") || lowerPrompt.includes("won the match") || lowerPrompt.includes("win declare") || lowerPrompt.includes("won in super over") || lowerPrompt.includes("wins in super over"))
  );

  const isMatchEnded = (hasEndedStatus || hasWinningResult) &&
    status !== "INNINGS_I_ENDED" &&
    status !== "INNINGS_BREAK";

  let resultStr = rawPrompt;
  if (isSuperOverMatch && isMatchEnded) {
    if (lowerPrompt.includes("super over") && (lowerPrompt.includes("won") || lowerPrompt.includes("win"))) {
      resultStr = rawPrompt;
    } else {
      const winnerId = matchData?.matchResult?.winnerTeamId || matchData?.matchResult?.winner || matchData?.winner || matchData?.winnerTeamId;
      const winTeamObj = (matchData?.teams || []).find(t => String(t?.teamId || t?._id || t?.id) === String(winnerId));
      let winnerName = winTeamObj?.title || winTeamObj?.name || matchData?.matchResult?.winnerTeamName;
      if (!winnerName && superOverInnings.length >= 2) {
        const lastSo1 = superOverInnings[superOverInnings.length - 2];
        const lastSo2 = superOverInnings[superOverInnings.length - 1];
        const so1Score = Number(lastSo1?.batting?.score?.runs ?? 0);
        const so2Score = Number(lastSo2?.batting?.score?.runs ?? 0);
        if (so2Score > so1Score) winnerName = lastSo2?.batting?.battingTeam || team2Name;
        else if (so1Score > so2Score) winnerName = lastSo1?.batting?.battingTeam || team1Name;
      }
      if (winnerName) {
        resultStr = `${winnerName} won in Super Over`;
      } else if (rawPrompt) {
        resultStr = `${rawPrompt} (in Super Over)`;
      } else {
        resultStr = "Match won in Super Over";
      }
    }
  }

  const matchInfo = {
    team1: {
      name: team1Name,
      score: `${team1Score?.runs ?? 0}/${team1Score?.wicket ?? 0}`,
      overs: team1Score?.over || "0.0",
      result: resultStr
    },
    team2: {
      name: team2Name,
      score: `${team2Score?.runs ?? 0}/${team2Score?.wicket ?? 0}`,
      overs: team2Score?.over || "0.0",
      result: ""
    },
    venue: matchData?.venue || matchData?.location || "Ground",
    date: matchData?.date ? new Date(matchData.date).toLocaleDateString() : "",
    matchType: matchData?.matchType ? `${matchData.matchType} Match` : "Cricket Match"
  };

  const rawMom = isMatchEnded ? (matchData?.mom || matchData?.manOfTheMatch || null) : null;
  const manOfTheMatch = rawMom
    ? {
        name: rawMom?.playerName || rawMom?.name || (typeof rawMom === "string" ? rawMom : "Player"),
        playerId: rawMom?.playerId || rawMom?.id || rawMom?._id,
        team: rawMom?.team || "",
        role: rawMom?.role || (Array.isArray(rawMom?.statsType) ? rawMom.statsType.join(", ") : "Player"),
        avatar: rawMom?.avatar || "🏏",
        performance: {
          runs: rawMom?.contributions?.batting?.runs ?? rawMom?.performance?.runs ?? 0,
          balls: rawMom?.contributions?.batting?.balls ?? rawMom?.performance?.balls ?? 0,
          wickets: rawMom?.contributions?.bowling?.wickets ?? rawMom?.performance?.wickets ?? 0,
          economy: rawMom?.contributions?.bowling?.economy ?? rawMom?.performance?.economy ?? "0.0",
        },
      }
    : null;

  // Extract all batsmen from innings to get top batters
  const allBatters = [];
  let totalSixes = 0;
  let totalFours = 0;
  let totalWickets = 0;

  (matchData?.inning || []).forEach((inn) => {
    const teamTitle = inn?.batting?.battingTeam || "";
    (inn?.playedBatsman || []).forEach((b) => {
      totalSixes += b.sixes || 0;
      totalFours += b.fours || 0;
      allBatters.push({
        playerId: b?.playerId || b?.id || b?._id,
        name: b.name || b.username || "Batter",
        team: teamTitle,
        runs: b.runs ?? 0,
        balls: b.ballsFaced ?? 0,
        fours: b.fours ?? 0,
        sixes: b.sixes ?? 0,
        sr: b.sr ?? (b.ballsFaced ? ((b.runs / b.ballsFaced) * 100).toFixed(1) : 0),
      });
    });
    totalWickets += inn?.batting?.score?.wicket || 0;
  });
  allBatters.sort((a, b) => b.runs - a.runs);
  const topBatters = allBatters.slice(0, 3);

  // Extract all bowlers from innings to get top bowlers
  const allBowlers = [];
  (matchData?.inning || []).forEach((inn) => {
    const teamTitle = inn?.bowling?.teamName || "";
    (inn?.bowling?.allBowlers || inn?.bowling?.bowlers || []).forEach((b) => {
      allBowlers.push({
        playerId: b?.playerId || b?.id || b?._id,
        name: b.name || b.username || "Bowler",
        team: teamTitle,
        wickets: b.wicketsTaken ?? 0,
        runs: b.runsGiven ?? 0,
        overs: b.over || "0.0",
        economy: b.eco ?? "0.00",
      });
    });
  });
  allBowlers.sort((a, b) => (b.wickets - a.wickets) || (a.runs - b.runs));
  const topBowlers = allBowlers.slice(0, 3);

  const keyMoments = (matchData?.fallOfWickets || []).map((fow) => ({
    over: fow.teamOvers || "0.0",
    description: `${fow.batsman?.name || fow.batsman?.username || "Batter"} dismissed for ${fow.teamRuns || 0} runs`,
    batsman: fow.batsman,
    type: "wicket"
  }));

  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <ScrollView 
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
    >
      {/* Match Header */}
      <View 
        className={`p-6 ${isDark ? "bg-gray-800" : "bg-blue-50"} items-center`}
      >
        <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-blue-800"} mb-2`} style={{ lineHeight: 20 }}>
          {matchInfo.matchType}
        </ThemedText>
        
        <View className="flex-row justify-center items-center w-full mb-4">
          <View className="items-center flex-1">
            <ThemedText className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 28 }}>
              {matchInfo.team1.name}
            </ThemedText>
            <ThemedText className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 32 }}>
              {matchInfo.team1.score}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              ({matchInfo.team1.overs} Ov)
            </ThemedText>
          </View>
          
          <View className="mx-4 items-center">
            <ThemedText className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 24 }}>
              vs
            </ThemedText>
          </View>
          
          <View className="items-center flex-1">
            <ThemedText className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 28 }}>
              {matchInfo.team2.name}
            </ThemedText>
            <ThemedText className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 32 }}>
              {matchInfo.team2.score}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              ({matchInfo.team2.overs} Ov)
            </ThemedText>
          </View>
        </View>
        
        <View 
          className={`px-4 py-2 rounded-full ${isDark ? "bg-green-800" : "bg-green-100"}`}
        >
          <ThemedText className={`font-bold ${isDark ? "text-green-200" : "text-green-800"}`} style={{ lineHeight: 20 }}>
            {matchInfo.team1.result || `${matchInfo.team1.name} vs ${matchInfo.team2.name}`}
          </ThemedText>
        </View>
        
        <ThemedText className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
          {matchInfo.venue} • {matchInfo.date}
        </ThemedText>
      </View>

      {/* Man of the Match */}
      {Boolean(manOfTheMatch) ? (
        <Pressable 
          onPress={() => redirectToPlayerProfile(manOfTheMatch)}
          className={`p-6 mx-4 my-6 rounded-2xl border ${
            isDark ? "bg-amber-900/20 border-amber-700" : "bg-amber-100 border-amber-200"
          }`}
          style={{ elevation: 4 }}
        >
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1">
              <ThemedText className={`text-sm font-semibold ${
                isDark ? "text-amber-300" : "text-amber-700"
              }`} style={{ lineHeight: 20 }}>
                Player of the Match
              </ThemedText>
              <ThemedText className={`text-2xl font-bold mt-1 ${
                isDark ? "text-white" : "text-gray-900"
              }`} style={{ lineHeight: 32 }}>
                {manOfTheMatch.name || "Player"}
              </ThemedText>
              <ThemedText className={`mt-1 ${isDark ? "text-amber-200" : "text-amber-800"}`} style={{ lineHeight: 20 }}>
                {manOfTheMatch.team || ""} • {manOfTheMatch.role || "All-rounder"}
              </ThemedText>
            </View>
            
            <View className={`w-14 h-14 rounded-full items-center justify-center ${
              isDark ? "bg-amber-800" : "bg-amber-200"
            }`}>
              <ThemedText className="text-2xl">{manOfTheMatch.avatar || "🏏"}</ThemedText>
            </View>
          </View>
          
          <View className="flex-row justify-between" style={{ marginHorizontal: -4 }}>
            <StatBadge 
              value={manOfTheMatch.performance?.runs ?? 0} 
              label="Runs" 
              color={isDark ? "#fbbf24" : "#f59e0b"} 
              isDark={isDark}
            />
            <StatBadge 
              value={manOfTheMatch.performance?.balls ?? 0} 
              label="Balls" 
              color={isDark ? "#fbbf24" : "#f59e0b"} 
              isDark={isDark}
            />
            <StatBadge 
              value={manOfTheMatch.performance?.wickets ?? 0} 
              label="Wickets" 
              color={isDark ? "#fbbf24" : "#f59e0b"} 
              isDark={isDark}
            />
            <StatBadge 
              value={manOfTheMatch.performance?.economy ?? "0.0"} 
              label="Economy" 
              color={isDark ? "#fbbf24" : "#f59e0b"} 
              isDark={isDark}
            />
          </View>
        </Pressable>
      ) : null}

      {/* Top Performers Section */}
      <View className="px-4 pb-6">
        <ThemedText className={`text-xl font-bold mb-4 px-2 ${
          isDark ? "text-white" : "text-gray-900"
        }`} style={{ lineHeight: 28 }}>
          Top Performers
        </ThemedText>

        {/* Top Batters */}
        <PerformanceCard 
          title="Top Batters"
          isExpanded={expandedSection === 'batters'}
          onPress={() => toggleSection('batters')}
          isDark={isDark}
        >
          {topBatters.length > 0 ? (
            topBatters.map((batter, index) => (
              <View
                key={index}
                className={`flex-row justify-between items-center py-3 ${
                  index < topBatters.length - 1 ? (isDark ? "border-b border-gray-700" : "border-b border-gray-200") : ""
                }`}
              >
                <Pressable className="flex-1" onPress={() => redirectToPlayerProfile(batter)}>
                  <ThemedText className={`font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`} style={{ lineHeight: 20 }}>
                    {batter.name}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                    {batter.team}
                  </ThemedText>
                </Pressable>
                
                <View className="flex-row">
                  <View className="items-center mr-4">
                    <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                      {batter.runs}
                    </ThemedText>
                    <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                      Runs
                    </ThemedText>
                  </View>
                  
                  <View className="items-center mr-4">
                    <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                      {batter.sr}
                    </ThemedText>
                    <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                      SR
                    </ThemedText>
                  </View>
                  
                  <View className="items-center">
                    <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                      {batter.fours}/{batter.sixes}
                    </ThemedText>
                    <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                      4s/6s
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <ThemedText className={`p-4 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              No batting stats available
            </ThemedText>
          )}
        </PerformanceCard>

        {/* Top Bowlers */}
        <PerformanceCard 
          title="Top Bowlers"
          isExpanded={expandedSection === 'bowlers'}
          onPress={() => toggleSection('bowlers')}
          isDark={isDark}
        >
          {topBowlers.length > 0 ? (
            topBowlers.map((bowler, index) => (
              <View
                key={index}
                className={`flex-row justify-between items-center py-3 ${
                  index < topBowlers.length - 1 ? (isDark ? "border-b border-gray-700" : "border-b border-gray-200") : ""
                }`}
              >
                <Pressable className="flex-1" onPress={() => redirectToPlayerProfile(bowler)}>
                  <ThemedText className={`font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`} style={{ lineHeight: 20 }}>
                    {bowler.name}
                  </ThemedText>
                  <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                    {bowler.team}
                  </ThemedText>
                </Pressable>
                
                <View className="flex-row">
                  <View className="items-center mr-4">
                    <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                      {bowler.wickets}
                    </ThemedText>
                    <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                      Wkts
                    </ThemedText>
                  </View>
                  
                  <View className="items-center mr-4">
                    <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                      {bowler.runs}
                    </ThemedText>
                    <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                      Runs
                    </ThemedText>
                  </View>
                  
                  <View className="items-center">
                    <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                      {bowler.economy}
                    </ThemedText>
                    <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 16 }}>
                      Econ
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <ThemedText className={`p-4 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              No bowling stats available
            </ThemedText>
          )}
        </PerformanceCard>

        {/* Key Moments */}
        <PerformanceCard 
          title="Key Moments"
          isExpanded={expandedSection === 'moments'}
          onPress={() => toggleSection('moments')}
          isDark={isDark}
        >
          {keyMoments.length > 0 ? (
            keyMoments.map((moment, index) => (
              <View
                key={index}
                className={`flex-row items-start py-3 ${
                  index < keyMoments.length - 1 ? (isDark ? "border-b border-gray-700" : "border-b border-gray-200") : ""
                }`}
              >
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                  isDark ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                    {moment.over}
                  </ThemedText>
                </View>
                
                <View className="flex-1">
                  <ThemedText className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 20 }}>
                    {moment.description}
                  </ThemedText>
                  <ThemedText className={`text-xs mt-1 ${
                    moment.type === 'milestone' ? (isDark ? "text-green-400" : "text-green-700") :
                    moment.type === 'breakthrough' ? (isDark ? "text-blue-400" : "text-blue-700") :
                    moment.type === 'wicket' ? (isDark ? "text-red-400" : "text-red-700") :
                    (isDark ? "text-purple-400" : "text-purple-700")
                  }`} style={{ lineHeight: 16 }}>
                    {moment.type.charAt(0).toUpperCase() + moment.type.slice(1)}
                  </ThemedText>
                </View>
              </View>
            ))
          ) : (
            <ThemedText className={`p-4 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              No key moments recorded
            </ThemedText>
          )}
        </PerformanceCard>
      </View>

      {/* Match Statistics */}
      <View 
        className={`p-6 mx-4 my-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"}`}
        style={{ elevation: 2 }}
      >
        <ThemedText className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`} style={{ lineHeight: 24 }}>
          Match Statistics
        </ThemedText>
        
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <ThemedText className={`text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`} style={{ lineHeight: 32 }}>
              {totalSixes}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              Sixes
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className={`text-2xl font-bold ${isDark ? "text-green-400" : "text-green-600"}`} style={{ lineHeight: 32 }}>
              {totalFours}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              Fours
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className={`text-2xl font-bold ${isDark ? "text-red-400" : "text-red-600"}`} style={{ lineHeight: 32 }}>
              {totalWickets}
            </ThemedText>
            <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ lineHeight: 20 }}>
              Wickets
            </ThemedText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
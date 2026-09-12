import React from "react";
import { View, Text, useColorScheme, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ThemedText from "../custom/ThemedText";
import SCREENS from "@/screens";

import { calculateCRR } from "@/utils";

export default function MatchOverview({ 
  team = "Team A", 
  score = "0/0", 
  overs = "0.0 Ov", 
  crr, 
  projjectedScore,
  matchStatus = "Live", 
  result, 
  motm,
  isSuperOverEnded = false,
  inning1 = null,
  inning2 = null,
  superOverSummary = "",
  superOverList = [],
}) {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-800';
  const labelColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  
  // Safe extraction of team name
  const teamName = typeof team === "string" 
    ? team 
    : (team?.title || team?.name || "Team");

  // Safe extraction of score and overs
  const scoreText = typeof score === "string" 
    ? score 
    : typeof score === "number" 
    ? String(score) 
    : `${score?.runs ?? 0}/${score?.wicket ?? 0}`;

  const oversText = typeof overs === "string" 
    ? overs 
    : typeof overs === "number" 
    ? `${overs} Ov` 
    : `${overs?.over || "0.0"} Ov`;

  // Safe extraction / recalculation of CRR
  const runsVal = typeof score === "object" ? score?.runs : parseInt(String(score).split("/")[0], 10);
  const oversClean = String(oversText).replace(/\s*ov/i, "").trim();
  const computedCrr = calculateCRR(runsVal, oversClean);
  const crrText = (computedCrr && computedCrr !== "0.00")
    ? computedCrr
    : ((crr !== undefined && crr !== null && typeof crr !== "object") ? String(crr) : "");
  const projText = (projjectedScore !== undefined && projjectedScore !== null && typeof projjectedScore !== "object") ? String(projjectedScore) : "";

  // Safe extraction of result
  const resultText = typeof result === "string" 
    ? result 
    : (result?.prompt || result?.description || result?.message || "");

  // Safe extraction of Man of the Match
  const momName = typeof motm === "string" 
    ? motm 
    : (motm?.name || motm?.playerName || "");
  const momPoints = motm?.totalPoints ?? motm?.points;
  const momPerformance = typeof motm?.performance === "string" 
    ? motm.performance 
    : typeof motm?.performance === "object" && motm.performance !== null
    ? Object.entries(motm.performance).map(([k, v]) => `${k}: ${v}`).join(", ")
    : "";

  const statusColor = 
    matchStatus === "Live" 
      ? "text-red-500" 
      : matchStatus === "Upcoming" 
      ? "text-blue-500" 
      : "text-emerald-500";

  return (
    <View className={`p-4 ${bgColor}`}>
      {/* Team name and match status */}
      <View className="flex-row justify-between items-center mb-2">
        <ThemedText className={`text-lg font-semibold ${textColor}`} numberOfLines={1}>
          {isSuperOverEnded && inning1?.teamName && inning2?.teamName
            ? `${inning1.teamName} vs ${inning2.teamName}`
            : teamName}
        </ThemedText>
        {matchStatus ? (
          <ThemedText className={`${statusColor} font-bold`}>{matchStatus}</ThemedText>
        ) : null}
      </View>

      {/* When match went to Super Over and has ended: show Inning 1 & Inning 2 scores */}
      {isSuperOverEnded && inning1 && inning2 ? (
        <View className="my-1.5 py-1 border-y border-dashed border-gray-200 dark:border-gray-700/60">
          {/* Inning 1 */}
          <View className="flex-row justify-between items-center py-1">
            <View className="flex-row items-center flex-1 mr-2">
              <ThemedText className={`text-base font-semibold ${textColor}`} numberOfLines={1}>
                {inning1.teamName}
              </ThemedText>
              <View className={`ml-2 px-1.5 py-0.5 rounded ${colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <ThemedText className={`text-[10px] font-bold ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Inn 1
                </ThemedText>
              </View>
            </View>
            <View className="flex-row items-baseline">
              <ThemedText className={`text-xl font-bold ${textColor}`}>
                {inning1.score}
              </ThemedText>
              <ThemedText className={`ml-1.5 text-xs font-medium ${labelColor}`}>
                ({inning1.overs})
              </ThemedText>
            </View>
          </View>

          {/* Inning 2 */}
          <View className="flex-row justify-between items-center py-1">
            <View className="flex-row items-center flex-1 mr-2">
              <ThemedText className={`text-base font-semibold ${textColor}`} numberOfLines={1}>
                {inning2.teamName}
              </ThemedText>
              <View className={`ml-2 px-1.5 py-0.5 rounded ${colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <ThemedText className={`text-[10px] font-bold ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Inn 2
                </ThemedText>
              </View>
            </View>
            <View className="flex-row items-baseline">
              <ThemedText className={`text-xl font-bold ${textColor}`}>
                {inning2.score}
              </ThemedText>
              <ThemedText className={`ml-1.5 text-xs font-medium ${labelColor}`}>
                ({inning2.overs})
              </ThemedText>
            </View>
          </View>
        </View>
      ) : (
        /* Regular single inning score (during live or standard) */
        <View className="flex-row items-baseline">
          <ThemedText className={`text-3xl font-bold ${textColor}`}>{scoreText}</ThemedText>
          <ThemedText className={`ml-2 text-base font-medium ${textColor}`}>({oversText})</ThemedText>
        </View>
      )}

      {/* Super Over summary badges if ended */}
      {isSuperOverEnded && (superOverList?.length > 0 || superOverSummary) ? (
        <View className="mt-2 gap-1.5 self-start">
          {(superOverList?.length > 0 ? superOverList : [{ summary: superOverSummary }]).map((so, idx) => (
            <View key={idx} className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30">
              <ThemedText className="text-xs font-bold text-amber-500">
                ⚡ {so.summary || so}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {/* CRR and Projected Score (if regular live match) */}
      {!isSuperOverEnded && (crrText || projText) ? (
        <ThemedText className={`text-base mt-2 ${textColor}`}>
          {crrText ? <>CRR <ThemedText className="font-bold">{crrText}</ThemedText></> : null}
          {crrText && projText ? "  •  " : ""}
          {projText ? <>PROJ. SCORE <ThemedText className="font-bold">{projText}</ThemedText></> : null}
        </ThemedText>
      ) : null}

      {/* Match Result */}
      {resultText ? (
        <View className={isSuperOverEnded ? "mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 self-start" : "mt-2"}>
          <ThemedText className={isSuperOverEnded ? "text-sm font-bold text-emerald-600 dark:text-emerald-400" : `font-medium ${textColor}`}>
            {isSuperOverEnded ? `🏆 ${resultText}` : resultText}
          </ThemedText>
        </View>
      ) : null}
      {/* Man of the Match */}
      {momName && matchStatus !== "Live" && matchStatus !== "Upcoming" && matchStatus !== "Innings Break" ? (
        <Pressable 
          onPress={() => {
            const momId = motm?.playerId || motm?._id || motm?.id;
            navigation.navigate(SCREENS.PlayerProfile, {
              playerId: momId,
              player: typeof motm === "object" ? {
                id: momId,
                _id: momId,
                name: momName,
                username: momName,
                ...motm,
              } : { name: momName },
              matchId: motm?.matchId || motm?.match?._id,
              match: motm?.match,
            });
          }}
          className="mt-3 active:opacity-80"
        >
          <ThemedText className={`font-semibold ${textColor}`}>
            Player of the Match: <ThemedText className="font-bold text-amber-500 underline">{momName}</ThemedText>
            {momPerformance ? ` • ${momPerformance}` : (momPoints ? ` • ${Math.round(momPoints)} pts` : "")}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}
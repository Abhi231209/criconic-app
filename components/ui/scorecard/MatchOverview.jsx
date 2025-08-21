import React from "react";
import { View, Text } from "react-native";
import ThemedText from "../custom/ThemedText";

export default function MatchOverview({ 
  team = "Team A", 
  score = "0/0", 
  overs = "0.0 Ov", 
  crr = "11.83", 
  matchStatus = "End", 
  result = "Thunder strikers win by 17 runs", 
  motm = "Shubham Jangra"
}) {
  return (
    <View className="rounded-md p-4 ">
      {/* Team name and match status */}
      <View className="flex-row justify-between items-center mb-2">
        <ThemedText className=" text-lg font-semibold">{team}</ThemedText>
        <ThemedText className="text-red-400 font-bold">{matchStatus}</ThemedText>
      </View>
      {/* Score and overs */}
      <View className="flex-row items-baseline">
        <ThemedText className=" text-3xl font-bold">{score}</ThemedText>
        <ThemedText className=" ml-2 text-base font-medium">({overs})</ThemedText>
      </View>
      {/* CRR */}
      <ThemedText className=" text-base mt-2">
        CRR <ThemedText className="font-bold">{crr}</ThemedText>
      </ThemedText>
      {/* Match Result */}
      <ThemedText className=" mt-1">{result}</ThemedText>
      {/* Man of the Match */}
      <ThemedText className=" mt-3 font-semibold">
        Man of the Match: <ThemedText className="font-bold">{motm}</ThemedText>
      </ThemedText>
    </View>
  );
}

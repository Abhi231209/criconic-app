import React from "react";
import { View, Text, useColorScheme } from "react-native";
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
  const colorScheme = useColorScheme();
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-800';
  const labelColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  
  return (
    <View className={`p-4 ${bgColor}`}>
      {/* Team name and match status */}
      <View className="flex-row justify-between items-center mb-2">
        <ThemedText className={`text-lg font-semibold ${textColor}`}>{team}</ThemedText>
        <ThemedText className="text-red-400 font-bold">{matchStatus}</ThemedText>
      </View>
      {/* Score and overs */}
      <View className="flex-row items-baseline">
        <ThemedText className={`text-3xl font-bold ${textColor}`}>{score}</ThemedText>
        <ThemedText className={`ml-2 text-base font-medium ${textColor}`}>({overs})</ThemedText>
      </View>
      {/* CRR */}
      <ThemedText className={`text-base mt-2 ${textColor}`}>
        CRR <ThemedText className="font-bold">{crr}</ThemedText>
      </ThemedText>
      {/* Match Result */}
      <ThemedText className={`mt-1 ${textColor}`}>{result}</ThemedText>
      {/* Man of the Match */}
      <ThemedText className={`mt-3 font-semibold ${textColor}`}>
        Man of the Match: <ThemedText className="font-bold">{motm}</ThemedText>
      </ThemedText>
    </View>
  );
}
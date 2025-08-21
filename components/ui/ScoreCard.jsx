import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import ThemedText from "./custom/ThemedText";
import { MATCH_STATUS, getMatchStatusDisplay, getStatusClass } from "@/utils";
import SCREENS from "@/screens";

export default function ScoreCard({
  matchId,
  startDate,
  isMatch = true,
  smallBanner = false,
}) {
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const navigation = useNavigation();

  // Dummy data for now
  const score = {
    matchCurrentStatus: "INNINGS_II",
    tournament: { title: "Crionic Premier League 2025" },
    roundType: "Semi Final",
    teams: [
      { teamId: "team1", title: "Super Strikers" },
      { teamId: "team2", title: "Power Hitters" },
    ],
    matchResult: { winningTeam: null, prompt: "" },
    description: "Exciting battle underway!",
  };

  const matchStatus = getMatchStatusDisplay(
    score.matchCurrentStatus,
    MATCH_STATUS
  );
  const statusStyle = getStatusClass(matchStatus);

  // ✅ This is the content we’ll pass to the global sheet
  const BottomSheetContent = () => (
    <View style={{ flex: 1 }}>
      <ThemedText style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
        Match Options
      </ThemedText>

      <TouchableOpacity
        style={{
          backgroundColor: "#007AFF",
          padding: 16,
          borderRadius: 8,
          marginBottom: 12,
        }}
        onPress={() => {
          closeBottomSheet();
          navigation.navigate("MatchScore", { matchId });
        }}
      >
        <ThemedText style={{ color: "white", textAlign: "center", fontWeight: "600" }}>
          View Full Score
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: "#FF3B30",
          padding: 16,
          borderRadius: 8,
          marginBottom: 12,
        }}
        onPress={() => {
          Alert.alert("Delete Match", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", onPress: () => closeBottomSheet() },
          ]);
        }}
      >
        <ThemedText style={{ color: "white", textAlign: "center", fontWeight: "600" }}>
          Delete Match
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: "#8E8E93",
          padding: 16,
          borderRadius: 8,
        }}
        onPress={closeBottomSheet}
      >
        <ThemedText style={{ color: "white", textAlign: "center", fontWeight: "600" }}>
          Close
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  const onCardPress = () => {
    console.log("Card pressed, opening bottom sheet");
    navigation.navigate(SCREENS.MatchScoreCard);
    // ✅ Open global bottom sheet with dynamic content
    // openBottomSheet(<BottomSheetContent />, ["30%", "60%"]);
  };

  return (
    <View
      className={`rounded-xl text-black bg-white shadow-md overflow-hidden w-72 mb-4 ${
        loading ? "opacity-70" : "opacity-100"
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginHorizontal: 3,
        marginVertical: 3,
      }}
    >
      <TouchableOpacity
        onPress={onCardPress}
        activeOpacity={0.9}
        className="p-5"
      >
        {/* Status Badge */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="px-3 py-1.5 bg-black/10 rounded-full">
            <ThemedText className={`text-xs font-medium ${statusStyle}`}>
              {matchStatus.toUpperCase()}
            </ThemedText>
          </View>
          {loading && (
            <ActivityIndicator size="small" color={isDark ? "#fff" : "#000"} />
          )}
        </View>

        {/* Match Info */}
        <View className="mb-4">
          <ThemedText className="text-sm font-medium mb-1">
            {score.tournament?.title}
          </ThemedText>
          <ThemedText className="text-xs ">
            {score.roundType} • {startDate}
          </ThemedText>
        </View>

        {/* Teams & Scores */}
        <View className="space-y-3">
          {score.teams?.map((team, idx) => (
            <View
              key={`team-${idx}`}
              className="flex-row justify-between items-center"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 rounded-full bg-white/10 mr-3 flex items-center justify-center">
                  <Image
                    source={require("../../assets/stadium-background-image.jpg")}
                    className="w-6 h-6 rounded-full"
                  />
                </View>
                <ThemedText className="text-base font-medium ">
                  {team.title}
                </ThemedText>
              </View>
              <View className="w-12">
                <ThemedText className="text-lg font-bold text-right">
                  0-0
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Match Result */}
        {score.matchResult?.prompt || score.description ? (
          <View className="mt-4 pt-3 border-t border-white/10">
            <ThemedText className="text-xs ">
              {score.matchResult?.prompt || score.description}
            </ThemedText>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

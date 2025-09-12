import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";

export default function CreateMatch() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [teamASquad, setTeamASquad] = useState([]);
  const [teamBSquad, setTeamBSquad] = useState([]);

  const handleTeamSelection = (teamType) => {
    navigation.navigate(SCREENS.SelectTeamScreen, {
      teamType,
      onTeamSelect: (team) => {
        if (teamType === "teamA") {
          setTeamA(team);
        } else {
          setTeamB(team);
        }
      },
      onSquadSelect: (team, squad, teamType) => {
        if (teamType === "teamA") {
          setTeamASquad(squad);
        } else {
          setTeamBSquad(squad);
        }
      }
    });
  };

  const handleContinue = () => {
    if (teamA && teamB && teamASquad.length > 0 && teamBSquad.length > 0) {
      navigation.navigate(SCREENS.MatchDetailsScreen, {
        teamA,
        teamB,
        teamASquad,
        teamBSquad
      });
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header */}
      <View
        className={`px-4 py-4 border-b flex-row items-center ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 mr-2"
        >
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          Create Match
        </ThemedText>
      </View>

      <ScrollView className="flex-1 p-4">
        <ThemedText className="text-lg font-bold text-center mb-6 text-gray-900 dark:text-white">
          Select Teams
        </ThemedText>

        {/* Team A Selection */}
        <View className="mb-8">
          <ThemedText className="text-lg font-semibold mb-3 text-center text-gray-900 dark:text-white">
            Team A
          </ThemedText>
          
          <TouchableOpacity
            onPress={() => handleTeamSelection("teamA")}
            className={`p-6 rounded-xl mb-3 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm items-center justify-center border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            {teamA ? (
              <View className="items-center">
                <ThemedText className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                  {teamA.name}
                </ThemedText>
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                  {teamASquad.length} players selected
                </ThemedText>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons
                  name="add-circle"
                  size={24}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  style={{ marginRight: 8 }}
                />
                <ThemedText className="text-gray-900 dark:text-gray-100">
                  Select Team A
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* VS Separator */}
        <View className="items-center my-4">
          <View
            className={`w-12 h-12 rounded-full items-center justify-center ${
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <ThemedText className="font-bold text-lg text-gray-900 dark:text-white">
              VS
            </ThemedText>
          </View>
        </View>

        {/* Team B Selection */}
        <View className="mb-8">
          <ThemedText className="text-lg font-semibold mb-3 text-center text-gray-900 dark:text-white">
            Team B
          </ThemedText>
          
          <TouchableOpacity
            onPress={() => handleTeamSelection("teamB")}
            className={`p-6 rounded-xl mb-3 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm items-center justify-center border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            {teamB ? (
              <View className="items-center">
                <ThemedText className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                  {teamB.name}
                </ThemedText>
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                  {teamBSquad.length} players selected
                </ThemedText>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons
                  name="add-circle"
                  size={24}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  style={{ marginRight: 8 }}
                />
                <ThemedText className="text-gray-900 dark:text-gray-100">
                  Select Team B
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!teamA || !teamB || teamASquad.length === 0 || teamBSquad.length === 0}
          className={`p-4 rounded-xl mt-8 ${
            (!teamA || !teamB || teamASquad.length === 0 || teamBSquad.length === 0)
              ? "bg-gray-400"
              : "bg-blue-500"
          }`}
        >
          <ThemedText className="text-white text-center text-lg font-semibold">
            Continue to Match Details
          </ThemedText>
        </TouchableOpacity>

        {/* Status Message */}
        {(!teamA || !teamB || teamASquad.length === 0 || teamBSquad.length === 0) && (
          <View className="mt-4 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
            <ThemedText className="text-yellow-800 dark:text-yellow-200 text-center">
              {!teamA && !teamB && "Select both teams to continue"}
              {teamA && !teamB && "Select Team B to continue"}
              {!teamA && teamB && "Select Team A to continue"}
              {teamA && teamB && teamASquad.length === 0 && "Select squad for Team A to continue"}
              {teamA && teamB && teamBSquad.length === 0 && "Select squad for Team B to continue"}
              {teamA && teamB && teamASquad.length === 0 && teamBSquad.length === 0 && "Select squads for both teams to continue"}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
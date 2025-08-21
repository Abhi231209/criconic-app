import React, { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Header from "./Header";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MatchOverview from "./MatchOverview";
import TabSwitch from "../custom/TabSwitch";
import MatchInfo from "./MatchInfo";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function MatchScoreCard({
  matchID,
  hideHeader,
  setStreamUrl,
  seoData = {},
}) {
  const navigation = useNavigation();

  // Sample hardcoded score data structure
  const [score, setScore] = useState({
    inning: [
      {
        batting: {
          score: {
            runs: 73,
            wicket: 2,
            over: "6.0",
          },
          batsman: [
            {
              name: "Shubham Jangra",
              runs: 53,
              ballsFaced: 23,
              fours: 2,
              sixes: 7,
              notOut: true,
              isStrikeEnd: false,
              sr: "230.43",
            },
            {
              name: "Dhiraj",
              runs: 1,
              ballsFaced: 1,
              fours: 0,
              sixes: 0,
              notOut: true,
              isStrikeEnd: true,
              sr: "100.0",
            },
          ],
        },
        bowling: {
          teamName: "Thunder strikers",
          allBowlers: [
            {
              name: "Shubham Jangra",
              balls: 12,
              runsGiven: 5,
              wicketsTaken: 2,
              economy: 2.5,
            },
            {
              name: "Harsh Soni",
              balls: 11,
              runsGiven: 14,
              wicketsTaken: 0,
              economy: 7.64,
            },
          ],
        },
      },
      {
        batting: {
          score: {
            runs: 36,
            wicket: 2,
            over: "4.5",
          },
          batsman: [
            {
              name: "Mohit poonia",
              runs: 17,
              ballsFaced: 11,
              fours: 1,
              sixes: 2,
              notOut: true,
              isStrikeEnd: true,
              sr: "154.55",
            },
            {
              name: "Abhishek Dhull",
              runs: 9,
              ballsFaced: 8,
              fours: 2,
              sixes: 0,
              notOut: true,
              isStrikeEnd: false,
              sr: "112.50",
            },
          ],
        },
        bowling: {
          teamName: "Epic blasters",
          allBowlers: [
            {
              name: "Prajjwal Khatri",
              balls: 12,
              runsGiven: 30,
              wicketsTaken: 0,
              economy: 15.0,
            },
            {
              name: "Mohit poonia",
              balls: 6,
              runsGiven: 8,
              wicketsTaken: 1,
              economy: 8,
            },
          ],
        },
      },
    ],
    isLoading: false,
    title: "Team 1 vs Team 2",
    batting: {
      battingTeam: "Team 1",
      score: {
        runs: 150,
        wicket: 4,
        over: "20.0"
      }
    }
  });

  // Defensive render if loading
  if (score.isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  const tabs = [
    {
      label: "Info",
      content: <MatchInfo score={score} />,
    },
    {
      label: "Stats",
      content: (
        <View className="p-4">
          <Text className="text-lg font-bold">📋 Match Statistics</Text>
          <Text className="mt-2">Some introduction or summary goes here.</Text>
        </View>
      ),
    },
    {
      label: "Players",
      content: (
        <View className="p-4">
          <Text className="text-lg font-bold">👥 Player List</Text>
          <Text className="mt-2">1. John Doe</Text>
          <Text>2. Alex Smith</Text>
          <Text>3. Rahul Kumar</Text>
        </View>
      ),
    },
    {
      label: "Settings",
      content: (
        <View className="p-4">
          <Text className="text-lg font-bold">⚙️ Settings</Text>
          <Text className="mt-2">Toggle Dark Mode</Text>
          <Text>Manage Notifications</Text>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['right', 'left']}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          {!hideHeader && (
            <Header description={score?.title || "Team 1 vs Team 2"} />
          )}
          
          <MatchOverview
            team={score?.batting?.battingTeam}
            score={
              (score?.batting?.score?.runs || "0") + "/" + (score?.batting?.score?.wicket || 0)
            }
            overs={(score?.batting?.score?.over || "0.0") + " " + "Ov"}
            crr={score?.batting?.score?.CRR}
            projjectedScore={score?.batting?.score?.projectedScore}
            matchStatus="End"
            result={score?.matchResult?.prompt}
            motm={score?.mom}
          />

          <TabSwitch tabs={tabs} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
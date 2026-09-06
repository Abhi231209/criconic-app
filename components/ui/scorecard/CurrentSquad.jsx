import React, { useState } from "react";
import { View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, { 
  FadeIn, 
  FadeInDown, 
  SlideInRight
} from "react-native-reanimated";
import { 
  Ionicons, 
  MaterialIcons, 
  MaterialCommunityIcons
} from '@expo/vector-icons';
import ThemedText from "../custom/ThemedText";
import { useColorScheme } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  // HARDCODED SAMPLE SQUAD DATA - COMMENTED OUT (API ONLY)
  /*
  // Sample squad data
  const team1 = {
    name: "WF-W",
    shortName: "WF",
    players: [
      { id: 1, name: "Alyssa Healy", role: "WK-Batsman", isCaptain: true, isWicketKeeper: true, battingStyle: "Right Handed", bowlingStyle: "N/A", matches: 124, runs: 3210, wickets: 0 },
      { id: 2, name: "Beth Mooney", role: "Batsman", isCaptain: false, isWicketKeeper: true, battingStyle: "Left Handed", bowlingStyle: "N/A", matches: 98, runs: 2780, wickets: 0 },
      { id: 3, name: "Ellyse Perry", role: "All-rounder", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Fast", matches: 145, runs: 3450, wickets: 162 },
      { id: 4, name: "Ash Gardner", role: "All-rounder", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Offbreak", matches: 87, runs: 1560, wickets: 92 },
      { id: 5, name: "Tahlia McGrath", role: "All-rounder", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Medium", matches: 65, runs: 1230, wickets: 45 },
      { id: 6, name: "Jess Jonassen", role: "Bowler", isCaptain: false, isWicketKeeper: false, battingStyle: "Left Handed", bowlingStyle: "Slow Left Arm Orthodox", matches: 112, runs: 780, wickets: 145 },
      { id: 7, name: "Megan Schutt", role: "Bowler", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Fast Medium", matches: 132, runs: 320, wickets: 187 },
    ]
  };

  const team2 = {
    name: "BP-W",
    shortName: "BP",
    players: [
      { id: 8, name: "Sophie Devine", role: "All-rounder", isCaptain: true, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Medium", matches: 138, runs: 3560, wickets: 112 },
      { id: 9, name: "Suzie Bates", role: "Batsman", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Medium", matches: 162, runs: 5120, wickets: 45 },
      { id: 10, name: "Amelia Kerr", role: "All-rounder", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Legbreak Googly", matches: 92, runs: 1870, wickets: 98 },
      { id: 11, name: "Sophia Dunkley", role: "Batsman", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Medium", matches: 65, runs: 1340, wickets: 12 },
      { id: 12, name: "Lea Tahuhu", role: "Bowler", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Fast", matches: 118, runs: 450, wickets: 132 },
      { id: 13, name: "Issy Wong", role: "Bowler", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Right Arm Fast", matches: 42, runs: 120, wickets: 56 },
      { id: 14, name: "Sarah Glenn", role: "Bowler", isCaptain: false, isWicketKeeper: false, battingStyle: "Right Handed", bowlingStyle: "Legbreak Googly", matches: 78, runs: 230, wickets: 102 },
    ]
  };
  */

  const squadTeam1 = score?.teams?.[0] || {};
  const squadTeam2 = score?.teams?.[1] || {};

  const team1 = {
    name: squadTeam1.title || "Team 1",
    shortName: squadTeam1.shortName || (typeof squadTeam1.title === 'string' ? squadTeam1.title.substring(0, 3).toUpperCase() : "T1"),
    players: (squadTeam1.players || []).map((p, idx) => ({
      id: p.id || p._id || idx + 1,
      name: p.username || p.name || "Player",
      role: p.role || "Player",
      isCaptain: p.isCaptain || false,
      isWicketKeeper: p.isWicketKeeper || false,
      battingStyle: p.battingStyle || "Right Handed",
      bowlingStyle: p.bowlingStyle || "Right Arm",
      matches: p.matches || 0,
      runs: p.runs || 0,
      wickets: p.wickets || 0,
    })),
  };

  const team2 = {
    name: squadTeam2.title || "Team 2",
    shortName: squadTeam2.shortName || (typeof squadTeam2.title === 'string' ? squadTeam2.title.substring(0, 3).toUpperCase() : "T2"),
    players: (squadTeam2.players || []).map((p, idx) => ({
      id: p.id || p._id || idx + 100,
      name: p.username || p.name || "Player",
      role: p.role || "Player",
      isCaptain: p.isCaptain || false,
      isWicketKeeper: p.isWicketKeeper || false,
      battingStyle: p.battingStyle || "Right Handed",
      bowlingStyle: p.bowlingStyle || "Right Arm",
      matches: p.matches || 0,
      runs: p.runs || 0,
      wickets: p.wickets || 0,
    })),
  };

  const currentTeam = activeTeam === "team1" ? team1 : team2;

  // Filter players based on role
  const filteredPlayers = (currentTeam?.players || []).filter(player => {
    if (activeRole === "all") return true;
    if (activeRole === "batsmen") return (player.role || "").includes("Batsman");
    if (activeRole === "allRounders") return (player.role || "") === "All-rounder";
    if (activeRole === "bowlers") return (player.role || "") === "Bowler";
    if (activeRole === "wicketKeepers") return player.isWicketKeeper;
    return true;
  });

  const TeamButton = ({ team, label, isActive }) => (
    <Pressable
      onPress={() => setActiveTeam(team)}
      className={`flex-1 py-3 rounded-lg mx-1 items-center ${
        isActive 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700" : "bg-gray-200")
      }`}
    >
      <ThemedText className={`font-medium ${
        isActive ? "text-white" : (isDark ? "text-gray-300" : "text-gray-700")
      }`}>
        {label}
      </ThemedText>
    </Pressable>
  );

  const RoleButton = ({ value, label, icon, isActive }) => (
    <Pressable
      onPress={() => setActiveRole(value)}
      className={`flex-row items-center py-2 px-4 rounded-full mx-1 mb-2 ${
        isActive 
          ? (isDark ? "bg-blue-600" : "bg-blue-500") 
          : (isDark ? "bg-gray-700" : "bg-gray-200")
      }`}
    >
      {icon && (
        <MaterialIcons 
          name={icon} 
          size={16} 
          color={isActive ? "#fff" : (isDark ? "#94a3b8" : "#64748b")} 
          style={{ marginRight: 4 }}
        />
      )}
      <ThemedText className={`text-xs font-medium ${
        isActive ? "text-white" : (isDark ? "text-gray-300" : "text-gray-700")
      }`}>
        {label}
      </ThemedText>
    </Pressable>
  );

  const getRoleIcon = (role) => {
    if (role.includes("Batsman")) return "person";
    if (role === "All-rounder") return "all-inclusive";
    if (role === "Bowler") return "sports-baseball";
    return "person";
  };

  const getRoleColor = (role) => {
    if (role.includes("Batsman")) return isDark ? "#10b981" : "#059669";
    if (role === "All-rounder") return isDark ? "#f59e0b" : "#d97706";
    if (role === "Bowler") return isDark ? "#3b82f6" : "#2563eb";
    return isDark ? "#94a3b8" : "#64748b";
  };

  const PlayerCard = ({ player }) => (
    <View className={`p-4 rounded-lg mb-3 ${isDark ? "bg-gray-800" : "bg-white"}`}>
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {player.name}
            </ThemedText>
            {player.isCaptain && (
              <View className={`ml-2 px-2 py-1 rounded-full ${isDark ? "bg-amber-900/30" : "bg-amber-100"}`}>
                <ThemedText className={`text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                  Captain
                </ThemedText>
              </View>
            )}
            {player.isWicketKeeper && (
              <View className={`ml-2 px-2 py-1 rounded-full ${isDark ? "bg-green-900/30" : "bg-green-100"}`}>
                <ThemedText className={`text-xs ${isDark ? "text-green-300" : "text-green-700"}`}>
                  WK
                </ThemedText>
              </View>
            )}
          </View>
          
          <View className="flex-row items-center mt-2">
            <MaterialIcons 
              name={getRoleIcon(player.role)} 
              size={16} 
              color={getRoleColor(player.role)} 
            />
            <ThemedText className={`ml-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {player.role}
            </ThemedText>
          </View>
        </View>
        
        <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
          <ThemedText className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            {player.id}
          </ThemedText>
        </View>
      </View>
      
      <View className={`h-px my-3 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
      
      <View className="flex-row justify-between">
        <View className="flex-1">
          <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Batting
          </ThemedText>
          <ThemedText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            {player.battingStyle}
          </ThemedText>
        </View>
        
        <View className="flex-1">
          <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Bowling
          </ThemedText>
          <ThemedText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            {player.bowlingStyle}
          </ThemedText>
        </View>
        
        <View className="flex-1 items-end">
          <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Matches
          </ThemedText>
          <ThemedText className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
            {player.matches}
          </ThemedText>
        </View>
      </View>
      
      <View className="flex-row justify-between mt-3">
        <View className="flex-1">
          <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Runs
          </ThemedText>
          <ThemedText className={`text-sm font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
            {player.runs}
          </ThemedText>
        </View>
        
        <View className="flex-1 items-end">
          <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Wickets
          </ThemedText>
          <ThemedText className={`text-sm font-medium ${isDark ? "text-blue-400" : "text-blue-600"}`}>
            {player.wickets}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className={`p-4 ${isDark ? "bg-gray-800" : "bg-blue-50"} border-b ${
        isDark ? "border-gray-700" : "border-blue-100"
      }`}>
        <ThemedText className={`text-xl font-bold text-center ${isDark ? "text-white" : "text-gray-900"}`}>
          Squad Overview
        </ThemedText>
        <ThemedText className={`text-sm text-center mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Current playing squads for both teams
        </ThemedText>
      </View>

      {/* Team Selection */}
      <View className={`mx-4 mt-4 p-1 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
        <View className="flex-row">
          <TeamButton team="team1" label={team1.name} isActive={activeTeam === "team1"} />
          <TeamButton team="team2" label={team2.name} isActive={activeTeam === "team2"} />
        </View>
      </View>

      {/* Role Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className={`px-3 pt-4 ${isDark ? "bg-gray-900" : "bg-gray-100"}`}
      >
        <RoleButton value="all" label="All Players" icon="people" isActive={activeRole === "all"} />
        <RoleButton value="batsmen" label="Batsmen" icon="person" isActive={activeRole === "batsmen"} />
        <RoleButton value="allRounders" label="All-rounders" icon="all-inclusive" isActive={activeRole === "allRounders"} />
        <RoleButton value="bowlers" label="Bowlers" icon="sports-baseball" isActive={activeRole === "bowlers"} />
        <RoleButton value="wicketKeepers" label="Wicket Keepers" icon="sports-cricket" isActive={activeRole === "wicketKeepers"} />
      </ScrollView>

      {/* Player Count */}
      <View className={`px-4 py-3 ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
        <ThemedText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Showing {filteredPlayers.length} of {currentTeam.players.length} players
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
              key={player.id}
              entering={FadeInDown.delay(index * 50).duration(400)}
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
              {currentTeam.players.length}
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Captain
            </ThemedText>
            <ThemedText className={`text-sm font-medium ${isDark ? "text-amber-400" : "text-amber-600"}`}>
              {currentTeam.players.find(p => p.isCaptain)?.name}
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Wicket Keepers
            </ThemedText>
            <ThemedText className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {currentTeam.players.filter(p => p.isWicketKeeper).length}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}
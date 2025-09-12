import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export default function PlayerSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { 
    teamA, 
    teamB, 
    teamASquad, 
    teamBSquad, 
    matchDetails, 
    tossWinner, 
    tossDecision 
  } = route.params;
  
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // Determine batting and bowling teams based on toss decision
  const battingTeam = tossDecision === "Bat" ? tossWinner : (tossWinner.id === teamA.id ? teamB : teamA);
  const bowlingTeam = tossDecision === "Bowl" ? tossWinner : (tossWinner.id === teamA.id ? teamB : teamA);
  
  const battingSquad = battingTeam.id === teamA.id ? teamASquad : teamBSquad;
  const bowlingSquad = bowlingTeam.id === teamA.id ? teamASquad : teamBSquad;

  const [striker, setStriker] = useState(null);
  const [nonStriker, setNonStriker] = useState(null);
  const [bowler, setBowler] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const bottomSheetModalRef = useRef(null);
  const snapPoints = ['50%', '75%'];

  const openPlayerModal = (role) => {
    setSelectedRole(role);
    setIsModalVisible(true);
  };

  const closePlayerModal = () => {
    setIsModalVisible(false);
    setSelectedRole(null);
  };

  const selectPlayer = (player) => {
    switch (selectedRole) {
      case 'striker':
        setStriker(player);
        break;
      case 'nonStriker':
        setNonStriker(player);
        break;
      case 'bowler':
        setBowler(player);
        break;
    }
    closePlayerModal();
  };

  const handleStartMatch = () => {
    if (!striker || !nonStriker || !bowler) {
      alert("Please select all required players");
      return;
    }

    if (striker.id === nonStriker.id) {
      alert("Striker and Non-Striker cannot be the same player");
      return;
    }

    navigation.navigate(SCREENS.ScorerScreen, {
      teamA,
      teamB,
      teamASquad,
      teamBSquad,
      matchDetails,
      tossWinner,
      tossDecision,
      striker,
      nonStriker,
      bowler,
      battingTeam,
      bowlingTeam
    });
  };

  const getAvailablePlayers = () => {
    switch (selectedRole) {
      case 'striker':
        return battingSquad;
      case 'nonStriker':
        return battingSquad.filter(player => !striker || player.id !== striker.id);
      case 'bowler':
        return bowlingSquad;
      default:
        return [];
    }
  };

  const renderPlayerItem = (player) => {
    const isDisabled = selectedRole === 'nonStriker' && striker && striker.id === player.id;
    
    return (
      <TouchableOpacity
        onPress={() => !isDisabled && selectPlayer(player)}
        disabled={isDisabled}
        className={`p-4 rounded-xl mb-2 flex-row items-center ${
          isDisabled
            ? "bg-gray-300 dark:bg-gray-700 opacity-60"
            : isDarkMode
            ? "bg-gray-800"
            : "bg-white"
        }`}
      >
        <View className={`w-10 h-10 rounded-full mr-3 ${
          isDarkMode ? "bg-gray-700" : "bg-gray-200"
        } items-center justify-center`}>
          <ThemedText className="text-sm font-semibold text-gray-900 dark:text-white">
            {player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </ThemedText>
        </View>
        
        <View className="flex-1">
          <ThemedText className={`font-semibold ${
            isDisabled ? "text-gray-500" : "text-gray-900 dark:text-white"
          }`}>
            {player.name}
          </ThemedText>
          <ThemedText className={`text-sm ${
            isDisabled ? "text-gray-400" : "text-gray-500 dark:text-gray-400"
          }`}>
            {player.position} • ⭐{player.rating}/5
          </ThemedText>
        </View>
        
        {isDisabled && (
          <ThemedText className="text-xs text-red-500">
            Already striker
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectionButton = (role, selectedPlayer, label) => {
    const isSelected = !!selectedPlayer;
    
    return (
      <TouchableOpacity
        onPress={() => openPlayerModal(role)}
        className={`p-4 rounded-xl mb-4 flex-row items-center justify-between ${
          isSelected
            ? "bg-blue-500"
            : isDarkMode
            ? "bg-gray-800"
            : "bg-white"
        } border-2 ${
          isSelected
            ? "border-blue-600"
            : isDarkMode
            ? "border-gray-700"
            : "border-gray-200"
        }`}
      >
        <View className="flex-1">
          <ThemedText className={`font-semibold ${
            isSelected ? "text-white" : "text-gray-900 dark:text-white"
          }`}>
            {label}
          </ThemedText>
          {selectedPlayer ? (
            <ThemedText className={`text-sm ${
              isSelected ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
            }`}>
              {selectedPlayer.name}
            </ThemedText>
          ) : (
            <ThemedText className={`text-sm ${
              isSelected ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
            }`}>
              Tap to select
            </ThemedText>
          )}
        </View>
        
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isSelected ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"}
        />
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheetModalProvider>
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
            Select Players
          </ThemedText>
        </View>

        <View className="flex-1 p-4">
          {/* Match Info */}
          <View className={`p-4 rounded-xl mb-6 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}>
            <ThemedText className="text-lg font-bold text-center mb-2 text-gray-900 dark:text-white">
              {teamA.name} vs {teamB.name}
            </ThemedText>
            
            <View className="flex-row justify-between mt-3">
              <View className="items-center flex-1">
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Batting First
                </ThemedText>
                <ThemedText className="text-base font-semibold text-gray-900 dark:text-white text-center">
                  {battingTeam.name}
                </ThemedText>
              </View>
              
              <View className="items-center flex-1">
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Bowling First
                </ThemedText>
                <ThemedText className="text-base font-semibold text-gray-900 dark:text-white text-center">
                  {bowlingTeam.name}
                </ThemedText>
              </View>
            </View>
            
            <ThemedText className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              {tossWinner.name} won the toss and chose to {tossDecision.toLowerCase()} first
            </ThemedText>
          </View>

          {/* Player Selection Buttons */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Batting Team Selection
            </ThemedText>
            
            {renderSelectionButton('striker', striker, 'Striker')}
            {renderSelectionButton('nonStriker', nonStriker, 'Non-Striker')}
          </View>

          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Bowling Team Selection
            </ThemedText>
            
            {renderSelectionButton('bowler', bowler, 'Bowler')}
          </View>

          {/* Start Match Button */}
          <TouchableOpacity
            onPress={handleStartMatch}
            disabled={!striker || !nonStriker || !bowler}
            className={`p-4 rounded-xl mt-4 ${
              (!striker || !nonStriker || !bowler)
                ? "bg-gray-400"
                : "bg-blue-500"
            }`}
          >
            <ThemedText className="text-white text-center text-lg font-semibold">
              Start Match
            </ThemedText>
          </TouchableOpacity>

          {/* Instructions */}
          <View className={`p-4 rounded-xl mt-6 ${
            isDarkMode ? "bg-gray-800/50" : "bg-blue-50"
          }`}>
            <ThemedText className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
              Instructions:
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              • Select opening batsmen (striker and non-striker) from the batting team
            </ThemedText>
            <ThemedText className="text-sm text-gray-600 dark:text-gray-300">
              • Select the opening bowler from the bowling team
            </ThemedText>
          </View>
        </View>

        {/* Player Selection Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closePlayerModal}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              className="flex-1 bg-black/50"
              onPress={closePlayerModal}
              activeOpacity={1}
            />
            
            <View className={`max-h-3/4 rounded-t-3xl p-5 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}>
              <View className="flex-row justify-between items-center mb-4">
                <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
                  Select {selectedRole === 'striker' ? 'Striker' : 
                          selectedRole === 'nonStriker' ? 'Non-Striker' : 'Bowler'}
                </ThemedText>
                <TouchableOpacity onPress={closePlayerModal}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDarkMode ? "#FFFFFF" : "#000000"}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-96">
                {getAvailablePlayers().map(player => renderPlayerItem(player))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </BottomSheetModalProvider>
  );
}
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";

export default function MatchDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { teamA, teamB, teamASquad, teamBSquad } = route.params;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [matchDetails, setMatchDetails] = useState({
    matchType: "limited",
    ballType: "tennis",
    date: new Date(),
    overs: 20,
    powerplay: 6,
    location: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customOvers, setCustomOvers] = useState("");
  const [showCustomOvers, setShowCustomOvers] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const scrollViewRef = useRef();
  const customOversInputRef = useRef();
  const locationInputRef = useRef();

  const handleInputChange = (field, value) => {
    setMatchDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange("date", selectedDate);
    }
  };

  const handleCustomOversSubmit = () => {
    const oversValue = parseInt(customOvers);
    if (oversValue > 0 && oversValue <= 50) { // Reasonable limit for cricket overs
      handleInputChange("overs", oversValue);
      setShowCustomOvers(false);
      setCustomOvers("");
    } else {
      alert("Please enter a valid number of overs (1-50)");
    }
  };

  const handleLocationSearch = (text) => {
    handleInputChange("location", text);
    setShowLocationSuggestions(text.length > 2);
    
    // Mock location suggestions - replace with actual API call
    if (text.length > 2) {
      const mockSuggestions = [
        "Mumbai Cricket Ground",
        "Delhi Sports Complex",
        "Bangalore Cricket Stadium",
        "Chennai MA Chidambaram Stadium",
        "Kolkata Eden Gardens",
        "Hyderabad Cricket Association",
        "Pune Cricket Club",
        "Ahmedabad Narendra Modi Stadium"
      ].filter(location => 
        location.toLowerCase().includes(text.toLowerCase())
      );
      setLocationSuggestions(mockSuggestions);
    } else {
      setLocationSuggestions([]);
    }
  };

  const selectLocation = (location) => {
    handleInputChange("location", location);
    setShowLocationSuggestions(false);
    Keyboard.dismiss();
  };

  const handleCreateMatch = () => {
    if (!matchDetails.location) {
      alert("Please enter a location for the match");
      return;
    }
    
    // Here you would typically save the match details and navigate to the match screen
    console.log("Match Details:", {
      teamA,
      teamB,
      teamASquad,
      teamBSquad,
      ...matchDetails
    });
    
    // Navigate to the match screen or dashboard
    // navigation.navigate(SCREENS.MatchScreen, { matchData: {...} });
    alert("Match created successfully!");
    // navigation.goBack();
    navigation.navigate(SCREENS.TossScreen , {
        teamA,
        teamB,
        teamASquad,
        teamBSquad
      });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const scrollToInput = (reactNode) => {
    scrollViewRef.current?.scrollTo({ y: reactNode, animated: true });
  };

  const focusCustomOversInput = () => {
    setShowCustomOvers(true);
    setTimeout(() => {
      customOversInputRef.current?.focus();
      scrollToInput(400); // Adjust this value based on your layout
    }, 100);
  };

  const focusLocationInput = () => {
    setTimeout(() => {
      locationInputRef.current?.focus();
      scrollToInput(600); // Adjust this value based on your layout
    }, 100);
  };

  const renderOptionButton = (value, label, icon, isSelected) => (
    <TouchableOpacity
      onPress={() => handleInputChange("matchType", value)}
      className={`flex-1 p-4 rounded-xl mx-1 items-center justify-center ${
        isSelected
          ? "bg-blue-500 border-blue-600"
          : isDarkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      } border-2`}
    >
      <Ionicons
        name={icon}
        size={24}
        color={isSelected ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      <ThemedText
        className={`text-sm font-medium mt-2 ${
          isSelected ? "text-white" : "text-gray-900 dark:text-white"
        }`}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderBallTypeOption = (value, label, isSelected) => (
    <TouchableOpacity
      onPress={() => handleInputChange("ballType", value)}
      className={`p-3 rounded-lg mx-1 items-center justify-center ${
        isSelected
          ? "bg-blue-500 border-blue-600"
          : isDarkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      } border-2`}
    >
      <ThemedText
        className={`font-medium ${
          isSelected ? "text-white" : "text-gray-900 dark:text-white"
        }`}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

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
          Match Details
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 p-4" 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Teams Preview */}
          <View className={`p-4 rounded-xl mb-6 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}>
            <ThemedText className="text-lg font-bold text-center mb-3 text-gray-900 dark:text-white">
              {teamA?.name} vs {teamB?.name}
            </ThemedText>
            <View className="flex-row justify-between">
              <View className="items-center">
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                  Team A Players
                </ThemedText>
                <ThemedText className="text-lg font-semibold text-gray-900 dark:text-white">
                  {teamASquad?.length}
                </ThemedText>
              </View>
              <View className="items-center">
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                  Team B Players
                </ThemedText>
                <ThemedText className="text-lg font-semibold text-gray-900 dark:text-white">
                  {teamBSquad?.length}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Match Type Selection */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Match Type
            </ThemedText>
            <View className="flex-row">
              {renderOptionButton("box", "Box Cricket", "cube", matchDetails.matchType === "box")}
              {renderOptionButton("limited", "Limited Overs", "trophy", matchDetails.matchType === "limited")}
            </View>
          </View>

          {/* Ball Type Selection */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Ball Type
            </ThemedText>
            <View className="flex-row flex-wrap">
              {renderBallTypeOption("tennis", "Tennis Ball", matchDetails.ballType === "tennis")}
              {renderBallTypeOption("leather", "Leather Ball", matchDetails.ballType === "leather")}
              {renderBallTypeOption("plastic", "Plastic Ball", matchDetails.ballType === "plastic")}
            </View>
          </View>

          {/* Date Selection */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Match Date
            </ThemedText>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className={`p-4 rounded-xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } border ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <ThemedText className="text-gray-900 dark:text-white">
                {formatDate(matchDetails.date)}
              </ThemedText>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={matchDetails.date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Overs Selection */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Number of Overs
            </ThemedText>
            
            {/* Custom Overs Input */}
            {showCustomOvers ? (
              <View className={`p-3 rounded-lg mb-3 ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              } border-2`}>
                <ThemedText className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Enter custom overs:
                </ThemedText>
                <View className="flex-row items-center">
                  <TextInput
                    ref={customOversInputRef}
                    placeholder="Enter number of overs"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    value={customOvers}
                    onChangeText={setCustomOvers}
                    keyboardType="numeric"
                    className={`flex-1 p-3 rounded-lg ${
                      isDarkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                    onSubmitEditing={handleCustomOversSubmit}
                    returnKeyType="done"
                  />
                  <TouchableOpacity 
                    onPress={handleCustomOversSubmit} 
                    className="ml-2 p-3 bg-green-500 rounded-lg"
                    disabled={!customOvers}
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowCustomOvers(false);
                      setCustomOvers("");
                    }} 
                    className="ml-2 p-3 bg-red-500 rounded-lg"
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={focusCustomOversInput}
                className={`p-3 rounded-lg mb-3 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                } border-2 border-dashed flex-row items-center justify-center`}
              >
                <Ionicons
                  name="add-circle"
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  style={{ marginRight: 8 }}
                />
                <ThemedText className="text-gray-900 dark:text-white">
                  Custom Overs
                </ThemedText>
              </TouchableOpacity>
            )}
            
            <View className="flex-row flex-wrap">
              {[5, 10, 15, 20, 25, 30].map(overs => (
                <TouchableOpacity
                  key={overs}
                  onPress={() => handleInputChange("overs", overs)}
                  className={`p-3 rounded-lg mx-1 mb-2 ${
                    matchDetails.overs === overs
                      ? "bg-blue-500 border-blue-600"
                      : isDarkMode
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  } border-2`}
                >
                  <ThemedText
                    className={`font-medium ${
                      matchDetails.overs === overs
                        ? "text-white"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {overs} overs
                  </ThemedText>
                </TouchableOpacity>
              ))}
              
              {/* Show custom overs as an option if it's not in the preset list */}
              {matchDetails.overs > 0 && ![5, 10, 15, 20, 25, 30].includes(matchDetails.overs) && (
                <TouchableOpacity
                  className={`p-3 rounded-lg mx-1 mb-2 bg-blue-500 border-blue-600 border-2`}
                >
                  <ThemedText className="font-medium text-white">
                    {matchDetails.overs} overs
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
            
            {matchDetails.overs && (
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Selected: {matchDetails.overs} overs
              </ThemedText>
            )}
          </View>

          {/* Powerplay Selection */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Powerplay Overs
            </ThemedText>
            <View className="flex-row flex-wrap">
              {[4, 6, 8, 10].map(powerplay => (
                <TouchableOpacity
                  key={powerplay}
                  onPress={() => handleInputChange("powerplay", powerplay)}
                  className={`p-3 rounded-lg mx-1 mb-2 ${
                    matchDetails.powerplay === powerplay
                      ? "bg-blue-500 border-blue-600"
                      : isDarkMode
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  } border-2`}
                >
                  <ThemedText
                    className={`font-medium ${
                      matchDetails.powerplay === powerplay
                        ? "text-white"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {powerplay} overs
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Input with Search */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Location
            </ThemedText>
            <View className="relative">
              <TextInput
                ref={locationInputRef}
                placeholder="Search for location..."
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={matchDetails.location}
                onChangeText={handleLocationSearch}
                onFocus={focusLocationInput}
                className={`p-4 rounded-xl ${
                  isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                } border ${
                  isDarkMode ? "border-gray-700" : "border-gray-200"
                }`}
                style={{ fontSize: 16 }}
              />
              
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <View className={`absolute top-full left-0 right-0 mt-1 rounded-xl z-10 max-h-40 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                } border shadow-lg`}>
                  <ScrollView keyboardShouldPersistTaps="always">
                    {locationSuggestions.map((location, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => selectLocation(location)}
                        className={`p-3 border-b ${
                          isDarkMode ? "border-gray-700" : "border-gray-200"
                        }`}
                      >
                        <ThemedText className="text-gray-900 dark:text-white">
                          {location}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Create Match Button */}
          <TouchableOpacity
            onPress={handleCreateMatch}
            disabled={!matchDetails.location}
            className={`p-4 rounded-xl mt-4 mb-8 ${
              !matchDetails.location
                ? "bg-gray-400"
                : "bg-blue-500"
            }`}
          >
            <ThemedText className="text-white text-center text-lg font-semibold">
              Create Match
            </ThemedText>
          </TouchableOpacity>

          {!matchDetails.location && (
            <ThemedText className="text-red-500 text-center mt-2 mb-8">
              Please enter a location to create the match
            </ThemedText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
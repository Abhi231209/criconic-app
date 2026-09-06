import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Alert,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { matchesApi, userApi } from "@/utils/api";
import { MATCH_STATUS, matchRedirectBasedOnStatus, confirmLeavePreScore } from "@/utils";
import debounce from "lodash/debounce";

export default function MatchDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { teamA: initialTeamA, teamB: initialTeamB, teamASquad: initialTeamASquad, teamBSquad: initialTeamBSquad } = route.params || {};
  const matchId =
    route.params?.matchId ||
    route.params?.matchID ||
    route.params?.matchDetails?._id ||
    route.params?.matchDetails?.id ||
    route.params?.match?._id;

  const [teamA, setTeamA] = useState(initialTeamA);
  const [teamB, setTeamB] = useState(initialTeamB);
  const [teamASquad, setTeamASquad] = useState(initialTeamASquad || []);
  const [teamBSquad, setTeamBSquad] = useState(initialTeamBSquad || []);
  const [fetchedMatch, setFetchedMatch] = useState(null);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [matchDetails, setMatchDetails] = useState({
    matchType: "limited",
    ballType: "tennis",
    date: new Date(),
    overs: 20,
    powerplay: 6,
    location: "",
    locationId: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customOvers, setCustomOvers] = useState("");
  const [showCustomOvers, setShowCustomOvers] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollViewRef = useRef();
  const customOversInputRef = useRef();
  const locationInputRef = useRef();
  const isLocationFocusedRef = useRef(false);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (matchId) {
      matchesApi
        .getMatchById(matchId, { params: { private: 1 } })
        .then((res) => {
          const m = res?.data;
          if (m) {
            setFetchedMatch(m);
            if (
              m.status &&
              m.status !== MATCH_STATUS.MATCH_CREATED &&
              m.status !== MATCH_STATUS.MATCH_SCHEDULED
            ) {
              isLeavingRef.current = true;
              const target = matchRedirectBasedOnStatus(matchId, m.status);
              navigation.replace(target.screen, target.params);
              return;
            }
            if (m.teams && m.teams.length >= 2) {
              if (!teamA) setTeamA({ name: m.teams[0].title, _id: m.teams[0].teamId, id: m.teams[0].teamId });
              if (!teamB) setTeamB({ name: m.teams[1].title, _id: m.teams[1].teamId, id: m.teams[1].teamId });
              if (teamASquad.length === 0 && m.teams[0].players) setTeamASquad(m.teams[0].players);
              if (teamBSquad.length === 0 && m.teams[1].players) setTeamBSquad(m.teams[1].players);
            }
            if (m.totalOvers) handleInputChange("overs", m.totalOvers);
            if (m.type) handleInputChange("matchType", m.type);
            if (m.ballType) handleInputChange("ballType", m.ballType);
            if (m.location || m.address) handleInputChange("location", m.location || m.address);
            if (m.locationId) handleInputChange("locationId", m.locationId);
            if (m.powerplayOvers) handleInputChange("powerplay", m.powerplayOvers);
          }
        })
        .catch((err) => console.warn("[MatchDetailsScreen] Error loading match:", err));
    }
  }, [matchId]);

  // Google Places Autocomplete search matching sports-arena
  const debouncedLocationSearch = useCallback(
    debounce(async (text) => {
      try {
        const res = await userApi.searchLocation(text);
        const predictions =
          res?.data?.data?.predictions ||
          res?.data?.predictions ||
          res?.data?.data ||
          [];
        setLocationSuggestions(Array.isArray(predictions) ? predictions : []);
        setShowLocationSuggestions(true);
      } catch (err) {
        console.warn("[MatchDetailsScreen] searchLocation error:", err);
        setLocationSuggestions([]);
      } finally {
        setIsLoadingLocation(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      if (isLocationFocusedRef.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    });
    return () => {
      showSub.remove();
      debouncedLocationSearch.cancel();
    };
  }, [debouncedLocationSearch]);

  const handleBack = () => {
    if (matchId) {
      saveMatchDetails(MATCH_STATUS.MATCH_DETAILS_ENTERED).catch((e) =>
        console.warn("[MatchDetailsScreen] auto-save on back error:", e)
      );
    }
    confirmLeavePreScore({
      navigation,
      route,
      onLeave: () => {
        isLeavingRef.current = true;
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      isLeavingRef.current = false;

      const backAction = () => {
        if (!navigation.isFocused()) return false;
        handleBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

      const unsubscribe = navigation.addListener("beforeRemove", (e) => {
        const actionType = e.data?.action?.type;
        if (actionType !== "GO_BACK" && actionType !== "POP") return;
        if (isLeavingRef.current || !navigation.isFocused()) return;
        e.preventDefault();
        handleBack();
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [navigation, fetchedMatch, route.params])
  );

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
    if (oversValue > 0 && oversValue <= 50) {
      handleInputChange("overs", oversValue);
      setShowCustomOvers(false);
      setCustomOvers("");
    } else {
      Alert.alert("Notice", "Please enter a valid number of overs (1-50)");
    }
  };

  const handleLocationSearch = (text) => {
    handleInputChange("location", text);
    handleInputChange("locationId", "");
    if (!text || text.trim().length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setIsLoadingLocation(false);
      debouncedLocationSearch.cancel();
      return;
    }
    setIsLoadingLocation(true);
    debouncedLocationSearch(text.trim());
  };

  const selectLocation = (item) => {
    const locationText =
      item?.description ||
      item?.formatted_address ||
      (typeof item === "string" ? item : "");
    const placeId = item?.place_id || "";
    setMatchDetails((prev) => ({
      ...prev,
      location: locationText,
      locationId: placeId,
    }));
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    Keyboard.dismiss();
  };

  const clearLocation = () => {
    setMatchDetails((prev) => ({
      ...prev,
      location: "",
      locationId: "",
    }));
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  const saveMatchDetails = async (targetStatus) => {
    setIsSubmitting(true);
    try {
      let targetMatchId = matchId;

      const startDate = (
        matchDetails.date instanceof Date
          ? matchDetails.date
          : new Date(matchDetails.date || Date.now())
      ).toISOString();

      const updatePayload = {
        type: matchDetails.matchType,
        ballType: matchDetails.ballType,
        totalOvers: Number(matchDetails.overs),
        startDate,
        powerplayOvers: Number(matchDetails.powerplay || 0),
        status: targetStatus,
      };
      if (matchDetails.location?.trim()) {
        updatePayload.location = matchDetails.location.trim();
      }
      if (matchDetails.locationId && matchDetails.locationId.trim()) {
        updatePayload.locationId = matchDetails.locationId.trim();
      }

      if (targetMatchId) {
        // Update existing match
        const updateRes = await matchesApi.updateMatch(targetMatchId, {
          updateField: updatePayload,
        });

        if (
          !updateRes?.data?.success &&
          updateRes?.status !== 200 &&
          updateRes?.status !== 202
        ) {
          const errMsg =
            updateRes?.data?.message ||
            updateRes?.data?.error?.[0]?.message ||
            updateRes?.data?.error?.[0] ||
            "Failed to save match details on server";
          throw new Error(String(errMsg));
        }
      } else {
        // Fallback: create match on server first
        const isValidObjectId = (id) =>
          typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

        const sanitizePlayer = (p) => {
          const rawId = p?.id?._id || p?.id || p?._id;
          const idStr =
            rawId && typeof rawId === "object"
              ? String(rawId._id || rawId.id || "")
              : String(rawId || "");
          const playerObj = {
            username: p?.username || p?.name || "Player",
          };
          if (isValidObjectId(idStr)) {
            playerObj.id = idStr;
          }
          return playerObj;
        };

        const teamAId = String(teamA?._id || teamA?.id || teamA?.teamId || "");
        const teamBId = String(teamB?._id || teamB?.id || teamB?.teamId || "");

        const teams = [
          {
            teamId: teamAId,
            teamName: teamA?.name || teamA?.title || "Team A",
            teamLogo: teamA?.image || teamA?.logo,
            players: (teamASquad || []).map(sanitizePlayer),
          },
          {
            teamId: teamBId,
            teamName: teamB?.name || teamB?.title || "Team B",
            teamLogo: teamB?.image || teamB?.logo,
            players: (teamBSquad || []).map(sanitizePlayer),
          },
        ];

        const dataToSend = { teams };
        if (route.params?.tournamentId || route.params?.tournamentID) {
          dataToSend.tournamentID =
            route.params?.tournamentId || route.params?.tournamentID;
        }

        const res = await matchesApi.createMatch(dataToSend);
        targetMatchId =
          res?.data?.data?.matchID ||
          res?.data?.data?._id ||
          res?.data?.matchID ||
          res?.data?._id;

        if (!targetMatchId) {
          const errMsg =
            res?.data?.message ||
            res?.data?.error?.[0]?.message ||
            res?.data?.error?.[0] ||
            res?.data?.reason ||
            "Failed to create match on server";
          throw new Error(String(errMsg));
        }

        // Now persist match details via PUT
        const updateRes = await matchesApi.updateMatch(targetMatchId, {
          updateField: updatePayload,
        });

        if (
          !updateRes?.data?.success &&
          updateRes?.status !== 200 &&
          updateRes?.status !== 202
        ) {
          const errMsg =
            updateRes?.data?.message ||
            updateRes?.data?.error?.[0]?.message ||
            "Failed to save match details on server";
          throw new Error(String(errMsg));
        }
      }

      return targetMatchId;
    } catch (error) {
      console.warn("[MatchDetailsScreen] Save error:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error?.[0]?.message ||
        error?.response?.data?.error?.[0] ||
        error?.message ||
        "Failed to save match details. Please try again.";
      Alert.alert("Error", String(errorMsg));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartMatch = async () => {
    const savedMatchId = await saveMatchDetails(
      MATCH_STATUS.MATCH_DETAILS_ENTERED
    );
    if (!savedMatchId) return;

    isLeavingRef.current = true;
    navigation.navigate(SCREENS.TossScreen, {
      matchId: savedMatchId,
      teamA,
      teamB,
      teamASquad,
      teamBSquad,
      matchDetails,
      fromMatchDetails: true,
      returnScreen: route.params?.returnScreen,
      tournamentId: route.params?.tournamentId || route.params?.tournamentID,
    });
  };

  const handleScheduleMatch = async () => {
    const savedMatchId = await saveMatchDetails(MATCH_STATUS.MATCH_SCHEDULED);
    if (!savedMatchId) return;

    isLeavingRef.current = true;
    Alert.alert("Success", "Match has been scheduled successfully!");

    const tId = route.params?.tournamentId || route.params?.tournamentID;
    if (tId) {
      navigation.navigate(SCREENS.TournamentProfile, { tournamentId: tId });
    } else if (
      route.params?.returnScreen &&
      route.params?.returnScreen !== SCREENS.CreateMatch
    ) {
      navigation.navigate(route.params.returnScreen);
    } else {
      navigation.navigate(SCREENS.MyCricket);
    }
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
      scrollToInput(380);
    }, 150);
  };

  const focusLocationInput = () => {
    isLocationFocusedRef.current = true;
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
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
          onPress={handleBack}
          className="p-2 mr-2"
        >
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          Match Details
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 p-4" 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 260 }}
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

          {/* Location Input with Google Places Autocomplete */}
          <View className="mb-6">
            <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Location / Ground
            </ThemedText>
            <View className="relative">
              <View
                className={`flex-row items-center px-4 py-3 rounded-xl border ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={matchDetails.location ? "#2563EB" : isDarkMode ? "#9CA3AF" : "#6B7280"}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={locationInputRef}
                  placeholder="Search for ground or city location..."
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  value={matchDetails.location}
                  onChangeText={handleLocationSearch}
                  onFocus={focusLocationInput}
                  onBlur={() => {
                    isLocationFocusedRef.current = false;
                  }}
                  className={`flex-1 text-base ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                  style={{ fontSize: 15 }}
                />
                {isLoadingLocation && (
                  <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 6 }} />
                )}
                {matchDetails.location ? (
                  <TouchableOpacity onPress={clearLocation} className="p-1">
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Suggestions dropdown */}
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <View
                  className={`mt-2 rounded-xl z-20 max-h-56 ${
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  } border shadow-lg overflow-hidden`}
                >
                  <ScrollView
                    keyboardShouldPersistTaps="always"
                    nestedScrollEnabled={true}
                    className="max-h-56"
                  >
                    {locationSuggestions.map((item, index) => {
                      const mainText =
                        item?.structured_formatting?.main_text ||
                        item?.description ||
                        (typeof item === "string" ? item : "Location");
                      const secondaryText = item?.structured_formatting?.secondary_text || "";

                      return (
                        <TouchableOpacity
                          key={item?.place_id || index}
                          onPress={() => selectLocation(item)}
                          className={`p-3.5 border-b flex-row items-center ${
                            isDarkMode
                              ? "border-gray-700 active:bg-gray-700"
                              : "border-gray-100 active:bg-blue-50"
                          }`}
                        >
                          <Ionicons
                            name="location-outline"
                            size={18}
                            color="#2563EB"
                            style={{ marginRight: 10 }}
                          />
                          <View className="flex-1">
                            <ThemedText
                              numberOfLines={1}
                              className={`text-sm font-semibold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {mainText}
                            </ThemedText>
                            {secondaryText ? (
                              <ThemedText
                                numberOfLines={1}
                                className={`text-xs mt-0.5 ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                {secondaryText}
                              </ThemedText>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* No results notice */}
              {showLocationSuggestions &&
                !isLoadingLocation &&
                locationSuggestions.length === 0 &&
                matchDetails.location?.trim()?.length >= 3 && (
                  <View
                    className={`mt-2 p-3 rounded-xl ${
                      isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                    } border`}
                  >
                    <ThemedText className="text-xs text-center text-gray-500 dark:text-gray-400">
                      No Google places found. Your typed location will be used.
                    </ThemedText>
                  </View>
                )}
            </View>
          </View>

          {/* Action Buttons: Schedule and Start Match (matching sports-arena MatchDetails) */}
          <View className="flex-row items-center gap-3 mt-6 mb-8">
            <TouchableOpacity
              onPress={handleScheduleMatch}
              disabled={isSubmitting}
              className={`flex-1 p-4 rounded-xl items-center justify-center border ${
                isDarkMode
                  ? "border-blue-500/40 bg-gray-800"
                  : "border-blue-400 bg-white"
              } ${isSubmitting ? "opacity-50" : ""}`}
            >
              <ThemedText
                className={`text-base font-bold ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                Schedule
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStartMatch}
              disabled={isSubmitting}
              className={`flex-1 p-4 rounded-xl items-center justify-center bg-blue-600 ${
                isSubmitting ? "bg-blue-400" : ""
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText className="text-white text-base font-bold">
                  Start Match
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTrackingDefaults, saveTrackingDefault } from "@/utils/trackingDefaults";
import { MatchSettingEnum } from "@/utils/Common";
import DateTimePicker from "@react-native-community/datetimepicker";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { matchesApi, userApi, tournamentsApi } from "@/utils/api";
import { MATCH_STATUS, matchRedirectBasedOnStatus, confirmLeavePreScore } from "@/utils";
import { searchFallbackLocations } from "@/utils/locationHelper";
import { showGlobalAlert } from "@/contexts/AlertContext";
import AppKeyboardAwareScrollView from "@/components/ui/custom/AppKeyboardAwareScrollView";
import debounce from "lodash/debounce";
import { useSelector } from "react-redux";
import User from "@/utils/User";
import { getPreference } from "@/utils/appPreferences";

const isValidLocation = (loc) => {
  if (!loc || typeof loc !== "string") return false;
  const clean = loc.trim().toLowerCase();
  return (
    clean.length > 0 &&
    clean !== "location not specified" &&
    clean !== "not specified" &&
    clean !== "local" &&
    clean !== "undefined" &&
    clean !== "null" &&
    clean !== "india"
  );
};

export const TOURNAMENT_ROUNDS = [
  { label: "League Match", value: "League Match", icon: "calendar-outline" },
  { label: "Knockout", value: "Knockout", icon: "flash-outline" },
  { label: "Quarter Final", value: "Quarter Final", icon: "flag-outline" },
  { label: "Semi Final", value: "Semi Final", icon: "git-commit-outline" },
  { label: "Final", value: "Final", icon: "trophy" },
  { label: "Qualifier 1", value: "Qualifier 1", icon: "ribbon-outline" },
  { label: "Eliminator", value: "Eliminator", icon: "flame-outline" },
  { label: "Qualifier 2", value: "Qualifier 2", icon: "ribbon-outline" },
];

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

  const authUser = useSelector((state) => state.auth?.user);

  const resolveInitialLocation = () => {
    const candidates = [
      route.params?.location,
      route.params?.venue,
      route.params?.address,
      authUser?.city,
      authUser?.location,
      User.city,
      User.location,
      User.user?.city,
      User.user?.location,
    ];
    for (const c of candidates) {
      if (isValidLocation(c)) {
        return c.trim();
      }
    }
    return "";
  };

  const initialLocation = resolveInitialLocation();

  const [teamA, setTeamA] = useState(initialTeamA);
  const [teamB, setTeamB] = useState(initialTeamB);
  const [teamASquad, setTeamASquad] = useState(initialTeamASquad || []);
  const [teamBSquad, setTeamBSquad] = useState(initialTeamBSquad || []);
  const [fetchedMatch, setFetchedMatch] = useState(null);
  const [tournament, setTournament] = useState(route.params?.tournament || null);
  const [customRound, setCustomRound] = useState("");
  const [showCustomRound, setShowCustomRound] = useState(false);

  const tournamentId =
    route.params?.tournamentId ||
    route.params?.tournamentID ||
    route.params?.tournament?._id ||
    route.params?.tournament?.id ||
    fetchedMatch?.tournamentID ||
    (typeof fetchedMatch?.tournament === "string"
      ? fetchedMatch.tournament
      : fetchedMatch?.tournament?._id || fetchedMatch?.tournament?.id);

  const isTournamentMatch = Boolean(
    tournamentId ||
    route.params?.fromTournament ||
    route.params?.cameFromTournament ||
    fetchedMatch?.tournamentID ||
    fetchedMatch?.tournament
  );

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [matchDetails, setMatchDetails] = useState({
    matchType: route.params?.matchType || "limited",
    ballType: route.params?.ballType || "tennis",
    pitchType: route.params?.pitchType || "turf",
    date: route.params?.date ? new Date(route.params.date) : new Date(),
    overs: route.params?.overs
      ? Number(route.params.overs)
      : route.params?.matchType === "single_wicket" ? 2 : 20,
    powerplay: route.params?.powerplay ? Number(route.params.powerplay) : 6,
    // Test matches: scheduled length in days (no overs limit).
    testDays: route.params?.testDays ? Number(route.params.testDays) : 5,
    location: isValidLocation(initialLocation) ? initialLocation : "",
    locationId: route.params?.locationId || "",
    roundType:
      route.params?.roundType ||
      route.params?.round ||
      route.params?.stage ||
      (String(
        route.params?.tournament?.tournamentType ||
        route.params?.tournament?.format ||
        ""
      ).toUpperCase().includes("KNOCK")
        ? "Knockout"
        : "League Match"),
    recordWagonWheel: Boolean(
      route.params?.isWagonWheelEnabled ??
      route.params?.recordWagonWheel ??
      route.params?.matchDetails?.config?.recordWagonWheel ??
      false
    ),
    recordPitchMap: Boolean(
      route.params?.isPitchMapEnabled ??
      route.params?.recordPitchMap ??
      route.params?.matchDetails?.config?.recordPitchMap ??
      false
    ),
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customOvers, setCustomOvers] = useState("");
  const [showCustomOvers, setShowCustomOvers] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectionKey, setSectionKey] = useState(() => (isTournamentMatch ? "stage" : "overs"));

  const scrollViewRef = useRef();
  const customOversInputRef = useRef();
  const locationInputRef = useRef();
  const locationSectionYRef = useRef(0);
  const isLocationFocusedRef = useRef(false);
  const isLeavingRef = useRef(false);
  // Set once the overs come from somewhere more specific than the user's
  // default (the saved match, or the user picking them here).
  const oversChosenRef = useRef(Boolean(route.params?.overs));

  // Load tracking defaults for new matches if not explicitly passed
  useEffect(() => {
    (async () => {
      try {
        const defaults = await getTrackingDefaults();
        const storedWW = matchId ? await AsyncStorage.getItem(`@criconic_ww_${matchId}`) : null;
        const storedPM = matchId ? await AsyncStorage.getItem(`@criconic_pm_${matchId}`) : null;

        setMatchDetails((prev) => ({
          ...prev,
          recordWagonWheel:
            route.params?.isWagonWheelEnabled !== undefined
              ? Boolean(route.params.isWagonWheelEnabled)
              : route.params?.recordWagonWheel !== undefined
              ? Boolean(route.params.recordWagonWheel)
              : storedWW !== null
              ? storedWW === "true"
              : prev.recordWagonWheel ?? defaults.wagonWheel ?? false,
          recordPitchMap:
            route.params?.isPitchMapEnabled !== undefined
              ? Boolean(route.params.isPitchMapEnabled)
              : route.params?.recordPitchMap !== undefined
              ? Boolean(route.params.recordPitchMap)
              : storedPM !== null
              ? storedPM === "true"
              : prev.recordPitchMap ?? defaults.pitchMap ?? false,
        }));
      } catch (err) {
        console.warn("[MatchDetailsScreen] Error loading tracking defaults:", err);
      }
    })();
  }, [matchId]);

  // New limited-overs match: start from the default in Settings → Scoring.
  useEffect(() => {
    if (route.params?.overs || route.params?.matchType === "single_wicket") return;
    getPreference("defaultOvers").then((overs) => {
      if (oversChosenRef.current) return;
      setMatchDetails((prev) => ({ ...prev, overs }));
    });
  }, []);

  useEffect(() => {
    if (matchId) {
      matchesApi
        .getMatchById(matchId, { params: { private: 1 } })
        .then((res) => {
          const m = res?.data;
          if (m) {
            setFetchedMatch(m);
            const isLimitedOvers = m.type !== "test";
            const hasValidOvers = !isLimitedOvers || Number(m.totalOvers) > 0;
            const hasLocation = Boolean(m.location?.trim() || m.address?.trim());
            const isDetailsIncomplete = !hasValidOvers || !hasLocation;

            if (
              m.status &&
              m.status !== MATCH_STATUS.MATCH_CREATED &&
              m.status !== MATCH_STATUS.MATCH_SCHEDULED &&
              !(m.status === MATCH_STATUS.MATCH_DETAILS_ENTERED && isDetailsIncomplete)
            ) {
              isLeavingRef.current = true;
              const target = matchRedirectBasedOnStatus(matchId, m.status);
              navigation.replace(target.screen, target.params);
              return;
            }

            if (m.status === MATCH_STATUS.MATCH_DETAILS_ENTERED && isDetailsIncomplete) {
              matchesApi
                .updateMatch(matchId, {
                  updateField: { status: MATCH_STATUS.MATCH_CREATED },
                })
                .catch(() => {});
            }
            if (m.teams && m.teams.length >= 2) {
              if (!teamA) setTeamA({ name: m.teams[0].title, _id: m.teams[0].teamId, id: m.teams[0].teamId });
              if (!teamB) setTeamB({ name: m.teams[1].title, _id: m.teams[1].teamId, id: m.teams[1].teamId });
              if (teamASquad.length === 0 && m.teams[0].players) setTeamASquad(m.teams[0].players);
              if (teamBSquad.length === 0 && m.teams[1].players) setTeamBSquad(m.teams[1].players);
            }
            if (m.totalOvers) handleInputChange("overs", m.totalOvers);
            if (m.type) handleInputChange("matchType", m.type);
            if (m.config?.testDays) handleInputChange("testDays", m.config.testDays);
            if (m.ballType) handleInputChange("ballType", m.ballType);
            if (m.config?.recordWagonWheel !== undefined) {
              const ww = m.config.recordWagonWheel;
              handleInputChange("recordWagonWheel", typeof ww === "boolean" ? ww : !!ww?.active);
            }
            if (m.config?.recordPitchMap !== undefined) {
              const pm = m.config.recordPitchMap;
              handleInputChange("recordPitchMap", typeof pm === "boolean" ? pm : !!pm?.active);
            }
            const fetchedLoc = isValidLocation(m.location)
              ? m.location
              : isValidLocation(m.address)
              ? m.address
              : null;
            if (m.powerplayOvers) handleInputChange("powerplay", m.powerplayOvers);
            if (m.roundType || m.round || m.stage) {
              handleInputChange("roundType", m.roundType || m.round || m.stage);
            }
          }
        })
        .catch((err) => console.warn("[MatchDetailsScreen] Error loading match:", err));
    }
  }, [matchId]);

  // Google Places Autocomplete search with fallback matching sports-arena
  const debouncedLocationSearch = useCallback(
    debounce(async (text) => {
      try {
        const res = await userApi.searchLocation(text);
        let predictions =
          res?.data?.data?.predictions ||
          res?.data?.predictions ||
          res?.data?.data ||
          [];
        if (!Array.isArray(predictions) || predictions.length === 0) {
          predictions = searchFallbackLocations(text);
        }
        setLocationSuggestions(Array.isArray(predictions) ? predictions : []);
        setShowLocationSuggestions(true);
        if (isLocationFocusedRef.current && locationSectionYRef.current > 0) {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, locationSectionYRef.current - 15),
            animated: true,
          });
        }
      } catch (err) {
        console.warn("[MatchDetailsScreen] searchLocation error:", err);
        const fallback = searchFallbackLocations(text);
        setLocationSuggestions(fallback);
        setShowLocationSuggestions(true);
        if (isLocationFocusedRef.current && locationSectionYRef.current > 0) {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, locationSectionYRef.current - 15),
            animated: true,
          });
        }
      } finally {
        setIsLoadingLocation(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const showSub = Keyboard.addListener(showEvent, () => {
      if (isLocationFocusedRef.current) {
        setTimeout(() => {
          if (locationSectionYRef.current > 0) {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, locationSectionYRef.current - 15),
              animated: true,
            });
          } else {
            scrollViewRef.current?.scrollToFocusedInput?.(locationInputRef, 60);
          }
        }, 80);
      }
    });
    return () => {
      showSub.remove();
      debouncedLocationSearch.cancel();
    };
  }, [debouncedLocationSearch]);

  const isTestMatch = matchDetails.matchType === "test";
  // Single wicket (player vs player) is fixed when the match is created.
  const isSingleWicket = matchDetails.matchType === "single_wicket";
  const oversPresets = isSingleWicket ? [1, 2, 3, 4, 5, 6, 8, 10] : [6, 8, 10, 12, 15, 20, 25, 30];
  const maxCustomOvers = isSingleWicket ? 10 : 50;

  const hasValidOvers = () => {
    const oversNum = Number(matchDetails.overs);
    if (!isTestMatch && (!oversNum || oversNum <= 0)) {
      showGlobalAlert({
        title: "Overs Required",
        message: "Please select or enter the number of overs.",
        type: "warning",
      });
      return false;
    }
    return true;
  };

  // Each section fits on one screen; Next/Previous move between them and the
  // match is created from the last one.
  const sections = [
    ...(isTournamentMatch ? [{ key: "stage", title: "Tournament Stage", short: "Stage" }] : []),
    {
      key: "overs",
      title: isSingleWicket ? "Overs" : isTestMatch ? "Format & Length" : "Format & Overs",
      short: isTestMatch ? "Format" : "Overs",
    },
    { key: "venue", title: "Date & Venue", short: "Venue" },
    { key: "conditions", title: "Ball, Pitch & Tracking", short: "Ball & Pitch" },
  ];
  const sectionIndex = Math.max(0, sections.findIndex((s) => s.key === sectionKey));
  const section = sections[sectionIndex];
  const nextSection = sections[sectionIndex + 1];
  const isLastSection = !nextSection;

  useEffect(() => {
    scrollViewRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [sectionKey]);

  const goToSection = (index) => {
    Keyboard.dismiss();
    setShowLocationSuggestions(false);
    setSectionKey(sections[index].key);
  };

  const canLeaveSection = (key) => {
    if (key === "overs") return hasValidOvers();
    if (key === "venue" && !isValidLocation(matchDetails.location)) {
      showGlobalAlert({
        title: "Location Required",
        message: "Enter the ground or town where the match is played.",
        type: "warning",
      });
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!nextSection || !canLeaveSection(section.key)) return;
    goToSection(sectionIndex + 1);
  };

  const autoSaveDraftDetails = async () => {
    if (!matchId) return;
    try {
      const existingStatus = fetchedMatch?.status || MATCH_STATUS.MATCH_CREATED;
      const updatePayload = {
        type: matchDetails.matchType,
        ballType: matchDetails.ballType,
        pitchType: matchDetails.pitchType,
        status: existingStatus,
        config: {
          recordWagonWheel: Boolean(matchDetails.recordWagonWheel),
          recordPitchMap: Boolean(matchDetails.recordPitchMap),
          ...(isTestMatch ? { testDays: Number(matchDetails.testDays) || 5 } : {}),
        },
        ...(isTestMatch
          ? { testDays: Number(matchDetails.testDays) || 5 }
          : matchDetails.overs
          ? {
              totalOvers: Number(matchDetails.overs),
              powerplayOvers: isSingleWicket ? 0 : Number(matchDetails.powerplay || 0),
            }
          : {}),
      };
      if (matchDetails.location?.trim()) {
        updatePayload.location = matchDetails.location.trim();
      }
      if (matchDetails.locationId?.trim()) {
        updatePayload.locationId = matchDetails.locationId.trim();
      }
      if (isTournamentMatch && matchDetails.roundType) {
        updatePayload.roundType = matchDetails.roundType;
        updatePayload.round = matchDetails.roundType;
        updatePayload.stage = matchDetails.roundType;
      }
      await matchesApi.updateMatch(matchId, { updateField: updatePayload });
    } catch (e) {
      console.warn("[MatchDetailsScreen] auto-save draft on back error:", e);
    }
  };

  const handleBack = () => {
    if (sectionIndex > 0) {
      goToSection(sectionIndex - 1);
      return;
    }
    confirmLeavePreScore({
      navigation,
      route,
      onLeave: () => {
        isLeavingRef.current = true;
        autoSaveDraftDetails().catch(() => {});
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      isLeavingRef.current = false;

      const backAction = () => {
        if (!navigation.isFocused()) return false;
        // Steps back a section first; leaves the flow from the first one.
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
    }, [navigation, fetchedMatch, route.params, sectionKey, sectionIndex])
  );

  const calculateDefaultPowerplay = (overs) => {
    const num = Number(overs) || 0;
    if (num <= 3) return 0;
    if (num <= 6) return 1;
    if (num <= 12) return 2;
    return Math.min(10, Math.floor(num * 0.3));
  };

  useEffect(() => {
    const tId =
      route.params?.tournamentId ||
      route.params?.tournamentID ||
      route.params?.tournament?._id ||
      route.params?.tournament?.id;
    if (tId) {
      tournamentsApi
        .getTournamentById(tId)
        .then((res) => {
          const t = res?.data?.data || res?.data?.tournament || res?.data;
          if (t) {
            setTournament(t);
            const tLoc = [t?.location, t?.city, t?.address].find(isValidLocation);
            if (tLoc) {
              setMatchDetails((prev) => ({
                ...prev,
                location: isValidLocation(prev.location) ? prev.location : tLoc,
                locationId: prev.locationId || t.locationId || "",
              }));
            }
            const tourType = String(t?.tournamentType || t?.format || "").toUpperCase();
            if (tourType.includes("KNOCK") && !route.params?.roundType) {
              setMatchDetails((prev) => ({
                ...prev,
                roundType: prev.roundType === "League Match" ? "Knockout" : prev.roundType,
              }));
            }
          }
        })
        .catch((e) => console.log("[MatchDetailsScreen] fetch tournament location error:", e));
    }
  }, [route.params]);

  useEffect(() => {
    if (!isValidLocation(matchDetails.location) && isValidLocation(initialLocation)) {
      setMatchDetails((prev) => ({
        ...prev,
        location: initialLocation,
      }));
    }
  }, [initialLocation]);

  const handleInputChange = (field, value) => {
    if (field === "overs") oversChosenRef.current = true;
    setMatchDetails((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };
      if (field === "overs") {
        updated.powerplay = calculateDefaultPowerplay(value);
      }
      return updated;
    });
  };

  const handleToggleWagonWheel = (val) => {
    handleInputChange("recordWagonWheel", val);
    saveTrackingDefault("wagonWheel", val);
    if (matchId) {
      AsyncStorage.setItem(`@criconic_ww_${matchId}`, String(val)).catch(() => {});
      matchesApi.updateMatch(matchId, { config: { recordWagonWheel: val } }).catch(() => {});
    }
  };

  const handleTogglePitchMap = (val) => {
    handleInputChange("recordPitchMap", val);
    saveTrackingDefault("pitchMap", val);
    if (matchId) {
      AsyncStorage.setItem(`@criconic_pm_${matchId}`, String(val)).catch(() => {});
      matchesApi.updateMatch(matchId, { config: { recordPitchMap: val } }).catch(() => {});
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange("date", selectedDate);
    }
  };

  const handleCustomOversSubmit = () => {
    const oversValue = parseInt(customOvers);
    if (oversValue > 0 && oversValue <= maxCustomOvers) {
      handleInputChange("overs", oversValue);
      setShowCustomOvers(false);
      setCustomOvers("");
    } else {
      Alert.alert("Notice", `Please enter a valid number of overs (1-${maxCustomOvers})`);
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
    isLocationFocusedRef.current = false;
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
    if (!isValidLocation(matchDetails.location)) {
      showGlobalAlert({
        title: "Location Required",
        message: "Enter the ground or town where the match is played.",
        type: "warning",
      });
      return null;
    }

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
        pitchType: matchDetails.pitchType,
        startDate,
        status: targetStatus,
        config: {
          recordWagonWheel: Boolean(matchDetails.recordWagonWheel),
          recordPitchMap: Boolean(matchDetails.recordPitchMap),
          ...(isTestMatch ? { testDays: Number(matchDetails.testDays) || 5 } : {}),
        },
        // A Test has no overs limit; the server stores 0 for both.
        ...(isTestMatch
          ? { testDays: Number(matchDetails.testDays) || 5 }
          : {
              totalOvers: Number(matchDetails.overs),
              powerplayOvers: isSingleWicket ? 0 : Number(matchDetails.powerplay || 0),
            }),
      };
      if (isTournamentMatch && matchDetails.roundType) {
        updatePayload.roundType = matchDetails.roundType;
        updatePayload.round = matchDetails.roundType;
        updatePayload.stage = matchDetails.roundType;
      }
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

        const dataToSend = {
          teams,
          pitchType: matchDetails.pitchType,
          ballType: matchDetails.ballType,
          config: {
            recordWagonWheel: Boolean(matchDetails.recordWagonWheel),
            recordPitchMap: Boolean(matchDetails.recordPitchMap),
          },
        };
        if (route.params?.tournamentId || route.params?.tournamentID) {
          dataToSend.tournamentID =
            route.params?.tournamentId || route.params?.tournamentID;
          if (matchDetails.roundType) {
            dataToSend.roundType = matchDetails.roundType;
            dataToSend.round = matchDetails.roundType;
            dataToSend.stage = matchDetails.roundType;
          }
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
      matchDetails: {
        ...matchDetails,
        config: {
          ...matchDetails?.config,
          recordWagonWheel: Boolean(matchDetails.recordWagonWheel),
          recordPitchMap: Boolean(matchDetails.recordPitchMap),
        },
        recordWagonWheel: Boolean(matchDetails.recordWagonWheel),
        recordPitchMap: Boolean(matchDetails.recordPitchMap),
      },
      isWagonWheelEnabled: Boolean(matchDetails.recordWagonWheel),
      isPitchMapEnabled: Boolean(matchDetails.recordPitchMap),
      fromMatchDetails: true,
      returnScreen: route.params?.returnScreen,
      tournamentId: route.params?.tournamentId || route.params?.tournamentID,
      fromTournament: Boolean(route.params?.fromTournament),
    });
  };

  const handleScheduleMatch = async () => {
    const savedMatchId = await saveMatchDetails(MATCH_STATUS.MATCH_SCHEDULED);
    if (!savedMatchId) return;

    isLeavingRef.current = true;
    Alert.alert("Success", "Match has been scheduled successfully!");

    const tId = route.params?.tournamentId || route.params?.tournamentID;
    const cameFromTournament = Boolean(route.params?.fromTournament);
    if (cameFromTournament && tId) {
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
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const formatted = d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return isToday ? `Today (${formatted})` : formatted;
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
      if (locationSectionYRef.current > 0) {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, locationSectionYRef.current - 15),
          animated: true,
        });
      } else {
        scrollViewRef.current?.scrollToFocusedInput?.(locationInputRef, 60);
      }
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

  const renderPitchTypeOption = (value, label, isSelected) => (
    <TouchableOpacity
      key={value}
      onPress={() => handleInputChange("pitchType", value)}
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
        className={`px-4 py-3 border-b flex-row items-center justify-between ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={handleBack}
            className="p-2 mr-2"
          >
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <ThemedText numberOfLines={1} className="flex-1 text-xl font-bold text-gray-900 dark:text-white">
            {section.title}
          </ThemedText>
        </View>
        <View className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800">
          <ThemedText className="text-xs font-bold text-blue-600 dark:text-blue-400">
            Step {sectionIndex + 1} of {sections.length}
          </ThemedText>
        </View>
      </View>

      {/* Section progress: finished sections can be tapped to go back */}
      <View
        className={`px-3 pt-2.5 pb-2 border-b flex-row ${
          isDarkMode ? "bg-gray-800/90 border-gray-700" : "bg-white border-gray-100"
        }`}
      >
        {sections.map((s, i) => {
          const isDone = i < sectionIndex;
          const isActive = i === sectionIndex;
          return (
            <TouchableOpacity
              key={s.key}
              onPress={() => goToSection(i)}
              disabled={!isDone}
              activeOpacity={0.7}
              className="flex-1 mx-1"
            >
              <View
                className={`h-1 rounded-full ${
                  isDone
                    ? "bg-emerald-500"
                    : isActive
                    ? "bg-blue-600"
                    : isDarkMode
                    ? "bg-gray-700"
                    : "bg-gray-200"
                }`}
              />
              <ThemedText
                numberOfLines={1}
                className={`text-[11px] font-bold mt-1.5 ${
                  isActive
                    ? isDarkMode ? "text-white" : "text-gray-900"
                    : isDone
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {s.short}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <AppKeyboardAwareScrollView 
        ref={scrollViewRef}
        className="flex-1 p-4" 
        keyboardShouldPersistTaps="handled"
        extraHeight={160}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={true}
      >
        {section.key === "stage" && (
          <>
            {isTournamentMatch && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Ionicons name="trophy" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                    <ThemedText className="text-base font-bold text-gray-900 dark:text-white">
                      Tournament Match Stage
                    </ThemedText>
                  </View>
                  {(tournament?.title || tournament?.name || route.params?.tournamentTitle) ? (
                    <View className="flex-row items-center px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                      <ThemedText numberOfLines={1} className="text-xs font-bold text-blue-600 dark:text-blue-400 max-w-[130px]">
                        {tournament?.title || tournament?.name || route.params?.tournamentTitle}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row flex-wrap">
                  {TOURNAMENT_ROUNDS.map((r) => {
                    const isSelected = matchDetails.roundType === r.value;
                    return (
                      <TouchableOpacity
                        key={r.value}
                        onPress={() => {
                          handleInputChange("roundType", r.value);
                          setShowCustomRound(false);
                        }}
                        className={`px-3.5 py-2.5 rounded-xl mr-2 mb-2.5 border-2 flex-row items-center ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : isDarkMode
                            ? "bg-gray-800 border-gray-700"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Ionicons
                          name={r.icon}
                          size={15}
                          color={isSelected ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"}
                          style={{ marginRight: 6 }}
                        />
                        <ThemedText
                          className={`text-xs font-bold ${
                            isSelected
                              ? "text-white"
                              : isDarkMode
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          {r.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom / Other Stage Button */}
                  <TouchableOpacity
                    onPress={() => setShowCustomRound(true)}
                    className={`px-3.5 py-2.5 rounded-xl mr-2 mb-2.5 border-2 border-dashed flex-row items-center ${
                      !TOURNAMENT_ROUNDS.some((r) => r.value === matchDetails.roundType)
                        ? "bg-blue-600 border-blue-600"
                        : isDarkMode
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name="create-outline"
                      size={15}
                      color={
                        !TOURNAMENT_ROUNDS.some((r) => r.value === matchDetails.roundType)
                          ? "#FFFFFF"
                          : isDarkMode
                          ? "#9CA3AF"
                          : "#6B7280"
                      }
                      style={{ marginRight: 6 }}
                    />
                    <ThemedText
                      className={`text-xs font-bold ${
                        !TOURNAMENT_ROUNDS.some((r) => r.value === matchDetails.roundType)
                          ? "text-white"
                          : isDarkMode
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}
                    >
                      {!TOURNAMENT_ROUNDS.some((r) => r.value === matchDetails.roundType)
                        ? matchDetails.roundType
                        : "Other"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {showCustomRound && (
                  <View className={`p-3 rounded-xl mt-1 border ${
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}>
                    <ThemedText className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Enter Custom Stage / Round Name:
                    </ThemedText>
                    <View className="flex-row items-center">
                      <TextInput
                        placeholder="e.g. Super 8, Pre-Quarter, Round of 16"
                        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        value={customRound}
                        onChangeText={setCustomRound}
                        className={`flex-1 p-2.5 rounded-xl border text-sm ${
                          isDarkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                        }`}
                        onSubmitEditing={() => {
                          if (customRound.trim()) {
                            handleInputChange("roundType", customRound.trim());
                            setShowCustomRound(false);
                            setCustomRound("");
                          }
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          if (customRound.trim()) {
                            handleInputChange("roundType", customRound.trim());
                            setShowCustomRound(false);
                            setCustomRound("");
                          }
                        }}
                        disabled={!customRound.trim()}
                        className="ml-2 px-3.5 py-2.5 bg-blue-600 rounded-xl"
                      >
                        <ThemedText className="text-white text-xs font-bold">Done</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setShowCustomRound(false);
                          setCustomRound("");
                        }}
                        className="ml-1 p-2"
                      >
                        <Ionicons name="close" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {section.key === "overs" && (
          <>
            {isSingleWicket && (
              <View
                className={`mb-6 p-4 rounded-xl border-2 border-blue-500 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <ThemedText className="text-base font-semibold text-gray-900 dark:text-white">
                  Single Wicket · Player vs Player
                </ThemedText>
                <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Each player bats alone until out or their overs run out; the other player bowls.
                </ThemedText>
              </View>
            )}

            {/* Format: limited overs or a Test (each side bats twice) */}
            {!isSingleWicket && (
            <View className="mb-6">
              <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Format
              </ThemedText>
              <View className="flex-row">
                {[
                  { value: "limited", label: "Limited Overs", icon: "timer-outline" },
                  { value: "test", label: "Test Match", icon: "calendar-outline" },
                ].map((format) => {
                  const isSelected = format.value === "test" ? isTestMatch : !isTestMatch;
                  return (
                    <TouchableOpacity
                      key={format.value}
                      onPress={() => {
                        if (format.value === "test") handleInputChange("matchType", "test");
                        else if (isTestMatch) handleInputChange("matchType", "limited");
                      }}
                      className={`flex-1 flex-row p-3 rounded-xl mx-1 items-center justify-center ${
                        isSelected
                          ? "bg-blue-500 border-blue-600"
                          : isDarkMode
                          ? "bg-gray-800 border-gray-700"
                          : "bg-white border-gray-200"
                      } border-2`}
                    >
                      <Ionicons
                        name={format.icon}
                        size={18}
                        color={isSelected ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#6B7280"}
                      />
                      <ThemedText
                        className={`text-sm font-medium ml-2 ${
                          isSelected ? "text-white" : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {format.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            )}

            {isTestMatch ? (
            <View className="mb-6">
              <ThemedText className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                Match Length
              </ThemedText>
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Each team bats twice, with no overs limit. An innings ends when the side is all
                out or declares. A match not finished by the end of the last day is drawn.
              </ThemedText>
              <View className="flex-row flex-wrap">
                {[1, 2, 3, 4, 5].map((days) => {
                  const isSelected = Number(matchDetails.testDays) === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      onPress={() => handleInputChange("testDays", days)}
                      className={`px-3 py-2.5 rounded-lg mx-1 mb-2 ${
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
                        {days} {days === 1 ? "day" : "days"}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            ) : (
            <>
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
                {oversPresets.map(overs => (
                  <TouchableOpacity
                    key={overs}
                    onPress={() => handleInputChange("overs", overs)}
                    className={`px-3 py-2.5 rounded-lg mx-1 mb-2 ${
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
                {matchDetails.overs > 0 && !oversPresets.includes(matchDetails.overs) && (
                  <TouchableOpacity
                    className={`px-3 py-2.5 rounded-lg mx-1 mb-2 bg-blue-500 border-blue-600 border-2`}
                  >
                    <ThemedText className="font-medium text-white">
                      {matchDetails.overs} overs
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
              
            </View>

            {/* Powerplay Selection (none in single wicket) */}
            {!isSingleWicket && (
            <View className="mb-6">
              <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Powerplay Overs
              </ThemedText>
              <View className="flex-row flex-wrap">
                {["None", 1, 2, 3, 4, 6, 8, 10]
                  .filter((p) => p === "None" || p < (matchDetails.overs || 20))
                  .map((powerplay) => {
                    const isSelected =
                      powerplay === "None"
                        ? !matchDetails.powerplay || matchDetails.powerplay === 0
                        : matchDetails.powerplay === powerplay;
                    const label = powerplay === "None" ? "None" : `${powerplay} overs`;

                    return (
                      <TouchableOpacity
                        key={String(powerplay)}
                        onPress={() =>
                          handleInputChange(
                            "powerplay",
                            powerplay === "None" ? 0 : powerplay
                          )
                        }
                        className={`px-3 py-2.5 rounded-lg mx-1 mb-2 ${
                          isSelected
                            ? "bg-blue-500 border-blue-600"
                            : isDarkMode
                            ? "bg-gray-800 border-gray-700"
                            : "bg-white border-gray-200"
                        } border-2`}
                      >
                        <ThemedText
                          className={`font-medium ${
                            isSelected
                              ? "text-white"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
            )}
            </>
            )}
          </>
        )}

        {section.key === "venue" && (
          <>
            {/* Match Date */}
            <View className="mb-6">
              <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Match Date
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.75}
                className={`p-4 rounded-xl flex-row items-center justify-between border-2 ${
                  isDarkMode
                    ? "bg-gray-800 border-blue-600/50"
                    : "bg-white border-blue-200"
                } shadow-sm`}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/60 items-center justify-center mr-3.5">
                    <Ionicons name="calendar" size={22} color="#2563EB" />
                  </View>
                  <View className="flex-1">
                    <ThemedText className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
                      Scheduled Date
                    </ThemedText>
                    <ThemedText className="text-base font-bold text-gray-900 dark:text-white">
                      {formatDate(matchDetails.date)}
                    </ThemedText>
                  </View>
                </View>
                <View className="flex-row items-center px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                  <ThemedText className="text-xs font-bold text-blue-600 dark:text-blue-400 mr-1">
                    Change
                  </ThemedText>
                  <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                </View>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={matchDetails.date}
                  mode="date"
                  display="default"
                  themeVariant={isDarkMode ? "dark" : "light"}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Location Input with Google Places Autocomplete */}
            <View
              className="mb-6"
              onLayout={(e) => {
                locationSectionYRef.current = e.nativeEvent.layout.y;
              }}
            >
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
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
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
          </>
        )}

        {section.key === "conditions" && (
          <>
            {/* Match Type (a Test or single wicket is chosen earlier) */}
            {!isTestMatch && !isSingleWicket && (
            <View className="mb-6">
              <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Match Type
              </ThemedText>
              <View className="flex-row">
                {renderOptionButton("box", "Box Cricket", "cube", matchDetails.matchType === "box")}
                {renderOptionButton("limited", "Limited Overs", "trophy", matchDetails.matchType === "limited")}
              </View>
            </View>
            )}

            {/* Ball Type Selection */}
            <View className="mb-6">
              <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Ball Type
              </ThemedText>
              <View className="flex-row flex-wrap">
                {renderBallTypeOption("tennis", "Tennis Ball", matchDetails.ballType === "tennis")}
                {renderBallTypeOption("leather", "Leather Ball", matchDetails.ballType === "leather")}
              </View>
            </View>

            {/* Pitch Type Selection */}
            <View className="mb-6">
              <ThemedText className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Pitch Type
              </ThemedText>
              <View className="flex-row flex-wrap">
                {renderPitchTypeOption("turf", "Turf / Grass", matchDetails.pitchType === "turf")}
                {renderPitchTypeOption("cement", "Cement", matchDetails.pitchType === "cement")}
                {renderPitchTypeOption("matting", "Matting", matchDetails.pitchType === "matting")}
                {renderPitchTypeOption("astroturf", "AstroTurf", matchDetails.pitchType === "astroturf")}
                {renderPitchTypeOption("mud_rough", "Rough / Soil", matchDetails.pitchType === "mud_rough")}
              </View>
            </View>

            {/* Visual Tracking Options: Wagon Wheel & Pitch Map */}
            <View className="mb-6">
              <ThemedText className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                Visual Tracking Options
              </ThemedText>
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Enable interactive shot and delivery tracking during scoring
              </ThemedText>

              {/* Wagon Wheel Toggle Card */}
              <View
                className={`p-4 rounded-xl mb-3 flex-row items-center justify-between border ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-blue-100 dark:bg-blue-900/40">
                    <MaterialCommunityIcons name="compass-outline" size={22} color="#2563EB" />
                  </View>
                  <View className="flex-1">
                    <ThemedText className="text-base font-semibold text-gray-900 dark:text-white">
                      Wagon Wheel
                    </ThemedText>
                    <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Record batter shot zones and boundary directions
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={Boolean(matchDetails.recordWagonWheel)}
                  onValueChange={handleToggleWagonWheel}
                  trackColor={{ false: isDarkMode ? "#4B5563" : "#D1D5DB", true: "#2563EB" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Pitch Map Toggle Card */}
              <View
                className={`p-4 rounded-xl flex-row items-center justify-between border ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-emerald-100 dark:bg-emerald-900/40">
                    <MaterialCommunityIcons name="target" size={22} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <ThemedText className="text-base font-semibold text-gray-900 dark:text-white">
                      Pitch Map
                    </ThemedText>
                    <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Record bowling lengths, line, and ball pitch landing points
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={Boolean(matchDetails.recordPitchMap)}
                  onValueChange={handleTogglePitchMap}
                  trackColor={{ false: isDarkMode ? "#4B5563" : "#D1D5DB", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </>
        )}
      </AppKeyboardAwareScrollView>

      {/* Sticky Bottom Action Button Bar - ALWAYS VISIBLE */}
      <View
        className={`px-4 py-3 border-t ${
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.08,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        {/* Previous / Next between sections; the last one creates the match */}
        <View className="flex-row items-center gap-3">
          {sectionIndex > 0 && (
            <TouchableOpacity
              onPress={handleBack}
              disabled={isSubmitting}
              accessibilityLabel="Previous"
              className={`py-3.5 rounded-xl items-center justify-center flex-row border ${
                isLastSection ? "px-3.5" : "px-4"
              } ${isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-white"}`}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={18} color={isDarkMode ? "#D1D5DB" : "#374151"} />
              {!isLastSection && (
                <ThemedText className="text-base font-bold ml-1.5 text-gray-700 dark:text-gray-200">
                  Previous
                </ThemedText>
              )}
            </TouchableOpacity>
          )}

          {isLastSection ? (
            <>
              <TouchableOpacity
                onPress={handleScheduleMatch}
                disabled={isSubmitting}
                className={`flex-1 py-3.5 px-3 rounded-xl items-center justify-center border ${
                  isDarkMode
                    ? "border-blue-500/40 bg-gray-800"
                    : "border-blue-400 bg-white"
                } ${isSubmitting ? "opacity-50" : ""}`}
                activeOpacity={0.85}
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
                className={`flex-1 py-3.5 px-3 rounded-xl items-center justify-center bg-blue-600 ${
                  isSubmitting ? "bg-blue-400" : ""
                }`}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ThemedText className="text-white text-base font-bold">
                    Start Match
                  </ThemedText>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={goNext}
              className="flex-1 py-3.5 px-4 rounded-xl items-center justify-center bg-blue-600 flex-row shadow-sm"
              activeOpacity={0.85}
            >
              <ThemedText numberOfLines={1} className="text-white text-base font-bold mr-2">
                Next: {nextSection.short}
              </ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
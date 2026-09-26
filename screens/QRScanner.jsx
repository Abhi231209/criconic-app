import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Image,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { tournamentsApi, teamsApi, userApi } from "@/utils/api";
import { getImageFullUrl } from "@/utils";
import User from "@/utils/User";
import { useSelector } from "react-redux";
import analytics from "@/utils/analytics";

export default function QRScanner({ navigation, route }) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const scanAreaSize = Math.min(windowWidth * 0.72, 280);
  const isDarkMode = colorScheme === "dark";

  const authUser = useSelector((state) => state.auth?.user);
  const unwrappedUser = authUser?.user || authUser || User.user || {};
  const currentUserId =
    unwrappedUser?._id || unwrappedUser?.id || User.id || "";
  const currentUserName =
    unwrappedUser?.username || unwrappedUser?.name || User.name || "Player";

  const preselectedTeamId =
    route?.params?.teamId || route?.params?.teamID || null;
  const onPlayerAddedCallback = route?.params?.cb || null;

  // Camera permissions & state
  const hookResult = typeof useCameraPermissions === "function" ? useCameraPermissions() : [null, null];
  const [permission, requestPermission] = hookResult || [null, null];
  const [fallbackPermission, setFallbackPermission] = useState(null);

  const effectivePermission = permission || fallbackPermission;
  const isPermissionGranted = Boolean(effectivePermission?.granted);

  useEffect(() => {
    if (!isPermissionGranted && Camera?.getCameraPermissionsAsync) {
      Camera.getCameraPermissionsAsync()
        .then((res) => {
          if (res) setFallbackPermission(res);
        })
        .catch(() => {});
    }
  }, [isPermissionGranted]);

  const handleRequestPermission = async () => {
    try {
      if (typeof requestPermission === "function") {
        const res = await requestPermission();
        if (res) {
          setFallbackPermission(res);
          return;
        }
      }
      if (Camera?.requestCameraPermissionsAsync) {
        const res = await Camera.requestCameraPermissionsAsync();
        if (res) setFallbackPermission(res);
      }
    } catch (err) {
      console.warn("[QRScanner] Camera permission request error:", err);
    }
  };

  const [facing, setFacing] = useState("back");
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Modals
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Tournament Join Sheet
  const [tournamentModalVisible, setTournamentModalVisible] = useState(false);
  const [targetTournament, setTargetTournament] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const selectedTournamentTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return (
      myTeams.find(
        (t) => String(t._id || t.id || t.teamId) === String(selectedTeamId)
      ) || null
    );
  }, [myTeams, selectedTeamId]);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [joiningTournament, setJoiningTournament] = useState(false);

  // Team Join Sheet
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [targetTeam, setTargetTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [joiningTeam, setJoiningTeam] = useState(false);

  // Player Scanned Sheet (View Profile or Add to Team)
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [addingPlayerToTeam, setAddingPlayerToTeam] = useState(false);

  const normalizeTeams = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const result = [];

    for (const item of list) {
      if (!item) continue;
      const actual =
        item?.team?.[0] ||
        (item?.teamId && typeof item.teamId === "object" ? item.teamId : null) ||
        item;
      const id = String(
        actual?._id || actual?.id || actual?.teamId || item?._id || item?.id || ""
      );
      const name = String(
        actual?.title ||
          actual?.name ||
          actual?.teamName ||
          item?.title ||
          item?.name ||
          item?.teamName ||
          "Team"
      ).trim();
      const logo =
        actual?.teamLogo ||
        actual?.logo ||
        actual?.image ||
        item?.teamLogo ||
        item?.logo ||
        null;
      const shortName =
        actual?.shortName ||
        item?.shortName ||
        (name ? name.slice(0, 3).toUpperCase() : "TM");
      const location = actual?.location || item?.location || "";

      if (id && !seen.has(id)) {
        seen.add(id);
        result.push({
          ...actual,
          _id: id,
          id: id,
          teamId: id,
          title: name,
          name: name,
          teamName: name,
          teamLogo: logo,
          shortName: shortName,
          location: location,
        });
      }
    }
    return result;
  };

  const extractTeamsList = (teamsRes) => {
    if (!teamsRes) return [];
    if (Array.isArray(teamsRes)) return normalizeTeams(teamsRes);

    const raw = teamsRes?.data || teamsRes;
    const content = raw?.content || raw;

    const fromContentTeams = Array.isArray(content?.teams) ? content.teams : [];
    const fromPlayerDetailTeams = Array.isArray(content?.playerDetail?.teams)
      ? content.playerDetail.teams
      : [];
    const fromRawTeams = Array.isArray(raw?.teams) ? raw.teams : [];
    const fromDataTeams = Array.isArray(raw?.data?.teams) ? raw.data.teams : [];
    const fromData = Array.isArray(raw?.data) ? raw.data : [];
    const fromContent = Array.isArray(content) ? content : [];
    const fromRawArray = Array.isArray(raw) ? raw : [];

    const combined = [
      ...fromContentTeams,
      ...fromPlayerDetailTeams,
      ...fromRawTeams,
      ...fromDataTeams,
      ...fromData,
      ...fromContent,
      ...fromRawArray,
    ];

    return normalizeTeams(combined);
  };

  // Request permissions on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // ─── QR Code Data Parsing ──────────────────────────────────────────────────
  const parseScannedData = (rawValue) => {
    if (!rawValue) return null;
    const str = String(rawValue).trim();

    // 1. Check if valid JSON payload (matches web app standard)
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === "object") {
        const type = String(parsed.type || "").toUpperCase();
        const action = String(parsed.action || "JOIN").toUpperCase();
        const value = String(parsed.value || parsed.id || parsed._id || "");
        if (value) {
          return { type, action, value };
        }
      }
    } catch (e) {
      // Not JSON, continue to URL/ID regex parsing
    }

    // 2. Check for Tournament URL pattern
    const tournMatch = str.match(/tournament[s]?\/([a-fA-F0-9]{24}|[a-zA-Z0-9_-]+)/i);
    if (tournMatch && tournMatch[1]) {
      return { type: "TOURNAMENT", action: "JOIN", value: tournMatch[1] };
    }

    // 3. Check for Team URL pattern
    const teamMatch = str.match(/team[s]?\/([a-fA-F0-9]{24}|[a-zA-Z0-9_-]+)/i);
    if (teamMatch && teamMatch[1]) {
      return { type: "TEAM", action: "JOIN", value: teamMatch[1] };
    }

    // 4. Check for Player URL pattern
    const playerMatch = str.match(/player[s]?\/([a-fA-F0-9]{24}|[a-zA-Z0-9_-]+)/i);
    if (playerMatch && playerMatch[1]) {
      return { type: "PLAYER", action: "JOIN", value: playerMatch[1] };
    }

    // 5. Check for Player Sharing Code pattern (e.g. AB-1a2b)
    if (/^[a-zA-Z0-9]{1,4}-[a-zA-Z0-9]{3,8}$/.test(str)) {
      return { type: "PLAYER", action: "JOIN", value: str };
    }

    // 6. Raw 24-character hexadecimal MongoDB ObjectId
    if (/^[a-fA-F0-9]{24}$/.test(str)) {
      return { type: "UNKNOWN", action: "JOIN", value: str };
    }

    return { type: "TEXT", action: "RAW", value: str };
  };

  // ─── Handle Barcode Scanned Event ──────────────────────────────────────────
  const handleBarcodeScanned = ({ data }) => {
    if (scanned || !data) return;
    setScanned(true);
    processScanResult(data);
  };

  const processScanResult = async (data) => {
    const parsed = parseScannedData(data);
    if (!parsed || !parsed.value) {
      Alert.alert(
        "Invalid QR Code",
        "The scanned QR code is not recognized as a valid Criconic code.",
        [{ text: "Scan Again", onPress: () => setScanned(false) }]
      );
      return;
    }

    analytics.logAction("qr_code_scanned", "scanner", {
      type: parsed.type || "unknown",
      code_id: parsed.value || "",
    });

    if (parsed.type === "TOURNAMENT") {
      openTournamentJoinSheet(parsed.value);
    } else if (parsed.type === "TEAM") {
      openTeamJoinSheet(parsed.value);
    } else if (parsed.type === "PLAYER") {
      openPlayerSheet(parsed.value);
    } else {
      // Unknown 24-character ObjectId or code: check tournament, team, or player
      checkAndRouteUnknownId(parsed.value);
    }
  };

  // ─── Check & Route Unknown ID ──────────────────────────────────────────────
  const checkAndRouteUnknownId = async (id) => {
    try {
      // Try tournament first
      const tournRes = await tournamentsApi.getTournamentById(id);
      const tournData = tournRes?.data?.content || tournRes?.data?.tournament || tournRes?.data;
      if (tournData && (tournData._id || tournData.id)) {
        openTournamentJoinSheet(tournData._id || tournData.id, tournData);
        return;
      }
    } catch (e) {
      // Not a tournament
    }

    try {
      // Try team next
      const teamRes = await teamsApi.getTeamById(id);
      const tData = Array.isArray(teamRes?.data) ? teamRes.data[0] : teamRes?.data;
      if (tData && (tData._id || tData.id)) {
        openTeamJoinSheet(tData._id || tData.id, tData);
        return;
      }
    } catch (e) {
      // Not a team
    }

    try {
      // Try player profile (by ObjectId or sharingCode)
      const playerRes = await userApi.getProfile(id);
      const pData = playerRes?.data?.data || playerRes?.data?.user || playerRes?.data;
      if (pData && (pData._id || pData.id || pData.username)) {
        openPlayerSheet(pData._id || pData.id || id, pData);
        return;
      }
    } catch (e) {
      // Not a player
    }

    Alert.alert(
      "Code Scanned",
      `Scanned value: ${id}\nUnable to locate a matching tournament, team, or player.`,
      [{ text: "Scan Again", onPress: () => setScanned(false) }]
    );
  };

  // ─── Player Scanned Sheet Handlers ─────────────────────────────────────────
  const openPlayerSheet = async (playerIdentifier, preloadedData = null) => {
    setLoadingPlayer(true);
    setPlayerModalVisible(true);
    setSelectedTeamId(preselectedTeamId || null);

    try {
      let pData = preloadedData;
      if (!pData) {
        const res = await userApi.getProfile(playerIdentifier);
        pData = res?.data?.data || res?.data?.user || res?.data;
      }
      if (!pData || (!pData._id && !pData.id && !pData.username)) {
        Alert.alert(
          "Player Not Found",
          "Could not locate a player matching that QR code or sharing code."
        );
        setPlayerModalVisible(false);
        setScanned(false);
        return;
      }
      setTargetPlayer(pData);

      let loadedTeams = [];
      try {
        const teamsRes = await teamsApi.getMyTeams({ userId: currentUserId });
        loadedTeams = extractTeamsList(teamsRes);
      } catch (_) {}

      if (loadedTeams.length === 0 && currentUserId) {
        try {
          const directRes = await userApi.getProfile(currentUserId);
          const pTeams =
            directRes?.data?.data?.teams ||
            directRes?.data?.user?.teams ||
            directRes?.data?.teams;
          if (Array.isArray(pTeams) && pTeams.length > 0) {
            loadedTeams = extractTeamsList(pTeams);
          }
        } catch (_) {}
      }

      setMyTeams(loadedTeams);
      if (preselectedTeamId) {
        setSelectedTeamId(preselectedTeamId);
      } else if (loadedTeams.length > 0) {
        setSelectedTeamId(loadedTeams[0]._id || loadedTeams[0].id);
      }
    } catch (err) {
      console.warn("[QRScanner] Failed to fetch player details:", err);
      Alert.alert("Error", "Could not load player details. Please try again.");
      setPlayerModalVisible(false);
      setScanned(false);
    } finally {
      setLoadingPlayer(false);
    }
  };

  const handleConfirmAddPlayerToTeam = async () => {
    const tId = selectedTeamId || preselectedTeamId;
    if (!tId) {
      Alert.alert("Selection Required", "Please select a team to add this player to.");
      return;
    }
    const pId = targetPlayer?._id || targetPlayer?.id;
    const pName = targetPlayer?.username || targetPlayer?.name || "Player";
    if (!pId) return;

    setAddingPlayerToTeam(true);
    try {
      const res = await teamsApi.joinTeamAsPlayer(tId, {
        players: [
          {
            id: String(pId),
            username: pName,
            name: pName,
          },
        ],
      });

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        onPlayerAddedCallback?.({
          id: String(pId),
          _id: String(pId),
          name: pName,
          username: pName,
        });
        Alert.alert(
          "Player Added! 🎉",
          `${pName} has been added to your team.`,
          [
            {
              text: preselectedTeamId ? "Done" : "View Team",
              onPress: () => {
                setPlayerModalVisible(false);
                if (preselectedTeamId) {
                  navigation.goBack();
                } else {
                  navigation.replace(SCREENS.TeamProfile, { teamId: tId });
                }
              },
            },
          ]
        );
      } else {
        const errMsg =
          res?.data?.message || res?.data?.error || "Could not add player to team.";
        Alert.alert("Unable to Add Player", errMsg);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to add player to team.";
      Alert.alert("Error", msg);
    } finally {
      setAddingPlayerToTeam(false);
    }
  };

  // ─── Tournament Join Sheet Handlers ────────────────────────────────────────
  const openTournamentJoinSheet = async (tournamentId, preloadedData = null) => {
    setLoadingTournament(true);
    setTournamentModalVisible(true);
    setSelectedTeamId(null);

    try {
      let tData = preloadedData;
      if (!tData) {
        const res = await tournamentsApi.getTournamentById(tournamentId);
        tData = res?.data?.content || res?.data?.tournament || res?.data;
      }
      setTargetTournament(tData || { _id: tournamentId, title: "Tournament" });

      // Fetch user's teams to allow selecting which team joins
      let loadedTeams = [];
      try {
        const teamsRes = await teamsApi.getMyTeams({ userId: currentUserId });
        loadedTeams = extractTeamsList(teamsRes);
      } catch (_) {}

      if (loadedTeams.length === 0 && currentUserId) {
        try {
          const directRes = await userApi.getProfile(currentUserId);
          const pTeams =
            directRes?.data?.data?.teams ||
            directRes?.data?.user?.teams ||
            directRes?.data?.teams;
          if (Array.isArray(pTeams) && pTeams.length > 0) {
            loadedTeams = extractTeamsList(pTeams);
          }
        } catch (_) {}
      }

      setMyTeams(loadedTeams);
      if (preselectedTeamId) {
        setSelectedTeamId(preselectedTeamId);
      } else if (loadedTeams.length === 1) {
        setSelectedTeamId(loadedTeams[0]._id || loadedTeams[0].id);
      } else {
        setSelectedTeamId(null);
      }
    } catch (err) {
      console.warn("[QRScanner] Failed to fetch tournament details:", err);
      Alert.alert("Error", "Could not load tournament details. Please try again.");
      setTournamentModalVisible(false);
      setScanned(false);
    } finally {
      setLoadingTournament(false);
    }
  };

  const handleConfirmJoinTournament = async () => {
    if (!selectedTeamId) {
      Alert.alert("Selection Required", "Please select one of your teams to register.");
      return;
    }

    const tId = targetTournament?._id || targetTournament?.id;
    if (!tId) return;

    setJoiningTournament(true);
    try {
      const res = await tournamentsApi.addTeamToTournament(tId, {
        team: selectedTeamId,
      });

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        Alert.alert(
          "Joined Successfully! 🎉",
          "Your team has been registered for this tournament.",
          [
            {
              text: "View Tournament",
              onPress: () => {
                setTournamentModalVisible(false);
                navigation.replace(SCREENS.TournamentProfile, { tournamentId: tId });
              },
            },
          ]
        );
      } else {
        const errMsg =
          res?.data?.message || res?.data?.error || "Could not join tournament.";
        Alert.alert("Unable to Join", errMsg);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to join tournament.";
      Alert.alert("Error", msg);
    } finally {
      setJoiningTournament(false);
    }
  };

  // ─── Team Join Sheet Handlers ──────────────────────────────────────────────
  const openTeamJoinSheet = async (teamId, preloadedData = null) => {
    setLoadingTeam(true);
    setTeamModalVisible(true);

    try {
      let tData = preloadedData;
      if (!tData) {
        const res = await teamsApi.getTeamById(teamId);
        tData = Array.isArray(res?.data) ? res.data[0] : res?.data;
      }
      setTargetTeam(tData || { _id: teamId, title: "Team" });
    } catch (err) {
      console.warn("[QRScanner] Failed to fetch team details:", err);
      Alert.alert("Error", "Could not load team details. Please try again.");
      setTeamModalVisible(false);
      setScanned(false);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleConfirmJoinTeam = async () => {
    const tId = targetTeam?._id || targetTeam?.id;
    if (!tId) return;
    if (!currentUserId) {
      Alert.alert("Login Required", "Please sign in to join a team.");
      return;
    }

    setJoiningTeam(true);
    try {
      const playerData = {
        players: [
          {
            id: String(currentUserId),
            username: currentUserName,
            name: currentUserName,
          },
        ],
      };

      const res = await teamsApi.joinTeamAsPlayer(tId, playerData);

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        Alert.alert(
          "Joined Successfully! 🎉",
          `You have joined ${targetTeam?.title || "the team"}.`,
          [
            {
              text: "View Team Profile",
              onPress: () => {
                setTeamModalVisible(false);
                navigation.replace(SCREENS.TeamProfile, { teamId: tId });
              },
            },
          ]
        );
      } else {
        const errMsg =
          res?.data?.message || res?.data?.error || "Could not join team.";
        Alert.alert("Unable to Join", errMsg);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to join team.";
      Alert.alert("Error", msg);
    } finally {
      setJoiningTeam(false);
    }
  };

  // ─── Pick Image From Gallery Fallback ──────────────────────────────────────
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        if (CameraView.scanFromURLAsync) {
          const scanResults = await CameraView.scanFromURLAsync(imageUri, ["qr"]);
          if (scanResults && scanResults.length > 0 && scanResults[0].data) {
            setScanned(true);
            processScanResult(scanResults[0].data);
            return;
          }
        }
        Alert.alert(
          "No QR Code Found",
          "Could not detect a QR code in the selected image. Please try another image or enter the code manually."
        );
      }
    } catch (err) {
      console.warn("[QRScanner] Error scanning from gallery image:", err);
      Alert.alert("Scan Error", "Failed to process the selected image.");
    }
  };

  // ─── Manual Input Submission ───────────────────────────────────────────────
  const handleManualCodeSubmit = () => {
    if (!manualCode || !manualCode.trim()) {
      Alert.alert("Code Required", "Please enter a sharing code, tournament ID, or team ID.");
      return;
    }
    const codeToProcess = manualCode.trim();
    setShowManualInput(false);
    setManualCode("");
    setScanned(true);
    processScanResult(codeToProcess);
  };

  // ─── Camera Scanner / Permission UI ────────────────────────────────────────
  return (
    <View style={styles.container}>
      {!isPermissionGranted ? (
        <SafeAreaView
          className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} justify-between px-6 py-8`}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full items-center justify-center bg-gray-200 dark:bg-gray-800"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDarkMode ? "#FFFFFF" : "#111827"}
              />
            </TouchableOpacity>
            <ThemedText className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              QR Scanner
            </ThemedText>
            <View className="w-10" />
          </View>

          <View className="items-center px-4">
            <View className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-6">
              <Ionicons name="camera-outline" size={48} color="#2563EB" />
            </View>
            <ThemedText className={`text-xl font-bold text-center mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Camera Access Required
            </ThemedText>
            <ThemedText
              className={`text-sm text-center ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-8 leading-5`}
            >
              Allow Criconic camera permissions to quickly scan Tournament, Team,
              and Player QR codes.
            </ThemedText>

            <TouchableOpacity
              onPress={handleRequestPermission}
              activeOpacity={0.8}
              className="w-full bg-blue-600 py-3.5 rounded-xl items-center shadow-sm mb-4"
            >
              <ThemedText className="text-white font-bold text-base">
                Enable Camera Access
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowManualInput(true)}
              activeOpacity={0.8}
              className={`w-full py-3.5 rounded-xl items-center border ${
                isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-white"
              } mb-3`}
            >
              <ThemedText className={`font-semibold text-sm ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                Enter Code Manually
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
              className="flex-row items-center py-2"
            >
              <Ionicons name="images-outline" size={18} color="#2563EB" />
              <ThemedText className="text-blue-600 font-semibold text-sm ml-2">
                Scan from Gallery Image
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View />
        </SafeAreaView>
      ) : (
        <>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Viewfinder Overlay with Dark Cutout */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* Top mask */}
        <View style={styles.maskTop} />

        {/* Middle row containing left mask, scan area, right mask */}
        <View style={[styles.maskRow, { height: scanAreaSize }]}>
          <View style={styles.maskSide} />
          <View style={[styles.scanBox, { width: scanAreaSize, height: scanAreaSize }]}>
            {/* 4 Corner brackets */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.maskSide} />
        </View>

        {/* Bottom mask */}
        <View style={[styles.maskBottom, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <ThemedText className="text-white text-center font-medium text-sm mt-4 px-6">
            Align QR code inside the frame to scan
          </ThemedText>
          <ThemedText className="text-gray-400 text-center text-xs mt-1">
            Join tournaments or teams instantly
          </ThemedText>

          {/* Action Row */}
          <View className="flex-row justify-center items-center mt-6 space-x-6">
            <TouchableOpacity
              onPress={handlePickFromGallery}
              activeOpacity={0.7}
              className="items-center px-4"
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mb-1">
                <Ionicons name="images-outline" size={22} color="#FFFFFF" />
              </View>
              <ThemedText className="text-white text-xs">Gallery</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowManualInput(true)}
              activeOpacity={0.7}
              className="items-center px-4"
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mb-1">
                <Ionicons name="keypad-outline" size={22} color="#FFFFFF" />
              </View>
              <ThemedText className="text-white text-xs">Enter Code</ThemedText>
            </TouchableOpacity>

            {scanned && (
              <TouchableOpacity
                onPress={() => setScanned(false)}
                activeOpacity={0.7}
                className="items-center px-4"
              >
                <View className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center mb-1">
                  <Ionicons name="refresh" size={22} color="#FFFFFF" />
                </View>
                <ThemedText className="text-white text-xs">Rescan</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Floating Header Controls */}
      <SafeAreaView style={styles.headerControls}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={() => setTorch((prev) => !prev)}
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              torch ? "bg-yellow-400" : "bg-black/50"
            }`}
          >
            <Ionicons
              name={torch ? "flash" : "flash-off-outline"}
              size={20}
              color={torch ? "#000000" : "#FFFFFF"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFacing((prev) => (prev === "back" ? "front" : "back"))}
            className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </>
      )}

      {/* ─── Join Tournament Modal (matches TeamAddToTournamentPop.jsx) ─── */}
      <Modal
        visible={tournamentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setTournamentModalVisible(false);
          setScanned(false);
        }}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View
            className={`rounded-t-3xl max-h-[85%] ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } p-6 shadow-xl flex-col`}
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Ionicons name="trophy-outline" size={22} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <ThemedText
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                    numberOfLines={1}
                  >
                    Join Tournament
                  </ThemedText>
                  <ThemedText
                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Select your team to enter
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setTournamentModalVisible(false);
                  setScanned(false);
                }}
                className="p-1"
              >
                <Ionicons
                  name="close-circle-outline"
                  size={26}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            {loadingTournament ? (
              <View className="py-16 items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
                <ThemedText
                  className={`mt-3 text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Loading tournament details...
                </ThemedText>
              </View>
            ) : (
              <>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  className="mt-4 flex-1"
                  contentContainerStyle={{ paddingBottom: 12 }}
                >
                  {/* Tournament Card */}
                  <View
                    className={`p-4 rounded-2xl mb-5 flex-row items-center ${
                      isDarkMode ? "bg-gray-700/60" : "bg-blue-50"
                    }`}
                  >
                    {targetTournament?.logoImage ? (
                      <Image
                        source={{ uri: getImageFullUrl(targetTournament.logoImage) }}
                        className="w-14 h-14 rounded-full mr-3 bg-gray-200"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-14 h-14 rounded-full bg-blue-600 items-center justify-center mr-3">
                        <Ionicons name="trophy" size={24} color="#FFFFFF" />
                      </View>
                    )}
                    <View className="flex-1">
                      <ThemedText
                        className={`font-bold text-base ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                        numberOfLines={1}
                      >
                        {targetTournament?.title || "Tournament"}
                      </ThemedText>
                      {targetTournament?.location && (
                        <ThemedText
                          className={`text-xs mt-0.5 ${
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                          numberOfLines={1}
                        >
                          📍 {targetTournament.location}
                        </ThemedText>
                      )}
                      {targetTournament?.date?.start && (
                        <ThemedText
                          className={`text-xs mt-0.5 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          📅 Start:{" "}
                          {new Date(targetTournament.date.start).toLocaleDateString()}
                        </ThemedText>
                      )}
                    </View>
                  </View>

                  {/* Team Selection List */}
                  <ThemedText
                    className={`text-sm font-bold mb-2 ${
                      isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    Select Team to Register:
                  </ThemedText>

                  {myTeams.length === 0 ? (
                    <View
                      className={`py-6 items-center px-4 rounded-xl mb-4 ${
                        isDarkMode ? "bg-gray-700/40" : "bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name="shirt-outline"
                        size={32}
                        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      />
                      <ThemedText
                        className={`font-semibold text-sm mt-2 text-center ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        No Teams Found
                      </ThemedText>
                      <ThemedText
                        className={`text-xs text-center mt-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        You need to create a team before you can join tournaments.
                      </ThemedText>
                      <TouchableOpacity
                        onPress={() => {
                          setTournamentModalVisible(false);
                          navigation.navigate(SCREENS.CreateTeam);
                        }}
                        className="mt-4 bg-blue-600 px-5 py-2 rounded-full"
                      >
                        <ThemedText className="text-white text-xs font-bold">
                          Create a Team
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    myTeams.map((team, idx) => {
                      const tId = team._id || team.id || team.teamId;
                      const isSelected = String(selectedTeamId) === String(tId);
                      return (
                        <TouchableOpacity
                          key={String(tId || idx)}
                          onPress={() => setSelectedTeamId(tId)}
                          activeOpacity={0.8}
                          className={`flex-row items-center p-3.5 rounded-xl mb-2 border ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                              : isDarkMode
                              ? "border-gray-700 bg-gray-700/50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          {team.teamLogo ? (
                            <Image
                              source={{ uri: getImageFullUrl(team.teamLogo) }}
                              className="w-10 h-10 rounded-full mr-3 bg-gray-200"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center mr-3">
                              <ThemedText className="text-white font-bold text-sm">
                                {(team.shortName || team.title || "TM")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </ThemedText>
                            </View>
                          )}

                          <View className="flex-1">
                            <ThemedText
                              className={`font-semibold text-sm ${
                                isSelected
                                  ? isDarkMode
                                    ? "text-blue-400 font-bold"
                                    : "text-blue-700 font-bold"
                                  : isDarkMode
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                              numberOfLines={1}
                            >
                              {team.title || team.name || team.teamName || "Team"}
                            </ThemedText>
                            {team.location && (
                              <ThemedText
                                className={`text-xs ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                {team.location}
                              </ThemedText>
                            )}
                          </View>

                          <View
                            className={`w-6 h-6 rounded-full border items-center justify-center ${
                              isSelected
                                ? "border-blue-600 bg-blue-600"
                                : isDarkMode
                                ? "border-gray-600"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>

                {/* Fixed CTA Action Button at Bottom */}
                {selectedTeamId ? (
                  <View className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <TouchableOpacity
                      onPress={handleConfirmJoinTournament}
                      disabled={joiningTournament}
                      activeOpacity={0.85}
                      className={`py-3.5 rounded-xl items-center shadow-md ${
                        joiningTournament
                          ? "bg-blue-400"
                          : "bg-blue-600 active:bg-blue-700"
                      }`}
                    >
                      {joiningTournament ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText className="text-white font-bold text-base">
                          {selectedTournamentTeam?.title
                            ? `Join Tournament as ${selectedTournamentTeam.title}`
                            : "Join Tournament"}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : myTeams.length > 0 ? (
                  <View className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <View
                      className={`py-3 px-4 rounded-xl items-center border border-dashed ${
                        isDarkMode
                          ? "bg-gray-700/30 border-gray-600"
                          : "bg-gray-50 border-gray-300"
                      }`}
                    >
                      <ThemedText
                        className={`text-xs font-semibold ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        👆 Select a team above to join the tournament
                      </ThemedText>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Join Team Modal (matches AddPlayerToTeam.jsx) ─── */}
      <Modal
        visible={teamModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setTeamModalVisible(false);
          setScanned(false);
        }}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View
            className={`rounded-t-3xl max-h-[80%] ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } p-6 shadow-xl`}
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Ionicons name="shirt-outline" size={22} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <ThemedText
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                    numberOfLines={1}
                  >
                    Join Team
                  </ThemedText>
                  <ThemedText
                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Confirm your registration as a player
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setTeamModalVisible(false);
                  setScanned(false);
                }}
                className="p-1"
              >
                <Ionicons
                  name="close-circle-outline"
                  size={26}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            {loadingTeam ? (
              <View className="py-16 items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
                <ThemedText
                  className={`mt-3 text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Loading team details...
                </ThemedText>
              </View>
            ) : (
              <View className="mt-5">
                {/* Team Identity */}
                <View className="items-center mb-6">
                  {targetTeam?.teamLogo ? (
                    <Image
                      source={{ uri: getImageFullUrl(targetTeam.teamLogo) }}
                      className="w-20 h-20 rounded-full mb-3 bg-gray-200"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center mb-3">
                      <ThemedText className="text-white font-bold text-2xl">
                        {(targetTeam?.shortName || targetTeam?.title || "TM")
                          .slice(0, 2)
                          .toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <ThemedText
                    className={`font-bold text-xl text-center ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {targetTeam?.title || targetTeam?.name || "Team"}
                  </ThemedText>
                  {targetTeam?.location && (
                    <ThemedText
                      className={`text-xs mt-1 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      📍 Ground: {targetTeam.location}
                    </ThemedText>
                  )}
                </View>

                {/* Current Player Info Box */}
                <View
                  className={`p-4 rounded-xl mb-6 flex-row items-center ${
                    isDarkMode ? "bg-gray-700/50" : "bg-gray-100"
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-green-600 items-center justify-center mr-3">
                    <ThemedText className="text-white font-bold text-sm">
                      {currentUserName.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View className="flex-1">
                    <ThemedText
                      className={`font-semibold text-sm ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {currentUserName}
                    </ThemedText>
                    <ThemedText
                      className={`text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Joining as team squad player
                    </ThemedText>
                  </View>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                  onPress={handleConfirmJoinTeam}
                  disabled={joiningTeam}
                  className={`py-3.5 rounded-xl items-center shadow-sm ${
                    joiningTeam ? "bg-blue-400" : "bg-blue-600"
                  }`}
                >
                  {joiningTeam ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText className="text-white font-bold text-base">
                      Confirm & Join Team
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Player Scanned Modal (View Profile or Add to Team) ─── */}
      <Modal
        visible={playerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setPlayerModalVisible(false);
          setScanned(false);
        }}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View
            className={`rounded-t-3xl max-h-[85%] ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } p-6 shadow-xl`}
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Ionicons name="person-outline" size={22} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <ThemedText
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                    numberOfLines={1}
                  >
                    Player Found
                  </ThemedText>
                  <ThemedText
                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Add player to your team or view profile
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setPlayerModalVisible(false);
                  setScanned(false);
                }}
                className="p-1"
              >
                <Ionicons
                  name="close-circle-outline"
                  size={26}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            {loadingPlayer ? (
              <View className="py-16 items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
                <ThemedText
                  className={`mt-3 text-sm font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Loading player details...
                </ThemedText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
                {/* Player Identity Card */}
                <View
                  className={`p-4 rounded-2xl mb-5 flex-row items-center ${
                    isDarkMode ? "bg-gray-700/60" : "bg-blue-50"
                  }`}
                >
                  {targetPlayer?.profileImg || targetPlayer?.profileImage ? (
                    <Image
                      source={{
                        uri: getImageFullUrl(
                          targetPlayer.profileImg || targetPlayer.profileImage
                        ),
                      }}
                      className="w-14 h-14 rounded-full mr-3 bg-gray-200"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-blue-600 items-center justify-center mr-3">
                      <ThemedText className="text-white font-bold text-lg">
                        {(targetPlayer?.username || targetPlayer?.name || "P")
                          .charAt(0)
                          .toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <View className="flex-1">
                    <ThemedText
                      className={`font-bold text-base ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                      numberOfLines={1}
                    >
                      {targetPlayer?.username || targetPlayer?.name || "Player"}
                    </ThemedText>
                    {targetPlayer?.sharingCode && (
                      <ThemedText
                        className={`text-xs mt-0.5 ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        🆔 Code: {targetPlayer.sharingCode}
                      </ThemedText>
                    )}
                    {targetPlayer?.batStyle && (
                      <ThemedText
                        className={`text-xs mt-0.5 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        🏏 {targetPlayer.batStyle}
                        {targetPlayer?.ballStyle ? ` • ${targetPlayer.ballStyle}` : ""}
                      </ThemedText>
                    )}
                  </View>
                </View>

                {/* Team Selection if user has teams */}
                {myTeams.length > 0 && (
                  <>
                    <ThemedText
                      className={`text-sm font-bold mb-2 ${
                        isDarkMode ? "text-gray-200" : "text-gray-800"
                      }`}
                    >
                      Add Player to Team:
                    </ThemedText>
                    {myTeams.map((team, idx) => {
                      const tId = team._id || team.id || team.teamId;
                      const isSelected = String(selectedTeamId) === String(tId);
                      return (
                        <TouchableOpacity
                          key={String(tId || idx)}
                          onPress={() => setSelectedTeamId(tId)}
                          activeOpacity={0.8}
                          className={`flex-row items-center p-3 rounded-xl mb-2 border ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                              : isDarkMode
                              ? "border-gray-700 bg-gray-700/50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <View className="flex-1">
                            <ThemedText
                              className={`font-semibold text-sm ${
                                isSelected
                                  ? isDarkMode
                                    ? "text-blue-400 font-bold"
                                    : "text-blue-700 font-bold"
                                  : isDarkMode
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                              numberOfLines={1}
                            >
                              {team.title || team.name || team.teamName || "Team"}
                            </ThemedText>
                          </View>
                          <View
                            className={`w-5 h-5 rounded-full border items-center justify-center ${
                              isSelected
                                ? "border-blue-600 bg-blue-600"
                                : isDarkMode
                                ? "border-gray-600"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      onPress={handleConfirmAddPlayerToTeam}
                      disabled={addingPlayerToTeam || !selectedTeamId}
                      className={`py-3.5 rounded-xl items-center mt-2 mb-3 shadow-sm ${
                        addingPlayerToTeam || !selectedTeamId
                          ? "bg-blue-400"
                          : "bg-blue-600"
                      }`}
                    >
                      {addingPlayerToTeam ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText className="text-white font-bold text-base">
                          Add to Selected Team
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {/* View Profile Button */}
                <TouchableOpacity
                  onPress={() => {
                    const pid = targetPlayer?._id || targetPlayer?.id;
                    setPlayerModalVisible(false);
                    setScanned(false);
                    if (pid) {
                      navigation.navigate(SCREENS.PlayerProfile, {
                        playerId: String(pid),
                      });
                    }
                  }}
                  className={`py-3.5 rounded-xl items-center border ${
                    isDarkMode
                      ? "border-gray-600 bg-gray-700"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  <ThemedText
                    className={`font-bold text-sm ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    View Player Profile
                  </ThemedText>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Manual Code Entry Modal ─── */}
      <Modal
        visible={showManualInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowManualInput(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View
            className={`w-full p-6 rounded-2xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <ThemedText
              className={`text-lg font-bold mb-2 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Enter Code Manually
            </ThemedText>
            <ThemedText
              className={`text-xs mb-4 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Paste the tournament ID, team ID, or scanned link payload.
            </ThemedText>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Paste code or ID here..."
              placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
              autoCapitalize="none"
              className={`w-full p-3.5 rounded-xl border mb-5 font-mono text-sm ${
                isDarkMode
                  ? "bg-gray-900 border-gray-700 text-white"
                  : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowManualInput(false)}
                className={`flex-1 py-3 rounded-xl items-center ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <ThemedText
                  className={`font-semibold text-sm ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleManualCodeSubmit}
                className="flex-1 py-3 rounded-xl items-center bg-blue-600"
              >
                <ThemedText className="font-semibold text-sm text-white">
                  Submit
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  maskRow: {
    flexDirection: "row",
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  scanBox: {
    position: "relative",
    backgroundColor: "transparent",
  },
  maskBottom: {
    flex: 1.3,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#3B82F6",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  headerControls: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

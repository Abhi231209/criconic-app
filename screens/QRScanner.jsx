import React, { useState, useEffect, useRef } from "react";
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
  Dimensions,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { tournamentsApi, teamsApi } from "@/utils/api";
import { getImageFullUrl } from "@/utils";
import User from "@/utils/User";
import { useSelector } from "react-redux";

const { width, height } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(width * 0.72, 280);

export default function QRScanner({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const authUser = useSelector((state) => state.auth?.user);
  const currentUserId = authUser?._id || User.id || authUser?.id || "";
  const currentUserName =
    authUser?.username || authUser?.name || User.name || "Player";

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
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [joiningTournament, setJoiningTournament] = useState(false);

  // Team Join Sheet
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [targetTeam, setTargetTeam] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [joiningTeam, setJoiningTeam] = useState(false);

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

    // 5. Raw 24-character hexadecimal MongoDB ObjectId
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

    if (parsed.type === "TOURNAMENT") {
      openTournamentJoinSheet(parsed.value);
    } else if (parsed.type === "TEAM") {
      openTeamJoinSheet(parsed.value);
    } else if (parsed.type === "PLAYER") {
      navigation.navigate(SCREENS.PlayerProfile, { playerId: parsed.value });
      setScanned(false);
    } else {
      // Unknown 24-character ObjectId: check whether it is a tournament or team
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
        openTournamentJoinSheet(id, tournData);
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
        openTeamJoinSheet(id, tData);
        return;
      }
    } catch (e) {
      // Not a team
    }

    Alert.alert(
      "Code Scanned",
      `Scanned value: ${id}\nUnable to locate a matching tournament or team.`,
      [{ text: "Scan Again", onPress: () => setScanned(false) }]
    );
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
      const teamsRes = await teamsApi.getMyTeams();
      const loadedTeams = Array.isArray(teamsRes?.data)
        ? teamsRes.data
        : Array.isArray(teamsRes?.data?.teams)
        ? teamsRes.data.teams
        : [];
      setMyTeams(loadedTeams);
      if (loadedTeams.length > 0) {
        setSelectedTeamId(loadedTeams[0]._id || loadedTeams[0].id);
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

    setJoiningTeam(true);
    try {
      const playerData = [
        {
          id: currentUserId,
          username: currentUserName,
          name: currentUserName,
        },
      ];

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        if (CameraView.scanFromURLAsync) {
          const scanResults = await CameraView.scanFromURLAsync(imageUri, ["qr"]);
          if (scanResults && scanResults.length > 0 && scanResults[0].data) {
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
      Alert.alert("Code Required", "Please enter a tournament or team code/ID.");
      return;
    }
    setShowManualInput(false);
    processScanResult(manualCode.trim());
    setManualCode("");
  };

  // ─── Permission Denied UI ──────────────────────────────────────────────────
  if (!isPermissionGranted) {
    return (
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
          <ThemedText className="text-lg font-bold">QR Scanner</ThemedText>
          <View className="w-10" />
        </View>

        <View className="items-center px-4">
          <View className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-6">
            <Ionicons name="camera-outline" size={48} color="#2563EB" />
          </View>
          <ThemedText className="text-xl font-bold text-center mb-2">
            Camera Access Required
          </ThemedText>
          <ThemedText
            className={`text-sm text-center ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-8 leading-5`}
          >
            Allow Criconic camera permissions to quickly scan Tournament and Team
            QR codes and join directly.
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
            <ThemedText className="font-semibold text-sm">
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

        {/* Manual Code Entry Modal */}
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
              <ThemedText className="text-lg font-bold mb-2">
                Enter Code Manually
              </ThemedText>
              <ThemedText
                className={`text-xs mb-4 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Enter the Tournament ID, Team ID, or scanned link payload.
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
                  <ThemedText className="font-semibold text-sm">Cancel</ThemedText>
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
      </SafeAreaView>
    );
  }

  // ─── Camera Scanner UI ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
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
        <View style={styles.maskRow}>
          <View style={styles.maskSide} />
          <View style={styles.scanBox}>
            {/* 4 Corner brackets */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.maskSide} />
        </View>

        {/* Bottom mask */}
        <View style={styles.maskBottom}>
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
            } p-6 shadow-xl`}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Ionicons name="trophy-outline" size={22} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <ThemedText className="font-bold text-lg" numberOfLines={1}>
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
                <ThemedText className="mt-3 text-sm font-medium">
                  Loading tournament details...
                </ThemedText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
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
                    <ThemedText className="font-bold text-base" numberOfLines={1}>
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
                <ThemedText className="text-sm font-bold mb-2">
                  Select Team to Register:
                </ThemedText>

                {myTeams.length === 0 ? (
                  <View className="py-6 items-center px-4 bg-gray-100 dark:bg-gray-700/40 rounded-xl mb-4">
                    <Ionicons
                      name="shirt-outline"
                      size={32}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                    <ThemedText className="font-semibold text-sm mt-2 text-center">
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
                  myTeams.map((team) => {
                    const isSelected = selectedTeamId === (team._id || team.id);
                    return (
                      <TouchableOpacity
                        key={team._id || team.id}
                        onPress={() => setSelectedTeamId(team._id || team.id)}
                        activeOpacity={0.8}
                        className={`flex-row items-center p-3.5 rounded-xl mb-2 border ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                            : isDarkMode
                            ? "border-gray-700 bg-gray-750"
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
                          <ThemedText className="font-semibold text-sm" numberOfLines={1}>
                            {team.title || team.name}
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

                {/* Submit Action */}
                {myTeams.length > 0 && (
                  <TouchableOpacity
                    onPress={handleConfirmJoinTournament}
                    disabled={joiningTournament || !selectedTeamId}
                    className={`py-3.5 rounded-xl items-center mt-4 mb-2 shadow-sm ${
                      joiningTournament || !selectedTeamId ? "bg-blue-400" : "bg-blue-600"
                    }`}
                  >
                    {joiningTournament ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText className="text-white font-bold text-base">
                        Register Team for Tournament
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
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
          >
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Ionicons name="shirt-outline" size={22} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <ThemedText className="font-bold text-lg" numberOfLines={1}>
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
                <ThemedText className="mt-3 text-sm font-medium">
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
                  <ThemedText className="font-bold text-xl text-center">
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
                    <ThemedText className="font-semibold text-sm">
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
            <ThemedText className="text-lg font-bold mb-2">
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
                <ThemedText className="font-semibold text-sm">Cancel</ThemedText>
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
    height: SCAN_AREA_SIZE,
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  scanBox: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
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

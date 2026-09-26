import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  FlatList,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import QRCode from "react-native-qrcode-svg";
import { SCANNER_TYPE_ACTION } from "@/utils/Common";
import { searchApi, teamsApi } from "@/utils/api";
import AppKeyboardAwareScrollView from "@/components/ui/custom/AppKeyboardAwareScrollView";
import { showGlobalAlert } from "@/contexts/AlertContext";
import { useSelector } from "react-redux";
import User from "@/utils/User";
import * as Contacts from "expo-contacts";
import SCREENS from "@/screens";

export default function AddPlayer({
  showHeader = true,
  isEmbedded = false,
  teamID: propTeamID,
  cb: propCb,
  isOwner: propIsOwner,
  team: propTeam,
}) {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { teamID: routeTeamID, teamId: routeTeamId, cb: routeCb, isOwner: routeIsOwner, team: routeTeam } =
    route.params || {};

  const teamID = propTeamID || routeTeamID || routeTeamId;
  const cb = propCb || routeCb;

  const authUser = useSelector((state) => state.auth?.user);
  const currentUserId = String(
    authUser?._id || authUser?.id || authUser?.userId || User.id || ""
  );

  const teamData = propTeam || routeTeam;
  const isTeamOwner = propIsOwner !== undefined
    ? Boolean(propIsOwner)
    : routeIsOwner !== undefined
    ? Boolean(routeIsOwner)
    : Boolean(
        (teamData?.createdBy && String(teamData.createdBy?._id || teamData.createdBy) === currentUserId) ||
        (teamData?.captain && String(teamData.captain?._id || teamData.captain) === currentUserId) ||
        authUser?.role === 1 || authUser?.role === 2 || (User.isAdmin && User.isAdmin()) ||
        Boolean(teamID)
      );

  const [showQrCode, setShowQrCode] = useState(false);
  const [showAddMobile, setShowAddMobile] = useState(false);
  const [showUploadWithoutNumber, setShowUploadWithoutNumber] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchPlayer, setSearchPlayer] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const getLastChar = (s) => {
    if (s) {
      return `*******${String(s).slice(-3)}`;
    }
    return "";
  };

  const handlePlayerSearch = async (text) => {
    setSearchTerm(text);
    if (!text || text.trim().length === 0) {
      return setSearchPlayer([]);
    }
    try {
      const res = await searchApi.search(text.trim(), "player");
      let list = [];
      if (Array.isArray(res?.data)) {
        const playerCategory = res.data.find(
          (c) => c?.key?.toLowerCase() === "player"
        );
        list = playerCategory ? playerCategory.data : res.data;
      }
      if (Array.isArray(list)) {
        setSearchPlayer(
          list.map((item) => ({
            id: String(item._id || item.id),
            name: item.username || item.name || "Player",
            mobile: item.mobile || "",
            location: item.location || "Location not specified",
          }))
        );
      } else {
        setSearchPlayer([]);
      }
    } catch (error) {
      console.warn("[AddPlayer] Search player failed:", error);
    }
  };

  const handlePlayerOnClick = (player) => {
    Alert.alert(
      "Add Player",
      `Do you want to add ${player.name} to the team?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Add",
          onPress: async () => {
            if (teamID) {
              try {
                const res = await teamsApi.addPlayerToTeam(teamID, {
                  players: [
                    {
                      id: player.id,
                      name: player.name,
                      mobile: player.mobile,
                    },
                  ],
                });
                if (res?.data?.success || res?.status === 200 || res?.status === 201) {
                  Alert.alert("Success", `${player.name} added to team!`);
                  cb?.(player);
                  if (!isEmbedded) {
                    navigation.goBack();
                  }
                }
              } catch (e) {
                Alert.alert("Error", "Failed to add player to team");
              }
            } else {
              cb?.(player);
              if (!isEmbedded) {
                navigation.goBack();
              }
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header */}
      {showHeader && (
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
            Add Player
          </ThemedText>
        </View>
      )}

      <ScrollView className="flex-1 p-4">
        {/* Option 1: Search Player Card */}
        <TouchableOpacity
          onPress={() => {
            if (!showSearchBar) {
              setShowSearchBar(true);
              setSearchPlayer([]);
            }
          }}
          className={`mb-4 rounded-xl p-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          {showSearchBar ? (
            <View>
              <View className="flex-row items-center mb-4">
                <TextInput
                  className={`flex-1 py-2 px-3 rounded-lg ${
                    isDarkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                  placeholder="Search Player Globally..."
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  value={searchTerm}
                  onChangeText={handlePlayerSearch}
                  autoFocus={true}
                />
                <TouchableOpacity
                  onPress={() => {
                    setShowSearchBar(false);
                    setSearchTerm("");
                    setSearchPlayer([]);
                  }}
                  className="p-2 ml-2"
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>

              {searchPlayer.length > 0 ? (
                <View>
                  {searchPlayer.map((item) => (
                    <TouchableOpacity
                      key={item.id || item._id}
                      onPress={() => handlePlayerOnClick(item)}
                      className={`p-3 border-b ${
                        isDarkMode
                          ? "border-gray-700"
                          : "border-gray-200"
                      }`}
                    >
                      <View className="flex-row justify-between items-center">
                        <View>
                          <ThemedText
                            className={`font-semibold ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {item.name}
                          </ThemedText>
                          <ThemedText
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {getLastChar(item.mobile)}
                          </ThemedText>
                          <ThemedText
                            className={`text-xs ${
                              isDarkMode ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            {item.location}
                          </ThemedText>
                        </View>
                        <Ionicons
                          name="add-circle"
                          size={24}
                          color="#3B82F6"
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="py-8 items-center justify-center">
                  <ThemedText
                    className={`${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {searchTerm ? "No players found" : "Search for players"}
                  </ThemedText>
                </View>
              )}
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="w-1/5 items-center justify-center">
                <Ionicons
                  name="search"
                  size={32}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </View>
              <View className="ml-4 flex-1">
                <ThemedText
                  className={`font-bold text-lg ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Search Player
                </ThemedText>
                <ThemedText
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Search Player and add players to the team
                </ThemedText>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {!showSearchBar && (
          <>
            {/* Option 2: Upload without number */}
            <TouchableOpacity
              onPress={() => setShowUploadWithoutNumber(true)}
              className={`mb-4 rounded-xl p-4 border ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              } shadow-sm`}
            >
              <View className="flex-row items-center">
                <View className="w-1/5 items-center justify-center">
                  <View className={`w-12 h-12 rounded-2xl ${isDarkMode ? "bg-gray-700" : "bg-gray-100"} items-center justify-center`}>
                    <Ionicons
                      name="person-add"
                      size={24}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </View>
                </View>
                <View className="ml-4 flex-1">
                  <ThemedText
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Upload without number
                  </ThemedText>
                  <ThemedText
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Add player just by name. Team owner can add number later.
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>

            {/* Option 3: Add with Phone number */}
            <TouchableOpacity
              onPress={() => setShowAddMobile(true)}
              className={`mb-4 rounded-xl p-4 border ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"
              } shadow-sm`}
            >
              <View className="flex-row items-center">
                <View className="w-1/5 items-center justify-center">
                  <View className="w-12 h-12 rounded-2xl bg-blue-500/10 items-center justify-center">
                    <Ionicons
                      name="call"
                      size={24}
                      color="#2563EB"
                    />
                  </View>
                </View>
                <View className="ml-4 flex-1">
                  <ThemedText
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Add with Phone number
                  </ThemedText>
                  <ThemedText
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Quick way to add multiple players with phone numbers
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>

            {/* Option 4: Team QR Code Card */}
            <TouchableOpacity
              onPress={() => setShowQrCode(true)}
              className={`rounded-xl p-4 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm`}
            >
              <View className="flex-row items-center">
                <View className="w-1/5 items-center justify-center">
                  <Ionicons
                    name="qr-code"
                    size={32}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                </View>
                <View className="ml-4 flex-1">
                  <ThemedText
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Team QR Code
                  </ThemedText>
                  <ThemedText
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Scan and add players directly through QR code
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQrCode}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQrCode(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View
            className={`w-4/5 p-6 rounded-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <View className="items-center">
              <View className="p-4 bg-white rounded-xl shadow-sm">
                <QRCode
                  value={JSON.stringify({
                    type: SCANNER_TYPE_ACTION?.TEAM?.type || "TEAM",
                    action: SCANNER_TYPE_ACTION?.TEAM?.action?.JOIN?.type || "JOIN",
                    value: teamID,
                  })}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#0F172A"
                />
              </View>
              <ThemedText className="text-center mt-4 text-base font-semibold">
                * Scan this QR code through player&apos;s app to join the team
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowQrCode(false);
                  navigation.navigate(SCREENS.QRScanner, {
                    teamId: teamID,
                    cb,
                  });
                }}
                className="mt-4 flex-row items-center bg-emerald-600 px-5 py-2.5 rounded-full"
              >
                <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
                <ThemedText className="text-white font-semibold ml-2">
                  Scan Player&apos;s QR
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowQrCode(false)}
                className="mt-3 bg-blue-500 px-6 py-2 rounded-full"
              >
                <ThemedText className="text-white">Close</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload without number Modal (Just asks Name, nothing else) */}
      <Modal
        visible={showUploadWithoutNumber}
        animationType="slide"
        onRequestClose={() => setShowUploadWithoutNumber(false)}
      >
        <SafeAreaView
          className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
        >
          <View
            className={`px-4 py-4 border-b flex-row items-center ${
              isDarkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <TouchableOpacity
              onPress={() => setShowUploadWithoutNumber(false)}
              className="p-2 mr-2"
            >
              <Ionicons name="arrow-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            <View className="flex-1">
              <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
                Upload without number
              </ThemedText>
            </View>
          </View>

          <UploadWithoutNumber
            teamID={teamID}
            setShowUploadWithoutNumber={setShowUploadWithoutNumber}
            cb={cb}
            isTeamOwner={isTeamOwner}
            isEmbedded={isEmbedded || !showHeader}
          />
        </SafeAreaView>
      </Modal>

      {/* Add with Phone Number Modal */}
      <Modal
        visible={showAddMobile}
        animationType="slide"
        onRequestClose={() => setShowAddMobile(false)}
      >
        <SafeAreaView
          className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
        >
          <View
            className={`px-4 py-4 border-b flex-row items-center ${
              isDarkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <TouchableOpacity
              onPress={() => setShowAddMobile(false)}
              className="p-2 mr-2"
            >
              <Ionicons name="arrow-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
              Add with Phone Number
            </ThemedText>
          </View>

          <AddWithPhoneNumber
            teamID={teamID}
            setShowAddMobile={setShowAddMobile}
            cb={cb}
            isEmbedded={isEmbedded || !showHeader}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone Number Helper (Sanitizes & Formats Indian/International Mobile Numbers)
// ─────────────────────────────────────────────────────────────────────────────
export const cleanMobileNumber = (raw) => {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");

  // If starts with country code 91 (India) and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    // Leading trunk 0 (e.g. 09876543210)
    digits = digits.slice(1);
  } else if (digits.length > 10) {
    // Check if the last 10 digits form a valid Indian mobile number (starts with 6,7,8,9)
    const last10 = digits.slice(-10);
    if (/^[6-9]\d{9}$/.test(last10)) {
      digits = last10;
    }
  }

  return digits.slice(0, 10);
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload Without Number Component (ONLY asks Player Name - nothing else!)
// ─────────────────────────────────────────────────────────────────────────────
function UploadWithoutNumber({ teamID, setShowUploadWithoutNumber, cb, isTeamOwner, isEmbedded }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const navigation = useNavigation();
  const nameInputRef = useRef(null);

  const [username, setUsername] = useState("");
  const [addedPlayers, setAddedPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePickContactName = async () => {
    try {
      const isAvailable = await Contacts.isAvailableAsync();
      if (!isAvailable) {
        showGlobalAlert({
          title: "Not Available",
          message: "Contact picker is only supported on mobile devices.",
          type: "warning",
        });
        return;
      }

      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        showGlobalAlert({
          title: "Permission Required",
          message: canAskAgain
            ? "Contact permission is required to choose names from contacts."
            : "Contact permission is disabled. Please enable it in device settings.",
          type: "warning",
        });
        return;
      }

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;

      const contactName =
        contact.name ||
        [contact.firstName, contact.middleName, contact.lastName].filter(Boolean).join(" ") ||
        contact.nickname ||
        "";

      if (contactName) {
        const currentTrimmed = username.trim();
        if (currentTrimmed) {
          const pId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          setAddedPlayers((prev) => [
            ...prev,
            {
              id: pId,
              _id: pId,
              name: currentTrimmed,
              username: currentTrimmed,
            },
          ]);
        }
        setUsername(contactName);
      }
    } catch (err) {
      console.warn("[UploadWithoutNumber] Error picking contact:", err);
    }
  };

  const handleAddMore = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      showGlobalAlert({
        title: "Required",
        message: "Please enter player name first",
        type: "warning",
      });
      nameInputRef.current?.focus();
      return;
    }

    const pId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newPlayer = {
      id: pId,
      _id: pId,
      name: trimmed,
      username: trimmed,
    };

    setAddedPlayers((prev) => [...prev, newPlayer]);
    setUsername("");
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  const handleRemovePlayer = (index) => {
    setAddedPlayers((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSave = async () => {
    const trimmed = username.trim();
    if (!trimmed && addedPlayers.length === 0) {
      showGlobalAlert({
        title: "Required",
        message: "Please enter at least one player name",
        type: "warning",
      });
      nameInputRef.current?.focus();
      return;
    }

    let playersToAdd = [...addedPlayers];
    if (trimmed) {
      const pId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      playersToAdd.push({
        id: pId,
        _id: pId,
        name: trimmed,
        username: trimmed,
      });
    }

    setIsLoading(true);

    try {
      if (teamID) {
        const payloadPlayers = playersToAdd.map((p) => ({
          name: p.name || p.username,
          username: p.username || p.name,
        }));

        const res = await teamsApi.addPlayerToTeam(teamID, {
          players: payloadPlayers,
        });

        if (res?.data?.success || res?.status === 200 || res?.status === 201) {
          const resolvedPlayers =
            Array.isArray(res?.data?.players) && res.data.players.length > 0
              ? res.data.players
              : playersToAdd;
          // Immediately trigger refresh callback for parent squad
          cb?.(resolvedPlayers);
          showGlobalAlert({
            title: "Success",
            message: `${playersToAdd.length} ${
              playersToAdd.length === 1 ? "player" : "players"
            } added successfully!`,
            type: "success",
            confirmText: "OK",
            onConfirm: () => {
              setShowUploadWithoutNumber(false);
              cb?.(resolvedPlayers);
              if (!isEmbedded) {
                navigation.goBack();
              }
            },
          });
        } else {
          showGlobalAlert({
            title: "Notice",
            message: res?.data?.message || "Failed to add players",
            type: "warning",
          });
        }
      } else {
        cb?.(playersToAdd);
        showGlobalAlert({
          title: "Success",
          message: `${playersToAdd.length} ${
            playersToAdd.length === 1 ? "player" : "players"
          } added successfully!`,
          type: "success",
          confirmText: "OK",
          onConfirm: () => {
            setShowUploadWithoutNumber(false);
            if (!isEmbedded) {
              navigation.goBack();
            }
          },
        });
      }
    } catch (error) {
      showGlobalAlert({
        title: "Error",
        message: error?.response?.data?.message || error?.message || "Failed to add players",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalCount = addedPlayers.length + (username.trim() ? 1 : 0);

  return (
    <AppKeyboardAwareScrollView
      extraHeight={80}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Card: Only asks Player Name */}
      <View
        className={`rounded-2xl p-4 mb-4 border ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } shadow-sm`}
      >
        <View className="mb-2">
          <View className="flex-row items-center justify-between mb-1.5">
            <ThemedText
              className={`text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Player Name #{addedPlayers.length + 1} *
            </ThemedText>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={handlePickContactName}
                className="flex-row items-center"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="people-outline" size={13} color="#2563EB" />
                <ThemedText className="text-xs text-blue-600 dark:text-blue-400 font-semibold ml-1">
                  From Contacts
                </ThemedText>
              </TouchableOpacity>
              {addedPlayers.length > 0 && (
                <ThemedText className="text-xs text-blue-500 font-semibold">
                  • {addedPlayers.length} added
                </ThemedText>
              )}
            </View>
          </View>
          <TextInput
            ref={nameInputRef}
            className={`border-b py-2 text-base font-semibold ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={username}
            onChangeText={setUsername}
            placeholder={`Enter player #${addedPlayers.length + 1} name`}
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            autoFocus={true}
            returnKeyType="next"
            onSubmitEditing={handleAddMore}
          />
        </View>
      </View>

      {/* Added Players Numbered List */}
      {addedPlayers.length > 0 && (
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <ThemedText
              className={`text-sm font-bold ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Players to Add ({addedPlayers.length})
            </ThemedText>
            <ThemedText className="text-xs text-amber-500 font-medium">
              Phone numbers can be added later
            </ThemedText>
          </View>
          {addedPlayers.map((player, index) => (
            <View
              key={player.id || index}
              className={`flex-row items-center justify-between p-3 mb-2 rounded-xl border ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              } shadow-sm`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-7 h-7 rounded-full bg-blue-500/15 items-center justify-center mr-3">
                  <ThemedText className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText
                  className={`text-base font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                  numberOfLines={1}
                >
                  {player.username || player.name}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => handleRemovePlayer(index)}
                className="p-1.5 rounded-lg bg-red-500/10"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Buttons: Add More and Done */}
      <View className="flex-row mt-2 gap-3">
        <TouchableOpacity
          onPress={handleAddMore}
          className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center border ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-blue-200"
          }`}
        >
          <Ionicons name="add" size={20} color="#2563EB" style={{ marginRight: 6 }} />
          <ThemedText className="font-semibold text-sm text-blue-600 dark:text-blue-400">
            Add More
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          className="flex-1 py-3.5 rounded-xl items-center justify-center bg-blue-600 shadow-md"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText className="text-white font-bold text-sm">
              Done {totalCount > 0 ? `(${totalCount})` : ""}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </AppKeyboardAwareScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Contact Picker Modal (Select Multiple Players from Contacts at Once)
// ─────────────────────────────────────────────────────────────────────────────
function MultiContactPickerModal({
  visible,
  onClose,
  onAddContacts,
  alreadyAddedMobiles = [],
}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMap, setSelectedMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(true);

  const existingMobileSet = useMemo(() => {
    return new Set(
      (alreadyAddedMobiles || []).map((m) => cleanMobileNumber(m)).filter(Boolean)
    );
  }, [alreadyAddedMobiles]);

  useEffect(() => {
    if (visible) {
      loadContacts();
    } else {
      setSearchTerm("");
      setSelectedMap(new Map());
    }
  }, [visible]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const isAvailable = await Contacts.isAvailableAsync();
      if (!isAvailable) {
        showGlobalAlert({
          title: "Not Supported",
          message: "Contact picker is only supported on mobile devices (Android & iOS).",
          type: "warning",
        });
        setIsLoading(false);
        return;
      }

      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setPermissionGranted(false);
        setIsLoading(false);
        showGlobalAlert({
          title: "Permission Required",
          message: canAskAgain
            ? "Please grant contact permission to view and select contacts."
            : "Contacts permission is disabled. Please enable it in device settings.",
          type: "warning",
        });
        return;
      }

      setPermissionGranted(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      const list = [];
      if (Array.isArray(data)) {
        for (const c of data) {
          const rawPhones = (c.phoneNumbers || []).filter(
            (p) => p && (p.number || p.digits)
          );
          if (rawPhones.length === 0) continue;

          const name =
            c.name ||
            [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ") ||
            c.nickname ||
            "Unknown";

          let bestMobile = "";
          let bestRaw = "";
          for (const p of rawPhones) {
            const cleaned = cleanMobileNumber(p.number || p.digits);
            if (/^[6-9]\d{9}$/.test(cleaned)) {
              bestMobile = cleaned;
              bestRaw = p.number || p.digits;
              break;
            }
          }
          if (!bestMobile && rawPhones.length > 0) {
            bestMobile = cleanMobileNumber(rawPhones[0].number || rawPhones[0].digits);
            bestRaw = rawPhones[0].number || rawPhones[0].digits;
          }

          if (!bestMobile) continue;

          list.push({
            id: `${c.id || "c"}_${bestMobile}_${list.length}`,
            name: name.trim(),
            mobile: bestMobile,
            rawMobile: bestRaw,
            email: c.emails?.[0]?.email || "",
            phoneCount: rawPhones.length,
          });
        }
      }

      setContacts(list);
      setFilteredContacts(list);
    } catch (err) {
      console.warn("[MultiContactPicker] Error loading contacts:", err);
      showGlobalAlert({
        title: "Error",
        message: "Failed to load contacts. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    if (!text || !text.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    const query = text.toLowerCase().trim();
    const filtered = contacts.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.mobile.includes(query) ||
        (item.rawMobile && item.rawMobile.includes(query))
      );
    });
    setFilteredContacts(filtered);
  };

  const toggleSelect = (item) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  };

  const selectableContacts = useMemo(() => {
    return filteredContacts.filter((c) => !existingMobileSet.has(c.mobile));
  }, [filteredContacts, existingMobileSet]);

  const toggleSelectAll = () => {
    if (selectedMap.size >= selectableContacts.length && selectableContacts.length > 0) {
      setSelectedMap(new Map());
    } else {
      const next = new Map(selectedMap);
      selectableContacts.forEach((item) => next.set(item.id, item));
      setSelectedMap(next);
    }
  };

  const handleConfirm = () => {
    const selectedList = Array.from(selectedMap.values());
    if (selectedList.length === 0) {
      showGlobalAlert({
        title: "No Contacts Selected",
        message: "Please select at least one contact to add.",
        type: "info",
      });
      return;
    }
    onAddContacts(selectedList);
  };

  const getAvatarBg = (name) => {
    const colors = [
      "#2563EB", "#7C3AED", "#DB2777", "#D97706",
      "#059669", "#DC2626", "#0891B2", "#4F46E5"
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderContactItem = ({ item }) => {
    const isSelected = selectedMap.has(item.id);
    const isAlreadyAdded = existingMobileSet.has(item.mobile);

    return (
      <TouchableOpacity
        onPress={() => !isAlreadyAdded && toggleSelect(item)}
        activeOpacity={isAlreadyAdded ? 1 : 0.7}
        className={`flex-row items-center p-3 mb-2 rounded-2xl border ${
          isAlreadyAdded
            ? isDarkMode
              ? "bg-gray-800/40 border-gray-700/50 opacity-60"
              : "bg-gray-100 border-gray-200 opacity-60"
            : isSelected
            ? isDarkMode
              ? "bg-blue-600/20 border-blue-500"
              : "bg-blue-50 border-blue-300"
            : isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } shadow-sm`}
      >
        {/* Avatar */}
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getAvatarBg(item.name) }}
        >
          <ThemedText className="text-white font-bold text-sm">
            {getInitials(item.name)}
          </ThemedText>
        </View>

        {/* Info */}
        <View className="flex-1 mr-2">
          <View className="flex-row items-center">
            <ThemedText
              className="font-bold text-base text-gray-900 dark:text-white"
              numberOfLines={1}
            >
              {item.name}
            </ThemedText>
            {isAlreadyAdded && (
              <View className="ml-2 bg-gray-500/20 px-2 py-0.5 rounded-full">
                <ThemedText className="text-[10px] text-gray-400 font-semibold">
                  Already Added
                </ThemedText>
              </View>
            )}
          </View>
          <View className="flex-row items-center mt-0.5">
            <ThemedText className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {item.mobile}
            </ThemedText>
            {item.phoneCount > 1 && (
              <ThemedText className="text-[11px] text-blue-500 ml-2">
                +{item.phoneCount - 1} more
              </ThemedText>
            )}
          </View>
        </View>

        {/* Checkbox */}
        <View className="items-center justify-center pl-2">
          {isAlreadyAdded ? (
            <Ionicons name="checkmark-circle" size={24} color="#9CA3AF" />
          ) : isSelected ? (
            <Ionicons name="checkbox" size={24} color="#2563EB" />
          ) : (
            <Ionicons
              name="square-outline"
              size={24}
              color={isDarkMode ? "#6B7280" : "#D1D5DB"}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView
        className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      >
        {/* Header */}
        <View
          className={`px-4 py-3 border-b flex-row items-center justify-between ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <TouchableOpacity onPress={onClose} className="p-2 mr-2">
              <Ionicons name="arrow-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            <View className="flex-1">
              <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
                Select Contacts
              </ThemedText>
              <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
                Choose multiple players at once
              </ThemedText>
            </View>
          </View>

          {selectableContacts.length > 0 && (
            <TouchableOpacity
              onPress={toggleSelectAll}
              className={`px-3 py-1.5 rounded-lg border ${
                isDarkMode
                  ? "border-gray-700 bg-gray-750"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <ThemedText className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {selectedMap.size > 0 && selectedMap.size >= selectableContacts.length
                  ? "Clear All"
                  : "Select All"}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View className="p-4 pb-2">
          <View
            className={`flex-row items-center px-3 py-2.5 rounded-xl border ${
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            } shadow-sm`}
          >
            <Ionicons
              name="search"
              size={20}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <TextInput
              className={`flex-1 ml-2.5 text-base ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
              placeholder="Search by name or phone..."
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              value={searchTerm}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Status strip */}
          <View className="flex-row items-center justify-between px-1 mt-2.5">
            <ThemedText className="text-xs text-gray-500 dark:text-gray-400">
              {filteredContacts.length}{" "}
              {filteredContacts.length === 1 ? "contact" : "contacts"} found
            </ThemedText>
            {selectedMap.size > 0 && (
              <View className="bg-blue-600 px-2.5 py-0.5 rounded-full">
                <ThemedText className="text-xs font-bold text-white">
                  {selectedMap.size} selected
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Contact List */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-12">
            <ActivityIndicator size="large" color="#2563EB" />
            <ThemedText className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Loading your contacts...
            </ThemedText>
          </View>
        ) : !permissionGranted ? (
          <View className="flex-1 justify-center items-center p-6">
            <View className="w-16 h-16 rounded-full bg-amber-500/15 items-center justify-center mb-4">
              <Ionicons name="lock-closed" size={32} color="#D97706" />
            </View>
            <ThemedText className="font-bold text-lg text-center mb-1 text-gray-900 dark:text-white">
              Contact Permission Required
            </ThemedText>
            <ThemedText className="text-xs text-center text-gray-500 dark:text-gray-400 mb-6">
              Please grant contacts permission to select players from your contact list.
            </ThemedText>
            <TouchableOpacity
              onPress={loadContacts}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <ThemedText className="text-white font-bold text-sm">
                Grant Permission
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : filteredContacts.length === 0 ? (
          <View className="flex-1 justify-center items-center p-6">
            <Ionicons
              name="search"
              size={40}
              color={isDarkMode ? "#6B7280" : "#9CA3AF"}
            />
            <ThemedText className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-3">
              {searchTerm ? "No contacts found" : "No contacts available"}
            </ThemedText>
            <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              {searchTerm
                ? `No contact matches "${searchTerm}"`
                : "No contacts with valid phone numbers were found on your device."}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Bottom Sticky Action Bar */}
        <View
          className={`p-4 border-t flex-row items-center gap-3 ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <TouchableOpacity
            onPress={onClose}
            className={`py-3.5 px-5 rounded-xl items-center border ${
              isDarkMode
                ? "border-gray-700 bg-gray-700/50"
                : "border-gray-300 bg-gray-100"
            }`}
          >
            <ThemedText className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Cancel
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={selectedMap.size === 0}
            className={`flex-1 py-3.5 rounded-xl items-center justify-center flex-row shadow-md ${
              selectedMap.size > 0 ? "bg-blue-600" : "bg-gray-400 opacity-60"
            }`}
          >
            <Ionicons
              name="person-add"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <ThemedText className="text-white font-bold text-sm">
              Add {selectedMap.size > 0 ? `(${selectedMap.size}) ` : ""}Selected Players
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add with Phone Number Component (Asks Name, Mobile Number, Email, Location)
// ─────────────────────────────────────────────────────────────────────────────
function AddWithPhoneNumber({ teamID, setShowAddMobile, cb, isEmbedded }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const navigation = useNavigation();

  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [addedPlayers, setAddedPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickingContact, setIsPickingContact] = useState(false);
  const [showMultiPicker, setShowMultiPicker] = useState(false);
  const [multipleNumbersData, setMultipleNumbersData] = useState(null);

  const applySinglePickedContact = (pickedName, pickedMobile, pickedEmail) => {
    const currentName = username.trim();
    const currentCleanMobile = cleanMobileNumber(mobile);
    if (currentName && /^[6-9]\d{9}$/.test(currentCleanMobile)) {
      const pId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setAddedPlayers((prev) => {
        if (prev.some((p) => p.mobile === currentCleanMobile)) return prev;
        return [
          ...prev,
          {
            id: pId,
            _id: pId,
            name: currentName,
            username: currentName,
            mobile: currentCleanMobile,
            email: email.trim(),
            location: location.trim(),
          },
        ];
      });
      setLocation("");
    }
    if (pickedName) setUsername(pickedName);
    setMobile(pickedMobile || "");
    setEmail(pickedEmail || "");
  };

  const savePlayersList = async (playersToAdd) => {
    if (!Array.isArray(playersToAdd) || playersToAdd.length === 0) return;
    setIsLoading(true);

    try {
      if (teamID) {
        const payloadPlayers = playersToAdd.map((p) => ({
          name: p.name || p.username,
          username: p.username || p.name,
          mobile: p.mobile,
          ...(p.email ? { email: p.email } : {}),
          ...(p.location ? { location: p.location } : {}),
        }));

        const res = await teamsApi.addPlayerToTeam(teamID, {
          players: payloadPlayers,
        });
        if (res?.data?.success || res?.status === 200 || res?.status === 201) {
          const resolvedPlayers =
            Array.isArray(res?.data?.players) && res.data.players.length > 0
              ? res.data.players
              : playersToAdd;
          // Immediately notify parent to refresh squad with all added players
          cb?.(resolvedPlayers);
          showGlobalAlert({
            title: "Success",
            message: `${playersToAdd.length} ${playersToAdd.length === 1 ? "player" : "players"} added successfully`,
            type: "success",
            confirmText: "OK",
            onConfirm: () => {
              setShowAddMobile(false);
              cb?.(resolvedPlayers);
              if (!isEmbedded) {
                navigation.goBack();
              }
            },
          });
        } else {
          showGlobalAlert({
            title: "Notice",
            message: res?.data?.message || "Failed to add players",
            type: "warning",
          });
        }
      } else {
        cb?.(playersToAdd);
        showGlobalAlert({
          title: "Success",
          message: `${playersToAdd.length} ${playersToAdd.length === 1 ? "player" : "players"} added successfully`,
          type: "success",
          confirmText: "OK",
          onConfirm: () => {
            setShowAddMobile(false);
            if (!isEmbedded) {
              navigation.goBack();
            }
          },
        });
      }
    } catch (error) {
      showGlobalAlert({
        title: "Error",
        message: error?.response?.data?.message || error?.message || "Failed to add players",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMultipleContacts = (selectedList) => {
    if (!selectedList || selectedList.length === 0) return;

    const combined = [...addedPlayers];
    const seenMobiles = new Set(combined.map((p) => p.mobile).filter(Boolean));

    const currentName = username.trim();
    const currentCleanMobile = cleanMobileNumber(mobile);
    if (
      currentName &&
      /^[6-9]\d{9}$/.test(currentCleanMobile) &&
      !seenMobiles.has(currentCleanMobile)
    ) {
      const pId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      combined.push({
        id: pId,
        _id: pId,
        name: currentName,
        username: currentName,
        mobile: currentCleanMobile,
        email: email.trim(),
        location: location.trim(),
      });
      seenMobiles.add(currentCleanMobile);
      setUsername("");
      setMobile("");
      setEmail("");
      setLocation("");
    }

    selectedList.forEach((c, idx) => {
      const cleanMob = cleanMobileNumber(c.mobile);
      if (!cleanMob || seenMobiles.has(cleanMob)) return;
      seenMobiles.add(cleanMob);
      const pId = `player_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`;
      combined.push({
        id: pId,
        _id: pId,
        name: c.name,
        username: c.name,
        mobile: cleanMob,
        email: c.email || "",
        location: "",
      });
    });

    setAddedPlayers(combined);
    setShowMultiPicker(false);
    savePlayersList(combined);
  };

  const handlePickContact = async () => {
    try {
      setIsPickingContact(true);
      const isAvailable = await Contacts.isAvailableAsync();
      if (!isAvailable) {
        showGlobalAlert({
          title: "Not Supported",
          message: "Contact picker is only supported on mobile devices (Android & iOS).",
          type: "warning",
        });
        return;
      }

      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        showGlobalAlert({
          title: "Permission Required",
          message: canAskAgain
            ? "Please grant contacts permission to select players from your phone contacts."
            : "Contacts permission is disabled. Please enable it in your phone settings to use this feature.",
          type: "warning",
        });
        return;
      }

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) {
        // User cancelled or dismissed picker
        return;
      }

      const contactName =
        contact.name ||
        [contact.firstName, contact.middleName, contact.lastName].filter(Boolean).join(" ") ||
        contact.nickname ||
        "";

      const contactEmail = contact.emails?.[0]?.email || "";

      const rawPhones = (contact.phoneNumbers || []).filter(
        (p) => p && (p.number || p.digits)
      );

      if (rawPhones.length === 0) {
        if (contactName) setUsername(contactName);
        if (contactEmail) setEmail(contactEmail);
        showGlobalAlert({
          title: "No Phone Number",
          message: `No phone number found for "${contactName || "this contact"}". Name has been filled, please enter the phone number manually.`,
          type: "info",
        });
        return;
      }

      if (rawPhones.length === 1) {
        const cleaned = cleanMobileNumber(rawPhones[0].number || rawPhones[0].digits);
        applySinglePickedContact(contactName, cleaned, contactEmail);
      } else {
        // Multiple numbers found -> show selection modal
        setMultipleNumbersData({
          name: contactName,
          email: contactEmail,
          phones: rawPhones,
        });
      }
    } catch (err) {
      console.warn("[AddPlayer] Error picking contact:", err);
      showGlobalAlert({
        title: "Error",
        message: "Could not open contacts. Please try again or enter details manually.",
        type: "error",
      });
    } finally {
      setIsPickingContact(false);
    }
  };

  const handleSelectMultipleNumber = (phoneObj) => {
    if (!multipleNumbersData) return;
    const cleaned = cleanMobileNumber(phoneObj.number || phoneObj.digits);
    applySinglePickedContact(
      multipleNumbersData.name,
      cleaned,
      multipleNumbersData.email
    );
    setMultipleNumbersData(null);
  };

  const handleAddMore = () => {
    const cleanMobile = cleanMobileNumber(mobile);
    if (!username.trim() || !cleanMobile) {
      showGlobalAlert({
        title: "Required",
        message: "Please fill all required fields (Name and Phone number)",
        type: "warning",
      });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      showGlobalAlert({
        title: "Invalid Mobile Number",
        message: "Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9.",
        type: "warning",
      });
      return;
    }

    const pId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newPlayer = {
      id: pId,
      _id: pId,
      name: username.trim(),
      username: username.trim(),
      mobile: cleanMobile,
      email: email.trim(),
      location: location.trim(),
    };

    setAddedPlayers([...addedPlayers, newPlayer]);
    setMobile("");
    setUsername("");
    setEmail("");
    setLocation("");
  };

  const handleRemovePlayer = (index) => {
    const updatedPlayers = [...addedPlayers];
    updatedPlayers.splice(index, 1);
    setAddedPlayers(updatedPlayers);
  };

  const handleSave = async () => {
    const cleanCurrentMobile = cleanMobileNumber(mobile);
    if (!username.trim() && addedPlayers.length === 0) {
      showGlobalAlert({
        title: "Required",
        message: "Please enter player name and phone number",
        type: "warning",
      });
      return;
    }

    let playersToAdd = [...addedPlayers];
    if (username.trim()) {
      if (!cleanCurrentMobile || !/^[6-9]\d{9}$/.test(cleanCurrentMobile)) {
        showGlobalAlert({
          title: "Invalid Mobile Number",
          message: "Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9.",
          type: "warning",
        });
        return;
      }
      const pId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      playersToAdd.push({
        id: pId,
        _id: pId,
        name: username.trim(),
        username: username.trim(),
        mobile: cleanCurrentMobile,
        email: email.trim(),
        location: location.trim(),
      });
    }

    await savePlayersList(playersToAdd);
  };

  const totalCount = addedPlayers.length + (username.trim() ? 1 : 0);

  return (
    <AppKeyboardAwareScrollView
      extraHeight={80}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Choose from Contact List Options */}
      <View className="mb-4">
        {/* Primary Option: Select Multiple Contacts (Batch) */}
        <TouchableOpacity
          onPress={() => setShowMultiPicker(true)}
          activeOpacity={0.7}
          className={`p-4 mb-2.5 rounded-2xl border ${
            isDarkMode
              ? "bg-blue-600/15 border-blue-500/30"
              : "bg-blue-50/90 border-blue-200"
          } shadow-sm`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-11 h-11 rounded-2xl bg-blue-600/20 items-center justify-center mr-3">
                <Ionicons name="people" size={24} color="#2563EB" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <ThemedText className="font-bold text-base text-blue-600 dark:text-blue-400">
                    Select Multiple Contacts
                  </ThemedText>
                  <View className="ml-2 bg-blue-600 px-1.5 py-0.5 rounded-md">
                    <ThemedText className="text-[10px] font-extrabold text-white">
                      BATCH
                    </ThemedText>
                  </View>
                </View>
                <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Pick multiple players at once with checkboxes
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#2563EB" />
          </View>
        </TouchableOpacity>

      </View>

      <View
        className={`rounded-2xl p-4 mb-4 border ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } shadow-sm`}
      >
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <ThemedText
              className={`text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Player Name *
            </ThemedText>
            <TouchableOpacity
              onPress={handlePickContact}
              disabled={isPickingContact}
              className="flex-row items-center"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="people-outline" size={13} color="#2563EB" />
              <ThemedText className="text-xs text-blue-600 dark:text-blue-400 font-semibold ml-1">
                From Contacts
              </ThemedText>
            </TouchableOpacity>
          </View>
          <TextInput
            className={`border-b py-2 text-base font-semibold ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter player full name"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </View>

        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <ThemedText
              className={`text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Phone Number *
            </ThemedText>
            <TouchableOpacity
              onPress={handlePickContact}
              disabled={isPickingContact}
              className="flex-row items-center"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="call-outline" size={13} color="#2563EB" />
              <ThemedText className="text-xs text-blue-600 dark:text-blue-400 font-semibold ml-1">
                Pick Contact
              </ThemedText>
            </TouchableOpacity>
          </View>
          <TextInput
            className={`border-b py-2 text-base ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={mobile}
            onChangeText={(val) => setMobile(val.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <View className="mb-4">
          <ThemedText
            className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Email (Optional)
          </ThemedText>
          <TextInput
            className={`border-b py-2 ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email (optional)"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            keyboardType="email-address"
          />
        </View>

        <View className="mb-2">
          <ThemedText
            className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Location (Optional)
          </ThemedText>
          <TextInput
            className={`border-b py-2 ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter city or area (optional)"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </View>
      </View>

      {/* Added Players List */}
      {addedPlayers.length > 0 && (
        <View className="mb-4">
          <ThemedText
            className={`text-sm mb-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Added Players ({addedPlayers.length})
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {addedPlayers.map((player, index) => (
              <View
                key={player.id || index}
                className={`flex-row items-center rounded-full px-3 py-2 mr-2 ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <ThemedText className="text-sm mr-2 font-medium">
                  {player.username}
                </ThemedText>
                <TouchableOpacity onPress={() => handleRemovePlayer(index)}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Buttons */}
      <View className="flex-row">
        <TouchableOpacity
          onPress={handleAddMore}
          className={`flex-1 py-3.5 rounded-l-xl items-center ${
            isDarkMode ? "bg-gray-700" : "bg-gray-200"
          }`}
        >
          <ThemedText className="font-semibold text-sm">Add More</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          className="flex-1 py-3.5 rounded-r-xl items-center bg-blue-600 shadow-md"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText className="text-white font-bold text-sm">
              Done {totalCount > 0 ? `(${totalCount})` : ""}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal for selecting multiple phone numbers */}
      <Modal
        visible={Boolean(multipleNumbersData)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMultipleNumbersData(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View
            className={`w-full max-w-sm rounded-2xl p-5 ${
              isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
            } shadow-xl`}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-full bg-blue-500/15 items-center justify-center mr-2.5">
                  <Ionicons name="call" size={16} color="#2563EB" />
                </View>
                <ThemedText className="font-bold text-base text-gray-900 dark:text-white" numberOfLines={1}>
                  Select Phone Number
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setMultipleNumbersData(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {multipleNumbersData?.name
                ? `Choose which number to use for ${multipleNumbersData.name}:`
                : "Choose a phone number to use:"}
            </ThemedText>

            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {multipleNumbersData?.phones?.map((item, idx) => {
                const rawNum = item.number || item.digits || "";
                const cleaned = cleanMobileNumber(rawNum);
                const label = item.label || (idx === 0 ? "primary" : "other");
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectMultipleNumber(item)}
                    className={`p-3 mb-2 rounded-xl border flex-row items-center justify-between ${
                      isDarkMode
                        ? "bg-gray-700/60 border-gray-600 active:bg-gray-700"
                        : "bg-gray-50 border-gray-200 active:bg-blue-50"
                    }`}
                  >
                    <View className="flex-1 mr-2">
                      <ThemedText className="text-[11px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                        {label}
                      </ThemedText>
                      <ThemedText className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                        {cleaned || rawNum}
                      </ThemedText>
                      {cleaned && cleaned !== rawNum && (
                        <ThemedText className="text-[11px] text-gray-400">
                          {rawNum}
                        </ThemedText>
                      )}
                    </View>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#2563EB" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setMultipleNumbersData(null)}
              className={`mt-3 py-2.5 rounded-xl items-center border ${
                isDarkMode ? "border-gray-700 bg-gray-700/40" : "border-gray-300 bg-gray-100"
              }`}
            >
              <ThemedText className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Multi-Contact Batch Picker Modal */}
      <MultiContactPickerModal
        visible={showMultiPicker}
        onClose={() => setShowMultiPicker(false)}
        onAddContacts={handleAddMultipleContacts}
        alreadyAddedMobiles={addedPlayers.map((p) => p.mobile)}
      />
    </AppKeyboardAwareScrollView>
  );
}

import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
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
            {/* Option 2: Upload without number (NEW OPTION - redirects to name-only upload) */}
            <TouchableOpacity
              onPress={() => setShowUploadWithoutNumber(true)}
              className={`mb-4 rounded-xl p-4 border ${
                isDarkMode ? "bg-gray-800 border-amber-600/40" : "bg-white border-amber-200"
              } shadow-sm`}
            >
              <View className="flex-row items-center">
                <View className="w-1/5 items-center justify-center">
                  <View className="w-12 h-12 rounded-2xl bg-amber-500/10 items-center justify-center">
                    <Ionicons
                      name="person-add"
                      size={24}
                      color="#D97706"
                    />
                  </View>
                </View>
                <View className="ml-4 flex-1">
                  <View className="flex-row items-center justify-between">
                    <ThemedText
                      className={`font-bold text-lg ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Upload without number
                    </ThemedText>
                    <View className="bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                      <ThemedText className="text-amber-500 text-[10px] font-bold">
                        Add number later
                      </ThemedText>
                    </View>
                  </View>
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
              <QRCode
                value={JSON.stringify({
                  type: SCANNER_TYPE_ACTION?.TEAM?.type,
                  action: SCANNER_TYPE_ACTION?.TEAM?.action?.JOIN?.type,
                  value: teamID,
                })}
                size={200}
              />
              <ThemedText className="text-center mt-4 text-base font-semibold">
                * Scan this QR code through player's app to join the team
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowQrCode(false)}
                className="mt-6 bg-blue-500 px-6 py-2 rounded-full"
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
              <ThemedText className="text-xs text-amber-500 font-semibold">
                Add number later
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
          // Immediately trigger refresh callback for parent squad
          cb?.(playersToAdd?.[0] || playersToAdd);
          showGlobalAlert({
            title: "Success",
            message: `${playersToAdd.length} ${
              playersToAdd.length === 1 ? "player" : "players"
            } added successfully!`,
            type: "success",
            confirmText: "OK",
            onConfirm: () => {
              setShowUploadWithoutNumber(false);
              cb?.(playersToAdd?.[0] || playersToAdd);
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
            cb?.(playersToAdd);
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
            {addedPlayers.length > 0 && (
              <ThemedText className="text-xs text-blue-500 font-semibold">
                {addedPlayers.length} added so far
              </ThemedText>
            )}
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

  const handleAddMore = () => {
    const cleanMobile = mobile.replace(/\D/g, "");
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
    const cleanCurrentMobile = mobile.replace(/\D/g, "");
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
          // Immediately notify parent to refresh squad
          cb?.(playersToAdd?.[0] || playersToAdd);
          showGlobalAlert({
            title: "Success",
            message: `${playersToAdd.length} ${playersToAdd.length === 1 ? "player" : "players"} added successfully`,
            type: "success",
            confirmText: "OK",
            onConfirm: () => {
              setShowAddMobile(false);
              cb?.(playersToAdd?.[0] || playersToAdd);
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
        cb?.(playersToAdd?.[0] || playersToAdd);
        showGlobalAlert({
          title: "Success",
          message: `${playersToAdd.length} ${playersToAdd.length === 1 ? "player" : "players"} added successfully`,
          type: "success",
          confirmText: "OK",
          onConfirm: () => {
            setShowAddMobile(false);
            cb?.(playersToAdd?.[0] || playersToAdd);
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

  return (
    <AppKeyboardAwareScrollView
      extraHeight={80}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        className={`rounded-2xl p-4 mb-4 border ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } shadow-sm`}
      >
        <View className="mb-4">
          <ThemedText
            className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Player Name *
          </ThemedText>
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
          <ThemedText
            className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Phone Number *
          </ThemedText>
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
                key={index}
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
          className={`flex-1 py-3 rounded-l-xl items-center ${
            isDarkMode ? "bg-gray-700" : "bg-gray-200"
          }`}
        >
          <ThemedText className="font-semibold text-sm">Add More</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          className="flex-1 py-3 rounded-r-xl items-center bg-blue-600"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText className="text-white font-semibold text-sm">
              Done
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </AppKeyboardAwareScrollView>
  );
}

import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Image,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { SCANNER_TYPE_ACTION } from "@/utils/Common";

export default function AddPlayer({showHeader = true}) {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { teamID, cb } = route.params || {};

  const [showQrCode, setShowQrCode] = useState(false);
  const [showAddMobile, setShowAddMobile] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchPlayer, setSearchPlayer] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const getLastChar = (s) => {
    if (s) {
      return `*******${s.slice(-3)}`;
    }
    return "";
  };

  const handlePlayerSearch = (text) => {
    setSearchTerm(text);
    if (!text) {
      return setSearchPlayer([]);
    }
    // Simulate API call - replace with actual API call
    setTimeout(() => {
      // Mock data for demonstration
      const mockPlayers = [
        {
          id: "1",
          name: "John Doe",
          mobile: "1234567890",
          location: "New York",
        },
        {
          id: "2",
          name: "Jane Smith",
          mobile: "0987654321",
          location: "Los Angeles",
        },
      ];
      setSearchPlayer(mockPlayers);
    }, 500);
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
          onPress: () => {
            // Handle adding player
            cb?.();
            navigation.goBack();
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
      {showHeader && <View
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
      </View>}

      <ScrollView className="flex-1 p-4">
        {/* Search Player Card */}
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
                <FlatList
                  data={searchPlayer}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
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
                  )}
                />
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
              <View className="ml-4">
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
            {/* Add with Phone Number Card */}
            <TouchableOpacity
              onPress={() => setShowAddMobile(true)}
              className={`mb-4 rounded-xl p-4 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm`}
            >
              <View className="flex-row items-center">
                <View className="w-1/5 items-center justify-center">
                  <Ionicons
                    name="phone-portrait"
                    size={32}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                </View>
                <View className="ml-4">
                  <ThemedText
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Add with Phone number
                  </ThemedText>
                  <ThemedText
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Quick way to add multiple players
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>

            {/* Team QR Code Card */}
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
                <View className="ml-4">
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
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Add with Phone Number Component
function AddWithPhoneNumber({ teamID, setShowAddMobile, cb }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [addedPlayers, setAddedPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMore = () => {
    if (!mobile.trim() || !username.trim()) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    const newPlayer = {
      mobile: mobile.trim(),
      username: username.trim(),
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

  const handleSave = () => {
    if (!mobile.trim() || !username.trim()) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    // Add current form data if filled
    let playersToAdd = [...addedPlayers];
    if (mobile && username) {
      playersToAdd.push({
        mobile: mobile.trim(),
        username: username.trim(),
        email: email.trim(),
        location: location.trim(),
      });
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert("Success", "Players added successfully");
      setShowAddMobile(false);
      cb?.();
    }, 1500);
  };

  return (
    <View className="flex-1 p-4">
      <View
        className={`rounded-xl p-4 mb-4 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <View className="mb-4">
          <ThemedText
            className={`text-sm mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Player Name*
          </ThemedText>
          <TextInput
            className={`border-b py-2 ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter player name"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </View>

        <View className="mb-4">
          <ThemedText
            className={`text-sm mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Phone Number*
          </ThemedText>
          <TextInput
            className={`border-b py-2 ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={mobile}
            onChangeText={setMobile}
            placeholder="Enter phone number"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            keyboardType="phone-pad"
          />
        </View>

        <View className="mb-4">
          <ThemedText
            className={`text-sm mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Email
          </ThemedText>
          <TextInput
            className={`border-b py-2 ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            keyboardType="email-address"
          />
        </View>

        <View className="mb-4">
          <ThemedText
            className={`text-sm mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Location
          </ThemedText>
          <TextInput
            className={`border-b py-2 ${
              isDarkMode
                ? "border-gray-700 text-white"
                : "border-gray-300 text-gray-900"
            }`}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter location"
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
                <ThemedText className="text-sm mr-2">
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
          className={`flex-1 py-3 rounded-l-lg items-center ${
            isDarkMode ? "bg-gray-700" : "bg-gray-200"
          }`}
        >
          <ThemedText>Add More</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          className={`flex-1 py-3 rounded-r-lg items-center bg-blue-500`}
          disabled={isLoading}
        >
          <ThemedText className="text-white">
            {isLoading ? "Adding..." : "Done"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
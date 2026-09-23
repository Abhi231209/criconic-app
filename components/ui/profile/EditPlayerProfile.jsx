import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { useSelector, useDispatch } from "react-redux";
import { request, upload, userApi } from "@/utils/api";
import { updateUser, login } from "@/redux/authSlice";
import { setUser } from "@/redux/userSlice";
import User from "@/utils/User";
import { showGlobalAlert } from "@/contexts/AlertContext";
import LocationSearch from "@/components/ui/custom/LocationSearch";
import {
  toShortBattingStyle,
  toShortBowlingStyle,
  SHORT_BATTING_STYLES,
  SHORT_BOWLING_STYLES,
} from "@/utils";

const isCricketRole = (r) => {
  if (!r || typeof r !== "string") return false;
  const clean = r.trim().toLowerCase();
  return [
    "batsman",
    "bowler",
    "all-rounder",
    "all rounder",
    "allrounder",
    "wicket-keeper",
    "wicket keeper",
    "wicketkeeper",
    "wk-batsman",
  ].includes(clean);
};

const normalizeCricketRole = (r) => {
  if (!r || typeof r !== "string") return "Batsman";
  const clean = r.trim().toLowerCase();
  if (clean.includes("wicket") || clean.includes("keeper") || clean.includes("wk")) return "Wicket-keeper";
  if (clean.includes("all")) return "All-rounder";
  if (clean.includes("bowl")) return "Bowler";
  if (clean.includes("bat")) return "Batsman";
  return r;
};

export default function EditPlayerProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const routePlayer = route?.params?.player;
  const authUser = useSelector((state) => state?.auth?.user);

  const initialRole = isCricketRole(routePlayer?.role)
    ? normalizeCricketRole(routePlayer.role)
    : isCricketRole(routePlayer?.playerRole)
    ? normalizeCricketRole(routePlayer.playerRole)
    : isCricketRole(authUser?.role)
    ? normalizeCricketRole(authUser.role)
    : isCricketRole(authUser?.playerRole)
    ? normalizeCricketRole(authUser.playerRole)
    : "Batsman";

  // Dynamic player data derived from route params or Redux auth user
  const initialPlayer = {
    id: routePlayer?._id || routePlayer?.id || authUser?._id || authUser?.id || "",
    name: routePlayer?.username || routePlayer?.name || authUser?.username || authUser?.name || "",
    shortName: routePlayer?.shortName || authUser?.shortName || "",
    team: routePlayer?.team || "",
    nationality: routePlayer?.nationality || routePlayer?.location || routePlayer?.city || authUser?.location || authUser?.city || "",
    locationId: routePlayer?.locationId || authUser?.locationId || "",
    age: routePlayer?.age?.toString() || authUser?.age?.toString() || "",
    role: initialRole,
    battingStyle: toShortBattingStyle(routePlayer?.battingStyle || routePlayer?.batStyle || authUser?.battingStyle || authUser?.batStyle || "RHB"),
    bowlingStyle: toShortBowlingStyle(routePlayer?.bowlingStyle || routePlayer?.ballStyle || authUser?.bowlingStyle || authUser?.ballStyle || "RAM"),
    photo: routePlayer?.profileImage || routePlayer?.profileImg || routePlayer?.photo || authUser?.profileImage || authUser?.profileImg || null,
    debut: routePlayer?.debut || authUser?.debut || "",
    matches: routePlayer?.matches?.toString() || "0",
    runs: routePlayer?.runs?.toString() || "0",
    wickets: routePlayer?.wickets?.toString() || "0",
    highestScore: routePlayer?.highestScore?.toString() || "0",
    bestBowling: routePlayer?.bestBowling || "-",
    average: routePlayer?.average?.toString() || "0",
    strikeRate: routePlayer?.strikeRate?.toString() || "0",
    economy: routePlayer?.economy?.toString() || "0",
    isPublic: true,
  };

  const [player, setPlayer] = useState(initialPlayer);
  const [formData, setFormData] = useState({ ...initialPlayer });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const targetUserId = player.id || authUser?._id || authUser?.id;
    if (!targetUserId || String(targetUserId) === "1") return;

    userApi
      .getProfile(targetUserId)
      .then((res) => {
        const u = res?.data?.data || res?.data?.user || res?.data;
        if (u && typeof u === "object") {
          const freshRole = isCricketRole(u.role)
            ? normalizeCricketRole(u.role)
            : isCricketRole(u.playerRole)
            ? normalizeCricketRole(u.playerRole)
            : isCricketRole(u.playingRole)
            ? normalizeCricketRole(u.playingRole)
            : null;

          setFormData((prev) => ({
            ...prev,
            name: prev.name || u.username || u.name || "",
            shortName: prev.shortName || u.shortName || "",
            nationality: prev.nationality || u.location || u.city || "",
            locationId: prev.locationId || u.locationId || "",
            age: prev.age || (u.age ? String(u.age) : ""),
            role: prev.role || freshRole || "Batsman",
            battingStyle: toShortBattingStyle(prev.battingStyle || u.batStyle || u.battingStyle || "RHB"),
            bowlingStyle: toShortBowlingStyle(prev.bowlingStyle || u.ballStyle || u.bowlingStyle || "RAM"),
            photo: prev.photo || u.profileImage || u.profileImg || null,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormData({
          ...formData,
          photo: result.assets[0].uri,
        });
      }
    } catch (error) {
      showGlobalAlert({
        title: "Error",
        message: "Failed to pick image",
        type: "error",
      });
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        showGlobalAlert({
          title: "Permission required",
          message: "Camera access is needed to take photos",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormData({
          ...formData,
          photo: result.assets[0].uri,
        });
      }
    } catch (error) {
      showGlobalAlert({
        title: "Error",
        message: "Failed to take photo",
        type: "error",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      showGlobalAlert({
        title: "Error",
        message: "Please enter your name",
        type: "warning",
      });
      return;
    }
    if (!formData.nationality?.trim()) {
      showGlobalAlert({
        title: "Error",
        message: "Please enter your location or city",
        type: "warning",
      });
      return;
    }

    setIsSaving(true);
    try {
      const playerId = player.id || authUser?._id || authUser?.id;

      let uploadedPhoto = formData.photo;
      if (formData.photo && !formData.photo.startsWith("http")) {
        try {
          const uploadRes = await upload(formData.photo, "profile");
          uploadedPhoto =
            uploadRes?.url ||
            uploadRes?.data?.url ||
            uploadRes?.data ||
            (typeof uploadRes === "string" ? uploadRes : formData.photo);
        } catch (uploadErr) {
          console.warn("[EditPlayerProfile] Photo upload warning, keeping original:", uploadErr);
        }
      }

      const cleanBatStyle = toShortBattingStyle(formData.battingStyle);
      const cleanBallStyle = toShortBowlingStyle(formData.bowlingStyle);

      const updatePayload = {
        username: formData.name.trim(),
        name: formData.name.trim(),
        shortName: formData.shortName ? formData.shortName.trim() : formData.name.trim(),
        role: formData.role,
        playerRole: formData.role,
        playingRole: formData.role,
        location: formData.nationality.trim(),
        city: formData.nationality.trim(),
        nationality: formData.nationality.trim(),
        ...(formData.locationId ? { locationId: formData.locationId } : {}),
        age: formData.age ? (Number(formData.age) || formData.age) : undefined,
        batStyle: cleanBatStyle,
        ballStyle: cleanBallStyle,
        battingStyle: cleanBatStyle,
        bowlingStyle: cleanBallStyle,
        profileImage: uploadedPhoto,
        profileImg: uploadedPhoto,
      };

      let apiResponseUser = null;
      if (playerId) {
        const res = await request(`api/users/edit/${playerId}`, {
          method: "POST",
          data: { dataToChange: updatePayload },
        });
        apiResponseUser = res?.data?.user || res?.data?.data || null;
      }

      // Update Redux state and User singleton
      const updatedUser = {
        ...(authUser || {}),
        ...updatePayload,
        ...(apiResponseUser && typeof apiResponseUser === "object" ? apiResponseUser : {}),
        _id: playerId,
        id: playerId,
      };

      dispatch(updateUser(updatedUser));
      dispatch(setUser(updatedUser));
      User.login(updatedUser);

      setPlayer({ ...formData, photo: uploadedPhoto });
      showGlobalAlert({
        title: "Success",
        message: "Profile updated successfully",
        type: "success",
        buttons: [
          {
            text: "OK",
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate(SCREENS.PlayerProfile, { playerId });
              }
            },
          },
        ],
      });
    } catch (err) {
      console.error("Save profile error:", err);
      showGlobalAlert({
        title: "Error",
        message: err?.response?.data?.message || err.message || "Failed to update profile",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original player data
    setFormData({ ...player });
    navigation.goBack();
  };

  const InputField = ({ label, value, onChange, placeholder, keyboardType = "default" }) => (
    <View className="mb-4">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
        keyboardType={keyboardType}
        className={`p-3 rounded-lg ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        } border ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}
      />
    </View>
  );

  const SelectField = ({ label, value, onChange, options }) => (
    <View className="mb-4">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
        {label}
      </ThemedText>
      <View className={`flex-row flex-wrap ${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-lg p-2 border ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`px-4 py-2 rounded-full mr-2 mb-2 ${
              value === option.value
                ? "bg-blue-600"
                : isDarkMode
                ? "bg-gray-700"
                : "bg-gray-200"
            }`}
          >
            <ThemedText
              className={
                value === option.value
                  ? "text-white"
                  : isDarkMode
                  ? "text-gray-300"
                  : "text-gray-700"
              }
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}
    >
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        className="px-4 py-4 flex-row items-center justify-between"
      >
        <TouchableOpacity onPress={handleCancel} className="p-2">
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <ThemedText className="text-white text-xl font-bold">
          Edit Profile
        </ThemedText>

        <TouchableOpacity onPress={handleSave} disabled={isSaving} className="p-2">
          <ThemedText className="text-white font-bold">
            {isSaving ? "Saving..." : "Save"}
          </ThemedText>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        className="flex-1" 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      >
        {/* Profile Photo Section */}
        <View
          className={`p-5 rounded-xl mb-4 mt-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <ThemedText
            className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Profile Photo
          </ThemedText>

          <View className="items-center mb-4">
            <View className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center overflow-hidden">
              {formData.photo ? (
                <Image
                  source={{ uri: formData.photo }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <Ionicons name="person" size={40} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              )}
            </View>
          </View>

          <View className="flex-row justify-center space-x-4">
            <TouchableOpacity
              onPress={pickImage}
              className={`px-4 py-2 rounded-lg flex-row items-center ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <Ionicons
                name="image-outline"
                size={16}
                color={isDarkMode ? "#FFFFFF" : "#000000"}
                style={{ marginRight: 6 }}
              />
              <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
                Choose Photo
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={takePhoto}
              className={`px-4 py-2 rounded-lg flex-row items-center ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <Ionicons
                name="camera-outline"
                size={16}
                color={isDarkMode ? "#FFFFFF" : "#000000"}
                style={{ marginRight: 6 }}
              />
              <ThemedText className={isDarkMode ? "text-white" : "text-gray-900"}>
                Take Photo
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information */}
        <View
          className={`p-5 rounded-xl mb-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <ThemedText
            className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Personal Information
          </ThemedText>

          <InputField
            label="Full Name"
            value={formData.name}
            onChange={(value) => handleInputChange("name", value)}
            placeholder="Enter full name"
          />

          <InputField
            label="Short Name"
            value={formData.shortName}
            onChange={(value) => handleInputChange("shortName", value)}
            placeholder="Enter short name"
          />

          <InputField
            label="Team"
            value={formData.team}
            onChange={(value) => handleInputChange("team", value)}
            placeholder="Enter team name"
          />

          {/* Location / City (Google API Powered) */}
          <View style={{ zIndex: 1000 }} className="mb-4">
            <LocationSearch
              label="Location / City"
              value={formData.nationality}
              onChangeText={(text) => {
                handleInputChange("nationality", text);
                handleInputChange("locationId", "");
              }}
              onSelectLocation={(item) => {
                const desc =
                  typeof item === "string"
                    ? item
                    : item?.description ||
                      item?.structured_formatting?.main_text ||
                      "";
                handleInputChange("nationality", desc);
                if (item?.place_id) {
                  handleInputChange("locationId", item.place_id);
                }
              }}
              placeholder="Search city or location (powered by Google)..."
              isDarkMode={isDarkMode}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>

          <InputField
            label="Age"
            value={formData.age}
            onChange={(value) => handleInputChange("age", value)}
            placeholder="Enter age"
            keyboardType="numeric"
          />

          <SelectField
            label="Role"
            value={formData.role}
            onChange={(value) => handleInputChange("role", value)}
            options={[
              { value: "Batsman", label: "Batsman" },
              { value: "Bowler", label: "Bowler" },
              { value: "All-rounder", label: "All-rounder" },
              { value: "Wicket-keeper", label: "Wicket-keeper" },
            ]}
          />

          <SelectField
            label="Batting Style"
            value={toShortBattingStyle(formData.battingStyle)}
            onChange={(value) => handleInputChange("battingStyle", toShortBattingStyle(value))}
            options={SHORT_BATTING_STYLES}
          />

          <SelectField
            label="Bowling Style"
            value={toShortBowlingStyle(formData.bowlingStyle)}
            onChange={(value) => handleInputChange("bowlingStyle", toShortBowlingStyle(value))}
            options={SHORT_BOWLING_STYLES}
          />
        </View>

        {/* Career Statistics */}
        {/* <View
          className={`p-5 rounded-xl mb-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <ThemedText
            className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Career Statistics
          </ThemedText>

          <InputField
            label="Debut Date"
            value={formData.debut}
            onChange={(value) => handleInputChange("debut", value)}
            placeholder="YYYY-MM-DD"
          />

          <InputField
            label="Matches"
            value={formData.matches}
            onChange={(value) => handleInputChange("matches", value)}
            placeholder="Enter matches played"
            keyboardType="numeric"
          />

          <InputField
            label="Runs"
            value={formData.runs}
            onChange={(value) => handleInputChange("runs", value)}
            placeholder="Enter runs scored"
            keyboardType="numeric"
          />

          <InputField
            label="Wickets"
            value={formData.wickets}
            onChange={(value) => handleInputChange("wickets", value)}
            placeholder="Enter wickets taken"
            keyboardType="numeric"
          />

          <InputField
            label="Highest Score"
            value={formData.highestScore}
            onChange={(value) => handleInputChange("highestScore", value)}
            placeholder="Enter highest score"
            keyboardType="numeric"
          />

          <InputField
            label="Best Bowling"
            value={formData.bestBowling}
            onChange={(value) => handleInputChange("bestBowling", value)}
            placeholder="E.g. 5/20"
          />

          <InputField
            label="Batting Average"
            value={formData.average}
            onChange={(value) => handleInputChange("average", value)}
            placeholder="Enter batting average"
            keyboardType="numeric"
          />

          <InputField
            label="Strike Rate"
            value={formData.strikeRate}
            onChange={(value) => handleInputChange("strikeRate", value)}
            placeholder="Enter strike rate"
            keyboardType="numeric"
          />

          <InputField
            label="Economy Rate"
            value={formData.economy}
            onChange={(value) => handleInputChange("economy", value)}
            placeholder="Enter economy rate"
            keyboardType="numeric"
          />
        </View> */}

        {/* Privacy Settings */}
        {/* <View
          className={`p-5 rounded-xl mb-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <ThemedText
            className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Privacy Settings
          </ThemedText>

          <View className="flex-row justify-between items-center py-2">
            <ThemedText className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              Public Profile
            </ThemedText>
            <Switch
              value={formData.isPublic}
              onValueChange={(value) => handleInputChange("isPublic", value)}
              thumbColor={formData.isPublic ? "#3B82F6" : isDarkMode ? "#4B5563" : "#D1D5DB"}
              trackColor={{ false: isDarkMode ? "#374151" : "#E5E7EB", true: isDarkMode ? "#1E40AF" : "#93C5FD" }}
            />
          </View>

          <ThemedText className={`text-sm mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            When enabled, your profile will be visible to other users
          </ThemedText>
        </View> */}

        {/* Action Buttons */}
        <View className="flex-row justify-between mt-4">
          <TouchableOpacity
            onPress={handleCancel}
            className={`px-6 py-3 rounded-lg flex-1 mr-2 ${
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <ThemedText className="text-center font-medium">
              Cancel
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-lg flex-1 ml-2 bg-blue-600"
          >
            <ThemedText className="text-center text-white font-medium">
              {isSaving ? "Saving..." : "Save Changes"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
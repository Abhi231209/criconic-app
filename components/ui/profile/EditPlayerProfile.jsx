import React, { useState } from "react";
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
import { useSelector } from "react-redux";
import { request } from "@/utils/api";

export default function EditPlayerProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const routePlayer = route?.params?.player;
  const authUser = useSelector((state) => state?.auth?.user);

  // Dynamic player data derived from route params or Redux auth user
  const [player, setPlayer] = useState({
    id: routePlayer?._id || routePlayer?.id || authUser?._id || authUser?.id || "",
    name: routePlayer?.username || routePlayer?.name || authUser?.username || "",
    shortName: routePlayer?.shortName || "",
    team: routePlayer?.team || "",
    nationality: routePlayer?.nationality || routePlayer?.location || "",
    age: routePlayer?.age?.toString() || "",
    role: routePlayer?.role || authUser?.role || "Batsman",
    battingStyle: routePlayer?.battingStyle || "Right Handed",
    bowlingStyle: routePlayer?.bowlingStyle || "Right Arm Medium",
    photo: routePlayer?.profileImage || routePlayer?.photo || authUser?.profileImage || null,
    debut: routePlayer?.debut || "",
    matches: routePlayer?.matches?.toString() || "0",
    runs: routePlayer?.runs?.toString() || "0",
    wickets: routePlayer?.wickets?.toString() || "0",
    highestScore: routePlayer?.highestScore?.toString() || "0",
    bestBowling: routePlayer?.bestBowling || "-",
    average: routePlayer?.average?.toString() || "0",
    strikeRate: routePlayer?.strikeRate?.toString() || "0",
    economy: routePlayer?.economy?.toString() || "0",
    isPublic: true,
  });

  // HARDCODED SAMPLE PLAYER DATA - COMMENTED OUT (API ONLY)
  /*
  const [player, setPlayer] = useState({
    id: "1",
    name: "Virat Kohli",
    shortName: "V Kohli",
    team: "RCB",
    nationality: "Indian",
    age: "35",
    role: "Batsman",
    battingStyle: "Right Handed",
    bowlingStyle: "Right Arm Medium",
    photo: null,
    debut: "2008-08-18",
    matches: "237",
    runs: "7263",
    wickets: "4",
    highestScore: "113",
    bestBowling: "2/25",
    average: "37.25",
    strikeRate: "130.02",
    economy: "8.52",
    isPublic: true,
  });
  */

  const [formData, setFormData] = useState({ ...player });
  const [isSaving, setIsSaving] = useState(false);

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
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert("Permission required", "Camera access is needed to take photos");
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
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const playerId = player.id || authUser?._id || authUser?.id;
      if (playerId) {
        const updatePayload = {
          username: formData.name,
          role: formData.role,
          location: formData.nationality,
          profileImage: formData.photo,
        };
        await request(`api/users/edit/${playerId}`, {
          method: "POST",
          data: { dataToChange: updatePayload },
        });
      }

      // HARDCODED MOCK SAVE TIMEOUT - COMMENTED OUT (API ONLY)
      /*
      setTimeout(() => {
        setPlayer({ ...formData });
        setIsSaving(false);
        Alert.alert("Success", "Profile updated successfully");
        navigation.goBack();
      }, 1500);
      */

      setPlayer({ ...formData });
      Alert.alert("Success", "Profile updated successfully");
      navigation.goBack();
    } catch (err) {
      console.error("Save profile error:", err);
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to update profile");
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

          <InputField
            label="Nationality"
            value={formData.nationality}
            onChange={(value) => handleInputChange("nationality", value)}
            placeholder="Enter nationality"
          />

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
            value={formData.battingStyle}
            onChange={(value) => handleInputChange("battingStyle", value)}
            options={[
              { value: "Right Handed", label: "Right Handed" },
              { value: "Left Handed", label: "Left Handed" },
            ]}
          />

          <SelectField
            label="Bowling Style"
            value={formData.bowlingStyle}
            onChange={(value) => handleInputChange("bowlingStyle", value)}
            options={[
              { value: "Right Arm Fast", label: "Right Arm Fast" },
              { value: "Right Arm Medium", label: "Right Arm Medium" },
              { value: "Right Arm Spin", label: "Right Arm Spin" },
              { value: "Left Arm Fast", label: "Left Arm Fast" },
              { value: "Left Arm Medium", label: "Left Arm Medium" },
              { value: "Left Arm Spin", label: "Left Arm Spin" },
            ]}
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
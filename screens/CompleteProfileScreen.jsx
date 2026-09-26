import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  useColorScheme,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { useDispatch, useSelector } from "react-redux";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { request, upload } from "@/utils/api";
import { login as loginAction } from "@/redux/authSlice";
import User from "@/utils/User";
import { showGlobalAlert } from "@/contexts/AlertContext";
import LocationSearch from "@/components/ui/custom/LocationSearch";
import {
  toShortBattingStyle,
  toShortBowlingStyle,
  SHORT_BATTING_STYLES,
  SHORT_BOWLING_STYLES,
} from "@/utils";

const { width } = Dimensions.get("window");

const ROLES = [
  { id: "Batsman", title: "Batsman", icon: "sports-cricket", desc: "Top & middle order run-scorer" },
  { id: "Bowler", title: "Bowler", icon: "sports-baseball", desc: "Pace or spin specialist" },
  { id: "All-rounder", title: "All-Rounder", icon: "all-inclusive", desc: "Contributes with bat & ball" },
  { id: "Wicket Keeper", title: "Wicket Keeper", icon: "sports-handball", desc: "Gloveman & batter" },
];

const BATTING_STYLES = SHORT_BATTING_STYLES;
const BOWLING_STYLES = SHORT_BOWLING_STYLES;

export default function CompleteProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const authUser = useSelector((state) => state.auth?.user);
  const routeUser = route.params?.user;
  const currentUser = routeUser || authUser || User.user || {};
  const userId = currentUser?._id || currentUser?.id || User.id;

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [role, setRole] = useState(currentUser?.role || "All-rounder");
  const [battingStyle, setBattingStyle] = useState(
    toShortBattingStyle(currentUser?.batStyle || currentUser?.battingStyle || "RHB")
  );
  const [bowlingStyle, setBowlingStyle] = useState(
    toShortBowlingStyle(currentUser?.ballStyle || currentUser?.bowlingStyle || "RAM")
  );
  const [avatarUri, setAvatarUri] = useState(currentUser?.profileImg || currentUser?.profileImage || null);
  const [city, setCity] = useState(currentUser?.city || currentUser?.location || "");
  const [locationId, setLocationId] = useState(currentUser?.locationId || "");
  const [bio, setBio] = useState(currentUser?.bio || "");

  // Slide Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (nextStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: nextStep > step ? -width * 0.15 : width * 0.15,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(nextStep > step ? width * 0.15 : -width * 0.15);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (step < 3) {
      animateTransition(step + 1);
    } else {
      handleCompleteProfile();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      animateTransition(step - 1);
    } else {
      navigation.replace(SCREENS.Home);
    }
  };

  const handleSkip = () => {
    navigation.replace(SCREENS.Home);
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showGlobalAlert({
          title: "Permission Needed",
          message: "Please allow photo access to select your player picture.",
          type: "warning",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      showGlobalAlert({
        title: "Image Error",
        message: "Failed to open photo library.",
        type: "error",
      });
    }
  };

  const handleCompleteProfile = async () => {
    setIsSaving(true);
    try {
      let uploadedUrl = avatarUri;
      if (avatarUri && !avatarUri.startsWith("http")) {
        try {
          const uploadRes = await upload(avatarUri, "profile");
          uploadedUrl =
            uploadRes?.url ||
            uploadRes?.data?.url ||
            uploadRes?.data ||
            (typeof uploadRes === "string" ? uploadRes : avatarUri);
        } catch (uploadErr) {
          console.log("[CompleteProfile] Avatar upload warning:", uploadErr);
        }
      }

      const cleanBatStyle = toShortBattingStyle(battingStyle);
      const cleanBallStyle = toShortBowlingStyle(bowlingStyle);

      const payload = {
        role,
        batStyle: cleanBatStyle,
        battingStyle: cleanBatStyle,
        ballStyle: cleanBallStyle,
        bowlingStyle: cleanBallStyle,
        city: city.trim(),
        location: city.trim(),
        ...(locationId ? { locationId } : {}),
        bio: bio.trim(),
        ...(uploadedUrl ? { profileImg: uploadedUrl, profileImage: uploadedUrl } : {}),
      };

      if (userId) {
        await request(`api/users/edit/${userId}`, {
          method: "POST",
          data: { dataToChange: payload },
          errorAlert: false,
        }).catch((e) => console.log("[CompleteProfile] Edit user warning:", e));
      }

      // Update Redux and User Session
      const updatedUser = {
        ...currentUser,
        ...payload,
        profileImg: uploadedUrl || currentUser?.profileImg,
        profileImage: uploadedUrl || currentUser?.profileImage,
      };

      dispatch(loginAction(updatedUser));
      User.login(updatedUser);

      // Direct navigation to Home - no popup modal
      navigation.replace(SCREENS.Home);
    } catch (err) {
      console.error("[CompleteProfile] Error completing profile:", err);
      navigation.replace(SCREENS.Home);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-gray-900" : "bg-slate-50"}`}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.8}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
            elevation: 1,
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? "#FFF" : "#0F172A"} />
        </TouchableOpacity>

        <View className="items-center">
          <ThemedText className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            Profile Setup
          </ThemedText>
          <ThemedText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Step {step} of 3
          </ThemedText>
        </View>

        <TouchableOpacity onPress={handleSkip} className="py-1.5 px-3 rounded-full">
          <ThemedText className="text-xs font-semibold text-blue-500">Skip</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Progress Line */}
      <View className="mx-6 my-3 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <Animated.View
          style={{
            height: "100%",
            width: `${(step / 3) * 100}%`,
            backgroundColor: "#2563EB",
            borderRadius: 99,
          }}
        />
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 + insets.bottom }}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {/* STEP 1: Playing Role, Batting & Bowling Style */}
          {step === 1 && (
            <View className="mt-2">
              <ThemedText className={`text-2xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                What's your cricket style?
              </ThemedText>
              <ThemedText className={`text-sm mt-1 mb-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Select your primary playing role and preferences
              </ThemedText>

              {/* Roles Grid */}
              <ThemedText className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Playing Role
              </ThemedText>
              <View className="flex-row flex-wrap gap-2.5 mb-6">
                {ROLES.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => setRole(r.id)}
                      activeOpacity={0.85}
                      className="w-[48%] p-3.5 rounded-2xl border"
                      style={{
                        backgroundColor: isSelected
                          ? isDark
                            ? "rgba(37, 99, 235, 0.2)"
                            : "#EFF6FF"
                          : isDark
                          ? "#1F2937"
                          : "#FFFFFF",
                        borderColor: isSelected
                          ? "#2563EB"
                          : isDark
                          ? "#374151"
                          : "#E5E7EB",
                        elevation: isSelected ? 1 : 0,
                      }}
                    >
                      <View
                        className="w-9 h-9 rounded-xl items-center justify-center mb-2.5"
                        style={{
                          backgroundColor: isSelected
                            ? "#2563EB"
                            : isDark
                            ? "#374151"
                            : "#F3F4F6",
                        }}
                      >
                        <MaterialIcons
                          name={r.icon}
                          size={20}
                          color={isSelected ? "#FFFFFF" : isDark ? "#94A3B8" : "#64748B"}
                        />
                      </View>
                      <ThemedText
                        style={{
                          fontWeight: "700",
                          fontSize: 14,
                          color: isSelected
                            ? "#2563EB"
                            : isDark
                            ? "#FFFFFF"
                            : "#111827",
                        }}
                      >
                        {r.title}
                      </ThemedText>
                      <ThemedText
                        numberOfLines={2}
                        style={{
                          fontSize: 11,
                          marginTop: 2,
                          color: isSelected
                            ? isDark
                              ? "#93C5FD"
                              : "#1D4ED8"
                            : isDark
                            ? "#9CA3AF"
                            : "#6B7280",
                        }}
                      >
                        {r.desc}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Batting Style */}
              <ThemedText className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Batting Style
              </ThemedText>
              <View className="flex-row gap-2.5 mb-6">
                {BATTING_STYLES.map((s) => {
                  const isSelected = toShortBattingStyle(battingStyle) === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      onPress={() => setBattingStyle(s.value)}
                      activeOpacity={0.8}
                      className="flex-1 py-3 px-4 rounded-xl border flex-row items-center justify-center"
                      style={{
                        backgroundColor: isSelected
                          ? "#2563EB"
                          : isDark
                          ? "#1F2937"
                          : "#FFFFFF",
                        borderColor: isSelected
                          ? "#2563EB"
                          : isDark
                          ? "#374151"
                          : "#E5E7EB",
                        elevation: isSelected ? 1 : 0,
                      }}
                    >
                      <MaterialIcons
                        name="sports-cricket"
                        size={16}
                        color={isSelected ? "#FFFFFF" : isDark ? "#9CA3AF" : "#64748B"}
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText
                        style={{
                          fontWeight: "600",
                          fontSize: 13,
                          color: isSelected
                            ? "#FFFFFF"
                            : isDark
                            ? "#E5E7EB"
                            : "#1F2937",
                        }}
                      >
                        {s.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Bowling Style */}
              <ThemedText className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Bowling Style
              </ThemedText>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {BOWLING_STYLES.map((s) => {
                  const isSelected = toShortBowlingStyle(bowlingStyle) === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      onPress={() => setBowlingStyle(s.value)}
                      activeOpacity={0.8}
                      className="py-2 px-3.5 rounded-full border items-center justify-center"
                      style={{
                        backgroundColor: isSelected
                          ? "#2563EB"
                          : isDark
                          ? "#1F2937"
                          : "#FFFFFF",
                        borderColor: isSelected
                          ? "#2563EB"
                          : isDark
                          ? "#374151"
                          : "#E5E7EB",
                        elevation: isSelected ? 1 : 0,
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: isSelected
                            ? "#FFFFFF"
                            : isDark
                            ? "#D1D5DB"
                            : "#4B5563",
                        }}
                      >
                        {s.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 2: Avatar, Location & Bio */}
          {step === 2 && (
            <View className="mt-2">
              <ThemedText className={`text-2xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                Add profile picture & location
              </ThemedText>
              <ThemedText className={`text-sm mt-1 mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Help organizers and teammates find and recognize you
              </ThemedText>

              {/* Avatar Picker */}
              <View className="items-center justify-center mb-6">
                <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} className="relative">
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      className="w-28 h-28 rounded-full border-4 border-blue-500"
                    />
                  ) : (
                    <View
                      className={`w-28 h-28 rounded-full items-center justify-center border-2 border-dashed ${
                        isDark ? "bg-gray-800 border-gray-600" : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      <Ionicons name="person" size={44} color={isDark ? "#64748B" : "#94A3B8"} />
                    </View>
                  )}
                  <View
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-blue-500 items-center justify-center border-2 border-white dark:border-gray-900"
                    style={{ elevation: 2 }}
                  >
                    <Ionicons name="camera" size={16} color="#FFF" />
                  </View>
                </TouchableOpacity>
                <ThemedText className={`text-xs mt-2.5 font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Tap to upload profile photo
                </ThemedText>
              </View>

              {/* City / Location Input (Google API Powered) */}
              <View style={{ zIndex: 1000 }} className="mb-4">
                <ThemedText className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  City / Location
                </ThemedText>
                <LocationSearch
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    setLocationId("");
                  }}
                  onSelectLocation={(item) => {
                    const desc =
                      typeof item === "string"
                        ? item
                        : item?.description ||
                          item?.structured_formatting?.main_text ||
                          "";
                    setCity(desc);
                    setLocationId(item?.place_id || "");
                  }}
                  placeholder="Search city or location (powered by Google)..."
                  isDarkMode={isDark}
                  containerStyle={{ marginBottom: 0 }}
                  inputContainerStyle={{
                    borderRadius: 12,
                    backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                    borderColor: isDark ? "#374151" : "#E5E7EB",
                  }}
                />
              </View>

              {/* Player Bio */}
              <View className="mb-4">
                <ThemedText className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Cricket Bio / Tagline (Optional)
                </ThemedText>
                <View
                  className="p-3.5 rounded-xl border"
                  style={{
                    backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                    borderColor: isDark ? "#374151" : "#E5E7EB",
                  }}
                >
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Share a few words about your playing style or achievements..."
                    placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                    multiline
                    numberOfLines={3}
                    style={{
                      minHeight: 65,
                      textAlignVertical: "top",
                      fontSize: 14,
                      color: isDark ? "#FFFFFF" : "#111827",
                    }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Review & Summary */}
          {step === 3 && (
            <View className="mt-2">
              <ThemedText className={`text-2xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                Ready to play!
              </ThemedText>
              <ThemedText className={`text-sm mt-1 mb-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Here is your Criconic player card preview
              </ThemedText>

              {/* Player Card Preview */}
              <LinearGradient
                colors={isDark ? ["#1E293B", "#0F172A"] : ["#1D4ED8", "#1E40AF"]}
                className="p-5 rounded-3xl mb-6"
                style={{
                  borderWidth: 1,
                  borderColor: "rgba(96, 165, 250, 0.2)",
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center">
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      className="w-16 h-16 rounded-full border-2 border-white/80"
                    />
                  ) : (
                    <View className="w-16 h-16 rounded-full bg-white/10 items-center justify-center border-2 border-white/40">
                      <Ionicons name="person" size={28} color="#FFF" />
                    </View>
                  )}

                  <View className="ml-4 flex-1">
                    <ThemedText className="text-white text-xl font-black">
                      {currentUser?.username || currentUser?.name || "Cricketer"}
                    </ThemedText>
                    <View className="flex-row items-center mt-1">
                      <View className="px-2 py-0.5 rounded-full bg-white/20">
                        <ThemedText className="text-white text-[11px] font-bold">
                          {role}
                        </ThemedText>
                      </View>
                      {city ? (
                        <ThemedText className="text-blue-200 text-xs ml-2" numberOfLines={1}>
                          📍 {city}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="h-px bg-white/15 my-4" />

                <View className="flex-row justify-between">
                  <View className="flex-1">
                    <ThemedText className="text-blue-200 text-[11px] uppercase tracking-wider">
                      Batting
                    </ThemedText>
                    <ThemedText className="text-white font-bold text-xs mt-0.5">
                      {battingStyle}
                    </ThemedText>
                  </View>
                  <View className="flex-1 items-end">
                    <ThemedText className="text-blue-200 text-[11px] uppercase tracking-wider">
                      Bowling
                    </ThemedText>
                    <ThemedText className="text-white font-bold text-xs mt-0.5">
                      {bowlingStyle}
                    </ThemedText>
                  </View>
                </View>

                {bio ? (
                  <View className="mt-3.5 pt-3 border-t border-white/10">
                    <ThemedText className="text-blue-100/90 text-xs italic">
                      "{bio}"
                    </ThemedText>
                  </View>
                ) : null}
              </LinearGradient>

              <ThemedText className={`text-xs text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                You can always edit these details anytime from your Player Profile settings.
              </ThemedText>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        className="absolute bottom-0 left-0 right-0 p-4 border-t"
        style={{
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
          borderTopColor: isDark ? "#1F2937" : "#E5E7EB",
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <TouchableOpacity
          onPress={handleNext}
          disabled={isSaving}
          activeOpacity={0.85}
          className="w-full py-3.5 rounded-2xl items-center justify-center active:bg-blue-700"
          style={{
            backgroundColor: "#2563EB",
            elevation: 2,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <ThemedText className="text-white font-bold text-base">
              {step === 3 ? "Complete & Start Playing" : "Continue"}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

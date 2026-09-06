import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Eye, EyeOff, Lock, Phone } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useNavigation } from "@react-navigation/native";
import SCREENS from ".";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";
import { login as loginAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import User from "@/utils/User";

const LoginScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state?.auth?.user);
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // Auto-redirect if already logged in
  useEffect(() => {
    if (User.isLogin() || authUser?._id || authUser?.id) {
      console.log("🔐 [LoginScreen] User already logged in, redirecting to Home");
      navigation.replace(SCREENS.Home);
    }
  }, [authUser]);

  const handleLogin = async () => {
    if (!mobile.trim()) {
      Alert.alert("Required", "Please enter your mobile number.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Required", "Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.login({
        mobile: mobile.trim(),
        password: password.trim(),
      });

      if (res?.data?.success || res?.status === 200) {
        const user = res?.data?.user;
        if (user && (user._id || user.id)) {
          console.log("🔐 [LoginScreen] Logged in successfully:", user._id, user.username);
          dispatch(loginAction(user));
          navigation.replace(SCREENS.Home);
        } else {
          // If checkStatus inside authApi.login didn't return full user, fetch directly
          const statusRes = await authApi.checkStatus();
          const fallbackUser = statusRes?.data?.user || res?.data?.user || { mobile: mobile.trim() };
          dispatch(loginAction(fallbackUser));
          navigation.replace(SCREENS.Home);
        }
      } else {
        Alert.alert(
          "Login Failed",
          res?.data?.message || "Invalid mobile or password. Please try again."
        );
      }
    } catch (err) {
      Alert.alert("Login Error", err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-950" : "bg-slate-50"}`}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Header Gradient Hero */}
          <LinearGradient
            colors={
              isDarkMode
                ? ["#1E3A8A", "#1E1B4B", "#0F172A"]
                : ["#2563EB", "#1D4ED8", "#1E40AF"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-6 pt-10 pb-16 items-center justify-center relative overflow-hidden"
          >
            {/* Background Cricket Ball Accent circle */}
            <View className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/5" />
            <View className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-white/5" />

            {/* Logo & Branding */}
            <View className="items-center">
              <View className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md items-center justify-center mb-3 border border-white/20">
                <Ionicons name="baseball-outline" size={34} color="#FFFFFF" />
              </View>
              <ThemedText className="text-white text-3xl font-extrabold tracking-tight">
                CRICONIC
              </ThemedText>
              <ThemedText className="text-blue-200 text-xs font-medium tracking-wide mt-1">
                Your Ultimate Live Cricket Companion
              </ThemedText>
            </View>
          </LinearGradient>

          {/* Form Card Container */}
          <View
            className={`flex-1 -mt-8 px-6 pt-8 pb-10 rounded-t-3xl border-t ${
              isDarkMode
                ? "bg-gray-900 border-gray-800"
                : "bg-white border-gray-100"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: isDarkMode ? 0.3 : 0.06,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            {/* Welcome Title */}
            <View className="mb-6">
              <ThemedText
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Welcome Back
              </ThemedText>
              <ThemedText
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Sign in to track live scores, manage teams & tournaments
              </ThemedText>
            </View>

            {/* Mobile / Phone Field */}
            <View className="mb-4">
              <ThemedText
                className={`text-xs font-semibold mb-1.5 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Mobile Number
              </ThemedText>
              <View
                className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Phone
                  size={18}
                  color={isDarkMode ? "#9CA3AF" : "#64748B"}
                />
                <TextInput
                  className={`flex-1 ml-3 text-sm font-medium ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#94A3B8"}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password Field */}
            <View className="mb-2">
              <ThemedText
                className={`text-xs font-semibold mb-1.5 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Password
              </ThemedText>
              <View
                className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Lock
                  size={18}
                  color={isDarkMode ? "#9CA3AF" : "#64748B"}
                />
                <TextInput
                  className={`flex-1 ml-3 text-sm font-medium ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#94A3B8"}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-1"
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                      color={isDarkMode ? "#9CA3AF" : "#64748B"}
                    />
                  ) : (
                    <Eye
                      size={18}
                      color={isDarkMode ? "#9CA3AF" : "#64748B"}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <View className="items-end mb-6">
              <TouchableOpacity activeOpacity={0.7}>
                <ThemedText className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Forgot Password?
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.88}
              className="rounded-xl overflow-hidden mb-4"
              style={{
                shadowColor: "#2563EB",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <LinearGradient
                colors={["#2563EB", "#1D4ED8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-3.5 items-center justify-center flex-row"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText className="text-white text-base font-bold tracking-wide">
                    Sign In
                  </ThemedText>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Skip Login / Guest Option */}
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.Home)}
              activeOpacity={0.7}
              className={`py-3 rounded-xl border items-center justify-center mb-6 ${
                isDarkMode
                  ? "bg-gray-800/50 border-gray-700"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <ThemedText
                className={`text-xs font-semibold ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Explore as Guest
              </ThemedText>
            </TouchableOpacity>

            {/* Sign Up Footer */}
            <View className="flex-row justify-center items-center mt-auto">
              <ThemedText
                className={`text-xs ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Don't have an account?{" "}
              </ThemedText>
              <TouchableOpacity activeOpacity={0.7}>
                <ThemedText className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Create Account
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

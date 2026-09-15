import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  Alert,
  ActivityIndicator,
  Image,
  ImageBackground,
  Dimensions,
} from "react-native";
import { Eye, EyeOff, Lock, Phone, UserPlus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import AppKeyboardAwareScrollView from "@/components/ui/custom/AppKeyboardAwareScrollView";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";

import SCREENS from ".";
import { login as loginAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import User from "@/utils/User";
import analytics from "@/utils/analytics";

const { height } = Dimensions.get("window");

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
      console.log(
        "🔐 [LoginScreen] User already logged in, redirecting to Home"
      );

      navigation.replace(SCREENS.Home);
    }
  }, [authUser, navigation]);

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

    analytics.logAction("login_attempt", "authentication", {
      method: "password",
    });

    try {
      const res = await authApi.login({
        mobile: mobile.trim(),
        password: password.trim(),
      });

      if (res?.data?.success || res?.status === 200) {
        let user = res?.data?.user;

        // If login response doesn't contain user data,
        // fetch the current user from checkStatus.
        if (!user || (!user._id && !user.id)) {
          const statusRes = await authApi.checkStatus();

          user =
            statusRes?.data?.user ||
            res?.data?.user || {
              mobile: mobile.trim(),
            };
        }

        console.log(
          "🔐 [LoginScreen] Logged in successfully:",
          user?._id || user?.id,
          user?.username
        );

        analytics.logLogin(
          "password",
          user?._id || user?.id
        );

        dispatch(loginAction(user));
        User.login(user);

        navigation.replace(SCREENS.Home);
      } else {
        const message =
          res?.data?.message ||
          "Invalid mobile or password. Please try again.";

        analytics.logAction("login_failed", "authentication", {
          reason: message,
        });

        Alert.alert("Login Failed", message);
      }
    } catch (err) {
      const message = err?.message || "Something went wrong.";

      analytics.logAction("login_failed", "authentication", {
        reason: message,
      });

      Alert.alert("Login Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    analytics.logAction("navigate_to_signup", "navigation");
    navigation.navigate(SCREENS.SignUpScreen);
  };

  const handleForgotPassword = () => {
    navigation.navigate(SCREENS.ForgotPasswordScreen);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${
        isDarkMode ? "bg-gray-950" : "bg-slate-900"
      }`}
    >
      <AppKeyboardAwareScrollView
        extraHeight={80}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View
          style={{
            minHeight: Math.max(height * 0.34, 230),
            width: "100%",
          }}
          className="relative overflow-hidden justify-center items-center"
        >
          <ImageBackground
            source={require("../assets/stadium-background-image.jpg")}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
            }}
            resizeMode="cover"
          />

          <LinearGradient
            colors={
              isDarkMode
                ? [
                    "rgba(15,23,42,0.65)",
                    "rgba(30,27,75,0.85)",
                    "rgba(15,23,42,0.98)",
                  ]
                : [
                    "rgba(30,58,138,0.7)",
                    "rgba(37,99,235,0.82)",
                    "rgba(29,78,216,0.96)",
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0 items-center justify-center px-6 pt-6 pb-12"
          >
            {/* Background Accents */}
            <View className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
            <View className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-white/10" />

            {/* Logo */}
            <View className="items-center z-10">
              <View className="p-2.5 rounded-2xl bg-white/15 items-center justify-center mb-2.5 border border-white/25 shadow-lg">
                <Image
                  source={require("../assets/Logo.png")}
                  className="w-32 h-10"
                  resizeMode="contain"
                />
              </View>

              <ThemedText className="text-white text-2xl font-black tracking-wider">
                CRICONIC
              </ThemedText>

              <ThemedText className="text-blue-200 text-xs font-medium tracking-wide mt-0.5 text-center">
                Your Ultimate Live Cricket Companion
              </ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Form Card */}
        <View
          className={`flex-1 -mt-6 px-6 pt-7 pb-10 rounded-t-3xl border-t ${
            isDarkMode
              ? "bg-gray-900 border-gray-800"
              : "bg-white border-gray-100"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: isDarkMode ? 0.35 : 0.08,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          {/* Welcome */}
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

          {/* Mobile Number */}
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
                placeholderTextColor={
                  isDarkMode ? "#6B7280" : "#94A3B8"
                }
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Password */}
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
                placeholderTextColor={
                  isDarkMode ? "#6B7280" : "#94A3B8"
                }
              />

              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
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

          {/* Forgot Password */}
          <View className="items-end mb-6">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleForgotPassword}
            >
              <ThemedText className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Sign In */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.88}
            className="rounded-xl overflow-hidden mb-3"
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

          {/* Sign Up */}
          <TouchableOpacity
            onPress={handleSignUp}
            activeOpacity={0.85}
            className={`py-3.5 rounded-xl border-2 items-center justify-center flex-row ${
              isDarkMode
                ? "bg-blue-950/40 border-blue-500"
                : "bg-blue-50/70 border-blue-600"
            }`}
          >
            <UserPlus
              size={18}
              color={isDarkMode ? "#60A5FA" : "#2563EB"}
              style={{ marginRight: 8 }}
            />

            <ThemedText
              className={`text-base font-bold tracking-wide ${
                isDarkMode ? "text-blue-400" : "text-blue-600"
              }`}
            >
              Sign Up / Create Account
            </ThemedText>
          </TouchableOpacity>

          {/* Footer */}
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
        </View>
      </AppKeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
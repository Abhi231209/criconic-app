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
import {
  Eye,
  EyeOff,
  Lock,
  Phone,
  UserPlus,
  ArrowRight,
  Compass,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import AppKeyboardAwareScrollView from "@/components/ui/custom/AppKeyboardAwareScrollView";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { showGlobalAlert } from "@/contexts/AlertContext";

import SCREENS from ".";
import { login as loginAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import User from "@/utils/User";
import analytics from "@/utils/analytics";

const { height } = Dimensions.get("window");

const LoginScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const dispatch = useDispatch();

  const authUser = useSelector((state) => state?.auth?.user);

  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // Auto-redirect if already logged in AND LoginScreen is the active focused screen
  useEffect(() => {
    if (!isFocused) return;
    if (User.isLogin() || authUser?._id || authUser?.id) {
      const user = authUser || User.user;
      const isProfileIncomplete =
        !user?.role ||
        user.role === "Player" ||
        user.role === "player" ||
        (!user?.batStyle && !user?.battingStyle);

      if (isProfileIncomplete) {
        navigation.replace(SCREENS.CompleteProfile, { user });
      } else {
        navigation.replace(SCREENS.Home);
      }
    }
  }, [authUser, navigation, isFocused]);

  const handleLogin = async () => {
    const cleanedMobile = mobile.replace(/\D/g, "");
    if (!cleanedMobile) {
      showGlobalAlert({
        title: "Mobile Number Required",
        message: "Please enter your 10-digit mobile number.",
        type: "warning",
      });
      return;
    }

    if (cleanedMobile.length !== 10) {
      showGlobalAlert({
        title: "Invalid Mobile Number",
        message: "Mobile number must be exactly 10 digits.",
        type: "warning",
      });
      return;
    }

    if (!password.trim()) {
      showGlobalAlert({
        title: "Password Required",
        message: "Please enter your password.",
        type: "warning",
      });
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

        const isProfileIncomplete =
          !user?.role ||
          user.role === "Player" ||
          user.role === "player" ||
          (!user?.batStyle && !user?.battingStyle);

        if (isProfileIncomplete) {
          navigation.replace(SCREENS.CompleteProfile, { user });
        } else {
          navigation.replace(SCREENS.Home);
        }
      } else {
        const message =
          res?.data?.message ||
          "Invalid mobile or password. Please try again.";

        analytics.logAction("login_failed", "authentication", {
          reason: message,
        });

        showGlobalAlert({
          title: "Login Failed",
          message,
          type: "error",
        });
      }
    } catch (err) {
      const message = err?.message || "Something went wrong.";

      analytics.logAction("login_failed", "authentication", {
        reason: message,
      });

      showGlobalAlert({
        title: "Login Error",
        message,
        type: "error",
      });
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
        isDarkMode ? "bg-slate-950" : "bg-slate-900"
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
            minHeight: Math.max(height * 0.35, 240),
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
                    "rgba(15,23,42,0.70)",
                    "rgba(30,27,75,0.88)",
                    "rgba(15,23,42,0.98)",
                  ]
                : [
                    "rgba(30,58,138,0.72)",
                    "rgba(37,99,235,0.85)",
                    "rgba(29,78,216,0.97)",
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0 items-center justify-center px-6 pt-6 pb-12"
          >
            {/* Ambient Background Glow Circles */}
            <View className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-blue-400/10 blur-xl" />
            <View className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-400/15 blur-xl" />

            {/* Logo and App Title */}
            <View className="items-center z-10">
              <View className="p-3 rounded-2xl bg-white/15 items-center justify-center mb-2.5 border border-white/30 shadow-lg backdrop-blur-md">
                <Image
                  source={require("../assets/Logo.png")}
                  className="w-32 h-10"
                  resizeMode="contain"
                />
              </View>

              <ThemedText className="text-white text-2xl font-black tracking-widest">
                CRICONIC
              </ThemedText>

              <View className="flex-row items-center mt-1 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20">
                <ThemedText className="text-blue-100 text-[11px] font-medium tracking-wide">
                  Live Cricket Scoring & Tournaments
                </ThemedText>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Modern Form Card */}
        <View
          className={`flex-1 -mt-6 px-6 pt-7 pb-10 rounded-t-3xl border-t ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-100"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDarkMode ? 0.4 : 0.08,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Welcome Header */}
          <View className="mb-6">
            <ThemedText
              className={`text-2xl font-black tracking-tight ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Welcome Back 👋
            </ThemedText>

            <ThemedText
              className={`text-xs mt-1.5 leading-4 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Sign in to manage your matches, score live, and run tournaments
            </ThemedText>
          </View>

          {/* Mobile Number Input with +91 Prefix */}
          <View className="mb-4">
            <ThemedText
              className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Mobile Number
            </ThemedText>

            <View
              className={`flex-row items-center rounded-2xl border transition-colors ${
                focusedField === "mobile"
                  ? isDarkMode
                    ? "border-blue-500 bg-slate-800/90"
                    : "border-blue-600 bg-blue-50/20"
                  : isDarkMode
                  ? "bg-slate-800/60 border-slate-700/80"
                  : "bg-slate-50 border-slate-200"
              }`}
              style={{ minHeight: 52 }}
            >
              {/* +91 Country Code Badge */}
              <View
                className={`flex-row items-center px-3.5 py-3 border-r ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-800 rounded-l-2xl"
                    : "border-slate-200 bg-slate-100 rounded-l-2xl"
                }`}
              >
                <ThemedText className="text-sm mr-1.5">🇮🇳</ThemedText>
                <ThemedText
                  className={`text-xs font-bold ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  +91
                </ThemedText>
              </View>

              <Phone
                size={17}
                color={
                  focusedField === "mobile"
                    ? "#3B82F6"
                    : isDarkMode
                    ? "#94A3B8"
                    : "#64748B"
                }
                style={{ marginLeft: 12 }}
              />

              <TextInput
                className={`flex-1 ml-2.5 mr-3 text-sm font-semibold ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
                value={mobile}
                onChangeText={(val) => setMobile(val.replace(/\D/g, "").slice(0, 10))}
                onFocus={() => setFocusedField("mobile")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor={
                  isDarkMode ? "#64748B" : "#94A3B8"
                }
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-2">
            <ThemedText
              className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Password
            </ThemedText>

            <View
              className={`flex-row items-center px-3.5 rounded-2xl border transition-colors ${
                focusedField === "password"
                  ? isDarkMode
                    ? "border-blue-500 bg-slate-800/90"
                    : "border-blue-600 bg-blue-50/20"
                  : isDarkMode
                  ? "bg-slate-800/60 border-slate-700/80"
                  : "bg-slate-50 border-slate-200"
              }`}
              style={{ minHeight: 52 }}
            >
              <Lock
                size={18}
                color={
                  focusedField === "password"
                    ? "#3B82F6"
                    : isDarkMode
                    ? "#94A3B8"
                    : "#64748B"
                }
              />

              <TextInput
                className={`flex-1 ml-3 mr-2 text-sm font-semibold ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your password"
                placeholderTextColor={
                  isDarkMode ? "#64748B" : "#94A3B8"
                }
              />

              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                className="p-1.5"
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff
                    size={18}
                    color={isDarkMode ? "#94A3B8" : "#64748B"}
                  />
                ) : (
                  <Eye
                    size={18}
                    color={isDarkMode ? "#94A3B8" : "#64748B"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <View className="items-end mb-6 mt-1">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleForgotPassword}
              className="py-1"
            >
              <ThemedText className="text-xs font-bold text-blue-500 dark:text-blue-400">
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Primary Sign In Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.88}
            className="rounded-2xl overflow-hidden mb-4 shadow-lg shadow-blue-600/30"
            style={{
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={["#1D4ED8", "#2563EB", "#3B82F6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 items-center justify-center flex-row"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ThemedText className="text-white text-base font-black tracking-wide mr-2">
                    Sign In
                  </ThemedText>
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-3">
            <View
              className={`flex-1 h-[1px] ${
                isDarkMode ? "bg-slate-800" : "bg-slate-200"
              }`}
            />
            <ThemedText
              className={`mx-3 text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              or
            </ThemedText>
            <View
              className={`flex-1 h-[1px] ${
                isDarkMode ? "bg-slate-800" : "bg-slate-200"
              }`}
            />
          </View>

          {/* Sign Up / Create Account Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            activeOpacity={0.85}
            className={`py-3.5 rounded-2xl border-2 items-center justify-center flex-row mb-3 ${
              isDarkMode
                ? "bg-blue-950/30 border-blue-600/60"
                : "bg-blue-50/60 border-blue-500/70"
            }`}
          >
            <UserPlus
              size={18}
              color={isDarkMode ? "#60A5FA" : "#2563EB"}
              style={{ marginRight: 8 }}
            />
            <ThemedText
              className={`text-sm font-bold tracking-wide ${
                isDarkMode ? "text-blue-400" : "text-blue-600"
              }`}
            >
              Create New Account
            </ThemedText>
          </TouchableOpacity>

          {/* Explore as Guest Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.Home)}
            activeOpacity={0.75}
            className={`py-3 rounded-2xl border items-center justify-center flex-row ${
              isDarkMode
                ? "bg-slate-800/50 border-slate-700/60"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <Compass
              size={16}
              color={isDarkMode ? "#94A3B8" : "#64748B"}
              style={{ marginRight: 6 }}
            />
            <ThemedText
              className={`text-xs font-semibold ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
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
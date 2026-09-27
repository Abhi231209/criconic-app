import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  ScrollView,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Check,
  ShieldCheck,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import { navigationRef } from "@/navigation/navigationRef";
import axios from "axios";
import { BASE_URL as API_URL } from "@/config";
import { showGlobalAlert } from "@/contexts/AlertContext";
import useAppTheme from "@/hooks/useAppTheme";
import CriconicLogo from "@/components/ui/custom/CriconicLogo";
import SCREENS from "@/screens";

const { height } = Dimensions.get("window");

export default function ResetPasswordScreen({ route, navigation: propNavigation }) {
  const navigation = propNavigation || navigationRef;
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const colorScheme = useColorScheme();
  const isDarkMode = typeof isDark === "boolean" ? isDark : colorScheme === "dark";

  const { mobile = "", otp = "", validationId = "" } = route?.params || {};

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const sanitizeMobileNumber = (raw) => {
    if (!raw) return "";
    let cleaned = String(raw).replace(/\D/g, "");
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = cleaned.slice(2);
    } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = cleaned.slice(1);
    }
    return cleaned;
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    if (!password.trim() || password.length < 6) {
      showGlobalAlert({
        title: "Weak Password",
        message: "Password must be at least 6 characters long.",
        type: "warning",
      });
      return;
    }
    if (password !== confirmPassword) {
      showGlobalAlert({
        title: "Passwords Don't Match",
        message: "The entered passwords do not match. Please verify and try again.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const cleanedMobile = sanitizeMobileNumber(mobile);
      const res = await axios.post(`${API_URL}api/users/forgotPassword`, {
        mobile: cleanedMobile,
        password,
        otp: (otp || "").trim(),
        validationId: validationId || "",
      });

      if (res.data?.success) {
        showGlobalAlert({
          title: "Password Reset Successful",
          message:
            "Your password has been reset successfully. You can now sign in with your new credentials.",
          type: "success",
          buttons: [
            {
              text: "Sign In Now",
              onPress: () => {
                if (typeof navigation.navigate === "function") {
                  navigation.navigate(SCREENS.LoginScreen);
                } else {
                  navigation.goBack();
                }
              },
            },
          ],
        });
      } else {
        showGlobalAlert({
          title: "Reset Failed",
          message: res.data?.message || "Failed to reset password. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      showGlobalAlert({
        title: "Reset Failed",
        message:
          err.response?.data?.message ||
          "Password reset failed. Please check your details and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section */}
        <View style={{ minHeight: 280 }}>
          <ImageBackground
            source={require("../../../assets/stadium-background-image.jpg")}
            resizeMode="cover"
            className="absolute inset-0 w-full h-full"
          >
            <LinearGradient
              colors={
                isDarkMode
                  ? ["rgba(2, 6, 23, 0.5)", "rgba(2, 6, 23, 0.95)"]
                  : ["rgba(15, 23, 42, 0.45)", "rgba(15, 23, 42, 0.9)"]
              }
              className="absolute inset-0"
            />
          </ImageBackground>

          <LinearGradient
            colors={["transparent", "rgba(0, 0, 0, 0.7)"]}
            className="flex-1 justify-between px-6 pb-12"
            style={{ paddingTop: Math.max((insets.top || 0) + 12, 36) }}
          >
            {/* Top Navigation Row */}
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                className="w-11 h-11 rounded-full items-center justify-center bg-white/20 backdrop-blur-md border border-white/25"
              >
                <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>

              <CriconicLogo />

              <View className="w-11 h-11" />
            </View>

            {/* Stepper Wizard Indicator */}
            <View className="flex-row items-center justify-between px-2 pt-2">
              {[
                { label: "Mobile", completed: true, active: false },
                { label: "Verify OTP", completed: true, active: false },
                { label: "New Password", completed: false, active: true },
              ].map((s, idx) => (
                <React.Fragment key={idx}>
                  <View className="items-center">
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                        s.active
                          ? "bg-blue-600 border-white shadow-lg shadow-blue-500/50"
                          : s.completed
                          ? "bg-emerald-500 border-emerald-300"
                          : "bg-white/10 border-white/30"
                      }`}
                    >
                      {s.completed ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <ThemedText
                          className={`text-xs font-black ${
                            s.active ? "text-white" : "text-white/70"
                          }`}
                        >
                          {idx + 1}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText
                      className={`text-[10px] font-bold mt-1 ${
                        s.active
                          ? "text-white"
                          : s.completed
                          ? "text-emerald-300"
                          : "text-white/60"
                      }`}
                    >
                      {s.label}
                    </ThemedText>
                  </View>

                  {idx < 2 && (
                    <View
                      className={`flex-1 h-[2px] mx-2 -mt-3.5 ${
                        idx < 2 ? "bg-emerald-400" : "bg-white/20"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Modern Form Card */}
        <View
          className={`flex-1 -mt-6 px-6 pt-7 rounded-t-3xl border-t ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-100"
          }`}
          style={{
            minHeight: Math.max(height * 0.65, 480),
            paddingBottom: Math.max((insets.bottom || 0) + 28, 44),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDarkMode ? 0.4 : 0.08,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Header Title */}
          <View className="mb-5">
            <ThemedText
              className={`text-2xl font-black tracking-tight ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Create New Password 🔑
            </ThemedText>
            <ThemedText
              className={`text-xs mt-1.5 leading-5 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Your identity for +91 {mobile} has been verified. Set your new password with at least 6 characters.
            </ThemedText>
          </View>

          {/* New Password Input */}
          <View className="mb-3.5">
            <ThemedText
              className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              New Password
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
                placeholder="Enter at least 6 characters"
                placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
              />

              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                className="p-1.5"
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={18} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                ) : (
                  <Eye size={18} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View className="mb-4">
            <ThemedText
              className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Confirm Password
            </ThemedText>

            <View
              className={`flex-row items-center px-3.5 rounded-2xl border transition-colors ${
                focusedField === "confirmPassword"
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
                  focusedField === "confirmPassword"
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
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField(null)}
                placeholder="Re-enter your new password"
                placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
              />

              <TouchableOpacity
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                className="p-1.5"
                activeOpacity={0.7}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                ) : (
                  <Eye size={18} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Checklist Pills */}
          <View className="flex-row items-center flex-wrap gap-2 mb-6">
            <View
              className={`flex-row items-center px-2.5 py-1 rounded-full border ${
                password.length >= 6
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : isDarkMode
                  ? "bg-slate-800 border-slate-700"
                  : "bg-slate-100 border-slate-200"
              }`}
            >
              <CheckCircle2
                size={12}
                color={
                  password.length >= 6
                    ? "#10B981"
                    : isDarkMode
                    ? "#64748B"
                    : "#94A3B8"
                }
              />
              <ThemedText
                className={`text-[11px] font-semibold ml-1.5 ${
                  password.length >= 6
                    ? "text-emerald-500"
                    : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                At least 6 characters
              </ThemedText>
            </View>

            {confirmPassword.length > 0 && (
              <View
                className={`flex-row items-center px-2.5 py-1 rounded-full border ${
                  password === confirmPassword
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-rose-500/10 border-rose-500/30"
                }`}
              >
                <CheckCircle2
                  size={12}
                  color={password === confirmPassword ? "#10B981" : "#F43F5E"}
                />
                <ThemedText
                  className={`text-[11px] font-semibold ml-1.5 ${
                    password === confirmPassword
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {password === confirmPassword
                    ? "Passwords match"
                    : "Passwords don't match"}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Action Button: Reset Password */}
          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.88}
            className="rounded-2xl overflow-hidden mb-4 shadow-lg shadow-blue-600/30"
            style={{ elevation: 5 }}
          >
            <LinearGradient
              colors={["#1D4ED8", "#2563EB", "#3B82F6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 items-center justify-center flex-row"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ThemedText className="text-white text-base font-black tracking-wide mr-2">
                    Reset & Sign In
                  </ThemedText>
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Back to Login link */}
          <View className="flex-row items-center justify-center py-2">
            <ThemedText
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Remember your password?{" "}
            </ThemedText>
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.LoginScreen)}
              activeOpacity={0.7}
            >
              <ThemedText className="text-xs font-bold text-blue-500 dark:text-blue-400">
                Sign In
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

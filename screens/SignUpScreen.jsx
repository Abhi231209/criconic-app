import React, { useState, useEffect, useRef } from "react";
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
  User as UserIcon,
  CheckCircle2,
  KeyRound,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import AppKeyboardAwareScrollView from "@/components/ui/custom/AppKeyboardAwareScrollView";
import { useNavigation } from "@react-navigation/native";
import SCREENS from "@/screens";
import { useDispatch } from "react-redux";
import { login as loginAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import User from "@/utils/User";
import analytics from "@/utils/analytics";
import { showGlobalAlert } from "@/contexts/AlertContext";

const { height } = Dimensions.get("window");

function generateValidationID(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let validationID = "";
  for (let i = 0; i < length; i++) {
    validationID += chars[Math.floor(Math.random() * chars.length)];
  }
  return validationID;
}

export default function SignUpScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification States matching sports-arena web project
  const [validationId, setValidationId] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpGenerated, setIsOtpGenerated] = useState(false);
  const [isPhoneValidated, setIsPhoneValidated] = useState(false);
  const [isOtpBypass, setIsOtpBypass] = useState(false);
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);
  const [isValidatingOtp, setIsValidatingOtp] = useState(false);
  const [timerCount, setTimerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef(null);

  const handleResetPhone = () => {
    setIsPhoneValidated(false);
    setIsOtpGenerated(false);
    setIsOtpBypass(false);
    setOtp("");
    setValidationId("");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      setTimerCount(0);
    }
  };

  // Reset verification state when mobile changes
  useEffect(() => {
    setIsOtpGenerated(false);
    setIsPhoneValidated(false);
    setIsOtpBypass(false);
    setOtp("");
    setValidationId("");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      setTimerCount(0);
    }
  }, [mobile]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendTimer = (seconds = 60) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerCount(seconds);
    timerRef.current = setInterval(() => {
      setTimerCount((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sanitizeMobileNumber = (rawInput) => {
    const digitsOnly = rawInput.replace(/\D/g, "");
    if (digitsOnly.length > 10) {
      return digitsOnly.slice(-10);
    }
    return digitsOnly;
  };

  const handleGenerateOtp = async () => {
    const trimmedMobile = mobile.trim();
    if (!trimmedMobile || trimmedMobile.length !== 10) {
      showGlobalAlert({
        title: "Mobile Required",
        message: "Please enter a valid 10-digit mobile number.",
        type: "warning",
      });
      return;
    }

    setIsGeneratingOtp(true);
    const newValidationId = generateValidationID(8);
    setValidationId(newValidationId);

    try {
      const res = await authApi.generateOtp({
        mobile: trimmedMobile,
        validationId: newValidationId,
        type: "sign-up",
      });

      if (res?.data?.success) {
        setIsOtpGenerated(true);
        startResendTimer(60);
        analytics.logAction("otp_requested", "authentication", {
          is_bypass: !!res.data.isOTPByPass,
        });

        if (res.data.isOTPByPass) {
          setIsOtpBypass(true);
          setIsPhoneValidated(true);
          showGlobalAlert({
            title: "Verified",
            message: res.data.message || "Mobile number verified successfully!",
            type: "success",
          });
        } else {
          showGlobalAlert({
            title: "OTP Sent",
            message: res.data.message || "OTP has been sent to your mobile number.",
            type: "info",
          });
        }
      } else {
        analytics.logAction("otp_request_failed", "authentication", {
          reason: res?.data?.message || "Failed to generate OTP",
        });
        showGlobalAlert({
          title: "Notice",
          message: res?.data?.message || "Failed to generate OTP. Please try again.",
          type: "warning",
        });
      }
    } catch (err) {
      analytics.logAction("otp_request_failed", "authentication", {
        reason: err?.response?.data?.message || "Network error",
      });
      showGlobalAlert({
        title: "Error",
        message: err?.response?.data?.message || "Failed to send OTP.",
        type: "error",
      });
    } finally {
      setIsGeneratingOtp(false);
    }
  };

  const handleValidateOtp = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      showGlobalAlert({
        title: "OTP Required",
        message: "Please enter the OTP sent to your phone.",
        type: "warning",
      });
      return;
    }

    setIsValidatingOtp(true);
    try {
      const res = await authApi.validateOtp({
        mobile: mobile.trim(),
        validationId,
        otp: trimmedOtp,
      });

      if (res?.data?.success) {
        setIsPhoneValidated(true);
        analytics.logAction("otp_verified", "authentication", { success: true });
        showGlobalAlert({
          title: "Success",
          message: res.data.message || "Mobile number verified successfully!",
          type: "success",
        });
      } else {
        analytics.logAction("otp_verification_failed", "authentication", {
          reason: res?.data?.message || "Invalid OTP",
        });
        showGlobalAlert({
          title: "Verification Failed",
          message: res?.data?.message || "Invalid OTP entered.",
          type: "error",
        });
      }
    } catch (err) {
      analytics.logAction("otp_verification_failed", "authentication", {
        reason: err?.response?.data?.message || "Validation error",
      });
      showGlobalAlert({
        title: "Error",
        message: err?.response?.data?.message || "OTP validation failed.",
        type: "error",
      });
    } finally {
      setIsValidatingOtp(false);
    }
  };

  const handleSignUp = async () => {
    const trimmedName = username.trim();
    const trimmedMobile = mobile.trim();
    const trimmedPass = password.trim();

    if (!trimmedName || trimmedName.length < 2) {
      showGlobalAlert({
        title: "Required",
        message: "Please enter your full name (at least 2 characters).",
        type: "warning",
      });
      return;
    }

    if (!trimmedMobile || trimmedMobile.length !== 10) {
      showGlobalAlert({
        title: "Required",
        message: "Please enter a valid 10-digit mobile number.",
        type: "warning",
      });
      return;
    }

    if (!isPhoneValidated && !isOtpBypass) {
      showGlobalAlert({
        title: "Mobile Verification Required",
        message: "Please verify your mobile number with the OTP first.",
        type: "warning",
      });
      return;
    }

    if (!trimmedPass || trimmedPass.length < 6) {
      showGlobalAlert({
        title: "Weak Password",
        message: "Password must be at least 6 characters long.",
        type: "warning",
      });
      return;
    }

    if (trimmedPass !== confirmPassword.trim()) {
      showGlobalAlert({
        title: "Password Mismatch",
        message: "Password and Confirm Password do not match.",
        type: "warning",
      });
      return;
    }

    setIsLoading(true);
    analytics.logAction("sign_up_attempt", "authentication", { method: "phone_otp" });
    try {
      const payload = {
        username: trimmedName,
        mobile: trimmedMobile,
        password: trimmedPass,
        validationId: validationId || generateValidationID(8),
        otp: isOtpBypass ? "000000" : otp.trim(),
        role: 6,
      };

      const res = await authApi.signup(payload);

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        const registeredUser = res?.data?.user;
        const uid = registeredUser?._id || registeredUser?.id;
        analytics.logSignUp("phone_otp", uid);

        // Auto sign-in after registration
        try {
          const loginRes = await authApi.login({
            mobile: trimmedMobile,
            password: trimmedPass,
          });
          const user = loginRes?.data?.user || registeredUser;
          if (user) {
            dispatch(loginAction(user));
            User.login(user);
          }
          showGlobalAlert({
            title: "Success",
            message: "Account created successfully! Welcome to Criconic.",
            type: "success",
            confirmText: "Continue",
            onConfirm: () => navigation.replace(SCREENS.Home),
          });
        } catch {
          showGlobalAlert({
            title: "Account Created",
            message: "Registration successful! Please sign in with your credentials.",
            type: "success",
            confirmText: "Sign In",
            onConfirm: () => navigation.navigate(SCREENS.LoginScreen),
          });
        }
      } else {
        const errorMsg =
          res?.data?.message ||
          (Array.isArray(res?.data?.error)
            ? res.data.error.map((e) => e.message || e).join("\n")
            : "Registration failed. Please check your details.");
        analytics.logAction("sign_up_failed", "authentication", { reason: errorMsg });
        showGlobalAlert({
          title: "Registration Failed",
          message: errorMsg,
          type: "error",
          confirmText: "Change Number",
          onConfirm: () => handleResetPhone(),
        });
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.error)
          ? err.response.data.error.map((e) => e.message || e).join("\n")
          : err.message || "An unexpected error occurred.");
      analytics.logAction("sign_up_failed", "authentication", { reason: errorMsg });
      showGlobalAlert({
        title: "Registration Error",
        message: errorMsg,
        type: "error",
        confirmText: "Change Number",
        onConfirm: () => handleResetPhone(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? "bg-gray-950" : "bg-slate-900"}`}>
      <AppKeyboardAwareScrollView
        extraHeight={80}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Upper Hero Section */}
        <View
          style={{ minHeight: Math.max(height * 0.28, 200), width: "100%" }}
          className="relative overflow-hidden justify-center items-center"
        >
          <ImageBackground
            source={require("../assets/stadium-background-image.jpg")}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={
              isDarkMode
                ? ["rgba(15,23,42,0.65)", "rgba(30,27,75,0.85)", "rgba(15,23,42,0.98)"]
                : ["rgba(30,58,138,0.7)", "rgba(37,99,235,0.82)", "rgba(29,78,216,0.96)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0 items-center justify-center px-6 pt-4 pb-10"
          >
            <View className="items-center z-10">
              <View className="p-2 rounded-2xl bg-white/15 backdrop-blur-md items-center justify-center mb-2 border border-white/25 shadow-lg">
                <Image
                  source={require("../assets/Logo.png")}
                  className="w-28 h-9"
                  resizeMode="contain"
                />
              </View>
              <ThemedText className="text-white text-xl font-black tracking-wider">
                CRICONIC
              </ThemedText>
              <ThemedText className="text-blue-200 text-xs font-medium tracking-wide mt-0.5 text-center">
                Create Your Account
              </ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Sign Up Form Container */}
        <View
          className={`flex-1 -mt-6 px-6 pt-7 pb-10 rounded-t-3xl border-t ${
            isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: isDarkMode ? 0.35 : 0.08,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          {/* Header Title */}
          <View className="mb-5">
            <ThemedText className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Join Criconic
            </ThemedText>
            <ThemedText className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Sign up to score matches, manage squads & tournaments
            </ThemedText>
          </View>

          {/* Full Name / Username */}
          <View className="mb-3.5">
            <ThemedText className={`text-xs font-semibold mb-1.5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              User Name / Full Name
            </ThemedText>
            <View
              className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
              }`}
            >
              <UserIcon size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
              <TextInput
                className={`flex-1 ml-3 text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your full name"
                placeholderTextColor={isDarkMode ? "#6B7280" : "#94A3B8"}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Mobile Number Field + Generate OTP */}
          <View className="mb-3.5">
            <View className="flex-row justify-between items-center mb-1.5">
              <ThemedText className={`text-xs font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                Mobile Number
              </ThemedText>
              {isPhoneValidated ? (
                <View className="flex-row items-center">
                  <CheckCircle2 size={14} color="#10B981" />
                  <ThemedText className="text-xs font-bold text-emerald-500 ml-1 mr-2">
                    Verified
                  </ThemedText>
                  <TouchableOpacity
                    onPress={handleResetPhone}
                    activeOpacity={0.7}
                    className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30"
                  >
                    <ThemedText className="text-[11px] font-semibold text-blue-500">
                      Change
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <View
              className={`flex-row items-center px-3.5 py-1.5 rounded-xl border ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
              }`}
            >
              <Phone size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
              <TextInput
                className={`flex-1 ml-3 text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                value={mobile}
                onChangeText={(text) => setMobile(sanitizeMobileNumber(text))}
                placeholder="10-digit mobile number"
                placeholderTextColor={isDarkMode ? "#6B7280" : "#94A3B8"}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!isPhoneValidated}
              />
              {isPhoneValidated ? (
                <TouchableOpacity
                  onPress={handleResetPhone}
                  activeOpacity={0.7}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30"
                >
                  <ThemedText className="text-xs font-bold text-blue-500">
                    Change
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleGenerateOtp}
                  disabled={isGeneratingOtp || mobile.length !== 10 || timerCount > 0}
                  className={`px-3 py-1.5 rounded-lg ${
                    mobile.length === 10 && timerCount === 0
                      ? "bg-blue-600"
                      : "bg-gray-400 opacity-60"
                  }`}
                  activeOpacity={0.8}
                >
                  {isGeneratingOtp ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText className="text-white text-xs font-bold">
                      {timerCount > 0 ? `${timerCount}s` : isOtpGenerated ? "Resend OTP" : "Get OTP"}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* OTP Verification Input (When OTP is generated and not yet validated) */}
          {isOtpGenerated && !isPhoneValidated && !isOtpBypass && (
            <View className="mb-3.5 p-3 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <ThemedText className={`text-xs font-semibold mb-1.5 ${isDarkMode ? "text-blue-300" : "text-blue-900"}`}>
                Enter Verification OTP
              </ThemedText>
              <View className="flex-row items-center">
                <View
                  className={`flex-1 flex-row items-center px-3.5 py-2 rounded-xl border mr-2 ${
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}
                >
                  <KeyRound size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
                  <TextInput
                    className={`flex-1 ml-3 text-sm font-semibold tracking-widest ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="Enter OTP"
                    placeholderTextColor={isDarkMode ? "#6B7280" : "#94A3B8"}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleValidateOtp}
                  disabled={isValidatingOtp || otp.length < 4}
                  className={`px-4 py-2.5 rounded-xl ${
                    otp.length >= 4 ? "bg-emerald-600" : "bg-gray-400 opacity-60"
                  }`}
                  activeOpacity={0.8}
                >
                  {isValidatingOtp ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText className="text-white text-xs font-bold">Verify</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
              {timerCount > 0 ? (
                <ThemedText className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                  Resend OTP available in {timerCount} seconds
                </ThemedText>
              ) : (
                <TouchableOpacity onPress={handleGenerateOtp} className="mt-1.5">
                  <ThemedText className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    Didn't receive OTP? Resend now
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Password Field */}
          <View className="mb-3.5">
            <ThemedText className={`text-xs font-semibold mb-1.5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Password (at least 6 characters)
            </ThemedText>
            <View
              className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
              }`}
            >
              <Lock size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
              <TextInput
                className={`flex-1 ml-3 text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={isDarkMode ? "#6B7280" : "#94A3B8"}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                {showPassword ? (
                  <EyeOff size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
                ) : (
                  <Eye size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Field */}
          <View className="mb-6">
            <ThemedText className={`text-xs font-semibold mb-1.5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Confirm Password
            </ThemedText>
            <View
              className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
              }`}
            >
              <Lock size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
              <TextInput
                className={`flex-1 ml-3 text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor={isDarkMode ? "#6B7280" : "#94A3B8"}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
                {showConfirmPassword ? (
                  <EyeOff size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
                ) : (
                  <Eye size={18} color={isDarkMode ? "#9CA3AF" : "#64748B"} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Submit Button */}
          <TouchableOpacity
            onPress={handleSignUp}
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
                  Create Account
                </ThemedText>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Continue as Guest */}
          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.Home)}
            activeOpacity={0.7}
            className={`py-3 rounded-xl border items-center justify-center mb-5 ${
              isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
            }`}
          >
            <ThemedText className={`text-xs font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Explore as Guest
            </ThemedText>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View className="flex-row justify-center items-center mt-auto">
            <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Already have an account?{" "}
            </ThemedText>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.LoginScreen)} activeOpacity={0.7}>
              <ThemedText className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Sign In
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </AppKeyboardAwareScrollView>
    </SafeAreaView>
  );
}

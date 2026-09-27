import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Check,
  ShieldCheck,
  Pencil,
  RotateCcw,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { BASE_URL as API_URL } from "@/config";
import { showGlobalAlert } from "@/contexts/AlertContext";
import useAppTheme from "@/hooks/useAppTheme";
import CriconicLogo from "@/components/ui/custom/CriconicLogo";
import SCREENS from "@/screens";

const { height } = Dimensions.get("window");

const STEP_MOBILE = "mobile";
const STEP_OTP = "otp";
const STEP_PASSWORD = "password";

const sanitizeMobileNumber = (val) => {
  if (!val) return "";
  let digits = String(val).replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits;
};

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const colorScheme = useColorScheme();
  const isDarkMode = typeof isDark === "boolean" ? isDark : colorScheme === "dark";

  const [step, setStep] = useState(STEP_MOBILE);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [validationId, setValidationId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendTimer]);

  const handleBack = () => {
    if (step === STEP_PASSWORD) {
      setStep(STEP_OTP);
    } else if (step === STEP_OTP) {
      setStep(STEP_MOBILE);
    } else {
      navigation.goBack();
    }
  };

  const sendOtp = async (isResend = false) => {
    const cleanedMobile = sanitizeMobileNumber(mobile);
    if (!cleanedMobile) {
      showGlobalAlert({
        title: "Mobile Number Required",
        message: "Please enter your registered 10-digit mobile number.",
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

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/otpVerification/generateOTP`, {
        mobile: cleanedMobile,
        validationId: validationId || "",
        checkUserExists: true,
      });

      if (res.data?.success !== false) {
        setValidationId(res.data?.validationId || validationId || "");
        setResendTimer(30);
        if (isResend) {
          showGlobalAlert({
            title: "OTP Resent",
            message: `A fresh 6-digit OTP has been sent to +91 ${cleanedMobile}.`,
            type: "success",
          });
        } else {
          setStep(STEP_OTP);
        }
      } else {
        showGlobalAlert({
          title: "Unable to Send OTP",
          message: res.data?.message || "Could not send OTP. Please check your mobile number.",
          type: "error",
        });
      }
    } catch (err) {
      showGlobalAlert({
        title: "Error Sending OTP",
        message:
          err.response?.data?.message ||
          "Could not send OTP. Please check your internet connection and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      showGlobalAlert({
        title: "OTP Required",
        message: "Please enter the 6-digit OTP sent to your mobile.",
        type: "warning",
      });
      return;
    }
    if (trimmedOtp.length < 4) {
      showGlobalAlert({
        title: "Incomplete OTP",
        message: "Please enter the complete OTP code.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/otpVerification/validateOtp`, {
        mobile: sanitizeMobileNumber(mobile),
        otp: trimmedOtp,
        validationId,
      });

      if (res.data?.success !== false) {
        setStep(STEP_PASSWORD);
      } else {
        showGlobalAlert({
          title: "Invalid OTP",
          message: res.data?.message || "The OTP entered is incorrect. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      showGlobalAlert({
        title: "Verification Failed",
        message:
          err.response?.data?.message || "OTP verification failed. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
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
      const res = await axios.post(`${API_URL}api/users/forgotPassword`, {
        mobile: sanitizeMobileNumber(mobile),
        password,
        otp: otp.trim(),
        validationId,
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

  const currentStepIndex =
    step === STEP_MOBILE ? 0 : step === STEP_OTP ? 1 : 2;

  const STEPS = [
    { key: STEP_MOBILE, label: "Mobile" },
    { key: STEP_OTP, label: "Verify" },
    { key: STEP_PASSWORD, label: "Password" },
  ];

  return (
    <View
      className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? "#020617" : "#FFFFFF",
        }}
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
        }}
      >
        {/* Upper Hero Section */}
        <View
          style={{
            minHeight: Math.max(height * 0.30, 220) + (insets.top || 0),
            width: "100%",
          }}
          className="relative overflow-hidden justify-center items-center"
        >
          <ImageBackground
            source={require("../../../assets/stadium-background-image.jpg")}
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
            className="absolute inset-0 px-6 pb-10 justify-between"
            style={{ paddingTop: Math.max(insets.top + 8, 20) }}
          >
            {/* Ambient Background Glow Circles */}
            <View className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-blue-400/10 blur-xl" />
            <View className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-400/15 blur-xl" />

            {/* Top Navigation Row: Back Button & Step pill */}
            <View className="flex-row items-center justify-between z-20">
              <TouchableOpacity
                onPress={handleBack}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full items-center justify-center bg-white/15 border border-white/25 active:bg-white/25"
              >
                <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>

              <View className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
                <ThemedText className="text-blue-100 text-[11px] font-semibold tracking-wide">
                  Account Recovery
                </ThemedText>
              </View>
            </View>

            {/* Logo Center */}
            <View className="items-center z-10 my-2">
              <View className="mb-1">
                <CriconicLogo
                  variant="stacked"
                  theme="dark"
                  width={130}
                  height={82}
                />
              </View>
              <ThemedText className="text-blue-200 text-xs font-medium tracking-wide">
                Secure Account Access
              </ThemedText>
            </View>

            {/* Stepper Progress Bar */}
            <View className="flex-row items-center justify-center px-4 z-10">
              {STEPS.map((s, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isActive = idx === currentStepIndex;

                return (
                  <React.Fragment key={s.key}>
                    {/* Step Node */}
                    <View className="items-center">
                      <View
                        className={`w-7 h-7 rounded-full items-center justify-center ${
                          isCompleted
                            ? "bg-emerald-500"
                            : isActive
                            ? "bg-blue-500 border-2 border-white shadow-md shadow-blue-500/50"
                            : "bg-white/20 border border-white/30"
                        }`}
                      >
                        {isCompleted ? (
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        ) : (
                          <ThemedText
                            className={`text-xs font-black ${
                              isActive ? "text-white" : "text-white/70"
                            }`}
                          >
                            {idx + 1}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText
                        className={`text-[10px] font-bold mt-1 ${
                          isActive
                            ? "text-white"
                            : isCompleted
                            ? "text-emerald-300"
                            : "text-white/60"
                        }`}
                      >
                        {s.label}
                      </ThemedText>
                    </View>

                    {/* Connecting Line */}
                    {idx < STEPS.length - 1 && (
                      <View
                        className={`flex-1 h-[2px] mx-2 -mt-3.5 ${
                          idx < currentStepIndex
                            ? "bg-emerald-400"
                            : "bg-white/20"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
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
          {/* STEP 1: MOBILE NUMBER */}
          {step === STEP_MOBILE && (
            <View>
              {/* Header Title */}
              <View className="mb-6">
                <ThemedText
                  className={`text-2xl font-black tracking-tight ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Forgot Password? 🔐
                </ThemedText>
                <ThemedText
                  className={`text-xs mt-1.5 leading-5 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Enter your registered mobile number and we'll send a 6-digit OTP code to verify your identity.
                </ThemedText>
              </View>

              {/* Mobile Input */}
              <View className="mb-6">
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
                    onChangeText={(val) => setMobile(sanitizeMobileNumber(val))}
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

              {/* Action Button: Send OTP */}
              <TouchableOpacity
                onPress={() => sendOtp(false)}
                disabled={loading}
                activeOpacity={0.88}
                className="rounded-2xl overflow-hidden mb-5 shadow-lg shadow-blue-600/30"
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
                        Get Verification OTP
                      </ThemedText>
                      <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === STEP_OTP && (
            <View>
              {/* Header Title */}
              <View className="mb-5">
                <ThemedText
                  className={`text-2xl font-black tracking-tight ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Verify OTP 🛡️
                </ThemedText>
                <ThemedText
                  className={`text-xs mt-1.5 leading-5 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  We have sent a 6-digit OTP code to{" "}
                  <ThemedText className="font-bold text-blue-500">
                    +91 {mobile}
                  </ThemedText>
                  .
                </ThemedText>

                {/* Edit Mobile Number Chip */}
                <TouchableOpacity
                  onPress={() => setStep(STEP_MOBILE)}
                  activeOpacity={0.7}
                  className="flex-row items-center mt-2.5 self-start px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/25"
                >
                  <Pencil size={12} color="#3B82F6" />
                  <ThemedText className="text-xs font-semibold text-blue-500 ml-1.5">
                    Change Mobile Number
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* OTP Input */}
              <View className="mb-5">
                <ThemedText
                  className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                    isDarkMode ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  Enter 6-Digit OTP
                </ThemedText>

                <View
                  className={`flex-row items-center px-4 rounded-2xl border transition-colors ${
                    focusedField === "otp"
                      ? isDarkMode
                        ? "border-blue-500 bg-slate-800/90"
                        : "border-blue-600 bg-blue-50/20"
                      : isDarkMode
                      ? "bg-slate-800/60 border-slate-700/80"
                      : "bg-slate-50 border-slate-200"
                  }`}
                  style={{ minHeight: 56 }}
                >
                  <KeyRound
                    size={20}
                    color={
                      focusedField === "otp"
                        ? "#3B82F6"
                        : isDarkMode
                        ? "#94A3B8"
                        : "#64748B"
                    }
                  />

                  <TextInput
                    className={`flex-1 text-center text-xl font-black tracking-[8px] ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                    value={otp}
                    onChangeText={setOtp}
                    onFocus={() => setFocusedField("otp")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••"
                    placeholderTextColor={
                      isDarkMode ? "#475569" : "#CBD5E1"
                    }
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              {/* Action Button: Verify OTP */}
              <TouchableOpacity
                onPress={verifyOtp}
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
                        Verify Code
                      </ThemedText>
                      <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend OTP Section */}
              <View className="flex-row items-center justify-center py-2">
                <ThemedText
                  className={`text-xs ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Didn't receive code?{" "}
                </ThemedText>
                {resendTimer > 0 ? (
                  <ThemedText className="text-xs font-bold text-slate-400">
                    Resend in {resendTimer}s
                  </ThemedText>
                ) : (
                  <TouchableOpacity
                    onPress={() => sendOtp(true)}
                    activeOpacity={0.7}
                    className="flex-row items-center"
                  >
                    <RotateCcw size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                    <ThemedText className="text-xs font-bold text-blue-500 dark:text-blue-400">
                      Resend OTP
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === STEP_PASSWORD && (
            <View>
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
                  Your identity has been verified. Set a new password with at least 6 characters.
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
                    placeholderTextColor={
                      isDarkMode ? "#64748B" : "#94A3B8"
                    }
                  />

                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    className="p-1.5"
                    activeOpacity={0.7}
                  >
                    {showConfirmPassword ? (
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
                onPress={resetPassword}
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
                        Reset Password
                      </ThemedText>
                      <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Divider */}
          <View className="flex-row items-center my-4">
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

          {/* Bottom Return to Sign In Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.LoginScreen)}
            activeOpacity={0.7}
            className="flex-row items-center justify-center py-2"
          >
            <ThemedText
              className={`text-xs font-medium ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Remember your password?{" "}
            </ThemedText>
            <ThemedText className="text-xs font-black text-blue-500 dark:text-blue-400">
              Sign In
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

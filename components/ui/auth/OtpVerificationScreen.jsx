import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  ScrollView,
  AppState,
  Keyboard,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  RotateCcw,
  ClipboardPaste,
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

export default function OtpVerificationScreen({ route, navigation: propNavigation }) {
  const navigation = propNavigation || navigationRef;
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const colorScheme = useColorScheme();
  const isDarkMode = typeof isDark === "boolean" ? isDark : colorScheme === "dark";

  const { mobile = "", validationId: initialValidationId = "" } =
    route?.params || {};

  const [otp, setOtp] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const [validationId, setValidationId] = useState(initialValidationId);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [clipboardCode, setClipboardCode] = useState("");

  const textInputRef = useRef(null);
  const validationIdRef = useRef(initialValidationId);
  const timerRef = useRef(null);

  useEffect(() => {
    validationIdRef.current = initialValidationId;
    setValidationId(initialValidationId);
  }, [initialValidationId]);

  // Focus input automatically on mount
  useEffect(() => {
    const focusTimeout = setTimeout(() => {
      textInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(focusTimeout);
  }, []);

  // Resend Countdown Timer
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

  const verifyOtp = useCallback(
    async (codeToVerify) => {
      Keyboard.dismiss();
      const currentValidationId = validationIdRef.current || validationId;
      const fullCode = (
        typeof codeToVerify === "string" ? codeToVerify : otp
      ).replace(/\D/g, "").slice(0, 6);

      if (!fullCode || fullCode.length !== 6) {
        showGlobalAlert({
          title: "Incomplete Code",
          message: "Please enter all 6 digits of the verification code.",
          type: "warning",
        });
        textInputRef.current?.focus();
        return;
      }

      setLoading(true);
      try {
        console.log("🔐 [OtpVerification] Verifying OTP:", fullCode, "valId:", currentValidationId);
        const res = await axios.post(`${API_URL}api/otpVerification/validateOtp`, {
          mobile,
          otp: fullCode,
          validationId: currentValidationId,
        });

        console.log("🔐 [OtpVerification] Validate response:", res.data);

        if (res.data?.success) {
          console.log("🔐 [OtpVerification] Verified! Navigating to ResetPasswordScreen...");
          const navTarget = navigation?.navigate
            ? navigation
            : navigationRef;

          if (navTarget?.navigate) {
            navTarget.navigate(SCREENS.ResetPasswordScreen, {
              mobile,
              otp: fullCode,
              validationId: currentValidationId,
            });
          }
        } else {
          showGlobalAlert({
            title: "Invalid Code",
            message: res.data?.message || "The code entered is incorrect. Please try again.",
            type: "error",
          });
        }
      } catch (err) {
        console.error("🔐 [OtpVerification] Error verifying OTP:", err?.response?.data || err.message);
        showGlobalAlert({
          title: "Verification Failed",
          message:
            err.response?.data?.message || "Verification failed. Please check the code and try again.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [mobile, otp, validationId, navigation]
  );

  const handleOtpChange = (text) => {
    const cleanDigits = String(text).replace(/\D/g, "").slice(0, 6);
    setOtp(cleanDigits);
    if (cleanDigits.length === 6) {
      verifyOtp(cleanDigits);
    }
  };

  // Background clipboard auto-detection
  const checkClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        const match = text.match(/\b\d{6}\b/);
        if (match && match[0]) {
          const code = match[0];
          setClipboardCode(code);
        } else {
          setClipboardCode("");
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    checkClipboard();
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkClipboard();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkClipboard]);

  const resendOtp = async () => {
    setLoading(true);
    try {
      console.log("📱 [OtpVerification] Resending OTP for:", mobile);
      const res = await axios.post(`${API_URL}api/otpVerification/generateOTP`, {
        mobile,
        validationId: validationIdRef.current || validationId || "",
        checkUserExists: true,
        isResend: true,
      });

      if (res.data?.success !== false) {
        const receivedValidationId =
          res.data?.validationId || validationIdRef.current || validationId || "";
        setValidationId(receivedValidationId);
        validationIdRef.current = receivedValidationId;
        setResendTimer(30);
        setOtp("");
        textInputRef.current?.focus();

        showGlobalAlert({
          title: "Code Resent",
          message: `A fresh 6-digit verification code has been sent to +91 ${mobile}.`,
          type: "success",
        });
      } else {
        showGlobalAlert({
          title: "Unable to Resend",
          message: res.data?.message || "Could not resend verification code. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      showGlobalAlert({
        title: "Error",
        message: err.response?.data?.message || "Could not resend code. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Upper Hero Section */}
        <View
          style={{
            minHeight: Math.max(height * 0.28, 210) + (insets.top || 0),
            width: "100%",
          }}
          className="relative overflow-hidden justify-center items-center"
        >
          <ImageBackground
            source={require("../../../assets/stadium-background-image.jpg")}
            style={{ width: "100%", height: "100%" }}
            className="absolute inset-0"
            resizeMode="cover"
          >
            <LinearGradient
              colors={
                isDarkMode
                  ? ["rgba(2, 6, 23, 0.70)", "rgba(2, 6, 23, 0.96)"]
                  : ["rgba(15, 23, 42, 0.65)", "rgba(15, 23, 42, 0.92)"]
              }
              className="absolute inset-0"
            />
          </ImageBackground>

          {/* Top Bar with Back Button & Pill */}
          <View
            className="absolute top-0 left-0 right-0 z-20 flex-row items-center justify-between px-6"
            style={{ paddingTop: Math.max(insets.top + 8, 20) }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full items-center justify-center bg-white/15 border border-white/25 active:bg-white/25"
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <View className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
              <ThemedText className="text-blue-100 text-[11px] font-semibold tracking-wide">
                Security Verification
              </ThemedText>
            </View>
          </View>

          {/* Logo Center */}
          <View className="items-center z-10 mt-6">
            <CriconicLogo
              variant="stacked"
              theme="dark"
              width={130}
              height={82}
            />
            <ThemedText className="text-blue-200 text-xs font-medium tracking-wide mt-1">
              Secure Account Verification
            </ThemedText>
          </View>
        </View>

        {/* Modern Form Card */}
        <View
          className={`flex-1 -mt-6 px-6 pt-7 rounded-t-3xl border-t ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-100"
          }`}
          style={[
            {
              minHeight: Math.max(height * 0.62, 440),
              paddingBottom: Math.max((insets.bottom || 0) + 28, 40),
            },
            Platform.OS === "ios"
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: isDarkMode ? 0.35 : 0.06,
                  shadowRadius: 12,
                }
              : { elevation: 8 },
          ]}
        >
          {/* Header Title & Details */}
          <View className="mb-6">
            <ThemedText
              className={`text-2xl font-black tracking-tight ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Enter Verification Code 🔐
            </ThemedText>
            <View className="flex-row items-center flex-wrap mt-2">
              <ThemedText
                className={`text-xs ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                We've sent a 6-digit code to{" "}
              </ThemedText>
              <ThemedText
                className={`text-xs font-bold ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                +91 {mobile}
              </ThemedText>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                className="ml-2 flex-row items-center"
              >
                <ThemedText className="text-xs font-bold text-blue-500">
                  Edit
                </ThemedText>
                <Pencil size={11} color="#3B82F6" style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 6 Segmented Boxes with Native Autofill Input Overlay */}
          <View className="mb-5 relative">
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => textInputRef.current?.focus()}
              className="flex-row items-center justify-between"
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const char = otp[index] || "";
                const isCurrent = isFocused && (index === otp.length || (index === 5 && otp.length === 6));
                const isFilled = Boolean(char);

                return (
                  <View
                    key={index}
                    className={`flex-1 mx-1 rounded-2xl items-center justify-center border-2 transition-all ${
                      isCurrent
                        ? isDarkMode
                          ? "border-blue-500 bg-blue-500/15"
                          : "border-blue-600 bg-blue-50/50"
                        : isFilled
                        ? isDarkMode
                          ? "border-blue-500/50 bg-slate-800"
                          : "border-blue-600/40 bg-blue-50/20"
                        : isDarkMode
                        ? "border-slate-800 bg-slate-800/40"
                        : "border-slate-200 bg-slate-50"
                    }`}
                    style={{
                      height: 58,
                      maxWidth: 50,
                    }}
                  >
                    <ThemedText
                      className={`text-2xl font-black text-center ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                      style={{ includeFontPadding: false }}
                    >
                      {char}
                    </ThemedText>
                  </View>
                );
              })}
            </TouchableOpacity>

            {/* Single native input receiving keystrokes and system SMS autofill */}
            <TextInput
              ref={textInputRef}
              value={otp}
              onChangeText={handleOtpChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              importantForAutofill="yes"
              caretHidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.01,
              }}
            />
          </View>

          {/* Quick Clipboard Paste Chip (if 6-digit code exists in clipboard) */}
          {clipboardCode && clipboardCode !== otp ? (
            <TouchableOpacity
              onPress={() => handleOtpChange(clipboardCode)}
              activeOpacity={0.7}
              className="flex-row items-center self-center px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 mb-4"
            >
              <ClipboardPaste size={13} color="#3B82F6" />
              <ThemedText className="text-xs font-bold text-blue-500 ml-1.5">
                Paste "{clipboardCode}" from SMS
              </ThemedText>
            </TouchableOpacity>
          ) : null}

          {/* Action Button: Verify & Proceed */}
          <TouchableOpacity
            onPress={() => {
              if (otp.length !== 6) {
                showGlobalAlert({
                  title: "Incomplete Code",
                  message: "Please enter all 6 digits of your verification code.",
                  type: "warning",
                });
                textInputRef.current?.focus();
                return;
              }
              verifyOtp(otp);
            }}
            disabled={loading}
            activeOpacity={0.85}
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
                    Verify & Proceed
                  </ThemedText>
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend Code Section */}
          <View className="flex-row items-center justify-center py-2">
            <ThemedText
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Didn't receive the code?{" "}
            </ThemedText>
            {resendTimer > 0 ? (
              <ThemedText className="text-xs font-semibold text-slate-400">
                Resend in {resendTimer}s
              </ThemedText>
            ) : (
              <TouchableOpacity
                onPress={resendOtp}
                activeOpacity={0.7}
                className="flex-row items-center"
              >
                <RotateCcw size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                <ThemedText className="text-xs font-bold text-blue-500 dark:text-blue-400">
                  Resend Code
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

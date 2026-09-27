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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  Pencil,
  RotateCcw,
  Copy,
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
  const [validationId, setValidationId] = useState(initialValidationId);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [autoReadHint, setAutoReadHint] = useState("");

  const validationIdRef = useRef(initialValidationId);
  const timerRef = useRef(null);

  useEffect(() => {
    validationIdRef.current = initialValidationId;
    setValidationId(initialValidationId);
  }, [initialValidationId]);

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
    async (inputOtp) => {
      Keyboard.dismiss();
      const currentValidationId = validationIdRef.current || validationId;
      const trimmedOtp = (typeof inputOtp === "string" ? inputOtp : otp).trim();

      if (!trimmedOtp) {
        showGlobalAlert({
          title: "OTP Required",
          message: "Please enter the 6-digit OTP sent to your mobile.",
          type: "warning",
        });
        return;
      }
      if (trimmedOtp.length !== 6) {
        showGlobalAlert({
          title: "Incomplete OTP",
          message: "Please enter the complete 6-digit OTP code.",
          type: "warning",
        });
        return;
      }

      setLoading(true);
      try {
        console.log("🔐 [OtpVerification] Verifying OTP:", trimmedOtp, "valId:", currentValidationId);
        const res = await axios.post(`${API_URL}api/otpVerification/validateOtp`, {
          mobile,
          otp: trimmedOtp,
          validationId: currentValidationId,
        });

        if (res.data?.success !== false) {
          // Navigate directly to Reset Password screen
          navigation.navigate(SCREENS.ResetPasswordScreen, {
            mobile,
            otp: trimmedOtp,
            validationId: currentValidationId,
          });
        } else {
          showGlobalAlert({
            title: "Invalid OTP",
            message: res.data?.message || "The OTP entered is incorrect. Please try again.",
            type: "error",
          });
        }
      } catch (err) {
        console.error("🔐 [OtpVerification] Error verifying OTP:", err?.response?.data || err.message);
        showGlobalAlert({
          title: "Verification Failed",
          message:
            err.response?.data?.message || "OTP verification failed. Please try again.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [mobile, otp, validationId, navigation]
  );

  const checkClipboardForOtp = useCallback(
    async (isManualTrigger = false) => {
      try {
        const text = await Clipboard.getStringAsync();
        if (text) {
          const match = text.match(/\b\d{6}\b/);
          if (match && match[0]) {
            const foundOtp = match[0];
            setOtp(foundOtp);
            setAutoReadHint(`Detected: ${foundOtp}`);
            if (isManualTrigger) {
              showGlobalAlert({
                title: "OTP Pasted",
                message: `Code ${foundOtp} detected from clipboard and filled.`,
                type: "success",
              });
            }
            return foundOtp;
          }
        }
        if (isManualTrigger) {
          showGlobalAlert({
            title: "No OTP Found",
            message: "No 6-digit code was found in your clipboard. Please check your SMS or enter the code manually.",
            type: "info",
          });
        }
      } catch (_) {
        if (isManualTrigger) {
          showGlobalAlert({
            title: "Clipboard Error",
            message: "Unable to read clipboard. Please enter the OTP manually.",
            type: "error",
          });
        }
      }
      return null;
    },
    []
  );

  // Auto-read on AppState active (returning from SMS app)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkClipboardForOtp(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkClipboardForOtp]);

  const handleOtpChange = (val) => {
    const cleanDigits = String(val).replace(/\D/g, "").slice(0, 6);
    setOtp(cleanDigits);
    if (cleanDigits.length === 6) {
      verifyOtp(cleanDigits);
    }
  };

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

        showGlobalAlert({
          title: "OTP Resent",
          message: `A fresh 6-digit OTP has been sent to +91 ${mobile}.`,
          type: "success",
        });
      } else {
        showGlobalAlert({
          title: "Unable to Resend OTP",
          message: res.data?.message || "Could not resend OTP. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      showGlobalAlert({
        title: "Error Sending OTP",
        message: err.response?.data?.message || "Could not send OTP. Please try again.",
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
            minHeight: Math.max(height * 0.28, 200) + (insets.top || 0),
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
            className="absolute inset-0 px-6 pb-8 justify-between"
            style={{ paddingTop: Math.max(insets.top + 8, 20) }}
          >
            {/* Top Navigation Row */}
            <View className="flex-row items-center justify-between z-20">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full items-center justify-center bg-white/15 border border-white/25 active:bg-white/25"
              >
                <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>

              <View className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
                <ThemedText className="text-blue-100 text-[11px] font-semibold tracking-wide">
                  Step 2 of 3 • Verification
                </ThemedText>
              </View>
            </View>

            {/* Logo Center */}
            <View className="items-center z-10 my-2">
              <View className="mb-1">
                <CriconicLogo
                  variant="stacked"
                  theme="dark"
                  width={120}
                  height={76}
                />
              </View>
              <ThemedText className="text-blue-200 text-xs font-medium tracking-wide">
                Secure Account Access
              </ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Form Card */}
        <View
          className={`flex-1 -mt-6 px-6 pt-7 rounded-t-3xl border-t ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-100"
          }`}
          style={{
            minHeight: Math.max(height * 0.68, 500),
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
              onPress={() => navigation.goBack()}
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
                className={`flex-1 text-center text-xl font-black ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
                style={{ letterSpacing: 6 }}
                value={otp}
                onChangeText={handleOtpChange}
                onFocus={() => setFocusedField("otp")}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••"
                placeholderTextColor={isDarkMode ? "#475569" : "#CBD5E1"}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
              />
            </View>

            {/* Auto-read / Paste OTP Action Row */}
            <View className="flex-row items-center justify-between mt-2.5 px-1">
              <TouchableOpacity
                onPress={() => checkClipboardForOtp(true)}
                activeOpacity={0.7}
                className="flex-row items-center px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25"
              >
                <Copy size={13} color="#3B82F6" />
                <ThemedText className="text-xs font-bold text-blue-500 ml-1.5">
                  Auto-Read / Paste OTP
                </ThemedText>
              </TouchableOpacity>

              {autoReadHint ? (
                <ThemedText className="text-[11px] font-semibold text-emerald-500">
                  {autoReadHint}
                </ThemedText>
              ) : (
                <ThemedText
                  className={`text-[11px] ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  SMS auto-fill ready
                </ThemedText>
              )}
            </View>
          </View>

          {/* Action Button: Verify OTP */}
          <TouchableOpacity
            onPress={() => verifyOtp(otp)}
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
                    Verify & Proceed
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
                onPress={resendOtp}
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
      </ScrollView>
    </View>
  );
}

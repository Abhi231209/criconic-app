import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, TextInput, TouchableOpacity, AppState, Keyboard } from "react-native";
import * as Clipboard from "expo-clipboard";
import { ClipboardPaste, RotateCcw } from "lucide-react-native";
import ThemedText from "@/components/ui/custom/ThemedText";
import { navigationRef } from "@/navigation/navigationRef";
import axios from "axios";
import { BASE_URL as API_URL } from "@/config";
import { showGlobalAlert } from "@/contexts/AlertContext";
import SCREENS from "@/screens";
import {
  BRAND,
  AuthScreen,
  AuthHeading,
  AuthButton,
  AuthTextLink,
  ResetSteps,
} from "@/components/ui/auth/AuthKit";

export default function OtpVerificationScreen({ route, navigation: propNavigation }) {
  const navigation = propNavigation || navigationRef;

  const { mobile = "", validationId: initialValidationId = "", resendTimeout = 60 } =
    route?.params || {};

  const [otp, setOtp] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const [validationId, setValidationId] = useState(initialValidationId);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(resendTimeout || 60);
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
        const newTimeout = res.data?.resendTimeout || 60;
        setResendTimer(newTimeout);
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
      const retryAfter = err.response?.data?.retryAfter;
      if (retryAfter && typeof retryAfter === "number") {
        setResendTimer(retryAfter);
      }
      showGlobalAlert({
        title: err.response?.status === 429 ? "Please Wait" : "Error",
        message:
          err.response?.data?.message ||
          "Could not resend code. Please wait before trying again.",
        type: err.response?.status === 429 ? "warning" : "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPress = () => {
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
  };

  return (
    <AuthScreen onBack={() => navigation.goBack()}>
      <ResetSteps current={1} />
      <AuthHeading
        title="Enter the"
        accent="6-digit code."
        subtitle={
          <View className="flex-row items-center flex-wrap">
            <ThemedText className="text-base font-medium" style={{ color: BRAND.slate }}>
              Sent to{" "}
            </ThemedText>
            <ThemedText className="text-base font-bold mr-3" style={{ color: BRAND.cream }}>
              +91 {mobile}
            </ThemedText>
            <AuthTextLink label="Change number" onPress={() => navigation.goBack()} />
          </View>
        }
      />

      {/* Six boxes drawn over one hidden input, so SMS autofill still works */}
      <View className="relative">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => textInputRef.current?.focus()}
          className="flex-row items-center justify-between"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const char = otp[index] || "";
            const isCurrent =
              isFocused && (index === otp.length || (index === 5 && otp.length === 6));
            return (
              <View
                key={index}
                className="flex-1 mx-1 rounded-2xl items-center justify-center border-2"
                style={{
                  height: 60,
                  maxWidth: 52,
                  borderColor: isCurrent ? BRAND.teal : char ? "rgba(77,214,199,0.35)" : BRAND.line,
                  backgroundColor: isCurrent ? BRAND.fieldFocus : BRAND.field,
                }}
              >
                <ThemedText
                  className="text-[26px] font-black text-center"
                  style={{ color: BRAND.cream, includeFontPadding: false }}
                >
                  {char}
                </ThemedText>
              </View>
            );
          })}
        </TouchableOpacity>

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
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01 }}
        />
      </View>

      {/* A 6-digit code is on the clipboard: offer to paste it */}
      {clipboardCode && clipboardCode !== otp ? (
        <TouchableOpacity
          onPress={() => handleOtpChange(clipboardCode)}
          activeOpacity={0.7}
          className="flex-row items-center self-center px-3.5 py-1.5 rounded-full border mt-4"
          style={{ borderColor: "rgba(77,214,199,0.35)", backgroundColor: BRAND.fieldFocus }}
        >
          <ClipboardPaste size={14} color={BRAND.teal} />
          <ThemedText className="text-sm font-bold ml-1.5" style={{ color: BRAND.teal }}>
            Paste {clipboardCode}
          </ThemedText>
        </TouchableOpacity>
      ) : null}

      <AuthButton label="Verify" onPress={handleVerifyPress} loading={loading} />

      <View className="flex-row items-center justify-center mt-5">
        <ThemedText className="text-base font-medium" style={{ color: BRAND.slate }}>
          Didn't get it?
        </ThemedText>
        {resendTimer > 0 ? (
          <ThemedText className="text-base font-bold ml-1.5" style={{ color: BRAND.placeholder }}>
            Resend in {resendTimer}s
          </ThemedText>
        ) : (
          <TouchableOpacity
            onPress={resendOtp}
            disabled={loading}
            activeOpacity={0.7}
            hitSlop={8}
            className="flex-row items-center ml-1.5"
          >
            <RotateCcw size={14} color={BRAND.teal} style={{ marginRight: 4 }} />
            <ThemedText className="text-base font-black" style={{ color: BRAND.teal }}>
              Resend code
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </AuthScreen>
  );
}

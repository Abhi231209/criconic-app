import React, { useRef, useState } from "react";
import { View, Keyboard } from "react-native";
import { Phone } from "lucide-react-native";
import { navigationRef } from "@/navigation/navigationRef";
import axios from "axios";
import { BASE_URL as API_URL } from "@/config";
import { showGlobalAlert } from "@/contexts/AlertContext";
import SCREENS from "@/screens";
import {
  AuthScreen,
  AuthHeading,
  AuthField,
  AuthButton,
  AuthFooterLink,
  ResetSteps,
} from "@/components/ui/auth/AuthKit";

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

// Step 1 of the password reset: send a code to the registered mobile. The
// code is checked on OtpVerificationScreen and the new password is set on
// ResetPasswordScreen.
export default function ForgotPasswordScreen({ navigation: propNavigation }) {
  const navigation = propNavigation || navigationRef;

  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const validationIdRef = useRef("");

  const sendOtp = async () => {
    Keyboard.dismiss();
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
        validationId: validationIdRef.current || "",
        checkUserExists: true,
      });

      if (res.data?.success !== false) {
        const receivedValidationId = res.data?.validationId || validationIdRef.current || "";
        validationIdRef.current = receivedValidationId;
        navigation.navigate(SCREENS.OtpVerificationScreen, {
          mobile: cleanedMobile,
          validationId: receivedValidationId,
          resendTimeout: res.data?.resendTimeout || 60,
        });
      } else {
        showGlobalAlert({
          title: "Unable to Send OTP",
          message: res.data?.message || "Could not send OTP. Please check your mobile number.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("📱 [ForgotPassword] Error sending OTP:", err?.response?.data || err.message);
      showGlobalAlert({
        title: err.response?.status === 429 ? "Please Wait" : "Error Sending OTP",
        message:
          err.response?.data?.message ||
          "Could not send OTP. Please check your internet connection and try again.",
        type: err.response?.status === 429 ? "warning" : "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen onBack={() => navigation.goBack()}>
      <ResetSteps current={0} />
      <AuthHeading
        title="Forgot your"
        accent="password?"
        subtitle="Enter the mobile number on your account and we'll text you a 6-digit code."
      />

      <AuthField
        className=""
        label="Mobile number"
        icon={Phone}
        prefix="+91"
        value={mobile}
        onChangeText={(val) => setMobile(sanitizeMobileNumber(val))}
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        maxLength={18}
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="send"
        onSubmitEditing={sendOtp}
        autoFocus
      />
      <AuthButton label="Send code" onPress={sendOtp} loading={loading} />

      <View className="flex-1" />
      <AuthFooterLink
        text="Remembered it?"
        linkText="Sign in"
        onPress={() => navigation.navigate(SCREENS.LoginScreen)}
      />
    </AuthScreen>
  );
}

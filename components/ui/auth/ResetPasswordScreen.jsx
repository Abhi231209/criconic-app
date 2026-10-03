import React, { useRef, useState } from "react";
import { View, Keyboard } from "react-native";
import { Lock } from "lucide-react-native";
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
  CheckChip,
} from "@/components/ui/auth/AuthKit";

export default function ResetPasswordScreen({ route, navigation: propNavigation }) {
  const navigation = propNavigation || navigationRef;

  const { mobile = "", otp = "", validationId = "" } = route?.params || {};

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const confirmInputRef = useRef(null);

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
    <AuthScreen onBack={() => navigation.goBack()}>
      <ResetSteps current={2} />
      <AuthHeading
        title="Set a new"
        accent="password."
        subtitle={`+91 ${mobile} is verified. Choose a password with at least 6 characters.`}
      />

      <AuthField
        className="mb-3"
        label="New password"
        icon={Lock}
        secure
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => confirmInputRef.current?.focus()}
        autoFocus
      />
      <AuthField
        ref={confirmInputRef}
        className="mb-3"
        label="Confirm password"
        icon={Lock}
        secure
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Type it again"
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleResetPassword}
      />

      <View className="flex-row flex-wrap">
        <CheckChip ok={password.length >= 6 || undefined} label="At least 6 characters" />
        {confirmPassword.length > 0 && (
          <CheckChip
            ok={password === confirmPassword}
            label={password === confirmPassword ? "Passwords match" : "Passwords don't match"}
          />
        )}
      </View>

      <AuthButton
        className="mt-4"
        label="Reset password"
        onPress={handleResetPassword}
        loading={loading}
      />

      <View className="flex-1" />
      <AuthFooterLink
        text="Remembered it?"
        linkText="Sign in"
        onPress={() => navigation.navigate(SCREENS.LoginScreen)}
      />
    </AuthScreen>
  );
}

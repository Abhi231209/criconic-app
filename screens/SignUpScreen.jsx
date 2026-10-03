import React, { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import { Lock, Phone, User as UserIcon, CheckCircle2, KeyRound } from "lucide-react-native";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useNavigation } from "@react-navigation/native";
import SCREENS from "@/screens";
import { useDispatch } from "react-redux";
import { login as loginAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import User from "@/utils/User";
import analytics from "@/utils/analytics";
import { showGlobalAlert } from "@/contexts/AlertContext";
import {
  BRAND,
  AuthScreen,
  GuestPill,
  AuthHeading,
  AuthField,
  FieldAction,
  AuthButton,
  AuthFooterLink,
  AuthTextLink,
} from "@/components/ui/auth/AuthKit";

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

  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const confirmPasswordInputRef = useRef(null);

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
    if (!rawInput) return "";
    let digitsOnly = String(rawInput).replace(/\D/g, "");
    if (digitsOnly.length > 10 && digitsOnly.startsWith("91")) {
      digitsOnly = digitsOnly.slice(2);
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
      digitsOnly = digitsOnly.slice(1);
    }
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
        const registeredUser = res?.data?.user || res?.data?.content;
        const uid = registeredUser?._id || registeredUser?.id;
        analytics.logSignUp("phone_otp", uid);

        // Build guaranteed user object from registration details
        let finalUser = {
          username: trimmedName,
          name: trimmedName,
          mobile: trimmedMobile,
          ...(registeredUser || {}),
        };

        // Auto sign-in after registration
        try {
          const loginRes = await authApi.login({
            mobile: trimmedMobile,
            password: trimmedPass,
          });
          if (loginRes?.data?.user) {
            finalUser = {
              ...finalUser,
              ...loginRes.data.user,
              // The token is next to `user` in the response, not inside it.
              access_token: loginRes.data.access_token,
            };
          }
        } catch (loginErr) {
          console.warn("[SignUp] Auto-login warning:", loginErr);
        }

        // Commit active user session in Redux and User singleton
        dispatch(loginAction(finalUser));
        User.login(finalUser);

        // Transition directly to CompleteProfile screen
        if (typeof navigation.replace === "function") {
          try {
            navigation.replace(SCREENS.CompleteProfile, { user: finalUser });
            return;
          } catch (navErr) {
            console.warn("[SignUp] navigation.replace fallback to navigate:", navErr);
          }
        }
        navigation.navigate(SCREENS.CompleteProfile, { user: finalUser });
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

  const needsOtp = isOtpGenerated && !isPhoneValidated && !isOtpBypass;

  return (
    <AuthScreen
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      topRight={<GuestPill onPress={() => navigation.navigate(SCREENS.Home)} />}
    >
      <AuthHeading
        className="mt-6 mb-5"
        title="Create your"
        accent="account."
        subtitle="Score matches, build squads and run tournaments. Your stats are always free to see."
      />

      <AuthField
        className="mb-3"
        label="Full name"
        icon={UserIcon}
        value={username}
        onChangeText={setUsername}
        placeholder="Your full name"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
      />

      {/* Mobile, verified by OTP before the account can be created */}
      <AuthField
        className="mb-3"
        label="Mobile number"
        labelRight={
          isPhoneValidated ? (
            <View className="flex-row items-center">
              <CheckCircle2 size={14} color={BRAND.success} />
              <ThemedText className="text-sm font-bold ml-1 mr-3" style={{ color: BRAND.success }}>
                Verified
              </ThemedText>
              <AuthTextLink label="Change" onPress={handleResetPhone} />
            </View>
          ) : null
        }
        icon={Phone}
        prefix="+91"
        value={mobile}
        onChangeText={(text) => setMobile(sanitizeMobileNumber(text))}
        placeholder="10-digit number"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={18}
        editable={!isPhoneValidated}
        right={
          isPhoneValidated ? null : (
            <FieldAction
              label={timerCount > 0 ? `${timerCount}s` : isOtpGenerated ? "Resend" : "Get OTP"}
              onPress={handleGenerateOtp}
              loading={isGeneratingOtp}
              disabled={mobile.length !== 10 || timerCount > 0}
            />
          )
        }
      />

      {needsOtp && (
        <AuthField
          className="mb-3"
          label="Code sent to your phone"
          labelRight={
            <AuthTextLink
              label={timerCount > 0 ? `Resend in ${timerCount}s` : "Resend code"}
              onPress={handleGenerateOtp}
              disabled={timerCount > 0 || isGeneratingOtp}
            />
          }
          icon={KeyRound}
          value={otp}
          onChangeText={setOtp}
          placeholder="6-digit code"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          right={
            <FieldAction
              label="Verify"
              onPress={handleValidateOtp}
              loading={isValidatingOtp}
              disabled={otp.length < 4}
            />
          }
        />
      )}

      <AuthField
        className="mb-3"
        label="Password"
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
        onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
      />
      <AuthField
        ref={confirmPasswordInputRef}
        className=""
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
        onSubmitEditing={handleSignUp}
      />

      <View className="flex-1 min-h-[8px]" />

      <AuthButton label="Create account" onPress={handleSignUp} loading={isLoading} />
      <AuthFooterLink
        text="Already have an account?"
        linkText="Sign in"
        onPress={() => navigation.navigate(SCREENS.LoginScreen)}
      />
    </AuthScreen>
  );
}

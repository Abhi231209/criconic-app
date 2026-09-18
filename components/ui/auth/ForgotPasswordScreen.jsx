import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { BASE_URL as API_URL } from "@/config";
import { showGlobalAlert } from "@/components/ui/custom/AppAlertModal";

const STEP_MOBILE = "mobile";
const STEP_OTP = "otp";
const STEP_PASSWORD = "password";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(STEP_MOBILE);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [validationId, setValidationId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    const cleanedMobile = mobile.replace(/\D/g, "");
    if (!cleanedMobile) {
      showGlobalAlert({
        title: "Required",
        message: "Enter your registered 10-digit mobile number.",
        type: "warning",
      });
      return;
    }
    if (cleanedMobile.length !== 10) {
      showGlobalAlert({
        title: "Invalid Mobile",
        message: "Mobile number must be exactly 10 digits.",
        type: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/otpVerification/generateOTP`, { mobile: cleanedMobile });
      if (res.data?.success !== false) {
        setValidationId(res.data?.validationId || res.data?._id || "");
        setStep(STEP_OTP);
      } else {
        showGlobalAlert({
          title: "Error",
          message: res.data?.message || "Could not send OTP.",
          type: "error",
        });
      }
    } catch (err) {
      showGlobalAlert({
        title: "Error",
        message: err.response?.data?.message || "Could not send OTP.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      showGlobalAlert({
        title: "Required",
        message: "Enter the OTP sent to your mobile.",
        type: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/otpVerification/validateOtp`, {
        mobile: mobile.replace(/\D/g, ""),
        otp: otp.trim(),
        validationId,
      });
      if (res.data?.success !== false) {
        setStep(STEP_PASSWORD);
      } else {
        showGlobalAlert({
          title: "Invalid OTP",
          message: res.data?.message || "OTP does not match.",
          type: "error",
        });
      }
    } catch (err) {
      showGlobalAlert({
        title: "Invalid OTP",
        message: err.response?.data?.message || "OTP verification failed.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!password.trim() || password.length < 6) {
      showGlobalAlert({
        title: "Weak password",
        message: "Password must be at least 6 characters.",
        type: "warning",
      });
      return;
    }
    if (password !== confirmPassword) {
      showGlobalAlert({
        title: "Mismatch",
        message: "Passwords do not match.",
        type: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/users/forgotPassword`, {
        mobile: mobile.replace(/\D/g, ""),
        password,
        otp: otp.trim(),
        validationId,
      });
      if (res.data?.success) {
        showGlobalAlert({
          title: "Done",
          message: "Password reset successfully.",
          type: "success",
          buttons: [
            { text: "Sign in", onPress: () => navigation.goBack() },
          ],
        });
      } else {
        showGlobalAlert({
          title: "Error",
          message: res.data?.message || "Password reset failed.",
          type: "error",
        });
      }
    } catch (err) {
      showGlobalAlert({
        title: "Error",
        message: err.response?.data?.message || "Password reset failed.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = {
    [STEP_MOBILE]: "Forgot password",
    [STEP_OTP]: "Enter OTP",
    [STEP_PASSWORD]: "New password",
  }[step];

  const stepSubtitle = {
    [STEP_MOBILE]: "Enter your registered mobile number",
    [STEP_OTP]: `OTP sent to ${mobile}`,
    [STEP_PASSWORD]: "Choose a new password",
  }[step];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 24 }}>
            <ArrowLeft size={24} color="#6b7280" />
          </TouchableOpacity>

          <ThemedText className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stepTitle}
          </ThemedText>
          <ThemedText className="text-base text-gray-500 dark:text-gray-400 mb-8">
            {stepSubtitle}
          </ThemedText>

          {step === STEP_MOBILE && (
            <>
              <View style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 24 }}>
                <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mobile number
                </ThemedText>
                <TextInput
                  value={mobile}
                  onChangeText={(val) => setMobile(val.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Enter 10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={{ fontSize: 16, color: "#111" }}
                />
              </View>
              <TouchableOpacity
                onPress={sendOtp}
                disabled={loading}
                style={{ backgroundColor: "#a855f7", borderRadius: 12, padding: 16, alignItems: "center" }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText className="text-white text-lg font-semibold">Send OTP</ThemedText>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === STEP_OTP && (
            <>
              <View style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 24 }}>
                <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OTP
                </ThemedText>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{ fontSize: 20, letterSpacing: 4, color: "#111" }}
                />
              </View>
              <TouchableOpacity
                onPress={verifyOtp}
                disabled={loading}
                style={{ backgroundColor: "#a855f7", borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 12 }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText className="text-white text-lg font-semibold">Verify OTP</ThemedText>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={sendOtp}>
                <ThemedText className="text-center text-gray-500">Resend OTP</ThemedText>
              </TouchableOpacity>
            </>
          )}

          {step === STEP_PASSWORD && (
            <>
              <View style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New password
                </ThemedText>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    secureTextEntry={!showPassword}
                    style={{ flex: 1, fontSize: 16, color: "#111" }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 24 }}>
                <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm password
                </ThemedText>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  secureTextEntry={!showPassword}
                  style={{ fontSize: 16, color: "#111" }}
                />
              </View>
              <TouchableOpacity
                onPress={resetPassword}
                disabled={loading}
                style={{ backgroundColor: "#a855f7", borderRadius: 12, padding: 16, alignItems: "center" }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText className="text-white text-lg font-semibold">Reset password</ThemedText>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

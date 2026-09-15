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
    if (!mobile.trim()) {
      Alert.alert("Required", "Enter your registered mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/otpVerification/generateOTP`, { mobile: mobile.trim() });
      if (res.data?.success !== false) {
        setValidationId(res.data?.validationId || res.data?._id || "");
        setStep(STEP_OTP);
      } else {
        Alert.alert("Error", res.data?.message || "Could not send OTP.");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert("Required", "Enter the OTP sent to your mobile.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/otpVerification/validateOtp`, {
        mobile: mobile.trim(),
        otp: otp.trim(),
        validationId,
      });
      if (res.data?.success !== false) {
        setStep(STEP_PASSWORD);
      } else {
        Alert.alert("Invalid OTP", res.data?.message || "OTP does not match.");
      }
    } catch (err) {
      Alert.alert("Invalid OTP", err.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!password.trim() || password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/users/forgotPassword`, {
        mobile: mobile.trim(),
        password,
        otp: otp.trim(),
        validationId,
      });
      if (res.data?.success) {
        Alert.alert("Done", "Password reset successfully.", [
          { text: "Sign in", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", res.data?.message || "Password reset failed.");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Password reset failed.");
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
                  onChangeText={setMobile}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
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

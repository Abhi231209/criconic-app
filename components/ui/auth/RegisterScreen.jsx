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
import ThemedText from "@/components/ui/custom/ThemedText";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { login } from "@/redux/authSlice";
import axios from "axios";
import { BASE_URL as API_URL } from "@/config";
import SCREENS from "@/screens";

const STEP_DETAILS = "details";
const STEP_OTP = "otp";

export default function RegisterScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [step, setStep] = useState(STEP_DETAILS);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [validationId, setValidationId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!name.trim()) { Alert.alert("Required", "Enter your name."); return; }
    if (!mobile.trim()) { Alert.alert("Required", "Enter your mobile number."); return; }
    if (password.length < 6) { Alert.alert("Weak password", "Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { Alert.alert("Mismatch", "Passwords do not match."); return; }

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

  const register = async () => {
    if (!otp.trim()) { Alert.alert("Required", "Enter the OTP."); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/users/signup`, {
        username: name.trim(),
        mobile: mobile.trim(),
        password,
        otp: otp.trim(),
        validationId,
        role: 6,
      });
      if (res.data?.success) {
        // Auto-login after registration
        const loginRes = await axios.post(
          `${API_URL}api/users/login`,
          { mobile: mobile.trim(), password },
          { withCredentials: true }
        );
        let user = {
          username: name.trim(),
          name: name.trim(),
          mobile: mobile.trim(),
        };
        if (loginRes.data?.success) {
          if (loginRes.data?.user) {
            user = { ...user, ...loginRes.data.user };
          }
          dispatch(login(loginRes.data));
        } else {
          dispatch(login({ user }));
        }
        User.login(user);
        if (typeof navigation.replace === "function") {
          try {
            navigation.replace(SCREENS.CompleteProfile, { user });
            return;
          } catch (e) {}
        }
        navigation.navigate(SCREENS.CompleteProfile, { user });
      } else {
        Alert.alert("Error", res.data?.message || "Registration failed.");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

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
            {step === STEP_DETAILS ? "Create account" : "Verify mobile"}
          </ThemedText>
          <ThemedText className="text-base text-gray-500 dark:text-gray-400 mb-8">
            {step === STEP_DETAILS
              ? "Join Criconic to manage your cricket"
              : `Enter the OTP sent to ${mobile}`}
          </ThemedText>

          {step === STEP_DETAILS && (
            <>
              {[
                { label: "Full name", value: name, set: setName, placeholder: "Your name", keyboard: "default" },
                { label: "Mobile number", value: mobile, set: setMobile, placeholder: "10-digit mobile", keyboard: "phone-pad" },
              ].map(({ label, value, set, placeholder, keyboard }) => (
                <View key={label} style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</ThemedText>
                  <TextInput
                    value={value}
                    onChangeText={set}
                    placeholder={placeholder}
                    keyboardType={keyboard}
                    style={{ fontSize: 16, color: "#111" }}
                  />
                </View>
              ))}

              <View style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</ThemedText>
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
                <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm password</ThemedText>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  secureTextEntry={!showPassword}
                  style={{ fontSize: 16, color: "#111" }}
                />
              </View>

              <TouchableOpacity
                onPress={sendOtp}
                disabled={loading}
                style={{ backgroundColor: "#a855f7", borderRadius: 12, padding: 16, alignItems: "center" }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText className="text-white text-lg font-semibold">Continue</ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
                <ThemedText className="text-center text-gray-500">Already have an account? Sign in</ThemedText>
              </TouchableOpacity>
            </>
          )}

          {step === STEP_OTP && (
            <>
              <View style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 24 }}>
                <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OTP</ThemedText>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{ fontSize: 24, letterSpacing: 6, color: "#111" }}
                />
              </View>

              <TouchableOpacity
                onPress={register}
                disabled={loading}
                style={{ backgroundColor: "#a855f7", borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 12 }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <ThemedText className="text-white text-lg font-semibold">Create account</ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={sendOtp}>
                <ThemedText className="text-center text-gray-500">Resend OTP</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

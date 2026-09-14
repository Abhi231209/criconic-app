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
import { useSelector } from "react-redux";
import axios from "axios";
import { BASE_URL as API_URL } from "@/config";

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const token = useSelector((state) => state.auth.token);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!currentPassword.trim()) { Alert.alert("Required", "Enter your current password."); return; }
    if (newPassword.length < 6) { Alert.alert("Weak password", "New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { Alert.alert("Mismatch", "New passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}user/change-password`,
        { currentPassword, newPassword },
        {
          withCredentials: true,
          headers: { access_token: token },
        }
      );
      if (res.data?.success) {
        Alert.alert("Done", "Password changed successfully.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", res.data?.message || "Could not change password.");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Could not change password.");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, value, onChange, secure, show, toggle }) => (
    <View style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</ThemedText>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder="••••••••"
          style={{ flex: 1, fontSize: 16, color: "#111" }}
        />
        <TouchableOpacity onPress={toggle}>
          {show ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
        </TouchableOpacity>
      </View>
    </View>
  );

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
            Change password
          </ThemedText>
          <ThemedText className="text-base text-gray-500 dark:text-gray-400 mb-8">
            Enter your current password then choose a new one.
          </ThemedText>

          <Field
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            toggle={() => setShowCurrent(!showCurrent)}
          />
          <Field
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            toggle={() => setShowNew(!showNew)}
          />
          <View style={{ borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 12, padding: 12, marginBottom: 24 }}>
            <ThemedText className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm new password</ThemedText>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNew}
              placeholder="••••••••"
              style={{ fontSize: 16, color: "#111" }}
            />
          </View>

          <TouchableOpacity
            onPress={handleChange}
            disabled={loading}
            style={{ backgroundColor: "#a855f7", borderRadius: 12, padding: 16, alignItems: "center" }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <ThemedText className="text-white text-lg font-semibold">Update password</ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

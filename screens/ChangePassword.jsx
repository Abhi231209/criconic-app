import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { request } from "@/utils/api";
import AppKeyboardAwareScrollView from "@/components/ui/custom/AppKeyboardAwareScrollView";

export default function ChangePassword({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword.trim()) {
      Alert.alert("Required", "Please enter your current password.");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Required", "Please enter your new password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak Password", "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation password do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await request("api/users/change-password", {
        method: "POST",
        data: {
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        },
      });

      if (res?.data?.success || res?.status === 200) {
        Alert.alert(
          "Success",
          res?.data?.message || "Password changed successfully!",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          res?.data?.message || res?.message || "Failed to change password. Please check your current password."
        );
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "An error occurred while changing your password.";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        isDarkMode ? styles.bgDark : styles.bgLight,
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          isDarkMode ? styles.headerBarDark : styles.headerBarLight,
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkMode ? "#FFFFFF" : "#111827"}
          />
        </TouchableOpacity>
        <ThemedText
          style={[
            styles.headerTitle,
            isDarkMode ? styles.textWhite : styles.textBlack,
          ]}
        >
          Change Password
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <AppKeyboardAwareScrollView
        extraHeight={80}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.headerInfo}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: isDarkMode ? "#1E3A8A" : "#DBEAFE" },
              ]}
            >
              <Ionicons name="key" size={32} color="#3B82F6" />
            </View>
            <ThemedText
              style={[
                styles.title,
                isDarkMode ? styles.textWhite : styles.textBlack,
              ]}
            >
              Update Password
            </ThemedText>
            <ThemedText
              style={[
                styles.subtitle,
                isDarkMode ? styles.subtitleDark : styles.subtitleLight,
              ]}
            >
              Enter your current password and choose a secure new one.
            </ThemedText>
          </View>

          <View
            style={[
              styles.card,
              isDarkMode ? styles.cardDark : styles.cardLight,
            ]}
          >
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  isDarkMode ? styles.labelDark : styles.labelLight,
                ]}
              >
                Current Password <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <View
                style={[
                  styles.inputWrap,
                  isDarkMode ? styles.inputWrapDark : styles.inputWrapLight,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  style={styles.fieldIcon}
                />
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  secureTextEntry={!showCurrent}
                  style={[
                    styles.textInput,
                    isDarkMode ? styles.textWhite : styles.textBlack,
                  ]}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrent(!showCurrent)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showCurrent ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  isDarkMode ? styles.labelDark : styles.labelLight,
                ]}
              >
                New Password <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <View
                style={[
                  styles.inputWrap,
                  isDarkMode ? styles.inputWrapDark : styles.inputWrapLight,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  style={styles.fieldIcon}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  secureTextEntry={!showNew}
                  style={[
                    styles.textInput,
                    isDarkMode ? styles.textWhite : styles.textBlack,
                  ]}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNew(!showNew)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showNew ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm New Password */}
            <View style={styles.inputGroup}>
              <ThemedText
                style={[
                  styles.fieldLabel,
                  isDarkMode ? styles.labelDark : styles.labelLight,
                ]}
              >
                Confirm New Password <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <View
                style={[
                  styles.inputWrap,
                  isDarkMode ? styles.inputWrapDark : styles.inputWrapLight,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  style={styles.fieldIcon}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  secureTextEntry={!showConfirm}
                  style={[
                    styles.textInput,
                    isDarkMode ? styles.textWhite : styles.textBlack,
                  ]}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              style={styles.submitWrapper}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#2563EB", "#1D4ED8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ThemedText style={styles.submitText}>
                    Change Password
                  </ThemedText>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
      </AppKeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: "#F9FAFB",
  },
  bgDark: {
    backgroundColor: "#111827",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBarLight: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E5E7EB",
  },
  headerBarDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 32,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  subtitleLight: {
    color: "#6B7280",
  },
  subtitleDark: {
    color: "#9CA3AF",
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  cardDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  inputGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  labelLight: {
    color: "#374151",
  },
  labelDark: {
    color: "#D1D5DB",
  },
  required: {
    color: "#EF4444",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputWrapLight: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
  },
  inputWrapDark: {
    backgroundColor: "#111827",
    borderColor: "#374151",
  },
  fieldIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  eyeBtn: {
    padding: 6,
  },
  submitWrapper: {
    marginTop: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  textWhite: {
    color: "#FFFFFF",
  },
  textBlack: {
    color: "#111827",
  },
});

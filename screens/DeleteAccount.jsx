import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDispatch } from "react-redux";
import ThemedText from "@/components/ui/custom/ThemedText";
import AppKeyboardAwareScrollView from "@/components/ui/custom/AppKeyboardAwareScrollView";
import { userApi } from "@/utils/api";
import { logout as logoutAction } from "@/redux/authSlice";
import { clearUser } from "@/redux/userSlice";
import User from "@/utils/User";
import useAppTheme from "@/hooks/useAppTheme";
import { showGlobalAlert } from "@/contexts/AlertContext";
import { resetToAuth } from "@/navigation/navigationRef";

const WHAT_HAPPENS = [
  "Your name, mobile number, email and photo are removed.",
  "You are signed out on every device and can't sign in again.",
  "Scorecards of matches you played stay, showing \"Deleted player\".",
];

export default function DeleteAccount({ navigation }) {
  const dispatch = useDispatch();
  const { isDark: isDarkMode } = useAppTheme();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!password.trim()) {
      setError("Enter your password to confirm.");
      return;
    }
    setError("");
    setIsLoading(true);
    const res = await userApi.deleteAccount(password);
    setIsLoading(false);

    if (!res?.data?.success) {
      setError(res?.data?.message || "Couldn't delete your account. Please try again.");
      return;
    }

    // The server has already ended every login, so only local state is left.
    dispatch(logoutAction());
    dispatch(clearUser());
    User.logout();
    resetToAuth();
    showGlobalAlert({
      title: "Account deleted",
      message: "Your account and personal details have been removed.",
      type: "info",
      confirmText: "OK",
    });
  };

  const confirmDelete = () => {
    if (!password.trim()) {
      setError("Enter your password to confirm.");
      return;
    }
    showGlobalAlert({
      title: "Delete account?",
      message: "This can't be undone.",
      type: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: handleDelete,
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode ? styles.bgDark : styles.bgLight]}>
      <View style={[styles.headerBar, isDarkMode ? styles.headerBarDark : styles.headerBarLight]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#FFFFFF" : "#111827"} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, isDarkMode ? styles.textWhite : styles.textBlack]}>
          Delete Account
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <AppKeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, isDarkMode ? styles.cardDark : styles.cardLight]}>
          <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.textWhite : styles.textBlack]}>
            What happens
          </ThemedText>
          {WHAT_HAPPENS.map((line) => (
            <View key={line} style={styles.bulletRow}>
              <Ionicons name="ellipse" size={6} color="#EF4444" style={styles.bullet} />
              <ThemedText style={[styles.bulletText, isDarkMode ? styles.subtitleDark : styles.subtitleLight]}>
                {line}
              </ThemedText>
            </View>
          ))}

          <ThemedText style={[styles.fieldLabel, isDarkMode ? styles.labelDark : styles.labelLight]}>
            Password
          </ThemedText>
          <View
            style={[
              styles.inputWrap,
              isDarkMode ? styles.inputWrapDark : styles.inputWrapLight,
              error ? styles.inputWrapError : null,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              style={styles.fieldIcon}
            />
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError("");
              }}
              placeholder="Enter your password"
              placeholderTextColor={isDarkMode ? "#6B7280" : "#64748B"}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={confirmDelete}
              style={[styles.textInput, isDarkMode ? styles.textWhite : styles.textBlack]}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <TouchableOpacity
            onPress={confirmDelete}
            disabled={isLoading}
            style={[styles.deleteButton, isLoading && styles.deleteButtonBusy]}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.deleteText}>Delete my account</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </AppKeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgLight: { backgroundColor: "#F9FAFB" },
  bgDark: { backgroundColor: "#111827" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBarLight: { backgroundColor: "#FFFFFF", borderBottomColor: "#E5E7EB" },
  headerBarDark: { backgroundColor: "#1F2937", borderBottomColor: "#374151" },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 32 },
  scrollContent: { padding: 20 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1 },
  cardLight: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  cardDark: { backgroundColor: "#1F2937", borderColor: "#374151" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  bullet: { marginTop: 7, marginRight: 10 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },
  subtitleLight: { color: "#4B5563" },
  subtitleDark: { color: "#9CA3AF" },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  labelLight: { color: "#374151" },
  labelDark: { color: "#D1D5DB" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputWrapLight: { backgroundColor: "#F9FAFB", borderColor: "#D1D5DB" },
  inputWrapDark: { backgroundColor: "#111827", borderColor: "#374151" },
  inputWrapError: { borderColor: "#EF4444" },
  fieldIcon: { marginRight: 8 },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "DarkerGrotesque_600SemiBold",
    paddingVertical: 10,
  },
  eyeBtn: { padding: 6 },
  errorText: { color: "#EF4444", fontSize: 13, marginTop: 6 },
  deleteButton: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonBusy: { opacity: 0.7 },
  deleteText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  textWhite: { color: "#FFFFFF" },
  textBlack: { color: "#111827" },
});

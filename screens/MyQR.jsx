import React from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useSelector } from "react-redux";
import User from "@/utils/User";

export default function MyQR({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const authUser = useSelector((state) => state.auth?.user);
  const userId = authUser?._id || User.id || authUser?.id || "";
  const userName =
    authUser?.username || authUser?.name || User.name || "Player";
  const sharingCode =
    authUser?.sharingCode || User.sharingCode || userId.slice(-6).toUpperCase();

  const qrData = JSON.stringify({
    type: "PLAYER",
    action: "JOIN",
    value: userId,
  });

  const handleCopyCode = async () => {
    if (sharingCode) {
      await Clipboard.setStringAsync(sharingCode);
      Alert.alert("Copied", `Sharing code ${sharingCode} copied to clipboard!`);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, isDarkMode ? styles.bgDark : styles.bgLight]}
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
          My QR Code
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.container}>
        <View
          style={[
            styles.card,
            isDarkMode ? styles.cardDark : styles.cardLight,
          ]}
        >
          <ThemedText
            style={[
              styles.nameText,
              isDarkMode ? styles.textWhite : styles.textBlack,
            ]}
          >
            {userName}
          </ThemedText>

          <ThemedText
            style={[
              styles.hintText,
              isDarkMode ? styles.subtitleDark : styles.subtitleLight,
            ]}
          >
            Scan this QR code to quickly add me to your team or tournament
          </ThemedText>

          {/* QR Container */}
          <View style={styles.qrContainer}>
            <QRCode
              value={qrData || "CRICONIC_PLAYER"}
              size={220}
              backgroundColor="white"
              color="#111827"
            />
          </View>

          {/* Sharing Code */}
          <View
            style={[
              styles.codeBox,
              isDarkMode ? styles.codeBoxDark : styles.codeBoxLight,
            ]}
          >
            <View>
              <ThemedText
                style={[
                  styles.codeLabel,
                  isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                ]}
              >
                Sharing Code
              </ThemedText>
              <ThemedText
                style={[
                  styles.codeValue,
                  isDarkMode ? styles.textWhite : styles.textBlack,
                ]}
              >
                {sharingCode}
              </ThemedText>
            </View>

            <TouchableOpacity
              onPress={handleCopyCode}
              style={styles.copyButton}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={18} color="#3B82F6" />
              <ThemedText style={styles.copyText}>Copy</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: "#F3F4F6",
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
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  cardDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  nameText: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  hintText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  subtitleLight: {
    color: "#6B7280",
  },
  subtitleDark: {
    color: "#9CA3AF",
  },
  qrContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  codeBoxLight: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  codeBoxDark: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  codeValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
    marginLeft: 4,
  },
  textWhite: {
    color: "#FFFFFF",
  },
  textBlack: {
    color: "#111827",
  },
});

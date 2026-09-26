import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  useColorScheme,
  Image,
  Share,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useSelector } from "react-redux";
import User from "@/utils/User";
import { authApi, userApi } from "@/utils/api";
import { getImageFullUrl } from "@/utils";

export default function MyQR({ navigation }) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const authUser = useSelector((state) => state.auth?.user);
  const currentUser = authUser?.user || authUser || User.user || {};

  const userId = String(
    currentUser?._id || currentUser?.id || User.id || ""
  );
  const userName =
    currentUser?.username || currentUser?.name || User.name || "Player";
  const rawPhoto =
    currentUser?.profileImg ||
    currentUser?.profileImage ||
    currentUser?.photo ||
    currentUser?.avatar ||
    User?.user?.profileImg;
  const profileImageUrl = rawPhoto ? getImageFullUrl(rawPhoto) : null;

  const [fetchedSharingCode, setFetchedSharingCode] = useState(
    currentUser?.sharingCode || User.sharingCode || ""
  );

  useEffect(() => {
    let mounted = true;
    const ensureSharingCode = async () => {
      if (currentUser?.sharingCode || User.sharingCode) {
        if (mounted) {
          setFetchedSharingCode(currentUser?.sharingCode || User.sharingCode);
        }
        return;
      }
      if (!userId) return;
      try {
        const statusRes = await authApi.checkStatus();
        const codeFromStatus = statusRes?.data?.user?.sharingCode;
        if (codeFromStatus && mounted) {
          setFetchedSharingCode(codeFromStatus);
          return;
        }
        const profRes = await userApi.getProfile(userId);
        const codeFromProf =
          profRes?.data?.data?.sharingCode || profRes?.data?.sharingCode;
        if (codeFromProf && mounted) {
          setFetchedSharingCode(codeFromProf);
        }
      } catch (e) {
        // Ignore background fetch error
      }
    };
    ensureSharingCode();
    return () => {
      mounted = false;
    };
  }, [userId, currentUser?.sharingCode]);

  const sharingCode =
    fetchedSharingCode ||
    currentUser?.sharingCode ||
    User.sharingCode ||
    (userId ? userId.slice(-6).toUpperCase() : "");

  const qrData = userId
    ? JSON.stringify({
        type: "PLAYER",
        action: "JOIN",
        value: userId,
      })
    : "CRICONIC_PLAYER";

  const handleCopyCode = async () => {
    const codeToCopy = sharingCode || userId;
    if (codeToCopy) {
      await Clipboard.setStringAsync(codeToCopy);
      Alert.alert("Copied", `Sharing code ${codeToCopy} copied to clipboard!`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: sharingCode
          ? `Add ${userName} on Criconic! Sharing Code: ${sharingCode}`
          : `Add ${userName} on Criconic!`,
      });
    } catch (_) {
      // User dismissed share sheet
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
        <TouchableOpacity
          onPress={handleShare}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="share-social-outline"
            size={22}
            color={isDarkMode ? "#FFFFFF" : "#111827"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          paddingBottom: Math.max(insets.bottom + 20, 24),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            isDarkMode ? styles.cardDark : styles.cardLight,
          ]}
        >
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                marginBottom: 10,
                backgroundColor: "#E5E7EB",
              }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                marginBottom: 10,
                backgroundColor: isDarkMode ? "#374151" : "#EFF6FF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={30} color="#3B82F6" />
            </View>
          )}

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
            Scan this QR code to quickly add me to your team or view my profile
          </ThemedText>

          {/* QR Container */}
          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={220}
              backgroundColor="white"
              color="#111827"
            />
          </View>

          {/* Sharing Code */}
          {Boolean(sharingCode) && (
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
          )}

          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.8}
            style={{
              marginTop: 14,
              width: "100%",
              backgroundColor: "#2563EB",
              borderRadius: 12,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            <ThemedText
              style={{
                color: "#FFFFFF",
                fontWeight: "600",
                fontSize: 14,
                marginLeft: 6,
              }}
            >
              Share My Code
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
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

import React, { useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  Share,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { useSelector } from "react-redux";
import ThemedText from "@/components/ui/custom/ThemedText";

// Mirrors the website's SCANNER_TYPE_ACTION.PLAYER contract so a QR generated
// here is understood by the web scanner (client/src/utils/Common.js).
const PLAYER_QR = { type: "PLAYER", action: "MY" };

export default function MyQR() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // The login response is stored as { success, access_token, user }, so the
  // real profile can be nested under `.user`. Unwrap defensively.
  const authUser = useSelector((state) => state.auth.user);
  const currentUser = authUser?.user || authUser || {};

  const userId = currentUser._id || currentUser.id;
  const name = currentUser.username || currentUser.name || "Player";
  const sharingCode = currentUser.sharingCode;

  const qrValue = useMemo(
    () =>
      JSON.stringify({
        type: PLAYER_QR.type,
        action: PLAYER_QR.action,
        value: userId,
      }),
    [userId]
  );

  const handleCopyCode = async () => {
    if (!sharingCode) return;
    await Clipboard.setStringAsync(sharingCode);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: sharingCode
          ? `Follow ${name} on Criconic. Sharing code: ${sharingCode}`
          : `Follow ${name} on Criconic.`,
      });
    } catch (_) {
      // user dismissed the share sheet — nothing to do
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, isDarkMode ? styles.bgDark : styles.bgLight]}
      edges={["top"]}
    >
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My QR</ThemedText>
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {userId ? (
          <>
            <View
              style={[
                styles.card,
                isDarkMode ? styles.cardDark : styles.cardLight,
              ]}
            >
              <View style={styles.avatarRow}>
                <View style={styles.avatarContainer}>
                  {currentUser.profileImg ? (
                    <Image
                      source={{ uri: currentUser.profileImg }}
                      style={styles.avatar}
                    />
                  ) : (
                    <Ionicons
                      name="person"
                      size={28}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  )}
                </View>
                <View style={styles.nameBlock}>
                  <ThemedText
                    style={[
                      styles.name,
                      isDarkMode ? styles.textWhite : styles.textBlack,
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                  </ThemedText>
                  {!!sharingCode && (
                    <ThemedText style={styles.codeLabel}>
                      Sharing code: {sharingCode}
                    </ThemedText>
                  )}
                </View>
              </View>

              <View style={styles.qrWrap}>
                <QRCode
                  value={qrValue}
                  size={220}
                  color="#111827"
                  backgroundColor="#ffffff"
                />
              </View>

              <ThemedText style={styles.helper}>
                Ask a friend to scan this from their Criconic app to follow you.
              </ThemedText>
            </View>

            {!!sharingCode && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isDarkMode ? styles.actionDark : styles.actionLight,
                ]}
                onPress={handleCopyCode}
              >
                <Ionicons name="copy-outline" size={20} color="#3B82F6" />
                <ThemedText style={styles.actionText}>
                  Copy sharing code
                </ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="white" />
              <ThemedText style={styles.shareText}>Share</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="qr-code-outline"
              size={48}
              color={isDarkMode ? "#4B5563" : "#9CA3AF"}
            />
            <ThemedText
              style={[
                styles.emptyText,
                isDarkMode ? styles.textWhite : styles.textBlack,
              ]}
            >
              Log in to view your QR code.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgLight: { backgroundColor: "#f3f4f6" },
  bgDark: { backgroundColor: "#111827" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { width: 32, alignItems: "flex-start" },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, alignItems: "center", paddingBottom: 40 },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  cardLight: { backgroundColor: "white" },
  cardDark: { backgroundColor: "#1f2937" },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(148,163,184,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  nameBlock: { flex: 1 },
  name: { fontSize: 20, fontWeight: "bold", textTransform: "capitalize" },
  codeLabel: { color: "#6B7280", fontSize: 14, marginTop: 2 },
  qrWrap: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
  },
  helper: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  actionLight: { backgroundColor: "#EFF6FF" },
  actionDark: { backgroundColor: "rgba(59,130,246,0.15)" },
  actionText: { color: "#3B82F6", fontWeight: "600", fontSize: 15 },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: "#3B82F6",
  },
  shareText: { color: "white", fontWeight: "600", fontSize: 15 },
  emptyState: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
  textWhite: { color: "white" },
  textBlack: { color: "#111827" },
});

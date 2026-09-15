import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { request } from "@/utils/api";

export default function HomeConfig({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [tierSystemEnabled, setTierSystemEnabled] = useState(false);
  const [savingTierFlag, setSavingTierFlag] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await request("api/configs", { method: "GET" });
      if (res?.data?.success) {
        setConfig(res.data?.content?.homePage || res.data?.content || null);
        setTierSystemEnabled(Boolean(res.data?.content?.isTournamentTierSystemEnabled));
      }
    } catch (err) {
      console.warn("[HomeConfig] Error fetching config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleToggleTierSystem = async (value) => {
    const previous = tierSystemEnabled;
    setTierSystemEnabled(value); // optimistic
    setSavingTierFlag(true);
    try {
      const res = await request("api/configs", {
        method: "PUT",
        data: { type: "tournamentTierSystem", data: value },
      });
      if (!res?.data?.success) throw new Error(res?.data?.message);
    } catch (err) {
      setTierSystemEnabled(previous); // revert
      Alert.alert("Couldn't update", "Please try again.");
    } finally {
      setSavingTierFlag(false);
    }
  };

  const holdings = config?.holding || [];
  const boards = config?.boards || config?.board || [];

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
          Home Configuration
        </ThemedText>
        <TouchableOpacity onPress={fetchConfig} style={styles.backButton}>
          <Ionicons
            name="refresh"
            size={22}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <ThemedText style={styles.loadingText}>
            Loading configuration...
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Tournament Tier System toggle */}
          <View
            style={[
              styles.itemCard,
              isDarkMode ? styles.cardDark : styles.cardLight,
              { marginBottom: 20 },
            ]}
          >
            <View style={styles.itemRow}>
              <Ionicons
                name="trophy-outline"
                size={22}
                color="#F59E0B"
                style={styles.itemIcon}
              />
              <View style={styles.itemInfo}>
                <ThemedText
                  style={[styles.itemTitle, isDarkMode ? styles.textWhite : styles.textBlack]}
                >
                  Paid Tournament Tiers
                </ThemedText>
                <ThemedText
                  style={[styles.itemSub, isDarkMode ? styles.subtitleDark : styles.subtitleLight]}
                >
                  {tierSystemEnabled
                    ? "Enabled — new tournaments are capped on the Free tier and can request a paid upgrade."
                    : "Disabled — all tournaments run unrestricted, exactly as before this feature."}
                </ThemedText>
              </View>
              <Switch
                value={tierSystemEnabled}
                onValueChange={handleToggleTierSystem}
                disabled={savingTierFlag}
                trackColor={{ false: "#D1D5DB", true: "#F59E0B" }}
              />
            </View>
          </View>

          {/* Holdings Section */}
          <View style={styles.sectionHeader}>
            <ThemedText
              style={[
                styles.sectionTitle,
                isDarkMode ? styles.textWhite : styles.textBlack,
              ]}
            >
              Holding Banners ({holdings.length})
            </ThemedText>
          </View>

          {holdings.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                isDarkMode ? styles.cardDark : styles.cardLight,
              ]}
            >
              <ThemedText
                style={[
                  styles.emptyText,
                  isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                ]}
              >
                No active banner holdings configured
              </ThemedText>
            </View>
          ) : (
            holdings.map((item, index) => (
              <View
                key={item.id || index}
                style={[
                  styles.itemCard,
                  isDarkMode ? styles.cardDark : styles.cardLight,
                ]}
              >
                <View style={styles.itemRow}>
                  <Ionicons
                    name={item.isMatch ? "baseball-outline" : "trophy-outline"}
                    size={22}
                    color="#3B82F6"
                    style={styles.itemIcon}
                  />
                  <View style={styles.itemInfo}>
                    <ThemedText
                      style={[
                        styles.itemTitle,
                        isDarkMode ? styles.textWhite : styles.textBlack,
                      ]}
                    >
                      {item.heading || "Untitled Banner"}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.itemSub,
                        isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                      ]}
                    >
                      Type: {item.isMatch ? "Match Banner" : "Tournament Banner"} • Button: {item.buttonText || "Watch now"}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* Boards Section */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <ThemedText
              style={[
                styles.sectionTitle,
                isDarkMode ? styles.textWhite : styles.textBlack,
              ]}
            >
              Custom Boards ({boards.length})
            </ThemedText>
          </View>

          {boards.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                isDarkMode ? styles.cardDark : styles.cardLight,
              ]}
            >
              <ThemedText
                style={[
                  styles.emptyText,
                  isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                ]}
              >
                No custom boards configured
              </ThemedText>
            </View>
          ) : (
            boards.map((board, index) => (
              <View
                key={index}
                style={[
                  styles.itemCard,
                  isDarkMode ? styles.cardDark : styles.cardLight,
                ]}
              >
                <View style={styles.itemRow}>
                  <Ionicons
                    name="grid-outline"
                    size={22}
                    color="#10B981"
                    style={styles.itemIcon}
                  />
                  <View style={styles.itemInfo}>
                    <ThemedText
                      style={[
                        styles.itemTitle,
                        isDarkMode ? styles.textWhite : styles.textBlack,
                      ]}
                    >
                      {board.title || `Board ${index + 1}`}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.itemSub,
                        isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                      ]}
                    >
                      {board.isMatchesBoards
                        ? `Matches List (${board.matches?.length || 0} matches)`
                        : "Custom HTML Block"}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  itemCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  cardDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSub: {
    fontSize: 13,
    marginTop: 3,
  },
  emptyCard: {
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
  },
  subtitleLight: {
    color: "#6B7280",
  },
  subtitleDark: {
    color: "#9CA3AF",
  },
  textWhite: {
    color: "#FFFFFF",
  },
  textBlack: {
    color: "#111827",
  },
});

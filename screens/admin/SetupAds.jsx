import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { request } from "@/utils/api";

export default function SetupAds({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await request("api/matches?self=1&ads=1", { method: "GET" });
      if (res?.data?.success) {
        setMatches(res.data.matches || []);
      }
    } catch (err) {
      console.warn("[SetupAds] Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

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
          Setup Match Ads
        </ThemedText>
        <TouchableOpacity onPress={fetchMatches} style={styles.backButton}>
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
            Loading matches for ads setup...
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText
            style={[
              styles.sectionTitle,
              isDarkMode ? styles.textWhite : styles.textBlack,
            ]}
          >
            Matches with Ads Config ({matches.length})
          </ThemedText>
          <ThemedText
            style={[
              styles.sectionSub,
              isDarkMode ? styles.subtitleDark : styles.subtitleLight,
            ]}
          >
            Configure overlay and interstitial advertisements for live matches.
          </ThemedText>

          {matches.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                isDarkMode ? styles.cardDark : styles.cardLight,
              ]}
            >
              <Ionicons
                name="megaphone-outline"
                size={40}
                color={isDarkMode ? "#4B5563" : "#9CA3AF"}
                style={{ marginBottom: 8 }}
              />
              <ThemedText
                style={[
                  styles.emptyText,
                  isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                ]}
              >
                No matches found eligible for ad placement
              </ThemedText>
            </View>
          ) : (
            matches.map((match, idx) => {
              const team1 = match?.teams?.[0]?.teamId?.teamName || "Team 1";
              const team2 = match?.teams?.[1]?.teamId?.teamName || "Team 2";
              const hasAds = !!match?.ads;

              return (
                <View
                  key={match._id || idx}
                  style={[
                    styles.itemCard,
                    isDarkMode ? styles.cardDark : styles.cardLight,
                  ]}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <ThemedText
                        style={[
                          styles.itemTitle,
                          isDarkMode ? styles.textWhite : styles.textBlack,
                        ]}
                      >
                        {team1} vs {team2}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.itemSub,
                          isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                        ]}
                      >
                        Status: {match.matchStatus || "Scheduled"} • Type: {match.matchType || "Standard"}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        hasAds ? styles.badgeActive : styles.badgeInactive,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.badgeText,
                          hasAds ? styles.badgeTextActive : styles.badgeTextInactive,
                        ]}
                      >
                        {hasAds ? "Ads Configured" : "No Ads"}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  sectionSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
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
    justifyContent: "space-between",
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSub: {
    fontSize: 13,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: "#DEF7EC",
  },
  badgeInactive: {
    backgroundColor: "#F3F4F6",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextActive: {
    color: "#03543F",
  },
  badgeTextInactive: {
    color: "#6B7280",
  },
  emptyCard: {
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 12,
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

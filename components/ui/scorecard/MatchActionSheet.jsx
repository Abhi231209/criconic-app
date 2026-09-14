import React, { useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Play,
  Trophy,
  Trash2,
  X,
  Layers,
  ChevronRight,
  Video,
} from "lucide-react-native";
import SCREENS from "@/screens";
import useAppTheme from "@/hooks/useAppTheme";
import ThemedText from "@/components/ui/custom/ThemedText";
import { MATCH_STATUS, matchRedirectBasedOnStatus } from "@/utils";
import request, { matchesApi } from "@/utils/api";

const MatchActionSheet = ({
  closeSheet,
  navigation,
  matchId,
  matchStatus = "Upcoming",
  isAccessToUpdate = true,
  score,
  matchDetails,
  onDeleteSuccess,
}) => {
  const { theme, isDark } = useAppTheme();

  const isEnded =
    matchStatus === "End" ||
    matchDetails?.status === MATCH_STATUS.MATCH_ENDED ||
    matchDetails?.status === MATCH_STATUS.MATCH_COMPLETED ||
    score?.matchCurrentStatus === MATCH_STATUS.MATCH_ENDED ||
    score?.matchCurrentStatus === MATCH_STATUS.MATCH_COMPLETED;

  const isLive =
    matchStatus === "Live" ||
    (!isEnded &&
      (matchDetails?.status === MATCH_STATUS.MATCH_IN_PROGRESS ||
        matchDetails?.status === MATCH_STATUS.MATCH_STARTED ||
        score?.matchCurrentStatus === MATCH_STATUS.MATCH_IN_PROGRESS ||
        score?.matchCurrentStatus === MATCH_STATUS.MATCH_STARTED ||
        score?.matchCurrentStatus === MATCH_STATUS.INNINGS_I ||
        score?.matchCurrentStatus === MATCH_STATUS.INNINGS_II));

  const hasThemeConfigured = Boolean(
    matchDetails?.selectedTheme ||
    matchDetails?.themeConfig ||
    matchDetails?.theme ||
    score?.themeConfig ||
    score?.selectedTheme
  );

  const menuItems = [];

  // 1. Scoring Action: Only show when match is NOT ended and user has scoring access
  if (!isEnded && isAccessToUpdate) {
    if (isLive) {
      menuItems.push({
        id: "resume",
        title: "Resume Scoring",
        subtitle: "Continue live scoring from where you left off",
        icon: Play,
        gradient: theme?.gradients?.actionPrimary || ["#3B82F6", "#2563EB"],
        onPress: async () => {
          closeSheet();
          let currentStatus = score?.matchCurrentStatus || matchDetails?.status || matchStatus;
          if (
            matchId &&
            (!currentStatus ||
              currentStatus === MATCH_STATUS.MATCH_CREATED ||
              currentStatus === MATCH_STATUS.MATCH_SCHEDULED)
          ) {
            try {
              const res = await matchesApi.getMatchById(matchId, { errorAlert: false });
              if (res?.data?.status) {
                currentStatus = res.data.status;
              }
            } catch (err) {
              console.warn("[MatchActionSheet] Error fetching fresh match status:", err);
            }
          }
          const target = matchRedirectBasedOnStatus(matchId, currentStatus);
          navigation.navigate(target.screen, target.params);
        },
      });
    } else {
      // Upcoming / Not started yet
      menuItems.push({
        id: "start",
        title: "Start Scoring",
        subtitle: "Setup match, toss, and team openers",
        icon: Play,
        gradient: theme?.gradients?.actionPrimary || ["#3B82F6", "#2563EB"],
        onPress: async () => {
          closeSheet();
          const target = matchRedirectBasedOnStatus(matchId, matchDetails?.status || MATCH_STATUS.MATCH_CREATED);
          navigation.navigate(target.screen, target.params);
        },
      });
    }
  }

  // 2. Full Scorecard Action
  menuItems.push({
    id: "scorecard",
    title: "View Full Scorecard",
    subtitle: isEnded
      ? "Check complete match statistics and scorecard"
      : "Check live match statistics and scorecard",
    icon: Trophy,
    gradient: theme?.gradients?.actionSecondary || ["#8B5CF6", "#6D28D9"],
    onPress: () => {
      closeSheet();
      navigation.navigate(SCREENS.MatchScoreCard, {
        matchId,
        initialScore: score,
        initialMatch: matchDetails,
      });
    },
  });

  // 3. Overlay Setup Action (Requirement 5: options for overlay setup in match actions)
  menuItems.push({
    id: "overlay",
    title: "Overlay Setup",
    subtitle: hasThemeConfigured
      ? "Edit theme & broadcast overlays"
      : isLive
      ? "Configure live stream graphics"
      : "Configure overlay before match starts",
    icon: Layers,
    gradient: ["#F59E0B", "#D97706"],
    onPress: () => {
      closeSheet();
      navigation.navigate(SCREENS.ThemeConfig, { matchId });
    },
  });

  // 4. Live Stream Broadcast Action
  menuItems.push({
    id: "livestream",
    title:
      score?.streamUrl || matchDetails?.streamUrl
        ? "Watch Live Stream"
        : "Live Stream Broadcast",
    subtitle:
      score?.streamUrl || matchDetails?.streamUrl
        ? "Watch live YouTube or Facebook stream"
        : "Add YouTube or Facebook stream link to match",
    icon: Video,
    gradient: ["#EF4444", "#DC2626"],
    onPress: () => {
      closeSheet();
      navigation.navigate(SCREENS.MatchScoreCard, {
        matchId,
        initialScore: score,
        initialMatch: matchDetails,
      });
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Match",
      "Are you sure you want to delete this match? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            closeSheet();
            try {
              const res = await request(`api/matches/delete/${matchId}`, {
                method: "PUT",
                errorAlert: false,
              });
              if (res?.data?.success || res?.status === 200) {
                Alert.alert("Success", res?.data?.message || "Match deleted successfully");
                onDeleteSuccess?.(matchId);
              }
            } catch (err) {
              console.log("[MatchActionSheet] Delete match error:", err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const sheetBg = isDark ? "#1E293B" : "#FFFFFF";
  const itemBg = isDark ? "#334155" : "#F8FAFC";
  const itemBorder = isDark ? "#475569" : "#E2E8F0";
  const titleColor = isDark ? "#F8FAFC" : "#0F172A";
  const subtitleColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: sheetBg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      bounces={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText className="text-xl font-bold" style={{ color: titleColor }}>
            Match Actions
          </ThemedText>
          <ThemedText className="text-xs font-medium" style={{ color: subtitleColor }}>
            {isEnded
              ? "Match completed • Choose an action"
              : isLive
              ? "Match is live • Manage ongoing match"
              : "Match upcoming • Setup and scoring"}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={closeSheet}
          style={[styles.closeButton, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
          activeOpacity={0.7}
        >
          <X size={18} color={isDark ? "#F8FAFC" : "#64748B"} />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                {
                  backgroundColor: itemBg,
                  borderColor: itemBorder,
                },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={item.gradient}
                style={styles.menuIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon size={19} color="#FFFFFF" />
              </LinearGradient>

              <View style={styles.menuContent}>
                <ThemedText className="text-sm font-semibold" style={{ color: titleColor }}>
                  {item.title}
                </ThemedText>
                <ThemedText className="text-xs font-normal mt-0.5" style={{ color: subtitleColor }}>
                  {item.subtitle}
                </ThemedText>
              </View>

              <ChevronRight size={18} color={subtitleColor} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Danger Zone: Delete Match */}
      {isAccessToUpdate && (
        <View style={styles.dangerZone}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
                borderColor: isDark ? "rgba(239, 68, 68, 0.4)" : "#FECACA",
              },
            ]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.deleteIconContainer,
                { backgroundColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#FEE2E2" },
              ]}
            >
              <Trash2 size={18} color="#EF4444" />
            </View>
            <View style={styles.deleteTextContainer}>
              <ThemedText className="text-sm font-bold" style={{ color: "#EF4444" }}>
                Delete Match
              </ThemedText>
              <ThemedText
                className="text-[11px] font-normal"
                style={{ color: isDark ? "#FCA5A5" : "#DC2626" }}
              >
                Permanently remove this match
              </ThemedText>
            </View>
            <ChevronRight size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContainer: {
    gap: 8,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  dangerZone: {
    marginTop: 4,
    marginBottom: 12,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  deleteIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  deleteTextContainer: {
    flex: 1,
  },
});

export default React.memo(MatchActionSheet);

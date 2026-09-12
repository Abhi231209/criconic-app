import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Play,
  Trophy,
  Trash2,
  X,
  Clock,
  Users,
  Target,
  ChevronRight,
} from "lucide-react-native";
import SCREENS from "@/screens";
import useAppTheme from "@/hooks/useAppTheme";
import ThemedText from "@/components/ui/custom/ThemedText";
import { MATCH_STATUS, matchRedirectBasedOnStatus } from "@/utils";
import { matchesApi } from "@/utils/api";

const MatchActionSheet = ({ closeSheet, navigation, matchId, matchStatus }) => {
  const { theme, isDark } = useAppTheme();

  const menuItems = [
    {
      id: "resume",
      title: "Resume Scoring",
      subtitle: "Continue from where you left off",
      icon: Play,
      gradient: theme?.gradients?.actionPrimary || ["#3B82F6", "#2563EB"],
      onPress: async () => {
        closeSheet();
        let currentStatus = matchStatus;
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
    },
    {
      id: "scorecard",
      title: "View Full Scorecard",
      subtitle: "Check complete match statistics",
      icon: Trophy,
      gradient: theme?.gradients?.actionSecondary || ["#8B5CF6", "#6D28D9"],
      onPress: () => {
        closeSheet();
        navigation.navigate(SCREENS.MatchScoreCard, { matchId });
      },
    },
  ];

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
          onPress: closeSheet,
          style: "destructive",
        },
      ],
      { cancelable: true },
    );
  };

  const sheetBg = isDark ? "#1E293B" : "#FFFFFF";
  const itemBg = isDark ? "#334155" : "#F8FAFC";
  const itemBorder = isDark ? "#475569" : "#E2E8F0";
  const titleColor = isDark ? "#F8FAFC" : "#0F172A";
  const subtitleColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <View style={[styles.container, { backgroundColor: sheetBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText className="text-2xl font-bold" style={{ color: titleColor }}>
            Match Options
          </ThemedText>
          <ThemedText className="text-sm font-medium" style={{ color: subtitleColor }}>
            Manage your ongoing match
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={closeSheet}
          style={[styles.closeButton, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
          activeOpacity={0.7}
        >
          <X size={20} color={isDark ? "#F8FAFC" : "#64748B"} />
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
                <Icon size={22} color="#FFFFFF" />
              </LinearGradient>

              <View style={styles.menuContent}>
                <ThemedText className="text-base font-semibold" style={{ color: titleColor }}>
                  {item.title}
                </ThemedText>
                <ThemedText className="text-xs font-normal" style={{ color: subtitleColor }}>
                  {item.subtitle}
                </ThemedText>
              </View>

              <ChevronRight size={20} color={subtitleColor} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <TouchableOpacity
          style={[
            styles.deleteButton,
            {
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
              borderColor: "#EF4444",
            },
          ]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color="#EF4444" />
          <View style={styles.deleteTextContainer}>
            <ThemedText className="text-base font-semibold" style={{ color: "#EF4444" }}>
              Delete Match
            </ThemedText>
            <ThemedText className="text-xs font-normal" style={{ color: isDark ? "#FCA5A5" : subtitleColor }}>
              Permanently remove this match
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      {/* Close Button */}
      <TouchableOpacity
        style={[
          styles.closeBottomButton,
          {
            backgroundColor: isDark ? "#334155" : "#F1F5F9",
            borderColor: itemBorder,
          },
        ]}
        onPress={closeSheet}
        activeOpacity={0.7}
      >
        <ThemedText className="text-base font-semibold" style={{ color: isDark ? "#F8FAFC" : "#334155" }}>
          Close
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  matchInfoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  matchInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  matchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  matchInfoText: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  matchSubtitle: {
    fontSize: 13,
  },
  matchStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: "500",
  },
  menuContainer: {
    gap: 12,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  dangerZone: {
    marginTop: "auto",
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  deleteTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  deleteTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  deleteSubtitle: {
    fontSize: 13,
  },
  closeBottomButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default React.memo(MatchActionSheet);

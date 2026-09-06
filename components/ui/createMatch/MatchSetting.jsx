import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Share,
} from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Zap,
  X,
  Copy,
  Share2,
  Award,
  Palette,
  Radio,
  RefreshCw,
  Trophy,
  ExternalLink,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import ThemedText from "../custom/ThemedText";
import SCREENS from "@/screens";
import { useNavigation } from "@react-navigation/native";
import { request } from "@/utils/api";
import { useSocket } from "@/contexts/SocketContext";
import { MatchSettingEnum } from "@/utils/Common";
import { COLORS } from "@/theme/colors";

const SafeIcon = ({ icon: Icon, size = 20, color, style }) => {
  if (!Icon) return <ThemedText style={{ color, fontSize: size - 4 }}>⚙</ThemedText>;
  try {
    return <Icon size={size} color={color} style={style} />;
  } catch {
    return <ThemedText style={{ color, fontSize: size - 4 }}>⚙</ThemedText>;
  }
};

const AccordionSection = ({ title, icon, isExpanded, onToggle, children, isDarkMode }) => {
  const C = isDarkMode ? COLORS.dark : COLORS.light;
  return (
    <View style={[styles.accordionSection, { backgroundColor: C.card, borderColor: C.border }]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.accordionHeaderLeft}>
          <SafeIcon icon={icon} size={18} color={COLORS.primary} />
          <ThemedText className="font-bold" style={[styles.accordionTitle, { color: C.text }]}>
            {title}
          </ThemedText>
        </View>
        <SafeIcon icon={isExpanded ? ChevronUp : ChevronDown} size={18} color={C.textSecondary} />
      </TouchableOpacity>
      {isExpanded && (
        <View style={[styles.accordionContent, { borderTopColor: C.border }]}>
          {children}
        </View>
      )}
    </View>
  );
};

const SettingRow = ({ title, description, value, onToggle, isDarkMode }) => {
  const C = isDarkMode ? COLORS.dark : COLORS.light;
  return (
    <View style={[styles.settingRow, { borderBottomColor: C.divider }]}>
      <View style={styles.settingText}>
        <ThemedText className="font-semibold text-sm" style={{ color: C.text }}>
          {title}
        </ThemedText>
        {!!description && (
          <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary, marginTop: 2 }}>
            {description}
          </ThemedText>
        )}
      </View>
      <Switch
        value={!!value}
        onValueChange={onToggle}
        thumbColor={value ? COLORS.primary : "#CBD5E1"}
        trackColor={{ false: isDarkMode ? "#334155" : "#E2E8F0", true: "#93C5FD" }}
      />
    </View>
  );
};

const ActionButton = ({ title, icon, onPress, variant = "primary", isDarkMode, disabled = false, style }) => {
  const C = isDarkMode ? COLORS.dark : COLORS.light;
  const variantStyles = {
    primary: { backgroundColor: COLORS.primary },
    success: { backgroundColor: COLORS.secondary },
    danger: { backgroundColor: COLORS.danger },
    warning: { backgroundColor: COLORS.warning },
    outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: COLORS.primary },
    ghost: {
      backgroundColor: isDarkMode ? COLORS.dark.card : COLORS.light.card,
      borderWidth: 1,
      borderColor: C.border,
    },
  };
  const textColor =
    variant === "outline"
      ? COLORS.primary
      : variant === "ghost"
      ? C.text
      : "#FFFFFF";
  return (
    <TouchableOpacity
      style={[styles.actionBtn, variantStyles[variant], disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled}
    >
      {icon && <SafeIcon icon={icon} size={16} color={textColor} />}
      <ThemedText className="font-bold text-sm" style={{ color: textColor }}>
        {title}
      </ThemedText>
    </TouchableOpacity>
  );
};

export default function MatchSetting({ matchId, onInningsComplete, onClose, score }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const navigation = useNavigation();
  const C = isDarkMode ? COLORS.dark : COLORS.light;
  const { emit, isConnected } = useSocket();

  const [expandedSections, setExpandedSections] = useState({
    player: true,
    match: false,
    live: true,
  });
  const [matchConfigs, setMatchConfigs] = useState({});
  const [showBatsmenStats, setShowBatsmenStats] = useState(false);
  const [streamingLink, setStreamingLink] = useState("");

  const loadConfigs = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await request(`api/matches/${matchId}/public/config`, { method: "GET" });
      const content = res?.data?.content || {};
      if (content.showBatsmenStats) {
        setShowBatsmenStats(!!content.showBatsmenStats?.active);
      }
      if (typeof content.streamUrl === "string") {
        setStreamingLink(content.streamUrl);
      }
      setMatchConfigs(content);
    } catch (err) {
      console.error("loadConfigs error:", err);
    }
  }, [matchId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const updateMatchSetting = async (action, value) => {
    if (!matchId) return;
    try {
      await request(`api/matches/${matchId}/settings`, {
        method: "PUT",
        data: { action, data: value },
      });
      await loadConfigs();
    } catch (err) {
      console.error("updateMatchSetting error:", err);
      Alert.alert("Error", "Failed to update setting. Please try again.");
    }
  };

  const emitDisplaySetting = (settingKey, value) => {
    if (isConnected && emit) {
      emit(settingKey, { matchId, value });
    }
    setMatchConfigs((prev) => ({
      ...prev,
      [settingKey]: { ...(prev[settingKey] || {}), active: value },
    }));
  };

  const handleOpenGoLiveStudio = () => {
    onClose?.();
    navigation.navigate(SCREENS.GoLiveSetup, { matchId });
  };

  const handleCopyUrl = async (url) => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert("Copied!", "Live link copied to clipboard.");
    } catch {}
  };

  const handleShare = async (url) => {
    try {
      await Share.share({ message: `Watch the match live here: ${url}` });
    } catch {}
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Derive live state
  const liveMatchData = matchConfigs?.goLive || matchConfigs?.goLiveTournament || {};
  const isLive = !!(liveMatchData?.active && liveMatchData?.url);
  const isTournamentLive = !!liveMatchData?.isTournamentLive;
  const rawUrlKey = liveMatchData?.url || "";
  const publicLiveUrl = rawUrlKey ? `https://criconic.com/go-live/${rawUrlKey}` : "";

  const getSetting = (key) => matchConfigs?.[key] || {};
  const getActive = (key) => {
    const s = getSetting(key);
    return typeof s === "boolean" ? s : !!s?.active;
  };

  // ---- PLAYER SETTINGS SECTION ----
  const renderPlayerSettings = () => (
    <View style={styles.sectionGroup}>
      <ThemedText className="font-normal text-xs" style={[styles.sectionHint, { color: C.textSecondary }]}>
        Manage batting and bowling team configurations
      </ThemedText>
      <ActionButton
        title="Change Bowler"
        icon={RefreshCw}
        variant="ghost"
        isDarkMode={isDarkMode}
        onPress={() => {
          onClose?.();
          navigation.navigate(SCREENS.ChangeBowler, { matchId });
        }}
        style={styles.playerBtn}
      />
      <ActionButton
        title="Change Squad"
        icon={Users}
        variant="ghost"
        isDarkMode={isDarkMode}
        onPress={() => {
          onClose?.();
          navigation.navigate(SCREENS.ChangeSquad, { matchId });
        }}
        style={styles.playerBtn}
      />
    </View>
  );

  // ---- MATCH SETTINGS SECTION ----
  const renderMatchSettings = () => (
    <View style={styles.sectionGroup}>
      <SettingRow
        title="Count No Ball Run"
        description="Include no ball extras in team total"
        value={getActive(MatchSettingEnum.COUNT_NO_BALL_RUN)}
        onToggle={(v) => updateMatchSetting(MatchSettingEnum.COUNT_NO_BALL_RUN, v)}
        isDarkMode={isDarkMode}
      />
      <SettingRow
        title="Count Wide Run"
        description="Include wide extras in team total"
        value={getActive(MatchSettingEnum.COUNT_WIDE_RUN)}
        onToggle={(v) => updateMatchSetting(MatchSettingEnum.COUNT_WIDE_RUN, v)}
        isDarkMode={isDarkMode}
      />
      <SettingRow
        title="Allow Single Batsman"
        description="Continue match with only one batter"
        value={getActive(MatchSettingEnum.SINGLE_BATSMAN_ALLOWED)}
        onToggle={(v) => updateMatchSetting(MatchSettingEnum.SINGLE_BATSMAN_ALLOWED, v)}
        isDarkMode={isDarkMode}
      />
      <View style={[styles.inputRow, { borderBottomColor: C.divider }]}>
        <ThemedText className="font-semibold text-sm" style={{ color: C.text, marginBottom: 4 }}>
          External Streaming Link
        </ThemedText>
        <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary, marginBottom: 8 }}>
          Paste YouTube / Facebook video live stream link
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              borderColor: C.border,
              backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC",
              color: C.text,
            },
          ]}
          value={streamingLink}
          onChangeText={setStreamingLink}
          placeholder="https://youtube.com/..."
          placeholderTextColor={C.textSecondary}
          onBlur={() => updateMatchSetting(MatchSettingEnum.LIVE_STREAMING_LINK, streamingLink)}
        />
      </View>
      <View style={{ marginTop: 8 }}>
        <ActionButton
          title="End Inning"
          icon={Clock}
          variant="danger"
          isDarkMode={isDarkMode}
          onPress={onInningsComplete}
        />
      </View>
    </View>
  );

  // ---- LIVE SETTINGS SECTION ----
  const renderLiveSettings = () => (
    <View style={styles.sectionGroup}>
      {/* Live Status Banner */}
      {isLive ? (
        <View style={styles.liveBanner}>
          <View style={styles.liveDot} />
          <ThemedText className="font-bold text-xs" style={styles.liveBannerText}>
            {isTournamentLive ? "LIVE AS TOURNAMENT" : "LIVE NOW"}
          </ThemedText>
          <TouchableOpacity onPress={handleOpenGoLiveStudio} style={styles.studioMiniBtn}>
            <ThemedText className="font-bold text-xs text-white">Studio</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Official Public Live URL Card */}
      {isLive && !!publicLiveUrl && (
        <View
          style={[
            styles.liveUrlCard,
            {
              backgroundColor: isDarkMode ? "#0F172A" : "#F0FDF4",
              borderColor: "#BBF7D0",
            },
          ]}
        >
          <ThemedText className="font-bold text-xs" style={{ color: COLORS.secondary, marginBottom: 4 }}>
            Broadcast Overlay URL:
          </ThemedText>
          <ThemedText
            className="font-medium text-xs"
            style={[styles.liveUrlText, { color: C.text }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {publicLiveUrl}
          </ThemedText>
          <View style={styles.liveUrlActions}>
            <TouchableOpacity style={styles.liveUrlBtn} onPress={() => handleCopyUrl(publicLiveUrl)}>
              <SafeIcon icon={Copy} size={14} color={COLORS.primary} />
              <ThemedText className="font-bold text-xs" style={{ color: COLORS.primary, marginLeft: 4 }}>
                Copy
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.liveUrlBtn} onPress={() => handleShare(publicLiveUrl)}>
              <SafeIcon icon={Share2} size={14} color={COLORS.secondary} />
              <ThemedText className="font-bold text-xs" style={{ color: COLORS.secondary, marginLeft: 4 }}>
                Share
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Go Live Studio CTA */}
      <ActionButton
        title={isLive ? "Go Live Studio (Ads & Themes)" : "🔴 Go Live Setup"}
        icon={Zap}
        variant={isLive ? "outline" : "primary"}
        isDarkMode={isDarkMode}
        onPress={handleOpenGoLiveStudio}
        style={{ marginBottom: 10 }}
      />

      {/* Broadcast Display Options — ONLY VISIBLE IF MATCH IS LIVE */}
      {isLive ? (
        <>
          <ThemedText className="font-bold text-xs uppercase" style={[styles.subsectionLabel, { color: C.textSecondary }]}>
            Broadcast Display Controls
          </ThemedText>

          <SettingRow
            title="Match Preview"
            description="Pre-match information card overlay"
            value={getActive(MatchSettingEnum.SHOW_MATCH_PREVIEW)}
            onToggle={(v) => emitDisplaySetting(MatchSettingEnum.SHOW_MATCH_PREVIEW, v)}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            title="Toss Info"
            description="Show toss decision banner overlay"
            value={getActive(MatchSettingEnum.SHOW_TOSS)}
            onToggle={(v) => emitDisplaySetting(MatchSettingEnum.SHOW_TOSS, v)}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            title="Playing XI"
            description="Display team squad lineups on screen"
            value={getActive(MatchSettingEnum.SHOW_PLAYING_ELEVEN)}
            onToggle={(v) => emitDisplaySetting(MatchSettingEnum.SHOW_PLAYING_ELEVEN, v)}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            title="Match Summary"
            description="Show live match performance overview"
            value={getActive(MatchSettingEnum.SHOW_MATCH_SUMMARY)}
            onToggle={(v) => emitDisplaySetting(MatchSettingEnum.SHOW_MATCH_SUMMARY, v)}
            isDarkMode={isDarkMode}
          />
          <SettingRow
            title="Partnership"
            description="Display current batting partnership"
            value={getActive(MatchSettingEnum.SHOW_PARTNERSHIP)}
            onToggle={(v) => emitDisplaySetting(MatchSettingEnum.SHOW_PARTNERSHIP, v)}
            isDarkMode={isDarkMode}
          />

          <View
            style={[
              styles.batsmenStatsContainer,
              showBatsmenStats && { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10 },
            ]}
          >
            <SettingRow
              title="Batsmen Stats"
              description="Highlight a batsman's scorecard live"
              value={showBatsmenStats}
              onToggle={(v) => {
                if (showBatsmenStats) {
                  emitDisplaySetting(MatchSettingEnum.SHOW_BATSMEN_STATS, { active: v });
                  setShowBatsmenStats(v);
                } else {
                  setShowBatsmenStats(true);
                }
              }}
              isDarkMode={isDarkMode}
            />
            {showBatsmenStats && (
              <View style={styles.batsmanPicker}>
                <ThemedText className="font-semibold text-xs" style={{ color: C.textSecondary, marginBottom: 8 }}>
                  Select Batsman to Display:
                </ThemedText>
                {(score?.playedBatsman || []).length === 0 ? (
                  <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary }}>
                    No batsman data recorded yet
                  </ThemedText>
                ) : (
                  (score?.playedBatsman || []).map((player, idx) => {
                    const selected =
                      getSetting(MatchSettingEnum.SHOW_BATSMEN_STATS)?.player === player.playerId;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={styles.batsmanOption}
                        onPress={() =>
                          emitDisplaySetting(MatchSettingEnum.SHOW_BATSMEN_STATS, {
                            active: true,
                            player: player.playerId,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            { borderColor: selected ? COLORS.primary : C.border },
                          ]}
                        >
                          {selected && <View style={styles.radioFill} />}
                        </View>
                        <ThemedText className="font-medium text-sm" style={{ color: C.text, marginLeft: 8 }}>
                          {player.name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </View>

          <SettingRow
            title="Comparison Graph"
            description="Run rate comparison chart overlay"
            value={getActive(MatchSettingEnum.SHOW_COMPARISON_GRAPH)}
            onToggle={(v) => emitDisplaySetting(MatchSettingEnum.SHOW_COMPARISON_GRAPH, v)}
            isDarkMode={isDarkMode}
          />
        </>
      ) : (
        <View style={[styles.offlineNotice, { backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9", borderColor: C.border }]}>
          <ThemedText className="font-semibold text-xs text-center" style={{ color: C.textSecondary }}>
            ℹ️ Broadcast display controls (Playing XI, Toss, Batsmen Stats, Comparison Graph) will be unlocked once you go live.
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <View>
          <ThemedText className="font-bold text-xl" style={{ color: C.text }}>
            Match Settings
          </ThemedText>
          <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary, marginTop: 2 }}>
            Manage match configurations & streaming
          </ThemedText>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <SafeIcon icon={X} size={22} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Live & Broadcast Section First for easy access */}
        <AccordionSection
          title={isLive ? "🔴 Live & Broadcast (Active)" : "Live & Broadcast"}
          icon={Radio}
          isExpanded={expandedSections.live}
          onToggle={() => toggleSection("live")}
          isDarkMode={isDarkMode}
        >
          {renderLiveSettings()}
        </AccordionSection>

        {/* Player Settings */}
        <AccordionSection
          title="Player Settings"
          icon={Users}
          isExpanded={expandedSections.player}
          onToggle={() => toggleSection("player")}
          isDarkMode={isDarkMode}
        >
          {renderPlayerSettings()}
        </AccordionSection>

        {/* Match Rules */}
        <AccordionSection
          title="Match Rules"
          icon={Award}
          isExpanded={expandedSections.match}
          onToggle={() => toggleSection("match")}
          isDarkMode={isDarkMode}
        >
          {renderMatchSettings()}
        </AccordionSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  accordionSection: {
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  accordionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  accordionTitle: { fontSize: 15 },
  accordionContent: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1 },
  sectionGroup: { gap: 0 },
  sectionHint: { marginBottom: 10, lineHeight: 18 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingText: { flex: 1, marginRight: 12 },
  inputRow: { paddingVertical: 12, borderBottomWidth: 1 },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  playerBtn: { marginBottom: 8, marginTop: 4 },
  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  liveBannerText: {
    flex: 1,
    color: "#EF4444",
    letterSpacing: 0.8,
  },
  studioMiniBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  liveUrlCard: { borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1 },
  liveUrlText: { marginBottom: 8 },
  liveUrlActions: { flexDirection: "row", gap: 10 },
  liveUrlBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  subsectionLabel: {
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
  },
  batsmenStatsContainer: {},
  batsmanPicker: { marginTop: 8, marginBottom: 4, paddingLeft: 4 },
  batsmanOption: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioFill: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#3B82F6" },
  offlineNotice: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
});

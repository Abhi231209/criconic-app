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
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import {
  ChevronLeft,
  Zap,
  Copy,
  Share2,
  Check,
  Palette,
  Megaphone,
  Radio,
  Trophy,
  X,
  ExternalLink,
} from "lucide-react-native";
import ThemedText from "../custom/ThemedText";
import { request } from "@/utils/api";
import SCREENS from "@/screens";
import { COLORS } from "@/theme/colors";
import { WEB_URL } from "@/config";

// ---- Realistic Scorecard Preview Component ----
function ScorecardPreview({ theme, teamAColor, teamBColor, isDark }) {
  const themeKey = theme?.componentKey || "classic";
  const primaryA = teamAColor?.config?.primaryColor || "#3B82F6";
  const primaryB = teamBColor?.config?.primaryColor || "#10B981";

  const stylesMap = {
    fox: {
      bg: "#1a1a2e",
      header: primaryA,
      accent: primaryB,
      textColor: "#ffffff",
      secondaryText: "#a0aec0",
      border: primaryA,
    },
    ipl: {
      bg: "#0d0d0d",
      header: "#C4A020",
      accent: primaryA,
      textColor: "#ffffff",
      secondaryText: "#b0b0b0",
      border: "#C4A020",
    },
    classic: {
      bg: isDark ? "#1E293B" : "#F8FAFC",
      header: primaryA,
      accent: primaryB,
      textColor: isDark ? "#F1F5F9" : "#1E293B",
      secondaryText: isDark ? "#94A3B8" : "#64748B",
      border: isDark ? "#334155" : "#E2E8F0",
    },
  };
  const s = stylesMap[themeKey] || stylesMap.classic;

  return (
    <View style={[previewStyles.card, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View style={[previewStyles.header, { backgroundColor: s.header }]}>
        <View style={previewStyles.teamRow}>
          <ThemedText className="font-bold" style={previewStyles.teamName}>
            Team A
          </ThemedText>
          <ThemedText className="font-extrabold" style={previewStyles.score}>
            142/4
          </ThemedText>
        </View>
        <View style={[previewStyles.teamRow, { marginTop: 2 }]}>
          <ThemedText className="font-medium" style={[previewStyles.subText, { color: "rgba(255,255,255,0.85)" }]}>
            15.3 ov
          </ThemedText>
          <ThemedText className="font-semibold" style={[previewStyles.subText, { color: "rgba(255,255,255,0.95)" }]}>
            CRR 9.19
          </ThemedText>
        </View>
      </View>
      <View style={previewStyles.section}>
        <ThemedText className="font-bold" style={[previewStyles.sectionTitle, { color: s.accent }]}>
          BATTING
        </ThemedText>
        <View style={previewStyles.statsRow}>
          <ThemedText className="font-medium" style={[previewStyles.playerText, { color: s.textColor }]}>
            V. Kohli *
          </ThemedText>
          <ThemedText className="font-bold" style={[previewStyles.playerText, { color: s.textColor }]}>
            72 (48)
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 8 },
  header: { padding: 12 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamName: { color: "#ffffff", fontSize: 15 },
  score: { color: "#ffffff", fontSize: 20 },
  subText: { fontSize: 12 },
  section: { padding: 10 },
  sectionTitle: { fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  playerText: { fontSize: 13 },
});

// ---- Color Swatch Component ----
function ColorSwatch({ scheme, selected, onPress }) {
  const color = scheme?.config?.primaryColor || "#888888";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        swatchStyles.swatch,
        { backgroundColor: color },
        selected && swatchStyles.selectedSwatch,
      ]}
    >
      {selected && (
        <View style={swatchStyles.checkmark}>
          <Check size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const swatchStyles = StyleSheet.create({
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSwatch: {
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ===== MAIN SCREEN =====
export default function GoLiveSetupScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const isDark = isDarkMode;
  const navigation = useNavigation();
  const route = useRoute();
  const matchId = route.params?.matchId;

  const C = isDarkMode ? COLORS.dark : COLORS.light;

  const [activeTab, setActiveTab] = useState("theme"); // "theme" | "ads" | "mode"
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Match details & Configs
  const [matchDetails, setMatchDetails] = useState({});
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState("classic");
  const [selectedThemeConfig, setSelectedThemeConfig] = useState(null);
  const [colorObject, setColorObject] = useState({});
  const [teamAColor, setTeamAColor] = useState(null);
  const [teamBColor, setTeamBColor] = useState(null);

  // Live Mode: "match" or "tournament"
  const [liveMode, setLiveMode] = useState("match");
  const [tournamentInfo, setTournamentInfo] = useState(null);

  // Ads Config
  const [adsConfig, setAdsConfig] = useState({
    topOfScoreCard: { isEnabled: false, html: "" },
    topRight: { isEnabled: false, html: "" },
    topLeft: { isEnabled: false, html: "" },
    fullScreen: { isEnabled: false, html: "" },
  });

  // Success Modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [generatedLiveUrl, setGeneratedLiveUrl] = useState("");

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!matchId) return;
    setIsLoading(true);
    try {
      // 1. Fetch match details
      const matchRes = await request(`api/matches/${matchId}`, { method: "GET" });
      const mData = matchRes?.data?.data || matchRes?.data || {};
      setMatchDetails(mData);

      if (mData.ads) {
        setAdsConfig((prev) => ({ ...prev, ...mData.ads }));
      }
      if (mData.tournament) {
        setTournamentInfo(mData.tournament);
      }

      // 2. Fetch scorecard themes
      const themesRes = await request("api/scorecardThemes", { method: "GET" });
      const tData = themesRes?.data?.data || themesRes?.data || [];
      const loadedThemes = Array.isArray(tData) && tData.length > 0 ? tData : getFallbackThemes();
      setThemes(loadedThemes);

      // Default theme select
      const initialTheme = loadedThemes[0];
      if (initialTheme) {
        setSelectedTheme(initialTheme._id || initialTheme.id);
        setSelectedThemeConfig(initialTheme);
        setupDefaultColors(initialTheme, mData);
      }
    } catch (err) {
      console.error("Error fetching GoLiveSetup data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getFallbackThemes = () => [
    {
      id: "fox",
      _id: "fox",
      title: "Fox Cricket",
      description: "Broadcast scorecard with team logos & live stats",
      componentKey: "fox",
      defaultColor: { TeamA: "blue", TeamB: "red" },
      colorSchemes: [
        { key: "blue", label: "Blue", config: { primaryColor: "#3b82f6" } },
        { key: "red", label: "Red", config: { primaryColor: "#ef4444" } },
        { key: "green", label: "Green", config: { primaryColor: "#10b981" } },
        { key: "orange", label: "Orange", config: { primaryColor: "#f59e0b" } },
        { key: "purple", label: "Purple", config: { primaryColor: "#8b5cf6" } },
      ],
      isColorSchemeEnabled: true,
      colorSchemeConfigLabels: [
        { key: "TeamA", label: "Team A Color" },
        { key: "TeamB", label: "Team B Color" },
      ],
    },
    {
      id: "ipl",
      _id: "ipl",
      title: "IPL 2025",
      description: "Dynamic T20 premier league style with golden accents",
      componentKey: "ipl",
      defaultColor: { TeamA: "orange", TeamB: "blue" },
      colorSchemes: [
        { key: "blue", label: "Blue", config: { primaryColor: "#3b82f6" } },
        { key: "red", label: "Red", config: { primaryColor: "#ef4444" } },
        { key: "green", label: "Green", config: { primaryColor: "#10b981" } },
        { key: "orange", label: "Orange", config: { primaryColor: "#f59e0b" } },
        { key: "purple", label: "Purple", config: { primaryColor: "#8b5cf6" } },
      ],
      isColorSchemeEnabled: true,
      colorSchemeConfigLabels: [
        { key: "TeamA", label: "Team A Color" },
        { key: "TeamB", label: "Team B Color" },
      ],
    },
    {
      id: "classic",
      _id: "classic",
      title: "Classic Minimal",
      description: "Clean, distraction-free minimalist scorecard",
      componentKey: "classic",
      defaultColor: { TeamA: "blue", TeamB: "green" },
      colorSchemes: [
        { key: "blue", label: "Blue", config: { primaryColor: "#3b82f6" } },
        { key: "red", label: "Red", config: { primaryColor: "#ef4444" } },
        { key: "green", label: "Green", config: { primaryColor: "#10b981" } },
        { key: "orange", label: "Orange", config: { primaryColor: "#f59e0b" } },
        { key: "purple", label: "Purple", config: { primaryColor: "#8b5cf6" } },
      ],
      isColorSchemeEnabled: true,
      colorSchemeConfigLabels: [
        { key: "TeamA", label: "Team A Color" },
        { key: "TeamB", label: "Team B Color" },
      ],
    },
  ];

  const setupDefaultColors = (theme, mData) => {
    if (!theme) return;
    const schemes = theme.colorSchemes || [];
    const teamA = schemes[0];
    const teamB = schemes[1] || schemes[0];
    setTeamAColor(teamA);
    setTeamBColor(teamB);
    const teamAId = mData?.teams?.[0]?.teamId || "teamA";
    const teamBId = mData?.teams?.[1]?.teamId || "teamB";
    setColorObject({
      [teamAId]: teamA,
      [teamBId]: teamB,
    });
  };

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    const th = themes.find((t) => (t._id || t.id) === themeId);
    setSelectedThemeConfig(th);
    setupDefaultColors(th, matchDetails);
  };

  const handleColorChange = (teamSlot, scheme) => {
    if (teamSlot === "TeamA") {
      setTeamAColor(scheme);
      const id = matchDetails?.teams?.[0]?.teamId || "teamA";
      setColorObject((prev) => ({ ...prev, [id]: scheme }));
    } else {
      setTeamBColor(scheme);
      const id = matchDetails?.teams?.[1]?.teamId || "teamB";
      setColorObject((prev) => ({ ...prev, [id]: scheme }));
    }
  };

  const handleAdChange = (slot, key, val) => {
    setAdsConfig((prev) => ({
      ...prev,
      [slot]: {
        ...(prev[slot] || {}),
        [key]: val,
      },
    }));
  };

  // Launch Go Live
  const handleLaunchLive = async () => {
    if (!matchId) return;
    setIsSaving(true);
    try {
      // 1. Save Ads configuration
      await request(`api/matches/${matchId}`, {
        method: "PUT",
        data: {
          updateField: { ads: adsConfig },
        },
      });

      // 2. Save Theme configuration
      if (selectedThemeConfig) {
        await request(`api/matches/updateScoreCardTheme/${matchId}`, {
          method: "PUT",
          data: {
            match: matchId,
            configToUpdate: {
              colorConfig: colorObject,
              selectedTheme: selectedThemeConfig,
            },
          },
        });
      }

      // 3. Trigger Go Live API
      const isTournLive = liveMode === "tournament" && !!tournamentInfo?.slug;
      const goLiveRes = await request("api/matches/public/go-live", {
        method: "POST",
        data: {
          match: matchId,
          userStream: isTournLive,
          key: isTournLive ? tournamentInfo.slug : undefined,
        },
      });

      // 4. Fetch latest live URL
      const configRes = await request(`api/matches/${matchId}/public/config`, { method: "GET" });
      const liveData = configRes?.data?.content?.goLive || configRes?.data?.content?.goLiveTournament || {};
      const liveKey = liveData?.url || goLiveRes?.data?.matchId?.url || matchId;
      const fullUrl = `${WEB_URL}/go-live/${liveKey}`;

      setGeneratedLiveUrl(fullUrl);
      setSuccessModalVisible(true);
    } catch (err) {
      console.error("handleLaunchLive error:", err);
      Alert.alert("Error", "Could not start live stream. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied!", "Live stream link copied to clipboard.");
  };

  const handleShare = async (text) => {
    try {
      await Share.share({ message: `Watch our cricket match live here: ${text}` });
    } catch {}
  };

  // ---- TABS CONTENT ----
  const renderThemeTab = () => (
    <View style={{ gap: 16 }}>
      <ThemedText className="font-semibold text-sm" style={{ color: C.textSecondary }}>
        Choose your broadcast scorecard layout & preview graphics
      </ThemedText>

      {themes.map((theme) => {
        const id = theme._id || theme.id;
        const isSelected = selectedTheme === id;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => handleThemeSelect(id)}
            activeOpacity={0.7}
            style={[
              styles.themeCard,
              {
                backgroundColor: C.card,
                borderColor: isSelected ? COLORS.primary : C.border,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
          >
            <View style={styles.themeHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText className="font-bold text-base" style={{ color: C.text }}>
                  {theme.title}
                </ThemedText>
                <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary, marginTop: 2 }}>
                  {theme.description}
                </ThemedText>
              </View>
              <View style={[styles.radioCircle, { borderColor: isSelected ? COLORS.primary : C.border }]}>
                {isSelected && <View style={styles.radioFill} />}
              </View>
            </View>

            <ScorecardPreview
              theme={theme}
              teamAColor={isSelected ? teamAColor : null}
              teamBColor={isSelected ? teamBColor : null}
              isDark={isDark}
            />
          </TouchableOpacity>
        );
      })}

      {/* Team Color Pickers */}
      <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <ThemedText className="font-bold text-base" style={{ color: C.text, marginBottom: 12 }}>
          Team Color Palette
        </ThemedText>

        <View style={{ marginBottom: 14 }}>
          <ThemedText className="font-semibold text-sm" style={{ color: C.text, marginBottom: 6 }}>
            {matchDetails?.teams?.[0]?.title || "Team A"} Color
          </ThemedText>
          <View style={styles.swatchRow}>
            {(selectedThemeConfig?.colorSchemes || []).map((scheme) => (
              <ColorSwatch
                key={scheme.key}
                scheme={scheme}
                selected={teamAColor?.key === scheme.key}
                onPress={() => handleColorChange("TeamA", scheme)}
              />
            ))}
          </View>
        </View>

        <View>
          <ThemedText className="font-semibold text-sm" style={{ color: C.text, marginBottom: 6 }}>
            {matchDetails?.teams?.[1]?.title || "Team B"} Color
          </ThemedText>
          <View style={styles.swatchRow}>
            {(selectedThemeConfig?.colorSchemes || []).map((scheme) => (
              <ColorSwatch
                key={scheme.key}
                scheme={scheme}
                selected={teamBColor?.key === scheme.key}
                onPress={() => handleColorChange("TeamB", scheme)}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderAdsTab = () => {
    const adSlots = [
      {
        key: "topOfScoreCard",
        title: "Top of Scorecard",
        desc: "Banner displayed directly above the live scorecard",
        placeholder: "<div>Sponsor Name / Banner HTML</div>",
      },
      {
        key: "topRight",
        title: "Top Right Logo / Ad",
        desc: "Floating sponsor overlay in top right corner",
        placeholder: "<img src='...' /> or Sponsor Text",
      },
      {
        key: "topLeft",
        title: "Top Left Logo / Ad",
        desc: "Floating sponsor overlay in top left corner",
        placeholder: "<img src='...' /> or Sponsor Text",
      },
      {
        key: "fullScreen",
        title: "Fullscreen Break / Ad",
        desc: "Overlay between overs or during innings breaks",
        placeholder: "<div>Break Sponsor HTML</div>",
      },
    ];

    return (
      <View style={{ gap: 14 }}>
        <ThemedText className="font-semibold text-sm" style={{ color: C.textSecondary }}>
          Configure sponsor banners, promotional ads, or logos for your live stream overlay.
        </ThemedText>

        {adSlots.map((slot) => {
          const cfg = adsConfig[slot.key] || {};
          return (
            <View
              key={slot.key}
              style={[styles.adCard, { backgroundColor: C.card, borderColor: C.border }]}
            >
              <View style={styles.adHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <ThemedText className="font-bold text-sm" style={{ color: C.text }}>
                    {slot.title}
                  </ThemedText>
                  <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary, marginTop: 2 }}>
                    {slot.desc}
                  </ThemedText>
                </View>
                <Switch
                  value={!!cfg.isEnabled}
                  onValueChange={(val) => handleAdChange(slot.key, "isEnabled", val)}
                  thumbColor={cfg.isEnabled ? COLORS.primary : "#CBD5E1"}
                  trackColor={{ false: isDarkMode ? "#334155" : "#E2E8F0", true: "#93C5FD" }}
                />
              </View>

              {cfg.isEnabled && (
                <View style={{ marginTop: 10 }}>
                  <ThemedText className="font-medium text-xs" style={{ color: C.textSecondary, marginBottom: 4 }}>
                    HTML or Text Content:
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.adInput,
                      {
                        backgroundColor: C.inputBg,
                        borderColor: C.border,
                        color: C.text,
                      },
                    ]}
                    multiline
                    numberOfLines={3}
                    placeholder={slot.placeholder}
                    placeholderTextColor={C.textSecondary}
                    value={cfg.html || ""}
                    onChangeText={(txt) => handleAdChange(slot.key, "html", txt)}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderLiveModeTab = () => {
    const hasTournament = !!tournamentInfo?.slug || !!matchDetails?.tournament;
    return (
      <View style={{ gap: 14 }}>
        <ThemedText className="font-semibold text-sm" style={{ color: C.textSecondary }}>
          Select how you want to broadcast this match
        </ThemedText>

        {/* Option 1: Match Live */}
        <TouchableOpacity
          style={[
            styles.modeCard,
            {
              backgroundColor: C.card,
              borderColor: liveMode === "match" ? COLORS.primary : C.border,
              borderWidth: liveMode === "match" ? 2 : 1,
            },
          ]}
          onPress={() => setLiveMode("match")}
          activeOpacity={0.7}
        >
          <View style={styles.modeIconCircle}>
            <Radio size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText className="font-bold text-base" style={{ color: C.text }}>
              Standard Match Live
            </ThemedText>
            <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary, marginTop: 2 }}>
              Creates an exclusive live scorecard overlay link for this match
            </ThemedText>
          </View>
          <View style={[styles.radioCircle, { borderColor: liveMode === "match" ? COLORS.primary : C.border }]}>
            {liveMode === "match" && <View style={styles.radioFill} />}
          </View>
        </TouchableOpacity>

        {/* Option 2: Tournament Live */}
        <TouchableOpacity
          style={[
            styles.modeCard,
            {
              backgroundColor: C.card,
              borderColor: liveMode === "tournament" ? COLORS.primary : C.border,
              borderWidth: liveMode === "tournament" ? 2 : 1,
              opacity: hasTournament ? 1 : 0.6,
            },
          ]}
          onPress={() => {
            if (hasTournament) {
              setLiveMode("tournament");
            } else {
              Alert.alert("Tournament Required", "This match is not part of a tournament.");
            }
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.modeIconCircle, { backgroundColor: "#FEF3C7" }]}>
            <Trophy size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText className="font-bold text-base" style={{ color: C.text }}>
              Live as Tournament
            </ThemedText>
            <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary, marginTop: 2 }}>
              {hasTournament
                ? `Streams live under tournament '${tournamentInfo?.title || "Tournament"}' link`
                : "Attach this match to a tournament to broadcast under the tournament page"}
            </ThemedText>
          </View>
          <View style={[styles.radioCircle, { borderColor: liveMode === "tournament" ? COLORS.primary : C.border }]}>
            {liveMode === "tournament" && <View style={styles.radioFill} />}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <ThemedText className="font-bold text-lg" style={{ color: C.text }}>
            Go Live Studio
          </ThemedText>
          <ThemedText className="font-normal text-xs" style={{ color: C.textSecondary }}>
            Configure overlay, ads & broadcast live
          </ThemedText>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        {[
          { key: "theme", label: "Overlay & Theme", icon: Palette },
          { key: "ads", label: "Sponsor Ads", icon: Megaphone },
          { key: "mode", label: "Live Mode", icon: Radio },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabItem, isActive && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
              activeOpacity={0.75}
            >
              <Icon size={16} color={isActive ? COLORS.primary : C.textSecondary} />
              <ThemedText
                className={isActive ? "font-bold text-xs" : "font-medium text-xs"}
                style={{ color: isActive ? COLORS.primary : C.textSecondary, marginLeft: 6 }}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Content */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ paddingVertical: 50, alignItems: "center" }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <ThemedText className="font-medium text-sm" style={{ color: C.textSecondary, marginTop: 12 }}>
              Loading Go Live studio...
            </ThemedText>
          </View>
        ) : (
          <>
            {activeTab === "theme" && renderThemeTab()}
            {activeTab === "ads" && renderAdsTab()}
            {activeTab === "mode" && renderLiveModeTab()}
          </>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[styles.launchBtn, { backgroundColor: COLORS.live }]}
          onPress={handleLaunchLive}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Zap size={18} color="#ffffff" />
              <ThemedText className="font-bold text-base text-white" style={{ marginLeft: 8 }}>
                Launch Live Stream
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Live Modal */}
      <Modal visible={successModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.successModal, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.successBadge}>
              <View style={styles.pulseDot} />
              <ThemedText className="font-extrabold text-sm text-red-600">LIVE NOW</ThemedText>
            </View>

            <ThemedText className="font-bold text-xl" style={{ color: C.text, textAlign: "center", marginTop: 12 }}>
              Match Stream is Live!
            </ThemedText>
            <ThemedText
              className="font-normal text-xs"
              style={{ color: C.textSecondary, textAlign: "center", marginTop: 4, paddingHorizontal: 10 }}
            >
              Share this live broadcast link with fans, players, and viewers to watch real-time overlay scores:
            </ThemedText>

            {/* Generated URL Box */}
            <View style={[styles.urlBox, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <ThemedText className="font-semibold text-xs" style={{ color: COLORS.primary, flex: 1 }} numberOfLines={1}>
                {generatedLiveUrl}
              </ThemedText>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { borderColor: COLORS.primary, borderWidth: 1.5 }]}
                onPress={() => handleCopy(generatedLiveUrl)}
              >
                <Copy size={16} color={COLORS.primary} />
                <ThemedText className="font-bold text-sm" style={{ color: COLORS.primary, marginLeft: 6 }}>
                  Copy Link
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => handleShare(generatedLiveUrl)}
              >
                <Share2 size={16} color="#ffffff" />
                <ThemedText className="font-bold text-sm text-white" style={{ marginLeft: 6 }}>
                  Share Link
                </ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: isDarkMode ? "#334155" : "#E2E8F0" }]}
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.goBack();
              }}
            >
              <ThemedText className="font-bold text-sm" style={{ color: C.text }}>
                Back to Scoring
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  tabsBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  themeCard: {
    borderRadius: 14,
    padding: 14,
    overflow: "hidden",
  },
  themeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  adCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  adHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    textAlignVertical: "top",
    minHeight: 65,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  modeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  launchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModal: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  urlBox: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
  },
});

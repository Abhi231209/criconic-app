import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  useColorScheme,
  Alert,
  Dimensions,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { request } from '@/utils/api';
import { ChevronLeft, Check, Sparkles, Sliders } from 'lucide-react-native';
import DesktopOverlayPreview, { THEME_STRIP_PREVIEWS } from './DesktopOverlayPreview';

const { width } = Dimensions.get('window');

// ---- Color Swatch Component ----
function ColorSwatch({ scheme, selected, onPress }) {
  const primaryColor = scheme?.config?.primaryColor || '#888888';
  const svgColor = scheme?.config?.svgColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        swatchStyles.swatch,
        { backgroundColor: primaryColor },
        selected && swatchStyles.selectedSwatch,
      ]}
    >
      {/* Mini accent dot if available */}
      {svgColor && svgColor !== primaryColor && !selected && (
        <View style={[swatchStyles.accentDot, { backgroundColor: svgColor }]} />
      )}
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
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  selectedSwatch: {
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    transform: [{ scale: 1.08 }],
  },
  accentDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Built-in broadcast themes matching backend ScorecardThemes
const BUILT_IN_THEMES = [
  {
    id: 'fox',
    _id: 'fox',
    title: 'Fox Cricket',
    description: 'Professional broadcast lower-third scorecard with batting partnership & bowler figures',
    componentKey: 'FoxCricketScorecard',
    defaultColor: { TeamA: 'blue', TeamB: 'red' },
    isColorSchemeEnabled: true,
    colorSchemeConfigLabels: [
      { key: 'TeamA', label: 'Team A Color', defaultValue: 'blue' },
      { key: 'TeamB', label: 'Team B Color', defaultValue: 'red' },
    ],
    colorSchemes: [
      { key: 'blue', label: 'Classic Blue', config: { primaryColor: '#2563EB', svgColor: '#60A5FA', textColor: '#FFFFFF' } },
      { key: 'red', label: 'Crimson Red', config: { primaryColor: '#DC2626', svgColor: '#F87171', textColor: '#FFFFFF' } },
      { key: 'green', label: 'Emerald Green', config: { primaryColor: '#059669', svgColor: '#34D399', textColor: '#FFFFFF' } },
      { key: 'orange', label: 'Sunset Orange', config: { primaryColor: '#D97706', svgColor: '#FBBF24', textColor: '#FFFFFF' } },
      { key: 'purple', label: 'Royal Purple', config: { primaryColor: '#7C3AED', svgColor: '#A78BFA', textColor: '#FFFFFF' } },
      { key: 'cyan', label: 'Cyan Sky', config: { primaryColor: '#0891B2', svgColor: '#38BDF8', textColor: '#FFFFFF' } },
      { key: 'dark', label: 'Slate Dark', config: { primaryColor: '#334155', svgColor: '#94A3B8', textColor: '#FFFFFF' } },
    ],
  },
  {
    id: 'ipl',
    _id: 'ipl',
    title: 'IPL 2025',
    description: 'Vibrant T20 premier league style graphics with angled team badges & dual-color gradients',
    componentKey: 'Ipl2025Scorecard',
    defaultColor: { TeamA: 'mumbai', TeamB: 'chennai' },
    isColorSchemeEnabled: true,
    colorSchemeConfigLabels: [
      { key: 'TeamA', label: 'Team A Color', defaultValue: 'mumbai' },
      { key: 'TeamB', label: 'Team B Color', defaultValue: 'chennai' },
    ],
    colorSchemes: [
      { key: 'mumbai', label: 'Mumbai Blue & Gold', config: { primaryColor: '#004BA0', svgColor: '#FDB913', textColor: '#FFFFFF' } },
      { key: 'chennai', label: 'Chennai Super Gold', config: { primaryColor: '#FDB913', svgColor: '#004BA0', textColor: '#000000' } },
      { key: 'rcb', label: 'Bangalore Red & Gold', config: { primaryColor: '#D32F2F', svgColor: '#FDB913', textColor: '#FFFFFF' } },
      { key: 'kkr', label: 'Kolkata Purple & Gold', config: { primaryColor: '#3A225D', svgColor: '#D1AB3E', textColor: '#FFFFFF' } },
      { key: 'srh', label: 'Hyderabad Orange', config: { primaryColor: '#F26522', svgColor: '#000000', textColor: '#FFFFFF' } },
      { key: 'gt', label: 'Gujarat Navy', config: { primaryColor: '#1B2133', svgColor: '#C4A020', textColor: '#FFFFFF' } },
      { key: 'rr', label: 'Rajasthan Pink', config: { primaryColor: '#EA1A85', svgColor: '#254AA5', textColor: '#FFFFFF' } },
      { key: 'lsg', label: 'Lucknow Cyan', config: { primaryColor: '#00A3E0', svgColor: '#FF6B00', textColor: '#FFFFFF' } },
      { key: 'dc', label: 'Delhi Blue & Red', config: { primaryColor: '#004C97', svgColor: '#D32F2F', textColor: '#FFFFFF' } },
    ],
  },
];

// ============ Main Component ============
export default function ThemeConfig() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const route = useRoute();
  const matchId = route.params?.matchId;
  const isDark = colorScheme === 'dark';

  const C = {
    bg: isDark ? '#0F172A' : '#FFFFFF',
    card: isDark ? '#1E293B' : '#F8FAFC',
    text: isDark ? '#F1F5F9' : '#1E293B',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    primary: '#3B82F6',
  };

  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedThemeFullConfig, setSelectedThemeFullConfig] = useState(null);
  const [themes, setThemes] = useState(BUILT_IN_THEMES);
  const [matchDetails, setMatchDetails] = useState({});
  const [colorObject, setColorObject] = useState({});
  const [placeholderMap, setPlaceholderMap] = useState({});
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('theme');
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);

  // Per-team selected color (for live preview display)
  const [teamAColor, setTeamAColor] = useState(null);
  const [teamBColor, setTeamBColor] = useState(null);

  const teamAName = matchDetails?.teams?.[0]?.title || 'Team A';
  const teamBName = matchDetails?.teams?.[1]?.title || 'Team B';

  const getThemes = async () => {
    setIsLoadingThemes(true);
    try {
      const res = await request('api/scorecardThemes', { method: 'GET' });
      const data = res?.data?.data || res?.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setThemes(
          data.map((item) => ({
            id: item._id || item.id || item.componentKey,
            ...item,
          }))
        );
      } else {
        setThemes(BUILT_IN_THEMES);
      }
    } catch (error) {
      console.log('Error fetching themes from API, using built-in themes:', error);
      setThemes(BUILT_IN_THEMES);
    } finally {
      setIsLoadingThemes(false);
    }
  };

  const getMatchDetails = async () => {
    if (!matchId) return;
    try {
      const res = await request(`api/matches/${matchId}`, { method: 'GET' });
      if (res?.data) {
        const data = res.data.data || res.data;
        const formattedTeams = [
          {
            teamId: data?.teams?.[0]?.teamId || data?.firstBattingTeam?._id || 'team1',
            title: data?.teams?.[0]?.title || data?.teams?.[0]?.name || data?.firstBattingTeam?.title || 'Team A',
          },
          {
            teamId: data?.teams?.[1]?.teamId || data?.secondBattingTeam?._id || 'team2',
            title: data?.teams?.[1]?.title || data?.teams?.[1]?.name || data?.secondBattingTeam?.title || 'Team B',
          },
        ];
        setMatchDetails({
          ...data,
          teams: formattedTeams,
        });
      }
    } catch (error) {
      console.error('Error fetching match details:', error);
    }
  };

  const getLiveConfig = async () => {
    if (!matchId) return;
    try {
      const res = await request(`api/matches/${matchId}/public/config`, { method: 'GET' });
      const content = res?.data?.content || res?.data;
      if (content?.goLiveTournament?.themeConfigByMatch?.[matchId]) {
        const configDetails = content.goLiveTournament.themeConfigByMatch[matchId];
        if (configDetails.selectedTheme) {
          const storedTheme = configDetails.selectedTheme;
          const themeId = storedTheme._id || storedTheme.id || storedTheme.componentKey;
          setSelectedTheme(themeId);
          setSelectedThemeFullConfig(storedTheme);
        }
        if (configDetails.colorConfig) {
          setColorObject(configDetails.colorConfig);
          // Set teamAColor & teamBColor from stored colors
          const keys = Object.keys(configDetails.colorConfig);
          if (keys.length > 0) {
            setTeamAColor(configDetails.colorConfig[keys[0]] || configDetails.colorConfig['TeamA']);
          }
          if (keys.length > 1) {
            setTeamBColor(configDetails.colorConfig[keys[1]] || configDetails.colorConfig['TeamB']);
          }
        }
      }
    } catch (e) {
      console.log('Error fetching live config:', e);
    }
  };

  const saveConfig = async () => {
    if (!selectedThemeFullConfig) {
      Alert.alert('Select Theme', 'Please select a theme before saving.');
      return;
    }
    setIsButtonLoading(true);
    try {
      const configObject = {
        colorConfig: { ...colorObject },
        selectedTheme: { ...selectedThemeFullConfig },
      };
      const res = await request(`api/matches/updateScoreCardTheme/${matchId}`, {
        method: 'PUT',
        data: { match: matchId || '', configToUpdate: configObject },
      });
      if (res?.data?.success || res?.status === 200) {
        Alert.alert('Saved!', res?.data?.message || 'Theme configuration saved successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to save configuration');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to save configuration');
    } finally {
      setIsButtonLoading(false);
    }
  };

  const expandDefaultColors = (defaultColor, schemes) => {
    if (!defaultColor) return {};
    const schemeMap = Object.fromEntries(schemes.map((s) => [s.key, s]));
    const result = {};
    Object.entries(defaultColor).forEach(([ph, key]) => {
      result[ph] = schemeMap[key] || null;
    });
    return result;
  };

  const handleThemeSelect = (id) => {
    setSelectedTheme(id);
    const theme = themes.find((t) => (t._id === id || t.id === id || t.componentKey === id)) || null;
    setSelectedThemeFullConfig(theme);

    if (theme) {
      const placeholders = Object.keys(theme.defaultColor || {});
      const teams = matchDetails.teams || [];
      const phMap = {};
      placeholders.forEach((ph, idx) => {
        if (teams[idx]) phMap[ph] = teams[idx];
      });
      setPlaceholderMap(phMap);

      const expanded = expandDefaultColors(theme.defaultColor, theme.colorSchemes || []);
      const mappedColors = {};
      Object.entries(expanded).forEach(([ph, scheme]) => {
        const team = phMap[ph];
        if (team) mappedColors[team.teamId] = scheme;
        mappedColors[ph] = scheme; // Keep placeholder fallback
      });
      setColorObject(mappedColors);

      // Set preview colors
      const colorA = expanded['TeamA'] || (theme.colorSchemes || [])[0];
      const colorB = expanded['TeamB'] || (theme.colorSchemes || [])[1] || (theme.colorSchemes || [])[0];
      setTeamAColor(colorA);
      setTeamBColor(colorB);
    }
  };

  const onColorChange = (teamId, scheme, slot) => {
    setColorObject((prev) => ({
      ...prev,
      [teamId]: scheme,
      [slot]: scheme,
    }));
    if (slot === 'TeamA') setTeamAColor(scheme);
    if (slot === 'TeamB') setTeamBColor(scheme);
  };

  useEffect(() => {
    getThemes();
    getMatchDetails();
    getLiveConfig();
  }, []);

  // Set default theme when themes load if none selected
  useEffect(() => {
    if (!selectedTheme && themes.length > 0) {
      handleThemeSelect(themes[0]._id || themes[0].id || themes[0].componentKey);
    }
  }, [themes]);

  // ---- THEME TAB ----
  const renderThemeTab = () => {
    if (isLoadingThemes) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.textSecondary, marginTop: 12 }}>Loading themes...</Text>
        </View>
      );
    }

    return (
      <View style={{ gap: 14, marginTop: 8 }}>
        {themes.map((theme) => {
          const themeId = theme._id || theme.id || theme.componentKey;
          const isSelected = selectedTheme === themeId;
          const isIplTheme = (theme.componentKey || theme.id || '').toLowerCase().includes('ipl');

          return (
            <TouchableOpacity
              key={themeId}
              onPress={() => handleThemeSelect(themeId)}
              activeOpacity={0.8}
              style={[
                themeStyles.card,
                {
                  backgroundColor: C.card,
                  borderColor: isSelected ? C.primary : C.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              {/* Card Header */}
              <View style={themeStyles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[themeStyles.cardTitle, { color: C.text }]}>{theme.title}</Text>
                    {isSelected && (
                      <View style={themeStyles.activeBadge}>
                        <Text style={themeStyles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[themeStyles.cardDesc, { color: C.textSecondary }]}>
                    {theme.description}
                  </Text>
                </View>
                <View style={[
                  themeStyles.radioCircle,
                  { borderColor: isSelected ? C.primary : C.border },
                ]}>
                  {isSelected && <View style={[themeStyles.radioFill, { backgroundColor: C.primary }]} />}
                </View>
              </View>

              {/* Authentic Lower-Third Overlay Image Preview */}
              <View style={themeStyles.previewWrapper}>
                <ScrollView
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  contentContainerStyle={themeStyles.previewContent}
                >
                  <Image
                    source={isIplTheme ? THEME_STRIP_PREVIEWS.ipl : THEME_STRIP_PREVIEWS.fox}
                    style={themeStyles.stripImage}
                    resizeMode="cover"
                  />
                </ScrollView>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ---- COLOR TAB ----
  const renderColorTab = () => {
    if (!selectedThemeFullConfig) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ color: C.textSecondary, fontSize: 15 }}>
            Please select a theme first
          </Text>
        </View>
      );
    }

    const { colorSchemeConfigLabels = [], colorSchemes = [], isColorSchemeEnabled } = selectedThemeFullConfig;

    if (!isColorSchemeEnabled) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ color: C.textSecondary }}>This theme doesn't support custom colors</Text>
        </View>
      );
    }

    const teams = matchDetails.teams || [];

    return (
      <View style={{ gap: 16, marginTop: 8 }}>
        {colorSchemeConfigLabels.map((cfg, index) => {
          const team = teams[index];
          const teamId = team?.teamId || cfg.key;
          const teamTitle = team?.title || cfg.label;
          const slot = cfg.key; // 'TeamA' or 'TeamB'

          // Active color key
          const currentColorKey =
            colorObject[teamId]?.key ||
            colorObject[slot]?.key ||
            (slot === 'TeamA' ? teamAColor?.key : teamBColor?.key);

          return (
            <View key={index} style={[colorStyles.section, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={colorStyles.sectionHeader}>
                <View style={[
                  colorStyles.teamColorIndicator,
                  {
                    backgroundColor:
                      (slot === 'TeamA' ? teamAColor?.config?.primaryColor : teamBColor?.config?.primaryColor) ||
                      C.primary,
                  },
                ]} />
                <View style={{ flex: 1 }}>
                  <Text style={[colorStyles.teamName, { color: C.text }]}>{teamTitle}</Text>
                  <Text style={[colorStyles.label, { color: C.textSecondary }]}>
                    Choose {cfg.label} scheme (updates live above)
                  </Text>
                </View>
              </View>

              {/* Swatches Grid */}
              <View style={colorStyles.swatchRow}>
                {colorSchemes.map((scheme) => (
                  <ColorSwatch
                    key={scheme.key}
                    scheme={scheme}
                    selected={currentColorKey === scheme.key}
                    onPress={() => onColorChange(teamId, scheme, slot)}
                  />
                ))}
              </View>

              {/* Active Color Info */}
              {currentColorKey && (
                <View style={colorStyles.selectedRow}>
                  <Text style={[colorStyles.selectedLabel, { color: C.textSecondary }]}>
                    Selected:{' '}
                    <Text style={{ color: C.text, fontWeight: '700' }}>
                      {colorSchemes.find((s) => s.key === currentColorKey)?.label || currentColorKey}
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Top Header */}
      <View style={[headerStyles.header, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={headerStyles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[headerStyles.title, { color: C.text }]}>Overlay Setup</Text>
          <Text style={[headerStyles.subtitle, { color: C.textSecondary }]}>
            Live broadcast overlay (16:9 desktop canvas)
          </Text>
        </View>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      >
        {/* Sticky-Style Live 16:9 Broadcast Monitor Preview */}
        <DesktopOverlayPreview
          theme={selectedThemeFullConfig || themes[0]}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          teamAName={teamAName}
          teamBName={teamBName}
          isDark={isDark}
        />

        {/* Mode Tabs */}
        <View style={[tabStyles.tabRow, { backgroundColor: C.card, borderColor: C.border }]}>
          {['theme', 'color'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                tabStyles.tab,
                activeTab === tab && {
                  backgroundColor: isDark ? '#334155' : '#E2E8F0',
                  borderRadius: 8,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  tabStyles.tabText,
                  { color: activeTab === tab ? C.primary : C.textSecondary },
                  activeTab === tab && { fontWeight: '700' },
                ]}
              >
                {tab === 'theme' ? '🎨 Broadcast Themes' : '🖌️ Team Colors'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'theme' && renderThemeTab()}
        {activeTab === 'color' && renderColorTab()}
      </ScrollView>

      {/* Save Button Footer */}
      <View
        style={[
          saveStyles.footer,
          {
            backgroundColor: C.bg,
            borderTopColor: C.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            saveStyles.saveBtn,
            { backgroundColor: selectedThemeFullConfig ? C.primary : C.border },
          ]}
          onPress={saveConfig}
          disabled={isButtonLoading || !selectedThemeFullConfig}
          activeOpacity={0.8}
        >
          {isButtonLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={saveStyles.saveBtnText}>
              {selectedThemeFullConfig ? '💾 Save Overlay Theme' : 'Select a theme first'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const themeStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  activeBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#3B82F6',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 2,
  },
  radioFill: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  previewWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 6,
    backgroundColor: '#070A0F',
  },
  previewContent: {
    minWidth: '100%',
  },
  stripImage: {
    width: Math.max(width - 56, 560),
    height: 52,
    borderRadius: 6,
  },
});

const colorStyles = StyleSheet.create({
  section: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  teamColorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  teamName: {
    fontSize: 15,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  selectedRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 0.8,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  selectedLabel: {
    fontSize: 12,
  },
});

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
  },
});

const tabStyles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const saveStyles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});

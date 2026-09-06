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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { request } from '@/utils/api';
import { ChevronLeft, Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ---- Realistic Scorecard Preview ----
function ScorecardPreview({ theme, teamAColor, teamBColor, isDark }) {
  const themeKey = theme?.componentKey || 'classic';
  
  // Build color values
  const primaryA = teamAColor?.config?.primaryColor || '#3B82F6';
  const primaryB = teamBColor?.config?.primaryColor || '#10B981';

  const previewStyles = {
    fox: {
      bg: '#1a1a2e',
      header: primaryA,
      accent: primaryB,
      textColor: '#ffffff',
      secondaryText: '#a0aec0',
      border: primaryA,
    },
    ipl: {
      bg: '#0d0d0d',
      header: '#C4A020',
      accent: primaryA,
      textColor: '#ffffff',
      secondaryText: '#b0b0b0',
      border: '#C4A020',
    },
    classic: {
      bg: isDark ? '#1E293B' : '#F8FAFC',
      header: primaryA,
      accent: primaryB,
      textColor: isDark ? '#F1F5F9' : '#1E293B',
      secondaryText: isDark ? '#94A3B8' : '#64748B',
      border: isDark ? '#334155' : '#E2E8F0',
    },
  };
  const s = previewStyles[themeKey] || previewStyles.classic;

  return (
    <View style={[previewStyles_styles.card, { backgroundColor: s.bg, borderColor: s.border }]}>
      {/* Team Header */}
      <View style={[previewStyles_styles.header, { backgroundColor: s.header }]}>
        <View style={previewStyles_styles.teamRow}>
          <Text style={previewStyles_styles.teamName}>Team A</Text>
          <Text style={previewStyles_styles.score}>142/4</Text>
        </View>
        <View style={[previewStyles_styles.teamRow, { marginTop: 2 }]}>
          <Text style={[previewStyles_styles.overs, { color: 'rgba(255,255,255,0.8)' }]}>15.3 ov</Text>
          <Text style={[previewStyles_styles.crr, { color: 'rgba(255,255,255,0.9)' }]}>CRR 9.19</Text>
        </View>
      </View>

      {/* Batting */}
      <View style={previewStyles_styles.section}>
        <Text style={[previewStyles_styles.sectionTitle, { color: s.accent }]}>BATTING</Text>
        <View style={previewStyles_styles.statsRow}>
          <Text style={[previewStyles_styles.playerName, { color: s.textColor }]}>V. Kohli *</Text>
          <Text style={[previewStyles_styles.statValue, { color: s.textColor }]}>72 (48)</Text>
        </View>
        <View style={previewStyles_styles.statsRow}>
          <Text style={[previewStyles_styles.playerName, { color: s.secondaryText }]}>R. Sharma</Text>
          <Text style={[previewStyles_styles.statValue, { color: s.secondaryText }]}>38 (27)</Text>
        </View>
      </View>

      {/* Bowling */}
      <View style={[previewStyles_styles.section, { borderTopWidth: 1, borderTopColor: s.border }]}>
        <Text style={[previewStyles_styles.sectionTitle, { color: s.accent }]}>BOWLING</Text>
        <View style={previewStyles_styles.statsRow}>
          <Text style={[previewStyles_styles.playerName, { color: s.textColor }]}>J. Bumrah</Text>
          <Text style={[previewStyles_styles.statValue, { color: s.textColor }]}>2-24 (3)</Text>
        </View>
      </View>
    </View>
  );
}

const previewStyles_styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  header: {
    padding: 14,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  score: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  overs: {
    fontSize: 13,
  },
  crr: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

// ---- Color Swatch ----
function ColorSwatch({ scheme, selected, onPress }) {
  const color = scheme?.config?.primaryColor || '#888888';
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSwatch: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============ Main Component ============
export default function ThemeConfig() {
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
  const [themes, setThemes] = useState([]);
  const [matchDetails, setMatchDetails] = useState({});
  const [colorObject, setColorObject] = useState({});
  const [placeholderMap, setPlaceholderMap] = useState({});
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('theme');
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);

  // Per-team selected color (for preview display)
  const [teamAColor, setTeamAColor] = useState(null);
  const [teamBColor, setTeamBColor] = useState(null);

  const getThemes = async () => {
    setIsLoadingThemes(true);
    try {
      const res = await request('api/scorecardThemes', { method: 'GET' });
      const data = res?.data?.data || res?.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setThemes(
          data.map((item) => ({
            id: item._id || item.id,
            ...item,
          }))
        );
      } else {
        // Fallback built-in themes when API returns empty
        setThemes([
          {
            id: 'fox',
            _id: 'fox',
            title: 'Fox Cricket',
            description: 'Professional broadcast scorecard',
            componentKey: 'fox',
            defaultColor: { TeamA: 'blue', TeamB: 'red' },
            colorSchemes: [
              { key: 'blue', label: 'Blue', config: { primaryColor: '#3b82f6' } },
              { key: 'red', label: 'Red', config: { primaryColor: '#ef4444' } },
              { key: 'green', label: 'Green', config: { primaryColor: '#10b981' } },
              { key: 'orange', label: 'Orange', config: { primaryColor: '#f59e0b' } },
              { key: 'purple', label: 'Purple', config: { primaryColor: '#8b5cf6' } },
            ],
            isColorSchemeEnabled: true,
            colorSchemeConfigLabels: [
              { key: 'TeamA', label: 'Team A Color' },
              { key: 'TeamB', label: 'Team B Color' },
            ],
          },
          {
            id: 'ipl',
            _id: 'ipl',
            title: 'IPL 2025',
            description: 'Vibrant T20 premier league style',
            componentKey: 'ipl',
            defaultColor: { TeamA: 'orange', TeamB: 'blue' },
            colorSchemes: [
              { key: 'blue', label: 'Blue', config: { primaryColor: '#3b82f6' } },
              { key: 'red', label: 'Red', config: { primaryColor: '#ef4444' } },
              { key: 'green', label: 'Green', config: { primaryColor: '#10b981' } },
              { key: 'orange', label: 'Orange', config: { primaryColor: '#f59e0b' } },
              { key: 'purple', label: 'Purple', config: { primaryColor: '#8b5cf6' } },
            ],
            isColorSchemeEnabled: true,
            colorSchemeConfigLabels: [
              { key: 'TeamA', label: 'Team A Color' },
              { key: 'TeamB', label: 'Team B Color' },
            ],
          },
          {
            id: 'classic',
            _id: 'classic',
            title: 'Classic Minimal',
            description: 'Clean and simple scorecard overlay',
            componentKey: 'classic',
            defaultColor: { TeamA: 'blue', TeamB: 'green' },
            colorSchemes: [
              { key: 'blue', label: 'Blue', config: { primaryColor: '#3b82f6' } },
              { key: 'red', label: 'Red', config: { primaryColor: '#ef4444' } },
              { key: 'green', label: 'Green', config: { primaryColor: '#10b981' } },
              { key: 'orange', label: 'Orange', config: { primaryColor: '#f59e0b' } },
              { key: 'purple', label: 'Purple', config: { primaryColor: '#8b5cf6' } },
            ],
            isColorSchemeEnabled: true,
            colorSchemeConfigLabels: [
              { key: 'TeamA', label: 'Team A Color' },
              { key: 'TeamB', label: 'Team B Color' },
            ],
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
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
        setMatchDetails({
          ...data,
          teams: [
            {
              teamId: data?.teams?.[0]?.teamId || data?.firstBattingTeam?._id || 'team1',
              title: data?.teams?.[0]?.title || data?.teams?.[0]?.name || data?.firstBattingTeam?.title || 'Team A',
            },
            {
              teamId: data?.teams?.[1]?.teamId || data?.secondBattingTeam?._id || 'team2',
              title: data?.teams?.[1]?.title || data?.teams?.[1]?.name || data?.secondBattingTeam?.title || 'Team B',
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error fetching match details:', error);
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
        Alert.alert('Saved!', res?.data?.message || 'Theme configuration saved.', [
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
    const theme = themes.find((t) => t._id === id) || null;
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
      });
      setColorObject(mappedColors);

      // Set preview colors
      const teamA = teams[0];
      const teamB = teams[1];
      if (teamA) setTeamAColor(expanded['TeamA'] || (theme.colorSchemes || [])[0]);
      if (teamB) setTeamBColor(expanded['TeamB'] || (theme.colorSchemes || [])[1] || (theme.colorSchemes || [])[0]);
    }
  };

  const onColorChange = (teamId, scheme, slot) => {
    setColorObject((prev) => ({ ...prev, [teamId]: scheme }));
    if (slot === 'TeamA') setTeamAColor(scheme);
    if (slot === 'TeamB') setTeamBColor(scheme);
  };

  useEffect(() => {
    getThemes();
    getMatchDetails();
  }, []);

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

    if (themes.length === 0) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ color: C.textSecondary, fontSize: 15 }}>No themes available</Text>
        </View>
      );
    }

    return (
      <View style={{ gap: 12, marginTop: 8 }}>
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme._id;
          return (
            <TouchableOpacity
              key={theme.id}
              onPress={() => handleThemeSelect(theme._id)}
              activeOpacity={0.7}
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
                  <Text style={[themeStyles.cardTitle, { color: C.text }]}>{theme.title}</Text>
                  <Text style={[themeStyles.cardDesc, { color: C.textSecondary }]}>{theme.description}</Text>
                </View>
                <View style={[
                  themeStyles.radioCircle,
                  { borderColor: isSelected ? C.primary : C.border },
                ]}>
                  {isSelected && <View style={[themeStyles.radioFill, { backgroundColor: C.primary }]} />}
                </View>
              </View>

              {/* Scorecard Preview */}
              <ScorecardPreview
                theme={theme}
                teamAColor={isSelected ? teamAColor : null}
                teamBColor={isSelected ? teamBColor : null}
                isDark={isDark}
              />
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
      <View style={{ gap: 20, marginTop: 8 }}>
        {colorSchemeConfigLabels.map((cfg, index) => {
          const team = teams[index];
          const teamId = team?.teamId || cfg.key;
          const teamName = team?.title || cfg.label;
          const slot = cfg.key; // 'TeamA' or 'TeamB'
          const currentColorKey = colorObject[teamId]?.key;

          return (
            <View key={index} style={[colorStyles.section, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[colorStyles.teamName, { color: C.text }]}>{teamName}</Text>
              <Text style={[colorStyles.label, { color: C.textSecondary }]}>Select team color</Text>
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
              {colorObject[teamId] && (
                <Text style={[colorStyles.selectedLabel, { color: C.textSecondary }]}>
                  Selected: {colorObject[teamId]?.label}
                </Text>
              )}
            </View>
          );
        })}

        {/* Live Preview */}
        <View style={[colorStyles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[colorStyles.teamName, { color: C.text }]}>Live Preview</Text>
          <ScorecardPreview
            theme={selectedThemeFullConfig}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            isDark={isDark}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
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
            Customize your broadcast scorecard
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[tabStyles.tabRow, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        {['theme', 'color'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              tabStyles.tab,
              activeTab === tab && { borderBottomWidth: 2, borderBottomColor: C.primary },
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
              {tab === 'theme' ? '🎨 Themes' : '🖌️ Colors'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {activeTab === 'theme' && renderThemeTab()}
        {activeTab === 'color' && renderColorTab()}
      </ScrollView>

      {/* Save Button */}
      <View style={[saveStyles.footer, { backgroundColor: C.bg, borderTopColor: C.border }]}>
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
              {selectedThemeFullConfig ? '💾 Save Theme' : 'Select a theme first'}
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
    padding: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
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
});

const colorStyles = StyleSheet.create({
  section: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    marginBottom: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  selectedLabel: {
    fontSize: 13,
    fontStyle: 'italic',
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
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
});

const tabStyles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
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
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

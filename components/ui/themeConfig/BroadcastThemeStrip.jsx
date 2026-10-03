import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Mini lower-third used to preview the web broadcast themes
// (client/src/components/overlays/broadcast/themes.js) in the theme picker,
// for themes that have no uploaded previewImage. Palettes and layouts mirror
// the web themes; keep the two in sync when adding a theme.
export const BROADCAST_THEME_PREVIEWS = {
  MinimalScorecard: { layout: 'minimal', base: '#0A0F1C', surface: '#151B2B', alt: '#0A0F1C', accent: '#4DD6C7', text: '#FFFFFF', teamA: '#4DD6C7', teamB: '#F87171', stripe: ['#4DD6C7', '#38BDF8'] },
  CornerScorebugScorecard: { layout: 'corner', radius: 4, base: '#0B1220', surface: '#16213A', alt: '#070C16', accent: '#FACC15', text: '#FFFFFF', teamA: '#2563EB', teamB: '#DC2626', stripe: ['#FACC15', '#F59E0B'] },
  VerticalScorecard: { layout: 'capsule', radius: 10, base: '#111827', surface: '#1F2937', alt: '#0B1120', accent: '#22D3EE', text: '#FFFFFF', teamA: '#22D3EE', teamB: '#F472B6', stripe: ['#22D3EE', '#A78BFA'] },
  SplitScorecard: { layout: 'capsule', radius: 4, base: '#0F172A', surface: '#1E293B', alt: '#020617', accent: '#38BDF8', text: '#FFFFFF', teamA: '#0EA5E9', teamB: '#F59E0B', stripe: ['#38BDF8', '#F59E0B'] },
  GullyScorecard: { layout: 'band', base: '#101010', surface: '#1E1E1E', alt: '#000000', accent: '#D4F000', text: '#FFFFFF', teamA: '#FF7A00', teamB: '#00B4D8', stripe: ['#D4F000', '#FF7A00'] },
  PslScorecard: { layout: 'angled', skew: '-12deg', base: '#062A1B', surface: '#0B3D28', alt: '#031A10', accent: '#D4AF37', text: '#FFFFFF', teamA: '#0B6E3A', teamB: '#D4AF37', stripe: ['#22C55E', '#D4AF37'] },
  CplScorecard: { layout: 'capsule', radius: 8, base: '#0B1F14', surface: '#12331F', alt: '#07140D', accent: '#FCD116', text: '#FFFFFF', teamA: '#009E49', teamB: '#CE1126', stripe: ['#009E49', '#FCD116', '#CE1126'] },
  TheHundredScorecard: { layout: 'band', base: '#000000', surface: '#141414', alt: '#000000', accent: '#C6FF00', text: '#FFFFFF', teamA: '#C6FF00', teamB: '#FF2D87', stripe: ['#C6FF00', '#FF2D87'] },
  Ilt20Scorecard: { layout: 'band', base: '#0D0D0D', surface: '#1C1414', alt: '#050505', accent: '#E4002B', text: '#FFFFFF', teamA: '#E4002B', teamB: '#C8A45C', stripe: ['#E4002B', '#C8A45C'] },
  MlcScorecard: { layout: 'angled', skew: '-16deg', base: '#0A1F44', surface: '#12306A', alt: '#061430', accent: '#E31837', text: '#FFFFFF', teamA: '#E31837', teamB: '#2A6FDB', stripe: ['#E31837', '#FFFFFF', '#2A6FDB'] },
  WplScorecard: { layout: 'capsule', radius: 7, base: '#2A0A45', surface: '#45126E', alt: '#19052B', accent: '#FF3EA5', text: '#FFFFFF', teamA: '#8E2DE2', teamB: '#FF3EA5', stripe: ['#8E2DE2', '#FF3EA5'] },
  LplScorecard: { layout: 'tier', base: '#00363A', surface: '#004B50', alt: '#00262A', accent: '#FF9933', text: '#FFFFFF', teamA: '#00B5AD', teamB: '#FF9933', stripe: ['#00B5AD', '#FF9933'] },
  BplScorecard: { layout: 'tier', base: '#00261A', surface: '#003D2A', alt: '#001A12', accent: '#F42A41', text: '#FFFFFF', teamA: '#006A4E', teamB: '#F42A41', stripe: ['#006A4E', '#F42A41'] },
  AshesClassicScorecard: { layout: 'light', base: '#F4EBD0', surface: '#EAE0C2', alt: '#0F3D2E', accent: '#A6192E', text: '#0F3D2E', teamA: '#0F3D2E', teamB: '#A6192E', stripe: ['#0F3D2E', '#C9A227', '#0F3D2E'] },
  SuperSportScorecard: { layout: 'band', base: '#002B7F', surface: '#0A3A9A', alt: '#001F5C', accent: '#FFD100', text: '#FFFFFF', teamA: '#0057B8', teamB: '#FFD100', stripe: ['#FFD100', '#00A3E0'] },
  WillowScorecard: { layout: 'band', base: '#121212', surface: '#1F1F1F', alt: '#0A0A0A', accent: '#D7192D', text: '#FFFFFF', teamA: '#D7192D', teamB: '#3A7BD5', stripe: ['#D7192D', '#D7192D'] },
  RetroDdScorecard: { layout: 'band', base: '#0A2A8A', surface: '#1846C8', alt: '#061C5E', accent: '#FFE000', text: '#FFFFFF', teamA: '#1846C8', teamB: '#C8102E', stripe: ['#FFE000', '#FFE000'] },
  AsiaCupScorecard: { layout: 'band', base: '#0B1B4D', surface: '#132A6E', alt: '#08133A', accent: '#E6007E', text: '#FFFFFF', teamA: '#1E5BD8', teamB: '#E6007E', stripe: ['#E6007E', '#FDB913', '#E6007E'] },
  Cwc19Scorecard: { layout: 'light', base: '#FFFFFF', surface: '#F1F3F8', alt: '#1B2A4E', accent: '#EC1C8B', text: '#1B2A4E', teamA: '#1B2A4E', teamB: '#EC1C8B', stripe: ['#EC1C8B', '#F7941D'] },
  ChampionsTrophy2025Scorecard: { layout: 'band', base: '#0A0F1F', surface: '#141B33', alt: '#05080F', accent: '#C9A227', text: '#F7F3E3', teamA: '#00B3A4', teamB: '#C9A227', stripe: ['#0A0F1F', '#C9A227', '#F5DC8A', '#C9A227', '#0A0F1F'] },
  Cwc25IndiaScorecard: { layout: 'tier', base: '#2A0F4F', surface: '#3D1773', alt: '#1A0833', accent: '#00E0C6', text: '#FFFFFF', teamA: '#00B8A9', teamB: '#FF4FB6', stripe: ['#00E0C6', '#7B5CFF', '#FF4FB6'] },
  WclFancodeScorecard: { layout: 'tier', base: '#111111', surface: '#1E1E1E', alt: '#000000', accent: '#FF6B00', text: '#FFFFFF', teamA: '#FF6B00', teamB: '#2F80ED', stripe: ['#FF6B00', '#FFB200'] },
  Cwc23IndiaScorecard: { layout: 'angled', skew: '-14deg', base: '#2D1A5C', surface: '#3E2780', alt: '#1C0F3C', accent: '#E5007D', text: '#FFFFFF', teamA: '#00C1DE', teamB: '#E5007D', stripe: ['#00C1DE', '#E5007D', '#FFD100'] },
  CricSkySportsScorecard: { layout: 'capsule', radius: 4, base: '#0A1A3F', surface: '#13306F', alt: '#061029', accent: '#E10600', text: '#FFFFFF', teamA: '#1F4BFF', teamB: '#E10600', stripe: ['#E10600', '#E10600'] },
  CricFusionScorecard: { layout: 'capsule', radius: 10, base: '#0C0A1E', surface: '#281E5A', alt: '#05040F', accent: '#00F0FF', text: '#FFFFFF', teamA: '#00F0FF', teamB: '#B44DFF', stripe: ['#00F0FF', '#B44DFF'] },
  EmergingAsiaCup2024Scorecard: { layout: 'tier', base: '#003B46', surface: '#06525F', alt: '#00262E', accent: '#B6E000', text: '#FFFFFF', teamA: '#00A3E0', teamB: '#B6E000', stripe: ['#00A3E0', '#B6E000'] },
  Sa20Scorecard: { layout: 'angled', skew: '-18deg', base: '#0E0E10', surface: '#1C1C22', alt: '#000000', accent: '#FF4E00', text: '#FFFFFF', teamA: '#FF4E00', teamB: '#FF00A8', stripe: ['#FF4E00', '#FF00A8'] },
  JioCinemaScorecard: { layout: 'capsule', radius: 7, base: '#2B0B4A', surface: '#4A1478', alt: '#1A052E', accent: '#D9008D', text: '#FFFFFF', teamA: '#7B2FF7', teamB: '#D9008D', stripe: ['#7B2FF7', '#D9008D', '#FFC400'] },
  IplClassicScorecard: { layout: 'band', base: '#0B1E5B', surface: '#16308A', alt: '#06133D', accent: '#F7A600', text: '#FFFFFF', teamA: '#004BA0', teamB: '#F7A600', stripe: ['#FF5A1F', '#F7A600', '#FF5A1F'] },
  Wt20Scorecard: { layout: 'angled', skew: '-10deg', base: '#101010', surface: '#1D1D1D', alt: '#000000', accent: '#FF1F7A', text: '#FFFFFF', teamA: '#3DE0FF', teamB: '#FF1F7A', stripe: ['#3DE0FF', '#FF1F7A'] },
  BblStarSportsScorecard: { layout: 'angled', skew: '-20deg', base: '#0A0A0A', surface: '#161616', alt: '#000000', accent: '#00E5FF', text: '#FFFFFF', teamA: '#00E5FF', teamB: '#F4FF00', stripe: ['#00E5FF', '#F4FF00'] },
  CricStarScorecard: { layout: 'capsule', radius: 20, base: '#0B0B0B', surface: '#1A1712', alt: '#000000', accent: '#E8C25A', text: '#FFF8E6', teamA: '#E8C25A', teamB: '#C0C0C0', stripe: ['#B8860B', '#F5D06F', '#B8860B'] },
};

export function getBroadcastPreview(theme) {
  return BROADCAST_THEME_PREVIEWS[theme?.componentKey] || null;
}

function readableOn(hex) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return '#FFFFFF';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0B0B0B' : '#FFFFFF';
}

const code = (name, fallback) =>
  (name || fallback)
    .split(/\s+/)
    .filter(Boolean)
    .map((w, _, all) => (all.length > 1 ? w[0] : w.slice(0, 3)))
    .join('')
    .slice(0, 3)
    .toUpperCase();

export default function BroadcastThemeStrip({
  theme,
  teamAColor,
  teamBColor,
  teamAName,
  teamBName,
  height = 52,
  style,
}) {
  const p = getBroadcastPreview(theme);
  if (!p) return null;

  const teamA = teamAColor?.config?.primaryColor || p.teamA;
  const teamB = teamBColor?.config?.primaryColor || p.teamB;
  const angled = p.layout === 'angled';
  const minimal = p.layout === 'minimal';
  const capsule = p.layout === 'capsule';
  const gap = angled ? 3 : capsule ? 4 : 0;
  const radius = capsule ? Math.min(p.radius || 6, height / 2.6) : 0;
  const muted = p.layout === 'light' ? '#5E6B8A' : 'rgba(255,255,255,0.65)';
  const tierH = p.layout === 'tier' ? Math.round(height * 0.24) : 0;
  const rowH = height - tierH;

  const seg = (bg, flex, children, extra) => (
    <View
      style={[
        s.seg,
        {
          flex,
          backgroundColor: bg,
          borderRadius: radius,
          transform: angled ? [{ skewX: p.skew }] : undefined,
          borderBottomWidth: angled ? 2 : 0,
          borderBottomColor: p.accent,
        },
        extra,
      ]}
    >
      <View style={[s.segIn, angled && { transform: [{ skewX: p.skew.replace('-', '') }] }]}>
        {children}
      </View>
    </View>
  );

  const fs = Math.max(8, Math.round(rowH * 0.2));

  // Corner scorebug: a small box in the top-left of an otherwise clear frame.
  if (p.layout === 'corner') {
    return (
      <View style={[{ height, width: '100%', justifyContent: 'center' }, style]}>
        <View style={[s.bug, { backgroundColor: p.base, borderRadius: radius || 4, height: height * 0.8 }]}>
          <LinearGradient colors={p.stripe} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bugStripe} />
          <View style={[s.bugTeam, { backgroundColor: teamA }]}>
            <Text style={[s.code, { color: readableOn(teamA), fontSize: fs * 1.1 }]}>{code(teamAName, 'Team A')}</Text>
          </View>
          <Text style={[s.score, { color: p.text, fontSize: fs * 1.6, paddingHorizontal: 8 }]}>
            128-3 <Text style={{ fontSize: fs * 0.9, color: p.accent }}>14.2</Text>
          </Text>
          <View style={[s.bugTeam, { backgroundColor: teamB }]}>
            <Text style={[s.code, { color: readableOn(teamB), fontSize: fs * 0.9 }]}>v {code(teamBName, 'Team B')}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[{ height, width: '100%' }, style]}>
      {tierH > 0 && (
        <View style={[s.tier, { height: tierH, backgroundColor: p.alt }]}>
          <View style={[s.tierLead, { backgroundColor: p.accent }]}>
            <Text style={[s.tierText, { color: readableOn(p.accent), fontSize: fs * 0.7 }]}>TOURNAMENT</Text>
          </View>
          <Text style={[s.tierText, { color: muted, fontSize: fs * 0.7 }]}>CRR 8.93   RRR 7.76   TARGET 172</Text>
        </View>
      )}
      {(p.layout === 'band' || p.layout === 'light') && (
        <LinearGradient colors={p.stripe} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 2 }} />
      )}
      <View
        style={[
          s.row,
          {
            gap,
            paddingHorizontal: angled ? 6 : capsule ? 2 : 0,
            backgroundColor: capsule || angled ? 'transparent' : p.base,
            borderRadius: minimal ? 8 : 0,
            marginHorizontal: minimal ? 16 : 0,
          },
        ]}
      >
        {seg(
          minimal ? 'transparent' : teamA,
          1.1,
          <Text style={[s.code, { color: minimal ? p.text : readableOn(teamA), fontSize: fs * 1.1 }, minimal && { borderBottomWidth: 2, borderBottomColor: teamA }]}>
            {code(teamAName, 'Team A')}
          </Text>
        )}
        {seg(
          p.layout === 'light' ? p.alt : p.surface,
          1.6,
          <Text style={[s.score, { color: p.layout === 'light' ? '#FFFFFF' : p.text, fontSize: fs * 1.6 }]}>
            128-3 <Text style={{ fontSize: fs * 0.9, color: p.accent }}>14.2</Text>
          </Text>
        )}
        {seg(
          p.base,
          2.2,
          <View>
            <Text style={[s.line, { color: p.text, fontSize: fs }]}>▸ BATTER ONE   64</Text>
            <Text style={[s.line, { color: muted, fontSize: fs }]}>   BATTER TWO   22</Text>
          </View>
        )}
        {seg(
          p.layout === 'light' ? p.surface : p.alt,
          2,
          <Text style={[s.line, { color: p.text, fontSize: fs * 0.95, textAlign: 'center' }]} numberOfLines={2}>
            Need 44 off 34
          </Text>
        )}
        {seg(
          p.base,
          2.2,
          <View>
            <Text style={[s.line, { color: p.text, fontSize: fs }]}>BOWLER   2-27</Text>
            <View style={s.balls}>
              {['#9CA3AF', p.accent, '#9CA3AF', 'transparent', 'transparent', 'transparent'].map((c, i) => (
                <View
                  key={i}
                  style={[s.ball, { width: fs, height: fs, borderRadius: fs / 2, backgroundColor: c, borderColor: muted }]}
                />
              ))}
            </View>
          </View>
        )}
        {seg(
          minimal ? 'transparent' : teamB,
          1.1,
          <Text style={[s.code, { color: minimal ? p.text : readableOn(teamB), fontSize: fs * 1.1 }, minimal && { borderBottomWidth: 2, borderBottomColor: teamB }]}>
            {code(teamBName, 'Team B')}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  seg: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  segIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  code: {
    fontWeight: '900',
  },
  score: {
    fontWeight: '900',
  },
  line: {
    fontWeight: '700',
  },
  balls: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  ball: {
    borderWidth: 1,
  },
  bug: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  bugStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  bugTeam: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierLead: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tierText: {
    fontWeight: '800',
  },
});

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import WagonWheel from "../createMatch/WagonWheel";
import PitchMap, { LENGTH_ZONES } from "../createMatch/PitchMap";
import {
  getInningsLabel,
  getShotKind,
  getTrackedBalls,
} from "@/utils/matchCharts";

const VIEW = { WAGON: "wagon", PITCH: "pitch" };
const OUTCOMES = [
  { key: "all", label: "All" },
  { key: "dot", label: "Dot", color: "#94A3B8" },
  { key: "runs", label: "1-3", color: "#3B82F6" },
  { key: "four", label: "Four", color: "#10B981" },
  { key: "six", label: "Six", color: "#A855F7" },
  { key: "wicket", label: "Wicket", color: "#EF4444" },
];

const getPlayers = (balls, idKey, nameKey) => {
  const players = new Map();
  balls.forEach((ball) => {
    if (ball[idKey]) players.set(ball[idKey], ball[nameKey]);
  });
  return [...players].map(([id, name]) => ({ id, name }));
};
const getLengthName = (pitch) => {
  if (pitch?.lengthZone) return pitch.lengthZone;
  const yards = Number(pitch?.impactPoint?.fromStumps || 0);
  return (
    LENGTH_ZONES.find((zone) => yards <= zone.range[1]) ||
    LENGTH_ZONES[LENGTH_ZONES.length - 1]
  ).name;
};

// Wagon wheel and pitch map for the whole match, with innings, batter,
// bowler and outcome filters. Built from the per-ball tracking in the score.
export default function MatchAnalysis({ score }) {
  const isDark = useColorScheme() === "dark";
  const { width: screenWidth } = useWindowDimensions();
  const [view, setView] = useState(VIEW.WAGON);
  const [selectedInnings, setSelectedInnings] = useState(0);
  const [batterId, setBatterId] = useState("all");
  const [bowlerId, setBowlerId] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const isTestMatch = score?.matchType === "test";
  const isBox = score?.matchType === "box";

  const colors = {
    background: isDark ? "#0f172a" : "#f1f5f9",
    card: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f1f5f9" : "#1e293b",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    accent: "#14B8A6",
  };

  const innings = useMemo(
    () =>
      (score?.inning || [])
        .map((inning, index) => ({
          label: getInningsLabel(inning, index, isTestMatch),
          balls: getTrackedBalls(inning),
        }))
        .filter((item) => item.balls.length),
    [score?.inning, isTestMatch]
  );

  if (!innings.length) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No wagon wheel or pitch map yet
        </Text>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          They appear here once the scorer records where each ball pitched and
          where it was hit.
        </Text>
      </View>
    );
  }

  const active = innings[Math.min(selectedInnings, innings.length - 1)];
  const batters = getPlayers(active.balls, "batterId", "batterName");
  const bowlers = getPlayers(active.balls, "bowlerId", "bowlerName");
  const balls = active.balls.filter(
    (ball) =>
      (batterId === "all" || ball.batterId === batterId) &&
      (bowlerId === "all" || ball.bowlerId === bowlerId) &&
      (outcome === "all" || getShotKind(ball) === outcome)
  );
  const shots = balls.filter((ball) => ball.wagonWheel);
  const pitches = balls.filter((ball) => ball.pitchMap);

  // Runs to the left (90°-270°) and right of the pitch, and runs per zone.
  let leftRuns = 0;
  let rightRuns = 0;
  const zoneMap = {};
  shots.forEach((ball) => {
    const angle = Number(ball.wagonWheel?.angle || 0);
    if (angle > 90 && angle < 270) leftRuns += ball.runs;
    else rightRuns += ball.runs;
    const name = ball.wagonWheel?.zoneName || "Unknown";
    zoneMap[name] = zoneMap[name] || { name, runs: 0, balls: 0 };
    zoneMap[name].runs += ball.runs;
    zoneMap[name].balls += 1;
  });
  const totalRuns = leftRuns + rightRuns;
  const leftPct = totalRuns ? Math.round((leftRuns / totalRuns) * 100) : 50;
  const zones = Object.values(zoneMap).sort(
    (a, b) => b.runs - a.runs || b.balls - a.balls
  );

  const lengths = LENGTH_ZONES.map((zone) => {
    const inZone = pitches.filter(
      (ball) => getLengthName(ball.pitchMap) === zone.name
    );
    return {
      ...zone,
      balls: inZone.length,
      runs: inZone.reduce((sum, ball) => sum + ball.runs, 0),
      wickets: inZone.filter((ball) => ball.isWicket).length,
    };
  });

  const chartSize = Math.min(screenWidth - 48, 300);
  const cardStyle = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.border },
  ];

  const renderChip = (key, label, isActive, onPress, dotColor) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: isActive ? colors.accent : colors.border,
          backgroundColor: isActive ? `${colors.accent}22` : "transparent",
        },
      ]}
    >
      {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      <Text
        style={[
          styles.chipText,
          { color: isActive ? colors.text : colors.muted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPlayerRow = (label, players, value, onChange) => (
    <View>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {renderChip("all", "All", value === "all", () => onChange("all"))}
        {players.map((player) =>
          renderChip(player.id, player.name, value === player.id, () =>
            onChange(player.id)
          )
        )}
      </ScrollView>
    </View>
  );

  const renderTableRow = (key, cells, isHead, dotColor) => (
    <View
      key={key}
      style={[
        styles.row,
        !isHead && { borderTopWidth: 1, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.rowName}>
        {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
        <Text
          numberOfLines={1}
          style={[
            isHead ? styles.headText : styles.rowText,
            { color: isHead ? colors.muted : colors.text },
          ]}
        >
          {cells[0]}
        </Text>
      </View>
      {cells.slice(1).map((cell, index) => (
        <Text
          key={index}
          style={[
            isHead ? styles.headText : styles.rowText,
            styles.cell,
            { color: isHead ? colors.muted : colors.text },
          ]}
        >
          {cell}
        </Text>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.toggle, { borderColor: colors.border }]}>
        {[
          { key: VIEW.WAGON, label: "Wagon wheel" },
          { key: VIEW.PITCH, label: "Pitch map" },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => setView(item.key)}
            style={[
              styles.toggleBtn,
              view === item.key && { backgroundColor: colors.accent },
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                { color: view === item.key ? "#fff" : colors.muted },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {innings.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {innings.map((item, index) =>
            renderChip(item.label, item.label, item === active, () => {
              setSelectedInnings(index);
              setBatterId("all");
              setBowlerId("all");
            })
          )}
        </ScrollView>
      )}

      {renderPlayerRow("BATTER", batters, batterId, setBatterId)}
      {renderPlayerRow("BOWLER", bowlers, bowlerId, setBowlerId)}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {OUTCOMES.map((item) =>
          renderChip(
            item.key,
            item.label,
            outcome === item.key,
            () => setOutcome(item.key),
            item.color
          )
        )}
      </ScrollView>

      {view === VIEW.WAGON ? (
        <>
          <View style={[cardStyle, styles.chartCard]}>
            <WagonWheel
              readOnly
              size={chartSize}
              historicalShots={shots}
              isDarkMode={isDark}
              isBoxCricket={isBox}
              title={`${shots.length} shots`}
            />
          </View>
          <View style={cardStyle}>
            <View style={styles.split}>
              <View>
                <Text style={[styles.splitValue, { color: colors.text }]}>
                  {leftPct}%
                </Text>
                <Text style={[styles.splitLabel, { color: colors.muted }]}>
                  Off side (RHB)
                </Text>
              </View>
              <View style={[styles.splitTrack, { backgroundColor: "#3B82F6" }]}>
                <View
                  style={{
                    width: `${leftPct}%`,
                    height: "100%",
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.splitValue, { color: colors.text }]}>
                  {100 - leftPct}%
                </Text>
                <Text style={[styles.splitLabel, { color: colors.muted }]}>
                  Leg side (RHB)
                </Text>
              </View>
            </View>
          </View>
          <View style={[cardStyle, styles.tableCard]}>
            {renderTableRow("head", ["ZONE", "BALLS", "RUNS"], true)}
            {zones.map((zone) =>
              renderTableRow(zone.name, [zone.name, zone.balls, zone.runs])
            )}
            {!shots.length && (
              <Text style={[styles.none, { color: colors.muted }]}>
                No shots match these filters
              </Text>
            )}
          </View>
        </>
      ) : (
        <>
          <View style={[cardStyle, styles.chartCard]}>
            <PitchMap
              readOnly
              width={Math.min(screenWidth - 48, 300)}
              height={360}
              historicalPitches={pitches}
              isDarkMode={isDark}
              title={`${pitches.length} deliveries`}
            />
          </View>
          <View style={[cardStyle, styles.tableCard]}>
            {renderTableRow("head", ["LENGTH", "BALLS", "RUNS", "WKTS"], true)}
            {lengths.map((zone) =>
              renderTableRow(
                zone.name,
                [zone.name, zone.balls, zone.runs, zone.wickets],
                false,
                zone.color
              )
            )}
            {!pitches.length && (
              <Text style={[styles.none, { color: colors.muted }]}>
                No deliveries match these filters
              </Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 12 },
  chartCard: { alignItems: "center" },
  tableCard: { padding: 0, overflow: "hidden" },
  toggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
  },
  toggleText: { fontSize: 13, fontWeight: "700" },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 6,
    marginLeft: 2,
  },
  chips: { gap: 8, paddingHorizontal: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  split: { flexDirection: "row", alignItems: "center", gap: 12 },
  splitValue: { fontSize: 17, fontWeight: "800" },
  splitLabel: { fontSize: 11 },
  splitTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowName: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  rowText: { fontSize: 14, fontWeight: "600" },
  headText: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  cell: { width: 52, textAlign: "right" },
  none: { textAlign: "center", padding: 14, fontSize: 13 },
  empty: { flex: 1, alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: "center" },
});

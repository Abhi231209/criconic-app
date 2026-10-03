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
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import {
  getInningsLabel,
  getOverSeries,
  getPartnerships,
  ordinal,
} from "@/utils/matchCharts";

const SERIES_COLORS = ["#14B8A6", "#3B82F6", "#F59E0B", "#A855F7"];
const WICKET_COLOR = "#EF4444";
const CHART_HEIGHT = 210;
const PAD = { top: 12, right: 10, bottom: 22, left: 30 };

// A round number of grid steps that covers the largest value.
const getScale = (max) => {
  const step =
    [1, 2, 5, 10, 20, 25, 50, 100, 200].find((size) => max / size <= 5) || 500;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { top, ticks };
};
const getOverTicks = (overs) => {
  const step = overs <= 10 ? 1 : overs <= 25 ? 5 : 10;
  const ticks = [];
  for (let over = step; over <= overs; over += step) ticks.push(over);
  return ticks;
};

// Run progression, runs per over and partnerships, drawn from the
// ball-by-ball record in the score.
export default function MatchCharts({ score }) {
  const isDark = useColorScheme() === "dark";
  const { width: screenWidth } = useWindowDimensions();
  const [selected, setSelected] = useState(0);
  const isTestMatch = score?.matchType === "test";

  const colors = {
    background: isDark ? "#0f172a" : "#f1f5f9",
    card: isDark ? "#1e293b" : "#ffffff",
    text: isDark ? "#f1f5f9" : "#1e293b",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    track: isDark ? "#334155" : "#e2e8f0",
  };

  const innings = useMemo(
    () =>
      (score?.inning || [])
        .map((inning, index) => ({
          label: getInningsLabel(inning, index, isTestMatch),
          series: getOverSeries(inning),
          partnerships: getPartnerships(inning),
          color: SERIES_COLORS[index % SERIES_COLORS.length],
        }))
        .filter((item) => item.series.length),
    [score?.inning, isTestMatch]
  );

  if (!innings.length) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No charts yet
        </Text>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          Run-rate charts and partnerships appear once the first over is
          bowled.
        </Text>
      </View>
    );
  }

  const active = innings[Math.min(selected, innings.length - 1)];
  const width = Math.min(screenWidth, 720) - 24 - 24; // screen and card padding
  const plotW = width - PAD.left - PAD.right;
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const renderAxes = (scale, overs, xOf, yOf) => (
    <G>
      {scale.ticks.map((value) => (
        <G key={`y-${value}`}>
          <Line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={yOf(value)}
            y2={yOf(value)}
            stroke={colors.border}
            strokeWidth="1"
          />
          <SvgText
            x={PAD.left - 5}
            y={yOf(value) + 3}
            fontSize="9"
            fill={colors.muted}
            textAnchor="end"
          >
            {value}
          </SvgText>
        </G>
      ))}
      {getOverTicks(overs).map((over) => (
        <SvgText
          key={`x-${over}`}
          x={xOf(over)}
          y={CHART_HEIGHT - 6}
          fontSize="9"
          fill={colors.muted}
          textAnchor="middle"
        >
          {over}
        </SvgText>
      ))}
    </G>
  );

  // worm: cumulative runs of every innings
  const maxOvers = Math.max(...innings.map((item) => item.series.length));
  const wormScale = getScale(
    Math.max(...innings.map((item) => item.series[item.series.length - 1].total))
  );
  const wormX = (over) => PAD.left + (over / maxOvers) * plotW;
  const wormY = (value) => PAD.top + plotH - (value / wormScale.top) * plotH;

  // manhattan: runs per over of the selected innings
  const barScale = getScale(Math.max(...active.series.map((over) => over.runs)));
  const slot = plotW / active.series.length;
  const barW = Math.min(22, slot * 0.7);
  const barX = (over) => PAD.left + (over - 0.5) * slot;
  const barY = (value) => PAD.top + plotH - (value / barScale.top) * plotH;

  const maxStand = Math.max(1, ...active.partnerships.map((stand) => stand.runs));

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.border },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={cardStyle}>
        <Text style={[styles.cardTitle, { color: colors.muted }]}>
          RUN PROGRESSION
        </Text>
        <Svg width={width} height={CHART_HEIGHT}>
          {renderAxes(wormScale, maxOvers, wormX, wormY)}
          {innings.map((item) => (
            <G key={item.label}>
              <Polyline
                fill="none"
                stroke={item.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                points={[
                  `${wormX(0)},${wormY(0)}`,
                  ...item.series.map(
                    (over) => `${wormX(over.over)},${wormY(over.total)}`
                  ),
                ].join(" ")}
              />
              {item.series
                .filter((over) => over.wickets)
                .map((over) => (
                  <Circle
                    key={`w-${over.over}`}
                    cx={wormX(over.over)}
                    cy={wormY(over.total)}
                    r="4"
                    fill={WICKET_COLOR}
                    stroke={colors.card}
                    strokeWidth="1.5"
                  />
                ))}
            </G>
          ))}
        </Svg>
        <View style={styles.legend}>
          {innings.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: colors.muted }]}>
                {item.label}
              </Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: WICKET_COLOR }]} />
            <Text style={[styles.legendText, { color: colors.muted }]}>
              Wicket
            </Text>
          </View>
        </View>
      </View>

      {innings.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {innings.map((item, index) => {
            const isActive = item === active;
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => setSelected(index)}
                style={[
                  styles.chip,
                  {
                    borderColor: isActive ? item.color : colors.border,
                    backgroundColor: isActive ? `${item.color}22` : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? colors.text : colors.muted },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={cardStyle}>
        <Text style={[styles.cardTitle, { color: colors.muted }]}>
          RUNS PER OVER · {active.label.toUpperCase()}
        </Text>
        <Svg width={width} height={CHART_HEIGHT}>
          {renderAxes(barScale, active.series.length, barX, barY)}
          {active.series.map((over) => (
            <G key={`bar-${over.over}`}>
              <Rect
                x={barX(over.over) - barW / 2}
                y={barY(over.runs)}
                width={barW}
                height={Math.max(1, barY(0) - barY(over.runs))}
                rx="3"
                fill={active.color}
              />
              {Array.from({ length: over.wickets }).map((_, index) => (
                <Circle
                  key={index}
                  cx={barX(over.over)}
                  cy={barY(over.runs) - 7 - index * 9}
                  r="3.5"
                  fill={WICKET_COLOR}
                />
              ))}
            </G>
          ))}
        </Svg>
      </View>

      {active.partnerships.length > 0 && (
        <View style={cardStyle}>
          <Text style={[styles.cardTitle, { color: colors.muted }]}>
            PARTNERSHIPS · {active.label.toUpperCase()}
          </Text>
          {active.partnerships.map((stand, index) => (
            <View
              key={stand.wicket}
              style={[
                styles.stand,
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <View style={styles.standTop}>
                <Text
                  numberOfLines={1}
                  style={[styles.standNames, { color: colors.text }]}
                >
                  <Text style={{ color: colors.muted, fontWeight: "500" }}>
                    {ordinal(stand.wicket)} wkt ·{" "}
                  </Text>
                  {stand.names.join(" & ") || "—"}
                </Text>
                <Text style={[styles.standRuns, { color: colors.text }]}>
                  {stand.runs}
                  {stand.unbroken ? "*" : ""}
                  <Text style={{ color: colors.muted, fontWeight: "500" }}>
                    {" "}
                    ({stand.balls})
                  </Text>
                </Text>
              </View>
              <View style={[styles.standTrack, { backgroundColor: colors.track }]}>
                <View
                  style={[
                    styles.standBar,
                    {
                      width: `${(stand.runs / maxStand) * 100}%`,
                      backgroundColor: active.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 12 },
  cardTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12 },
  chips: { gap: 8, paddingHorizontal: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  stand: { paddingVertical: 9 },
  standTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  standNames: { flex: 1, fontSize: 13, fontWeight: "600" },
  standRuns: { fontSize: 13, fontWeight: "700" },
  standTrack: { height: 6, borderRadius: 3, marginTop: 6, overflow: "hidden" },
  standBar: { height: "100%", borderRadius: 3 },
  empty: { flex: 1, alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: "center" },
});

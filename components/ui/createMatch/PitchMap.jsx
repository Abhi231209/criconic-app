import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import Svg, {
  Rect,
  Line,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

export const LENGTH_ZONES = [
  { name: "Yorker", color: "#3B82F6", range: [0, 2], label: "Yorker (0-2y)" },
  { name: "Full", color: "#06B6D4", range: [2, 4.5], label: "Full (2-4.5y)" },
  { name: "Good Length", color: "#10B981", range: [4.5, 7.5], label: "Good (4.5-7.5y)" },
  { name: "Short", color: "#F59E0B", range: [7.5, 11], label: "Short (7.5-11y)" },
  { name: "Bouncer", color: "#EF4444", range: [11, 22], label: "Bouncer (11-22y)" },
];

export const getPitchLengthColor = (fromStumps) => {
  const d = Number(fromStumps || 0);
  if (d <= 2) return "#3B82F6";       // Yorker
  if (d <= 4.5) return "#06B6D4";     // Full
  if (d <= 7.5) return "#10B981";     // Good Length
  if (d <= 11) return "#F59E0B";      // Short
  return "#EF4444";                   // Bouncer
};

const PitchMap = ({
  onSelectPitch,
  selectedPitch = null,
  historicalPitches = [],
  readOnly = false,
  width = 310,
  height = 380,
  isDarkMode = false,
  title = "",
  batterStance = "RHB", // "RHB" | "LHB"
}) => {
  const [pitchPoint, setPitchPoint] = useState(selectedPitch?.coordinates || null);
  const [ballData, setBallData] = useState(selectedPitch || null);
  const [stance, setStance] = useState(batterStance || "RHB");

  useEffect(() => {
    if (batterStance) {
      setStance(batterStance);
    }
  }, [batterStance]);

  useEffect(() => {
    if (selectedPitch) {
      setPitchPoint(selectedPitch.coordinates || selectedPitch.rawCoordinates || null);
      setBallData(selectedPitch);
    } else if (selectedPitch === null && !readOnly) {
      setPitchPoint(null);
      setBallData(null);
    }
  }, [selectedPitch, readOnly]);

  const toggleStance = () => {
    setStance((prev) => (prev === "RHB" ? "LHB" : "RHB"));
  };

  // Pitch coordinate boundaries in SVG
  const pitchLeft = width * 0.24;
  const pitchRight = width * 0.76;
  const pitchTop = height * 0.12; // Bowler's end (top)
  const pitchBottom = height * 0.86; // Striker's end (bottom)
  const pitchWidth = pitchRight - pitchLeft;
  const pitchHeight = pitchBottom - pitchTop;

  // Stance awareness for Off Side / Leg Side:
  // Bowler view looking down to striker at bottom:
  // For RHB (Right Hand Batsman): Left is Off Side, Right is Leg Side.
  // For LHB (Left Hand Batsman):  Left is Leg Side, Right is Off Side.
  const isRHB = stance === "RHB";
  const leftSideLabel = isRHB ? "OFF SIDE" : "LEG SIDE";
  const rightSideLabel = isRHB ? "LEG SIDE" : "OFF SIDE";

  // Length calculation (22 yards pitch)
  // Batting / Striker's end is at the TOP (pitchTop = 0 yards from stumps)
  // Bowler's end is at the BOTTOM (pitchBottom = 22 yards from stumps)
  const calculatePitchData = (x, y) => {
    const normX = Math.max(0, Math.min(1, (x - pitchLeft) / pitchWidth));
    // 0 is batsman end (top), 1 is bowler end (bottom)
    const normY = Math.max(0, Math.min(1, (y - pitchTop) / pitchHeight));

    const yardsFromStumps = (normY * 22).toFixed(1);
    // Line: -5 to +5 feet from center
    // Looking from bowler (bottom) towards batsman (top):
    // For RHB: negative = Off side (left), positive = Leg side (right)
    // For LHB: negative = Leg side (left), positive = Off side (right)
    const feetFromCenter = ((normX - 0.5) * 10).toFixed(1);

    let lengthZone = "Good Length";
    if (yardsFromStumps <= 2) lengthZone = "Yorker";
    else if (yardsFromStumps <= 4.5) lengthZone = "Full";
    else if (yardsFromStumps <= 7.5) lengthZone = "Good Length";
    else if (yardsFromStumps <= 11) lengthZone = "Short";
    else lengthZone = "Bouncer";

    let lineZone = "Middle";
    if (isRHB) {
      if (feetFromCenter < -2.0) lineZone = "Wide Outside Off";
      else if (feetFromCenter < -0.8) lineZone = "Outside Off";
      else if (feetFromCenter < -0.2) lineZone = "Off Stump";
      else if (feetFromCenter <= 0.2) lineZone = "Middle Stump";
      else if (feetFromCenter <= 0.8) lineZone = "Leg Stump";
      else if (feetFromCenter <= 2.0) lineZone = "Down Leg";
      else lineZone = "Wide Down Leg";
    } else {
      if (feetFromCenter < -2.0) lineZone = "Wide Down Leg";
      else if (feetFromCenter < -0.8) lineZone = "Down Leg";
      else if (feetFromCenter < -0.2) lineZone = "Leg Stump";
      else if (feetFromCenter <= 0.2) lineZone = "Middle Stump";
      else if (feetFromCenter <= 0.8) lineZone = "Off Stump";
      else if (feetFromCenter <= 2.0) lineZone = "Outside Off";
      else lineZone = "Wide Outside Off";
    }

    return {
      coordinates: { x: Math.round(x), y: Math.round(y) },
      impactPoint: {
        fromStumps: yardsFromStumps,
        fromCenter: feetFromCenter,
        lengthZone,
        lineZone,
        stance,
      },
      lengthZone,
      lineZone,
      stance,
      timestamp: Date.now(),
    };
  };

  const handleTouch = (event) => {
    if (readOnly) return;
    const { locationX, locationY } = event.nativeEvent;

    // Confine touch to pitch rect with padding
    if (
      locationX < pitchLeft - 15 ||
      locationX > pitchRight + 15 ||
      locationY < pitchTop - 10 ||
      locationY > pitchBottom + 10
    ) {
      return;
    }

    const clampedX = Math.max(pitchLeft, Math.min(pitchRight, locationX));
    const clampedY = Math.max(pitchTop, Math.min(pitchBottom, locationY));

    const data = calculatePitchData(clampedX, clampedY);
    setPitchPoint({ x: clampedX, y: clampedY });
    setBallData(data);
    onSelectPitch?.(data);
  };

  const clearPitch = () => {
    setPitchPoint(null);
    setBallData(null);
    onSelectPitch?.(null);
  };

  const getCoordinatesFromData = (item) => {
    const impact = item.impactPoint || item.pitchMap?.impactPoint;
    if (impact && impact.fromStumps !== undefined) {
      const fromStumps = Number(impact.fromStumps ?? 6);
      const fromCenter = Number(impact.fromCenter ?? 0);

    const normY = Math.max(0, Math.min(1, fromStumps / 22));
    const normX = Math.max(0, Math.min(1, fromCenter / 10 + 0.5));

    return {
      x: pitchLeft + normX * pitchWidth,
      y: pitchTop + normY * pitchHeight,
    };
  };

  // Length lines in SVG coordinates (measured from stumps at TOP)
  const yYorker = pitchTop + (2 / 22) * pitchHeight;
  const yFull = pitchTop + (4.5 / 22) * pitchHeight;
  const yGood = pitchTop + (7.5 / 22) * pitchHeight;
  const yShort = pitchTop + (11 / 22) * pitchHeight;

  // Stumps channel lines (Middle, Off, Leg)
  const xCenter = (pitchLeft + pitchRight) / 2;
  const stumpSpacing = pitchWidth * 0.08;

  return (
    <View style={styles.container}>
      {/* Top Header Row with Title & Stance Toggle */}
      <View style={styles.topHeaderBar}>
        <Text style={[styles.titleText, { color: isDarkMode ? "#F8FAFC" : "#0F172A" }]}>
          {title || "Pitch Impact Map"}
        </Text>

        {/* Stance Indicator / Switcher */}
        <TouchableOpacity
          onPress={toggleStance}
          style={[
            styles.stancePill,
            {
              backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9",
              borderColor: isDarkMode ? "#334155" : "#CBD5E1",
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.stanceIcon}>🏏</Text>
          <Text
            style={[
              styles.stanceText,
              { color: isDarkMode ? "#38BDF8" : "#0284C7" },
            ]}
          >
            {stance === "RHB" ? "RHB (Right Hand)" : "LHB (Left Hand)"}
          </Text>
          <Text style={styles.stanceSwitchCue}>⇄</Text>
        </TouchableOpacity>
      </View>

      {/* Main Pitch Canvas */}
      <TouchableOpacity
        style={[
          styles.pitchWrapper,
          {
            width,
            height,
            backgroundColor: isDarkMode ? "#0B1D15" : "#143D28",
            borderColor: isDarkMode ? "#1E3A2B" : "#1A4D33",
          },
        ]}
        onPress={handleTouch}
        activeOpacity={readOnly ? 1 : 0.9}
      >
        <Svg width={width} height={height} style={styles.svg}>
          <Defs>
            {/* Realistic turf matting gradient */}
            <LinearGradient id="pitchStripGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#C99E70" />
              <Stop offset="25%" stopColor="#DFC39D" />
              <Stop offset="50%" stopColor="#E5CBAB" />
              <Stop offset="75%" stopColor="#DFC39D" />
              <Stop offset="100%" stopColor="#C99E70" />
            </LinearGradient>

            {/* Outfield mow pattern */}
            <LinearGradient id="grassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={isDarkMode ? "#0B1E15" : "#16442D"} />
              <Stop offset="50%" stopColor={isDarkMode ? "#0E251A" : "#1B5237"} />
              <Stop offset="100%" stopColor={isDarkMode ? "#0B1E15" : "#16442D"} />
            </LinearGradient>
          </Defs>

          {/* Outfield Grass Background */}
          <Rect x="0" y="0" width={width} height={height} fill="url(#grassGrad)" />

          {/* Subtle Outer Boundary Guides on Grass */}
          <Rect
            x={4}
            y={4}
            width={width - 8}
            height={height - 8}
            rx={10}
            fill="none"
            stroke={isDarkMode ? "#194330" : "#226343"}
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />

          {/* ================= CRICKET PITCH STRIP ================= */}
          {/* Pitch Outer Shadow / Edge Border */}
          <Rect
            x={pitchLeft - 2}
            y={pitchTop - 2}
            width={pitchWidth + 4}
            height={pitchHeight + 4}
            rx={5}
            fill={isDarkMode ? "#1B1711" : "#5C4033"}
            opacity={0.35}
          />

          {/* Pitch Turf Strip */}
          <Rect
            x={pitchLeft}
            y={pitchTop}
            width={pitchWidth}
            height={pitchHeight}
            fill="url(#pitchStripGrad)"
            rx={4}
            stroke="#9C7A53"
            strokeWidth="1.5"
          />

          {/* ================= LENGTH ZONE TRANSLUCENT BANDS ================= */}
          {/* Yorker Zone: 0 - 2y (from batsman stumps at pitchTop) */}
          <Rect
            x={pitchLeft}
            y={pitchTop}
            width={pitchWidth}
            height={yYorker - pitchTop}
            fill="#3B82F6"
            fillOpacity={0.18}
          />
          {/* Full Zone: 2 - 4.5y */}
          <Rect
            x={pitchLeft}
            y={yYorker}
            width={pitchWidth}
            height={yFull - yYorker}
            fill="#06B6D4"
            fillOpacity={0.16}
          />
          {/* Good Length Zone: 4.5 - 7.5y */}
          <Rect
            x={pitchLeft}
            y={yFull}
            width={pitchWidth}
            height={yGood - yFull}
            fill="#10B981"
            fillOpacity={0.16}
          />
          {/* Short Zone: 7.5 - 11y */}
          <Rect
            x={pitchLeft}
            y={yGood}
            width={pitchWidth}
            height={yShort - yGood}
            fill="#F59E0B"
            fillOpacity={0.16}
          />
          {/* Bouncer Zone: 11 - 22y (down to bowling crease) */}
          <Rect
            x={pitchLeft}
            y={yShort}
            width={pitchWidth}
            height={pitchBottom - yShort}
            fill="#EF4444"
            fillOpacity={0.14}
          />

          {/* ================= LENGTH ZONE DIVIDER LINES & LABELS ================= */}
          {/* Yorker Line (2y) */}
          <Line
            x1={pitchLeft}
            y1={yYorker}
            x2={pitchRight}
            y2={yYorker}
            stroke="#2563EB"
            strokeWidth="1.2"
            strokeDasharray="3,3"
          />
          <SvgText
            x={pitchLeft + 4}
            y={yYorker - 3}
            fill="#1E40AF"
            fontSize="8"
            fontWeight="bold"
          >
            YORKER (2y)
          </SvgText>

          {/* Full Line (4.5y) */}
          <Line
            x1={pitchLeft}
            y1={yFull}
            x2={pitchRight}
            y2={yFull}
            stroke="#0891B2"
            strokeWidth="1.2"
            strokeDasharray="3,3"
          />
          <SvgText
            x={pitchLeft + 4}
            y={yFull - 3}
            fill="#0E7490"
            fontSize="8"
            fontWeight="bold"
          >
            FULL (4.5y)
          </SvgText>

          {/* Good Length Line (7.5y) */}
          <Line
            x1={pitchLeft}
            y1={yGood}
            x2={pitchRight}
            y2={yGood}
            stroke="#059669"
            strokeWidth="1.2"
            strokeDasharray="3,3"
          />
          <SvgText
            x={pitchLeft + 4}
            y={yGood - 3}
            fill="#047857"
            fontSize="8"
            fontWeight="bold"
          >
            GOOD LENGTH (7.5y)
          </SvgText>

          {/* Short Line (11y) */}
          <Line
            x1={pitchLeft}
            y1={yShort}
            x2={pitchRight}
            y2={yShort}
            stroke="#D97706"
            strokeWidth="1.2"
            strokeDasharray="3,3"
          />
          <SvgText
            x={pitchLeft + 4}
            y={yShort - 3}
            fill="#B45309"
            fontSize="8"
            fontWeight="bold"
          >
            SHORT (11y)
          </SvgText>

          {/* ================= VERTICAL CORRIDOR & CREASE MARKS ================= */}
          {/* Center line */}
          <Line
            x1={xCenter}
            y1={pitchTop}
            x2={xCenter}
            y2={pitchBottom}
            stroke="rgba(120, 53, 15, 0.35)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {/* Channel corridors for Off & Leg stumps */}
          <Line
            x1={xCenter - stumpSpacing}
            y1={pitchTop + 18}
            x2={xCenter - stumpSpacing}
            y2={pitchBottom - 14}
            stroke="rgba(120, 53, 15, 0.2)"
            strokeWidth="1"
            strokeDasharray="2,3"
          />
          <Line
            x1={xCenter + stumpSpacing}
            y1={pitchTop + 18}
            x2={xCenter + stumpSpacing}
            y2={pitchBottom - 14}
            stroke="rgba(120, 53, 15, 0.2)"
            strokeWidth="1"
            strokeDasharray="2,3"
          />

          {/* ================= BATSMAN END (TOP) ================= */}
          {/* Popping Crease (Thick white line) */}
          <Line
            x1={pitchLeft + 4}
            y1={pitchTop + 20}
            x2={pitchRight - 4}
            y2={pitchTop + 20}
            stroke="#FFFFFF"
            strokeWidth="2.8"
          />
          {/* Batsman End Return Creases */}
          <Line
            x1={pitchLeft + 4}
            y1={pitchTop + 6}
            x2={pitchLeft + 4}
            y2={pitchTop + 26}
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />
          <Line
            x1={pitchRight - 4}
            y1={pitchTop + 6}
            x2={pitchRight - 4}
            y2={pitchTop + 26}
            stroke="#FFFFFF"
            strokeWidth="1.8"
          />
          {/* Bowling Crease / Stumps Line */}
          <Line
            x1={pitchLeft + 10}
            y1={pitchTop + 7}
            x2={pitchRight - 10}
            y2={pitchTop + 7}
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="1.5"
          />
          {/* Striker Stumps Vector */}
          <G>
            <Rect x={xCenter - 9} y={pitchTop + 6} width="4" height="11" fill="#FFFFFF" rx={1} />
            <Rect x={xCenter - 2} y={pitchTop + 6} width="4" height="11" fill="#FFFFFF" rx={1} />
            <Rect x={xCenter + 5} y={pitchTop + 6} width="4" height="11" fill="#FFFFFF" rx={1} />
            {/* Bails */}
            <Rect x={xCenter - 10} y={pitchTop + 5} width="20" height="2.5" fill="#F8FAFC" rx={1} />
          </G>
          <SvgText
            x={xCenter}
            y={pitchTop - 6}
            fill="#CBD5E1"
            fontSize="9"
            fontWeight="bold"
            letterSpacing="0.5"
            textAnchor="middle"
          >
            BATSMAN END (STRIKER)
          </SvgText>

          {/* ================= BOWLER END (BOTTOM) ================= */}
          {/* Bowler End Crease */}
          <Line
            x1={pitchLeft + 6}
            y1={pitchBottom - 14}
            x2={pitchRight - 6}
            y2={pitchBottom - 14}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          {/* Bowler End Return Creases */}
          <Line
            x1={pitchLeft + 6}
            y1={pitchBottom - 22}
            x2={pitchLeft + 6}
            y2={pitchBottom - 6}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <Line
            x1={pitchRight - 6}
            y1={pitchBottom - 22}
            x2={pitchRight - 6}
            y2={pitchBottom - 6}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          {/* Bowler End Stumps Vector */}
          <G>
            <Rect x={xCenter - 8} y={pitchBottom - 14} width="3.5" height="8" fill="#FFFFFF" rx={1} />
            <Rect x={xCenter - 1.75} y={pitchBottom - 14} width="3.5" height="8" fill="#FFFFFF" rx={1} />
            <Rect x={xCenter + 4.5} y={pitchBottom - 14} width="3.5" height="8" fill="#FFFFFF" rx={1} />
            {/* Bails */}
            <Rect x={xCenter - 9} y={pitchBottom - 16} width="18" height="2" fill="#F8FAFC" rx={1} />
          </G>
          <SvgText
            x={xCenter}
            y={pitchBottom + 16}
            fill="#CBD5E1"
            fontSize="9"
            fontWeight="bold"
            letterSpacing="0.5"
            textAnchor="middle"
          >
            BOWLER END
          </SvgText>

          {/* ================= HISTORICAL DELIVERIES ================= */}
          {(historicalPitches || []).map((hp, idx) => {
            const pt = getCoordinatesFromData(hp);
            const fromStumps = hp.impactPoint?.fromStumps ?? hp.pitchMap?.impactPoint?.fromStumps ?? 6;
            const dotColor = getPitchLengthColor(fromStumps);
            const isWicket = Boolean(hp.isWicket || hp.pitchMap?.isWicket);

            return (
              <G key={`hist-pitch-${idx}`}>
                {/* Glow ring */}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r="7"
                  fill={dotColor}
                  opacity="0.25"
                />
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  fill={isWicket ? "#EF4444" : dotColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />
                {isWicket && (
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                  />
                )}
              </G>
            );
          })}

          {/* ================= CURRENTLY SELECTED PITCH POINT ================= */}
          {pitchPoint && (
            <G>
              {/* Outer Pulsing Crosshair Rings */}
              <Circle
                cx={pitchPoint.x}
                cy={pitchPoint.y}
                r="18"
                fill="none"
                stroke="#EF4444"
                strokeWidth="1.5"
                opacity="0.5"
                strokeDasharray="4,2"
              />
              <Circle
                cx={pitchPoint.x}
                cy={pitchPoint.y}
                r="11"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2"
              />
              {/* Center Impact Core */}
              <Circle
                cx={pitchPoint.x}
                cy={pitchPoint.y}
                r="6.5"
                fill="#EF4444"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <Circle cx={pitchPoint.x} cy={pitchPoint.y} r="2" fill="#FFFFFF" />
            </G>
          )}
        </Svg>
      </TouchableOpacity>

      {/* Touch prompt / Pitch Info Row */}
      {!readOnly && (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
              borderColor: isDarkMode ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.infoLabel,
                { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
              ]}
              numberOfLines={1}
            >
              {ballData?.lengthZone
                ? `🎯 ${ballData.lengthZone} • ${ballData.lineZone}`
                : "👆 Tap pitch to set ball landing"}
            </Text>
            {ballData?.impactPoint && (
              <Text
                style={[
                  styles.infoSub,
                  { color: isDarkMode ? "#94A3B8" : "#64748B" },
                ]}
              >
                {`${ballData.impactPoint.fromStumps}y from stumps • ${stance}`}
              </Text>
            )}
          </View>

          {pitchPoint && (
            <TouchableOpacity
              onPress={clearPitch}
              style={styles.clearMiniBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.clearMiniBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Length Zone Legend */}
      <View style={styles.legendContainer}>
        {LENGTH_ZONES.map((zone) => (
          <View key={zone.name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: zone.color }]} />
            <Text
              style={[
                styles.legendText,
                { color: isDarkMode ? "#94A3B8" : "#64748B" },
              ]}
            >
              {zone.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    width: "100%",
  },
  topHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  stancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  stanceIcon: {
    fontSize: 12,
  },
  stanceText: {
    fontSize: 11,
    fontWeight: "700",
  },
  stanceSwitchCue: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  pitchWrapper: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  svg: {
    alignSelf: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  clearMiniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    marginLeft: 8,
  },
  clearMiniBtnText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "700",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export default PitchMap;
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
  Ellipse,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

export const LENGTH_ZONES = [
  { name: "Yorker", color: "#3B82F6", range: [0, 2] },
  { name: "Full", color: "#06B6D4", range: [2, 4.5] },
  { name: "Good Length", color: "#10B981", range: [4.5, 7.5] },
  { name: "Short", color: "#F59E0B", range: [7.5, 11] },
  { name: "Bouncer", color: "#EF4444", range: [11, 22] },
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
  width = 300,
  height = 360,
  isDarkMode = false,
  title = "",
}) => {
  const [pitchPoint, setPitchPoint] = useState(selectedPitch?.coordinates || null);
  const [ballData, setBallData] = useState(selectedPitch || null);

  useEffect(() => {
    if (selectedPitch) {
      setPitchPoint(selectedPitch.coordinates || selectedPitch.rawCoordinates || null);
      setBallData(selectedPitch);
    } else if (selectedPitch === null && !readOnly) {
      setPitchPoint(null);
      setBallData(null);
    }
  }, [selectedPitch, readOnly]);

  // Pitch coordinate boundaries in SVG
  const pitchLeft = width * 0.22;
  const pitchRight = width * 0.78;
  const pitchTop = height * 0.12; // Bowler's end
  const pitchBottom = height * 0.86; // Batsman's end
  const pitchWidth = pitchRight - pitchLeft;
  const pitchHeight = pitchBottom - pitchTop;

  // Length calculation (22 yards pitch)
  const calculatePitchData = (x, y) => {
    // Normalization (0 to 1 inside pitch)
    const normX = Math.max(0, Math.min(1, (x - pitchLeft) / pitchWidth));
    // 0 is batsman end (bottom), 1 is bowler end (top)
    const normY = Math.max(0, Math.min(1, (pitchBottom - y) / pitchHeight));

    const yardsFromStumps = (normY * 22).toFixed(1);
    // Line: -5 to +5 feet from center
    const feetFromCenter = ((normX - 0.5) * 10).toFixed(1);

    let lengthZone = "Good Length";
    if (yardsFromStumps <= 2) lengthZone = "Yorker";
    else if (yardsFromStumps <= 4.5) lengthZone = "Full";
    else if (yardsFromStumps <= 7.5) lengthZone = "Good Length";
    else if (yardsFromStumps <= 11) lengthZone = "Short";
    else lengthZone = "Bouncer";

    let lineZone = "Middle";
    if (feetFromCenter < -1.8) lineZone = "Outside Off";
    else if (feetFromCenter < -0.6) lineZone = "Off Stump";
    else if (feetFromCenter <= 0.6) lineZone = "Middle Stump";
    else if (feetFromCenter <= 1.8) lineZone = "Leg Stump";
    else lineZone = "Down Leg";

    return {
      coordinates: { x: Math.round(x), y: Math.round(y) },
      impactPoint: {
        fromStumps: yardsFromStumps,
        fromCenter: feetFromCenter,
        lengthZone,
        lineZone,
      },
      lengthZone,
      lineZone,
      timestamp: Date.now(),
    };
  };

  const handleTouch = (event) => {
    if (readOnly) return;
    const { locationX, locationY } = event.nativeEvent;

    // Confine touch to pitch rect with padding
    if (
      locationX < pitchLeft - 10 ||
      locationX > pitchRight + 10 ||
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

  // Convert yards from stumps & feet from center back to SVG coordinates for historical points
  const getCoordinatesFromData = (item) => {
    const coords = item.coordinates || item.rawCoordinates || item.pitchMap?.coordinates;
    if (coords && coords.x && coords.y) {
      return coords;
    }
    const fromStumps = Number(item.impactPoint?.fromStumps ?? item.pitchMap?.impactPoint?.fromStumps ?? 6);
    const fromCenter = Number(item.impactPoint?.fromCenter ?? item.pitchMap?.impactPoint?.fromCenter ?? 0);

    const normY = fromStumps / 22;
    const normX = fromCenter / 10 + 0.5;

    return {
      x: pitchLeft + normX * pitchWidth,
      y: pitchBottom - normY * pitchHeight,
    };
  };

  return (
    <View style={styles.container}>
      {title ? (
        <Text style={[styles.titleText, { color: isDarkMode ? "#F8FAFC" : "#0F172A" }]}>
          {title}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.pitchWrapper,
          {
            width,
            height,
            backgroundColor: isDarkMode ? "#092e20" : "#1e4e38",
            borderColor: isDarkMode ? "#334155" : "#15803D",
          },
        ]}
        onPress={handleTouch}
        activeOpacity={readOnly ? 1 : 0.9}
      >
        <Svg width={width} height={height} style={styles.svg}>
          <Defs>
            <LinearGradient id="pitchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#d2b48c" />
              <Stop offset="50%" stopColor="#e5c29f" />
              <Stop offset="100%" stopColor="#d2b48c" />
            </LinearGradient>
          </Defs>

          {/* Grass Field Background */}
          <Rect x="0" y="0" width={width} height={height} fill={isDarkMode ? "#0b3323" : "#245a41"} />

          {/* Cricket Pitch Strip */}
          <Rect
            x={pitchLeft}
            y={pitchTop}
            width={pitchWidth}
            height={pitchHeight}
            fill="url(#pitchGrad)"
            stroke="#8B4513"
            strokeWidth="1.5"
            rx={4}
          />

          {/* Length Section Lines & Indicators (from Batsman end upwards) */}
          {/* Yorker Line (2y) */}
          <Line
            x1={pitchLeft}
            y1={pitchBottom - (2 / 22) * pitchHeight}
            x2={pitchRight}
            y2={pitchBottom - (2 / 22) * pitchHeight}
            stroke="#3B82F677"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          {/* Full Line (4.5y) */}
          <Line
            x1={pitchLeft}
            y1={pitchBottom - (4.5 / 22) * pitchHeight}
            x2={pitchRight}
            y2={pitchBottom - (4.5 / 22) * pitchHeight}
            stroke="#06B6D477"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          {/* Good Length Line (7.5y) */}
          <Line
            x1={pitchLeft}
            y1={pitchBottom - (7.5 / 22) * pitchHeight}
            x2={pitchRight}
            y2={pitchBottom - (7.5 / 22) * pitchHeight}
            stroke="#10B98177"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          {/* Short Line (11y) */}
          <Line
            x1={pitchLeft}
            y1={pitchBottom - (11 / 22) * pitchHeight}
            x2={pitchRight}
            y2={pitchBottom - (11 / 22) * pitchHeight}
            stroke="#F59E0B77"
            strokeWidth="1"
            strokeDasharray="3,3"
          />

          {/* Bowler End Crease (Top) */}
          <Line
            x1={pitchLeft + 4}
            y1={pitchTop + 14}
            x2={pitchRight - 4}
            y2={pitchTop + 14}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          {/* Bowler End Stumps */}
          <G>
            <Rect x={width / 2 - 8} y={pitchTop + 6} width="3" height="8" fill="#FFFFFF" />
            <Rect x={width / 2 - 1.5} y={pitchTop + 6} width="3" height="8" fill="#FFFFFF" />
            <Rect x={width / 2 + 5} y={pitchTop + 6} width="3" height="8" fill="#FFFFFF" />
          </G>
          <SvgText
            x={width / 2}
            y={pitchTop - 4}
            fill="#CBD5E1"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            BOWLER END
          </SvgText>

          {/* Center Guide Line */}
          <Line
            x1={width / 2}
            y1={pitchTop}
            x2={width / 2}
            y2={pitchBottom}
            stroke="#A0522D55"
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {/* Batsman End Crease (Popping Crease) */}
          <Line
            x1={pitchLeft + 4}
            y1={pitchBottom - 20}
            x2={pitchRight - 4}
            y2={pitchBottom - 20}
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
          {/* Batsman End Stumps */}
          <G>
            <Rect x={width / 2 - 9} y={pitchBottom - 8} width="4" height="10" fill="#FFFFFF" />
            <Rect x={width / 2 - 2} y={pitchBottom - 8} width="4" height="10" fill="#FFFFFF" />
            <Rect x={width / 2 + 5} y={pitchBottom - 8} width="4" height="10" fill="#FFFFFF" />
          </G>
          <SvgText
            x={width / 2}
            y={pitchBottom + 16}
            fill="#CBD5E1"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            BATSMAN END
          </SvgText>

          {/* Historical Delivery Dots */}
          {(historicalPitches || []).map((hp, idx) => {
            const pt = getCoordinatesFromData(hp);
            const fromStumps = hp.impactPoint?.fromStumps ?? hp.pitchMap?.impactPoint?.fromStumps ?? 6;
            const dotColor = getPitchLengthColor(fromStumps);
            return (
              <G key={`hist-pitch-${idx}`}>
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill={dotColor}
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  opacity="0.9"
                />
              </G>
            );
          })}

          {/* Currently Selected Pitch Point */}
          {pitchPoint && (
            <G>
              {/* Target Rings */}
              <Circle
                cx={pitchPoint.x}
                cy={pitchPoint.y}
                r="14"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2"
                strokeDasharray="4,2"
              />
              <Circle
                cx={pitchPoint.x}
                cy={pitchPoint.y}
                r="7"
                fill="#EF4444"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <Circle cx={pitchPoint.x} cy={pitchPoint.y} r="2.5" fill="#FFFFFF" />
            </G>
          )}
        </Svg>
      </TouchableOpacity>

      {/* Touch prompt / Pitch Info Row */}
      {!readOnly && (
        <View style={styles.infoRow}>
          <Text
            style={[
              styles.infoLabel,
              { color: isDarkMode ? "#E2E8F0" : "#334155" },
            ]}
          >
            {ballData?.lengthZone
              ? `🎯 ${ballData.lengthZone} • ${ballData.lineZone} (${ballData.impactPoint.fromStumps}y)`
              : "👆 Tap where the delivery pitched"}
          </Text>
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

      {/* Legend for Length Zones */}
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
  },
  titleText: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  pitchWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  svg: {
    alignSelf: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 12,
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  clearMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  clearMiniBtnText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "700",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
  },
});

export default PitchMap;
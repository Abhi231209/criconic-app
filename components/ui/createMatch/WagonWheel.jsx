import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Svg, {
  Circle,
  Path,
  G,
  Text as SvgText,
  Line,
  Rect,
} from "react-native-svg";

export const ZONES = [
  { id: 1, name: "Deep Mid Wicket", shortName: "Mid Wkt", color: "#FF6B6B", startAngle: 0, endAngle: 45 },
  { id: 2, name: "Long On", shortName: "Long On", color: "#4ECDC4", startAngle: 45, endAngle: 90 },
  { id: 3, name: "Long Off", shortName: "Long Off", color: "#FFE66D", startAngle: 90, endAngle: 135 },
  { id: 4, name: "Deep Cover", shortName: "Cover", color: "#1A535C", startAngle: 135, endAngle: 180 },
  { id: 5, name: "Deep Point", shortName: "Point", color: "#FF9F1C", startAngle: 180, endAngle: 225 },
  { id: 6, name: "Third Man", shortName: "Third Man", color: "#8B5CF6", startAngle: 225, endAngle: 270 },
  { id: 7, name: "Deep Fine Leg", shortName: "Fine Leg", color: "#EC4899", startAngle: 270, endAngle: 315 },
  { id: 8, name: "Deep Square Leg", shortName: "Sq Leg", color: "#10B981", startAngle: 315, endAngle: 360 },
];

export const getShotColor = (shot = {}) => {
  if (shot.isWicket || shot.wagonWheel?.isWicket) return "#EF4444"; // Red for out
  const runs = Number(shot.runs ?? shot.wagonWheel?.runs ?? 0);
  if (runs >= 6) return "#A855F7"; // Purple for 6
  if (runs >= 4) return "#10B981"; // Green for 4
  if (runs > 0) return "#3B82F6";  // Blue for 1, 2, 3
  return "#94A3B8";               // Slate for dot
};

const WagonWheel = ({
  onSelectShot,
  selectedShot = null,
  historicalShots = [],
  readOnly = false,
  size = 280,
  showLegend = true,
  showZoneStats = false,
  isDarkMode = false,
  title = "",
  runs = 0,
  isBoundary = false,
  isWicket = false,
}) => {
  const [currentShot, setCurrentShot] = useState(selectedShot);
  const [lastTouch, setLastTouch] = useState(null);

  useEffect(() => {
    if (selectedShot) {
      setCurrentShot(selectedShot);
      const zone = ZONES.find((z) => z.id === selectedShot.zone);
      if (zone) {
        setLastTouch({ zone: zone.name, angle: selectedShot.angle });
      }
    } else if (selectedShot === null && !readOnly) {
      setCurrentShot(null);
      setLastTouch(null);
    }
  }, [selectedShot, readOnly]);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 10;
  const innerCircleRadius = radius * 0.52; // 30 yard circle

  const handleTouchCoord = (x, y) => {
    if (readOnly) return;
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > radius) return; // outside boundary

    const zone = ZONES.find((z) => {
      if (z.startAngle > z.endAngle) {
        return angle >= z.startAngle || angle < z.endAngle;
      }
      return angle >= z.startAngle && angle < z.endAngle;
    });

    if (zone) {
      const shotData = {
        zone: zone.id,
        zoneName: zone.name,
        angle: Math.round(angle),
        distance: Math.min(Math.round(distance), radius),
        normalizedDistance: (distance / radius).toFixed(2),
        x: Math.round(x),
        y: Math.round(y),
        runs: Number(runs || 0),
        isBoundary: Boolean(isBoundary),
        isWicket: Boolean(isWicket),
        timestamp: Date.now(),
      };
      setLastTouch({ x, y, zone: zone.name });
      setCurrentShot(shotData);
      onSelectShot?.(shotData);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !readOnly,
    onMoveShouldSetPanResponder: () => !readOnly,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      handleTouchCoord(locationX, locationY);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      handleTouchCoord(locationX, locationY);
    },
  });

  const clearShot = () => {
    setCurrentShot(null);
    setLastTouch(null);
    onSelectShot?.(null);
  };

  const renderZone = (zone) => {
    const startRad = (zone.startAngle * Math.PI) / 180;
    const endRad = (zone.endAngle * Math.PI) / 180;

    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);

    const largeArc = zone.endAngle - zone.startAngle <= 180 ? "0" : "1";
    const pathData = `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;

    const isSelected = currentShot?.zone === zone.id;
    const fillOpacity = isSelected ? "55" : "22";

    const midAngle = ((zone.startAngle + zone.endAngle) / 2) * (Math.PI / 180);
    const labelDist = radius * 0.76;
    const labelX = centerX + labelDist * Math.cos(midAngle);
    const labelY = centerY + labelDist * Math.sin(midAngle);

    return (
      <G key={zone.id}>
        <Path
          d={pathData}
          fill={`${zone.color}${fillOpacity}`}
          stroke={isDarkMode ? "#334155" : "#E2E8F0"}
          strokeWidth="1"
        />
        <SvgText
          x={labelX}
          y={labelY}
          fill={isDarkMode ? "#CBD5E1" : "#1E293B"}
          fontSize={size < 260 ? "8" : "9"}
          fontWeight="bold"
          textAnchor="middle"
        >
          {zone.shortName}
        </SvgText>
      </G>
    );
  };

  // Render historical shots
  const renderHistoricalShots = () => {
    if (!historicalShots || historicalShots.length === 0) return null;

    return historicalShots.map((shot, idx) => {
      const shotAngle = Number(shot.angle ?? shot.wagonWheel?.angle ?? 0);
      const rawDist = Number(shot.distance ?? shot.wagonWheel?.distance ?? radius * 0.8);
      // distance may be stored as: a normalized fraction (0-1), a legacy pixel
      // value (captured on an older wheel with a fixed 140 radius), or a
      // pixel value already matching the current radius.
      let shotDistance;
      if (rawDist > 0 && rawDist <= 1) {
        shotDistance = rawDist * radius;
      } else if (rawDist > 20) {
        const scaleFactor = radius / 140; // original wheel was 140 radius
        shotDistance = rawDist * (scaleFactor < 1 ? scaleFactor : 1);
      } else {
        shotDistance = rawDist;
      }
      shotDistance = Math.min(shotDistance, radius);

      const rad = (shotAngle * Math.PI) / 180;
      const shotX = centerX + shotDistance * Math.cos(rad);
      const shotY = centerY + shotDistance * Math.sin(rad);
      const color = getShotColor({ ...(shot.wagonWheel || {}), ...shot });

      return (
        <G key={`hist-${idx}`}>
          <Line
            x1={centerX}
            y1={centerY}
            x2={shotX}
            y2={shotY}
            stroke={color}
            strokeWidth="1.8"
            strokeOpacity="0.85"
          />
          <Circle
            cx={shotX}
            cy={shotY}
            r="4.5"
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="1"
          />
        </G>
      );
    });
  };

  // Render currently selected shot
  const renderCurrentShot = () => {
    if (!currentShot) return null;
    const shotDist = Math.min(Number(currentShot.distance || radius * 0.85), radius);
    const rad = (Number(currentShot.angle || 0) * Math.PI) / 180;
    const shotX = centerX + shotDist * Math.cos(rad);
    const shotY = centerY + shotDist * Math.sin(rad);

    const zone = ZONES.find((z) => z.id === currentShot.zone);
    const markerColor = zone ? zone.color : "#2563EB";

    return (
      <G>
        <Line
          x1={centerX}
          y1={centerY}
          x2={shotX}
          y2={shotY}
          stroke="#EF4444"
          strokeWidth="3.5"
          strokeDasharray="4,2"
        />
        <Circle
          cx={shotX}
          cy={shotY}
          r="8"
          fill="#EF4444"
          stroke="#FFFFFF"
          strokeWidth="2.5"
        />
        <Circle cx={shotX} cy={shotY} r="3" fill="#FFFFFF" />
      </G>
    );
  };

  // Compute zone statistics
  const zoneStats = ZONES.map((zone) => {
    const shotsInZone = (historicalShots || []).filter(
      (s) => (s.wagonWheel?.zone || s.zone) === zone.id
    );
    const runsInZone = shotsInZone.reduce(
      (sum, s) => sum + Number(s.runs || s.wagonWheel?.runs || 0),
      0
    );
    return {
      ...zone,
      count: shotsInZone.length,
      runs: runsInZone,
    };
  });

  return (
    <View style={styles.container}>
      {title ? (
        <Text
          style={[
            styles.titleText,
            { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
          ]}
        >
          {title}
        </Text>
      ) : null}

      <View
        style={[
          styles.wheelWrapper,
          {
            width: size,
            height: size,
            backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
            borderColor: isDarkMode ? "#334155" : "#E2E8F0",
          },
        ]}
        {...(readOnly ? {} : panResponder.panHandlers)}
      >
        <Svg height={size} width={size}>
          {/* Ground Outfield */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill={isDarkMode ? "#14532D33" : "#DCFCE766"}
            stroke={isDarkMode ? "#22C55E" : "#16A34A"}
            strokeWidth="3"
          />

          {/* Zones */}
          {ZONES.map((zone) => renderZone(zone))}

          {/* 30 Yard Infield Circle */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={innerCircleRadius}
            fill="none"
            stroke={isDarkMode ? "#64748B88" : "#94A3B888"}
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />

          {/* Pitch Rect in Center */}
          <Rect
            x={centerX - size * 0.02}
            y={centerY - size * 0.12}
            width={size * 0.04}
            height={size * 0.24}
            fill="#B45309"
            rx={2}
          />

          {/* Batsman Marker (Center) */}
          <Circle cx={centerX} cy={centerY} r="6" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1.5" />

          {/* Historical Shots */}
          {renderHistoricalShots()}

          {/* Current Active Shot */}
          {renderCurrentShot()}
        </Svg>
      </View>

      {/* Touch prompt / Selected Zone Info */}
      {!readOnly && (
        <View style={styles.infoRow}>
          <Text
            style={[
              styles.infoLabel,
              { color: isDarkMode ? "#E2E8F0" : "#334155" },
            ]}
          >
            {lastTouch?.zone
              ? `🎯 Shot: ${lastTouch.zone}`
              : "👆 Tap on field to mark shot direction"}
          </Text>
          {currentShot && (
            <TouchableOpacity
              onPress={clearShot}
              style={styles.clearMiniBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.clearMiniBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Legend */}
      {showLegend && (
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#A855F7" }]} />
            <Text style={[styles.legendText, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              6 Runs
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
            <Text style={[styles.legendText, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              4 Runs
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
            <Text style={[styles.legendText, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              1-3 Runs
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
            <Text style={[styles.legendText, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              Wicket
            </Text>
          </View>
        </View>
      )}

      {/* Zone Statistics Breakdown (Optional) */}
      {showZoneStats && (
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
              borderColor: isDarkMode ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <Text
            style={[
              styles.statsTitle,
              { color: isDarkMode ? "#F1F5F9" : "#0F172A" },
            ]}
          >
            Zone Breakdown
          </Text>
          <View style={styles.statsGrid}>
            {zoneStats.map((z) => (
              <View key={z.id} style={styles.statCell}>
                <View style={[styles.statDot, { backgroundColor: z.color }]} />
                <Text
                  style={[
                    styles.statCellName,
                    { color: isDarkMode ? "#94A3B8" : "#64748B" },
                  ]}
                  numberOfLines={1}
                >
                  {z.shortName}
                </Text>
                <Text
                  style={[
                    styles.statCellValue,
                    { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                  ]}
                >
                  {z.runs}r ({z.count})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  wheelWrapper: {
    borderRadius: 200,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
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
    gap: 12,
    marginTop: 10,
    flexWrap: "wrap",
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
  statsCard: {
    width: "100%",
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 6,
  },
  statCell: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statCellName: {
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
  },
  statCellValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
});

export default WagonWheel;
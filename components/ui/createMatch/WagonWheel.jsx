import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
} from "react-native";
import Svg, {
  Circle,
  G,
  Text as SvgText,
  Line,
  Rect,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";

export const ZONES = [
  { id: 1, name: "Deep Mid Wicket", shortName: "Mid Wkt", startAngle: 0, endAngle: 45 },
  { id: 2, name: "Long On", shortName: "Long On", startAngle: 45, endAngle: 90 },
  { id: 3, name: "Long Off", shortName: "Long Off", startAngle: 90, endAngle: 135 },
  { id: 4, name: "Deep Cover", shortName: "Cover", startAngle: 135, endAngle: 180 },
  { id: 5, name: "Deep Point", shortName: "Point", startAngle: 180, endAngle: 225 },
  { id: 6, name: "Third Man", shortName: "Third Man", startAngle: 225, endAngle: 270 },
  { id: 7, name: "Deep Fine Leg", shortName: "Fine Leg", startAngle: 270, endAngle: 315 },
  { id: 8, name: "Deep Square Leg", shortName: "Sq Leg", startAngle: 315, endAngle: 360 },
];

export const BOX_ZONES = [
  { id: 1, name: "Off Side Net", shortName: "Off Net" },
  { id: 2, name: "Leg Side Net", shortName: "Leg Net" },
  { id: 3, name: "Front Wall", shortName: "Front Wall" },
  { id: 4, name: "Back Net", shortName: "Back Net" },
];

export const getZoneFromAngle = (angle) => {
  const norm = ((angle % 360) + 360) % 360;
  return ZONES.find((z) => norm >= z.startAngle && norm < z.endAngle) || ZONES[0];
};

// Ball colors on wagon wheel are strictly based on runs scored & wickets (never zones)
export const getShotColor = (shot = {}) => {
  if (shot.isWicket || shot.wagonWheel?.isWicket) return "#EF4444"; // Red for out
  const runs = Number(shot.runs ?? shot.wagonWheel?.runs ?? 0);
  if (runs >= 6) return "#A855F7"; // Purple for 6
  if (runs >= 4) return "#10B981"; // Emerald Green for 4
  if (runs > 0) return "#3B82F6";  // Sky Blue for 1, 2, 3
  return "#94A3B8";               // Slate for dot ball
};

const WagonWheel = ({
  onSelectShot,
  selectedShot = null,
  historicalShots = [],
  readOnly = false,
  size = 290,
  showLegend = true,
  isDarkMode = false,
  title = "",
  leftSideLabel = "",
  rightSideLabel = "",
  runs = 0,
  isBoundary = false,
  isWicket = false,
  isBoxCricket = false,
  matchType = "",
  batterStance = "RHB", // "RHB" | "LHB"
}) => {
  const isBox = Boolean(isBoxCricket || matchType === "box");
  const isRHB = (batterStance || "RHB").toUpperCase() !== "LHB";

  const [currentShot, setCurrentShot] = useState(selectedShot);
  const [lastTouch, setLastTouch] = useState(null);

  useEffect(() => {
    if (selectedShot) {
      setCurrentShot(selectedShot);
      setLastTouch({
        zone: selectedShot.zoneName || (selectedShot.isOffSide ? "Off Side" : "Leg Side"),
        angle: selectedShot.angle,
      });
    } else if (selectedShot === null && !readOnly) {
      setCurrentShot(null);
      setLastTouch(null);
    }
  }, [selectedShot, readOnly, isBox]);

  // Dimensions for Standard Wheel
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 12;
  const innerCircleRadius = radius * 0.52; // 30 yard circle

  // Dimensions for Box Cricket Arena
  const boxPadding = 12;
  const boxWidth = size - boxPadding * 2;
  const boxHeight = size - boxPadding * 2;
  const boxLeft = boxPadding;
  const boxRight = size - boxPadding;
  const boxTop = boxPadding;
  const boxBottom = size - boxPadding;
  const boxCenterX = size / 2;
  const boxCenterY = size / 2;

  // Calculate coordinates for a shot
  const getShotCoordinates = (shot) => {
    const runsVal = Number(shot.runs ?? shot.wagonWheel?.runs ?? 0);
    const isFourOrSix = runsVal === 4 || runsVal === 6 || Boolean(shot.isBoundary || shot.wagonWheel?.isBoundary);
    const boundaryDist = isBox ? boxWidth * 0.46 : radius;

    if (shot.x !== undefined && shot.y !== undefined) {
      if (isFourOrSix) {
        const originX = isBox ? boxCenterX : centerX;
        const originY = isBox ? boxCenterY : centerY;
        const dx = shot.x - originX;
        const dy = shot.y - originY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        if (currentDist > 0 && currentDist < boundaryDist) {
          const scale = boundaryDist / currentDist;
          return {
            x: originX + dx * scale,
            y: originY + dy * scale,
          };
        }
      }
      return { x: shot.x, y: shot.y };
    }

    const shotAngle = Number(shot.angle ?? shot.wagonWheel?.angle ?? 0);
    const rawDist = Number(shot.distance ?? shot.wagonWheel?.distance ?? radius * 0.8);

    let shotDistance;
    if (isFourOrSix) {
      shotDistance = boundaryDist;
    } else if (rawDist > 0 && rawDist <= 1) {
      shotDistance = rawDist * boundaryDist;
    } else if (rawDist > 20) {
      const scaleFactor = radius / 140;
      shotDistance = rawDist * (scaleFactor < 1 ? scaleFactor : 1);
    } else {
      shotDistance = rawDist;
    }
    shotDistance = Math.min(shotDistance, boundaryDist);

    const rad = (shotAngle * Math.PI) / 180;
    const originX = isBox ? boxCenterX : centerX;
    const originY = isBox ? boxCenterY : centerY;
    const creaseY = isBox ? boxCenterY - 8 : centerY - 6;
    return {
      x: originX + shotDistance * Math.cos(rad),
      y: creaseY + shotDistance * Math.sin(rad),
    };
  };

  // Compute total runs and percentages for Off Side vs Leg Side (Crex style)
  const { leftRuns, rightRuns, leftPct, rightPct } = useMemo(() => {
    let left = 0;
    let right = 0;
    (historicalShots || []).forEach((shot) => {
      const { x: shotX } = getShotCoordinates(shot);
      const r = Number(shot.runs ?? shot.wagonWheel?.runs ?? 0);
      const originX = isBox ? boxCenterX : centerX;
      if (shotX < originX) {
        left += r;
      } else {
        right += r;
      }
    });
    const total = left + right;
    const lPct = total > 0 ? Math.round((left / total) * 100) : 50;
    const rPct = total > 0 ? 100 - lPct : 50;
    return { leftRuns: left, rightRuns: right, leftPct: lPct, rightPct: rPct };
  }, [historicalShots, isBox, boxCenterX, centerX]);

  // Touch handler for Standard Circular Stadium
  const handleTouchCircular = (x, y) => {
    if (readOnly) return;
    const creaseY = centerY - 6;
    const dx = x - centerX;
    const dy = y - creaseY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    const rawDistance = Math.sqrt(dx * dx + dy * dy);
    if (rawDistance > radius + 20) return; // outside boundary

    const isFourOrSix = Number(runs || 0) === 4 || Number(runs || 0) === 6 || Boolean(isBoundary);
    const finalDistance = isFourOrSix ? radius : Math.min(Math.round(rawDistance), radius);
    const normalizedDistance = isFourOrSix ? "1.00" : (finalDistance / radius).toFixed(2);

    const rad = (angle * Math.PI) / 180;
    const finalX = isFourOrSix ? Math.round(centerX + radius * Math.cos(rad)) : Math.round(x);
    const finalY = isFourOrSix ? Math.round(creaseY + radius * Math.sin(rad)) : Math.round(y);

    const isLeft = x < centerX;
    const isOffSide = isRHB ? isLeft : !isLeft;
    const zoneObj = getZoneFromAngle(angle);

    const shotData = {
      zone: zoneObj.id,
      zoneName: zoneObj.name,
      shortZoneName: zoneObj.shortName,
      isOffSide,
      angle: Math.round(angle),
      distance: Math.round(finalDistance),
      normalizedDistance,
      x: finalX,
      y: finalY,
      runs: Number(runs || 0),
      isBoundary: isFourOrSix || Boolean(isBoundary),
      isWicket: Boolean(isWicket),
      isBoxCricket: false,
      timestamp: Date.now(),
    };
    setLastTouch({ x: finalX, y: finalY, zone: zoneObj.name });
    setCurrentShot(shotData);
    onSelectShot?.(shotData);
  };

  // Touch handler for Box Cricket Rectangular Arena
  const handleTouchBox = (x, y) => {
    if (readOnly) return;
    if (x < boxLeft - 10 || x > boxRight + 10 || y < boxTop - 10 || y > boxBottom + 10) return;

    const dx = x - boxCenterX;
    const dy = y - boxCenterY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;

    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
    const maxBoxRadius = boxWidth * 0.46;
    const isFourOrSix = Number(runs || 0) === 4 || Number(runs || 0) === 6 || Boolean(isBoundary);
    const finalDistance = isFourOrSix ? maxBoxRadius : Math.min(Math.round(distFromCenter), maxBoxRadius);
    const normalizedDistance = isFourOrSix ? "1.00" : (finalDistance / maxBoxRadius).toFixed(2);

    const rad = (angle * Math.PI) / 180;
    const finalX = isFourOrSix ? Math.round(boxCenterX + finalDistance * Math.cos(rad)) : Math.round(x);
    const finalY = isFourOrSix ? Math.round(boxCenterY + finalDistance * Math.sin(rad)) : Math.round(y);

    const isLeft = x < boxCenterX;
    const isOffSide = isRHB ? isLeft : !isLeft;
    let zoneObj = isLeft ? BOX_ZONES[0] : BOX_ZONES[1];
    if (y < boxCenterY - boxHeight * 0.3) zoneObj = BOX_ZONES[2]; // Front Wall
    else if (y > boxCenterY + boxHeight * 0.3) zoneObj = BOX_ZONES[3]; // Back Net

    const shotData = {
      zone: zoneObj.id,
      zoneName: zoneObj.name,
      shortZoneName: zoneObj.shortName,
      isOffSide,
      angle: Math.round(angle),
      distance: Math.round(finalDistance),
      normalizedDistance,
      x: finalX,
      y: finalY,
      runs: Number(runs || 0),
      isBoundary: isFourOrSix || Boolean(isBoundary),
      isWicket: Boolean(isWicket),
      isBoxCricket: true,
      timestamp: Date.now(),
    };
    setLastTouch({ x: finalX, y: finalY, zone: zoneObj.name });
    setCurrentShot(shotData);
    onSelectShot?.(shotData);
  };

  const handleTouch = (x, y) => {
    if (isBox) {
      handleTouchBox(x, y);
    } else {
      handleTouchCircular(x, y);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !readOnly,
    onMoveShouldSetPanResponder: () => !readOnly,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      handleTouch(locationX, locationY);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      handleTouch(locationX, locationY);
    },
  });

  const clearShot = () => {
    setCurrentShot(null);
    setLastTouch(null);
    onSelectShot?.(null);
  };

  // Render 8 Cricket Field Sectors with divider lines & names around the boundary
  const renderCircularSectors = () => {
    return (
      <G>
        {ZONES.map((z) => {
          const rad = (z.startAngle * Math.PI) / 180;
          const xEnd = centerX + radius * Math.cos(rad);
          const yEnd = centerY + radius * Math.sin(rad);

          const midRad = (((z.startAngle + z.endAngle) / 2) * Math.PI) / 180;
          const labelDist = radius * 0.82;
          const labelX = centerX + labelDist * Math.cos(midRad);
          const labelY = centerY + labelDist * Math.sin(midRad);

          return (
            <G key={`zone-sector-${z.id}`}>
              {/* Radial sector division dashed line */}
              <Line
                x1={centerX + innerCircleRadius * 0.5 * Math.cos(rad)}
                y1={centerY + innerCircleRadius * 0.5 * Math.sin(rad)}
                x2={xEnd}
                y2={yEnd}
                stroke={isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.35)"}
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Sector Name label */}
              <SvgText
                x={labelX}
                y={labelY + 3.5}
                fill={isDarkMode ? "rgba(248, 250, 252, 0.85)" : "rgba(255, 255, 255, 0.95)"}
                fontSize="8.5"
                fontWeight="bold"
                letterSpacing="0.3"
                textAnchor="middle"
              >
                {z.shortName}
              </SvgText>
            </G>
          );
        })}

        {/* Subtle Pitch Axis Center Line */}
        <Line
          x1={centerX}
          y1={centerY - radius}
          x2={centerX}
          y2={centerY + radius}
          stroke={isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.2)"}
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      </G>
    );
  };

  // Box Cricket Arena Net Walls & Markings (Crex clean style)
  const renderBoxArena = () => {
    return (
      <G>
        {/* Enclosed Box Outer Net Walls */}
        <Rect
          x={boxLeft}
          y={boxTop}
          width={boxWidth}
          height={boxHeight}
          rx={8}
          fill="none"
          stroke={isDarkMode ? "#38BDF8" : "#0284C7"}
          strokeWidth="3.5"
        />

        {/* Net Mesh Perimeter Guide */}
        <Rect
          x={boxLeft + 3}
          y={boxTop + 3}
          width={boxWidth - 6}
          height={boxHeight - 6}
          rx={6}
          fill="none"
          stroke={isDarkMode ? "rgba(56, 189, 248, 0.25)" : "rgba(2, 132, 199, 0.25)"}
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />

        {/* Center Pitch Vertical Dividing Line */}
        <Line
          x1={boxCenterX}
          y1={boxTop}
          x2={boxCenterX}
          y2={boxBottom}
          stroke={isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.25)"}
          strokeWidth="1.2"
          strokeDasharray="4,4"
        />

        {/* Front Wall */}
        <Rect
          x={boxCenterX - 45}
          y={boxTop + 6}
          width="90"
          height="16"
          rx="4"
          fill={isDarkMode ? "rgba(15, 23, 42, 0.8)" : "rgba(0, 0, 0, 0.45)"}
        />
        <SvgText
          x={boxCenterX}
          y={boxTop + 18}
          fill="#38BDF8"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
        >
          ▲ FRONT WALL
        </SvgText>

        {/* Left Net (OFF SIDE for RHB / LEG SIDE for LHB) */}
        <G>
          <Rect
            x={boxLeft + 8}
            y={boxCenterY - 14}
            width={boxCenterX - boxLeft - 18}
            height={28}
            rx={5}
            fill={isDarkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(0, 0, 0, 0.5)"}
          />
          <SvgText
            x={boxLeft + 8 + (boxCenterX - boxLeft - 18) / 2}
            y={boxCenterY + 4}
            fill="#38BDF8"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            {`◀ ${leftSideLabel} (${leftRuns}r)`}
          </SvgText>
        </G>

        {/* Right Net (LEG SIDE for RHB / OFF SIDE for LHB) */}
        <G>
          <Rect
            x={boxCenterX + 10}
            y={boxCenterY - 14}
            width={boxRight - boxCenterX - 18}
            height={28}
            rx={5}
            fill={isDarkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(0, 0, 0, 0.5)"}
          />
          <SvgText
            x={boxCenterX + 10 + (boxRight - boxCenterX - 18) / 2}
            y={boxCenterY + 4}
            fill="#10B981"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            {`${rightSideLabel} ▶ (${rightRuns}r)`}
          </SvgText>
        </G>

        {/* Back Wall */}
        <Rect
          x={boxCenterX - 45}
          y={boxBottom - 22}
          width="90"
          height="16"
          rx="4"
          fill={isDarkMode ? "rgba(15, 23, 42, 0.8)" : "rgba(0, 0, 0, 0.45)"}
        />
        <SvgText
          x={boxCenterX}
          y={boxBottom - 10}
          fill="#EC4899"
          fontSize="8.5"
          fontWeight="bold"
          textAnchor="middle"
        >
          ▼ BEHIND KEEPER
        </SvgText>

        {/* Infield Inner Dotted Box */}
        <Rect
          x={boxCenterX - boxWidth * 0.28}
          y={boxCenterY - boxHeight * 0.28}
          width={boxWidth * 0.56}
          height={boxHeight * 0.56}
          rx={6}
          fill="none"
          stroke={isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.35)"}
          strokeWidth="1.2"
          strokeDasharray="3,3"
        />
      </G>
    );
  };

  // Historical Shots Trajectories
  const renderHistoricalShots = () => {
    if (!historicalShots || historicalShots.length === 0) return null;
    const originX = isBox ? boxCenterX : centerX;
    const creaseY = isBox ? boxCenterY - 8 : centerY - 6;

    return historicalShots.map((shot, idx) => {
      const { x: shotX, y: shotY } = getShotCoordinates(shot);
      const color = getShotColor({ ...(shot.wagonWheel || {}), ...shot });
      const runsVal = Number(shot.runs ?? shot.wagonWheel?.runs ?? 0);
      const isOut = Boolean(shot.isWicket || shot.wagonWheel?.isWicket);

      return (
        <G key={`hist-${idx}`}>
          {/* Glowing trajectory line starting from the batting crease */}
          <Line
            x1={originX}
            y1={creaseY}
            x2={shotX}
            y2={shotY}
            stroke={color}
            strokeWidth={runsVal >= 6 ? "2.4" : "1.8"}
            strokeOpacity="0.85"
          />

          {/* Landing / Impact point dot */}
          <Circle
            cx={shotX}
            cy={shotY}
            r={runsVal >= 4 ? "5" : "4"}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />

          {/* Wicket cross/ring */}
          {isOut && (
            <Circle
              cx={shotX}
              cy={shotY}
              r="7"
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.5"
            />
          )}
        </G>
      );
    });
  };

  // Active Selected Shot
  const renderCurrentShot = () => {
    if (!currentShot) return null;
    const originX = isBox ? boxCenterX : centerX;
    const creaseY = isBox ? boxCenterY - 8 : centerY - 6;
    const { x: shotX, y: shotY } = getShotCoordinates(currentShot);

    return (
      <G>
        {/* Pulsing Trajectory Vector starting from the batting crease */}
        <Line
          x1={originX}
          y1={creaseY}
          x2={shotX}
          y2={shotY}
          stroke="#EF4444"
          strokeWidth="3.2"
          strokeDasharray="4,2"
        />

        {/* Concentric Impact Target */}
        <Circle
          cx={shotX}
          cy={shotY}
          r="16"
          fill="none"
          stroke="#EF4444"
          strokeWidth="1.5"
          opacity="0.5"
          strokeDasharray="3,2"
        />
        <Circle
          cx={shotX}
          cy={shotY}
          r="9"
          fill="none"
          stroke="#EF4444"
          strokeWidth="2"
        />
        <Circle
          cx={shotX}
          cy={shotY}
          r="5.5"
          fill="#EF4444"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        <Circle cx={shotX} cy={shotY} r="2" fill="#FFFFFF" />
      </G>
    );
  };

  const originX = isBox ? boxCenterX : centerX;
  const originY = isBox ? boxCenterY : centerY;

  return (
    <View style={styles.container}>
      {/* Header bar with title and match mode badge */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.titleText,
            { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
          ]}
        >
          {title || (isBox ? "Box Cricket Wagon Wheel" : "Wagon Wheel")}
        </Text>

        {isBox && (
          <View style={styles.boxBadge}>
            <Text style={styles.boxBadgeText}>📦 BOX CRICKET</Text>
          </View>
        )}
      </View>

      {/* Main Wheel / Arena Canvas */}
      <View
        style={[
          styles.wheelWrapper,
          {
            width: size,
            height: size,
            borderRadius: isBox ? 16 : size / 2,
            backgroundColor: isDarkMode ? "#0B1D15" : "#143D28",
            borderColor: isDarkMode ? "#1E3A2B" : "#1A4D33",
          },
        ]}
        {...(readOnly ? {} : panResponder.panHandlers)}
      >
        <Svg height={size} width={size}>
          <Defs>
            {/* Radial Turf Lawn Gradient for Circular Stadium */}
            <RadialGradient id="turfGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={isDarkMode ? "#123F2B" : "#1C5839"} />
              <Stop offset="65%" stopColor={isDarkMode ? "#0E3323" : "#174C30"} />
              <Stop offset="100%" stopColor={isDarkMode ? "#0A251A" : "#134029"} />
            </RadialGradient>

            {/* Linear Turf Gradient for Box Turf Arena */}
            <LinearGradient id="boxTurfGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={isDarkMode ? "#103926" : "#194F34"} />
              <Stop offset="50%" stopColor={isDarkMode ? "#0C2E1E" : "#14422B"} />
              <Stop offset="100%" stopColor={isDarkMode ? "#092217" : "#103623"} />
            </LinearGradient>
          </Defs>

          {/* ================= ARENA BACKGROUND ================= */}
          {isBox ? (
            <Rect
              x={boxLeft}
              y={boxTop}
              width={boxWidth}
              height={boxHeight}
              rx={8}
              fill="url(#boxTurfGrad)"
            />
          ) : (
            <G>
              {/* Ground Outfield Circle with Radial Grass Mowing Rings */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="url(#turfGrad)"
              />
              {/* Alternate Mowing Ring Band */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={radius * 0.76}
                fill="none"
                stroke={isDarkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.08)"}
                strokeWidth={radius * 0.16}
              />
              {/* Outer Boundary Rope */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeOpacity="0.9"
              />
              {/* 30 Yard Infield Circle */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={innerCircleRadius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
            </G>
          )}

          {/* Circular Field Sectors (Third Man, Fine Leg, Cover, Point, etc.) or Box Arena */}
          {isBox ? renderBoxArena() : renderCircularSectors()}

          {/* Center Pitch Rect */}
          <Rect
            x={originX - (isBox ? 7 : 5)}
            y={originY - (isBox ? 22 : 18)}
            width={isBox ? 14 : 10}
            height={isBox ? 44 : 36}
            fill="#C99E70"
            rx={2}
            stroke="#9C7A53"
            strokeWidth="1"
          />

          {/* Batting Crease at TOP (striker's end) */}
          <Line
            x1={originX - (isBox ? 7 : 5)}
            y1={originY - (isBox ? 8 : 6)}
            x2={originX + (isBox ? 7 : 5)}
            y2={originY - (isBox ? 8 : 6)}
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />

          {/* Bowling Crease at BOTTOM (bowler's end) */}
          <Line
            x1={originX - (isBox ? 7 : 5)}
            y1={originY + (isBox ? 14 : 11)}
            x2={originX + (isBox ? 7 : 5)}
            y2={originY + (isBox ? 14 : 11)}
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="1"
          />

          {/* Historical Shots */}
          {renderHistoricalShots()}

          {/* Current Active Shot */}
          {renderCurrentShot()}
        </Svg>
      </View>

      {/* Touch prompt / Selected Shot Info */}
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
          <Text
            style={[
              styles.infoLabel,
              { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
            ]}
            numberOfLines={1}
          >
            {lastTouch?.zone
              ? `🎯 Shot: ${lastTouch.zone}`
              : isBox
              ? "👆 Tap net or wall where shot landed"
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

      {/* Run-based Color Legend (6s, 4s, 1-3s, Dot, Wicket) */}
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
            <View style={[styles.legendDot, { backgroundColor: "#94A3B8" }]} />
            <Text style={[styles.legendText, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              Dot Ball
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
  headerRow: {
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
  boxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  boxBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: 0.5,
  },
  wheelWrapper: {
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
    flex: 1,
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
    gap: 12,
    marginTop: 10,
    flexWrap: "wrap",
    paddingHorizontal: 8,
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

export default WagonWheel;
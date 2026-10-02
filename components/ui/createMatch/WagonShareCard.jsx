import React, { forwardRef, useMemo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import WagonWheel from "./WagonWheel";

export const SHARE_CARD_WIDTH = 340;

// Runs per zone for the shots on the wheel, biggest first.
const getTopZones = (shots) => {
  const zones = {};
  shots.forEach((shot) => {
    const ww = shot.wagonWheel || shot;
    const name = ww.zoneName;
    if (!name) return;
    const runs = Number(shot.runs ?? ww.runs ?? 0);
    zones[name] = zones[name] || { name, runs: 0, balls: 0 };
    zones[name].runs += runs;
    zones[name].balls += 1;
  });
  return Object.values(zones)
    .filter((zone) => zone.runs > 0)
    .sort((a, b) => b.runs - a.runs || b.balls - a.balls)
    .slice(0, 3);
};

// The branded image shared from the wagon wheel viewer. The ref points at
// the card's root view so it can be captured with react-native-view-shot.
const WagonShareCard = forwardRef(function WagonShareCard(
  {
    playerName = "",
    matchTitle = "",
    inningsLabel = "",
    filterLabel = "",
    stats = [],
    shots = [],
    isBoxCricket = false,
    batterStance = "RHB",
  },
  ref
) {
  const topZones = useMemo(() => getTopZones(shots), [shots]);
  const maxZoneRuns = topZones[0]?.runs || 1;
  const context = [matchTitle, inningsLabel, filterLabel]
    .filter(Boolean)
    .join("  •  ");

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <LinearGradient
        colors={["#060B14", "#0C1427", "#050912"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        {/* Brand row */}
        <View style={styles.brandRow}>
          <Image
            source={require("@/assets/brand/logo-horizontal-dark.png")}
            style={styles.logo}
          />
          <View style={styles.tag}>
            <Text style={styles.tagText}>WAGON WHEEL</Text>
          </View>
        </View>

        {/* Who and where */}
        <Text style={styles.playerName} numberOfLines={1}>
          {playerName || "All Batters"}
        </Text>
        {Boolean(context) && (
          <Text style={styles.context} numberOfLines={2}>
            {context}
          </Text>
        )}

        {/* Numbers */}
        {stats.length > 0 && (
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statBox}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        <WagonWheel
          readOnly
          size={250}
          title={`${shots.length} ${shots.length === 1 ? "shot" : "shots"} tracked`}
          historicalShots={shots}
          isDarkMode
          isBoxCricket={isBoxCricket}
          batterStance={batterStance}
        />

        {/* Best scoring zones */}
        {topZones.length > 0 && (
          <View style={styles.zones}>
            <Text style={styles.zonesTitle}>TOP SCORING ZONES</Text>
            {topZones.map((zone) => (
              <View key={zone.name} style={styles.zoneRow}>
                <Text style={styles.zoneName} numberOfLines={1}>
                  {zone.name}
                </Text>
                <View style={styles.zoneTrack}>
                  <View
                    style={[
                      styles.zoneBar,
                      { width: `${Math.max(8, (zone.runs / maxZoneRuns) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.zoneRuns}>{zone.runs}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Image
              source={require("@/assets/brand/logo-mark.png")}
              style={styles.logoMark}
            />
            <View>
              <Text style={styles.footerTitle}>SCORED ON CRICONIC</Text>
              <Text style={styles.footerSub}>
                Free scoring, wagon wheel & pitch map
              </Text>
            </View>
          </View>
          <Text style={styles.footerUrl}>criconic.com</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

export default WagonShareCard;

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(77, 214, 199, 0.35)",
    backgroundColor: "#060B14",
  },
  gradient: {
    padding: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  logo: {
    width: 90,
    height: 22,
    resizeMode: "contain",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(77, 214, 199, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(77, 214, 199, 0.35)",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#8CE9DD",
  },
  playerName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  context: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  statLabel: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#94A3B8",
  },
  zones: {
    marginTop: 12,
  },
  zonesTitle: {
    marginBottom: 6,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#64748B",
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  zoneName: {
    width: 112,
    fontSize: 11,
    fontWeight: "600",
    color: "#CBD5E1",
  },
  zoneTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  zoneBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4DD6C7",
  },
  zoneRuns: {
    width: 30,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoMark: {
    width: 18,
    height: 18,
    resizeMode: "contain",
    marginRight: 6,
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#FFFFFF",
  },
  footerSub: {
    fontSize: 8,
    color: "#64748B",
  },
  footerUrl: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4DD6C7",
  },
});

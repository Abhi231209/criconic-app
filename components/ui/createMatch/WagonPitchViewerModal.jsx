import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { X, Filter, BarChart2 } from "lucide-react-native";
import PitchMap, { LENGTH_ZONES } from "./PitchMap";
import WagonWheel, { ZONES } from "./WagonWheel";
import { COLORS } from "@/theme/colors";
import { matchesApi } from "@/utils/api";

export default function WagonPitchViewerModal({
  visible,
  onClose,
  initialTab = "wagon",
  initialPlayer = null,
  matchDetails = {},
  score = {},
  sessionDeliveries = [],
  matchId = null,
  onViewProfile = null,
}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
  const [selectedBatsmanId, setSelectedBatsmanId] = useState("all");
  const [selectedBowlerId, setSelectedBowlerId] = useState("all");
  const [shotFilter, setShotFilter] = useState("all"); // all, dots, singles, fours, sixes
  const [pitchFilter, setPitchFilter] = useState("all"); // all, dots, runs, wickets
  const [fetchedMatch, setFetchedMatch] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setSelectedPlayer(initialPlayer);
      setShotFilter("all");
      setPitchFilter("all");
      const pId = initialPlayer?.playerId || initialPlayer?.id || initialPlayer?._id;
      if (initialTab === "wagon" && pId) {
        setSelectedBatsmanId(String(pId));
      } else if (initialTab === "pitch" && pId) {
        setSelectedBowlerId(String(pId));
      } else if (pId) {
        setSelectedBatsmanId(String(pId));
        setSelectedBowlerId(String(pId));
      } else {
        setSelectedBatsmanId("all");
        setSelectedBowlerId("all");
      }

      const effectiveId = matchId || matchDetails?._id || matchDetails?.id || score?._id || score?.id;
      if (effectiveId) {
        setLoading(true);
        Promise.all([
          matchesApi.getMatchById(effectiveId).catch(() => null),
          matchesApi.getMatchScore(effectiveId).catch(() => null),
        ])
          .then(([matchRes, scoreRes]) => {
            const mData = matchRes?.match || matchRes?.data?.data || matchRes?.data;
            const sData = scoreRes?.data?.data || scoreRes?.data;
            if (mData || sData) {
              setFetchedMatch({
                ...(mData || {}),
                score: {
                  ...(mData?.score || {}),
                  ...(sData || {}),
                },
              });
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      }
    }
  }, [visible, matchId, matchDetails?._id, matchDetails?.id, score?._id, score?.id, initialTab, initialPlayer]);

  // Extract all balls from sessionDeliveries and all innings in matchDetails / score
  const allDeliveries = useMemo(() => {
    const list = [...sessionDeliveries];
    const targetSource = fetchedMatch || matchDetails || score || {};
    const scoreObj = targetSource.score || (targetSource.innings_1 || targetSource.inning ? targetSource : {});

    const processOvers = (overs, innKey = "") => {
      if (!Array.isArray(overs)) return;
      overs.forEach((over, overIdx) => {
        (over.balls || over.deliveries || []).forEach((ball, ballIdx) => {
          const isDuplicate = list.some(
            (s) =>
              (s.timestamp && ball.timestamp && s.timestamp === ball.timestamp) ||
              (s.overIndex === overIdx && s.ballNumber === ballIdx + 1 && s.inningsKey === innKey)
          );
          if (!isDuplicate) {
            list.push({
              ...ball,
              overIndex: overIdx,
              ballNumber: ballIdx + 1,
              inningsKey: innKey,
            });
          }
        });
      });
    };

    // 1. Process innings_1, innings_2, etc.
    Object.keys(scoreObj).filter((k) => k.startsWith("innings_")).forEach((innKey) => {
      processOvers(scoreObj[innKey]?.overs, innKey);
    });

    // 2. Process inning array
    if (Array.isArray(scoreObj.inning)) {
      scoreObj.inning.forEach((inn, idx) => {
        processOvers(inn?.overs, `inning_${idx + 1}`);
      });
    }

    // 3. Process root overs if present
    if (Array.isArray(scoreObj.overs)) {
      processOvers(scoreObj.overs, "root");
    }

    // 4. Also check direct score prop if different from scoreObj
    if (score && score !== scoreObj && score !== targetSource) {
      Object.keys(score).filter((k) => k.startsWith("innings_")).forEach((innKey) => {
        processOvers(score[innKey]?.overs, innKey);
      });
      if (Array.isArray(score.inning)) {
        score.inning.forEach((inn, idx) => {
          processOvers(inn?.overs, `inning_${idx + 1}`);
        });
      }
    }

    return list;
  }, [fetchedMatch, matchDetails, score, sessionDeliveries]);

  // Extract unique batsmen who have faced balls
  const availableBatsmen = useMemo(() => {
    const map = new Map();
    // Add batsmen from live score
    (score?.batsman || []).forEach((b) => {
      const id = String(b.playerId || b.id || b._id || "");
      if (id && !map.has(id)) {
        map.set(id, { id, name: b.name || b.username || "Batsman" });
      }
    });

    // Add batsmen from allDeliveries
    allDeliveries.forEach((d) => {
      const id = String(d.batsman?._id || d.batsman?.playerId || d.batsman?.id || (typeof d.batsman === "string" ? d.batsman : "") || "");
      const name = d.batsmanName || d.batsman?.name || d.batsman?.username || "Batsman";
      if (id && !map.has(id)) {
        map.set(id, { id, name });
      }
    });

    return Array.from(map.values());
  }, [score, allDeliveries]);

  // Extract unique bowlers
  const availableBowlers = useMemo(() => {
    const map = new Map();
    // Add active bowler
    if (score?.bowler) {
      const id = String(score.bowler.playerId || score.bowler.id || score.bowler._id || "");
      if (id && !map.has(id)) {
        map.set(id, { id, name: score.bowler.name || score.bowler.username || "Bowler" });
      }
    }

    // Add bowlers from allDeliveries
    allDeliveries.forEach((d) => {
      const id = String(d.bowler?._id || d.bowler?.playerId || d.bowler?.id || (typeof d.bowler === "string" ? d.bowler : "") || "");
      const name = d.bowlerName || d.bowler?.name || d.bowler?.username || "Bowler";
      if (id && !map.has(id)) {
        map.set(id, { id, name });
      }
    });

    return Array.from(map.values());
  }, [score, allDeliveries]);

  // Shots matching the selected batsman, before the dots/singles/fours/sixes filter is applied
  const batsmanFilteredShots = useMemo(() => {
    return allDeliveries.filter((d) => {
      // No shot is credited to the batsman on a wide — exclude it even if
      // stray wagon wheel data ended up attached to one.
      if (d.ballType === "wide") return false;
      const ww = d.wagonWheel || (d.angle !== undefined && d.zone !== undefined ? d : null);
      if (!ww) return false;
      if (selectedBatsmanId !== "all") {
        const bId = String(d.batsman?._id || d.batsman?.playerId || d.batsman?.id || (typeof d.batsman === "string" ? d.batsman : "") || "");
        const bName = (d.batsmanName || d.batsman?.name || d.batsman?.username || d.batsman?.playerName || "").toLowerCase().trim();
        const selectedName = selectedPlayer?.name ? String(selectedPlayer.name).toLowerCase().trim() : "";

        const idMatches = bId && bId === String(selectedBatsmanId);
        const nameMatches = Boolean(selectedName && bName && (bName === selectedName || bName.includes(selectedName) || selectedName.includes(bName)));

        if (!idMatches && !nameMatches) return false;
      }
      return true;
    });
  }, [allDeliveries, selectedBatsmanId, selectedPlayer]);

  // Filter shots for Wagon Wheel
  const filteredShots = useMemo(() => {
    return batsmanFilteredShots.filter((d) => {
      const ww = d.wagonWheel || d;
      const r = Number(d.runs ?? ww.runs ?? 0);
      if (shotFilter === "dots" && (r !== 0 || d.isWicket)) return false;
      if (shotFilter === "singles" && (r < 1 || r > 3 || d.isBoundary)) return false;
      if (shotFilter === "fours" && r !== 4) return false;
      if (shotFilter === "sixes" && r !== 6) return false;

      return true;
    });
  }, [batsmanFilteredShots, shotFilter]);

  // Real per-category counts for the filter pill labels (independent of the
  // currently active shotFilter, which only narrows the plotted wheel).
  const shotTypeCounts = useMemo(() => {
    let dots = 0, singles = 0, fours = 0, sixes = 0;
    batsmanFilteredShots.forEach((d) => {
      const ww = d.wagonWheel || d;
      const r = Number(d.runs ?? ww.runs ?? 0);
      if (r === 0 && !d.isWicket) dots++;
      else if (r >= 1 && r <= 3 && !d.isBoundary) singles++;
      else if (r === 4) fours++;
      else if (r === 6) sixes++;
    });
    return { dots, singles, fours, sixes };
  }, [batsmanFilteredShots]);

  // Deliveries matching the selected bowler, before the dots/runs/wickets filter is applied
  const bowlerFilteredPitches = useMemo(() => {
    return allDeliveries.filter((d) => {
      const pm = d.pitchMap || (d.impactPoint !== undefined || d.coordinates !== undefined ? d : null);
      if (!pm) return false;
      if (selectedBowlerId !== "all") {
        const bowlId = String(d.bowler?._id || d.bowler?.playerId || d.bowler?.id || (typeof d.bowler === "string" ? d.bowler : "") || "");
        const bowlName = (d.bowlerName || d.bowler?.name || d.bowler?.username || d.bowler?.playerName || "").toLowerCase().trim();
        const selectedName = selectedPlayer?.name ? String(selectedPlayer.name).toLowerCase().trim() : "";

        const idMatches = bowlId && bowlId === String(selectedBowlerId);
        const nameMatches = Boolean(selectedName && bowlName && (bowlName === selectedName || bowlName.includes(selectedName) || selectedName.includes(bowlName)));

        if (!idMatches && !nameMatches) return false;
      }
      return true;
    });
  }, [allDeliveries, selectedBowlerId, selectedPlayer]);

  // Filter deliveries for Pitch Map
  const filteredPitches = useMemo(() => {
    return bowlerFilteredPitches.filter((d) => {
      const pm = d.pitchMap || d;
      const r = Number(d.runs ?? pm.runs ?? 0);
      if (pitchFilter === "dots" && (r !== 0 || d.isWicket)) return false;
      if (pitchFilter === "runs" && r === 0) return false;
      if (pitchFilter === "wickets" && !d.isWicket && !pm.isWicket) return false;

      return true;
    });
  }, [bowlerFilteredPitches, pitchFilter]);

  // Real per-category counts for the pitch filter pill labels
  const pitchTypeCounts = useMemo(() => {
    let dots = 0, runs = 0, wickets = 0;
    bowlerFilteredPitches.forEach((d) => {
      const pm = d.pitchMap || d;
      const r = Number(d.runs ?? pm.runs ?? 0);
      if (r === 0 && !d.isWicket) dots++;
      if (r > 0) runs++;
      if (d.isWicket || pm.isWicket) wickets++;
    });
    return { dots, runs, wickets };
  }, [bowlerFilteredPitches]);

  // Wagon wheel stats summary
  const wagonStats = useMemo(() => {
    let totalRuns = 0;
    let fours = 0;
    let sixes = 0;
    filteredShots.forEach((s) => {
      const r = Number(s.runs ?? s.wagonWheel?.runs ?? 0);
      totalRuns += r;
      if (r === 4) fours++;
      if (r === 6) sixes++;
    });
    return {
      balls: filteredShots.length,
      runs: totalRuns,
      fours,
      sixes,
    };
  }, [filteredShots]);

  // Pitch map length stats summary
  const pitchStats = useMemo(() => {
    const counts = { Yorker: 0, Full: 0, "Good Length": 0, Short: 0, Bouncer: 0 };
    filteredPitches.forEach((p) => {
      const length = p.pitchMap?.lengthZone || p.pitchMap?.impactPoint?.lengthZone;
      if (length && counts[length] !== undefined) {
        counts[length]++;
      }
    });
    return counts;
  }, [filteredPitches]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF" },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: isDarkMode ? "#1E293B" : "#E2E8F0",
                backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                ]}
                numberOfLines={1}
              >
                {selectedPlayer
                  ? `${activeTab === "wagon" ? "🏏" : "🎯"} ${selectedPlayer?.name || selectedPlayer?.username || selectedPlayer?.playerName || "Player"}`
                  : "Match Visual Analytics"}
              </Text>
              <Text
                style={[
                  styles.headerSub,
                  { color: isDarkMode ? "#94A3B8" : "#64748B" },
                ]}
                numberOfLines={1}
              >
                {selectedPlayer
                  ? (activeTab === "wagon" ? "Wagon Wheel • Shots Analysis" : "Pitch Map • Length Distribution")
                  : "Wagon Wheel & Pitch Map distribution"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {Boolean(selectedPlayer && onViewProfile) && (
                <TouchableOpacity
                  onPress={() => {
                    onClose?.();
                    onViewProfile?.(selectedPlayer);
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? "#334155" : "#E2E8F0",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "600", color: isDarkMode ? "#38BDF8" : "#0284C7" }}>
                    Profile →
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mode Tabs */}
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9",
                borderColor: isDarkMode ? "#334155" : "#E2E8F0",
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "wagon" && styles.tabButtonActive,
                activeTab === "wagon" && {
                  backgroundColor: isDarkMode ? "#334155" : "#FFFFFF",
                },
              ]}
              onPress={() => setActiveTab("wagon")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "wagon"
                    ? styles.tabButtonTextActive
                    : { color: isDarkMode ? "#94A3B8" : "#64748B" },
                ]}
              >
                🏏 Wagon Wheel ({filteredShots.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "pitch" && styles.tabButtonActive,
                activeTab === "pitch" && {
                  backgroundColor: isDarkMode ? "#334155" : "#FFFFFF",
                },
              ]}
              onPress={() => setActiveTab("pitch")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "pitch"
                    ? styles.tabButtonTextActive
                    : { color: isDarkMode ? "#94A3B8" : "#64748B" },
                ]}
              >
                🎯 Pitch Map ({filteredPitches.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Crex-Style Player Hero Card (When player is selected) */}
          {selectedPlayer && (
            <View
              style={[
                styles.playerHeroCard,
                {
                  backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
                  borderColor: isDarkMode ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <View style={styles.playerHeroLeft}>
                <View
                  style={[
                    styles.avatarBadge,
                    { backgroundColor: isDarkMode ? "#3B82F6" : "#2563EB" },
                  ]}
                >
                  <Text style={styles.avatarBadgeText}>
                    {(selectedPlayer.name || selectedPlayer.username || "P").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text
                    style={[
                      styles.playerHeroName,
                      { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedPlayer.name || selectedPlayer.username || "Player"}
                    {selectedPlayer.notOut ? " *" : ""}
                  </Text>
                  <Text
                    style={[
                      styles.playerHeroSubtitle,
                      { color: isDarkMode ? "#94A3B8" : "#64748B" },
                    ]}
                    numberOfLines={1}
                  >
                    {activeTab === "wagon"
                      ? `${selectedPlayer.runs ?? wagonStats.runs ?? 0} runs (${selectedPlayer.ballsFaced ?? selectedPlayer.balls ?? wagonStats.balls ?? 0}b) • 4s: ${selectedPlayer.fours ?? wagonStats.fours ?? 0} • 6s: ${selectedPlayer.sixes ?? wagonStats.sixes ?? 0} • SR: ${selectedPlayer.sr ?? (wagonStats.balls ? ((wagonStats.runs / wagonStats.balls) * 100).toFixed(1) : "0.00")}`
                      : `${selectedPlayer.over ?? "0.0"} ov • ${selectedPlayer.runsGiven ?? selectedPlayer.runs ?? 0} runs • ${selectedPlayer.wicketsTaken ?? selectedPlayer.wickets ?? 0} wkts • ECO: ${selectedPlayer.eco ?? "0.00"}`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Crex Shot / Ball Filter Chips */}
          <View style={styles.filterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {selectedPlayer ? (
                activeTab === "wagon" ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        shotFilter === "all" && styles.filterPillActive,
                        {
                          backgroundColor:
                            shotFilter === "all"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setShotFilter("all")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          shotFilter === "all" && styles.filterPillTextActive,
                          {
                            color:
                              shotFilter === "all"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        All Shots ({filteredShots.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        shotFilter === "dots" && styles.filterPillActive,
                        {
                          backgroundColor:
                            shotFilter === "dots"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setShotFilter("dots")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          shotFilter === "dots" && styles.filterPillTextActive,
                          {
                            color:
                              shotFilter === "dots"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        Dots ({shotTypeCounts.dots})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        shotFilter === "singles" && styles.filterPillActive,
                        {
                          backgroundColor:
                            shotFilter === "singles"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setShotFilter("singles")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          shotFilter === "singles" && styles.filterPillTextActive,
                          {
                            color:
                              shotFilter === "singles"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        1s & 2s ({shotTypeCounts.singles})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        shotFilter === "fours" && styles.filterPillActive,
                        {
                          backgroundColor:
                            shotFilter === "fours"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setShotFilter("fours")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          shotFilter === "fours" && styles.filterPillTextActive,
                          {
                            color:
                              shotFilter === "fours"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        Fours ({shotTypeCounts.fours})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        shotFilter === "sixes" && styles.filterPillActive,
                        {
                          backgroundColor:
                            shotFilter === "sixes"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setShotFilter("sixes")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          shotFilter === "sixes" && styles.filterPillTextActive,
                          {
                            color:
                              shotFilter === "sixes"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        Sixes ({shotTypeCounts.sixes})
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        pitchFilter === "all" && styles.filterPillActive,
                        {
                          backgroundColor:
                            pitchFilter === "all"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setPitchFilter("all")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          pitchFilter === "all" && styles.filterPillTextActive,
                          {
                            color:
                              pitchFilter === "all"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        All Deliveries ({filteredPitches.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        pitchFilter === "dots" && styles.filterPillActive,
                        {
                          backgroundColor:
                            pitchFilter === "dots"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setPitchFilter("dots")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          pitchFilter === "dots" && styles.filterPillTextActive,
                          {
                            color:
                              pitchFilter === "dots"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        Dots ({pitchTypeCounts.dots})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        pitchFilter === "runs" && styles.filterPillActive,
                        {
                          backgroundColor:
                            pitchFilter === "runs"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setPitchFilter("runs")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          pitchFilter === "runs" && styles.filterPillTextActive,
                          {
                            color:
                              pitchFilter === "runs"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        Runs ({pitchTypeCounts.runs})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        pitchFilter === "wickets" && styles.filterPillActive,
                        {
                          backgroundColor:
                            pitchFilter === "wickets"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setPitchFilter("wickets")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          pitchFilter === "wickets" && styles.filterPillTextActive,
                          {
                            color:
                              pitchFilter === "wickets"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        Wickets ({pitchTypeCounts.wickets})
                      </Text>
                    </TouchableOpacity>
                  </>
                )
              ) : (
                /* Fallback if no specific player selected */
                activeTab === "wagon" ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        selectedBatsmanId === "all" && styles.filterPillActive,
                        {
                          backgroundColor:
                            selectedBatsmanId === "all"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setSelectedBatsmanId("all")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          selectedBatsmanId === "all" && styles.filterPillTextActive,
                          {
                            color:
                              selectedBatsmanId === "all"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        All Batsmen
                      </Text>
                    </TouchableOpacity>

                    {availableBatsmen.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.filterPill,
                          selectedBatsmanId === b.id && styles.filterPillActive,
                          {
                            backgroundColor:
                              selectedBatsmanId === b.id
                                ? COLORS.primary
                                : isDarkMode
                                ? "#1E293B"
                                : "#F1F5F9",
                          },
                        ]}
                        onPress={() => {
                          setSelectedBatsmanId(b.id);
                          setSelectedPlayer(b);
                        }}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            selectedBatsmanId === b.id && styles.filterPillTextActive,
                            {
                              color:
                                selectedBatsmanId === b.id
                                  ? "#FFFFFF"
                                  : isDarkMode
                                  ? "#CBD5E1"
                                  : "#334155",
                            },
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.filterPill,
                        selectedBowlerId === "all" && styles.filterPillActive,
                        {
                          backgroundColor:
                            selectedBowlerId === "all"
                              ? COLORS.primary
                              : isDarkMode
                              ? "#1E293B"
                              : "#F1F5F9",
                        },
                      ]}
                      onPress={() => setSelectedBowlerId("all")}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          selectedBowlerId === "all" && styles.filterPillTextActive,
                          {
                            color:
                              selectedBowlerId === "all"
                                ? "#FFFFFF"
                                : isDarkMode
                                ? "#CBD5E1"
                                : "#334155",
                          },
                        ]}
                      >
                        All Bowlers
                      </Text>
                    </TouchableOpacity>

                    {availableBowlers.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.filterPill,
                          selectedBowlerId === b.id && styles.filterPillActive,
                          {
                            backgroundColor:
                              selectedBowlerId === b.id
                                ? COLORS.primary
                                : isDarkMode
                                ? "#1E293B"
                                : "#F1F5F9",
                          },
                        ]}
                        onPress={() => {
                          setSelectedBowlerId(b.id);
                          setSelectedPlayer(b);
                        }}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            selectedBowlerId === b.id && styles.filterPillTextActive,
                            {
                              color:
                                selectedBowlerId === b.id
                                  ? "#FFFFFF"
                                  : isDarkMode
                                  ? "#CBD5E1"
                                  : "#334155",
                            },
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )
              )}
            </ScrollView>
          </View>

          {/* Main Visual Canvas & Stats */}
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.mainScrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "wagon" ? (
              <>
                {/* Metric Strip */}
                <View
                  style={[
                    styles.metricStrip,
                    {
                      backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
                      borderColor: isDarkMode ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <View style={styles.metricBox}>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                      ]}
                    >
                      {wagonStats.runs}
                    </Text>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: isDarkMode ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      Runs
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricBox}>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                      ]}
                    >
                      {wagonStats.balls}
                    </Text>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: isDarkMode ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      Shots Plotted
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricBox}>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                      ]}
                    >
                      {wagonStats.fours}
                    </Text>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: isDarkMode ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      Fours
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricBox}>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                      ]}
                    >
                      {wagonStats.sixes}
                    </Text>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: isDarkMode ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      Sixes
                    </Text>
                  </View>
                </View>

                {filteredShots.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text
                      style={[
                        styles.emptyText,
                        { color: isDarkMode ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      No wagon wheel shots recorded yet for this selection.
                    </Text>
                    <Text
                      style={[
                        styles.emptySubText,
                        { color: isDarkMode ? "#64748B" : "#94A3B8" },
                      ]}
                    >
                      Enable "Wagon Wheel" toggle on the scorer screen to plot shots while scoring.
                    </Text>
                  </View>
                ) : null}

                <WagonWheel
                  readOnly={true}
                  size={290}
                  historicalShots={filteredShots}
                  isDarkMode={isDarkMode}
                  showZoneStats={true}
                />
              </>
            ) : (
              <>
                {/* Length Breakdown Strip */}
                <View
                  style={[
                    styles.metricStrip,
                    {
                      backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
                      borderColor: isDarkMode ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  {LENGTH_ZONES.map((lz) => (
                    <View key={lz.name} style={styles.metricBox}>
                      <Text
                        style={[styles.metricValue, { color: lz.color }]}
                      >
                        {pitchStats[lz.name] || 0}
                      </Text>
                      <Text
                        style={[
                          styles.metricLabel,
                          { color: isDarkMode ? "#94A3B8" : "#64748B" },
                        ]}
                        numberOfLines={1}
                      >
                        {lz.name.replace(" Length", "")}
                      </Text>
                    </View>
                  ))}
                </View>

                {filteredPitches.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text
                      style={[
                        styles.emptyText,
                        { color: isDarkMode ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      No deliveries plotted on the pitch map yet.
                    </Text>
                    <Text
                      style={[
                        styles.emptySubText,
                        { color: isDarkMode ? "#64748B" : "#94A3B8" },
                      ]}
                    >
                      Enable "Pitch Map" toggle on the scorer screen to record ball pitching spot while scoring.
                    </Text>
                  </View>
                ) : null}

                <PitchMap
                  readOnly={true}
                  width={300}
                  height={360}
                  historicalPitches={filteredPitches}
                  isDarkMode={isDarkMode}
                />
              </>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: "92%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  playerHeroCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  playerHeroLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  playerHeroName: {
    fontSize: 15,
    fontWeight: "700",
  },
  playerHeroSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  filterSection: {
    marginVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterPillActive: {
    elevation: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  metricStrip: {
    flexDirection: "row",
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
    justifyContent: "space-around",
    alignItems: "center",
  },
  metricBox: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#CBD5E188",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
});

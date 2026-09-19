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
import { X, Filter, BarChart2, ChevronRight } from "lucide-react-native";
import PitchMap, { LENGTH_ZONES } from "./PitchMap";
import WagonWheel, { ZONES } from "./WagonWheel";
import { COLORS } from "@/theme/colors";
import { matchesApi } from "@/utils/api";

const getBallColor = (ball, isDarkMode = false) => {
  const r = Number(ball.runs ?? ball.pitchMap?.runs ?? 0);
  const isWicket = Boolean(ball.isWicket || ball.pitchMap?.isWicket);

  if (isWicket) return { bg: "#EF4444", text: "#FFFFFF", label: "W" };
  if (r === 6) return { bg: "#8B5CF6", text: "#FFFFFF", label: "6" };
  if (r === 4) return { bg: "#10B981", text: "#FFFFFF", label: "4" };
  if (ball.isExtra || ball.extraType) {
    const extraLabel = ball.extraType ? ball.extraType.charAt(0).toUpperCase() : "Ex";
    return { bg: "#F59E0B", text: "#FFFFFF", label: r > 0 ? `${r}${extraLabel}` : extraLabel };
  }
  if (r === 0) return { bg: isDarkMode ? "#334155" : "#E2E8F0", text: isDarkMode ? "#94A3B8" : "#64748B", label: "0" };
  return { bg: "#3B82F6", text: "#FFFFFF", label: String(r) };
};

const getDeliveryPitchInfo = (d) => {
  const pm = d.pitchMap || d;
  const length = pm.lengthZone || pm.impactPoint?.lengthZone || "Good Length";
  const line = pm.lineZone || pm.impactPoint?.lineZone || "Middle Stump";
  const dist = pm.impactPoint?.fromStumps !== undefined ? `${pm.impactPoint.fromStumps}y` : null;
  return { length, line, dist };
};

export default function WagonPitchViewerModal({
  visible,
  onClose,
  initialTab = "wagon",
  initialPlayer = null,
  playerRole = "all", // "bowler" | "batsman" | "fow" | "all"
  matchDetails = {},
  score = {},
  sessionDeliveries = [],
  matchId = null,
  onViewProfile = null,
}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const isBowlerOnly = playerRole === "bowler";
  const isBatsmanOnly = playerRole === "batsman";

  const resolvedInitialTab = isBowlerOnly ? "pitch" : (isBatsmanOnly ? "wagon" : initialTab);
  const [activeTab, setActiveTab] = useState(resolvedInitialTab);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
  const [selectedBatsmanId, setSelectedBatsmanId] = useState("all");
  const [selectedBowlerId, setSelectedBowlerId] = useState("all");
  const [selectedFacedBatsmanId, setSelectedFacedBatsmanId] = useState("all");
  const [pitchStanceFilter, setPitchStanceFilter] = useState("all"); // "all" | "RHB" | "LHB"
  const [shotFilter, setShotFilter] = useState("all"); // all, dots, singles, fours, sixes
  const [pitchFilter, setPitchFilter] = useState("all"); // all, dots, runs, wickets
  const [selectedOver, setSelectedOver] = useState("all"); // all or over number
  const [fetchedMatch, setFetchedMatch] = useState(null);
  const [loading, setLoading] = useState(false);

  const isBoxCricket =
    matchDetails?.matchType === "box" ||
    matchDetails?.type === "box" ||
    score?.matchType === "box" ||
    score?.type === "box" ||
    fetchedMatch?.matchType === "box" ||
    fetchedMatch?.type === "box";

  const batterStance = (
    selectedPlayer?.battingStyle ||
    selectedPlayer?.batting_style ||
    ""
  )
    .toLowerCase()
    .includes("left")
    ? "LHB"
    : "RHB";

  useEffect(() => {
    if (visible) {
      const currentResolvedTab = isBowlerOnly ? "pitch" : (isBatsmanOnly ? "wagon" : initialTab);
      setActiveTab(currentResolvedTab);
      setSelectedPlayer(initialPlayer);
      setShotFilter("all");
      setPitchFilter("all");
      setSelectedOver("all");
      setSelectedFacedBatsmanId("all");
      setPitchStanceFilter("all");
      const pId = initialPlayer?.playerId || initialPlayer?.id || initialPlayer?._id;
      if (currentResolvedTab === "wagon" && pId) {
        setSelectedBatsmanId(String(pId));
        setSelectedBowlerId("all");
      } else if (currentResolvedTab === "pitch" && pId) {
        setSelectedBowlerId(String(pId));
        setSelectedBatsmanId("all");
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

  useEffect(() => {
    setSelectedOver("all");
    setSelectedFacedBatsmanId("all");
    setPitchStanceFilter("all");
  }, [selectedBowlerId]);

  // Extract all balls from sessionDeliveries and all innings in matchDetails / score
  const allDeliveries = useMemo(() => {
    const list = [...sessionDeliveries];
    const targetSource = fetchedMatch || matchDetails || score || {};
    const scoreObj = targetSource.score || (targetSource.innings_1 || targetSource.inning ? targetSource : {});

    const normInn = (k) => String(k || "").replace(/[^0-9]/g, "") || "1";
    const seenKeySet = new Set();

    list.forEach((s) => {
      if (s.timestamp) seenKeySet.add(`ts_${s.timestamp}`);
      if (s._id) seenKeySet.add(`id_${s._id}`);
      if (s.id) seenKeySet.add(`id_${s.id}`);
      const inn = normInn(s.inningsKey || s.inning || "1");
      const ov = Number(s.overNumber ?? s.overIndex ?? 1);
      const bNum = Number(s.ballNumber ?? 1);
      seenKeySet.add(`pos_${inn}_${ov}_${bNum}`);
    });

    const processOvers = (overs, rawInnKey = "") => {
      if (!Array.isArray(overs)) return;
      const inn = normInn(rawInnKey);
      overs.forEach((over, overIdx) => {
        let overNum = over?.overNumber;
        if (overNum === undefined || overNum === null) {
          if (over?.overNo !== undefined && over?.overNo !== null) {
            overNum = Number(over.overNo);
          } else if (over?.over !== undefined && over?.over !== null) {
            const p = parseFloat(over.over);
            overNum = !isNaN(p) ? (p >= 1 ? Math.floor(p) : 1) : overIdx + 1;
          } else {
            overNum = overIdx + 1;
          }
        }
        overNum = Number(overNum);

        (over.balls || over.deliveries || []).forEach((ball, ballIdx) => {
          const ballId = ball._id || ball.id;
          const ballTs = ball.timestamp;
          const posKey = `pos_${inn}_${overNum}_${ballIdx + 1}`;

          if (ballId && seenKeySet.has(`id_${ballId}`)) return;
          if (ballTs && seenKeySet.has(`ts_${ballTs}`)) return;
          if (seenKeySet.has(posKey)) return;

          if (ballId) seenKeySet.add(`id_${ballId}`);
          if (ballTs) seenKeySet.add(`ts_${ballTs}`);
          seenKeySet.add(posKey);

          list.push({
            ...ball,
            overNumber: overNum,
            overIndex: overIdx,
            ballNumber: ballIdx + 1,
            inningsKey: `innings_${inn}`,
          });
        });
      });
    };

    // 1. Process innings_1, innings_2, etc.
    const inningsKeys = Object.keys(scoreObj).filter((k) => k.startsWith("innings_"));
    if (inningsKeys.length > 0) {
      inningsKeys.forEach((innKey) => {
        processOvers(scoreObj[innKey]?.overs, innKey);
      });
    } else if (Array.isArray(scoreObj.inning) && scoreObj.inning.length > 0) {
      // 2. Process inning array only if innings_X was not present
      scoreObj.inning.forEach((inn, idx) => {
        processOvers(inn?.overs, `inning_${idx + 1}`);
      });
    } else if (Array.isArray(scoreObj.overs)) {
      // 3. Process root overs only if neither innings_X nor inning array exists
      processOvers(scoreObj.overs, "1");
    }

    // 4. Also check direct score prop ONLY if scoreObj had nothing
    if (list.length === sessionDeliveries.length && score && score !== scoreObj && score !== targetSource) {
      const directKeys = Object.keys(score).filter((k) => k.startsWith("innings_"));
      if (directKeys.length > 0) {
        directKeys.forEach((innKey) => {
          processOvers(score[innKey]?.overs, innKey);
        });
      } else if (Array.isArray(score.inning)) {
        score.inning.forEach((inn, idx) => {
          processOvers(inn?.overs, `inning_${idx + 1}`);
        });
      }
    }

    return list.map((d, idx) => {
      let overNum = d.overNumber;
      if (overNum === undefined || overNum === null) {
        if (d.overIndex !== undefined && d.overIndex !== null) {
          overNum = Number(d.overIndex) + 1;
        } else if (d.over !== undefined && d.over !== null) {
          const p = parseFloat(d.over);
          overNum = !isNaN(p) ? (p >= 1 ? Math.floor(p) : 1) : 1;
        } else {
          overNum = 1;
        }
      }
      return {
        ...d,
        overNumber: Number(overNum),
      };
    });
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
      // Exclude wide, mankaded, retired, timed out, and non-delivery events from wagon wheel
      const bType = String(d.ballType || "").toLowerCase();
      const disType = String(d.dismissalInfo?.dismissalType || d.dismissalType || "").toLowerCase();
      if (
        bType === "wide" ||
        bType === "mankaded" ||
        disType === "mankaded" ||
        disType.includes("retire") ||
        disType === "timed out" ||
        d.dontCountTheball
      ) {
        return false;
      }
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
      // Exclude mankaded, retired, timed out, and non-delivery events from pitch map
      const bType = String(d.ballType || "").toLowerCase();
      const disType = String(d.dismissalInfo?.dismissalType || d.dismissalType || "").toLowerCase();
      if (
        bType === "mankaded" ||
        disType === "mankaded" ||
        disType.includes("retire") ||
        disType === "timed out" ||
        d.dontCountTheball
      ) {
        return false;
      }
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

  // Extract unique batsmen that this bowler bowled to
  const facedBatsmen = useMemo(() => {
    const map = new Map();
    bowlerFilteredPitches.forEach((d) => {
      const id = String(d.batsman?._id || d.batsman?.playerId || d.batsman?.id || (typeof d.batsman === "string" ? d.batsman : "") || "");
      const name = d.batsmanName || d.batsman?.name || d.batsman?.username || (id ? "Batter" : "");
      const stance = (d.batsman?.battingStyle || d.batsman?.batting_style || d.batterStance || "").toLowerCase().includes("left") ? "LHB" : "RHB";
      if (id && !map.has(id)) {
        map.set(id, { id, name: name || `Batter ${id.slice(-4)}`, stance });
      } else if (name && !map.has(name)) {
        map.set(name, { id: name, name, stance });
      }
    });
    return Array.from(map.values());
  }, [bowlerFilteredPitches]);

  // Filter bowler deliveries by faced batsman & stance
  const facedAndStanceFilteredPitches = useMemo(() => {
    return bowlerFilteredPitches.filter((d) => {
      if (selectedFacedBatsmanId !== "all") {
        const bId = String(d.batsman?._id || d.batsman?.playerId || d.batsman?.id || (typeof d.batsman === "string" ? d.batsman : "") || "");
        const bName = (d.batsmanName || d.batsman?.name || d.batsman?.username || "").toLowerCase().trim();
        const target = String(selectedFacedBatsmanId).toLowerCase().trim();
        if (bId !== selectedFacedBatsmanId && bName !== target) {
          return false;
        }
      }
      if (pitchStanceFilter !== "all") {
        const dStance = (d.batterStance || d.stance || d.batsman?.battingStyle || d.batsman?.batting_style || "").toLowerCase().includes("left") ? "LHB" : "RHB";
        if (dStance !== pitchStanceFilter) {
          return false;
        }
      }
      return true;
    });
  }, [bowlerFilteredPitches, selectedFacedBatsmanId, pitchStanceFilter]);

  // Group bowler's deliveries by over
  const bowlerOvers = useMemo(() => {
    const oversMap = new Map();
    facedAndStanceFilteredPitches.forEach((d) => {
      const overNum = Number(d.overNumber || 1);
      if (!oversMap.has(overNum)) {
        oversMap.set(overNum, {
          overNumber: overNum,
          deliveries: [],
          runs: 0,
          wickets: 0,
          dots: 0,
          ballsCount: 0,
        });
      }
      const entry = oversMap.get(overNum);
      const pm = d.pitchMap || d;
      const r = Number(d.runs ?? pm.runs ?? 0);
      const isWicket = Boolean(d.isWicket || pm.isWicket);
      const isDot = r === 0 && !isWicket;

      entry.deliveries.push(d);
      entry.runs += r;
      if (isWicket) entry.wickets += 1;
      if (isDot) entry.dots += 1;
      if (!d.isExtra || d.extraType === "bye" || d.extraType === "legBye") {
        entry.ballsCount += 1;
      }
    });

    return Array.from(oversMap.values()).sort((a, b) => a.overNumber - b.overNumber);
  }, [facedAndStanceFilteredPitches]);

  // Deliveries filtered by the selected over
  const overFilteredPitches = useMemo(() => {
    if (selectedOver === "all") return facedAndStanceFilteredPitches;
    return facedAndStanceFilteredPitches.filter((d) => Number(d.overNumber || 1) === Number(selectedOver));
  }, [facedAndStanceFilteredPitches, selectedOver]);

  // Filter deliveries for Pitch Map (respecting selected over and pitch filter)
  const filteredPitches = useMemo(() => {
    return overFilteredPitches.filter((d) => {
      const pm = d.pitchMap || d;
      const r = Number(d.runs ?? pm.runs ?? 0);
      if (pitchFilter === "dots" && (r !== 0 || d.isWicket)) return false;
      if (pitchFilter === "runs" && r === 0) return false;
      if (pitchFilter === "wickets" && !d.isWicket && !pm.isWicket) return false;

      return true;
    });
  }, [overFilteredPitches, pitchFilter]);

  const effectivePitchStance = useMemo(() => {
    if (pitchStanceFilter === "RHB" || pitchStanceFilter === "LHB") {
      return pitchStanceFilter;
    }
    if (selectedFacedBatsmanId !== "all") {
      const fb = facedBatsmen.find((b) => b.id === selectedFacedBatsmanId);
      if (fb?.stance) return fb.stance;
    }
    return batterStance || "RHB";
  }, [pitchStanceFilter, selectedFacedBatsmanId, facedBatsmen, batterStance]);

  // Real per-category counts for the pitch filter pill labels
  const pitchTypeCounts = useMemo(() => {
    let dots = 0, runs = 0, wickets = 0;
    overFilteredPitches.forEach((d) => {
      const pm = d.pitchMap || d;
      const r = Number(d.runs ?? pm.runs ?? 0);
      if (r === 0 && !d.isWicket) dots++;
      if (r > 0) runs++;
      if (d.isWicket || pm.isWicket) wickets++;
    });
    return { dots, runs, wickets };
  }, [overFilteredPitches]);

  const activeOverData = useMemo(() => {
    if (selectedOver === "all") return null;
    return bowlerOvers.find((o) => o.overNumber === Number(selectedOver)) || null;
  }, [bowlerOvers, selectedOver]);

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
              {/* <Text
                style={[
                  styles.headerSub,
                  { color: isDarkMode ? "#94A3B8" : "#64748B" },
                ]}
                numberOfLines={1}
              >
                {selectedPlayer
                  ? (activeTab === "wagon" ? "Wagon Wheel • Shots Analysis" : "Pitch Map • Length Distribution")
                  : "Wagon Wheel & Pitch Map distribution"}
              </Text> */}
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

          {/* Mode Tabs - Role Filtered */}
          {/* <View
            style={[
              styles.tabBar,
              {
                backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9",
                borderColor: isDarkMode ? "#334155" : "#E2E8F0",
              },
            ]}
          >
            {!isBowlerOnly && (
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
            )}

            {!isBatsmanOnly && (
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
            )}
          </View> */}

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
                {/* <View
                  style={[
                    styles.avatarBadge,
                    { backgroundColor: isDarkMode ? "#3B82F6" : "#2563EB" },
                  ]}
                >
                  <Text style={styles.avatarBadgeText}>
                    {(selectedPlayer.name || selectedPlayer.username || "P").charAt(0).toUpperCase()}
                  </Text>
                </View> */}
                <View style={{ marginLeft: 10, flex: 1 }}>
                  {/* <Text
                    style={[
                      styles.playerHeroName,
                      { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedPlayer.name || selectedPlayer.username || "Player"}
                    {selectedPlayer.notOut ? " *" : ""}
                  </Text> */}
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
                {/* <View
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
                      numberOfLines={1}
                    >
                      Shots
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
                ) : null} */}

                <WagonWheel
                  readOnly={true}
                  size={290}
                  historicalShots={filteredShots}
                  isDarkMode={isDarkMode}
                  isBoxCricket={isBoxCricket}
                  batterStance={batterStance}
                />
              </>
            ) : (
              <>
                {/* Bowler Sub-Filters: Stance & Faced Batsmen */}
                <View style={styles.pitchSubFilterContainer}>
                  {/* Stance Filter: All | RHB | LHB */}
                  <View style={styles.pitchSubFilterRow}>
                    <Text
                      style={[
                        styles.subFilterTitle,
                        { color: isDarkMode ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      Batter Stance
                    </Text>
                    <View style={styles.stancePillGroup}>
                      {["all", "RHB", "LHB"].map((st) => {
                        const isSelected = pitchStanceFilter === st;
                        return (
                          <TouchableOpacity
                            key={`stance-${st}`}
                            style={[
                              styles.miniStancePill,
                              isSelected && styles.miniStancePillActive,
                              {
                                backgroundColor: isSelected
                                  ? COLORS.primary
                                  : isDarkMode
                                  ? "#1E293B"
                                  : "#F1F5F9",
                                borderColor: isSelected
                                  ? COLORS.primary
                                  : isDarkMode
                                  ? "#334155"
                                  : "#E2E8F0",
                              },
                            ]}
                            onPress={() => setPitchStanceFilter(st)}
                          >
                            <Text
                              style={[
                                styles.miniStanceText,
                                isSelected && styles.miniStanceTextActive,
                                {
                                  color: isSelected
                                    ? "#FFFFFF"
                                    : isDarkMode
                                    ? "#CBD5E1"
                                    : "#334155",
                                },
                              ]}
                            >
                              {st === "all" ? "All Stances" : st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Faced Batsmen Horizontal Scroll */}
                  {facedBatsmen.length > 0 && (
                    <View style={{ marginTop: 2 }}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6 }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.miniFilterPill,
                            selectedFacedBatsmanId === "all" && styles.miniFilterPillActive,
                            {
                              backgroundColor:
                                selectedFacedBatsmanId === "all"
                                  ? COLORS.primary
                                  : isDarkMode
                                  ? "#1E293B"
                                  : "#F1F5F9",
                              borderColor:
                                selectedFacedBatsmanId === "all"
                                  ? COLORS.primary
                                  : isDarkMode
                                  ? "#334155"
                                  : "#E2E8F0",
                            },
                          ]}
                          onPress={() => setSelectedFacedBatsmanId("all")}
                        >
                          <Text
                            style={[
                              styles.miniFilterText,
                              selectedFacedBatsmanId === "all" && styles.miniFilterTextActive,
                              {
                                color:
                                  selectedFacedBatsmanId === "all"
                                    ? "#FFFFFF"
                                    : isDarkMode
                                    ? "#CBD5E1"
                                    : "#334155",
                              },
                            ]}
                          >
                            All Batsmen ({facedBatsmen.length})
                          </Text>
                        </TouchableOpacity>

                        {facedBatsmen.map((fb) => {
                          const isSelected = selectedFacedBatsmanId === fb.id;
                          return (
                            <TouchableOpacity
                              key={`faced-${fb.id}`}
                              style={[
                                styles.miniFilterPill,
                                isSelected && styles.miniFilterPillActive,
                                {
                                  backgroundColor: isSelected
                                    ? COLORS.primary
                                    : isDarkMode
                                    ? "#1E293B"
                                    : "#F1F5F9",
                                  borderColor: isSelected
                                    ? COLORS.primary
                                    : isDarkMode
                                    ? "#334155"
                                    : "#E2E8F0",
                                },
                              ]}
                              onPress={() => setSelectedFacedBatsmanId(fb.id)}
                            >
                              <Text
                                style={[
                                  styles.miniFilterText,
                                  isSelected && styles.miniFilterTextActive,
                                  {
                                    color: isSelected
                                      ? "#FFFFFF"
                                      : isDarkMode
                                      ? "#CBD5E1"
                                      : "#334155",
                                  },
                                ]}
                              >
                                vs {fb.name} {fb.stance ? `(${fb.stance})` : ""}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Crex Style Over Selector */}
                {bowlerOvers.length > 0 && (
                  <View style={styles.overSelectorWrapper}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.overSelectorScroll}
                    >
                      <TouchableOpacity
                        style={[
                          styles.overPill,
                          selectedOver === "all" && styles.overPillActive,
                          {
                            backgroundColor:
                              selectedOver === "all"
                                ? COLORS.primary
                                : isDarkMode
                                ? "#1E293B"
                                : "#F1F5F9",
                            borderColor:
                              selectedOver === "all"
                                ? COLORS.primary
                                : isDarkMode
                                ? "#334155"
                                : "#E2E8F0",
                          },
                        ]}
                        onPress={() => setSelectedOver("all")}
                      >
                        <Text
                          style={[
                            styles.overPillText,
                            selectedOver === "all" && styles.overPillTextActive,
                            {
                              color:
                                selectedOver === "all"
                                  ? "#FFFFFF"
                                  : isDarkMode
                                  ? "#CBD5E1"
                                  : "#334155",
                            },
                          ]}
                        >
                          All Overs ({facedAndStanceFilteredPitches.length})
                        </Text>
                      </TouchableOpacity>

                      {bowlerOvers.map((ov) => {
                        const isSelected = selectedOver === ov.overNumber;
                        return (
                          <TouchableOpacity
                            key={`ov-pill-${ov.overNumber}`}
                            style={[
                              styles.overPill,
                              isSelected && styles.overPillActive,
                              {
                                backgroundColor: isSelected
                                  ? COLORS.primary
                                  : isDarkMode
                                  ? "#1E293B"
                                  : "#F1F5F9",
                                borderColor: isSelected
                                  ? COLORS.primary
                                  : isDarkMode
                                  ? "#334155"
                                  : "#E2E8F0",
                              },
                            ]}
                            onPress={() => setSelectedOver(ov.overNumber)}
                          >
                            <Text
                              style={[
                                styles.overPillText,
                                isSelected && styles.overPillTextActive,
                                {
                                  color: isSelected
                                    ? "#FFFFFF"
                                    : isDarkMode
                                    ? "#CBD5E1"
                                    : "#334155",
                                },
                              ]}
                            >
                              Over {ov.overNumber}
                            </Text>
                            <View
                              style={[
                                styles.overPillBadge,
                                {
                                  backgroundColor: isSelected
                                    ? "rgba(255,255,255,0.25)"
                                    : isDarkMode
                                    ? "#334155"
                                    : "#E2E8F0",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.overPillBadgeText,
                                  {
                                    color: isSelected
                                      ? "#FFFFFF"
                                      : isDarkMode
                                      ? "#94A3B8"
                                      : "#64748B",
                                  },
                                ]}
                              >
                                {ov.runs}r{ov.wickets > 0 ? ` • ${ov.wickets}w` : ""}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Active Over Detailed Analysis Card */}
                {Boolean(activeOverData) && (
                  <View
                    style={[
                      styles.overDetailCard,
                      {
                        backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
                        borderColor: isDarkMode ? "#334155" : "#E2E8F0",
                      },
                    ]}
                  >
                    <View style={styles.overDetailHeader}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.overDetailTitle,
                            { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                          ]}
                        >
                          Over {activeOverData.overNumber} Breakdown
                        </Text>
                        <Text
                          style={[
                            styles.overDetailSub,
                            { color: isDarkMode ? "#94A3B8" : "#64748B" },
                          ]}
                        >
                          {activeOverData.runs} Runs • {activeOverData.wickets} Wkt{activeOverData.wickets !== 1 ? "s" : ""} • {activeOverData.dots} Dot{activeOverData.dots !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedOver("all")}
                        style={[
                          styles.overResetButton,
                          {
                            backgroundColor: isDarkMode ? "#334155" : "#E2E8F0",
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: isDarkMode ? "#38BDF8" : "#0284C7",
                          }}
                        >
                          All Overs ✕
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Ball-by-ball timeline */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.ballTimelineScroll}
                    >
                      {activeOverData.deliveries.map((ball, bIdx) => {
                        const info = getDeliveryPitchInfo(ball);
                        const ballBadge = getBallColor(ball, isDarkMode);
                        return (
                          <View
                            key={`ov-ball-${bIdx}`}
                            style={[
                              styles.ballTimelineCard,
                              {
                                backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
                                borderColor: isDarkMode ? "#334155" : "#E2E8F0",
                              },
                            ]}
                          >
                            <View style={styles.ballTimelineTop}>
                              <Text
                                style={[
                                  styles.ballTimelineIndex,
                                  { color: isDarkMode ? "#94A3B8" : "#64748B" },
                                ]}
                              >
                                {activeOverData.overNumber}.{bIdx + 1}
                              </Text>
                              <View
                                style={[
                                  styles.ballOutcomeDot,
                                  { backgroundColor: ballBadge.bg },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.ballOutcomeText,
                                    { color: ballBadge.text },
                                  ]}
                                >
                                  {ballBadge.label}
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={[
                                styles.ballTimelineLength,
                                { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                              ]}
                              numberOfLines={1}
                            >
                              {info.length}
                            </Text>
                            <Text
                              style={[
                                styles.ballTimelineLine,
                                { color: isDarkMode ? "#94A3B8" : "#64748B" },
                              ]}
                              numberOfLines={1}
                            >
                              {info.line}
                            </Text>
                            {Boolean(info.dist) && (
                              <Text
                                style={[
                                  styles.ballTimelineDist,
                                  { color: COLORS.primary },
                                ]}
                              >
                                {info.dist}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

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
                  batterStance={effectivePitchStance}
                />

                {/* Reset button if specific over is active */}
                {selectedOver !== "all" ? (
                  <TouchableOpacity
                    style={[
                      styles.viewAllOversBtn,
                      {
                        backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9",
                        borderColor: isDarkMode ? "#334155" : "#CBD5E1",
                      },
                    ]}
                    onPress={() => setSelectedOver("all")}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.viewAllOversBtnText,
                        { color: isDarkMode ? "#38BDF8" : "#0284C7" },
                      ]}
                    >
                      ← View Full Spell (All Overs Combined)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  /* Crex Style Overs Breakdown List when showing all overs */
                  bowlerOvers.length > 1 && (
                    <View
                      style={[
                        styles.oversBreakdownSection,
                        {
                          backgroundColor: isDarkMode ? "#1E293B" : "#F8FAFC",
                          borderColor: isDarkMode ? "#334155" : "#E2E8F0",
                        },
                      ]}
                    >
                      <View style={styles.oversBreakdownHeader}>
                        <View>
                          <Text
                            style={[
                              styles.oversBreakdownTitle,
                              { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                            ]}
                          >
                            Overs Breakdown
                          </Text>
                          <Text
                            style={[
                              styles.oversBreakdownSub,
                              { color: isDarkMode ? "#94A3B8" : "#64748B" },
                            ]}
                          >
                            Tap an over to inspect pitch map & lengths
                          </Text>
                        </View>
                        <BarChart2 size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                      </View>

                      {bowlerOvers.map((ov) => (
                        <TouchableOpacity
                          key={`breakdown-row-${ov.overNumber}`}
                          style={[
                            styles.overRowCard,
                            {
                              backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
                              borderColor: isDarkMode ? "#334155" : "#E2E8F0",
                            },
                          ]}
                          onPress={() => setSelectedOver(ov.overNumber)}
                          activeOpacity={0.7}
                        >
                          <View style={{ minWidth: 54 }}>
                            <Text
                              style={[
                                styles.overRowNumber,
                                { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                              ]}
                            >
                              Over {ov.overNumber}
                            </Text>
                            <Text
                              style={[
                                styles.overRowSub,
                                { color: isDarkMode ? "#94A3B8" : "#64748B" },
                              ]}
                            >
                              {ov.deliveries.length}b • {ov.dots}d
                            </Text>
                          </View>

                          {/* Ball outcome bubbles */}
                          <View style={styles.overRowBalls}>
                            {ov.deliveries.map((b, bIdx) => {
                              const badge = getBallColor(b, isDarkMode);
                              return (
                                <View
                                  key={`b-dot-${bIdx}`}
                                  style={[
                                    styles.smallBallDot,
                                    { backgroundColor: badge.bg },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.smallBallText,
                                      { color: badge.text },
                                    ]}
                                  >
                                    {badge.label}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>

                          {/* Figures & chevron */}
                          <View style={styles.overRowRight}>
                            <Text
                              style={[
                                styles.overRowTotalText,
                                { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                              ]}
                            >
                              = {ov.runs} {ov.runs === 1 ? "Run" : "Runs"}
                              {ov.wickets > 0 ? `, ${ov.wickets}W` : ""}
                            </Text>
                            <ChevronRight
                              size={14}
                              color={isDarkMode ? "#94A3B8" : "#64748B"}
                            />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                )}
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
  overSelectorWrapper: {
    width: "100%",
    marginBottom: 10,
  },
  overSelectorScroll: {
    paddingHorizontal: 2,
    gap: 8,
    alignItems: "center",
  },
  overPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  overPillActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  overPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  overPillTextActive: {
    fontWeight: "700",
  },
  overPillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  overPillBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  overDetailCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  overDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  overDetailTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  overDetailSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  overResetButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ballTimelineScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  ballTimelineCard: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 78,
    alignItems: "center",
  },
  ballTimelineTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  ballTimelineIndex: {
    fontSize: 11,
    fontWeight: "600",
  },
  ballOutcomeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  ballOutcomeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  ballTimelineLength: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  ballTimelineLine: {
    fontSize: 9,
    marginTop: 1,
  },
  ballTimelineDist: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  viewAllOversBtn: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  viewAllOversBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  oversBreakdownSection: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  oversBreakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  oversBreakdownTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  oversBreakdownSub: {
    fontSize: 11,
    marginTop: 2,
  },
  overRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  overRowNumber: {
    fontSize: 12,
    fontWeight: "700",
  },
  overRowSub: {
    fontSize: 10,
    marginTop: 1,
  },
  overRowBalls: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  smallBallDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBallText: {
    fontSize: 9,
    fontWeight: "800",
  },
  overRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  overRowTotalText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pitchSubFilterContainer: {
    width: "100%",
    marginBottom: 10,
  },
  pitchSubFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  subFilterTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  stancePillGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniStancePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniStancePillActive: {
    backgroundColor: COLORS.primary,
  },
  miniStanceText: {
    fontSize: 11,
    fontWeight: "700",
  },
  miniStanceTextActive: {
    color: "#FFFFFF",
  },
  miniFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  miniFilterPillActive: {
    backgroundColor: COLORS.primary,
  },
  miniFilterText: {
    fontSize: 11,
    fontWeight: "600",
  },
  miniFilterTextActive: {
    color: "#FFFFFF",
  },
});

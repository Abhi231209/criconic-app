import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Dimensions,
  StyleSheet,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import useAppTheme from "@/hooks/useAppTheme";
import { COLORS } from "@/theme/colors";
import {
  calculateDLSTarget,
  calculateDLSParScore,
  calculateDLSResult,
  normalizeOversToDecimal,
} from "@/utils/dlsCalculator";

const { height } = Dimensions.get("window");

export default function DlsCalculatorModal({
  visible,
  onClose,
  score,
  matchDetails,
  currentDls,
  onApplyDls,
  onRemoveDls,
  onConcludeMatch,
}) {
  const { isDark } = useAppTheme();
  const isDarkMode = isDark;
  const C = isDarkMode ? COLORS.dark : COLORS.light;

  const [activeTab, setActiveTab] = useState("revised"); // "revised" | "abandoned"

  // Derive Team 1 parameters
  const team1Name = useMemo(() => {
    return (
      score?.innings_1?.teamName ||
      score?.bowling?.teamName ||
      matchDetails?.teams?.[0]?.title ||
      matchDetails?.teams?.[0]?.name ||
      "Team A"
    );
  }, [score, matchDetails]);

  const team2Name = useMemo(() => {
    return (
      score?.innings_2?.teamName ||
      score?.batting?.teamName ||
      matchDetails?.teams?.[1]?.title ||
      matchDetails?.teams?.[1]?.name ||
      "Team B"
    );
  }, [score, matchDetails]);

  const team1Runs = useMemo(() => {
    const r =
      score?.innings_1?.totalRuns ??
      score?.lastInningScore ??
      matchDetails?.score?.innings_1?.totalRuns ??
      0;
    return parseInt(r, 10) || 0;
  }, [score, matchDetails]);

  const team1Wickets = useMemo(() => {
    const w =
      score?.innings_1?.totalWickets ??
      score?.lastInningWickets ??
      matchDetails?.score?.innings_1?.totalWickets ??
      0;
    return parseInt(w, 10) || 0;
  }, [score, matchDetails]);

  const originalMatchOvers = useMemo(() => {
    return (
      parseInt(
        currentDls?.originalOvers ||
          matchDetails?.totalOvers ||
          score?.matchTotalOver ||
          score?.totalOvers ||
          20,
        10
      ) || 20
    );
  }, [matchDetails, score, currentDls]);

  const team1Overs = useMemo(() => {
    const ov =
      currentDls?.team1Overs ||
      score?.innings_1?.inningTotalOver ||
      originalMatchOvers;
    return normalizeOversToDecimal(ov) || 20;
  }, [score, currentDls, originalMatchOvers]);

  // Derive Team 2 current parameters
  const team2CurrentRuns = useMemo(() => {
    return parseInt(score?.batting?.score?.runs ?? 0, 10) || 0;
  }, [score]);

  const team2CurrentWickets = useMemo(() => {
    return parseInt(score?.batting?.score?.wicket ?? 0, 10) || 0;
  }, [score]);

  const team2CurrentOvers = useMemo(() => {
    return String(score?.batting?.score?.over ?? "0.0");
  }, [score]);

  // Input states for Revised Target tab
  const [revisedOversInput, setRevisedOversInput] = useState(() => {
    if (currentDls?.revisedOvers) return String(currentDls.revisedOvers);
    return String(Math.max(5, originalMatchOvers - 5));
  });

  const [customTargetOverride, setCustomTargetOverride] = useState("");
  const [useCustomTarget, setUseCustomTarget] = useState(false);

  // Sync state if currentDls changes or modal opens
  useEffect(() => {
    if (currentDls?.applied) {
      if (currentDls.revisedOvers) {
        setRevisedOversInput(String(currentDls.revisedOvers));
      }
      if (currentDls.isCustomOverride && currentDls.revisedTarget) {
        setUseCustomTarget(true);
        setCustomTargetOverride(String(currentDls.revisedTarget));
      }
    } else {
      setRevisedOversInput(String(Math.max(5, originalMatchOvers - 5)));
      setUseCustomTarget(false);
      setCustomTargetOverride("");
    }
  }, [currentDls, originalMatchOvers, visible]);

  // Compute live DLS revised target
  const revisedOversNum = Math.max(1, parseInt(revisedOversInput, 10) || originalMatchOvers);

  const dlsTargetCalc = useMemo(() => {
    return calculateDLSTarget({
      team1Runs,
      team1Overs,
      team2Overs: revisedOversNum,
      team1Wickets,
    });
  }, [team1Runs, team1Overs, revisedOversNum, team1Wickets]);

  const effectiveRevisedTarget = useMemo(() => {
    if (useCustomTarget && customTargetOverride) {
      const parsed = parseInt(customTargetOverride, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return dlsTargetCalc.revisedTarget;
  }, [useCustomTarget, customTargetOverride, dlsTargetCalc.revisedTarget]);

  // Compute live DLS Par Score and Abandonment Result
  const dlsAbandonedResult = useMemo(() => {
    return calculateDLSResult({
      team1Name,
      team2Name,
      team1Runs,
      team1Overs,
      team2Runs: team2CurrentRuns,
      team2CurrentOvers,
      team2WicketsLost: team2CurrentWickets,
      team2TotalOvers: currentDls?.revisedOvers || originalMatchOvers,
    });
  }, [
    team1Name,
    team2Name,
    team1Runs,
    team1Overs,
    team2CurrentRuns,
    team2CurrentOvers,
    team2CurrentWickets,
    currentDls,
    originalMatchOvers,
  ]);

  const currentParScore = useMemo(() => {
    return calculateDLSParScore({
      team1Runs,
      team1Overs,
      team2TotalOvers: currentDls?.revisedOvers || originalMatchOvers,
      team2CurrentOvers,
      team2WicketsLost: team2CurrentWickets,
    });
  }, [
    team1Runs,
    team1Overs,
    currentDls,
    originalMatchOvers,
    team2CurrentOvers,
    team2CurrentWickets,
  ]);

  const handleQuickOversAdjust = (delta) => {
    const next = Math.max(1, Math.min(originalMatchOvers, revisedOversNum + delta));
    setRevisedOversInput(String(next));
  };

  const handleApplyDLS = () => {
    if (revisedOversNum >= originalMatchOvers && !useCustomTarget) {
      Alert.alert(
        "Notice",
        `Revised overs (${revisedOversNum}) is equal to or greater than original match overs (${originalMatchOvers}). DLS will still be applied with the calculated target.`
      );
    }

    const payload = {
      applied: true,
      revisedTarget: effectiveRevisedTarget,
      revisedOvers: revisedOversNum,
      originalOvers: originalMatchOvers,
      team1Score: team1Runs,
      team1Wickets,
      team1Overs,
      team1Name,
      team2Name,
      team1Resource: dlsTargetCalc.team1Resource,
      team2Resource: dlsTargetCalc.team2Resource,
      rrr: dlsTargetCalc.rrr,
      isCustomOverride: useCustomTarget,
      dlsPar: dlsTargetCalc.parScore,
      appliedAt: new Date().toISOString(),
    };

    onApplyDls?.(payload);
    onClose?.();
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove DLS",
      "Are you sure you want to remove DLS and restore original match targets and overs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove DLS",
          style: "destructive",
          onPress: () => {
            onRemoveDls?.();
            onClose?.();
          },
        },
      ]
    );
  };

  const handleConcludeWithDls = () => {
    Alert.alert(
      "Conclude Match with DLS",
      `Call off match and declare official result:\n\n${dlsAbandonedResult.summaryText}\n\nAre you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Declare Winner",
          style: "default",
          onPress: () => {
            onConcludeMatch?.(dlsAbandonedResult);
            onClose?.();
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
                  maxHeight: height * 0.88,
                },
              ]}
            >
              {/* Handlebar */}
              <View
                style={[
                  styles.handlebar,
                  { backgroundColor: isDarkMode ? "#374151" : "#D1D5DB" },
                ]}
              />

              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isDarkMode
                        ? "rgba(59, 130, 246, 0.2)"
                        : "#EFF6FF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="rainy" size={18} color="#3B82F6" />
                  </View>
                  <View>
                    <ThemedText
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: isDarkMode ? "#FFFFFF" : "#111827",
                      }}
                    >
                      DLS Method (Rain Rule)
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontSize: 11,
                        color: isDarkMode ? "#9CA3AF" : "#64748B",
                      }}
                    >
                      Duckworth-Lewis-Stern Target & Par Calculator
                    </ThemedText>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDarkMode ? "#1F2937" : "#F3F4F6" },
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={isDarkMode ? "#9CA3AF" : "#64748B"}
                  />
                </TouchableOpacity>
              </View>

              {/* Current Match Context Card */}
              <View
                style={[
                  styles.contextCard,
                  {
                    backgroundColor: isDarkMode ? "#1F2937" : "#F8FAFC",
                    borderColor: isDarkMode
                      ? "rgba(55, 65, 81, 0.8)"
                      : "rgba(226, 232, 240, 0.8)",
                  },
                ]}
              >
                <View style={styles.contextRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: isDarkMode ? "#9CA3AF" : "#64748B",
                        textTransform: "uppercase",
                      }}
                    >
                      1st Innings ({team1Name})
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontSize: 15,
                        fontWeight: "800",
                        color: isDarkMode ? "#FFFFFF" : "#1E293B",
                        marginTop: 2,
                      }}
                    >
                      {team1Runs}/{team1Wickets} ({team1Overs} ov)
                    </ThemedText>
                  </View>

                  <View
                    style={{
                      width: 1,
                      height: 32,
                      backgroundColor: isDarkMode ? "#374151" : "#E2E8F0",
                      marginHorizontal: 12,
                    }}
                  />

                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: isDarkMode ? "#9CA3AF" : "#64748B",
                        textTransform: "uppercase",
                      }}
                    >
                      2nd Innings ({team2Name})
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontSize: 15,
                        fontWeight: "800",
                        color: isDarkMode ? "#FFFFFF" : "#1E293B",
                        marginTop: 2,
                      }}
                    >
                      {team2CurrentRuns}/{team2CurrentWickets} ({team2CurrentOvers} ov)
                    </ThemedText>
                  </View>
                </View>

                {currentDls?.applied && (
                  <View
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: isDarkMode
                        ? "rgba(55, 65, 81, 0.5)"
                        : "rgba(226, 232, 240, 0.8)",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#10B981",
                          marginRight: 6,
                        }}
                      />
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: "#10B981",
                        }}
                      >
                        DLS Active: Target {currentDls.revisedTarget} in{" "}
                        {currentDls.revisedOvers} ov
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={{
                        fontSize: 11,
                        color: isDarkMode ? "#9CA3AF" : "#64748B",
                      }}
                    >
                      Original: {originalMatchOvers} ov
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Mode Tabs */}
              <View
                style={[
                  styles.tabBar,
                  { backgroundColor: isDarkMode ? "#1F2937" : "#E2E8F0" },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab("revised")}
                  style={[
                    styles.tabBtn,
                    activeTab === "revised" && {
                      backgroundColor: isDarkMode ? "#3B82F6" : "#FFFFFF",
                      elevation: 2,
                    },
                  ]}
                >
                  <Ionicons
                    name="calculator-outline"
                    size={14}
                    color={
                      activeTab === "revised"
                        ? isDarkMode
                          ? "#FFFFFF"
                          : "#1E293B"
                        : isDarkMode
                        ? "#9CA3AF"
                        : "#64748B"
                    }
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    style={{
                      fontSize: 12,
                      fontWeight: activeTab === "revised" ? "700" : "500",
                      color:
                        activeTab === "revised"
                          ? isDarkMode
                            ? "#FFFFFF"
                            : "#1E293B"
                          : isDarkMode
                          ? "#9CA3AF"
                          : "#64748B",
                    }}
                  >
                    Revised Target
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab("abandoned")}
                  style={[
                    styles.tabBtn,
                    activeTab === "abandoned" && {
                      backgroundColor: isDarkMode ? "#3B82F6" : "#FFFFFF",
                      elevation: 2,
                    },
                  ]}
                >
                  <Ionicons
                    name="flag-outline"
                    size={14}
                    color={
                      activeTab === "abandoned"
                        ? isDarkMode
                          ? "#FFFFFF"
                          : "#1E293B"
                        : isDarkMode
                        ? "#9CA3AF"
                        : "#64748B"
                    }
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    style={{
                      fontSize: 12,
                      fontWeight: activeTab === "abandoned" ? "700" : "500",
                      color:
                        activeTab === "abandoned"
                          ? isDarkMode
                            ? "#FFFFFF"
                            : "#1E293B"
                          : isDarkMode
                          ? "#9CA3AF"
                          : "#64748B",
                    }}
                  >
                    Match Abandoned / Par
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {activeTab === "revised" ? (
                  /* ── TAB 1: REVISED TARGET ── */
                  <View>
                    <ThemedText
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: isDarkMode ? "#E2E8F0" : "#1E293B",
                        marginBottom: 6,
                      }}
                    >
                      Revised Total Overs for {team2Name}:
                    </ThemedText>

                    {/* Overs Stepper & Input */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleQuickOversAdjust(-1)}
                        style={[
                          styles.stepperBtn,
                          { backgroundColor: isDarkMode ? "#1F2937" : "#F1F5F9" },
                        ]}
                      >
                        <Ionicons
                          name="remove"
                          size={18}
                          color={isDarkMode ? "#FFFFFF" : "#1E293B"}
                        />
                      </TouchableOpacity>

                      <View
                        style={[
                          styles.oversInputContainer,
                          {
                            backgroundColor: isDarkMode ? "#1F2937" : "#F8FAFC",
                            borderColor: isDarkMode ? "#374151" : "#E2E8F0",
                          },
                        ]}
                      >
                        <TextInput
                          value={revisedOversInput}
                          onChangeText={setRevisedOversInput}
                          keyboardType="number-pad"
                          maxLength={2}
                          style={{
                            fontSize: 18,
                            fontWeight: "800",
                            color: isDarkMode ? "#FFFFFF" : "#1E293B",
                            textAlign: "center",
                            paddingVertical: 6,
                          }}
                        />
                        <ThemedText
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: isDarkMode ? "#9CA3AF" : "#64748B",
                            marginLeft: 4,
                          }}
                        >
                          overs
                        </ThemedText>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleQuickOversAdjust(1)}
                        style={[
                          styles.stepperBtn,
                          { backgroundColor: isDarkMode ? "#1F2937" : "#F1F5F9" },
                        ]}
                      >
                        <Ionicons
                          name="add"
                          size={18}
                          color={isDarkMode ? "#FFFFFF" : "#1E293B"}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Quick Overs Selection Chips */}
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        marginTop: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {[5, 10, 12, 15, 18]
                        .filter((ov) => ov < originalMatchOvers)
                        .map((ov) => (
                          <TouchableOpacity
                            key={ov}
                            onPress={() => setRevisedOversInput(String(ov))}
                            style={[
                              styles.quickChip,
                              {
                                backgroundColor:
                                  revisedOversNum === ov
                                    ? "#3B82F6"
                                    : isDarkMode
                                    ? "#1F2937"
                                    : "#F1F5F9",
                              },
                            ]}
                          >
                            <ThemedText
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color:
                                  revisedOversNum === ov
                                    ? "#FFFFFF"
                                    : isDarkMode
                                    ? "#9CA3AF"
                                    : "#64748B",
                              }}
                            >
                              {ov} ov
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                    </View>

                    {/* DLS Calculation Result Card */}
                    <View
                      style={[
                        styles.resultCard,
                        {
                          backgroundColor: isDarkMode ? "#0F172A" : "#EFF6FF",
                          borderColor: isDarkMode
                            ? "rgba(59, 130, 246, 0.4)"
                            : "#BFDBFE",
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#3B82F6",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          DLS Calculated Target
                        </ThemedText>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 10,
                            backgroundColor: "rgba(59, 130, 246, 0.15)",
                          }}
                        >
                          <ThemedText
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: "#3B82F6",
                            }}
                          >
                            {dlsTargetCalc.isReduced ? "Shortened Chase" : "Extended"}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Prominent Target Score */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "baseline",
                          marginBottom: 6,
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 32,
                            fontWeight: "900",
                            color: isDarkMode ? "#FFFFFF" : "#1E293B",
                          }}
                        >
                          {effectiveRevisedTarget}
                        </ThemedText>
                        <ThemedText
                          style={{
                            fontSize: 15,
                            fontWeight: "600",
                            color: isDarkMode ? "#9CA3AF" : "#64748B",
                            marginLeft: 6,
                          }}
                        >
                          runs in {revisedOversNum} overs
                        </ThemedText>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: isDarkMode
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 12,
                            color: isDarkMode ? "#CBD5E1" : "#475569",
                          }}
                        >
                          Required Run Rate:{" "}
                          <ThemedText style={{ fontWeight: "800", color: "#3B82F6" }}>
                            {dlsTargetCalc.rrr} RPO
                          </ThemedText>
                        </ThemedText>
                        <ThemedText
                          style={{
                            fontSize: 12,
                            color: isDarkMode ? "#CBD5E1" : "#475569",
                          }}
                        >
                          Par:{" "}
                          <ThemedText style={{ fontWeight: "800" }}>
                            {dlsTargetCalc.parScore}
                          </ThemedText>
                        </ThemedText>
                      </View>

                      {/* Resource % Breakdown */}
                      <ThemedText
                        style={{
                          fontSize: 11,
                          color: isDarkMode ? "#94A3B8" : "#64748B",
                          marginTop: 6,
                        }}
                      >
                        Resources: {team1Name} ({dlsTargetCalc.team1Resource}%) •{" "}
                        {team2Name} ({dlsTargetCalc.team2Resource}%)
                      </ThemedText>
                    </View>

                    {/* Optional Custom Target Override */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setUseCustomTarget(!useCustomTarget)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 12,
                        marginBottom: 8,
                      }}
                    >
                      <Ionicons
                        name={useCustomTarget ? "checkbox" : "square-outline"}
                        size={18}
                        color="#3B82F6"
                        style={{ marginRight: 8 }}
                      />
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: isDarkMode ? "#D1D5DB" : "#475569",
                        }}
                      >
                        Custom / Tournament Committee Override Target
                      </ThemedText>
                    </TouchableOpacity>

                    {useCustomTarget && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 12,
                          padding: 10,
                          borderRadius: 10,
                          backgroundColor: isDarkMode ? "#1F2937" : "#F1F5F9",
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: isDarkMode ? "#E2E8F0" : "#1E293B",
                            marginRight: 10,
                          }}
                        >
                          Manual Target:
                        </ThemedText>
                        <TextInput
                          value={customTargetOverride}
                          onChangeText={setCustomTargetOverride}
                          placeholder={String(dlsTargetCalc.revisedTarget)}
                          placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                          keyboardType="number-pad"
                          style={{
                            flex: 1,
                            paddingVertical: 4,
                            paddingHorizontal: 10,
                            borderRadius: 6,
                            backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
                            color: isDarkMode ? "#FFFFFF" : "#111827",
                            fontWeight: "700",
                            fontSize: 14,
                          }}
                        />
                      </View>
                    )}

                    {/* Apply Button */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleApplyDLS}
                      style={[
                        styles.primaryActionBtn,
                        { backgroundColor: COLORS.primary, marginTop: 12 },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText
                        style={{
                          color: "#FFFFFF",
                          fontSize: 14,
                          fontWeight: "800",
                        }}
                      >
                        Apply DLS Target ({effectiveRevisedTarget} runs in{" "}
                        {revisedOversNum} ov)
                      </ThemedText>
                    </TouchableOpacity>

                    {currentDls?.applied && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleRemove}
                        style={[
                          styles.secondaryActionBtn,
                          {
                            borderColor: COLORS.danger,
                            marginTop: 10,
                          },
                        ]}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={COLORS.danger}
                          style={{ marginRight: 6 }}
                        />
                        <ThemedText
                          style={{
                            color: COLORS.danger,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          Remove DLS (Restore Original Overs)
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  /* ── TAB 2: MATCH ABANDONED / PAR SCORE RESULT ── */
                  <View>
                    <ThemedText
                      style={{
                        fontSize: 13,
                        color: isDarkMode ? "#9CA3AF" : "#64748B",
                        marginBottom: 10,
                      }}
                    >
                      If rain terminates play during the 2nd innings, the winner is
                      decided by comparing {team2Name}'s score with the official DLS
                      Par Score at this exact delivery.
                    </ThemedText>

                    {/* Par Score Comparison Card */}
                    <View
                      style={[
                        styles.resultCard,
                        {
                          backgroundColor: isDarkMode ? "#0F172A" : "#F0FDF4",
                          borderColor:
                            dlsAbandonedResult.winnerTeam === "team2"
                              ? "#86EFAC"
                              : dlsAbandonedResult.winnerTeam === "team1"
                              ? "#FCA5A5"
                              : "#FDE047",
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isDarkMode ? "#9CA3AF" : "#64748B",
                          textTransform: "uppercase",
                        }}
                      >
                        Current Situation at {team2CurrentOvers} overs:
                      </ThemedText>

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginVertical: 8,
                        }}
                      >
                        <View>
                          <ThemedText
                            style={{
                              fontSize: 11,
                              color: isDarkMode ? "#9CA3AF" : "#64748B",
                            }}
                          >
                            {team2Name} Score:
                          </ThemedText>
                          <ThemedText
                            style={{
                              fontSize: 22,
                              fontWeight: "900",
                              color: isDarkMode ? "#FFFFFF" : "#1E293B",
                            }}
                          >
                            {team2CurrentRuns}/{team2CurrentWickets}
                          </ThemedText>
                        </View>

                        <View style={{ alignItems: "center" }}>
                          <ThemedText
                            style={{
                              fontSize: 14,
                              fontWeight: "700",
                              color: isDarkMode ? "#64748B" : "#94A3B8",
                            }}
                          >
                            vs
                          </ThemedText>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <ThemedText
                            style={{
                              fontSize: 11,
                              color: isDarkMode ? "#9CA3AF" : "#64748B",
                            }}
                          >
                            DLS Par Score:
                          </ThemedText>
                          <ThemedText
                            style={{
                              fontSize: 22,
                              fontWeight: "900",
                              color: "#3B82F6",
                            }}
                          >
                            {currentParScore}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Outcome Banner */}
                      <View
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          backgroundColor:
                            dlsAbandonedResult.winnerTeam === "team2"
                              ? "rgba(16, 185, 129, 0.15)"
                              : dlsAbandonedResult.winnerTeam === "team1"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                          borderWidth: 1,
                          borderColor:
                            dlsAbandonedResult.winnerTeam === "team2"
                              ? "#10B981"
                              : dlsAbandonedResult.winnerTeam === "team1"
                              ? "#EF4444"
                              : "#F59E0B",
                          marginTop: 4,
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 13,
                            fontWeight: "800",
                            textAlign: "center",
                            color:
                              dlsAbandonedResult.winnerTeam === "team2"
                                ? "#10B981"
                                : dlsAbandonedResult.winnerTeam === "team1"
                                ? "#EF4444"
                                : "#F59E0B",
                          }}
                        >
                          🏆 {dlsAbandonedResult.summaryText}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Minimum Overs Notice */}
                    {normalizeOversToDecimal(team2CurrentOvers) < 5 && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 10,
                          borderRadius: 10,
                          backgroundColor: isDarkMode
                            ? "rgba(245, 158, 11, 0.15)"
                            : "#FEF3C7",
                          marginTop: 10,
                        }}
                      >
                        <Ionicons
                          name="warning-outline"
                          size={18}
                          color="#F59E0B"
                          style={{ marginRight: 8 }}
                        />
                        <ThemedText
                          style={{
                            flex: 1,
                            fontSize: 11,
                            color: isDarkMode ? "#FBBF24" : "#B45309",
                          }}
                        >
                          Standard regulations require at least 5 overs in T20 (or 20 in
                          ODI) for a valid DLS result. If play cannot resume before
                          that, the match is classified as "No Result".
                        </ThemedText>
                      </View>
                    )}

                    {/* Conclude Button */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleConcludeWithDls}
                      style={[
                        styles.primaryActionBtn,
                        { backgroundColor: COLORS.secondary, marginTop: 14 },
                      ]}
                    >
                      <Ionicons
                        name="trophy"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText
                        style={{
                          color: "#FFFFFF",
                          fontSize: 14,
                          fontWeight: "800",
                        }}
                      >
                        Conclude Match with DLS Result
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handlebar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
  },
  contextCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  oversInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  resultCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 14,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});

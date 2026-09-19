import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
  SafeAreaView,
  Alert,
} from "react-native";
import { Check, ArrowRight, ArrowLeft } from "lucide-react-native";
import PitchMap from "./PitchMap";
import WagonWheel from "./WagonWheel";
import { COLORS } from "@/theme/colors";

export default function BallTrackerModal({
  visible,
  onClose,
  onConfirm,
  onSkip,
  ballContext = {},
  isWagonWheelEnabled = true,
  isPitchMapEnabled = true,
}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const C = isDarkMode ? COLORS.dark : COLORS.light;

  const ballTypeStr = String(ballContext?.ballType || "").toLowerCase();
  const runTypeStr = String(ballContext?.runType || "").toLowerCase();
  const dismissalTypeStr = String(
    ballContext?.dismissalType ||
    ballContext?.dismissalInfo?.dismissalType ||
    ""
  ).toLowerCase();

  const isMankaded =
    Boolean(ballContext?.isMankaded) ||
    ballTypeStr === "mankaded" ||
    dismissalTypeStr === "mankaded";
  const isRetired =
    Boolean(ballContext?.dontCountTheball) ||
    dismissalTypeStr.includes("retire");
  const isTimedOut = dismissalTypeStr === "timed out";
  const isNoDelivery =
    Boolean(ballContext?.isNoDelivery) ||
    isMankaded ||
    isRetired ||
    isTimedOut;

  const isBowled =
    Boolean(ballContext?.isBowled) || dismissalTypeStr === "bowled";
  const isLbw =
    Boolean(ballContext?.isLbw) || dismissalTypeStr === "lbw";
  const isStumped =
    Boolean(ballContext?.isStumped) || dismissalTypeStr === "stumped";
  const isWide =
    Boolean(ballContext?.isWide) || ballTypeStr === "wide" || runTypeStr === "wide";
  const isByeOrLegBye =
    runTypeStr === "bye" ||
    runTypeStr === "leg-bye" ||
    ballTypeStr === "bye" ||
    ballTypeStr === "leg-bye";
  const isNoBatShot =
    Boolean(ballContext?.isNoBatShot) ||
    isNoDelivery ||
    isBowled ||
    isLbw ||
    isStumped ||
    isWide ||
    isByeOrLegBye;

  const effectivePitchMapEnabled = isNoDelivery ? false : isPitchMapEnabled;
  const effectiveWagonWheelEnabled = isNoBatShot ? false : isWagonWheelEnabled;

  // Determine initial active tab
  const [activeTab, setActiveTab] = useState(
    effectivePitchMapEnabled ? "pitch" : effectiveWagonWheelEnabled ? "wagon" : "pitch"
  );
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [selectedShot, setSelectedShot] = useState(null);

  useEffect(() => {
    if (visible) {
      // Auto-skip if neither tracker is applicable for this ball
      if (!effectivePitchMapEnabled && !effectiveWagonWheelEnabled) {
        onSkip ? onSkip() : onClose?.();
        return;
      }
      // Reset state for new ball
      setSelectedPitch(null);
      setSelectedShot(null);
      setActiveTab(
        effectivePitchMapEnabled ? "pitch" : effectiveWagonWheelEnabled ? "wagon" : "pitch"
      );
    }
  }, [visible, effectivePitchMapEnabled, effectiveWagonWheelEnabled]);

  const {
    runs = 0,
    isBoundary = false,
    isWicket = false,
    strikerName = "Striker",
    bowlerName = "Bowler",
    ballType = "ball",
    runType = "bat",
    strikerStance = "RHB",
    battingStyle = "",
    isBoxCricket = false,
    matchType = "",
  } = ballContext;

  const isBox = Boolean(isBoxCricket || matchType === "box" || ballContext?.matchType === "box");
  const resolvedStance = (strikerStance || battingStyle || "RHB")
    .toUpperCase()
    .includes("LEFT")
    ? "LHB"
    : strikerStance === "LHB"
    ? "LHB"
    : "RHB";

  const getBallBadgeText = () => {
    if (isWicket) return "WICKET";
    if (ballType === "wide") return `Wide + ${runs} Run(s)`;
    if (ballType === "noBall") return `No Ball + ${runs} Run(s)`;
    if (runType === "bye") return `Bye + ${runs}`;
    if (runType === "leg-bye") return `Leg Bye + ${runs}`;
    if (runs === 4) return "FOUR (4)";
    if (runs === 6) return "SIX (6)";
    if (runs === 0) return "DOT BALL";
    return `${runs} RUN${runs > 1 ? "S" : ""}`;
  };

  const handleNextToWagon = () => {
    if (bothEnabled && !selectedPitch) {
      Alert.alert("Pitch Spot Required", "Please select where the ball pitched before continuing.");
      return;
    }
    setActiveTab("wagon");
  };

  const handleBackToPitch = () => {
    setActiveTab("pitch");
  };

  const handleDone = () => {
    if (effectivePitchMapEnabled && !selectedPitch) {
      Alert.alert("Pitch Spot Required", "Please select where the ball pitched.");
      return;
    }
    if (effectiveWagonWheelEnabled && !selectedShot) {
      Alert.alert("Shot Zone Required", "Please select the shot zone on the wagon wheel.");
      return;
    }

    onConfirm({
      pitchMap: selectedPitch,
      wagonWheel: selectedShot,
    });
  };

  const handleSkipTracking = () => {
    onSkip?.();
  };

  const bothEnabled = effectivePitchMapEnabled && effectiveWagonWheelEnabled;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {}}
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
            <View style={styles.headerLeft}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.ballBadge,
                    {
                      backgroundColor: isWicket
                        ? "#EF4444"
                        : runs >= 4
                        ? "#10B981"
                        : "#3B82F6",
                    },
                  ]}
                >
                  <Text style={styles.ballBadgeText}>{getBallBadgeText()}</Text>
                </View>
                <Text
                  style={[
                    styles.headerStriker,
                    { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
                  ]}
                  numberOfLines={1}
                >
                  🏏 {strikerName}
                </Text>
              </View>
              <Text
                style={[
                  styles.headerBowler,
                  { color: isDarkMode ? "#94A3B8" : "#64748B" },
                ]}
              >
                Bowler: {bowlerName}
              </Text>
            </View>
          </View>

          {/* Tab Switcher (if both enabled) */}
          {bothEnabled && (
            <View>
              <View style={styles.stepHeader}>
                <Text
                  style={[
                    styles.stepHeaderText,
                    { color: isDarkMode ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  {activeTab === "pitch"
                    ? "Step 1 of 2: Mark Ball Pitch Landing"
                    : "Step 2 of 2: Mark Shot Direction & Zone"}
                </Text>
              </View>

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
                    🎯 Pitch Map {selectedPitch ? "✓" : ""}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === "wagon" && styles.tabButtonActive,
                    activeTab === "wagon" && {
                      backgroundColor: isDarkMode ? "#334155" : "#FFFFFF",
                    },
                  ]}
                  onPress={() => {
                    if (bothEnabled && !selectedPitch) {
                      Alert.alert("Pitch Spot Required", "Please select where the ball pitched before going to Wagon Wheel.");
                      return;
                    }
                    setActiveTab("wagon");
                  }}
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
                    🏏 Wagon Wheel {selectedShot ? "✓" : ""}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Interactive Component Container */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "pitch" && effectivePitchMapEnabled && (
              <PitchMap
                width={310}
                height={360}
                selectedPitch={selectedPitch}
                onSelectPitch={(data) => setSelectedPitch(data)}
                isDarkMode={isDarkMode}
                batterStance={resolvedStance}
              />
            )}

            {activeTab === "wagon" && effectiveWagonWheelEnabled && (
              <WagonWheel
                size={280}
                selectedShot={selectedShot}
                onSelectShot={(data) => setSelectedShot(data)}
                isDarkMode={isDarkMode}
                showZoneStats={false}
                runs={runs}
                isBoundary={isBoundary}
                isWicket={isWicket}
                isBoxCricket={isBox}
              />
            )}
          </ScrollView>

          {/* Action Footer */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: isDarkMode ? "#1E293B" : "#E2E8F0",
                backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
              },
            ]}
          >
            {bothEnabled && activeTab === "pitch" ? (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.nextBtn,
                  !selectedPitch && {
                    opacity: 0.5,
                    backgroundColor: isDarkMode ? "#334155" : "#94A3B8",
                  },
                ]}
                disabled={!selectedPitch}
                onPress={handleNextToWagon}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>
                  {selectedPitch ? "Next: Wagon Wheel" : "Select Pitch Spot"}
                </Text>
                <ArrowRight size={17} color="#FFFFFF" />
              </TouchableOpacity>
            ) : bothEnabled && activeTab === "wagon" ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.backBtn,
                    { borderColor: isDarkMode ? "#334155" : "#E2E8F0" },
                  ]}
                  onPress={handleBackToPitch}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                  <Text
                    style={[
                      styles.cancelBtnText,
                      { color: isDarkMode ? "#94A3B8" : "#64748B" },
                    ]}
                  >
                    Pitch
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.doneBtn,
                    !selectedShot && {
                      opacity: 0.5,
                      backgroundColor: isDarkMode ? "#334155" : "#94A3B8",
                    },
                  ]}
                  disabled={!selectedShot}
                  onPress={handleDone}
                  activeOpacity={0.8}
                >
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.doneBtnText}>
                    {selectedShot ? "Done & Score" : "Select Shot Zone"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.doneBtn,
                  ((activeTab === "pitch" && !selectedPitch) ||
                    (activeTab === "wagon" && !selectedShot)) && {
                    opacity: 0.5,
                    backgroundColor: isDarkMode ? "#334155" : "#94A3B8",
                  },
                ]}
                disabled={
                  (activeTab === "pitch" && !selectedPitch) ||
                  (activeTab === "wagon" && !selectedShot)
                }
                onPress={handleDone}
                activeOpacity={0.8}
              >
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.doneBtnText}>
                  {activeTab === "pitch"
                    ? selectedPitch
                      ? "Done & Score"
                      : "Select Pitch Spot"
                    : selectedShot
                    ? "Done & Score"
                    : "Select Shot Zone"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    maxHeight: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  ballBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ballBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  headerStriker: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  headerBowler: {
    fontSize: 12,
    fontWeight: "500",
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
    paddingVertical: 8,
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
  scrollContent: {
    flexGrow: 0,
    paddingVertical: 8,
  },
  scrollContentContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  cancelBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  skipBtn: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
    paddingHorizontal: 14,
  },
  skipBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  doneBtn: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  nextBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  backBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  stepHeader: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 2,
  },
  stepHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

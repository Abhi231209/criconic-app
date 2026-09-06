import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useColorScheme,
  Dimensions,
  Alert,
  Switch,
  StyleSheet,
} from "react-native";
import {
  ChevronRight,
  X,
  User,
  Users,
  Target,
  Zap,
  Shield,
  AlertTriangle,
  Heart,
  LogOut,
  ArrowLeft,
  Check,
  Search,
} from "lucide-react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import ThemedText from "../custom/ThemedText";
import { COLORS } from "@/theme/colors";

const { height } = Dimensions.get("window");

// Cricket Icon wrapper using MaterialCommunityIcons
const CricketIcon = ({ size = 20, color, ...props }) => (
  <MaterialCommunityIcons name="cricket" size={size} color={color} {...props} />
);

// Safe icon renderer
const SafeIcon = ({ icon: Icon, size = 20, color, ...props }) => {
  if (!Icon) return <MaterialCommunityIcons name="cricket" size={size} color={color} />;
  try {
    if (typeof Icon === "function") {
      return <Icon size={size} color={color} {...props} />;
    }
    return <MaterialCommunityIcons name="cricket" size={size} color={color} />;
  } catch {
    return <MaterialCommunityIcons name="cricket" size={size} color={color} />;
  }
};

// Cricket logo matching earlier design with safe RN styling
const CricketLogo = ({ size = 32, isDarkMode }) => {
  const stumpColor = isDarkMode ? COLORS.dark.text : COLORS.light.text;
  return (
    <View style={[styles.logoContainer, { width: size, height: size }]}>
      <View style={styles.logoInner}>
        <MaterialCommunityIcons
          name="cricket"
          size={size * 0.55}
          color={isDarkMode ? COLORS.secondary : COLORS.primary}
        />
        <View style={[styles.logoStumps, { borderColor: stumpColor }]}>
          <View style={[styles.logoStump, { backgroundColor: stumpColor }]} />
          <View style={[styles.logoStump, { backgroundColor: stumpColor }]} />
          <View style={[styles.logoStump, { backgroundColor: stumpColor }]} />
        </View>
      </View>
    </View>
  );
};

// Reusable Modal Header
const ModalHeader = ({ title, onClose, onBack = null, isDarkMode, showLogo = true }) => {
  const textColor = isDarkMode ? COLORS.dark.text : COLORS.light.text;
  return (
    <View style={styles.modalHeader}>
      <View style={styles.headerLeft}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 8, padding: 4 }} activeOpacity={0.7}>
            <ArrowLeft size={22} color={textColor} />
          </TouchableOpacity>
        )}
        {showLogo && <CricketLogo size={32} isDarkMode={isDarkMode} />}
        <Text
          style={[
            styles.modalTitle,
            isDarkMode ? styles.darkText : styles.lightText,
          ]}
        >
          {title}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onClose}
        style={[
          styles.closeButton,
          isDarkMode ? styles.darkCloseButton : styles.lightCloseButton,
        ]}
        activeOpacity={0.7}
      >
        <X size={22} color={textColor} />
      </TouchableOpacity>
    </View>
  );
};

// Out option item with left colored border (Direct TouchableOpacity for instant responsive taps)
const OutOptionItem = ({
  title,
  subtitle,
  icon,
  onPress,
  isDarkMode,
  variant = "default",
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case "danger":
        return styles.dangerItem;
      case "warning":
        return styles.warningItem;
      case "success":
        return styles.successItem;
      default:
        return isDarkMode ? styles.darkItem : styles.lightItem;
    }
  };
  const getIconColor = () => {
    switch (variant) {
      case "danger":
        return COLORS.danger;
      case "warning":
        return COLORS.warning;
      case "success":
        return COLORS.success;
      default:
        return isDarkMode ? COLORS.dark.text : COLORS.primary;
    }
  };
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        console.log(`[OUT-OPTIONS] >>> User tapped out option: "${title}" <<<`);
        onPress?.();
      }}
      style={[styles.outOptionItem, getVariantStyle()]}
    >
      <View style={styles.outOptionIcon}>
        <SafeIcon icon={icon} size={24} color={getIconColor()} />
      </View>
      <View style={styles.outOptionContent}>
        <ThemedText
          style={[
            styles.outOptionTitle,
            isDarkMode ? styles.darkText : styles.lightText,
          ]}
        >
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText
            style={[
              styles.outOptionSubtitle,
              isDarkMode
                ? styles.darkTextSecondary
                : styles.lightTextSecondary,
            ]}
          >
            {subtitle}
          </ThemedText>
        )}
      </View>
      <ChevronRight
        size={20}
        color={
          isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary
        }
      />
    </TouchableOpacity>
  );
};

export default function OutOptions({
  visible,
  onClose,
  handelBall,
  onWicket = () => {},
  bowler,
  batsmans = {},
  bowlingTeam = {},
  battingTeam = {},
}) {
  const isControlled = visible !== undefined;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const theme = isDarkMode ? COLORS.dark : COLORS.light;

  // Modals visibility state
  const [mainModalVisible, setMainModalVisible] = useState(isControlled ? visible : false);
  const [caughtModalVisible, setCaughtModalVisible] = useState(false);
  const [stumpedModalVisible, setStumpedModalVisible] = useState(false);
  const [runOutModalVisible, setRunOutModalVisible] = useState(false);
  const [retiredModalVisible, setRetiredModalVisible] = useState(false);

  useEffect(() => {
    if (isControlled) {
      setMainModalVisible(visible);
      if (!visible) {
        setCaughtModalVisible(false);
        setStumpedModalVisible(false);
        setRunOutModalVisible(false);
        setRetiredModalVisible(false);
      }
    }
  }, [visible, isControlled]);

  const handleCloseMain = () => {
    setMainModalVisible(false);
    onClose?.();
  };

  // Search filter
  const [fielderSearch, setFielderSearch] = useState("");

  // Run Out form state
  const [selectedRunOutBatter, setSelectedRunOutBatter] = useState(null);
  const [selectedFielderOne, setSelectedFielderOne] = useState(null);
  const [selectedFielderTwo, setSelectedFielderTwo] = useState(null);
  const [deliveryType, setDeliveryType] = useState("ball");
  const [runSelected, setRunSelected] = useState(0);
  const [customRunInput, setCustomRunInput] = useState("");
  const [runsType, setRunsType] = useState("bat");

  // Retired form state
  const [retiredType, setRetiredType] = useState("Retired"); // "Retired" | "Retired Hurt" | "Retired Out"
  const [selectedRetiredBatter, setSelectedRetiredBatter] = useState(null);
  const [dontCountBall, setDontCountBall] = useState(true);

  // Helpers to extract player info safely
  const getPlayerName = (p, defaultIdx) => {
    if (!p) return `Player ${defaultIdx + 1}`;
    if (typeof p === "string") return p;
    return p.username || p.name || p.playerName || `Player ${defaultIdx + 1}`;
  };

  const getPlayerId = (p, defaultIdx) => {
    if (!p) return String(defaultIdx);
    if (typeof p === "string") return p;
    return p.playerId || p._id || p.id || String(defaultIdx);
  };

  const bowlerId = bowler?.playerId || bowler?.id || bowler?._id || bowler;
  const bowlerName = bowler?.name || bowler?.username || "Bowler";

  // Build a reliable, non-empty list of fielders
  const fielders = useMemo(() => {
    const rawList = Array.isArray(bowlingTeam?.players) ? bowlingTeam.players : [];
    const uniqueMap = new Map();

    rawList.forEach((p, idx) => {
      const id = getPlayerId(p, idx);
      uniqueMap.set(String(id), p);
    });

    if (bowlerId && !uniqueMap.has(String(bowlerId))) {
      uniqueMap.set(String(bowlerId), {
        id: bowlerId,
        playerId: bowlerId,
        name: bowlerName,
        username: bowlerName,
      });
    }

    return Array.from(uniqueMap.values());
  }, [bowlingTeam, bowlerId, bowlerName]);

  const filteredFielders = useMemo(() => {
    if (!fielderSearch.trim()) return fielders;
    return fielders.filter((p) => {
      const name = getPlayerName(p, 0).toLowerCase();
      return name.includes(fielderSearch.toLowerCase().trim());
    });
  }, [fielders, fielderSearch]);

  const firstBatter = batsmans?.firstBatter;
  const secondBatter = batsmans?.secondBatter;

  // ─── SEQUENTIAL MODAL TRANSITIONS (CLOSE SHEET FIRST, RE-OPEN ON CANCEL) ───

  const openSubModal = (modalName) => {
    console.log(`[OUT-OPTIONS] Closing main options sheet to present: ${modalName}`);
    setMainModalVisible(false);
    setTimeout(() => {
      console.log(`[OUT-OPTIONS] Presenting ${modalName} modal now`);
      if (modalName === "CAUGHT") {
        setFielderSearch("");
        setCaughtModalVisible(true);
      } else if (modalName === "STUMPED") {
        setFielderSearch("");
        setStumpedModalVisible(true);
      } else if (modalName === "RUN_OUT") {
        setSelectedRunOutBatter(firstBatter || null);
        setSelectedFielderOne(null);
        setSelectedFielderTwo(null);
        setDeliveryType("ball");
        setRunSelected(0);
        setCustomRunInput("");
        setRunsType("bat");
        setRunOutModalVisible(true);
      } else if (modalName === "RETIRED") {
        setSelectedRetiredBatter(firstBatter || null);
        setDontCountBall(true);
        setRetiredModalVisible(true);
      }
    }, 280);
  };

  const closeSubModalAndReopenMain = (modalName) => {
    console.log(`[OUT-OPTIONS] ${modalName} modal closed/cancelled. Re-opening main out options sheet`);
    if (modalName === "CAUGHT") setCaughtModalVisible(false);
    if (modalName === "STUMPED") setStumpedModalVisible(false);
    if (modalName === "RUN_OUT") setRunOutModalVisible(false);
    if (modalName === "RETIRED") setRetiredModalVisible(false);

    setTimeout(() => {
      setMainModalVisible(true);
    }, 280);
  };

  // ─── DISMISSAL ACTIONS ──────────────────────────────────────────────────

  const handleDirectOut = (dismissalType, extraInfo = {}, callSelectStrike = false) => {
    console.log("[OUT-OPTIONS] Direct out triggered:", dismissalType);
    setMainModalVisible(false);
    onClose?.();
    handelBall({
      isWicket: true,
      ballType: "ball",
      dismissalInfo: {
        dismissalType,
        bowler: bowlerId,
        ...extraInfo,
      },
    });
    onWicket(1, callSelectStrike);
  };

  const handleCaughtSubmit = (player) => {
    const fielderId = player?.playerId || player?.id || player?._id || player;
    console.log("[OUT-OPTIONS] Caught submitted with fielder:", fielderId);
    setCaughtModalVisible(false);
    onClose?.();
    handelBall({
      isWicket: true,
      ballType: "ball",
      dismissalInfo: {
        dismissalType: "Caught",
        caughtBy: fielderId,
        bowler: bowlerId,
      },
    });
    onWicket(1, true); // strike selection prompt
  };

  const handleStumpedSubmit = (player) => {
    const keeperId = player?.playerId || player?.id || player?._id || player;
    console.log("[OUT-OPTIONS] Stumped submitted with keeper:", keeperId);
    setStumpedModalVisible(false);
    onClose?.();
    handelBall({
      isWicket: true,
      ballType: "ball",
      dismissalInfo: {
        dismissalType: "Stumped",
        stumpBy: keeperId,
        bowler: bowlerId,
      },
    });
    onWicket(1, false);
  };

  const handleRunOutSubmit = () => {
    if (!selectedRunOutBatter) {
      Alert.alert("Selection Required", "Please select which batsman was run out.");
      return;
    }
    if (!selectedFielderOne) {
      Alert.alert("Selection Required", "Please select Fielder 1 (primary thrower / direct hit).");
      return;
    }

    setRunOutModalVisible(false);
    onClose?.();

    const runsVal = customRunInput !== "" ? parseInt(customRunInput, 10) || 0 : runSelected;
    const isExtraBall = deliveryType === "wide" || deliveryType === "no-ball";
    const outBatterId = selectedRunOutBatter?.playerId || selectedRunOutBatter?.id || selectedRunOutBatter?._id;

    console.log("[OUT-OPTIONS] Run Out submitted:", { outBatterId, runsVal, deliveryType });

    const ballObject = {
      isWicket: true,
      runs: runsVal,
      runType: deliveryType === "no-ball" ? runsType : deliveryType === "bye" ? "bye" : deliveryType === "leg-bye" ? "leg-bye" : "bat",
      ballType: isExtraBall ? deliveryType : "ball",
      actionBatsmen: outBatterId,
      dismissalInfo: {
        dismissalType: "run-out",
        runOutfielderOne: selectedFielderOne,
        ...(selectedFielderTwo ? { runOutfielderTwo: selectedFielderTwo } : {}),
      },
    };

    handelBall(ballObject);
    onWicket(1, true, { outBatman: outBatterId });
  };

  const handleMankaded = () => {
    const nonStriker = firstBatter?.isStrikeEnd ? secondBatter : firstBatter;
    const nonStrikerId = nonStriker?.playerId || nonStriker?.id || nonStriker?._id;

    console.log("[OUT-OPTIONS] Mankaded submitted for non-striker:", nonStrikerId);
    setMainModalVisible(false);
    onClose?.();
    handelBall({
      isWicket: true,
      actionBatsmen: nonStrikerId,
      ballType: "mankaded",
      dismissalInfo: {
        dismissalType: "Mankaded",
        runOutfielderOne: bowlerId,
      },
    });
    onWicket(2, false, { outBatman: nonStrikerId });
  };

  const handleRetiredSubmit = () => {
    if (!selectedRetiredBatter) {
      Alert.alert("Selection Required", "Please select which batsman is retiring.");
      return;
    }

    setRetiredModalVisible(false);
    onClose?.();

    const canBatAgain = retiredType !== "Retired Out";
    const outBatterId = selectedRetiredBatter?.playerId || selectedRetiredBatter?.id || selectedRetiredBatter?._id;

    console.log("[OUT-OPTIONS] Retirement submitted:", { retiredType, outBatterId, canBatAgain });

    handelBall({
      isWicket: true,
      ballType: "ball",
      dontCountTheball: dontCountBall,
      canBatAgain,
      actionBatsmen: outBatterId,
      dismissalInfo: {
        dismissalType: retiredType,
      },
    });

    onWicket(1, canBatAgain, { outBatman: outBatterId });
  };

  // ─── OUT TYPES LIST ──────────────────────────────────────────────────

  const outTypes = [
    {
      id: "bowled",
      title: "Bowled",
      icon: CricketIcon,
      action: () => handleDirectOut("Bowled", {}),
    },
    {
      id: "caught",
      title: "Caught",
      subtitle: "Select Fielder",
      icon: Shield,
      variant: "success",
      action: () => {
        console.log("[OUT-OPTIONS] Caught selected!");
        openSubModal("CAUGHT");
      },
    },
    {
      id: "stumped",
      title: "Stumped",
      subtitle: "Select Wicketkeeper",
      icon: Zap,
      variant: "warning",
      action: () => {
        console.log("[OUT-OPTIONS] Stumped selected!");
        openSubModal("STUMPED");
      },
    },
    {
      id: "caughtBowled",
      title: "Caught & Bowled",
      subtitle: "Bowler Took Catch",
      icon: Shield,
      variant: "success",
      action: () => handleDirectOut("Caught and bowled", { caughtBy: bowlerId }, true),
    },
    {
      id: "runOut",
      title: "Run Out",
      subtitle: "Fielders, runs & delivery options",
      icon: Target,
      variant: "warning",
      action: () => {
        console.log("[OUT-OPTIONS] Run Out selected!");
        openSubModal("RUN_OUT");
      },
    },
    {
      id: "mankaded",
      title: "Mankaded",
      subtitle: "Run Out at non-striker end",
      icon: AlertTriangle,
      variant: "danger",
      action: handleMankaded,
    },
    {
      id: "lbw",
      title: "LBW",
      icon: CricketIcon,
      action: () => handleDirectOut("lbw", {}),
    },
    {
      id: "hitWicket",
      title: "Hit Wicket",
      icon: CricketIcon,
      variant: "danger",
      action: () => handleDirectOut("Hit Wicket", {}),
    },
    {
      id: "retired",
      title: "Retired",
      subtitle: "Can Bat Again",
      icon: LogOut,
      variant: "warning",
      action: () => {
        console.log("[OUT-OPTIONS] Retired selected!");
        setRetiredType("Retired");
        openSubModal("RETIRED");
      },
    },
    {
      id: "retiredHurt",
      title: "Retired Hurt",
      subtitle: "Can Bat Again",
      icon: Heart,
      variant: "warning",
      action: () => {
        console.log("[OUT-OPTIONS] Retired Hurt selected!");
        setRetiredType("Retired Hurt");
        openSubModal("RETIRED");
      },
    },
    {
      id: "retiredOut",
      title: "Retired Out",
      subtitle: "Cannot Bat Again",
      icon: LogOut,
      variant: "danger",
      action: () => {
        console.log("[OUT-OPTIONS] Retired Out selected!");
        setRetiredType("Retired Out");
        openSubModal("RETIRED");
      },
    },
    {
      id: "hitTwice",
      title: "Hit Ball Twice",
      icon: CricketIcon,
      action: () => handleDirectOut("Hit the ball twice", {}),
    },
  ];

  return (
    <>
      {/* If used uncontrolled, render trigger button */}
      {!isControlled && (
        <TouchableOpacity
          style={[
            styles.triggerButton,
            isDarkMode ? styles.buttonDark : styles.buttonLight,
          ]}
          activeOpacity={0.7}
          onPress={() => {
            console.log("[OUT-OPTIONS] Pressed OUT key! Opening main modal");
            setMainModalVisible(true);
          }}
        >
          <ThemedText
            style={[styles.triggerText, isDarkMode ? styles.textDark : styles.textLight]}
          >
            OUT
          </ThemedText>
        </TouchableOpacity>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          1. MAIN DISMISSAL OPTIONS MODAL / SHEET
         ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={mainModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseMain}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.mainModal, isDarkMode ? styles.darkModal : styles.lightModal]}>
            <ModalHeader
              title="Select Dismissal Type"
              onClose={handleCloseMain}
              isDarkMode={isDarkMode}
            />
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.outOptionsGrid}>
                {outTypes.map((outType) => (
                  <OutOptionItem
                    key={outType.id}
                    title={outType.title}
                    subtitle={outType.subtitle}
                    icon={outType.icon}
                    onPress={outType.action}
                    isDarkMode={isDarkMode}
                    variant={outType.variant}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          2. CAUGHT MODAL (Select Fielder)
         ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={caughtModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => closeSubModalAndReopenMain("CAUGHT")}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.mainModal, isDarkMode ? styles.darkModal : styles.lightModal]}>
            <ModalHeader
              title="Caught - Select Fielder"
              onClose={() => closeSubModalAndReopenMain("CAUGHT")}
              onBack={() => closeSubModalAndReopenMain("CAUGHT")}
              isDarkMode={isDarkMode}
            />
            <View style={[styles.searchBox, { backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9", borderColor: isDarkMode ? "#334155" : "#E2E8F0" }]}>
              <Search size={18} color={theme.textSecondary} />
              <TextInput
                placeholder="Search fielder by name..."
                placeholderTextColor={theme.textSecondary}
                value={fielderSearch}
                onChangeText={setFielderSearch}
                style={[styles.searchInput, { color: isDarkMode ? "#F1F5F9" : "#1E293B" }]}
              />
            </View>
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
              {filteredFielders.length === 0 ? (
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No fielder found in squad.
                </ThemedText>
              ) : (
                filteredFielders.map((player, idx) => {
                  const name = getPlayerName(player, idx);
                  const pId = getPlayerId(player, idx);
                  const isCurrentBowler = String(pId) === String(bowlerId);

                  return (
                    <TouchableOpacity
                      key={pId || idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log("[OUT-OPTIONS] Fielder selected for catch:", name, pId);
                        handleCaughtSubmit(player);
                      }}
                      style={[styles.outOptionItem, isDarkMode ? styles.darkItem : styles.lightItem]}
                    >
                      <View style={styles.playerAvatar}>
                        <User size={18} color="#ffffff" />
                      </View>
                      <View style={styles.outOptionContent}>
                        <ThemedText style={[styles.outOptionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                          {name}
                        </ThemedText>
                        {isCurrentBowler && (
                          <ThemedText style={{ fontSize: 12, color: COLORS.warning, fontWeight: "600" }}>
                            Bowler
                          </ThemedText>
                        )}
                      </View>
                      <ChevronRight size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          3. STUMPED MODAL (Select Keeper)
         ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={stumpedModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => closeSubModalAndReopenMain("STUMPED")}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.mainModal, isDarkMode ? styles.darkModal : styles.lightModal]}>
            <ModalHeader
              title="Stumped - Select Keeper"
              onClose={() => closeSubModalAndReopenMain("STUMPED")}
              onBack={() => closeSubModalAndReopenMain("STUMPED")}
              isDarkMode={isDarkMode}
            />
            <View style={[styles.searchBox, { backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9", borderColor: isDarkMode ? "#334155" : "#E2E8F0" }]}>
              <Search size={18} color={theme.textSecondary} />
              <TextInput
                placeholder="Search keeper by name..."
                placeholderTextColor={theme.textSecondary}
                value={fielderSearch}
                onChangeText={setFielderSearch}
                style={[styles.searchInput, { color: isDarkMode ? "#F1F5F9" : "#1E293B" }]}
              />
            </View>
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
              {filteredFielders.length === 0 ? (
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No fielder found in squad.
                </ThemedText>
              ) : (
                filteredFielders.map((player, idx) => {
                  const name = getPlayerName(player, idx);
                  const pId = getPlayerId(player, idx);

                  return (
                    <TouchableOpacity
                      key={pId || idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log("[OUT-OPTIONS] Keeper selected for stumped:", name, pId);
                        handleStumpedSubmit(player);
                      }}
                      style={[styles.outOptionItem, isDarkMode ? styles.darkItem : styles.lightItem]}
                    >
                      <View style={[styles.playerAvatar, { backgroundColor: COLORS.warning }]}>
                        <Zap size={18} color="#ffffff" />
                      </View>
                      <View style={styles.outOptionContent}>
                        <ThemedText style={[styles.outOptionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                          {name}
                        </ThemedText>
                      </View>
                      <ChevronRight size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          4. RUN OUT MODAL
         ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={runOutModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => closeSubModalAndReopenMain("RUN_OUT")}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.mainModal, isDarkMode ? styles.darkModal : styles.lightModal]}>
            <ModalHeader
              title="Run Out Details"
              onClose={() => closeSubModalAndReopenMain("RUN_OUT")}
              onBack={() => closeSubModalAndReopenMain("RUN_OUT")}
              isDarkMode={isDarkMode}
            />
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. Batsman Out */}
              <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                1. Select Batsman Out *
              </ThemedText>
              <View style={styles.batterRow}>
                {[firstBatter, secondBatter].filter(Boolean).map((batter, idx) => {
                  const bId = batter?.playerId || batter?.id || batter?._id;
                  const isSelected = (selectedRunOutBatter?.playerId || selectedRunOutBatter?.id || selectedRunOutBatter?._id) === bId;
                  return (
                    <TouchableOpacity
                      key={bId || idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log("[OUT-OPTIONS] Selected run out batter:", batter?.name || bId);
                        setSelectedRunOutBatter(batter);
                      }}
                      style={[
                        styles.batterChoiceCard,
                        isSelected
                          ? { borderColor: COLORS.primary, backgroundColor: "rgba(220, 38, 38, 0.1)" }
                          : { borderColor: theme.border, backgroundColor: theme.card },
                      ]}
                    >
                      <ThemedText style={[styles.batterChoiceName, isSelected && { color: COLORS.primary, fontWeight: "700" }]}>
                        {batter?.name || batter?.username || `Batsman ${idx + 1}`}
                      </ThemedText>
                      {batter?.isStrikeEnd && (
                        <ThemedText style={{ fontSize: 11, color: COLORS.warning, marginTop: 2 }}>
                          (Striker)
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2. Fielder 1 (Mandatory) */}
              <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText, { marginTop: 16 }]}>
                2. Fielder 1 (Thrower / Direct Hit) *
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                <View style={styles.chipRow}>
                  {fielders.map((player, idx) => {
                    const name = getPlayerName(player, idx);
                    const pId = getPlayerId(player, idx);
                    const isSelected = selectedFielderOne === pId;
                    return (
                      <TouchableOpacity
                        key={pId || idx}
                        activeOpacity={0.7}
                        onPress={() => {
                          console.log("[OUT-OPTIONS] Fielder 1 selected:", name, pId);
                          setSelectedFielderOne(isSelected ? null : pId);
                        }}
                        style={[
                          styles.chip,
                          isSelected
                            ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                            : { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                        ]}
                      >
                        <ThemedText style={{ color: isSelected ? "#ffffff" : theme.text, fontSize: 13, fontWeight: isSelected ? "700" : "500" }}>
                          {name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* 3. Fielder 2 (Optional) */}
              <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText, { marginTop: 16 }]}>
                3. Fielder 2 (Catcher / Assisted, Optional)
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                <View style={styles.chipRow}>
                  {fielders.map((player, idx) => {
                    const name = getPlayerName(player, idx);
                    const pId = getPlayerId(player, idx);
                    const isSelected = selectedFielderTwo === pId;
                    return (
                      <TouchableOpacity
                        key={pId || idx}
                        activeOpacity={0.7}
                        onPress={() => {
                          console.log("[OUT-OPTIONS] Fielder 2 selected:", name, pId);
                          setSelectedFielderTwo(isSelected ? null : pId);
                        }}
                        style={[
                          styles.chip,
                          isSelected
                            ? { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary }
                            : { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                        ]}
                      >
                        <ThemedText style={{ color: isSelected ? "#ffffff" : theme.text, fontSize: 13, fontWeight: isSelected ? "700" : "500" }}>
                          {name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* 4. Delivery Type */}
              <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText, { marginTop: 16 }]}>
                4. Delivery Type
              </ThemedText>
              <View style={styles.chipRow}>
                {[
                  { label: "Normal Ball", value: "ball" },
                  { label: "Wide", value: "wide" },
                  { label: "No Ball", value: "no-ball" },
                  { label: "Bye", value: "bye" },
                  { label: "Leg Bye", value: "leg-bye" },
                ].map((dt) => {
                  const isSelected = deliveryType === dt.value;
                  return (
                    <TouchableOpacity
                      key={dt.value}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log("[OUT-OPTIONS] Delivery type selected:", dt.value);
                        setDeliveryType(dt.value);
                      }}
                      style={[
                        styles.chip,
                        isSelected
                          ? { backgroundColor: COLORS.warning, borderColor: COLORS.warning }
                          : { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      ]}
                    >
                      <ThemedText style={{ color: isSelected ? "#ffffff" : theme.text, fontSize: 13, fontWeight: isSelected ? "700" : "500" }}>
                        {dt.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 5. Runs Completed */}
              <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText, { marginTop: 16 }]}>
                5. Runs Completed Before Dismissal
              </ThemedText>
              <View style={[styles.chipRow, { justifyContent: "space-between" }]}>
                {[0, 1, 2, 3, 4, 5, 6].map((num) => {
                  const isSelected = customRunInput === "" && runSelected === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log("[OUT-OPTIONS] Run completed selected:", num);
                        setRunSelected(num);
                        setCustomRunInput("");
                      }}
                      style={[
                        styles.runRoundChip,
                        isSelected
                          ? { backgroundColor: COLORS.blue, borderColor: COLORS.blue }
                          : { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      ]}
                    >
                      <ThemedText style={{ color: isSelected ? "#ffffff" : theme.text, fontSize: 15, fontWeight: "700" }}>
                        {num}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                placeholder="Or type custom runs (e.g. 7)"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={customRunInput}
                onChangeText={(val) => {
                  setCustomRunInput(val);
                  setRunSelected(null);
                }}
                style={[
                  styles.customInput,
                  {
                    backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9",
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
              />

              {/* 6. Run Source (for No Ball) */}
              {deliveryType === "no-ball" && (
                <View style={{ marginTop: 16 }}>
                  <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                    6. Runs Credited To
                  </ThemedText>
                  <View style={styles.chipRow}>
                    {["bat", "bye", "leg-bye"].map((type) => {
                      const isSelected = runsType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          activeOpacity={0.7}
                          onPress={() => {
                            console.log("[OUT-OPTIONS] Runs type selected:", type);
                            setRunsType(type);
                          }}
                          style={[
                            styles.chip,
                            isSelected
                              ? { backgroundColor: COLORS.blue, borderColor: COLORS.blue }
                              : { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                          ]}
                        >
                          <ThemedText style={{ color: isSelected ? "#ffffff" : theme.text, fontSize: 13, textTransform: "capitalize", fontWeight: isSelected ? "700" : "500" }}>
                            {type}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Submit Run Out */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRunOutSubmit}
                style={[styles.submitActionBtn, { backgroundColor: COLORS.primary, marginTop: 24 }]}
              >
                <ThemedText style={styles.submitActionBtnText}>Confirm Run Out</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          5. RETIRED MODAL
         ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={retiredModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => closeSubModalAndReopenMain("RETIRED")}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.mainModal, isDarkMode ? styles.darkModal : styles.lightModal]}>
            <ModalHeader
              title={`Batsman Retirement (${retiredType})`}
              onClose={() => closeSubModalAndReopenMain("RETIRED")}
              onBack={() => closeSubModalAndReopenMain("RETIRED")}
              isDarkMode={isDarkMode}
            />
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Retirement Type */}
              <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                Retirement Type
              </ThemedText>
              <View style={styles.chipRow}>
                {["Retired", "Retired Hurt", "Retired Out"].map((rt) => {
                  const isSelected = retiredType === rt;
                  return (
                    <TouchableOpacity
                      key={rt}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log("[OUT-OPTIONS] Retirement type selected:", rt);
                        setRetiredType(rt);
                      }}
                      style={[
                        styles.chip,
                        isSelected
                          ? { backgroundColor: COLORS.warning, borderColor: COLORS.warning }
                          : { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      ]}
                    >
                      <ThemedText style={{ color: isSelected ? "#ffffff" : theme.text, fontSize: 13, fontWeight: isSelected ? "700" : "500" }}>
                        {rt}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Select Batsman */}
              <ThemedText style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText, { marginTop: 16 }]}>
                Select Retiring Batsman *
              </ThemedText>
              <View style={styles.batterRow}>
                {[firstBatter, secondBatter].filter(Boolean).map((batter, idx) => {
                  const bId = batter?.playerId || batter?.id || batter?._id;
                  const isSelected = (selectedRetiredBatter?.playerId || selectedRetiredBatter?.id || selectedRetiredBatter?._id) === bId;
                  return (
                    <TouchableOpacity
                      key={bId || idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log("[OUT-OPTIONS] Selected retiring batter:", batter?.name || bId);
                        setSelectedRetiredBatter(batter);
                      }}
                      style={[
                        styles.batterChoiceCard,
                        isSelected
                          ? { borderColor: COLORS.warning, backgroundColor: "rgba(217, 119, 6, 0.1)" }
                          : { borderColor: theme.border, backgroundColor: theme.card },
                      ]}
                    >
                      <ThemedText style={[styles.batterChoiceName, isSelected && { color: COLORS.warning, fontWeight: "700" }]}>
                        {batter?.name || batter?.username || `Batsman ${idx + 1}`}
                      </ThemedText>
                      {batter?.isStrikeEnd && (
                        <ThemedText style={{ fontSize: 11, color: COLORS.primary, marginTop: 2 }}>
                          (Striker)
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Don't count ball */}
              <View style={[styles.switchCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <ThemedText style={[styles.switchTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                    Don't count this ball
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                    Delivery will not increase the bowler's over ball count.
                  </ThemedText>
                </View>
                <Switch
                  value={dontCountBall}
                  onValueChange={setDontCountBall}
                  trackColor={{ false: "#767577", true: COLORS.blue }}
                  thumbColor={dontCountBall ? "#ffffff" : "#f4f3f4"}
                />
              </View>

              {/* Confirm */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRetiredSubmit}
                style={[styles.submitActionBtn, { backgroundColor: COLORS.warning, marginTop: 24 }]}
              >
                <ThemedText style={styles.submitActionBtnText}>Confirm Retirement</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  buttonLight: {
    backgroundColor: "#dee2e6",
    borderColor: "#e5e7eb",
  },
  buttonDark: {
    backgroundColor: "#0a0f1c",
    borderColor: "#1a2333",
  },
  triggerText: {
    fontWeight: "700",
    fontSize: 16,
  },
  textLight: {
    color: "#111827",
  },
  textDark: {
    color: "#fff",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    marginRight: 10,
  },
  logoInner: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logoStumps: {
    position: "absolute",
    bottom: -2,
    flexDirection: "row",
    gap: 2,
  },
  logoStump: {
    width: 2,
    height: 7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  mainModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.82,
    width: "100%",
  },
  lightModal: { backgroundColor: COLORS.light.background },
  darkModal: { backgroundColor: COLORS.dark.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  closeButton: { padding: 6, borderRadius: 10 },
  darkCloseButton: { backgroundColor: "rgba(255,255,255,0.1)" },
  lightCloseButton: { backgroundColor: "rgba(0,0,0,0.05)" },
  scrollList: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  outOptionsGrid: { gap: 6, paddingBottom: 24 },
  outOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  lightItem: { backgroundColor: "#FFFFFF" },
  darkItem: { backgroundColor: COLORS.dark.card },
  dangerItem: {
    backgroundColor: "rgba(185, 28, 28, 0.08)",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  warningItem: {
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  successItem: {
    backgroundColor: "rgba(5, 150, 105, 0.08)",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  outOptionIcon: { marginRight: 12 },
  outOptionContent: { flex: 1 },
  outOptionTitle: { fontSize: 16, fontWeight: "600" },
  outOptionSubtitle: { fontSize: 12, marginTop: 2, opacity: 0.8 },
  lightText: { color: COLORS.light.text },
  darkText: { color: COLORS.dark.text },
  lightTextSecondary: { color: COLORS.light.textSecondary },
  darkTextSecondary: { color: COLORS.dark.textSecondary },

  // Sub-modal shared styles
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emptyText: { textAlign: "center", paddingVertical: 24, fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  batterRow: { flexDirection: "row", gap: 10 },
  batterChoiceCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  batterChoiceName: { fontSize: 14, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  runRoundChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 8,
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  switchTitle: { fontSize: 15, fontWeight: "600" },
  submitActionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitActionBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});

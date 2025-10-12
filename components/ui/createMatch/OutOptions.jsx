import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useColorScheme,
  Dimensions,
  Animated,
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
} from "lucide-react-native";
import ThemedText from "../custom/ThemedText";

const { width, height } = Dimensions.get("window");

// ✅ Custom fallback icons (instead of crashing)
const Cricket = ({ size = 20, color = "black" }) => (
  <Text style={{ fontSize: size - 4, color }}>🏏</Text>
);
const Wicket = ({ size = 20, color = "black" }) => (
  <Text style={{ fontSize: size - 4, color }}>🧱</Text>
);
const Square = ({ size = 20, color = "black" }) => (
  <Text style={{ fontSize: size - 4, color }}>⬛</Text>
);
const Circle = ({ size = 20, color = "black" }) => (
  <Text style={{ fontSize: size - 4, color }}>⚪</Text>
);

const COLORS = {
  primary: "#DC2626", // Cricket red
  secondary: "#16A34A", // Green
  accent: "#EA580C", // Orange
  danger: "#B91C1C",
  warning: "#D97706",
  success: "#059669",
  light: {
    background: "#FEFCE8",
    card: "#FFFFFF",
    text: "#1E293B",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    gradient: ["#FEFCE8", "#FEF3C7"],
  },
  dark: {
    background: "#0F172A",
    card: "#1E293B",
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    border: "#334155",
    gradient: ["#0F172A", "#1E293B"],
  },
};

// ✅ Safe icon renderer
const SafeIcon = ({ icon: Icon, size = 20, color, ...props }) => {
  if (!Icon) return <Text style={{ color, fontSize: size - 4 }}>🏏</Text>;
  try {
    return <Icon size={size} color={color} {...props} />;
  } catch {
    return <Text style={{ color, fontSize: size - 4 }}>🏏</Text>;
  }
};

// 🎯 Animated button
const AnimatedButton = ({ children, onPress, style }) => {
  const scaleValue = new Animated.Value(1);
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={0.8}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// 🎯 Cricket logo
const CricketLogo = ({ size = 40, isDarkMode }) => (
  <View style={[styles.logoContainer, { width: size, height: size }]}>
    <View style={styles.logoInner}>
      <Cricket
        size={size * 0.6}
        color={isDarkMode ? COLORS.secondary : COLORS.primary}
      />
      <View
        style={[
          styles.logoStumps,
          { borderColor: isDarkMode ? COLORS.dark.text : COLORS.light.text },
        ]}
      >
        <View style={styles.logoStump} />
        <View style={styles.logoStump} />
        <View style={styles.logoStump} />
      </View>
    </View>
  </View>
);

// 🎯 Modal header
const ModalHeader = ({ title, onClose, isDarkMode, showLogo = true }) => (
  <View style={styles.modalHeader}>
    <View style={styles.headerLeft}>
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
    >
      <X size={24} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
    </TouchableOpacity>
  </View>
);

// 🎯 Out option item
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
    <AnimatedButton>
      <TouchableOpacity
        style={[styles.outOptionItem, getVariantStyle()]}
        onPress={onPress}
        activeOpacity={0.8}
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
    </AnimatedButton>
  );
};

// 🎯 Main OutOptions component
export default function OutOptions({
  handelBall,
  onWicket = () => {},
  bowler,
  batsmans = {},
  bowlingTeam = {},
}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [modalVisible, setModalVisible] = useState(false);

  const outTypes = [
    {
      id: "bowled",
      title: "Bowled",
      icon: Cricket,
      action: () => handleOut("Bowled"),
    },
    {
      id: "caught",
      title: "Caught",
      icon: Shield,
      variant: "success",
      action: () => {},
    },
    {
      id: "stumped",
      title: "Stumped",
      icon: Zap,
      variant: "warning",
      action: () => {},
    },
    {
      id: "caughtBowled",
      title: "Caught & Bowled",
      icon: Shield,
      variant: "success",
      action: () => handleOut("Caught and bowled", { caughtBy: bowler }),
    },
    {
      id: "runOut",
      title: "Run Out",
      icon: Target,
      variant: "warning",
      action: () => {},
    },
    {
      id: "mankaded",
      title: "Mankaded",
      subtitle: "Run Out",
      icon: AlertTriangle,
      variant: "danger",
      action: () => {},
    },
    { id: "lbw", title: "LBW", icon: Cricket, action: () => handleOut("lbw") },
    {
      id: "hitWicket",
      title: "Hit Wicket",
      icon: Wicket,
      variant: "danger",
      action: () => handleOut("Hit Wicket"),
    },
    {
      id: "retired",
      title: "Retired",
      subtitle: "Can Bat Again",
      icon: LogOut,
      variant: "warning",
      action: () => {},
    },
    {
      id: "retiredHurt",
      title: "Retired Hurt",
      subtitle: "Can Bat Again",
      icon: Heart,
      variant: "warning",
      action: () => {},
    },
    {
      id: "retiredOut",
      title: "Retired Out",
      subtitle: "Cannot Bat Again",
      icon: LogOut,
      variant: "danger",
      action: () => {},
    },
    {
      id: "hitTwice",
      title: "Hit Ball Twice",
      icon: Cricket,
      action: () => handleOut("Hit the ball twice"),
    },
  ];

  const handleOut = (dismissalType, extraInfo = {}) => {
    const ballData = {
      isWicket: true,
      dismissalInfo: {
        dismissalType,
        bowler,
        ...extraInfo,
      },
    };
    handelBall(ballData);
    onWicket(1, true);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          isDarkMode ? styles.buttonDark : styles.buttonLight,
        ]}
        onPress={() => {
          setModalVisible(true);
        }}
      >
        <ThemedText
          style={[styles.text, isDarkMode ? styles.textDark : styles.textLight]}
        >
          OUT
        </ThemedText>
      </TouchableOpacity>

      {/* Main Out Types Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.mainModal,
              isDarkMode ? styles.darkModal : styles.lightModal,
            ]}
          >
            <ModalHeader
              title="Select Dismissal Type"
              onClose={() => setModalVisible(false)}
              isDarkMode={isDarkMode}
            />
            <ScrollView style={styles.outOptionsList}>
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
    </>
  );
}

const styles = {
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  container: { marginVertical: 8 },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
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
  logoStump: { width: 2, height: 8, backgroundColor: "currentColor" },
  triggerButton: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  lightTrigger: { backgroundColor: "#FFFFFF" },
  darkTrigger: { backgroundColor: COLORS.dark.card },
  triggerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.danger,
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  mainModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
  },
  lightModal: { backgroundColor: COLORS.light.background },
  darkModal: { backgroundColor: COLORS.dark.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  closeButton: { padding: 8, borderRadius: 12 },
  darkCloseButton: { backgroundColor: "rgba(255,255,255,0.1)" },
  outOptionsList: { padding: 16 },
  outOptionsGrid: { gap: 8 },
  outOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  lightItem: { backgroundColor: "#FFFFFF" },
  darkItem: { backgroundColor: COLORS.dark.card },
  dangerItem: {
    backgroundColor: "rgba(185, 28, 28, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  warningItem: {
    backgroundColor: "rgba(217, 119, 6, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  successItem: {
    backgroundColor: "rgba(5, 150, 105, 0.1)",
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
  buttonLight: {
    backgroundColor: "#dee2e6",
    borderColor: "#e5e7eb", // gray-200
     color: "#111827", // gray-900
  },
  buttonDark: {
    backgroundColor: "#0a0f1c",
    borderColor: "#1a2333",
    color: "#fff",
  },
  textLight: {
    color: "#111827", // gray-900
  },
  textDark: {
    color: "#fff",
  },
};

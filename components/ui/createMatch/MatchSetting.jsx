import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Switch,
  Dimensions,
  Modal,
  TextInput,
} from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Shield,
  Target,
  Clock,
  Zap,
  Award,
  Video,
  Settings as SettingsIcon,
  X,
  Copy,
  Share2,
  Broadcast,
  BarChart,
  Trophy,
  Graph,
  List,
  Palette,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");

const COLORS = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#8B5CF6",
  danger: "#EF4444",
  light: {
    background: "#FFFFFF",
    card: "#F8FAFC",
    text: "#1E293B",
    textSecondary: "#64748B",
    border: "#E2E8F0",
  },
  dark: {
    background: "#0F172A",
    card: "#1E293B",
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    border: "#334155",
  },
};

// Safe icon component with fallback
const SafeIcon = ({ icon: Icon, size = 20, color, ...props }) => {
  if (!Icon || typeof Icon === 'undefined') {
    return <Text style={{ color, fontSize: size - 4 }}>⚙️</Text>;
  }
  
  try {
    return <Icon size={size} color={color} {...props} />;
  } catch (error) {
    return <Text style={{ color, fontSize: size - 4 }}>⚙️</Text>;
  }
};

const AccordionSection = ({ 
  title, 
  icon, 
  isExpanded, 
  onToggle, 
  children,
  isDarkMode 
}) => {
  return (
    <View style={[
      styles.accordionSection,
      isDarkMode ? styles.darkAccordion : styles.lightAccordion
    ]}>
      <TouchableOpacity 
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionHeaderContent}>
          <SafeIcon 
            icon={icon} 
            size={20} 
            color={isDarkMode ? COLORS.dark.text : COLORS.primary} 
          />
          <Text style={[
            styles.accordionTitle,
            isDarkMode ? styles.darkText : styles.lightText
          ]}>
            {title}
          </Text>
        </View>
        <SafeIcon 
          icon={isExpanded ? ChevronUp : ChevronDown} 
          size={20} 
          color={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary} 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.accordionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

const SettingItem = ({ 
  title, 
  description, 
  value, 
  onToggle,
  type = "switch",
  onValueChange,
  placeholder,
  isDarkMode 
}) => {
  return (
    <View style={[
      styles.settingItem,
      isDarkMode ? styles.darkSettingItem : styles.lightSettingItem
    ]}>
      <View style={styles.settingText}>
        <Text style={[
          styles.settingTitle,
          isDarkMode ? styles.darkText : styles.lightText
        ]}>
          {title}
        </Text>
        {description && (
          <Text style={[
            styles.settingDescription,
            isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
          ]}>
            {description}
          </Text>
        )}
      </View>
      
      {type === "switch" ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          thumbColor={value ? COLORS.primary : "#F1F5F9"}
          trackColor={{ 
            false: isDarkMode ? "#334155" : "#E2E8F0", 
            true: isDarkMode ? "#1E40AF" : "#60A5FA" 
          }}
        />
      ) : (
        <TextInput
          style={[
            styles.textInput,
            isDarkMode ? styles.darkTextInput : styles.lightTextInput,
            isDarkMode ? styles.darkText : styles.lightText
          ]}
          value={value}
          onChangeText={onValueChange}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary}
        />
      )}
    </View>
  );
};

const ActionButton = ({ 
  icon, 
  title, 
  onPress, 
  variant = "default",
  isDarkMode 
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case "primary":
        return styles.primaryAction;
      case "danger":
        return styles.dangerAction;
      case "success":
        return styles.successAction;
      default:
        return [styles.defaultAction, isDarkMode ? styles.darkAction : styles.lightAction];
    }
  };

  return (
    <TouchableOpacity
      style={[styles.actionButton, getVariantStyle()]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <SafeIcon 
        icon={icon} 
        size={20} 
        color={variant === "default" ? 
          (isDarkMode ? COLORS.dark.text : COLORS.primary) : 
          "#FFFFFF"
        } 
      />
      <Text style={[
        styles.actionButtonText,
        variant === "default" ? 
        (isDarkMode ? styles.darkText : styles.primaryText) : 
        styles.lightText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default function MatchSetting({ matchId, onInningsComplete , onClose }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [expandedSections, setExpandedSections] = useState({
    player: true,
    match: false,
    live: false
  });
  
  const [settings, setSettings] = useState({
    // Player Settings
    changeTeamBowl: false,
    changeTeamBat: false,
    changeBowler: false,
    replaceBatter: false,
    allowSingleBatsman: true,
    
    // Match Settings
    endInning: false,
    countNoBallRun: true,
    countWideRun: true,
    
    // Live Settings
    goLive: false,
    overlayEnabled: false,
    streamingLink: "",
    showComparison: true,
    showPlayingXI: true,
    showSummary: true,
    showPartnership: false,
    batsmenStats: false,
    showToss: true,
    showPreview: true,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const accordionSections = [
    {
      key: "player",
      title: "Player Settings",
      icon: Users,
      content: (
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Change Team (Bowl)"
            description="Switch bowling team"
            value={settings.changeTeamBowl}
            onToggle={() => toggleSetting("changeTeamBowl")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Change Team (Bat)"
            description="Switch batting team"
            value={settings.changeTeamBat}
            onToggle={() => toggleSetting("changeTeamBat")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Change Bowler"
            description="Replace current bowler"
            value={settings.changeBowler}
            onToggle={() => toggleSetting("changeBowler")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Replace Batter"
            description="Substitute batsman"
            value={settings.replaceBatter}
            onToggle={() => toggleSetting("replaceBatter")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Allow Single Batsman"
            description="Enable single batsman mode"
            value={settings.allowSingleBatsman}
            onToggle={() => toggleSetting("allowSingleBatsman")}
            isDarkMode={isDarkMode}
          />
        </View>
      )
    },
    {
      key: "match",
      title: "Match Settings",
      icon: Trophy,
      content: (
        <View style={styles.settingsGroup}>
          <ActionButton
            icon={Clock}
            title="End Inning"
            variant="danger"
            onPress={onInningsComplete}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Count No Ball Run"
            description="Include no ball runs in total"
            value={settings.countNoBallRun}
            onToggle={() => toggleSetting("countNoBallRun")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Count Wide Run"
            description="Include wide runs in total"
            value={settings.countWideRun}
            onToggle={() => toggleSetting("countWideRun")}
            isDarkMode={isDarkMode}
          />
        </View>
      )
    },
    {
      key: "live",
      title: "Live Settings",
      icon: Broadcast,
      content: (
        <View style={styles.settingsGroup}>
          <ActionButton
            icon={Zap}
            title={settings.goLive ? "Live Now" : "Go Live"}
            variant={settings.goLive ? "success" : "primary"}
            onPress={() => toggleSetting("goLive")}
            isDarkMode={isDarkMode}
          />
          
          <SettingItem
            title="Streaming Link"
            description="Paste YouTube/Facebook video link"
            value={settings.streamingLink}
            onValueChange={(value) => updateSetting("streamingLink", value)}
            type="input"
            placeholder="https://youtube.com/..."
            isDarkMode={isDarkMode}
          />
          
          <View style={styles.liveActionsRow}>
            <ActionButton
              icon={Copy}
              title="Copy Link"
              variant="default"
              onPress={() => console.log("Copy stream link")}
              isDarkMode={isDarkMode}
            />
            <ActionButton
              icon={Share2}
              title="Share"
              variant="default"
              onPress={() => console.log("Share match")}
              isDarkMode={isDarkMode}
            />
          </View>
          
          <SettingItem
            title="Overlay Setup"
            description="Enable match overlays"
            value={settings.overlayEnabled}
            onToggle={() => toggleSetting("overlayEnabled")}
            isDarkMode={isDarkMode}
          />
          
          <Text style={[
            styles.subsectionTitle,
            isDarkMode ? styles.darkText : styles.lightText
          ]}>
            Display Options
          </Text>
          
          <SettingItem
            title="Comparison Graph"
            description="Show run rate comparison"
            value={settings.showComparison}
            onToggle={() => toggleSetting("showComparison")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Playing XI"
            description="Display team lineups"
            value={settings.showPlayingXI}
            onToggle={() => toggleSetting("showPlayingXI")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Match Summary"
            description="Show match overview"
            value={settings.showSummary}
            onToggle={() => toggleSetting("showSummary")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Partnership"
            description="Display batting partnerships"
            value={settings.showPartnership}
            onToggle={() => toggleSetting("showPartnership")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Batsmen Stats"
            description="Detailed player statistics"
            value={settings.batsmenStats}
            onToggle={() => toggleSetting("batsmenStats")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Toss Info"
            description="Show toss results"
            value={settings.showToss}
            onToggle={() => toggleSetting("showToss")}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            title="Match Preview"
            description="Pre-match information"
            value={settings.showPreview}
            onToggle={() => toggleSetting("showPreview")}
            isDarkMode={isDarkMode}
          />
        </View>
      )
    }
  ];

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDarkMode ? COLORS.dark.background : COLORS.light.background }
    ]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
    <View>
      <Text style={[
        styles.title,
        isDarkMode ? styles.darkText : styles.lightText
      ]}>
        Match Settings
      </Text>
      <Text style={[
        styles.subtitle,
        isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
      ]}>
        Manage all match configurations
      </Text>
    </View>

    {/* Cross Icon */}
    <TouchableOpacity onPress={onClose}>
      <SafeIcon 
        icon={X} 
        size={24} 
        color={isDarkMode ? COLORS.dark.text : COLORS.light.text} 
      />
    </TouchableOpacity>
  </View>
</View>


        {accordionSections.map((section) => (
          <AccordionSection
            key={section.key}
            title={section.title}
            icon={section.icon}
            isExpanded={expandedSections[section.key]}
            onToggle={() => toggleSection(section.key)}
            isDarkMode={isDarkMode}
          >
            {section.content}
          </AccordionSection>
        ))}
      </ScrollView>

      {/* Status Bar */}
      {/* <View style={[
        styles.statusBar,
        isDarkMode ? styles.darkStatusBar : styles.lightStatusBar
      ]}>
        <View style={styles.statusItem}>
          <SafeIcon 
            icon={Broadcast} 
            size={16} 
            color={settings.goLive ? COLORS.secondary : 
              (isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary)} 
          />
          <Text style={[
            styles.statusText,
            isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary,
            settings.goLive && styles.liveStatusText
          ]}>
            {settings.goLive ? "Live • Streaming Active" : "Offline • Ready to Go Live"}
          </Text>
        </View>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  accordionSection: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  lightAccordion: {
    backgroundColor: COLORS.light.card,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  darkAccordion: {
    backgroundColor: COLORS.dark.card,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  accordionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  accordionContent: {
    padding: 16,
    paddingTop: 0,
  },
  settingsGroup: {
    gap: 12,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  lightSettingItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  darkSettingItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
  },
  settingText: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  lightTextInput: {
    borderColor: COLORS.light.border,
    backgroundColor: COLORS.light.background,
  },
  darkTextInput: {
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.background,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  defaultAction: {
    borderWidth: 2,
  },
  lightAction: {
    borderColor: COLORS.light.border,
    backgroundColor: COLORS.light.card,
  },
  darkAction: {
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.card,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
  },
  dangerAction: {
    backgroundColor: COLORS.danger,
  },
  successAction: {
    backgroundColor: COLORS.secondary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  liveActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  statusBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  lightStatusBar: {
    backgroundColor: COLORS.light.card,
    borderTopColor: COLORS.light.border,
  },
  darkStatusBar: {
    backgroundColor: COLORS.dark.card,
    borderTopColor: COLORS.dark.border,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  liveStatusText: {
    color: COLORS.secondary,
    fontWeight: "600",
  },
  // Text Styles
  lightText: {
    color: COLORS.light.text,
  },
  darkText: {
    color: COLORS.dark.text,
  },
  lightTextSecondary: {
    color: COLORS.light.textSecondary,
  },
  darkTextSecondary: {
    color: COLORS.dark.textSecondary,
  },
  primaryText: {
    color: COLORS.primary,
  },
});
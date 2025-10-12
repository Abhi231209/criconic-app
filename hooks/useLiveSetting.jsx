import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  useColorScheme,
  Alert,
  Linking
} from "react-native";
import { Copy, ExternalLink, Users, BarChart3, Trophy, Stream } from "lucide-react-native";
// import { ScorerScreenContext } from "./ScorerScreen";
// import request from "@/utils/api";
import { useSocket } from "@/contexts/SocketContext";
import { LiveSettings, MatchSettingEnum, settingToHideIfNoLive } from "@/utils/Common";
import * as Clipboard from 'expo-clipboard';
import { useAxiosGet } from "./useApi";
import ThemedText from "@/components/ui/custom/ThemedText";

const COLORS = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  secondary: '#10B981',
  accent: '#8B5CF6',
  danger: '#EF4444',
  warning: '#F59E0B',
  light: {
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  },
  dark: {
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
    border: '#374151',
  }
};

const request =() =>{
    
}

export const useLiveSetting = ({ matchID: matchId, onInningsComplete }) => {
  const [matchConfigs, setMatchConfigs] = useState({});
  const [showBatsmenStats, setShowBatsmenStats] = useState(false);
//   const scorerContext = useContext(ScorerScreenContext);
//   const [score, setScore] = useState(scorerContext?.score || {});
  const [score, setScore] = useState({});
  const { isConnected, emit, on, off } = useSocket();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const onSettingChange = async (setting, value) => {
    try {
      if (setting === MatchSettingEnum.GO_LIVE) {
        return value && goLive();
      } else if (setting === MatchSettingEnum.GO_LIVE_TOURNAMENT) {
        return value && goLive(score?.tournament?.slug);
      } else if ([
        MatchSettingEnum.SHOW_COMPARISON_GRAPH,
        MatchSettingEnum.SHOW_MATCH_SUMMARY,
        MatchSettingEnum.SHOW_PLAYING_ELEVEN,
        MatchSettingEnum.SHOW_BATSMEN_STATS,
        MatchSettingEnum.SHOW_PARTNERSHIP,
        MatchSettingEnum.SHOW_TOSS,
        MatchSettingEnum.SHOW_MATCH_PREVIEW,
      ].includes(setting)) {
        emit(setting, { matchId, value });
      } else {
        await request(`api/matches/${matchId}/settings`, {
          method: "PUT",
          data: {
            action: setting,
            data: value,
          },
        });
      }
      loadConfigs();
    } catch (error) {
      console.error("Error updating setting:", error);
      Alert.alert("Error", "Failed to update setting");
    }
  };

  const {
      get: getConfigs,
      isLoading,
      data,
      error,
    } = useAxiosGet(`api/matches/${matchId}/public/config`, {
      showAlert: true,
      useBaseURL: true,
    });

  const goLive = async (tournament) => {
    try {
      await request("api/matches/public/go-live", {
        data: { match: matchId || "", userStream: !!tournament, key: tournament },
      });
      loadConfigs();
      Alert.alert("Success", "Live streaming started successfully");
    } catch (error) {
      console.error("Error going live:", error);
      Alert.alert("Error", "Failed to start live streaming");
    }
  };

  const loadConfigs = async () => {
    try {
      const res = getConfigs()
      if (res?.data?.content.showBatsmenStats) {
        setShowBatsmenStats(res?.data?.content.showBatsmenStats.active);
      }
      setMatchConfigs(res?.data?.content || {});
    } catch (error) {
      console.error("Error loading configs:", error);
    }
  };

  const handleCopy = async (text) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Success", "URL copied to clipboard");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const scoreHandler = (data) => {
    setScore(data);
  };

  useEffect(() => {
    loadConfigs();
  }, [matchId]);

  useEffect(() => {
    if (!isConnected) return;

    on("score", scoreHandler);
    emit("score", { matchId });

    return () => {
      off("score", scoreHandler);
    };
  }, [isConnected, matchId]);

  const SettingItem = ({ settingKey, disabled = false }) => {
    const label = typeof LiveSettings[settingKey] === "string" 
      ? LiveSettings[settingKey] 
      : LiveSettings[settingKey]?.label;
    
    const setting = matchConfigs?.[settingKey] || {};

    if (!matchConfigs?.["goLiveTournament"]?.url && !matchConfigs?.["goLive"]?.url) {
      if (settingToHideIfNoLive?.includes(settingKey)) {
        return null;
      }
    }

    if (disabled) return null;

    const renderSettingContent = () => {
      console.log("RenderSettingContent:", settingKey)
      switch (settingKey) {
        case MatchSettingEnum.OVERLAY_SETUP:
          return (
            <TouchableOpacity 
              style={[styles.settingButton, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={() => {
                navigation.navigate(SCREENS.ThemeConfig);
              }}
            >
              <Stream size={20} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
              <ThemedText style={[styles.buttonText, isDarkMode ? styles.darkText : styles.lightText]}>
                Overlay Setup
              </ThemedText>
            </TouchableOpacity>
          );

        case MatchSettingEnum.LIVE_STREAMING_LINK:
          return (
            <View style={styles.textInputContainer}>
              <ThemedText style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>
                Live Streaming Link
              </ThemedText>
              <TextInput
                style={[styles.textInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                placeholder="Enter streaming link"
                defaultValue={typeof setting === "string" ? setting : ""}
                onBlur={(e) => onSettingChange(settingKey, e.nativeEvent.text)}
                placeholderTextColor={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary}
              />
            </View>
          );

        case MatchSettingEnum.SHOW_BATSMEN_STATS:
          return (
            <View style={showBatsmenStats && styles.batsmenStatsContainer}>
              <View style={styles.switchContainer}>
                <ThemedText style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>
                  {label}
                </ThemedText>
                <Switch
                  value={showBatsmenStats}
                  onValueChange={(value) => {
                    if (showBatsmenStats) {
                      onSettingChange(settingKey, { active: value });
                    } else {
                      setShowBatsmenStats(true);
                    }
                  }}
                  thumbColor={showBatsmenStats ? COLORS.primary : "#f4f3f4"}
                  trackColor={{ false: "#767577", true: COLORS.primary }}
                />
              </View>
              
              {showBatsmenStats && score?.playedBatsman?.length > 0 && (
                <View style={styles.radioGroup}>
                  {score.playedBatsman.map((player, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.radioOption}
                      onPress={() => onSettingChange(settingKey, { active: true, player: player.playerId })}
                    >
                      <View style={[
                        styles.radioCircle,
                        setting.player === player.playerId && styles.radioCircleSelected
                      ]}>
                        {setting.player === player.playerId && <View style={styles.radioInnerCircle} />}
                      </View>
                      <ThemedText style={[styles.radioLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                        {player.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );

        case MatchSettingEnum.END_INNING:
          return (
            <TouchableOpacity 
              style={[styles.endInningButton, isDarkMode ? styles.darkDangerButton : styles.lightDangerButton]}
              onPress={onInningsComplete}
            >
              <ThemedText style={styles.endInningText}>End Inning</ThemedText>
            </TouchableOpacity>
          );

        default:
          return (
            <View style={styles.switchContainer}>
              <ThemedText style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>
                {label}
              </ThemedText>
              <Switch
                value={typeof setting === "boolean" ? setting : setting?.active}
                onValueChange={(value) => onSettingChange(settingKey, value)}
                thumbColor={setting?.active ? COLORS.primary : "#f4f3f4"}
                trackColor={{ false: "#767577", true: COLORS.primary }}
              />
            </View>
          );
      }
    };

    const renderUrlSection = () => {
      if ((settingKey === MatchSettingEnum.GO_LIVE_TOURNAMENT && setting?.active && setting?.url && setting?.isTournamentLive) ||
          (settingKey === MatchSettingEnum.GO_LIVE && setting?.active && setting?.url && !setting?.isTournamentLive)) {
        return (
          <TouchableOpacity 
            style={styles.urlContainer}
            onPress={() => handleCopy(setting.url)}
          >
            <Copy size={16} color={COLORS.primary} />
            <ThemedText style={[styles.urlText, isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary]}>
              {setting.url}
            </ThemedText>
          </TouchableOpacity>
        );
      }
      return null;
    };

    return (
      <View style={styles.settingItem}>
        {renderSettingContent()}
        {renderUrlSection()}
      </View>
    );
  };

  const ShowLiveSettings = ({ disabled = [] }) => {
    if (!score?.tournament?._id) {
      disabled.push(MatchSettingEnum.GO_LIVE_TOURNAMENT);
    }

    return (
      <View style={styles.settingsContainer}>
        {Object.keys(LiveSettings).map((key) => (
          <View key={key}>
            <SettingItem settingKey={key} disabled={disabled?.includes(key)} />
            <View style={[styles.separator, isDarkMode ? styles.darkSeparator : styles.lightSeparator]} />
          </View>
        ))}
      </View>
    );
  };

  return { ShowLiveSettings };
};

const styles = StyleSheet.create({
  settingsContainer: {
    gap: 16,
  },
  settingItem: {
    gap: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textInputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  lightInput: {
    backgroundColor: COLORS.light.inputBg,
    borderColor: COLORS.light.border,
    color: COLORS.light.text,
  },
  darkInput: {
    backgroundColor: COLORS.dark.inputBg,
    borderColor: COLORS.dark.border,
    color: COLORS.dark.text,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  lightButton: {
    backgroundColor: COLORS.light.card,
    borderColor: COLORS.light.border,
  },
  darkButton: {
    backgroundColor: COLORS.dark.card,
    borderColor: COLORS.dark.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  batsmenStatsContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  lightBatsmenStats: {
    borderColor: COLORS.light.border,
    backgroundColor: COLORS.light.card,
  },
  darkBatsmenStats: {
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.card,
  },
  radioGroup: {
    marginTop: 12,
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightRadioCircle: {
    borderColor: COLORS.light.border,
  },
  darkRadioCircle: {
    borderColor: COLORS.dark.border,
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 14,
  },
  endInningButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  lightDangerButton: {
    backgroundColor: COLORS.danger,
  },
  darkDangerButton: {
    backgroundColor: COLORS.danger,
  },
  endInningText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 4,
  },
  lightUrlContainer: {
    backgroundColor: COLORS.light.background,
  },
  darkUrlContainer: {
    backgroundColor: COLORS.dark.background,
  },
  urlText: {
    fontSize: 14,
    flex: 1,
  },
  separator: {
    height: 1,
  },
  lightSeparator: {
    backgroundColor: COLORS.light.border,
  },
  darkSeparator: {
    backgroundColor: COLORS.dark.border,
  },
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
});
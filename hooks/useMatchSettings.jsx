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
import { Copy, Users, BarChart3, Trophy, Clock, List, Award } from "lucide-react-native";
// import { ScorerScreenContext } from "./ScorerScreen";
// import request from "@/utils/api";
import { useSocket } from "@/contexts/SocketContext";
import { MatchSettingEnum, MatchSettings, settingToHideIfNoLive } from "@/utils/Common";
import * as Clipboard from 'expo-clipboard';

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


export const useMatchSettings = ({ matchID: matchId, onInningsComplete }) => {
  const [matchConfigs, setMatchConfigs] = useState({});
  const [showBatsmenStats, setShowBatsmenStats] = useState(false);
  // const scorerContext = useContext(ScorerScreenContext);
  // const [score, setScore] = useState(scorerContext?.score || {});
  const [score, setScore] = useState({});
  const { isConnected, emit, on, off } = useSocket();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const request = () =>{

  }

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
      ]?.includes(setting)) {
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
      const res = await request(`api/matches/${matchId}/public/config`, {
        method: "GET",
      });
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

  const getSettingIcon = (settingKey) => {
    const icons = {
      [MatchSettingEnum.SHOW_COMPARISON_GRAPH]: BarChart3,
      [MatchSettingEnum.SHOW_MATCH_SUMMARY]: List,
      [MatchSettingEnum.SHOW_PLAYING_ELEVEN]: Users,
      [MatchSettingEnum.SHOW_BATSMEN_STATS]: Users,
      [MatchSettingEnum.SHOW_PARTNERSHIP]: Users,
      [MatchSettingEnum.SHOW_TOSS]: Award,
      [MatchSettingEnum.SHOW_MATCH_PREVIEW]: Clock,
    };
    return icons[settingKey] || Clock;
  };

  // const SettingItem = ({ settingKey, disabled = false }) => {
  //   const label = typeof MatchSettings[settingKey] === "string" 
  //     ? MatchSettings[settingKey] 
  //     : MatchSettings[settingKey]?.label;
    
  //   const IconComponent = getSettingIcon(settingKey);
  //   const setting = matchConfigs?.[settingKey] || {};

  //   if (!matchConfigs?.["goLiveTournament"]?.url && !matchConfigs?.["goLive"]?.url) {
  //     if (settingToHideIfNoLive?.includes(settingKey)) {
  //       return null;
  //     }
  //   }

  //   if (disabled) return null;

  //   const renderSettingContent = () => {
  //     switch (settingKey) {
  //       case MatchSettingEnum.LIVE_STREAMING_LINK:
  //         return (
  //           <View style={styles.textInputContainer}>
  //             <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>
  //               Live Streaming Link
  //             </Text>
  //             <TextInput
  //               style={[styles.textInput, isDarkMode ? styles.darkInput : styles.lightInput]}
  //               placeholder="Enter streaming link"
  //               defaultValue={typeof setting === "string" ? setting : ""}
  //               onBlur={(e) => onSettingChange(settingKey, e.nativeEvent.text)}
  //               placeholderTextColor={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary}
  //             />
  //           </View>
  //         );

  //       case MatchSettingEnum.SHOW_BATSMEN_STATS:
  //         return (
  //           <View style={showBatsmenStats && styles.batsmenStatsContainer}>
  //             <View style={styles.switchContainer}>
  //               <View style={styles.labelContainer}>
  //                 <IconComponent size={20} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
  //                 <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>
  //                   {label}
  //                 </Text>
  //               </View>
  //               <Switch
  //                 value={showBatsmenStats}
  //                 onValueChange={(value) => {
  //                   if (showBatsmenStats) {
  //                     onSettingChange(settingKey, { active: value });
  //                   } else {
  //                     setShowBatsmenStats(true);
  //                   }
  //                 }}
  //                 thumbColor={showBatsmenStats ? COLORS.primary : "#f4f3f4"}
  //                 trackColor={{ false: "#767577", true: COLORS.primary }}
  //               />
  //             </View>
              
  //             {showBatsmenStats && score?.playedBatsman?.length > 0 && (
  //               <View style={styles.radioGroup}>
  //                 <Text style={[styles.radioGroupTitle, isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary]}>
  //                   Select Batsman:
  //                 </Text>
  //                 {score.playedBatsman.map((player, index) => (
  //                   <TouchableOpacity
  //                     key={index}
  //                     style={styles.radioOption}
  //                     onPress={() => onSettingChange(settingKey, { active: true, player: player.playerId })}
  //                   >
  //                     <View style={[
  //                       styles.radioCircle,
  //                       isDarkMode ? styles.darkRadioCircle : styles.lightRadioCircle,
  //                       setting.player === player.playerId && styles.radioCircleSelected
  //                     ]}>
  //                       {setting.player === player.playerId && <View style={styles.radioInnerCircle} />}
  //                     </View>
  //                     <Text style={[styles.radioLabel, isDarkMode ? styles.darkText : styles.lightText]}>
  //                       {player.name}
  //                     </Text>
  //                   </TouchableOpacity>
  //                 ))}
  //               </View>
  //             )}
  //           </View>
  //         );

  //       case MatchSettingEnum.END_INNING:
  //         return (
  //           <TouchableOpacity 
  //             style={[styles.endInningButton, isDarkMode ? styles.darkDangerButton : styles.lightDangerButton]}
  //             onPress={onInningsComplete}
  //           >
  //             <Text style={styles.endInningText}>End Inning</Text>
  //           </TouchableOpacity>
  //         );

  //       default:
  //         return (
  //           <View style={styles.switchContainer}>
  //             <View style={styles.labelContainer}>
  //               <IconComponent size={20} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
  //               <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>
  //                 {label}
  //               </Text>
  //             </View>
  //             <Switch
  //               value={typeof setting === "boolean" ? setting : setting?.active}
  //               onValueChange={(value) => onSettingChange(settingKey, value)}
  //               thumbColor={setting?.active ? COLORS.primary : "#f4f3f4"}
  //               trackColor={{ false: "#767577", true: COLORS.primary }}
  //             />
  //           </View>
  //         );
  //     }
  //   };

  //   const renderUrlSection = () => {
  //     if ((settingKey === MatchSettingEnum.GO_LIVE_TOURNAMENT && setting?.active && setting?.url && setting?.isTournamentLive) ||
  //         (settingKey === MatchSettingEnum.GO_LIVE && setting?.active && setting?.url && !setting?.isTournamentLive)) {
  //       return (
  //         <TouchableOpacity 
  //           style={[styles.urlContainer, isDarkMode ? styles.darkUrlContainer : styles.lightUrlContainer]}
  //           onPress={() => handleCopy(setting.url)}
  //         >
  //           <Copy size={16} color={COLORS.primary} />
  //           <Text style={[styles.urlText, isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary]}>
  //             {setting.url}
  //           </Text>
  //         </TouchableOpacity>
  //       );
  //     }
  //     return null;
  //   };

  //   const renderTournamentNote = () => {
  //     if (settingKey === MatchSettingEnum.GO_LIVE_TOURNAMENT) {
  //       return (
  //         <Text style={[styles.tournamentNote, isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary]}>
  //           * Turn on live score streaming for this match on the tournament's live link.
  //         </Text>
  //       );
  //     }
  //     return null;
  //   };

  //   return (
  //     <View style={styles.settingItem}>
  //       {renderTournamentNote()}
  //       {renderSettingContent()}
  //       {renderUrlSection()}
  //     </View>
  //   );
  // };

  const ShowSettings = ({ disabled = [] }) => {
    if (!score?.tournament?._id) {
      disabled.push(MatchSettingEnum.GO_LIVE_TOURNAMENT);
    }

    return (
      <View style={styles.settingsContainer}>
        {Object.keys(MatchSettings).map((key) => (
          <View key={key}>
            {/* <SettingItem settingKey={key} disabled={disabled?.includes(key)} /> */}
            <View style={[styles.separator, isDarkMode ? styles.darkSeparator : styles.lightSeparator]} />
          </View>
        ))}
      </View>
    );
  };

  return { ShowSettings };
};

const styles = StyleSheet.create({
  settingsContainer: {
    gap: 20,
  },
  settingItem: {
    gap: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  batsmenStatsContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
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
  radioGroupTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
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
    flex: 1,
  },
  endInningButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
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
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
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
  tournamentNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  separator: {
    height: 1,
    marginVertical: 8,
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
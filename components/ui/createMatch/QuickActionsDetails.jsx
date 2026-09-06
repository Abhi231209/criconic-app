import React, { useState } from "react";
import { View, TouchableOpacity, Linking } from "react-native";
import ThemedText from "../custom/ThemedText";
// Option 1: Using Expo Vector Icons (recommended)
import { Ionicons } from '@expo/vector-icons';

// Option 2: If you prefer Gluestack Icons, uncomment these and comment out Ionicons above
// import { 
//   HelpCircleIcon,
//   RepeatIcon,
//   BarChart3Icon,
//   ClockIcon,
//   UserIcon,
//   RefreshCwIcon,
//   TrophyIcon
// } from '@gluestack-ui/themed';

import SCREENS from "@/screens";
import ReplaceBatterPopup from "./ReplaceBatterPopUp";
import EditOver from "./EditOver";
import BonusRuns from "./BonusRuns";
import useAppTheme from "@/hooks/useAppTheme";

export default function QuickActionDetails({
  isScorerScreen = false,
  matchID,
  bowlingTeam,
  battingTeam,
  currentOver,
  batsmen,
  bowler,
  cb,
  setOpen,
  navigation
}) {
  const { isDark } = useAppTheme();

  const handleNeedHelp = () => {
    Linking.openURL("mailto:support@criconic.com").catch((e) =>
      console.warn("Could not open mail client", e)
    );
  };

   const [showReplacePopup, setShowReplacePopup] = useState(false);
     const [showEditOverPopup, setShowEditOverPopup] = useState(false);
     const [showBonusRunsPopup, setShowBonusRunsPopup] = useState(false);


  // HARDCODED MOCK PLAYERS - COMMENTED OUT (API ONLY)
  /*
  const players = [
    { playerId: 1, name: "Virat Kohli" },
    { playerId: 2, name: "Rohit Sharma" },
    { playerId: 3, name: "KL Rahul" },
    { playerId: 4, name: "Shubman Gill" },
  ];
  const team = "team123";
  */

  const activePlayers = (Array.isArray(batsmen) && batsmen.length > 0) ? batsmen : [];
  const activeTeam =
    battingTeam?.battingId ||
    battingTeam?.teamId ||
    battingTeam?._id ||
    battingTeam?.id ||
    "";

  const handleSuccess = () => {
    handleClosePopup();
    setOpen?.(false);
    cb?.();
    console.log("Bonus runs added successfully");
  };

  const handleOpenPopup = () => {
    setShowReplacePopup(true);
  };

  const handleClosePopup = () => {
    setShowReplacePopup(false);
    setShowEditOverPopup(false);
    setShowBonusRunsPopup(false);
  };

  const ENUM_FOR_QUICKACTION = [
    {
      Name: "Need Help",
      Icon: "help-circle-outline",
      handleFunction: handleNeedHelp,
      hide: isScorerScreen,
      href: `mailto:support@criconic.com`,
    },
    {
      Name: "Change Team (Bowl)",
      Icon: "swap-horizontal-outline",
      handleFunction: () => {
        setOpen?.(false);
        const bId =
          bowlingTeam?.teamId ||
          bowlingTeam?.bowlingId ||
          bowlingTeam?._id ||
          bowlingTeam?.id;
        navigation?.navigate?.(SCREENS.ChangeSquad, {
          teamId: bId,
          matchId: matchID,
          team: bowlingTeam,
          squad: bowlingTeam?.players,
          cb,
        });
      },
    },
    {
      Name: "Change Team (Bat)",
      Icon: "swap-horizontal-outline",
      handleFunction: () => {
        setOpen?.(false);
        const batId =
          battingTeam?.teamId ||
          battingTeam?.battingId ||
          battingTeam?._id ||
          battingTeam?.id ||
          activeTeam;
        navigation?.navigate?.(SCREENS.ChangeSquad, {
          teamId: batId,
          matchId: matchID,
          team: battingTeam,
          squad: battingTeam?.players,
          cb,
        });
      },
    },
    {
      Name: "Full Scorecard",
      Icon: "stats-chart-outline",
      handleFunction: () => {
        setOpen?.(false);
        navigation?.navigate?.(SCREENS.MatchScoreCard, { matchId: matchID });
      },
    },
    {
      Name: "Match Over",
      Icon: "time-outline",
      handleFunction: () => {
        setShowEditOverPopup(true);
      },
      hide: isScorerScreen,
    },
    {
      Name: "Change Bowler",
      Icon: "person-outline",
      handleFunction: () => {
        setOpen?.(false);
        const bowlTeamId =
          bowlingTeam?.teamId ||
          bowlingTeam?.bowlingId ||
          bowlingTeam?._id ||
          bowlingTeam?.id ||
          "";
        navigation?.navigate?.(SCREENS.ChangeBowler, {
          teamId: bowlTeamId,
          matchId: matchID,
          playerId: bowler?.playerId || bowler?.id || bowler?._id,
          playerName: bowler?.name || bowler?.username,
          squad: bowlingTeam?.players || bowlingTeam?.squad || [],
          cb,
        });
      },
    },
    {
      Name: "Replace Batter",
      Icon: "repeat-outline",
      handleFunction: () => {
        setShowReplacePopup(true);
      },
    },
    {
      Name: "Bonus Runs",
      Icon: "trophy-outline",
      handleFunction: () => {
        setShowBonusRunsPopup(true);
      },
      hide: isScorerScreen,
    },
  ];

  const visibleItems = ENUM_FOR_QUICKACTION.filter((d) => !d.hide);

  // Function to render icon based on your preference
  const renderIcon = (data) => {
    const iconColor = isDark ? "#F8FAFC" : "#1E293B";
    return <Ionicons name={data.Icon} size={28} color={iconColor} />;
  };

  const textColor = isDark ? "#F8FAFC" : "#1E293B";

  return (
    <View className={`${!isScorerScreen ? "pt-10" : ""}`}>
      <View
        className={
          isScorerScreen
            ? ""
            : "flex-row flex-wrap justify-around items-center"
        }
        style={isScorerScreen ? {} : { rowGap: 16, columnGap: 16 }}
      >
        {visibleItems.map((data, index) => {
          const onPress = () => {
            if (data.href) {
              if (data.href.startsWith("mailto:")) {
                Linking.openURL(data.href).catch((e) =>
                  console.warn("Cannot open mailto:", e)
                );
              } else {
                navigation.navigate(data.navigationScreen, {})
              }
            } else {
              if(data.navigationScreen){
                navigation.navigate(data.navigationScreen, {})
              }else{
                data.handleFunction?.();
              }
            }
          };

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              className={
                !isScorerScreen
                  ? "w-[22%] items-center justify-center gap-2"
                  : "w-full py-2"
              }
              activeOpacity={0.7}
            >
              {!isScorerScreen && renderIcon(data)}
              {isScorerScreen ? (
                <View className="w-full">
                  <ThemedText
                    className="text-lg font-semibold"
                    style={{ color: textColor }}
                  >
                    {data.Name}
                  </ThemedText>
                </View>
              ) : (
                <View className="h-12 justify-center">
                  <ThemedText
                    className="text-sm font-semibold text-center"
                    style={{ color: textColor }}
                  >
                    {data.Name}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <ReplaceBatterPopup
        visible={showReplacePopup}
        onClose={handleClosePopup}
        players={activePlayers}
        team={activeTeam}
        matchID={matchID}
        onSelect={(playerId) => {
          setShowReplacePopup(false);
          setOpen?.(false);
          const chosen = activePlayers.find(
            (p) => String(p.playerId || p.id || p._id) === String(playerId)
          );
          navigation?.navigate?.(SCREENS.ChangeBowler, {
            teamId: activeTeam,
            matchId: matchID,
            playerId: playerId,
            playerName: chosen?.name || chosen?.username,
            squad: battingTeam?.players || battingTeam?.squad || [],
            cb,
          });
        }}
      />
       <EditOver
        visible={showEditOverPopup}
        onClose={handleClosePopup}
        onSuccess={() => {
          handleClosePopup();
          setOpen?.(false);
          cb?.();
        }}
        matchID={matchID}
        currentOver={currentOver}
      />
       <BonusRuns
        visible={showBonusRunsPopup}
        onClose={handleClosePopup}
        onSuccess={handleSuccess}
        matchID={matchID}
        battingTeam={battingTeam}
        bowlingTeam={bowlingTeam}
      />
    </View>
  );
}
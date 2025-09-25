import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
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
  const handleNeedHelp = () => {
    Linking.openURL("mailto:support@criconic.com").catch((e) =>
      console.warn("Could not open mail client", e)
    );
  };

  const ENUM_FOR_QUICKACTION = [
    {
      Name: "Need Help",
      Icon: "help-circle-outline",
      // GluestackIcon: HelpCircleIcon, // Uncomment if using Gluestack
      handleFunction: handleNeedHelp,
      hide: isScorerScreen,
      href: `mailto:support@criconic.com`,
    },
    {
      Name: "Change Team (Bowl)",
      Icon: "swap-horizontal-outline",
      // GluestackIcon: RepeatIcon, // Uncomment if using Gluestack
      navigationScreen: SCREENS.ChangeSquad,
    },
    {
      Name: "Change Team (Bat)",
      Icon: "swap-horizontal-outline",
      // GluestackIcon: RepeatIcon, // Uncomment if using Gluestack
      // href: `${SCREENS.CHANGESQUADS}/${battingTeam?.teamId}/${matchID}`,
    },
    {
      Name: "Full Scorecard",
      Icon: "stats-chart-outline",
      // GluestackIcon: BarChart3Icon, // Uncomment if using Gluestack
      openInNewTab: true,
      // href: `${SCREENS.SCORECARD_WITH_VIDEO}${matchID}`,
      hide: isScorerScreen,
    },
    {
      Name: "Match Over",
      Icon: "time-outline",
      // GluestackIcon: ClockIcon, // Uncomment if using Gluestack
      handleFunction: () => {
        setOpen?.(false);
        // alert.show({
        //   componentProps: {
        //     matchID,
        //     currentOver,
        //     close: () => {
        //       cb?.();
        //       alert.close();
        //     },
        //   },
        // });
      },
      hide: isScorerScreen,
    },
    {
      Name: "Change Bowler",
      Icon: "person-outline",
      // GluestackIcon: UserIcon, // Uncomment if using Gluestack
      handleFunction: () => {
        // navigation.navigate("MatchChangeSquad", {
        //   teamId: bowlingTeam?.teamId,
        //   matchId: matchID,
        //   playerId: bowler?.playerId,
        // });
      },
    },
    {
      Name: "Replace Batter",
      Icon: "repeat-outline",
      // GluestackIcon: RefreshCwIcon, // Uncomment if using Gluestack
      handleFunction: () => {
        setOpen?.(false);
        // alert.show({
        //   componentProps: {
        //     players: batsmen,
        //     team: battingTeam?.teamId,
        //     matchID,
        //     close: alert.close,
        //   },
        //   Component: require("./quickactionpopups/ReplaceBatterPoPup").default,
        // });
      },
    },
    {
      Name: "Bonus Runs",
      Icon: "trophy-outline",
      // GluestackIcon: TrophyIcon, // Uncomment if using Gluestack
      handleFunction: () => {
        setOpen?.(false);
        // alert.show({
        //   componentProps: {
        //     battingTeam,
        //     bowlingTeam,
        //     matchID,
        //     close: alert.close,
        //     cb,
        //   },
        //   Component: require("./quickactionpopups/BonusRuns").default,
        // });
      },
      hide: isScorerScreen,
    },
  ];

  const visibleItems = ENUM_FOR_QUICKACTION.filter((d) => !d.hide);

  // Function to render icon based on your preference
  const renderIcon = (data) => {
    // Option 1: Using Expo Ionicons (Current)
    console.log(data,"This data")
    return <Ionicons name={data.Icon} size={30} />;

    // Option 2: Using Gluestack Icons (Uncomment below and comment above)
    // const IconComponent = data.GluestackIcon;
    // return <IconComponent size="xl" color="white" />;
  };

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
                // Linking.openURL(data.href).catch((e) =>
                //   console.warn("Cannot open URL:", e)
                // );
              }
            } else {
              navigation.navigate(data.navigationScreen, {})
              data.handleFunction?.();
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
                  <Text className="text-lg font-semibold text-gray-300">
                    {data.Name}
                  </Text>
                </View>
              ) : (
                <View className="h-12 justify-center">
                  <Text className="text-sm text-center">{data.Name}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
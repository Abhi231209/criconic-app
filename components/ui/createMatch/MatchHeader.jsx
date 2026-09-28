import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Home, Settings } from "lucide-react-native"; // icons
import Ionicons from "@expo/vector-icons/Ionicons";
import RightDrawer from "../custom/RightDrawer";
import MatchSetting from "./MatchSetting";
import SCREENS from "@/screens";

export default function MatchHeader({
  discription,
  onBack,
  onHome,
  showHomeIcon,
  showSetting = true,
  handleInningsComplete,
  matchID,
  bowlingTeam,
  battingTeam,
  currentOver,
  batsmen,
  bowler,
  cb,
  isScorerScreen,
  matchDetails,
  score,
  onSettingsChange,
}) {
  const navigation = useNavigation();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSettingsChange = (newSettings) => {
    console.log("Settings updated:", newSettings);
    onSettingsChange?.(newSettings);
  };

  const liveMatchData =
    matchDetails?.config?.goLive ||
    matchDetails?.config?.goLiveTournament ||
    score?.goLive ||
    score?.goLiveTournament;
  const isLiveOnStream = Boolean(liveMatchData?.active && liveMatchData?.url);

  return (
    <View className="bg-primary text-primary-foreground p-3">
      <View className="flex-row justify-between items-center">
        {/* Left Icon */}
        {showHomeIcon ? (
          <TouchableOpacity 
            onPress={() => {
              if (onHome) {
                onHome();
              } else {
                navigation.navigate(SCREENS.Home);
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Home size={26} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              if (onBack) {
                onBack();
              } else {
                navigation.goBack();
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
        )}

        {/* Title */}
        <Text
          numberOfLines={1}
          className="text-base font-semibold text-white flex-1 mx-2"
        >
          {discription || "Scorer"}
        </Text>

        {/* Right Actions */}
        <View className="flex-row items-center gap-2">
          {/* Quick Go Live / ON AIR Button */}
          {Boolean(matchID) && (
            <TouchableOpacity
              onPress={() => {
                const tournamentId =
                  score?.tournament?._id ||
                  score?.tournament?.id ||
                  (typeof score?.tournament === "string" ? score?.tournament : null) ||
                  matchDetails?.tournamentID ||
                  matchDetails?.tournament?._id ||
                  matchDetails?.tournament?.id ||
                  (typeof matchDetails?.tournament === "string" ? matchDetails?.tournament : null);
                navigation.navigate(SCREENS.GoLiveSetup, {
                  matchId: matchID,
                  tournamentId: typeof tournamentId === "object" ? tournamentId?._id || tournamentId?.id : tournamentId,
                  initialTab: isLiveOnStream ? "theme" : "mode",
                });
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
              className={`flex-row items-center px-2.5 py-1 rounded-full border ${
                isLiveOnStream
                  ? "bg-red-950/90 border-red-400"
                  : "bg-red-600 border-red-500 shadow-sm"
              }`}
            >
              <View className={`w-2 h-2 rounded-full mr-1.5 ${isLiveOnStream ? "bg-red-400" : "bg-white"}`} />
              <Text className="text-white text-[11px] font-extrabold uppercase tracking-wider">
                {isLiveOnStream ? "ON AIR" : "Go Live"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Settings */}
          {showSetting ? (
            <TouchableOpacity 
              onPress={() => setIsDrawerOpen(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              className="p-1"
            >
              <Settings size={22} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
      </View>

      {/* Right Drawer for Settings */}
      <RightDrawer
        isVisible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <MatchSetting
          matchId={matchID}
          onInningsComplete={handleInningsComplete}
          onClose={() => setIsDrawerOpen(false)}
          onSettingsChange={handleSettingsChange}
          matchDetails={matchDetails}
          score={score || { batting: battingTeam, bowling: bowlingTeam, batsman: batsmen, bowler }}
        />
      </RightDrawer>

      {/* BottomSheet */}
      {/* {sheetVisible && (
        <CommonBottomSheet
          snapPoints={["70%"]}
          onClose={() => setSheetVisible(false)}
        >
          <View className="mt-4">
            {isScorerScreen && (
              <AccordionV1 header="Player Setting" isDefaultOpen={true} name="playerSetting">
                <QuickActionDetails
                  matchID={matchID}
                  bowlingTeam={bowlingTeam}
                  battingTeam={battingTeam}
                  currentOver={currentOver}
                  batsmen={batsmen}
                  bowler={bowler}
                  cb={cb}
                  isScorerScreen={true}
                />
              </AccordionV1>
            )}
            <MatchSetting
              matchId={matchID}
              handleInningsComplete={() => {
                handleInningsComplete?.();
                setSheetVisible(false);
              }}
              isScorerScreen={isScorerScreen}
            />
          </View>
        </CommonBottomSheet>
      )} */}
    </View>
  );
}

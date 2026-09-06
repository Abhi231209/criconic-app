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
}) {
  const navigation = useNavigation();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSettingsChange = (newSettings) => {
    console.log("Settings updated:", newSettings);
    // You can pass these settings up to parent component or store in context
  };

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
        <Text className="text-lg font-semibold text-white">
          {discription || "Scorer"}
        </Text>

        {/* Settings */}
        {showSetting ? (
          <TouchableOpacity 
            onPress={() => setIsDrawerOpen(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Settings size={22} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
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

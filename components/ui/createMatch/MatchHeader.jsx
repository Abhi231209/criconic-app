import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Home, Settings } from "lucide-react-native"; // icons
import Ionicons from "@expo/vector-icons/Ionicons";
import RightDrawer from "../custom/RightDrawer";
import MatchSetting from "./MatchSetting";
// import CommonBottomSheet from "../common/CommonBottomSheet"; // your reusable RN bottom sheet
// import QuickActionDetails from "./QuickActionDetails";
// import MatchSetting from "./MatchSetting";
// import AccordionV1 from "../accordion/AccordionV1";

export default function MatchHeader({
  discription,
  onBack,
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
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Home size={28} color="white" />
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
          >
            {/* <Image
              source={require("../../assets/back-arrow.png")}
              style={{ width: 28, height: 28 }}
            /> */}
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
        )}

        {/* Title */}
        <Text className="text-lg font-semibold text-white">
          {discription || "Scorer"}
        </Text>

        {/* Settings */}
        {showSetting ? (
          <TouchableOpacity onPress={() => setIsDrawerOpen(true)}>
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
          onClose={() => setIsDrawerOpen(false)}
          onSettingsChange={handleSettingsChange}
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

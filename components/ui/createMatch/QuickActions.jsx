import React, { useState, useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
// import ReplaceBatterPoPup from "./quickactionpopups/ReplaceBatterPoPup";
import QuickActionDetails from "./QuickActionsDetails";
import { useBottomSheet } from "../custom/CustomBottomSheet";
import ThemedText from "../custom/ThemedText";

export default function QuickActions({
  matchID,
  bowlingTeam,
  battingTeam,
  currentOver,
  bowler,
  batsmen,
  navigation,
  cb = () => {},
}) {
  const { openSheet, closeSheet } = useBottomSheet();

  const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === "dark";
  return (
        <>
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 w-full py-3 bg-white dark:bg-gray-900 "
            onPress={() => {

                openSheet(
                <QuickActionDetails
                  matchID={matchID}
                  bowlingTeam={bowlingTeam}
                  battingTeam={battingTeam}
                  currentOver={currentOver}
                  bowler={bowler}
                  batsmen={batsmen}
                  navigation={navigation}
                  cb={cb}
                //   setOpen={setOpen}
                />);
            }}
          >
            <ThemedText className="text-lg font-semibold text-black dark:text-white ">
              Quick Actions
            </ThemedText>
            <Ionicons name="chevron-up-outline" size={20} color={isDarkMode ? "white" : "black"} />
          </TouchableOpacity>

    </>
  );
}

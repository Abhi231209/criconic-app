import React, { useState, useMemo, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
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

  return (
        <>
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 w-full py-3 bg-gray-800"
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
            <ThemedText className="text-lg text-white font-semibold">
              Quick Actions
            </ThemedText>
            <Ionicons name="chevron-up-outline" size={20} color="white" />
          </TouchableOpacity>

    </>
  );
}

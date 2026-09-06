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
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              paddingVertical: 14,
              backgroundColor: isDarkMode ? "#111827" : "#ffffff",
              borderTopWidth: 1,
              borderTopColor: isDarkMode ? "#1f2937" : "#e5e7eb",
            }}
            activeOpacity={0.7}
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
                  setOpen={(isOpen) => {
                    if (!isOpen) closeSheet();
                  }}
                />
              );
            }}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#ffffff" : "#111827" }}>
              Quick Actions
            </ThemedText>
            <Ionicons name="chevron-up-outline" size={18} color={isDarkMode ? "#ffffff" : "#111827"} />
          </TouchableOpacity>

    </>
  );
}

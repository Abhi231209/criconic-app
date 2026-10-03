import React from "react";
import { View, useColorScheme } from "react-native";
import SkeletonBlock from "./SkeletonBlock";

// Placeholder shaped like ScoreCard (header, two team rows, footer). Outer
// size, margins and border mirror ScoreCard so real cards drop in without a
// layout jump. `fullWidth` matches ScoreCard's prop of the same name.
export default function ScoreCardSkeleton({ fullWidth = false, style }) {
  const isDarkMode = useColorScheme() === "dark";

  const teamRow = (last) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: last ? 0 : 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
        <SkeletonBlock width={32} height={32} radius={16} style={{ marginRight: 10 }} />
        <SkeletonBlock width="55%" height={14} />
      </View>
      <SkeletonBlock width={56} height={14} />
    </View>
  );

  return (
    <View
      style={[
        {
          width: fullWidth ? "100%" : 300,
          marginHorizontal: fullWidth ? 0 : 4,
          marginVertical: 2,
          marginBottom: 12,
          borderRadius: 16,
          borderWidth: 1,
          overflow: "hidden",
          backgroundColor: isDarkMode ? "rgba(31, 41, 55, 0.9)" : "#FFFFFF",
          borderColor: isDarkMode ? "rgba(55, 65, 81, 0.8)" : "#F3F4F6",
          padding: 16,
        },
        style,
      ]}
    >
      {/* Header: tournament + round/date, status pill */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, marginRight: 8 }}>
          <SkeletonBlock width="60%" height={12} style={{ marginVertical: 2 }} />
          <SkeletonBlock width="40%" height={10} style={{ marginTop: 5 }} />
        </View>
        <SkeletonBlock width={84} height={24} radius={12} />
      </View>

      {/* Team rows */}
      <View style={{ paddingVertical: 4 }}>
        {teamRow(false)}
        {teamRow(true)}
      </View>

      {/* Footer: result / description line */}
      <View
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? "rgba(55, 65, 81, 0.6)" : "#F3F4F6",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <SkeletonBlock width="65%" height={12} style={{ marginVertical: 2 }} />
        <SkeletonBlock width={14} height={14} radius={7} />
      </View>
    </View>
  );
}

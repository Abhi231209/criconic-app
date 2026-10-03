import React from "react";
import { View, useColorScheme, useWindowDimensions } from "react-native";
import SkeletonBlock from "./SkeletonBlock";

// Placeholder for the PlayerRankings top-3 podium: 2nd / 1st / 3rd columns,
// each an avatar, name line and pillar at the real pillar heights.
const PILLARS = [
  { avatar: 50, pillar: 90 },
  { avatar: 58, pillar: 116 },
  { avatar: 50, pillar: 74 },
];

export default function PodiumSkeleton({ style }) {
  const isDarkMode = useColorScheme() === "dark";
  const { width } = useWindowDimensions();
  const columnWidth = (width - 56) / 3;

  return (
    <View
      style={[
        {
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingTop: 16,
          borderWidth: 1,
          backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
          borderColor: isDarkMode ? "rgba(31, 41, 55, 0.7)" : "rgba(229, 231, 235, 0.7)",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-end",
        },
        style,
      ]}
    >
      {PILLARS.map(({ avatar, pillar }, i) => (
        <View key={i} style={{ width: columnWidth, alignItems: "center" }}>
          <SkeletonBlock width={avatar + 6} height={avatar + 6} radius={(avatar + 6) / 2} />
          <SkeletonBlock width="60%" height={12} style={{ marginTop: 8 }} />
          <SkeletonBlock width="40%" height={10} style={{ marginTop: 6, marginBottom: 8 }} />
          <SkeletonBlock
            width="86%"
            height={pillar}
            radius={0}
            style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
          />
        </View>
      ))}
    </View>
  );
}

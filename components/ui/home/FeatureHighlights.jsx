import React from "react";
import { View, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import useAppTheme from "@/hooks/useAppTheme";

const FEATURES = [
  {
    key: "scoring",
    title: "Ball-by-Ball Scoring",
    description: "Live run rate, strike rotation & partnerships tracked automatically.",
    icon: "cricket",
    iconSet: "material",
    colors: ["#2563EB", "#1D4ED8"],
  },
  {
    key: "tournaments",
    title: "Tournament Engine",
    description: "Fixtures, groups & knockouts with auto net run-rate calculation.",
    icon: "trophy",
    iconSet: "ion",
    colors: ["#D97706", "#B45309"],
  },
  {
    key: "rankings",
    title: "Player Rankings",
    description: "Career stats & local leaderboards for every batter and bowler.",
    icon: "podium",
    iconSet: "ion",
    colors: ["#7C3AED", "#5B21B6"],
  },
  {
    key: "broadcast",
    title: "Live Broadcast",
    description: "Stream to YouTube or Facebook with real-time score overlays.",
    icon: "tv",
    iconSet: "ion",
    colors: ["#059669", "#047857"],
  },
];

export default function FeatureHighlights() {
  const { theme, isDarkMode } = useAppTheme();

  return (
    <View className="mt-2 mb-5">
      <View className="flex-row items-center mb-3">
        <View className="w-1.5 h-4 rounded-full bg-blue-600 mr-2" />
        <ThemedText
          className={`text-lg font-bold tracking-tight ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Why Criconic
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, gap: 12 }}
      >
        {FEATURES.map((feature) => {
          const IconComponent =
            feature.iconSet === "material" ? MaterialCommunityIcons : Ionicons;
          return (
            <View
              key={feature.key}
              className={`rounded-2xl border p-4 ${
                isDarkMode
                  ? "bg-gray-800/80 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
              style={{
                width: 178,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDarkMode ? 0.25 : 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <LinearGradient
                colors={feature.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <IconComponent name={feature.icon} size={20} color="#FFFFFF" />
              </LinearGradient>

              <ThemedText
                className={`text-sm font-bold mb-1 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {feature.title}
              </ThemedText>
              <ThemedText
                className={`text-xs leading-4 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {feature.description}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

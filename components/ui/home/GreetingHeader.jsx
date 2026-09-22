import React from "react";
import { View } from "react-native";
import { useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import useAppTheme from "@/hooks/useAppTheme";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function GreetingHeader() {
  const { isDarkMode } = useAppTheme();
  const authUser = useSelector((state) => state.auth?.user);
  const displayName = authUser?.name || authUser?.username || "";
  const firstName = displayName.trim().split(/\s+/)[0];

  return (
    <View className="mt-3 mb-1 flex-row items-center justify-between">
      <View>
        <ThemedText
          className={`text-xs font-semibold ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {getGreeting()}{firstName ? `, ${firstName}` : ""} 👋
        </ThemedText>
        <ThemedText
          className={`text-xl font-extrabold mt-0.5 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          What's the game today?
        </ThemedText>
      </View>

      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          isDarkMode ? "bg-gray-800" : "bg-blue-50"
        }`}
      >
        <Ionicons
          name="baseball-outline"
          size={20}
          color={isDarkMode ? "#60A5FA" : "#2563EB"}
        />
      </View>
    </View>
  );
}

import React from "react";
import { View, TouchableOpacity, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from '@expo/vector-icons/Ionicons';
import Marquee from "../Marquee";

export default function Header({ description }) {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

  return (
    <View
      className={`flex-row p-3 items-center z-10 ${
        isDark ? "bg-gray-900/90 border-b border-gray-800" : "bg-white/80 border-b border-gray-100"
      }`}
    >
      <TouchableOpacity
        className="justify-center items-center shrink-0 p-1"
        onPress={handleBackPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color={isDark ? "#FFFFFF" : "#1E293B"} />
      </TouchableOpacity>
      <View className="flex-1 ml-3 overflow-hidden">
        <Marquee
          description={description}
          className={`font-medium text-lg ${isDark ? "text-white" : "text-gray-900"}`}
          textStyle={{ color: isDark ? "#FFFFFF" : "#0F172A", fontSize: 18, fontWeight: "600" }}
        />
      </View>
    </View>
  );
}

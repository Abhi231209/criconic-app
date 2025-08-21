import React from "react";
import { View, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from '@expo/vector-icons/Ionicons';
import Marquee from "../Marquee";

// No Box imported!

export default function Header({ description }) {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home"); // Change if needed
    }
  };

  return (
    <View className="flex-row p-3 items-center bg-white/70 backdrop-blur-lg z-10">
      <TouchableOpacity
        className="justify-center items-center shrink-0"
        onPress={handleBackPress}
      >
        <Ionicons name="chevron-back" size={24} color="black" />
      </TouchableOpacity>
      <View className="flex-1 ml-4 overflow-hidden">
        <Marquee
          description={description}
          className="font-medium text-lg"
        />
      </View>
    </View>
  );
}

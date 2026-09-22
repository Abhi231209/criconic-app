import React from "react";
import { View, TouchableOpacity, ImageBackground } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import useRequireAuth from "@/hooks/useRequireAuth";

export default function CtaBanner() {
  const navigation = useNavigation();
  const { requireAuth } = useRequireAuth(navigation);

  return (
    <View
      className="rounded-2xl overflow-hidden mb-5"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
      }}
    >
      <ImageBackground
        source={require("../../../assets/stadium-background-image.jpg")}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(37,99,235,0.92)", "rgba(29,78,216,0.96)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-5"
        >
          <View className="w-9 h-9 rounded-full bg-white/20 items-center justify-center mb-3">
            <Ionicons name="flash" size={18} color="#FFFFFF" />
          </View>

          <ThemedText className="text-white text-lg font-extrabold">
            Ready to score your next match?
          </ThemedText>
          <ThemedText className="text-blue-100 text-xs mt-1 leading-4">
            Set up teams, toss and overs in under a minute — free forever for grassroots cricket.
          </ThemedText>

          <View className="flex-row mt-4" style={{ gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => requireAuth(() => navigation.navigate(SCREENS.CreateMatch))}
              className="bg-white px-4 py-2.5 rounded-xl flex-row items-center"
            >
              <ThemedText className="text-blue-700 text-xs font-extrabold mr-1">
                Create Match
              </ThemedText>
              <Ionicons name="arrow-forward" size={14} color="#1D4ED8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate(SCREENS.AllTournaments)}
              className="border border-white/40 px-4 py-2.5 rounded-xl"
            >
              <ThemedText className="text-white text-xs font-bold">
                Explore Tournaments
              </ThemedText>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

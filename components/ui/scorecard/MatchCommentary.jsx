import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeInRight, SlideInLeft, ZoomIn } from "react-native-reanimated";
import ThemedText from "../custom/ThemedText";

export default function MatchCommentary({ commentaryMap }) {
  return commentaryMap?.map((commentary, i) => (
    <Animated.View
      key={i}
      entering={SlideInLeft.delay(i * 150).springify().damping(12)}
      className="flex flex-row items-center border border-gray-300 rounded-lg bg-white shadow-sm mx-2 my-1 overflow-hidden"
    >
      {/* Over and Runs section with subtle animation */}
      <Animated.View 
        entering={ZoomIn.delay(i * 150 + 50)}
        className="border-r border-gray-200 p-3 bg-gray-50 rounded-l-lg"
      >
        <View className="items-center justify-center min-w-[60px]">
          <ThemedText className="text-sm font-bold text-gray-700">
            {commentary?.over || "0.0"}
          </ThemedText>
          <ThemedText className="text-xs text-green-600 font-medium">
            {commentary.runs || 0} runs
          </ThemedText>
        </View>
      </Animated.View>

      {/* Commentary message with fade animation */}
      <Animated.View 
        entering={FadeInRight.delay(i * 150 + 100)}
        className="flex-1 p-3 justify-center"
      >
        <ThemedText className="text-sm text-gray-800 text-center">
          {commentary?.message || ""}
        </ThemedText>
      </Animated.View>
    </Animated.View>
  ));
}
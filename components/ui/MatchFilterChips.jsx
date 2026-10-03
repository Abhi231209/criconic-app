import React from "react";
import { View, TouchableOpacity, ScrollView, useColorScheme } from "react-native";
import ThemedText from "@/components/ui/custom/ThemedText";

// The filters offered on every list of matches.
export const MATCH_FILTERS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "stream", label: "Streaming 📹" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

// The query params the server filters a match list by (see the server's
// listFilterCondition), so a filter covers every match, not only the pages
// already loaded.
export const matchFilterParams = (filterId) => {
  if (filterId === "stream") return { streamed: "true" };
  if (filterId === "live" || filterId === "upcoming" || filterId === "completed") {
    return { status: filterId };
  }
  return {};
};

// Appends a filter's params to a request path.
export const withMatchFilter = (path, filterId) => {
  const query = new URLSearchParams(matchFilterParams(filterId)).toString();
  if (!query) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
};

export default function MatchFilterChips({ value, onChange, style }) {
  const isDarkMode = useColorScheme() === "dark";
  return (
    <View style={style}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {MATCH_FILTERS.map((item) => {
          const isActive = value === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onChange(item.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`px-4 py-1.5 rounded-full mr-2 border ${
                isActive
                  ? "bg-blue-600 border-blue-500"
                  : isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <ThemedText
                className={`text-xs font-semibold ${
                  isActive ? "text-white" : isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

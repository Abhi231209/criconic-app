import React from "react";
import { View, useWindowDimensions } from "react-native";
import { Box, HStack, VStack } from "@gluestack-ui/themed";
import Animated, { FadeIn } from "react-native-reanimated";
import ThemedText from "./ThemedText";

function CustomTable({ caption, header = [], data = [] }) {
  const { width } = useWindowDimensions();

  // Ultra-compact columns for cricket scores
  const columnWidths = [140, 35, 35, 35, 35, 45]; // Batsmen, R, B, 4s, 6s, SR

  return (
    <Box className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Caption */}
      {caption && (
        <Box className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <ThemedText className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-center">
            {caption}
          </ThemedText>
        </Box>
      )}

      {/* Header Row */}
      <HStack className="bg-gray-100 dark:bg-gray-700">
        {header?.map((head, i) => (
          <View
            key={`header-${i}`}
            style={{
              width: columnWidths[i] || 40,
              padding: 6,
              alignItems: i === 0 ? "flex-start" : "center",
              justifyContent: "center",
              borderRightWidth: i < header.length - 1 ? 1 : 0,
              borderRightColor: "#e5e7eb",
            }}
          >
            <ThemedText className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {head.label || head}
            </ThemedText>
          </View>
        ))}
      </HStack>

      {/* Data Rows */}
      <VStack>
        {data?.map((row, rIndex) =>
          row ? (
            <Animated.View
              key={`row-${rIndex}`}
              entering={FadeIn.delay(rIndex * 20)}
            >
              <HStack className="border-b border-gray-100 dark:border-gray-600">
                {Array.isArray(row)
                  ? row.map((col, cIndex) => (
                      <View
                        key={`cell-${rIndex}-${cIndex}`}
                        style={{
                          width: columnWidths[cIndex] || 40,
                          padding: 6,
                          alignItems: cIndex === 0 ? "flex-start" : "center",
                          justifyContent: "center",
                          borderRightWidth: cIndex < row.length - 1 ? 1 : 0,
                          borderRightColor: "#e5e7eb",
                        }}
                      >
                        <ThemedText className="text-xs text-gray-700 dark:text-gray-300">
                          {col.label || col}
                        </ThemedText>
                      </View>
                    ))
                  : Object.keys(row).map((colKey, cIndex) => (
                      <View
                        key={`cell-${rIndex}-${cIndex}`}
                        style={{
                          width: columnWidths[cIndex] || 40,
                          padding: 6,
                          alignItems: cIndex === 0 ? "flex-start" : "center",
                          justifyContent: "center",
                          borderRightWidth: cIndex < Object.keys(row).length - 1 ? 1 : 0,
                          borderRightColor: "#e5e7eb",
                        }}
                      >
                        <ThemedText className="text-xs text-gray-700 dark:text-gray-300">
                          {typeof row[colKey] === "object"
                            ? row[colKey]?.label || ""
                            : row[colKey]}
                        </ThemedText>
                      </View>
                    ))}
              </HStack>
            </Animated.View>
          ) : null
        )}
      </VStack>

      {/* Empty state */}
      {(!data || data.length === 0) && (
        <Box className="p-3">
          <ThemedText className="text-gray-500 dark:text-gray-400 text-center text-xs">
            No data available
          </ThemedText>
        </Box>
      )}
    </Box>
  );
}

export default CustomTable;
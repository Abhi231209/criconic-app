import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import ThemedText from "../custom/ThemedText";
// import { getBallColor } from "@/utils"; // adjust path for RN project

export default function BallPreview({ ball, isIpl2025 }) {
  const [fontSize, setFontSize] = useState(14);

  // utils/getBallColor.js

function getBallColor(ball) {
  if (!ball) return "#9ca3af"; // gray for undefined/empty

  const value = ball.toString().toUpperCase().trim();

  switch (value) {
    // Runs
    case "0":
      return "#4b5563"; // dark gray for dot ball
    case "1":
    case "2":
    case "3":
      return "#22c55e"; // green for normal runs
    case "4":
    case "4 FOUR":
      return "#3b82f6"; // blue for boundary
    case "6":
    case "6 SIX":
      return "#eab308"; // yellow/gold for six

    // Extras
    case "WD":
      return "#f97316"; // orange for wide
    case "NB":
      return "#ef4444"; // red for no ball
    case "BYE":
      return "#06b6d4"; // cyan for bye
    case "LB":
      return "#0ea5e9"; // light blue for leg bye

    // Wicket
    case "W":
    case "OUT":
      return "#dc2626"; // dark red for wicket

    // Special / multiple runs (like "5", "7")
    case "5":
    case "7":
    case "5,7":
      return "#a855f7"; // purple

    default:
      return "#9ca3af"; // neutral gray for unknown
  }
}


  useEffect(() => {
    console.log("Ball value:", ball);
    if (ball) {
      const stringBall = ball.toString();
      if (stringBall.length === 1) {
        setFontSize(16);
      } else {
        // adjust dynamically based on length
        const containerWidth = 25;
        const newSize = Math.max(10, containerWidth / stringBall.length);
        setFontSize(newSize);
      }
    }
  }, [ball]);

  return (
    <View
      className={`rounded-full items-center justify-center m-1 ${
        isIpl2025 ? "bg-purple-600" : ""
      }`}
      style={{
        width: 28,
        height: 28,
        backgroundColor: getBallColor(ball), // dynamic color function
      }}
    >
      <ThemedText
        className="font-bold text-white uppercase"
        style={{ fontSize }}
      >
        {ball}
      </ThemedText>
    </View>
  );
}

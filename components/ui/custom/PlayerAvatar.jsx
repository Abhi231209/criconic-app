import React, { useState } from "react";
import { View, Image, useColorScheme } from "react-native";
import ThemedText from "./ThemedText";
import { getImageFullUrl } from "@/utils";

export default function PlayerAvatar({
  player,
  size = 36,
  className = "",
  style,
}) {
  const [hasError, setHasError] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const rawImgUri =
    player?.profileImg ||
    player?.profileImage ||
    player?.image ||
    player?.avatar ||
    player?.photo ||
    player?.raw?.profileImg ||
    player?.raw?.profileImage ||
    player?.raw?.image ||
    player?.raw?.avatar ||
    player?.raw?.photo ||
    (typeof player === "object" && typeof player?.image === "string" ? player.image : null);

  const imgUri = rawImgUri ? getImageFullUrl(rawImgUri) : null;

  React.useEffect(() => {
    setHasError(false);
  }, [imgUri]);

  const name =
    player?.name ||
    player?.username ||
    player?.playerName ||
    (typeof player === "string" ? player : "P");

  const initials = name
    .trim()
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "P";

  if (imgUri && typeof imgUri === "string" && imgUri.trim().length > 0 && !hasError) {
    return (
      <Image
        source={{ uri: imgUri.trim() }}
        onError={() => setHasError(true)}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        className={`border ${isDark ? "border-gray-700" : "border-gray-200"} ${className}`}
      />
    );
  }

  const fontSize = Math.max(10, Math.round(size * 0.38));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      className={`items-center justify-center border ${
        isDark
          ? "bg-gray-800 border-gray-700"
          : "bg-blue-50 border-blue-200"
      } ${className}`}
    >
      <ThemedText
        className={`font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}
        style={{ fontSize, lineHeight: Math.round(fontSize * 1.3) }}
      >
        {initials}
      </ThemedText>
    </View>
  );
}

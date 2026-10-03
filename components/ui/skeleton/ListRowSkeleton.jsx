import React from "react";
import { View, useColorScheme } from "react-native";
import SkeletonBlock from "./SkeletonBlock";

// Placeholder for tournament / team / player list rows: optional banner,
// optional rank circle, avatar/logo, a title line plus `lines` subtitle lines,
// optional trailing pill and optional divider footer. Pass `style` to match
// the real row's card (radius, padding, background, margins).
export default function ListRowSkeleton({
  avatarSize = 48,
  avatarRadius,
  rank = false,
  badge = false,
  lines = 1,
  footer = false,
  bannerHeight = 0,
  style,
}) {
  const isDarkMode = useColorScheme() === "dark";
  const dividerColor = isDarkMode ? "rgba(55, 65, 81, 0.6)" : "#F3F4F6";

  const body = (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {rank && (
          <View style={{ width: 36, marginRight: 8, alignItems: "center" }}>
            <SkeletonBlock width={28} height={28} radius={14} />
          </View>
        )}
        {avatarSize > 0 && (
          <SkeletonBlock
            width={avatarSize}
            height={avatarSize}
            radius={avatarRadius ?? avatarSize / 2}
            style={{ marginRight: 12 }}
          />
        )}
        <View style={{ flex: 1, marginRight: badge ? 8 : 0 }}>
          <SkeletonBlock width="70%" height={14} style={{ marginVertical: 2 }} />
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonBlock
              key={i}
              width={i % 2 === 0 ? "45%" : "35%"}
              height={10}
              style={{ marginTop: 8 }}
            />
          ))}
        </View>
        {badge && <SkeletonBlock width={56} height={22} radius={11} />}
      </View>

      {footer && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: dividerColor,
          }}
        >
          <SkeletonBlock width={80} height={12} />
          <SkeletonBlock width={80} height={12} />
        </View>
      )}
    </View>
  );

  return (
    <View
      style={[
        {
          width: "100%",
          borderRadius: 16,
          borderWidth: 1,
          overflow: "hidden",
          marginBottom: 12,
          padding: bannerHeight ? 0 : 16,
          backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
          borderColor: isDarkMode ? "#374151" : "#F3F4F6",
        },
        style,
      ]}
    >
      {bannerHeight ? (
        <>
          <SkeletonBlock width="100%" height={bannerHeight} radius={0} />
          <View style={{ padding: 16, paddingTop: 12 }}>{body}</View>
        </>
      ) : (
        body
      )}
    </View>
  );
}

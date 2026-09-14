import React, { useState, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { WebView } from "react-native-webview";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";

export const extractYouTubeVideoId = (url) => {
  if (!url || typeof url !== "string") return null;
  const clean = url.trim();

  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Parameter-based: ?v=ID or &v=ID
  const vMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch && vMatch[1]) {
    return vMatch[1];
  }

  // Path-based: youtu.be/ID, /embed/ID, /live/ID, /shorts/ID, /v/ID
  const pathMatch = clean.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|live\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/i
  );
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  return null;
};

export const isFacebookVideoUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return /facebook\.com|fb\.watch/i.test(url);
};

export const isValidVideoUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  if (
    !clean ||
    clean === "null" ||
    clean === "undefined" ||
    clean === "false" ||
    clean === "true" ||
    clean === "[object Object]"
  ) {
    return false;
  }
  return (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("rtmp://") ||
    /^[a-zA-Z0-9_-]{11}$/.test(clean)
  );
};

export default function MatchVideoPlayer({
  streamUrl,
  isDarkMode = false,
  onEditStream = null,
  canEdit = true,
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isValid = useMemo(() => isValidVideoUrl(streamUrl), [streamUrl]);

  const youtubeVideoId = useMemo(
    () => (isValid ? extractYouTubeVideoId(streamUrl) : null),
    [isValid, streamUrl]
  );
  const isFb = useMemo(
    () => (isValid ? isFacebookVideoUrl(streamUrl) : false),
    [isValid, streamUrl]
  );

  // Construct WebView source with proper origin and baseUrl
  const webViewSource = useMemo(() => {
    if (!isValid || !streamUrl) return null;

    if (youtubeVideoId) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta name="referrer" content="strict-origin-when-cross-origin">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; background-color: #000; }
              html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
              .video-wrapper { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <div class="video-wrapper">
              <iframe
                id="player"
                src="https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&origin=https://criconic.com"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
              ></iframe>
            </div>
          </body>
        </html>
      `;
      return { html, baseUrl: "https://criconic.com" };
    }

    if (isFb) {
      const encodedUrl = encodeURIComponent(streamUrl);
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta name="referrer" content="strict-origin-when-cross-origin">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; background-color: #000; }
              html, body { width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe
              src="https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&autoplay=true"
              frameborder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          </body>
        </html>
      `;
      return { html, baseUrl: "https://criconic.com" };
    }

    // Generic direct URL (m3u8, web stream, etc.)
    return { uri: streamUrl };
  }, [streamUrl, youtubeVideoId, isFb]);

  if (!isValid || !streamUrl) return null;

  return (
    <View
      className={`w-full overflow-hidden border-b ${
        isDarkMode
          ? "bg-black border-gray-800"
          : "bg-slate-950 border-slate-800"
      }`}
    >
      {/* Top Header Controls Bar */}
      <View className="flex-row items-center justify-between px-3 py-1.5 bg-black/90">
        <View className="flex-row items-center gap-2">
          {/* Pulsating Red Live Dot */}
          <View className="flex-row items-center px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40">
            <View className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
            <ThemedText className="text-[10px] font-black uppercase tracking-wider text-red-400">
              Live Stream
            </ThemedText>
          </View>

          {isFb && (
            <View className="px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-500/30">
              <ThemedText className="text-[10px] font-medium text-blue-300">
                Facebook
              </ThemedText>
            </View>
          )}

          {Boolean(youtubeVideoId) && (
            <View className="px-1.5 py-0.5 rounded bg-red-900/40 border border-red-500/30">
              <ThemedText className="text-[10px] font-medium text-red-300">
                YouTube
              </ThemedText>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-1">
          {/* Edit / Change Link Button */}
          {Boolean(onEditStream && canEdit) && (
            <TouchableOpacity
              onPress={onEditStream}
              className="p-1.5 rounded-lg bg-white/10 active:bg-white/20"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Edit stream link"
            >
              <Ionicons name="pencil" size={14} color="#CBD5E1" />
            </TouchableOpacity>
          )}

          {/* Minimize / Expand Toggle */}
          <TouchableOpacity
            onPress={() => setIsMinimized((prev) => !prev)}
            className="p-1.5 rounded-lg bg-white/10 active:bg-white/20"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={isMinimized ? "Expand stream" : "Minimize stream"}
          >
            <Ionicons
              name={isMinimized ? "chevron-down" : "chevron-up"}
              size={15}
              color="#CBD5E1"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Content Container */}
      {!isMinimized ? (
        <View
          style={styles.playerContainer}
          className="relative w-full bg-black"
        >
          {webViewSource && (
            <WebView
              source={webViewSource}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="always"
              scrollEnabled={false}
              bounces={false}
              androidHardwareAccelerationDisabled={false}
              userAgent={
                Platform.OS === "android"
                  ? "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36"
                  : undefined
              }
              onLoadStart={() => {
                setIsLoading(true);
                setHasError(false);
              }}
              onLoadEnd={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              originWhitelist={["*"]}
            />
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <View
              style={StyleSheet.absoluteFillObject}
              className="items-center justify-center bg-black/70"
            >
              <ActivityIndicator size="small" color="#EF4444" />
              <ThemedText className="text-white text-xs mt-2 font-medium">
                Loading live stream...
              </ThemedText>
            </View>
          )}

          {/* Error Fallback (strictly in-app, no redirects) */}
          {hasError && (
            <View
              style={StyleSheet.absoluteFillObject}
              className="items-center justify-center bg-gray-900/95 p-4"
            >
              <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
              <ThemedText className="text-white text-sm font-semibold mt-2 text-center">
                Live Stream Unavailable
              </ThemedText>
              <ThemedText className="text-gray-400 text-xs mt-1 text-center px-4">
                The live stream might be offline or currently unavailable.
              </ThemedText>
            </View>
          )}
        </View>
      ) : (
        /* Minimized Ribbon Bar */
        <TouchableOpacity
          onPress={() => setIsMinimized(false)}
          className="flex-row items-center justify-between px-3 py-2 bg-slate-900 active:bg-slate-800"
        >
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-red-500" />
            <ThemedText className="text-xs font-medium text-slate-300">
              Live Video Minimized — Tap to expand
            </ThemedText>
          </View>
          <Ionicons name="expand-outline" size={14} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  playerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    maxHeight: 250,
  },
  webView: {
    flex: 1,
    backgroundColor: "#000000",
  },
});

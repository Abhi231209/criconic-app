import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "@/contexts/SocketContext";
import { navigationRef } from "@/navigation/navigationRef";
import SCREENS from "@/screens";

// The connection has to stay down this long before the bar shows, so that
// starting the app, logging in (the socket reconnects with the new login)
// and coming back from the background don't flash it.
const OFFLINE_GRACE_MS = 2500;
const BACK_ONLINE_MS = 2000;

// Screens with their own, more detailed, offline banner.
const HIDDEN_ON = [SCREENS.ScorerScreen];

/**
 * App-wide "offline mode" bar. Sits above the navigator (pushing the screens
 * down, below the status bar) while the app has no connection to the server,
 * and briefly confirms when the connection is back.
 *
 * The app's live connection is the only signal there is, so the bar can't
 * tell "the phone has no internet" from "the server can't be reached".
 */
export default function OfflineBanner() {
  const { isConnected } = useSocket();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState("online"); // "online" | "offline" | "restored"
  const statusRef = useRef(status);
  statusRef.current = status;
  const [routeName, setRouteName] = useState(null);

  useEffect(() => {
    if (isConnected) {
      if (statusRef.current !== "offline") {
        setStatus("online");
        return undefined;
      }
      setStatus("restored");
      const timer = setTimeout(() => setStatus("online"), BACK_ONLINE_MS);
      return () => clearTimeout(timer);
    }

    if (statusRef.current === "restored") setStatus("online");
    let timer = setTimeout(() => setStatus("offline"), OFFLINE_GRACE_MS);
    // Back from the background the connection is usually just being
    // re-opened: give it the grace period again before calling it offline.
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "active" && statusRef.current !== "offline") {
        clearTimeout(timer);
        timer = setTimeout(() => setStatus("offline"), OFFLINE_GRACE_MS);
      }
    });
    return () => {
      clearTimeout(timer);
      appStateSub?.remove();
    };
  }, [isConnected]);

  useEffect(() => {
    const readRoute = () => {
      if (navigationRef.isReady()) setRouteName(navigationRef.getCurrentRoute()?.name || null);
    };
    readRoute();
    return navigationRef.addListener("state", readRoute);
  }, []);

  if (status === "online" || HIDDEN_ON.includes(routeName)) return null;

  const offline = status === "offline";
  const color = offline ? "#1F2937" : "#FFFFFF";
  return (
    <View
      style={[styles.bar, { paddingTop: insets.top, backgroundColor: offline ? "#F59E0B" : "#16A34A" }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <StatusBar style={offline ? "dark" : "light"} />
      <View style={styles.row}>
        <Ionicons name={offline ? "cloud-offline-outline" : "cloud-done-outline"} size={14} color={color} />
        <Text style={[styles.text, { color }]} numberOfLines={1}>
          {offline ? "Offline mode — no connection. Check your internet." : "Back online"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  text: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
  },
});

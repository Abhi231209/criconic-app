import { useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { useSocket } from "@/contexts/SocketContext";

// Tells the server this match is on screen, so its notifications (match
// started, innings break, result…) skip this user — they're watching it
// happen already. Only counts while the screen is focused and the app is in
// the foreground; a match left open in a background tab still notifies.
export default function useWatchMatch(matchId) {
  const { emit, isConnected } = useSocket();

  // Read the navigation context directly rather than useIsFocused, which
  // throws when a card is rendered outside a screen (e.g. in a sheet).
  const navigation = useContext(NavigationContext);
  const [isFocused, setIsFocused] = useState(() => navigation?.isFocused?.() ?? true);
  useEffect(() => {
    if (!navigation) return undefined;
    setIsFocused(navigation.isFocused());
    const unsubscribeFocus = navigation.addListener("focus", () => setIsFocused(true));
    const unsubscribeBlur = navigation.addListener("blur", () => setIsFocused(false));
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  const [isActive, setIsActive] = useState(AppState.currentState !== "background");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setIsActive(state === "active")
    );
    return () => subscription.remove();
  }, []);

  const id = matchId ? String(matchId) : null;
  const watching = Boolean(id) && isFocused && isActive && isConnected;

  // Re-runs on reconnect (isConnected flips back to true), since a new
  // socket starts outside every room.
  useEffect(() => {
    if (!watching) return undefined;
    emit("watch_match", { matchId: id });
    return () => emit("unwatch_match", { matchId: id });
  }, [watching, id, emit]);
}

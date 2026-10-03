import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userApi } from "./api";
import { showGlobalAlert } from "@/contexts/AlertContext";

// Suppress the OS banner while the app is foregrounded: the socket
// "notification" listener (see AppContent in App.js) already shows an
// in-app alert for the same event in real time, and firing both would mean
// two alerts for one event. Backgrounded/closed app is unaffected — this
// handler only runs while the app is in the foreground; the OS shows the
// push banner normally otherwise.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let registeredToken = null;

// Registers this device for push. Shows the system permission prompt only
// when `ask` is true; otherwise it just registers if permission was already
// given (login and app start call it that way). See askForPushPermission.
export async function registerForPushNotificationsAsync({ ask = false } = {}) {
  if (!Device.isDevice) {
    console.log("🔔 [Notifications] Skipping push registration on simulator/emulator");
    return null;
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      if (!ask) return null;
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("🔔 [Notifications] Permission not granted");
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data;
    if (!token) return null;

    registeredToken = token;
    await userApi.registerPushToken(token);
    console.log("🔔 [Notifications] Registered push token");
    return token;
  } catch (err) {
    console.warn("🔔 [Notifications] Failed to register for push notifications:", err);
    return null;
  }
}

export async function unregisterPushNotifications() {
  if (!registeredToken) return;
  try {
    await userApi.removePushToken(registeredToken);
  } catch (err) {
    console.warn("🔔 [Notifications] Failed to remove push token:", err);
  } finally {
    registeredToken = null;
  }
}

// The system prompt can't be shown again once declined (iOS), so explain what
// the alerts are first and only show it if the user wants them. "Not now" is
// respected for two weeks; this is asked at most once per app session.
const PROMPT_DISMISSED_KEY = "@criconic_push_prompt_dismissed";
const DISMISS_DAYS = 14;
let askedThisSession = false;

export async function askForPushPermission() {
  if (askedThisSession || !Device.isDevice) return;
  askedThisSession = true;
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      registerForPushNotificationsAsync();
      return;
    }
    if (canAskAgain === false) return;
    const dismissedAt = Number(await AsyncStorage.getItem(PROMPT_DISMISSED_KEY));
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    showGlobalAlert({
      title: "Match alerts",
      message:
        "Get a notification when your matches start, at the innings break and with the result, and when you're added to a team. You can change this any time in Settings.",
      type: "info",
      confirmText: "Turn on",
      cancelText: "Not now",
      onConfirm: () => registerForPushNotificationsAsync({ ask: true }),
      onCancel: () => AsyncStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now())).catch(() => {}),
    });
  } catch (err) {
    console.warn("🔔 [Notifications] Couldn't check push permission:", err);
  }
}

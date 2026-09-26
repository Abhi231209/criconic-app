import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { userApi } from "./api";

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

export async function registerForPushNotificationsAsync() {
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

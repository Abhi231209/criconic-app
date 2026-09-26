import "react-native-gesture-handler"; // 👈 MUST be first
import "react-native-reanimated";
import "./global.css";

import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, useColorScheme, KeyboardAvoidingView, Platform } from "react-native";
import { useFonts } from "expo-font";
import {
  DarkerGrotesque_400Regular,
  DarkerGrotesque_500Medium,
  DarkerGrotesque_600SemiBold,
  DarkerGrotesque_700Bold,
  DarkerGrotesque_800ExtraBold,
  DarkerGrotesque_900Black,
} from "@expo-google-fonts/darker-grotesque";

import ThemedText from "./components/ui/custom/ThemedText";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./navigation/AppNavigator";
import { config } from "@gluestack-ui/config";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { Provider } from "react-redux";
import { persistor, store } from "./redux/store";
import { PersistGate } from "redux-persist/integration/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect, useRef } from "react";
import { NavigationContainer, DarkTheme, DefaultTheme, useNavigationContainerRef } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SocketProvider, useSocket } from "./contexts/SocketContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import useAppTheme from "./hooks/useAppTheme";
import { BottomSheetProvider } from "./components/ui/custom/CustomBottomSheet";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { AlertProvider, showGlobalAlert } from "./contexts/AlertContext";
import { initSessionCookie, authApi } from "./utils/api";
import { login as loginAction } from "./redux/authSlice";
import User from "./utils/User";
import analytics from "./utils/analytics";
import { registerForPushNotificationsAsync, unregisterPushNotifications } from "./utils/notifications";

import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";

// Disable strict mode warnings in Reanimated to prevent render crashes on theme changes
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Real-time in-app alert for whichever match/team events the server decides
// this user should see (see server NotificationService) — the foreground
// counterpart to the push notifications handled in utils/notifications.js,
// which take over once the app is backgrounded. Rendered inside
// SocketProvider (below) so useSocket() resolves to the real connection.
function SocketNotificationListener() {
  const { on, off } = useSocket();

  useEffect(() => {
    const handleNotification = (payload) => {
      if (!payload?.title) return;
      showGlobalAlert({
        title: payload.title,
        message: payload.body || "",
        confirmText: "OK",
      });
    };
    on("notification", handleNotification);
    return () => off("notification", handleNotification);
  }, [on, off]);

  return null;
}

function AppContent() {
  const { isDark } = useAppTheme();
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef();
  const isLoggedIn = useSelector((state) => state.auth.is_logged_in);

  // Register (or re-register) this device for push once we have an
  // authenticated session — covers both a fresh login and session restore
  // on app start, since both dispatch the same redux auth state.
  useEffect(() => {
    if (isLoggedIn) {
      registerForPushNotificationsAsync();
    } else {
      unregisterPushNotifications();
    }
  }, [isLoggedIn]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={isDark ? DarkTheme : DefaultTheme}
      onReady={() => {
        const currentRoute = navigationRef.getCurrentRoute();
        const currentRouteName = currentRoute?.name;
        routeNameRef.current = currentRouteName;
        if (currentRouteName) {
          analytics.logScreenView(currentRouteName, currentRouteName, currentRoute?.params || {});
        }
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRoute = navigationRef.getCurrentRoute();
        const currentRouteName = currentRoute?.name;

        if (currentRouteName && previousRouteName !== currentRouteName) {
          analytics.logScreenView(currentRouteName, currentRouteName, {
            previous_screen: previousRouteName || "none",
            ...(currentRoute?.params || {}),
          });
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      <SocketProvider>
        <SocketNotificationListener />
        <BottomSheetModalProvider>
          <BottomSheetProvider>
            <AlertProvider>
              <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <AppNavigator />
              </KeyboardAvoidingView>
              <StatusBar style={isDark ? "light" : "dark"} />
            </AlertProvider>
          </BottomSheetProvider>
        </BottomSheetModalProvider>
      </SocketProvider>
    </NavigationContainer>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    DarkerGrotesque_400Regular,
    DarkerGrotesque_500Medium,
    DarkerGrotesque_600SemiBold,
    DarkerGrotesque_700Bold,
    DarkerGrotesque_800ExtraBold,
    DarkerGrotesque_900Black,
  });

  const colorScheme = useColorScheme();

  useEffect(() => {
    console.log("Detected color scheme:", colorScheme);
  }, [colorScheme]);

  // Check auth session on startup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await initSessionCookie();
        const res = await authApi.checkStatus();
        if (res?.data?.success && res?.data?.user) {
          console.log("🔐 [App] Session active on backend:", res.data.user.username);
          store.dispatch(loginAction(res.data.user));
          User.login(res.data.user);
          const uid = res.data.user._id || res.data.user.id || res.data.user.userId;
          if (uid) analytics.setUserId(uid);
        }
      } catch (err) {
        console.warn("🔐 [App] Auth status check error:", err);
      }
    };
    checkAuth();
  }, []);

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <GluestackUIProvider config={config}>
              <SafeAreaProvider>
                <ThemeProvider>
                  <AppContent />
                </ThemeProvider>
              </SafeAreaProvider>
            </GluestackUIProvider>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardAvoiding: {
    flex: 1,
  },
});

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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SocketProvider } from "./contexts/SocketContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import useAppTheme from "./hooks/useAppTheme";
import { BottomSheetProvider } from "./components/ui/custom/CustomBottomSheet";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { AlertProvider } from "./contexts/AlertContext";
import { initSessionCookie, authApi } from "./utils/api";
import { login as loginAction } from "./redux/authSlice";
import User from "./utils/User";
import analytics from "./utils/analytics";

import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";

// Disable strict mode warnings in Reanimated to prevent render crashes on theme changes
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

function AppContent() {
  const { isDark } = useAppTheme();
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef();

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
      <BottomSheetModalProvider>
        <BottomSheetProvider>
          <AlertProvider>
            <SocketProvider>
              <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <AppNavigator />
              </KeyboardAvoidingView>
              <StatusBar style={isDark ? "light" : "dark"} />
            </SocketProvider>
          </AlertProvider>
        </BottomSheetProvider>
      </BottomSheetModalProvider>
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

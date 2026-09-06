import "react-native-gesture-handler"; // 👈 MUST be first
import "react-native-reanimated";
import "./global.css";

import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SocketProvider } from "./contexts/SocketContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import useAppTheme from "./hooks/useAppTheme";
import { BottomSheetProvider } from "./components/ui/custom/CustomBottomSheet";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { initSessionCookie, authApi } from "./utils/api";
import { login as loginAction } from "./redux/authSlice";
import User from "./utils/User";

function AppContent() {
  const { isDark } = useAppTheme();

  return (
    <BottomSheetModalProvider>
      <BottomSheetProvider>
        <SocketProvider>
          <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
            <AppNavigator />
            <StatusBar style={isDark ? "light" : "dark"} />
          </NavigationContainer>
        </SocketProvider>
      </BottomSheetProvider>
    </BottomSheetModalProvider>
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
        <QueryClientProvider client={queryClient}>
          <GluestackUIProvider config={config}>
            <SafeAreaProvider>
              <ThemeProvider>
                <AppContent />
              </ThemeProvider>
            </SafeAreaProvider>
          </GluestackUIProvider>
        </QueryClientProvider>
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
});

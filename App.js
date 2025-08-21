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
import { Provider, useDispatch, useSelector } from "react-redux";
import { persistor, store } from "./redux/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const AppContent = () => {
  const isDark = false;
  return (
    <BottomSheetProvider>
      <NavigationContainer
      // theme={isDark ? DarkTheme : DefaultTheme}
      >
        <AppNavigator />
      </NavigationContainer>
    </BottomSheetProvider>
  );
};
export default function App() {
  const queryClient = new QueryClient();
  const [fontsLoaded] = useFonts({
    DarkerGrotesque_400Regular,
    DarkerGrotesque_500Medium,
    DarkerGrotesque_600SemiBold,
    DarkerGrotesque_700Bold,
    DarkerGrotesque_800ExtraBold,
    DarkerGrotesque_900Black,
  });

  // if (!fontsLoaded) return null;
  const colorScheme = useColorScheme();

  useEffect(() => {
    console.log("Detected color scheme:", colorScheme);
  }, [colorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <Provider store={store}>
            <GluestackUIProvider config={config}>
              <QueryClientProvider client={queryClient}>
                    <NavigationContainer>
                      <AppNavigator />
                    </NavigationContainer>
              </QueryClientProvider>
            </GluestackUIProvider>
          </Provider>
        </SafeAreaProvider>
      </BottomSheetModalProvider>
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

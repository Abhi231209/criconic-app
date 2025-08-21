import React from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import SCREENS from "@/screens";
import LoginScreen from "@/screens/LoginScreen";
import { View } from "react-native";
import Home from "@/screens/Home";
import AppDrawer from "@/navigation/AppDrawer";
import NavBar from "@/components/ui/NavBar";
import { createDrawerNavigator } from "@react-navigation/drawer";
import CustomDrawer from "@/components/ui/CustomDrawer";
import ScoreCard from "@/components/ui/ScoreCard";
import MatchScoreCard from "@/components/ui/scorecard/MatchScoreCard";
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();
export default function AppNavigator() {
  console.log("inside app Navigator 15");
  const isDark = false;
  return (
    // <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <Drawer.Navigator drawerContent={(props) => <CustomDrawer {...props} />}
              screenOptions={{
                drawerType: "back",
                headerShown: false, // Set true if you want header
                drawerStyle: { backgroundColor: "#fff", width: 240 },
              }}>
        {/* <View  className={isDark ? "dark " : ""}> */}
        <Drawer.Screen
          name={SCREENS.LoginScreen}
          component={LoginScreen}
          options={{
            swipeEnabled: false,
          }}
        />
        
        <Drawer.Screen name={SCREENS.MainDrawer} component={AppDrawer} />

        <Drawer.Screen
          name={SCREENS.NavBar}
          component={NavBar}
        />
        <Drawer.Screen
          name={SCREENS.Home}
          component={Home}
        />

        <Drawer.Screen name={SCREENS.ScoreCard} component={ScoreCard} />
        <Drawer.Screen name={SCREENS.MatchScoreCard} component={MatchScoreCard} />
        

        {/* </View> */}
      </Drawer.Navigator>
    // </NavigationContainer>
  );
}

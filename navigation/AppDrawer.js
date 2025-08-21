import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import SCREENS from "@/screens";
import Home from "@/screens/Home";
import LoginScreen from "@/screens/LoginScreen";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { View, Text, Image } from "react-native";
import CustomDrawer from "../components/ui/CustomDrawer"
import NavBar from "@/components/ui/NavBar";
// import Home from "../../screens/Home";
// import LoginScreen from "../../screens/LoginScreen";
// import other screens as needed


const Drawer = createDrawerNavigator();

export default function AppDrawer() {

  console.log("inside app drawer")
  return (
    // <NavigationContainer>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          drawerType: "back",
          headerShown: false, // Set true if you want header
          drawerStyle: { backgroundColor: "#fff", width: 240 },
        }}
      >
        <Drawer.Screen
          name={SCREENS.NavBar}
          component={NavBar}
        />
        <Drawer.Screen name={"Home"} component={Home} />
        <Drawer.Screen name={"LoginScreen"} component={LoginScreen} />
        {/* Add more screens here */}
      </Drawer.Navigator>
    // </NavigationContainer>
  );
}
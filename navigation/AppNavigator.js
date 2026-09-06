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
import CreateTournament from "@/components/ui/create/CreateTournament";
import CreateTeam from "@/components/ui/create/CreateTeam";
import MyCricket from "@/components/ui/MyCricket";
import TeamProfile from "@/components/ui/profile/TeamProfile";
import EditTeam from "@/components/ui/profile/EditTeam";
import TournamentProfile from "@/components/ui/profile/TournamentProfile";
import EditTournament from "@/components/ui/profile/EditTournament";
import AddPlayer from "@/components/ui/create/AddPlayer";
import CreateMatch from "@/components/ui/createMatch/CreateMatch";
import SelectSquadScreen from "@/components/ui/createMatch/SelectSquadScreen";
import SelectTeamScreen from "@/components/ui/createMatch/SelectTeamScreen";
import MatchDetailsScreen from "@/components/ui/createMatch/MatchDetailsScreen";
import TossScreen from "@/components/ui/createMatch/TossScreen";
import PlayerSelectionScreen from "@/components/ui/createMatch/PlayerSelectionScreen";
import ScorerScreen from "@/components/ui/createMatch/ScorerScreen";
import PlayerProfile from "@/components/ui/profile/PlayerProfile";
import EditPlayerProfile from "@/components/ui/profile/EditPlayerProfile";
import Settings from "@/components/ui/Setting";
import AllTournaments from "@/components/ui/AllTournaments";
import Layout from "@/Layout";
import SearchScreen from "@/components/ui/SearchScreen";
import ChangeSquad from "@/components/ui/createMatch/ChangeSquad/ChangeSquad";
import ChangeBowler from "@/components/ui/createMatch/ChangeSquad/ChangeBowler";
import ThemeConfig from "@/components/ui/themeConfig/ThemeConfig";
import GoLiveSetupScreen from "@/components/ui/createMatch/GoLiveSetupScreen";
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide header for all stack screens
      }}
    >
      {/* <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} /> */}
      {/* <Stack.Screen name="MatchDetailsScreen" component={MatchDetailsScreen} /> */}
      <Stack.Screen
        name={SCREENS.LoginScreen}
        component={LoginScreen}
        options={{
          swipeEnabled: false,
        }}
      />

      <Stack.Screen name={SCREENS.MainDrawer} component={AppDrawer} />

      <Stack.Screen name={SCREENS.NavBar} component={NavBar} />
      <Stack.Screen name={SCREENS.Home} component={Home} />

      <Stack.Screen name={SCREENS.ScoreCard} component={ScoreCard} />
      <Stack.Screen name={SCREENS.MatchScoreCard} component={MatchScoreCard} />
      <Stack.Screen
        name={SCREENS.CreateTournament}
        component={CreateTournament}
      />
      <Stack.Screen name={SCREENS.CreateTeam} component={CreateTeam} />
      <Stack.Screen name={SCREENS.MyCricket} component={MyCricket} />
      <Stack.Screen name={SCREENS.TeamProfile} component={TeamProfile} />
      <Stack.Screen name={SCREENS.EditTeam} component={EditTeam} />
      <Stack.Screen
        name={SCREENS.TournamentProfile}
        component={TournamentProfile}
      />
      <Stack.Screen name={SCREENS.EditTournament} component={EditTournament} />
      <Stack.Screen name={SCREENS.AddPlayer} component={AddPlayer} />
      <Stack.Screen name={SCREENS.CreateMatch} component={CreateMatch} />
      <Stack.Screen
        name={SCREENS.SelectSquadScreen}
        component={SelectSquadScreen}
      />
      <Stack.Screen
        name={SCREENS.SelectTeamScreen}
        component={SelectTeamScreen}
      />
      <Stack.Screen
        name={SCREENS.MatchDetailsScreen}
        component={MatchDetailsScreen}
      />
      <Stack.Screen name={SCREENS.TossScreen} component={TossScreen} />
      <Stack.Screen
        name={SCREENS.PlayerSelectionScreen}
        component={PlayerSelectionScreen}
      />
      <Stack.Screen name={SCREENS.ScorerScreen} component={ScorerScreen} />
      <Stack.Screen name={SCREENS.PlayerProfile} component={PlayerProfile} />
      <Stack.Screen
        name={SCREENS.EditPlayerProfile}
        component={EditPlayerProfile}
      />
      <Stack.Screen name={SCREENS.Settings} component={Settings} />
      <Stack.Screen name={SCREENS.AllTournaments} component={AllTournaments} />
      <Stack.Screen name={SCREENS.SearchScreen} component={SearchScreen} />
      <Stack.Screen name={SCREENS.ChangeSquad} component={ChangeSquad} />
      <Stack.Screen name={SCREENS.ChangeBowler} component={ChangeBowler} />
      <Stack.Screen name={SCREENS.ThemeConfig} component={ThemeConfig} />
      <Stack.Screen name={SCREENS.GoLiveSetup} component={GoLiveSetupScreen} />
      {/* Add more stack screens here */}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  console.log("inside app Navigator 15");
  const isDark = false;
  return (
    // <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        drawerType: "back",
        headerShown: false, // Set true if you want header
        drawerStyle: { backgroundColor: "#fff", width: 240 },
      }}
    >
      <Drawer.Screen
        screenOptions={{
          headerShown: false, // Set true if you want header
        }}
        name="MainStack"
        component={MainStack}
      />
      {/* <View  className={isDark ? "dark " : ""}> */}
      {/* <Drawer.Screen
          name={SCREENS.LoginScreen}
          component={LoginScreen}
          options={{
            swipeEnabled: false,
          }}
        /> */}

      {/* <Drawer.Screen name={SCREENS.MainDrawer} component={AppDrawer} /> */}

      {/* <Drawer.Screen
          name={SCREENS.NavBar}
          component={NavBar}
        /> */}
      {/* <Drawer.Screen
          name={SCREENS.Home}
          component={Home}
        /> */}

      {/* <Drawer.Screen name={SCREENS.ScoreCard} component={ScoreCard} /> */}
      {/* <Drawer.Screen name={SCREENS.MatchScoreCard} component={MatchScoreCard} /> */}
      {/* <Drawer.Screen name={SCREENS.CreateTournament} component={CreateTournament} /> */}
      {/* <Drawer.Screen name={SCREENS.CreateTeam} component={CreateTeam} /> */}
      {/* <Drawer.Screen name={SCREENS.MyCricket} component={MyCricket} /> */}
      {/* <Drawer.Screen name={SCREENS.TeamProfile} component={TeamProfile} /> */}
      {/* <Drawer.Screen name={SCREENS.EditTeam} component={EditTeam} /> */}
      {/* <Drawer.Screen name={SCREENS.TournamentProfile} component={TournamentProfile} /> */}
      {/* <Drawer.Screen name={SCREENS.EditTournament} component={EditTournament} /> */}
      {/* <Drawer.Screen name={SCREENS.AddPlayer} component={AddPlayer} /> */}
      {/* <Drawer.Screen name={SCREENS.CreateMatch} component={CreateMatch} /> */}
      {/* <Drawer.Screen name={SCREENS.SelectSquadScreen} component={SelectSquadScreen} /> */}
      {/* <Drawer.Screen name={SCREENS.SelectTeamScreen} component={SelectTeamScreen} /> */}
      {/* <Drawer.Screen name={SCREENS.MatchDetailsScreen} component={MatchDetailsScreen} /> */}
      {/* <Drawer.Screen name={SCREENS.TossScreen} component={TossScreen} /> */}
      {/* <Drawer.Screen name={SCREENS.PlayerSelectionScreen} component={PlayerSelectionScreen} /> */}
      {/* <Drawer.Screen name={SCREENS.ScorerScreen} component={ScorerScreen} /> */}
      {/* <Drawer.Screen name={SCREENS.PlayerProfile} component={PlayerProfile} /> */}
      {/* <Drawer.Screen name={SCREENS.EditPlayerProfile} component={EditPlayerProfile} /> */}
      {/* <Drawer.Screen name={SCREENS.Settings} component={Settings} /> */}

      {/* </View> */}
    </Drawer.Navigator>
    // </NavigationContainer>
  );
}

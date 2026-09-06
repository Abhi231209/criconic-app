import React, { useState, useEffect } from "react";
import {
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import {
  View,
  Image,
  Switch,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from "react-native";
import ThemedText from "@/components/ui/custom/ThemedText";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import SCREENS from "@/screens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector, useDispatch } from "react-redux";
import { logout as logoutAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import User from "@/utils/User";

import useAppTheme from "@/hooks/useAppTheme";

export default function CustomDrawer(props) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth?.user);
  const { isDark, toggleTheme } = useAppTheme();
  const isDarkMode = isDark;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await authApi.logout();
          } catch (e) {
            console.warn("Logout error:", e);
          } finally {
            dispatch(logoutAction());
            navigation.reset({
              index: 0,
              routes: [{ name: SCREENS.LoginScreen }],
            });
          }
        },
      },
    ]);
  };

  const MenuItem = ({ icon, title, onPress, iconComponent: IconComponent = Ionicons, badge }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center justify-between py-3 px-3.5 rounded-xl mb-1 ${
        isDarkMode ? "active:bg-gray-800" : "active:bg-gray-100"
      }`}
    >
      <View className="flex-row items-center">
        <View
          className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
            isDarkMode ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          <IconComponent
            name={icon}
            size={18}
            color={isDarkMode ? "#93C5FD" : "#2563EB"}
          />
        </View>
        <ThemedText
          className={`text-sm font-semibold ${
            isDarkMode ? "text-gray-200" : "text-gray-800"
          }`}
        >
          {title}
        </ThemedText>
      </View>

      {badge ? (
        <View className="px-2 py-0.5 rounded-full bg-blue-500/20">
          <ThemedText className="text-[10px] font-bold text-blue-400">
            {badge}
          </ThemedText>
        </View>
      ) : (
        <Ionicons
          name="chevron-forward"
          size={14}
          color={isDarkMode ? "#4B5563" : "#9CA3AF"}
        />
      )}
    </TouchableOpacity>
  );

  const SectionHeading = ({ title }) => (
    <View className="px-3 pt-4 pb-2">
      <ThemedText
        className={`text-[11px] font-bold uppercase tracking-wider ${
          isDarkMode ? "text-gray-400" : "text-gray-500"
        }`}
      >
        {title}
      </ThemedText>
    </View>
  );

  return (
    <DrawerContentScrollView
      {...props}
      style={{
        backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
      }}
      contentContainerStyle={{
        flexGrow: 1,
        padding: 0,
        backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
      }}
      className={isDarkMode ? "bg-gray-900" : "bg-white"}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
        }}
      >
        {/* Profile Card Header with Gradient Accent */}
        <View
          className={`p-4 border-b ${
            isDarkMode ? "border-gray-800" : "border-gray-100"
          }`}
        >
        {/* HARDCODED USER PROFILE & STATS - COMMENTED OUT (API ONLY) */}
        {/*
        <LinearGradient
          colors={
            isDarkMode
              ? ["#1E3A8A", "#1E1B4B"]
              : ["#2563EB", "#1D4ED8"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-4 rounded-2xl relative overflow-hidden"
        >
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 rounded-full border-2 border-white/40 overflow-hidden mr-3 bg-white/20 items-center justify-center">
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
                }}
                className="w-full h-full"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <ThemedText className="text-white text-base font-bold mr-1.5">
                  Virat Kohli
                </ThemedText>
                <Ionicons name="checkmark-circle" size={14} color="#60A5FA" />
              </View>
              <ThemedText className="text-blue-200 text-xs">
                All-Rounder • Premium Member
              </ThemedText>
            </View>
          </View>

          <View className="flex-row justify-between pt-2.5 border-t border-white/20">
            <View className="items-center flex-1">
              <ThemedText className="text-white text-xs font-bold">
                142
              </ThemedText>
              <ThemedText className="text-blue-200 text-[10px]">
                Matches
              </ThemedText>
            </View>
            <View className="w-px h-6 bg-white/20" />
            <View className="items-center flex-1">
              <ThemedText className="text-white text-xs font-bold">
                4,850
              </ThemedText>
              <ThemedText className="text-blue-200 text-[10px]">
                Runs
              </ThemedText>
            </View>
            <View className="w-px h-6 bg-white/20" />
            <View className="items-center flex-1">
              <ThemedText className="text-white text-xs font-bold">
                12
              </ThemedText>
              <ThemedText className="text-blue-200 text-[10px]">
                Trophies
              </ThemedText>
            </View>
          </View>
        </LinearGradient>
        */}

        {/* Real Dynamic User Profile Card */}
        <LinearGradient
          colors={
            isDarkMode
              ? ["#1E3A8A", "#1E1B4B"]
              : ["#2563EB", "#1D4ED8"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-4 rounded-2xl relative overflow-hidden"
        >
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full border-2 border-white/40 overflow-hidden mr-3 bg-white/20 items-center justify-center">
              {authUser?.profileImage ? (
                <Image
                  source={{ uri: authUser.profileImage }}
                  className="w-full h-full"
                />
              ) : (
                <Ionicons name="person" size={24} color="#FFFFFF" />
              )}
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <ThemedText className="text-white text-base font-bold mr-1.5">
                  {authUser?.username || authUser?.name || "Player Profile"}
                </ThemedText>
                {authUser ? (
                  <Ionicons name="checkmark-circle" size={14} color="#60A5FA" />
                ) : null}
              </View>
              <ThemedText className="text-blue-200 text-xs mt-0.5">
                {authUser?.mobile ? `+91 ${authUser.mobile}` : authUser?.email || "Criconic User"}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Theme Toggle Pill */}
        <View
          className={`flex-row items-center justify-between p-3 rounded-xl mt-3 border ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-700"
              : "bg-gray-50 border-gray-100"
          }`}
        >
          <View className="flex-row items-center">
            <Ionicons
              name={isDarkMode ? "moon" : "sunny"}
              size={16}
              color={isDarkMode ? "#FBBF24" : "#D97706"}
            />
            <ThemedText
              className={`text-xs font-semibold ml-2.5 ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
              }`}
            >
              {isDarkMode ? "Dark Mode" : "Light Mode"}
            </ThemedText>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            thumbColor={isDarkMode ? "#3B82F6" : "#FFFFFF"}
            trackColor={{ false: "#CBD5E1", true: "#1D4ED8" }}
          />
        </View>
      </View>

      {/* Quick Action Shortcuts */}
      <View className="px-2">
        <SectionHeading title="Quick Actions" />
        <MenuItem
          icon="add-circle-outline"
          title="Create Match"
          onPress={() => navigation.navigate(SCREENS.CreateMatch)}
        />
        <MenuItem
          icon="people-outline"
          title="Create Team"
          onPress={() => navigation.navigate(SCREENS.CreateTeam)}
        />
        <MenuItem
          icon="trophy-outline"
          title="Create Tournament"
          onPress={() => navigation.navigate(SCREENS.CreateTournament)}
        />

        <SectionHeading title="My Cricket" />
        <MenuItem
          icon="cricket"
          title="My Matches"
          iconComponent={MaterialCommunityIcons}
          onPress={() => navigation.navigate(SCREENS.MyCricket)}
        />
        <MenuItem
          icon="trophy-outline"
          title="My Tournaments"
          onPress={() => navigation.navigate(SCREENS.AllTournaments)}
        />
        <MenuItem
          icon="person-outline"
          title="Player Profile"
          onPress={() => navigation.navigate(SCREENS.PlayerProfile)}
        />

        <SectionHeading title="Preferences" />
        <MenuItem
          icon="settings-outline"
          title="Settings"
          onPress={() => navigation.navigate(SCREENS.Settings)}
        />
      </View>

        {/* Sign Out Action at Bottom */}
        <View className="mt-auto px-4 py-6">
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            className={`flex-row items-center justify-center py-3 rounded-xl border ${
              isDarkMode
                ? "bg-red-950/20 border-red-900/50"
                : "bg-red-50 border-red-200"
            }`}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <ThemedText
              className={`text-xs font-bold ml-2 ${
                isDarkMode ? "text-red-400" : "text-red-600"
              }`}
            >
              Sign Out
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}
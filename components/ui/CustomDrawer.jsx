import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Switch,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ThemedText from "@/components/ui/custom/ThemedText";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { DrawerActions } from "@react-navigation/native";
import SCREENS from "@/screens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector, useDispatch } from "react-redux";
import { logout as logoutAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import User from "@/utils/User";
import { getImageFullUrl } from "@/utils";
import useAppTheme from "@/hooks/useAppTheme";
import useRequireAuth from "@/hooks/useRequireAuth";
import analytics from "@/utils/analytics";
import { showGlobalAlert } from "@/contexts/AlertContext";

export default function CustomDrawer(props) {
  const navigation = props?.navigation;
  // Drawer is the root navigator — navigate to Stack screens via the nested 'MainStack' route
  const navigateTo = (screen, params) => {
    props.navigation?.closeDrawer?.();
    // Wait for drawer close animation to complete before navigating
    setTimeout(() => {
      navigation.navigate('MainStack', { screen, params });
    }, 280);
  };
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth?.user);
  const isAdmin = Boolean(
    authUser?.role === 1 ||
    authUser?.role === 2 ||
    User?.isAdmin?.() ||
    User?.user?.role === 1 ||
    User?.user?.role === 2
  );
  const { isLoggedIn, requireAuth } = useRequireAuth(navigation);
  const { isDark, toggleTheme, themeMode, setThemeMode } = useAppTheme();
  const isDarkMode = isDark;
  const insets = useSafeAreaInsets();

  const rawPhoto =
    authUser?.profileImage ||
    authUser?.profileImg ||
    authUser?.photo ||
    authUser?.avatar ||
    authUser?.image ||
    User?.user?.profileImage ||
    User?.user?.profileImg;

  const profileImageUrl = rawPhoto ? getImageFullUrl(rawPhoto) : null;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profileImageUrl]);

  const handleLogout = () => {
    // Show themed alert immediately on press (no animation delay)
    showGlobalAlert({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      type: "danger",
      confirmText: "Sign Out",
      cancelText: "Cancel",
      onConfirm: async () => {
        props.navigation?.closeDrawer?.();
        try {
          navigation.dispatch(DrawerActions.closeDrawer());
        } catch (_) {}

        try {
          await authApi.logout();
        } catch (e) {
          console.warn("[CustomDrawer] Logout error:", e);
        } finally {
          analytics.logLogout();
          dispatch(logoutAction());
          User.logout();
          setTimeout(() => {
            try {
              navigation.navigate("MainStack", { screen: SCREENS.LoginScreen });
            } catch (_) {
              navigation.navigate(SCREENS.LoginScreen);
            }
          }, 200);
        }
      },
    });
  };

  const MenuItem = ({ icon, title, onPress, iconComponent: IconComponent = Ionicons, badge }) => (
    <TouchableOpacity
      onPress={() => {
        analytics.logDrawerNavigation(title);
        onPress?.();
      }}
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
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}
        >
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
    <ScrollView
      style={{
        backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
        flex: 1,
      }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 16,
        backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
      }}
      showsVerticalScrollIndicator={false}
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
        <TouchableOpacity
          activeOpacity={isLoggedIn ? 1 : 0.8}
          onPress={() => {
            if (!isLoggedIn) {
              navigateTo(SCREENS.LoginScreen);
            }
          }}
        >
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
              <View
                className="w-12 h-12 rounded-full border-2 overflow-hidden mr-3 items-center justify-center"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                {profileImageUrl && !imageError && isLoggedIn ? (
                  <Image
                    source={{ uri: profileImageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <Ionicons name="person" size={24} color="#FFFFFF" />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <ThemedText className="text-white text-base font-bold mr-1.5">
                    {isLoggedIn
                      ? authUser?.username || authUser?.name || "Player Profile"
                      : "Guest User"}
                  </ThemedText>
                  {isLoggedIn ? (
                    <Ionicons name="checkmark-circle" size={14} color="#60A5FA" />
                  ) : null}
                </View>
                <ThemedText className="text-blue-200 text-xs mt-0.5">
                  {isLoggedIn
                    ? isAdmin
                      ? (authUser?.mobile ? `+91 ${authUser.mobile} • Admin` : (authUser?.email ? `${authUser.email} • Admin` : "System Administrator"))
                      : (authUser?.email &&
                         typeof authUser.email === "string" &&
                         authUser.email.includes("@") &&
                         !/^\+?\d+$/.test(authUser.email.replace(/[@.]/g, "").trim()))
                        ? authUser.email
                        : authUser?.playerRole || "Criconic Member"
                    : "Tap to sign in / create account"}
                </ThemedText>
              </View>
              {!isLoggedIn && (
                <Ionicons name="log-in-outline" size={20} color="#93C5FD" />
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Theme Selector (Light / Dark / System) */}
        <View
          className="p-2.5 rounded-xl mt-3 border"
          style={{
            backgroundColor: isDarkMode ? "rgba(31, 41, 55, 0.85)" : "#F3F4F6",
            borderColor: isDarkMode ? "#374151" : "#E5E7EB",
          }}
        >
          <View className="flex-row items-center justify-between mb-2 px-1">
            <ThemedText
              className={`text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Theme
            </ThemedText>
            <ThemedText
              className={`text-xs font-semibold ${
                isDarkMode ? "text-blue-400" : "text-blue-600"
              }`}
            >
              {themeMode === "system"
                ? "System"
                : isDarkMode
                ? "Dark"
                : "Light"}
            </ThemedText>
          </View>

          <View
            className="flex-row rounded-lg p-1"
            style={{
              backgroundColor: isDarkMode
                ? "rgba(17, 24, 39, 0.65)"
                : "rgba(229, 231, 235, 0.75)",
            }}
          >
            {[
              { id: "light", label: "Light", icon: "sunny" },
              { id: "dark", label: "Dark", icon: "moon" },
              { id: "system", label: "System", icon: "phone-portrait-outline" },
            ].map((opt) => {
              const isSelected = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => {
                    analytics.logAction("theme_mode_changed", "drawer", {
                      mode: opt.id,
                    });
                    setThemeMode(opt.id);
                  }}
                  activeOpacity={0.8}
                  className={`flex-1 flex-row items-center justify-center py-1.5 rounded-md ${
                    isSelected
                      ? isDarkMode
                        ? "bg-blue-600"
                        : "bg-white"
                      : "bg-transparent"
                  }`}
                  style={
                    isSelected
                      ? {
                          elevation: 1,
                        }
                      : undefined
                  }
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={
                      isSelected
                        ? isDarkMode
                          ? "#FFFFFF"
                          : "#2563EB"
                        : isDarkMode
                        ? "#9CA3AF"
                        : "#64748B"
                    }
                  />
                  <ThemedText
                    className={`text-xs font-semibold ml-1.5 ${
                      isSelected
                        ? isDarkMode
                          ? "text-white"
                          : "text-blue-600"
                        : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Quick Action Shortcuts */}
      <View className="px-2">
        <SectionHeading title="Quick Actions" />
        <MenuItem
          icon="add-circle-outline"
          title="Create Match"
          onPress={() =>
            requireAuth(() => navigateTo(SCREENS.CreateMatch))
          }
        />
        <MenuItem
          icon="people-outline"
          title="Create Team"
          onPress={() =>
            requireAuth(() => navigateTo(SCREENS.CreateTeam))
          }
        />
        <MenuItem
          icon="trophy-outline"
          title="Create Tournament"
          onPress={() =>
            requireAuth(() => navigateTo(SCREENS.CreateTournament))
          }
        />

        <SectionHeading title="Explore" />
        <MenuItem
          icon="cricket"
          title="All Matches"
          iconComponent={MaterialCommunityIcons}
          onPress={() => navigateTo(SCREENS.AllMatches)}
        />
        <MenuItem
          icon="trophy-outline"
          title="All Tournaments"
          onPress={() => navigateTo(SCREENS.AllTournaments)}
        />
        <MenuItem
          icon="podium-outline"
          title="Local Rankings"
          onPress={() => navigateTo(SCREENS.PlayerRankings)}
        />

        <SectionHeading title="My Cricket" />
        <MenuItem
          icon="calendar-outline"
          title="My Matches"
          onPress={() =>
            requireAuth(() => navigateTo(SCREENS.MyCricket, { initialTab: "matches" }))
          }
        />
        <MenuItem
          icon="trophy-outline"
          title="My Tournaments"
          onPress={() =>
            requireAuth(() => navigateTo(SCREENS.MyCricket, { initialTab: "tournaments" }))
          }
        />
        <MenuItem
          icon="people-outline"
          title="My Teams"
          onPress={() =>
            requireAuth(() => navigateTo(SCREENS.MyCricket, { initialTab: "teams" }))
          }
        />
        <MenuItem
          icon="person-outline"
          title="Player Profile"
          onPress={() =>
            requireAuth(() => navigateTo(SCREENS.PlayerProfile))
          }
        />

        <SectionHeading title="Preferences" />
        <MenuItem
          icon="settings-outline"
          title="Settings"
          onPress={() => navigateTo(SCREENS.Settings)}
        />
      </View>

        {/* Sign Out or Sign In Action at Bottom */}
        <View className="mt-auto px-4 py-6">
          {isLoggedIn ? (
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.7}
              className="flex-row items-center justify-center py-3 rounded-xl border"
              style={{
                backgroundColor: isDarkMode ? "rgba(69, 10, 10, 0.25)" : "#FEF2F2",
                borderColor: isDarkMode ? "rgba(127, 29, 29, 0.5)" : "#FECACA",
              }}
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
          ) : (
            <TouchableOpacity
              onPress={() => navigateTo(SCREENS.LoginScreen)}
              activeOpacity={0.85}
              className="rounded-xl overflow-hidden"
              style={{ elevation: 2 }}
            >
              <LinearGradient
                colors={["#2563EB", "#1D4ED8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-3 flex-row items-center justify-center"
              >
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <ThemedText className="text-xs font-bold text-white ml-2">
                  Sign In / Register
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
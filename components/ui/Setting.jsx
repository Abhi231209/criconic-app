import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  Switch,
  Alert,
  Linking,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import { useSelector, useDispatch } from "react-redux";
import { logout as logoutAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import { getImageFullUrl } from "@/utils";
import User from "@/utils/User";
import useAppTheme from "@/hooks/useAppTheme";
import { showGlobalAlert } from "@/contexts/AlertContext";
import analytics from "@/utils/analytics";

export default function Settings() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { themeMode, setThemeMode, isDark } = useAppTheme();
  const isDarkMode = isDark;

  const authUser = useSelector((state) => state.auth?.user);

  // Check admin role (Role 1 = SUPER_ADMIN, Role 2 = ADMIN)
  const isAdmin =
    authUser?.role === 1 ||
    authUser?.role === 2 ||
    User?.isAdmin?.() ||
    User?.user?.role === 1 ||
    User?.user?.role === 2;

  // Retrieve full profile image url
  const rawPhoto =
    authUser?.profileImg ||
    authUser?.profileImage ||
    authUser?.photo ||
    authUser?.avatar ||
    authUser?.image ||
    User?.user?.profileImage ||
    User?.user?.profileImg;

  const profileImageUrl = rawPhoto ? getImageFullUrl(rawPhoto) : null;

  const isValidDisplayEmail = (str) => {
    return Boolean(
      str &&
      typeof str === "string" &&
      str.includes("@") &&
      !str.startsWith("+") &&
      !/^\d+$/.test(str.replace(/[@.]/g, "").trim())
    );
  };

  const userSubtitle =
    isValidDisplayEmail(authUser?.email)
      ? authUser.email
      : isValidDisplayEmail(User?.email)
      ? User.email
      : authUser?.playerRole || "Criconic Member";

  // User data
  const user = {
    name:
      authUser?.username ||
      authUser?.name ||
      authUser?.fullName ||
      User?.name ||
      "User",
    email: userSubtitle,
    profileImage: profileImageUrl,
  };

  // Settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDarkMode);

  const handleLogout = () => {
    showGlobalAlert({
      title: "Logout",
      message: "Are you sure you want to logout?",
      type: "danger",
      confirmText: "Logout",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await authApi.logout();
        } catch (e) {
          console.warn("[Logout] Error:", e);
        } finally {
          analytics.logLogout();
          dispatch(logoutAction());
          User.logout();
          if (navigation.reset) {
            navigation.reset({
              index: 0,
              routes: [{ name: SCREENS.LoginScreen }],
            });
          } else {
            navigation.navigate(SCREENS.LoginScreen);
          }
        }
      },
    });
  };

  const handleProfile = () => {
    const pId = authUser?._id || authUser?.id || User.id;
    if (pId) {
      navigation.navigate(SCREENS.PlayerProfile, { playerId: String(pId) });
    } else {
      Alert.alert("Notice", "User profile ID not found.");
    }
  };

  const handleEditProfile = () => {
    navigation.navigate(SCREENS.EditPlayerProfile);
  };

  const handleMyQR = () => {
    navigation.navigate(SCREENS.MyQR);
  };

  const handleChangePassword = () => {
    navigation.navigate(SCREENS.ChangePassword);
  };

  const handleSetupAds = () => {
    navigation.navigate(SCREENS.SetupAds);
  };

  const handleHomeConfig = () => {
    navigation.navigate(SCREENS.HomeConfig);
  };

  const handleBlogPosts = () => {
    navigation.navigate(SCREENS.BlogPosts);
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@cricketapp.com");
  };

  const handleRateApp = async () => {
    Alert.alert("Rate App", "Would you like to rate our app?", [
      {
        text: "Not Now",
        style: "cancel",
      },
      {
        text: "Rate Now",
        onPress: () => {
          Alert.alert("Thank you!", "We appreciate your feedback!");
        },
      },
    ]);
  };

  const SettingsItem = ({
    icon,
    title,
    onPress,
    isSwitch = false,
    value = false,
    onValueChange,
    color = "#3B82F6",
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.settingsItem,
        isDarkMode ? styles.settingsItemDark : styles.settingsItemLight,
      ]}
      disabled={isSwitch}
      activeOpacity={0.7}
    >
      <View style={styles.settingsItemContent}>
        <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <ThemedText
          style={[
            styles.settingsItemText,
            isDarkMode ? styles.textWhite : styles.textBlack,
          ]}
        >
          {title}
        </ThemedText>
      </View>

      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          thumbColor={value ? color : isDarkMode ? "#4B5563" : "#D1D5DB"}
          trackColor={{
            false: isDarkMode ? "#374151" : "#E5E7EB",
            true: color + "80",
          }}
        />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDarkMode ? "#6B7280" : "#9CA3AF"}
        />
      )}
    </TouchableOpacity>
  );

  const SettingsSection = ({ title, children }) => (
    <View style={styles.settingsSection}>
      {title && (
        <ThemedText
          style={[
            styles.sectionTitle,
            isDarkMode ? styles.sectionTitleDark : styles.sectionTitleLight,
          ]}
        >
          {title}
        </ThemedText>
      )}
      <View
        style={[
          styles.settingsSectionContent,
          isDarkMode ? styles.sectionContentDark : styles.sectionContentLight,
        ]}
      >
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode ? styles.containerDark : styles.containerLight,
      ]}
    >
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        style={styles.header}
      >
        {/* Top Navigation Row with Back Button */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <ThemedText style={styles.topNavTitle}>Settings</ThemedText>
          <View style={styles.topNavSpacer} />
        </View>

        {/* User Avatar & Info */}
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            {user.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={36} color="white" />
            )}
          </View>
          <ThemedText style={styles.userName}>{user.name}</ThemedText>
          <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <SettingsSection title="PROFILE">
          <SettingsItem
            icon="person-outline"
            title="Profile"
            onPress={handleProfile}
            color="#3B82F6"
          />
          <SettingsItem
            icon="qr-code-outline"
            title="My QR"
            onPress={handleMyQR}
            color="#10B981"
          />
          <SettingsItem
            icon="create-outline"
            title="Edit Profile"
            onPress={handleEditProfile}
            color="#8B5CF6"
          />
        </SettingsSection>

        {/* Admin Management Section - Gated by isAdmin */}
        {isAdmin && (
          <SettingsSection title="ADMIN MANAGEMENT">
            <SettingsItem
              icon="megaphone-outline"
              title="Setup Ads"
              onPress={handleSetupAds}
              color="#F59E0B"
            />
            <SettingsItem
              icon="home-outline"
              title="Home Config"
              onPress={handleHomeConfig}
              color="#EC4899"
            />
            <SettingsItem
              icon="newspaper-outline"
              title="Blog Posts"
              onPress={handleBlogPosts}
              color="#06B6D4"
            />
          </SettingsSection>
        )}

        {/* App Settings */}
        <SettingsSection title="APP PREFERENCES">
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            isSwitch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            color="#EF4444"
          />
          {/* Theme Preference Row */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: "#6366F120" },
                  ]}
                >
                  <Ionicons
                    name="color-palette-outline"
                    size={20}
                    color="#6366F1"
                  />
                </View>
                <ThemedText
                  style={[
                    styles.itemTitle,
                    isDarkMode ? styles.textWhite : styles.textBlack,
                  ]}
                >
                  Theme Preference
                </ThemedText>
              </View>
              <ThemedText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: isDarkMode ? "#60A5FA" : "#2563EB",
                }}
              >
                {themeMode === "system"
                  ? "System Default"
                  : isDarkMode
                  ? "Dark"
                  : "Light"}
              </ThemedText>
            </View>

            <View
              style={{
                flexDirection: "row",
                borderRadius: 10,
                padding: 4,
                backgroundColor: isDarkMode ? "#111827" : "#F1F5F9",
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
                    onPress={() => setThemeMode(opt.id)}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: isSelected
                        ? isDarkMode
                          ? "#2563EB"
                          : "#FFFFFF"
                        : "transparent",
                      shadowColor: isSelected ? "#000" : "transparent",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isSelected ? 0.15 : 0,
                      shadowRadius: 2,
                      elevation: isSelected ? 2 : 0,
                    }}
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
                      style={{ marginRight: 6 }}
                    />
                    <ThemedText
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isSelected
                          ? isDarkMode
                            ? "#FFFFFF"
                            : "#2563EB"
                          : isDarkMode
                          ? "#9CA3AF"
                          : "#64748B",
                      }}
                    >
                      {opt.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SettingsSection>

        {/* Account Settings */}
        <SettingsSection title="ACCOUNT">
          <SettingsItem
            icon="key-outline"
            title="Change Password"
            onPress={handleChangePassword}
            color="#06B6D4"
          />
          <SettingsItem
            icon="help-buoy-outline"
            title="Help & Support"
            onPress={handleContactSupport}
            color="#8B5CF6"
          />
          <SettingsItem
            icon="star-outline"
            title="Rate App"
            onPress={handleRateApp}
            color="#F59E0B"
          />
        </SettingsSection>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[
            styles.logoutButton,
            isDarkMode ? styles.logoutButtonDark : styles.logoutButtonLight,
          ]}
          activeOpacity={0.7}
        >
          <View style={styles.logoutButtonContent}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#EF4444"
              style={styles.logoutIcon}
            />
            <ThemedText style={styles.logoutText}>LOGOUT</ThemedText>
          </View>
        </TouchableOpacity>

        {/* App Version */}
        <ThemedText
          style={[
            styles.versionText,
            isDarkMode ? styles.versionTextDark : styles.versionTextLight,
          ]}
        >
          Cricket App v1.0.0
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: "#F3F4F6",
  },
  containerDark: {
    backgroundColor: "#111827",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  topNavSpacer: {
    width: 36,
  },
  headerContent: {
    alignItems: "center",
  },
  avatarContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  userName: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  userEmail: {
    color: "#BFDBFE",
    marginTop: 4,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  settingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 8,
    letterSpacing: 0.5,
  },
  sectionTitleLight: {
    color: "#6B7280",
  },
  sectionTitleDark: {
    color: "#9CA3AF",
  },
  settingsSectionContent: {
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionContentLight: {
    backgroundColor: "white",
  },
  sectionContentDark: {
    backgroundColor: "#1F2937",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingsItemLight: {
    backgroundColor: "white",
    borderBottomColor: "#F3F4F6",
  },
  settingsItemDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  settingsItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  settingsItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  textWhite: {
    color: "#FFFFFF",
  },
  textBlack: {
    color: "#111827",
  },
  logoutButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  logoutButtonLight: {
    backgroundColor: "#FEE2E2",
  },
  logoutButtonDark: {
    backgroundColor: "rgba(127, 29, 29, 0.3)",
  },
  logoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 15,
  },
  versionText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 12,
  },
  versionTextLight: {
    color: "#9CA3AF",
  },
  versionTextDark: {
    color: "#6B7280",
  },
});

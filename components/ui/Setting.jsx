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

export default function Settings() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // Sample user data
  const user = {
    name: "Virat Kohli",
    email: "virat.kohli@example.com",
    profileImage: null,
  };

  // Settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDarkMode);
  const [privacyEnabled, setPrivacyEnabled] = useState(false);
  const [adsEnabled, setAdsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Logout", 
          onPress: () => {
            // Handle logout logic here
            console.log("User logged out");
            // navigation.reset({ index: 0, routes: [{ name: SCREENS.Login }] });
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleChangePassword = () => {
    navigation.navigate(SCREENS.ChangePassword);
  };

  const handleEditProfile = () => {
    navigation.navigate(SCREENS.EditProfile);
  };

  const handleMyQR = () => {
    navigation.navigate(SCREENS.MyQR);
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
        style: "cancel"
      },
      { 
        text: "Rate Now", 
        onPress: () => {
          Alert.alert("Thank you!", "We appreciate your feedback!");
        }
      }
    ]);
  };

  const SettingsItem = ({ 
    icon, 
    title, 
    onPress, 
    isSwitch = false, 
    value = false, 
    onValueChange,
    color = "#3B82F6" 
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.settingsItem,
        isDarkMode ? styles.settingsItemDark : styles.settingsItemLight
      ]}
      disabled={isSwitch}
    >
      <View style={styles.settingsItemContent}>
        <View 
          style={[styles.iconContainer, { backgroundColor: color + "20" }]}
        >
          <Ionicons 
            name={icon} 
            size={20} 
            color={color} 
          />
        </View>
        <ThemedText
          style={[
            styles.settingsItemText,
            isDarkMode ? styles.textWhite : styles.textBlack
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
          trackColor={{ false: isDarkMode ? "#374151" : "#E5E7EB", true: color + "80" }}
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
            isDarkMode ? styles.sectionTitleDark : styles.sectionTitleLight
          ]}
        >
          {title}
        </ThemedText>
      )}
      <View style={[
        styles.settingsSectionContent,
        isDarkMode ? styles.sectionContentDark : styles.sectionContentLight
      ]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
    <View style={[styles.container, isDarkMode ? styles.containerDark : styles.containerLight]}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            {user.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <Ionicons name="person" size={36} color="white" />
            )}
          </View>
          <ThemedText style={styles.userName}>
            {user.name}
          </ThemedText>
          <ThemedText style={styles.userEmail}>
            {user.email}
          </ThemedText>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Profile Section */}
        <SettingsSection title="PROFILE">
          <SettingsItem
            icon="person-outline"
            title="Profile"
            onPress={() => navigation.navigate(SCREENS.Profile)}
            color="#3B82F6"
          />
          <SettingsItem
            icon="qr-code-outline"
            title="My QR"
            onPress={handleMyQR}
            color="#10B981"
          />
          <SettingsItem
            icon="megaphone-outline"
            title="Setup Ads"
            onPress={handleSetupAds}
            color="#F59E0B"
          />
          <SettingsItem
            icon="create-outline"
            title="Edit Profile"
            onPress={handleEditProfile}
            color="#8B5CF6"
          />
        </SettingsSection>

        {/* App Settings */}
        <SettingsSection title="APP SETTINGS">
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
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            isSwitch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            color="#EF4444"
          />
          <SettingsItem
            icon="moon-outline"
            title="Dark Mode"
            isSwitch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            color="#6366F1"
          />
          <SettingsItem
            icon="lock-closed-outline"
            title="Privacy"
            isSwitch
            value={privacyEnabled}
            onValueChange={setPrivacyEnabled}
            color="#84CC16"
          />
          <SettingsItem
            icon="card-outline"
            title="Ads"
            isSwitch
            value={adsEnabled}
            onValueChange={setAdsEnabled}
            color="#F97316"
          />
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
            isDarkMode ? styles.logoutButtonDark : styles.logoutButtonLight
          ]}
        >
          <View style={styles.logoutButtonContent}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#EF4444"
              style={styles.logoutIcon}
            />
            <ThemedText style={styles.logoutText}>
              LOGOUT
            </ThemedText>
          </View>
        </TouchableOpacity>

        {/* App Version */}
        <ThemedText
          style={[
            styles.versionText,
            isDarkMode ? styles.versionTextDark : styles.versionTextLight
          ]}
        >
          Cricket App v1.0.0
        </ThemedText>
      </ScrollView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: '#f3f4f6', // bg-gray-100
  },
  containerDark: {
    backgroundColor: '#111827', // bg-gray-900
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#bfdbfe', // text-blue-100
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitleLight: {
    color: '#6b7280', // text-gray-500
  },
  sectionTitleDark: {
    color: '#9ca3af', // text-gray-400
  },
  settingsSectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionContentLight: {
    backgroundColor: 'white',
  },
  sectionContentDark: {
    backgroundColor: '#1f2937', // bg-gray-800
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingsItemLight: {
    backgroundColor: 'white',
    borderBottomColor: '#e5e7eb', // border-gray-200
  },
  settingsItemDark: {
    backgroundColor: '#1f2937', // bg-gray-800
    borderBottomColor: '#374151', // border-gray-700
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingsItemText: {
    fontSize: 16,
  },
  textWhite: {
    color: 'white',
  },
  textBlack: {
    color: '#111827', // text-gray-900
  },
  logoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutButtonLight: {
    backgroundColor: '#fee2e2', // bg-red-100
  },
  logoutButtonDark: {
    backgroundColor: 'rgba(127, 29, 29, 0.3)', // bg-red-900/30
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#dc2626', // text-red-600
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 32,
  },
  versionTextLight: {
    color: '#9ca3af', // text-gray-400
  },
  versionTextDark: {
    color: '#6b7280', // text-gray-500
  },
});
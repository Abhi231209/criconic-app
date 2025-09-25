import React, { useState, useEffect } from "react";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import {
  View,
  Image,
  Switch,
  TouchableOpacity,
  Animated,
  useColorScheme,
} from "react-native";
import ThemedText from "@/components/ui/custom/ThemedText";
import {
  Box,
  VStack,
  HStack,
  Avatar,
  Divider,
} from "@gluestack-ui/themed";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import SCREENS from "@/screens";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CustomDrawer(props) {
  const navigation = useNavigation();
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const [scaleAnim] = useState(new Animated.Value(1));

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themePreference');
        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (error) {
        console.log('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);

  // Save theme preference
  const saveThemePreference = async (value) => {
    try {
      await AsyncStorage.setItem('themePreference', value ? 'dark' : 'light');
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    // Animate the switch
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    saveThemePreference(newValue);
    
    // You might want to trigger a theme change in your app state here
    // For example: updateThemeContext(newValue ? 'dark' : 'light');
  };

  const backgroundColor = isDarkMode ? "#111827" : "#f3f4f6";
  const cardBackground = isDarkMode ? "#1f2937" : "#ffffff";
  const textColor = isDarkMode ? "#ffffff" : "#111827";
  const secondaryTextColor = isDarkMode ? "#9ca3af" : "#6b7280";
  const borderColor = isDarkMode ? "#374151" : "#e5e7eb";
  const iconColor = isDarkMode ? "#d1d5db" : "#4b5563";

  const SectionHeading = ({ title = "Quick Start" }) => (
    <View style={styles.sectionHeading}>
      <Divider style={[styles.divider, { backgroundColor: borderColor }]} />
      <ThemedText style={[styles.sectionTitle, { color: secondaryTextColor }]}>
        {title}
      </ThemedText>
      <Divider style={[styles.divider, { backgroundColor: borderColor }]} />
    </View>
  );

  const MenuItem = ({ icon, title, onPress, iconComponent: IconComponent = AntDesign }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.menuItem, { borderBottomColor: borderColor }]}
    >
      <HStack space="md" alignItems="center">
        <IconComponent name={icon} size={16} color={iconColor} />
        <ThemedText style={[styles.menuText, { color: textColor }]}>
          {title}
        </ThemedText>
      </HStack>
    </TouchableOpacity>
  );

  const ActionButton = ({ icon, title, onPress }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor: cardBackground }]}
    >
      <ThemedText style={[styles.actionText, { color: textColor }]}>
        <AntDesign name={icon} size={14} color={iconColor} /> {title}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <DrawerContentScrollView 
      {...props} 
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Profile Section */}
      <VStack space="md" alignItems="flex-start" style={styles.profileSection}>
        <Avatar
          size="lg"
          source={{
            uri: "https://minifigpricelist.com/media/catalog/product/cache/9c5c6eabc511e7d038f8b1e1c1ab62c2/1/1/11045.jpeg",
          }}
          style={styles.avatar}
        />
        <ThemedText style={[styles.userName, { color: textColor }]}>
          Bardia Adibi
        </ThemedText>
        
        {/* Theme Toggle */}
        <View style={[styles.themeToggleContainer, { backgroundColor: cardBackground }]}>
          <View style={styles.themeToggleContent}>
            <Ionicons 
              name={isDarkMode ? "moon" : "sunny"} 
              size={16} 
              color={iconColor} 
            />
            <ThemedText style={[styles.themeText, { color: textColor }]}>
              {isDarkMode ? "Dark Mode" : "Light Mode"}
            </ThemedText>
          </View>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              thumbColor={isDarkMode ? "#3b82f6" : "#f59e0b"}
              trackColor={{ false: "#d1d5db", true: "#1e40af" }}
            />
          </Animated.View>
        </View>

        {/* Settings Button */}
        <TouchableOpacity 
          onPress={() => navigation.navigate(SCREENS.Settings)}
          style={[styles.settingsButton, { backgroundColor: cardBackground }]}
        >
          <ThemedText style={[styles.settingsText, { color: textColor }]}>
            <AntDesign name="setting" size={14} color={iconColor} /> Settings
          </ThemedText>
        </TouchableOpacity>
      </VStack>

      <SectionHeading title="Quick Action" />

      {/* Quick Action Buttons */}
      <VStack space="md" style={styles.actionsSection}>
        <ActionButton icon="pluscircleo" title="Create Match" onPress={() => {}} />
        <ActionButton icon="adduser" title="Add Team" onPress={() => {}} />
        <ActionButton icon="Trophy" title="Add Tournament" onPress={() => {}} />
      </VStack>

      <SectionHeading title="My Cricket" />

      {/* My Cricket Menu */}
      <VStack space="sm" style={styles.menuSection}>
        <MenuItem icon="Trophy" title="My Tournaments" onPress={() => {}} />
        <MenuItem 
          icon="cricket" 
          title="My Matches" 
          onPress={() => navigation.navigate("MyCricket")} 
          iconComponent={MaterialCommunityIcons}
        />
        <MenuItem 
          icon="adduser" 
          title="My Teams" 
          onPress={() => navigation.navigate("AddPlayer")} 
        />
      </VStack>

      <SectionHeading title="Cricket Management" />

      {/* Cricket Management Menu */}
      <VStack space="sm" style={styles.menuSection}>
        <MenuItem icon="Trophy" title="All Tournaments" onPress={() => {}} />
        <MenuItem 
          icon="cricket" 
          title="All Matches" 
          onPress={() => {}} 
          iconComponent={MaterialCommunityIcons}
        />
        <MenuItem icon="adduser" title="All Teams" onPress={() => {}} />
        <MenuItem icon="user" title="All Players" onPress={() => {}} />
      </VStack>

      {/* Sign Out Button */}
      <Box style={styles.signOutContainer}>
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: cardBackground }]}
          onPress={() => console.log("Sign Out")}
        >
          <ThemedText style={[styles.signOutText, { color: textColor }]}>
            Sign out
          </ThemedText>
        </TouchableOpacity>
      </Box>
    </DrawerContentScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  profileSection: {
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 12,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    width: '100%',
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeText: {
    marginLeft: 8,
    fontSize: 14,
  },
  settingsButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  settingsText: {
    fontSize: 14,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    textTransform: 'uppercase',
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuText: {
    fontSize: 16,
  },
  signOutContainer: {
    marginTop: 'auto',
    marginBottom: 24,
  },
  signOutButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
};
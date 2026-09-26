import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import {
  Box,
  HStack,
  VStack,
  Center,
  LinearGradient,
} from "@gluestack-ui/themed";
import Svg, { Path } from "react-native-svg";
import {
  Home,
  Plus,
  User,
  Users,
  Trophy,
  X,
  ArrowRight,
} from "lucide-react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import SCREENS from "@/screens";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import ThemedText from "./custom/ThemedText";
import useAppTheme from "@/hooks/useAppTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useRequireAuth from "@/hooks/useRequireAuth";
import analytics from "@/utils/analytics";

const CreateMenuItemCard = ({ item, index, showCreateMenu, colors }) => {
  const itemAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showCreateMenu) {
      Animated.spring(itemAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: index * 80,
      }).start();
    } else {
      itemAnimation.setValue(0);
    }
  }, [showCreateMenu, index]);

  const translateY = itemAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });
  const opacity = itemAnimation;

  return (
    <Animated.View
      style={[
        styles.createMenuItemWrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => item.onPress?.()}
        style={[
          styles.createMenuItem,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[item.color, colors.primary]}
          style={styles.createMenuItemIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {typeof item.icon === "function" ? (
            <item.icon size={22} color={item.color} />
          ) : (
            <item.icon size={22} color={item.color} />
          )}
        </LinearGradient>

        <View style={styles.createMenuItemInfo}>
          <ThemedText
            style={[styles.createMenuItemTitle, { color: colors.text }]}
          >
            {item.title}
          </ThemedText>
          <ThemedText
            style={[
              styles.createMenuItemSubtitle,
              { color: colors.textSecondary },
            ]}
          >
            {item.subtitle}
          </ThemedText>
        </View>

        <View
          style={[
            styles.createMenuItemArrow,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          <ArrowRight size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedFooter = ({ onNavigate, currentTab, visible = true, hidden = false }) => {
  if (visible === false || hidden === true) {
    return null;
  }

  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom || 0, 0);
  const baseFooterHeight = 70;
  const totalFooterHeight = baseFooterHeight + bottomInset;
  const { theme, isDark } = useAppTheme();
  const { requireAuth } = useRequireAuth(navigation);
  const [activeTab, setActiveTab] = useState(currentTab || "Home");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const menuItemAnimations = useRef([]).current;

  // Keep activeTab strictly in sync when parent screen changes or passes currentTab
  useEffect(() => {
    if (currentTab) {
      setActiveTab(currentTab);
    }
  }, [currentTab]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const colors = theme;

  const navigateToScreen = (screenName, params) => {
    const currentRoutes = navigation.getState?.()?.routeNames || [];
    if (currentRoutes.includes(screenName)) {
      navigation.navigate(screenName, params);
      return;
    }

    const parentNavigation = navigation.getParent?.();
    const parentRoutes = parentNavigation?.getState?.()?.routeNames || [];
    if (parentRoutes.includes(screenName)) {
      parentNavigation.navigate(screenName, params);
      return;
    }

    // Fallback: if nested under MainDrawer stack route, target it explicitly.
    parentNavigation?.navigate?.(SCREENS.MainDrawer, {
      screen: screenName,
      params,
    });
  };

  const footerItems = [
    { name: "Home", icon: Home },
    { name: "Tournament", icon: Trophy },
    { name: "Create", icon: Plus, isCreate: true },
    {
      name: "My Cricket",
      icon: (props) => <MaterialCommunityIcons name="cricket" {...props} />,
    },
    { name: "Profile", icon: User },
  ];

  const createMenuItems = [
    {
      title: "Create Tournament",
      subtitle: "Organize a cricket tournament with teams and fixtures.",
      icon: Trophy,
      color: colors.primary,
      onPress: () => {
        analytics.logAction("quick_create_click", "navigation", { create_type: "tournament" });
        toggleCreateMenu();
        requireAuth(() => navigateToScreen(SCREENS.CreateTournament));
      },
    },
    {
      title: "Create Match",
      subtitle: "Schedule a single match between two teams.",
      icon: (props) => <MaterialCommunityIcons name="cricket" {...props} />,
      color: colors.primary,
      onPress: () => {
        analytics.logAction("quick_create_click", "navigation", { create_type: "match" });
        toggleCreateMenu();
        requireAuth(() => navigateToScreen(SCREENS.CreateMatch));
      },
    },
    {
      title: "Create Team",
      subtitle: "Build a new cricket team with players.",
      icon: Users,
      color: colors.primary,
      onPress: () => {
        analytics.logAction("quick_create_click", "navigation", { create_type: "team" });
        toggleCreateMenu();
        requireAuth(() => navigateToScreen(SCREENS.CreateTeam));
      },
    },
  ];

  const toggleCreateMenu = () => {
    const toValue = showCreateMenu ? 0 : 1;
    setShowCreateMenu(!showCreateMenu);

    Animated.parallel([
      Animated.spring(fadeAnim, { toValue, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue, useNativeDriver: true }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, { toValue, useNativeDriver: true }),
    ]).start();
  };

  const handleTabPress = (tabName) => {
    analytics.logTabChange(tabName, "bottom_footer");
    if (tabName === "Create") {
      toggleCreateMenu();
    } else {
      if (tabName === currentTab) {
        if (showCreateMenu) {
          toggleCreateMenu();
        }
        return;
      }
      if (showCreateMenu) {
        toggleCreateMenu();
      }
      if (tabName === "Home") {
        setActiveTab(tabName);
        navigateToScreen(SCREENS.Home);
      } else if (tabName === "Tournament") {
        setActiveTab(tabName);
        navigateToScreen(SCREENS.AllTournaments);
      } else if (tabName === "My Cricket") {
        requireAuth(() => {
          setActiveTab(tabName);
          navigateToScreen(SCREENS.MyCricket);
        });
      } else if (tabName === "Profile") {
        requireAuth(() => {
          setActiveTab(tabName);
          navigateToScreen(SCREENS.PlayerProfile);
        });
      }
    }
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // Create the custom footer shape with circular cutout
  const createFooterPath = () => {
    const footerWidth = width;
    const footerHeight = totalFooterHeight;
    const centerX = footerWidth / 2;

    const notchWidth = 80; // total width of cutout
    const notchDepth = 30; // how deep it goes down
    const curveControl = 20; // controls smoothness at edges

    return `
    M0,0
    H${centerX - notchWidth / 2 - curveControl}
    C${centerX - notchWidth / 2},0 ${centerX - notchWidth / 2},${notchDepth} ${centerX},${notchDepth}
    C${centerX + notchWidth / 2},${notchDepth} ${centerX + notchWidth / 2},0 ${centerX + notchWidth / 2 + curveControl},0
    H${footerWidth}
    V${footerHeight}
    H0
    Z
  `;
  };

  const renderFooterItem = (item, index) => {
    const IconComponent = item.icon;
    const isActive = (currentTab || activeTab) === item.name;
    const isCreate = item.isCreate;

    return (
      <TouchableOpacity
        key={item.name}
        onPress={() => handleTabPress(item.name)}
        style={[styles.tabItem, isCreate && styles.createTabItem]}
        activeOpacity={0.7}
      >
        <Center style={styles.tabCenter}>
          {isCreate ? (
            <Animated.View
              style={[
                styles.createButton,
                { backgroundColor: colors.primary },
                { transform: [{ rotate: rotation }] },
              ]}
            >
              <IconComponent size={24} color={colors.white} strokeWidth={2.5} />
            </Animated.View>
          ) : (
            <View style={styles.regularTab}>
              <IconComponent
                size={18}
                color={isActive ? colors.primary : colors.textSecondary}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </View>
          )}
          {!isCreate && (
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontWeight: isActive ? "600" : "400",
                  fontSize: width < 360 ? 9.5 : width < 390 ? 10 : 11,
                },
              ]}
            >
              {item.name}
            </Text>
          )}
        </Center>
      </TouchableOpacity>
    );
  };

  const renderCreateMenuItem = (item, index) => {
    const IconComponent = item.icon;

    return (
      <TouchableOpacity
        key={item.title}
        onPress={() => item.onPress?.()}
        style={styles.createMenuRow}
        activeOpacity={0.8}
      >
        <View style={[styles.createMenuIcon, { backgroundColor: item.color }]}>
          {typeof IconComponent === "function" ? (
            <IconComponent size={20} color={colors.white} />
          ) : (
            <IconComponent size={20} color={colors.white} />
          )}
        </View>
        <View style={styles.createMenuTextWrapper}>
          <Text style={styles.createMenuTitle}>{item.title}</Text>
          <Text style={styles.createMenuSubtitle}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Overlay */}
      <Animated.View
        pointerEvents={showCreateMenu ? "auto" : "none"}
        style={[
          styles.overlay,
          {
            backgroundColor: colors.overlay,
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouch}
          onPress={toggleCreateMenu}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Create Menu */}
      <Animated.View
        pointerEvents={showCreateMenu ? "auto" : "none"}
        style={[
          styles.createMenuContainer,
          {
            bottom: 90 + bottomInset,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
            borderColor: isDark ? "#374151" : "#E5E7EB",
            borderWidth: 1,
          },
        ]}
      >
        {/* Glass morphism background */}
        {Platform.OS === "ios" ? (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={isDark ? "dark" : "light"}
            blurAmount={30}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark ? "rgba(17, 24, 39, 0.96)" : "rgba(255, 255, 255, 0.96)",
              },
            ]}
          />
        )}

        <View style={styles.createMenuContent}>
          {/* Header */}
          <View style={styles.createMenuHeader}>
            <View style={styles.createMenuHeaderText}>
              <ThemedText
                style={[styles.createMenuHeaderTitle, { color: colors.text }]}
              >
                Quick Create
              </ThemedText>
              <ThemedText
                style={[
                  styles.createMenuHeaderSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Launch something new
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={toggleCreateMenu}
              style={[
                styles.createMenuCloseButton,
                {
                  backgroundColor: colors.closeButtonOverlay,
                },
              ]}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.createMenuItemsGrid}>
            {createMenuItems.map((item, index) => (
              <CreateMenuItemCard
                key={item.title}
                item={item}
                index={index}
                showCreateMenu={showCreateMenu}
                colors={colors}
              />
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Custom Shaped Footer */}
      <View style={[styles.footerContainer, { height: totalFooterHeight }]}>
        <Svg
          width={width}
          height={totalFooterHeight}
          viewBox={`0 0 ${width} ${totalFooterHeight}`}
          style={styles.footerSvg}
          pointerEvents="none"
        >
          <Path
            d={createFooterPath()}
            fill={colors.background}
            stroke={colors.border}
            strokeWidth={1}
          />
        </Svg>

        {/* Footer Content */}
        <View
          style={[
            styles.footerContent,
            {
              height: totalFooterHeight,
              paddingBottom: bottomInset,
            },
          ]}
        >
          <HStack
            style={[
              styles.footerItemsContainer,
              { paddingHorizontal: width < 380 ? 6 : 16 },
            ]}
          >
            {footerItems.map((item, index) => renderFooterItem(item, index))}
          </HStack>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  // Footer Container
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  footerSvg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    elevation: 0,
  },
  footerContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 12,
    overflow: "visible",
  },
  footerItemsContainer: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Tab Items
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    overflow: "visible",
  },
  createTabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabCenter: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  regularTab: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  createButton: {
    position: "relative",
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },

  // Overlay
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  overlayTouch: {
    flex: 1,
  },

  // Create Menu Container - Modern Version
  createMenuContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 28,
    overflow: "hidden",
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },

  // Create Menu Content
  createMenuContent: {
    padding: 20,
  },

  // Header
  createMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  createMenuHeaderText: {
    flex: 1,
  },
  createMenuHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  createMenuHeaderSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  createMenuCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // Menu Items Grid
  createMenuItemsGrid: {
    gap: 12,
  },
  createMenuItemWrapper: {
    width: "100%",
  },
  createMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  createMenuItemIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  createMenuItemInfo: {
    flex: 1,
  },
  createMenuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  createMenuItemSubtitle: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.7,
  },
  createMenuItemArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AnimatedFooter;

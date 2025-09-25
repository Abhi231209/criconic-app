import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {
  Box,
  HStack,
  VStack,
  Center,
  useColorMode,
  LinearGradient,
} from '@gluestack-ui/themed';
import Svg, { Path } from 'react-native-svg';
import {
  Home,
  Search,
  Plus,
  User,
  Users,
  Trophy,
  Calendar,
} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import SCREENS from '@/screens';
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get('window');

const AnimatedFooter = ({ onNavigate }) => {
    const navigation = useNavigation();
  const { colorMode } = useColorMode();
  const [activeTab, setActiveTab] = useState('Home');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isDark = colorMode === 'dark';

  const colors = {
    background: isDark ? '#1a1a1a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#a0a0a0' : '#666666',
    primary: '#6366f1',
    border: isDark ? '#333333' : '#e5e7eb',
    overlay: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    menuBg: isDark ? '#2a2a2a' : '#ffffff',
    shadow: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };

  const footerItems = [
    { name: 'Home', icon: Home },
    { name: 'Tournament', icon: Trophy },
    { name: 'Create', icon: Plus, isCreate: true },
    { name: 'My Cricket', icon: (props) => <MaterialCommunityIcons name="cricket" {...props} /> },
    { name: 'Profile', icon: User },
  ];

  const createMenuItems = [
  {
    title: 'Create Tournament',
    subtitle: 'Organize a cricket tournament with teams and fixtures.',
    icon: Trophy,
    color: '#3b82f6'
  },
  {
    title: 'Create Match',
    subtitle: 'Schedule a single match between two teams.',
    icon: (props) => <MaterialCommunityIcons name="cricket" {...props} />,
    color: '#22c55e'
  },
  {
    title: 'Create Team',
    subtitle: 'Build a new cricket team with players.',
    icon: Users,
    color: '#f59e0b'
  }
];


const toggleCreateMenu = () => {
  const toValue = showCreateMenu ? 0 : 1;
  setShowCreateMenu(!showCreateMenu);

  Animated.parallel([
    Animated.spring(fadeAnim, { toValue, useNativeDriver: true }),
    Animated.spring(scaleAnim, { toValue, useNativeDriver: true }),
    Animated.timing(rotateAnim, { toValue, duration: 300, useNativeDriver: true }),
    Animated.spring(slideAnim, { toValue, useNativeDriver: true }),
  ]).start();
};



  const handleTabPress = (tabName) => {
    if (tabName === 'Create') {
      toggleCreateMenu();
    } else {
      setActiveTab(tabName);
      if (showCreateMenu) {
        toggleCreateMenu();
      }
    //   onNavigate?.(tabName);
    navigation.navigate(SCREENS.AllTournaments)
    }
  };

  const handleCreateMenuPress = (itemName) => {
    console.log(`Create ${itemName} pressed`);
    toggleCreateMenu();
    onNavigate?.(itemName);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Create the custom footer shape with circular cutout
const createFooterPath = () => {
  const footerWidth = width;
  const footerHeight = 70;
  const centerX = footerWidth / 2;

  const notchWidth = 80;   // total width of cutout
  const notchDepth = 30;   // how deep it goes down
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
    const isActive = activeTab === item.name;
    const isCreate = item.isCreate;

    return (
      <TouchableOpacity
        key={item.name}
        onPress={() => handleTabPress(item.name)}
        style={[
          styles.tabItem,
          isCreate && styles.createTabItem
        ]}
        activeOpacity={0.7}
      >
        <Center>
          {isCreate ? (
            <Animated.View
              style={[
                styles.createButton,
                { backgroundColor: colors.primary },
                { transform: [{ rotate: rotation }] },
              ]}
            >
              <IconComponent
                size={24}
                color="#ffffff"
                strokeWidth={2.5}
              />
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
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontWeight: isActive ? '600' : '400',
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
      onPress={() => handleCreateMenuPress(item.title)}
      style={styles.createMenuRow}
      activeOpacity={0.8}
    >
      <View style={[styles.createMenuIcon, { backgroundColor: item.color }]}>
        {typeof IconComponent === 'function' ? (
          <IconComponent size={20} color="#fff" />
        ) : (
          <IconComponent size={20} color="#fff" />
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
  pointerEvents={showCreateMenu ? 'auto' : 'none'}
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
  pointerEvents={showCreateMenu ? 'auto' : 'none'}
  style={[
    styles.createMenuContainer,
    {
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }],
    },
  ]}
>
  {/* Left gradient panel */}
  <LinearGradient
    colors={['#8b5cf6', '#3b82f6']}
    style={styles.createMenuLeft}
  >
    <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
      Criconic
    </Text>
    <Text style={{ fontSize: 12, color: '#f3f4f6', marginTop: 6 }}>
      Manage your cricket matches, teams, and tournaments.
    </Text>
  </LinearGradient>

  {/* Right menu items */}
  <View style={{ flex: 1, paddingLeft: 16 }}>
    {createMenuItems.map((item, index) => renderCreateMenuItem(item, index))}
  </View>
</Animated.View>


      {/* Custom Shaped Footer */}
      <View style={styles.footerContainer}>
        <Svg
          width={width}
          height={70}
          viewBox={`0 0 ${width} 70`}
          style={styles.footerSvg}
        >
          <Path
            d={createFooterPath()}
            fill={colors.background}
            stroke={colors.border}
            strokeWidth={1}
          />
        </Svg>
        
        {/* Footer Content */}
        <View style={styles.footerContent}>
          <HStack style={styles.footerItemsContainer}>
            {footerItems.map((item, index) =>
              renderFooterItem(item, index)
            )}
          </HStack>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 1,
  },
  footerSvg: {
    position: 'absolute',
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  footerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  footerItemsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    height: '100%',
  },
  createTabItem: {
    justifyContent: 'center',
    paddingBottom: 35,
  },
  regularTab: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  createButton: {
    position:"relative",
    bottom: 25,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  overlayTouch: {
    flex: 1,
  },
 createMenuContainer: {
  position: 'absolute',
  bottom: 100,
  left: 20,
  right: 20,
  backgroundColor: '#111827', // dark panel background
  borderRadius: 16,
  padding: 16,
  flexDirection: 'row',
  zIndex: 3,
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 8,
},

// Left gradient section
createMenuLeft: {
  width: 120,
  borderRadius: 12,
  padding: 12,
  justifyContent: 'center',
  alignItems: 'center',
},

createMenuRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  paddingVertical: 12,
},

createMenuIcon: {
  width: 32,
  height: 32,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

createMenuTextWrapper: {
  flex: 1,
},

createMenuTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#fff',
},

createMenuSubtitle: {
  fontSize: 12,
  color: '#9ca3af',
  marginTop: 2,
},
});

export default AnimatedFooter;
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  useColorScheme,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// gluestack-ui components
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Card,
  Radio,
  RadioGroup,
  RadioIndicator,
  RadioIcon,
  RadioLabel,
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
  Pressable,
} from '@gluestack-ui/themed';

export default function ThemeConfig() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const route = useRoute();
  const matchId = route.params?.matchId;

  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedThemeFullConfig, setSelectedThemeFullConfig] = useState(null);
  const [themes, setThemes] = useState([]);
  const [matchDetails, setMatchDetails] = useState({});
  const [colorObject, setColorObject] = useState({});
  const [placeholderMap, setPlaceholderMap] = useState({});
  const [isLandscape, setIsLandscape] = useState(true);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('theme');
  const [webViewUrl, setWebViewUrl] = useState(null);

  const isDark = colorScheme === 'dark';

  // API functions
  const getThemes = async () => {
    try {
      const mockThemes = [
        {
          id: '1',
          _id: '1',
          title: 'Dark Theme',
          description: 'Dark mode theme',
          componentKey: 'dark',
          defaultColor: { TeamA: 'blue', TeamB: 'red' },
          colorSchemes: [
            { key: 'blue', label: 'Blue', config: { primaryColor: '#3b82f6' } },
            { key: 'red', label: 'Red', config: { primaryColor: '#ef4444' } },
          ],
          isColorSchemeEnabled: true,
          colorSchemeConfigLabels: [
            { key: 'TeamA', label: 'Team A' },
            { key: 'TeamB', label: 'Team B' },
          ],
        },
        {
          id: '2',
          _id: '2',
          title: 'Light Theme',
          description: 'Light mode theme',
          componentKey: 'light',
          defaultColor: { TeamA: 'green', TeamB: 'purple' },
          colorSchemes: [
            { key: 'green', label: 'Green', config: { primaryColor: '#10b981' } },
            { key: 'purple', label: 'Purple', config: { primaryColor: '#8b5cf6' } },
          ],
          isColorSchemeEnabled: true,
          colorSchemeConfigLabels: [
            { key: 'TeamA', label: 'Team A' },
            { key: 'TeamB', label: 'Team B' },
          ],
        },
      ];
      
      setThemes(mockThemes);
    } catch (error) {
      console.error('Error fetching themes:', error);
    }
  };

  const getMatchDetails = async () => {
    try {
      const mockMatchDetails = {
        teams: [
          { teamId: 'team1', title: 'Team A' },
          { teamId: 'team2', title: 'Team B' },
        ],
      };
      
      setMatchDetails(mockMatchDetails);
    } catch (error) {
      console.error('Error fetching match details:', error);
    }
  };

  const saveConfig = async () => {
    if (!selectedThemeFullConfig) {
      Alert.alert('Error', 'Please Select the Theme First');
      return;
    }

    setIsButtonLoading(true);
    try {
      const configObject = {
        colorConfig: { ...colorObject },
        selectedTheme: { ...selectedThemeFullConfig },
      };

      // Replace with your actual API call
      Alert.alert('Success', 'Theme configuration saved successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setIsButtonLoading(false);
    }
  };

  const handleThemeSelect = (id) => {
    console.log('Theme selected:', id);
    setSelectedTheme(id);
    const theme = themes.find((t) => t._id === id) || null;
    setSelectedThemeFullConfig(theme);

    if (theme) {
      const placeholders = Object.keys(theme.defaultColor || {});
      const teams = matchDetails.teams || [];
      const phMap = {};
      
      placeholders.forEach((ph, idx) => {
        if (teams[idx]) phMap[ph] = teams[idx];
      });
      setPlaceholderMap(phMap);

      const expanded = expandDefaultColors(theme.defaultColor, theme.colorSchemes || []);
      const mappedColors = {};
      
      Object.entries(expanded).forEach(([ph, scheme]) => {
        const team = phMap[ph];
        if (team) mappedColors[team.teamId] = scheme;
      });
      
      setColorObject(mappedColors);
    }
  };

  const expandDefaultColors = (defaultColor, schemes) => {
    if (!defaultColor) return {};
    const schemeMap = Object.fromEntries(schemes.map((s) => [s.key, s]));
    const result = {};
    
    Object.entries(defaultColor).forEach(([ph, key]) => {
      const scheme = schemeMap[key] || null;
      result[ph] = scheme;
    });
    
    return result;
  };

  const onColorChange = (teamId, scheme) => {
    setColorObject((prev) => ({ ...prev, [teamId]: scheme }));
  };

  const isColorSchemeEnabled = () => {
    return themes.find((t) => t._id === selectedTheme)?.isColorSchemeEnabled;
  };

  const generateWebViewUrl = () => {
    if (!selectedThemeFullConfig) return null;
    const config = {
      theme: selectedThemeFullConfig,
      colors: colorObject,
      matchId: matchId,
    };
    return `https://yourapp.com/theme-preview?config=${encodeURIComponent(JSON.stringify(config))}`;
  };

  const handleWebViewOpen = () => {
    const url = generateWebViewUrl();
    if (url) {
      setWebViewUrl(url);
    } else {
      Alert.alert('Error', 'Please configure a theme first');
    }
  };

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setIsLandscape(window.width > window.height);
    });

    getThemes();
    getMatchDetails();

    return () => subscription?.remove();
  }, []);

  const renderThemeTab = () => (
    <RadioGroup value={selectedTheme} onChange={handleThemeSelect}>
      <VStack space="md" mt="$4">
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme._id;
          return (
            <Pressable key={theme.id} onPress={() => handleThemeSelect(theme._id)}>
              <Card 
                size="md" 
                variant="elevated" 
                m="$0"
                bg={isSelected ? (isDark ? '$backgroundDark100' : '$backgroundLight100') : (isDark ? '$backgroundDark0' : '$backgroundLight0')}
                borderColor={isSelected ? '$primary500' : '$borderLight200'}
                borderWidth={isSelected ? 2 : 1}
              >
                <HStack justifyContent="space-between" alignItems="flex-start" mb="$2">
                  <VStack flex={1}>
                    <Text fontSize="$lg" fontWeight="$bold" color={isDark ? '$textDark900' : '$textLight900'}>
                      {theme.title}
                    </Text>
                    <Text fontSize="$sm" color={isDark ? '$textDark500' : '$textLight500'}>
                      {theme.description}
                    </Text>
                  </VStack>
                  <Box 
                    w="$6" 
                    h="$6" 
                    borderRadius="$full" 
                    borderWidth={2}
                    borderColor={isSelected ? '$primary500' : '$borderLight300'}
                    alignItems="center"
                    justifyContent="center"
                    mr="$2"
                    mt="$1"
                  >
                    {isSelected && (
                      <Box 
                        w="$3" 
                        h="$3" 
                        borderRadius="$full" 
                        bg="$primary500"
                      />
                    )}
                  </Box>
                </HStack>
                
                <Box 
                  bg={isDark ? '$backgroundDark200' : '$backgroundLight100'} 
                  rounded="$md" 
                  borderWidth="$1" 
                  borderColor={isDark ? '$borderDark300' : '$borderLight200'} 
                  p="$2"
                >
                  <Text fontSize="$xs" color={isDark ? '$textDark500' : '$textLight500'} mb="$2">
                    Theme Preview: {theme.title}
                  </Text>
                  <Box 
                    bg={isDark ? '$backgroundDark0' : '$backgroundLight0'} 
                    p="$4" 
                    rounded="$sm" 
                    alignItems="center"
                  >
                    <Text fontSize="$sm" color={isDark ? '$textDark900' : '$textLight900'}>
                      Theme Component Preview
                    </Text>
                  </Box>
                </Box>
              </Card>
            </Pressable>
          );
        })}
      </VStack>
    </RadioGroup>
  );

  const renderColorTab = () => {
    if (!isColorSchemeEnabled()) {
      return (
        <Box flex={1} justifyContent="center" alignItems="center" p="$10">
          <Text color={isDark ? '$textDark500' : '$textLight500'}>Try a different theme</Text>
        </Box>
      );
    }

    return (
      <RenderColorOptions
        overlayTheme={selectedThemeFullConfig}
        placeholderMap={placeholderMap}
        colorObject={colorObject}
        onColorChange={onColorChange}
        matchDetails={matchDetails}
        isDark={isDark}
      />
    );
  };

  if (webViewUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }}>
        <Box bg={isDark ? '$backgroundDark0' : '$backgroundLight0'} borderBottomWidth="$1" borderBottomColor={isDark ? '$borderDark200' : '$borderLight200'} p="$4">
          <TouchableOpacity onPress={() => setWebViewUrl(null)}>
            <Text color="$primary500">← Back to Config</Text>
          </TouchableOpacity>
        </Box>
        <WebView 
          source={{ uri: webViewUrl }}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }}>
      <Box bg={isDark ? '$backgroundDark0' : '$backgroundLight0'} borderBottomWidth="$1" borderBottomColor={isDark ? '$borderDark200' : '$borderLight200'} p="$4">
        <HStack alignItems="center" space="md">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text color="$primary500" fontSize="$xl">←</Text>
          </TouchableOpacity>
          <VStack>
            <Text fontSize="$xl" fontWeight="$bold" color={isDark ? '$textDark900' : '$textLight900'}>
              Theme Setup
            </Text>
            <Text fontSize="$sm" color={isDark ? '$textDark500' : '$textLight500'}>
              Configure your scorecard theme
            </Text>
          </VStack>
        </HStack>
      </Box>
      
      {!isLandscape && (
        <Box bg="$primary600" p="$2" alignItems="center">
          <Text color="$primary100" fontSize="$sm">Best in landscape mode</Text>
        </Box>
      )}

      <Box flex={1} p="$4" bg={isDark ? '$backgroundDark0' : '$backgroundLight0'}>
        <HStack space="md" mb="$4">
          <TouchableOpacity 
            onPress={() => setActiveTab('theme')}
            style={{ 
              flex: 1, 
              padding: 12, 
              borderBottomWidth: activeTab === 'theme' ? 2 : 0, 
              borderBottomColor: '#0066cc',
              backgroundColor: activeTab === 'theme' ? (isDark ? '#2a2a2a' : '#f0f0f0') : 'transparent'
            }}
          >
            <Text 
              textAlign="center" 
              fontWeight={activeTab === 'theme' ? '$bold' : '$normal'}
              color={isDark ? '$textDark900' : '$textLight900'}
            >
              Themes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('color')}
            style={{ 
              flex: 1, 
              padding: 12, 
              borderBottomWidth: activeTab === 'color' ? 2 : 0, 
              borderBottomColor: '#0066cc',
              backgroundColor: activeTab === 'color' ? (isDark ? '#2a2a2a' : '#f0f0f0') : 'transparent'
            }}
          >
            <Text 
              textAlign="center" 
              fontWeight={activeTab === 'color' ? '$bold' : '$normal'}
              color={isDark ? '$textDark900' : '$textLight900'}
            >
              Colors
            </Text>
          </TouchableOpacity>
        </HStack>

        <ScrollView showsVerticalScrollIndicator={false}>
          {activeTab === 'theme' && renderThemeTab()}
          {activeTab === 'color' && renderColorTab()}
        </ScrollView>

        <HStack justifyContent="center" space="md" my="$4">
          <Button
            variant="outline"
            onPress={handleWebViewOpen}
            action="secondary"
          >
            <ButtonText>🖥️ Preview in Web</ButtonText>
          </Button>
        </HStack>
      </Box>

      <Box bg={isDark ? '$backgroundDark0' : '$backgroundLight0'} borderTopWidth="$1" borderTopColor={isDark ? '$borderDark200' : '$borderLight200'} p="$4" pb="$8">
        <Button
          onPress={saveConfig}
          isDisabled={isButtonLoading}
          size="lg"
        >
          <ButtonText>
            {isButtonLoading ? "Saving..." : "💾 Save Details"}
          </ButtonText>
        </Button>
      </Box>
    </SafeAreaView>
  );
}

function RenderColorOptions({
  overlayTheme,
  placeholderMap,
  colorObject,
  onColorChange,
  matchDetails,
  isDark,
}) {
  const [selectedValues, setSelectedValues] = useState({});

  if (!overlayTheme) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" p="$10">
        <Text color={isDark ? '$textDark500' : '$textLight500'}>No theme selected</Text>
      </Box>
    );
  }

  const { colorSchemeConfigLabels = [], colorSchemes = [] } = overlayTheme;

  const handleValueChange = (teamId, value) => {
    setSelectedValues(prev => ({ ...prev, [teamId]: value }));
    const scheme = colorSchemes.find((c) => c.key === value);
    if (scheme) {
      onColorChange(teamId, scheme);
    }
  };

  return (
    <VStack space="lg">
      <VStack space="md">
        {colorSchemeConfigLabels.map((cfg, index) => {
          let teamId = cfg.key === "TeamA"
            ? matchDetails?.teams?.[0]?.teamId
            : cfg.key === "TeamB"
            ? matchDetails?.teams?.[1]?.teamId
            : cfg.label;

          const teamName = cfg.key === "TeamA"
            ? matchDetails?.teams?.[0]?.title
            : cfg.key === "TeamB"
            ? matchDetails?.teams?.[1]?.title
            : cfg.label;

          return (
            <Box key={index}>
              <Text fontSize="$sm" fontWeight="$medium" mb="$2" color={isDark ? '$textDark900' : '$textLight900'}>
                {teamName}
              </Text>
              <Select
                selectedValue={colorObject[teamId]?.key || ''}
                onValueChange={(value) => handleValueChange(teamId, value)}
              >
                <SelectTrigger variant="outline" size="md">
                  <SelectInput placeholder="Select color scheme" />
                  <SelectIcon />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    {colorSchemes.map((scheme) => (
                      <SelectItem
                        key={scheme.key}
                        label={scheme.label}
                        value={scheme.key}
                      />
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            </Box>
          );
        })}
      </VStack>

      <Card size="md" variant="elevated">
        <VStack space="md">
          <Text fontSize="$lg" fontWeight="$bold" color={isDark ? '$textDark900' : '$textLight900'}>
            Live Preview
          </Text>
          <Box 
            bg={isDark ? '$backgroundDark100' : '$backgroundLight100'} 
            p="$4" 
            rounded="$md" 
            alignItems="center"
          >
            <Text fontSize="$sm" color={isDark ? '$textDark500' : '$textLight500'}>
              Theme preview with selected colors
            </Text>
            <Box 
              bg={isDark ? '$backgroundDark0' : '$backgroundLight0'} 
              p="$4" 
              rounded="$sm" 
              mt="$2" 
              alignItems="center"
            >
              <Text fontSize="$xs" color={isDark ? '$textDark900' : '$textLight900'}>
                Live theme preview will appear here
              </Text>
            </Box>
          </Box>
        </VStack>
      </Card>
    </VStack>
  );
}
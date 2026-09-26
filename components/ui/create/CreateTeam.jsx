import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Image,
  useColorScheme,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ThemedText from '@/components/ui/custom/ThemedText';
import Dropdown from '@/components/ui/custom/Dropdown';
import AppKeyboardAwareScrollView from '@/components/ui/custom/AppKeyboardAwareScrollView';
import LocationSearch from '@/components/ui/custom/LocationSearch';
import SCREENS from '@/screens';
import { teamsApi, upload } from '@/utils/api';
import analytics from '@/utils/analytics';
import { showGlobalAlert } from '@/contexts/AlertContext';

const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  multiline = false, 
  numberOfLines = 1, 
  keyboardType = 'default',
  maxLength,
  onFocus,
  onBlur,
  returnKeyType,
  onSubmitEditing,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const containerRef = useRef(null);

  const handleFocus = (e) => {
    onFocus?.(containerRef);
  };

  return (
    <View ref={containerRef} collapsable={false} className="mb-4">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </ThemedText>
      <TextInput
        className={`rounded-lg px-4 py-3 text-base ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700 text-white' 
            : 'bg-white border-gray-300 text-gray-900'
        } border`}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={handleFocus}
        onBlur={onBlur}
        style={{ minHeight: multiline ? 80 : 48 }}
      />
    </View>
  );
};

const ImageUpload = ({ label, image, onPress }) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View className="items-center mb-6">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </ThemedText>
      <TouchableOpacity
        onPress={onPress}
        className={`border-2 border-dashed rounded-full items-center justify-center ${
          isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'
        } h-24 w-24`}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            className="w-full h-full rounded-full"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center p-3">
            <FontAwesome 
              name="picture-o" 
              size={20} 
              color={isDarkMode ? '#9CA3AF' : '#666'} 
            />
            <ThemedText className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload Logo
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default function CreateTeam() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [formData, setFormData] = useState({
    teamName: '',
    shortName: '',
    teamType: 'club',
    captainName: '',
    captainPhone: '',
    coachName: '',
    coachPhone: '',
    homeGround: '',
    city: '',
    cityLocationId: '',
    establishedYear: '',
    jerseyColor: '',
    logo: null,
    description: '',
    players: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef(null);
  const activeInputRef = useRef(null);
  const cityContainerRef = useRef(null);

  const handleInputFocus = (targetRef) => {
    activeInputRef.current = targetRef;
    if (scrollRef.current?.scrollToFocusedInput) {
      scrollRef.current.scrollToFocusedInput(targetRef, 90);
    }
  };

  const teamTypes = [
    { label: 'Club Team', value: 'club' },
    { label: 'School Team', value: 'school' },
    { label: 'Company Team', value: 'company' },
    { label: 'Community Team', value: 'community' },
    { label: 'National Team', value: 'national' },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = [{ label: 'Select Year', value: '' }, ...Array.from({ length: 50 }, (_, i) => ({
    label: (currentYear - i).toString(),
    value: (currentYear - i).toString()
  }))];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showGlobalAlert({
        title: 'Permission Required',
        message: 'Please allow access to your photos to upload a logo.',
        type: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, logo: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    if (!formData.teamName.trim()) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter a team name',
        type: 'warning',
      });
      return;
    }

    if (formData.teamName.trim().length < 2) {
      showGlobalAlert({
        title: 'Error',
        message: 'Team name must be at least 2 characters long',
        type: 'warning',
      });
      return;
    }

    if (!formData.shortName.trim()) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter a short name',
        type: 'warning',
      });
      return;
    }

    if (!formData.city?.trim()) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter and select a city/location for the team',
        type: 'warning',
      });
      return;
    }

    const cleanCaptainPhone = (formData.captainPhone || '').replace(/[^0-9]/g, '');
    if (cleanCaptainPhone && cleanCaptainPhone.length !== 10) {
      showGlobalAlert({
        title: 'Invalid Phone',
        message: 'Captain phone must be a valid 10-digit number if provided.',
        type: 'warning',
      });
      return;
    }

    const cleanCoachPhone = (formData.coachPhone || '').replace(/[^0-9]/g, '');
    if (cleanCoachPhone && cleanCoachPhone.length !== 10) {
      showGlobalAlert({
        title: 'Invalid Phone',
        message: 'Coach phone must be a valid 10-digit number if provided.',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);

    try {
      let logoUrl = null;
      if (formData.logo) {
        const uploadRes = await upload(formData.logo, "team");
        logoUrl = uploadRes?.url || uploadRes?.data?.url || uploadRes?.data || null;
      }

      const teamPayload = {
        title: formData.teamName.trim(),
        shortName: formData.shortName.trim().toUpperCase(),
        location: formData.city.trim() || "Local",
        ...(formData.cityLocationId ? { locationId: formData.cityLocationId } : {}),
        teamType: formData.teamType,
        captainName: formData.captainName.trim(),
        captainPhone: cleanCaptainPhone,
        coachName: formData.coachName.trim(),
        coachPhone: cleanCoachPhone,
        homeGround: formData.homeGround.trim(),
        establishedYear: formData.establishedYear,
        jerseyColor: formData.jerseyColor,
        description: formData.description,
        teamLogo: logoUrl,
      };

      const res = await teamsApi.createTeam(teamPayload, { errorAlert: false });

      if (
        res?.data?.success ||
        res?.status === 200 ||
        res?.status === 201 ||
        res?.data?.data?._id
      ) {
        analytics.logAction("create_team_success", "team", {
          team_name: formData.teamName || "",
        });
        const createdTeam = res.data?.data || {
          _id: res.data?._id,
          name: formData.teamName,
          title: formData.teamName,
          location: formData.city,
        };

        if (createdTeam?._id && Array.isArray(formData.players) && formData.players.length > 0) {
          try {
            await teamsApi.addPlayerToTeam(
              createdTeam._id,
              {
                players: formData.players.map((p) => ({
                  id: p.id || p._id,
                  username: p.name || p.username,
                  name: p.name || p.username,
                  mobile: p.mobile || undefined,
                })),
              },
              { errorAlert: false }
            );
          } catch (playerErr) {
            console.warn("[CreateTeam] Adding initial players warning:", playerErr);
          }
        }

        if (route.params?.onTeamCreated) {
          route.params.onTeamCreated(createdTeam);
        }

        showGlobalAlert({
          title: 'Success',
          message: res?.data?.message || 'Team created successfully!',
          type: 'success',
          confirmText: 'OK',
          onConfirm: () => navigation.goBack(),
        });
      } else {
        const msg =
          res?.data?.message ||
          res?.data?.error?.[0]?.message ||
          (typeof res?.data?.error === 'string' ? res.data.error : null) ||
          'Could not create team. Please try again.';
        analytics.logAction("create_team_failed", "team", { reason: msg });
        showGlobalAlert({
          title: 'Notice',
          message: msg,
          type: 'warning',
        });
      }
    } catch (error) {
      analytics.logAction("create_team_failed", "team", { reason: error.message || 'Unknown error' });
      showGlobalAlert({
        title: 'Error',
        message: error.message || 'Failed to create team',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <View className={`px-4 py-4 border-b flex-row items-center justify-between ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          Create Team
        </ThemedText>
        <View className="w-10" />
      </View>

      <AppKeyboardAwareScrollView
        ref={scrollRef}
        className="flex-1 px-4 py-4"
        extraHeight={90}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Logo Upload */}
        <ImageUpload
          label="Team Logo"
          image={formData.logo}
          onPress={pickImage}
        />

          {/* Team Name and Short Name in a row */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="Team Name *"
                value={formData.teamName}
                onChange={(text) => setFormData({ ...formData, teamName: text })}
                onFocus={handleInputFocus}
                placeholder="Enter team name"
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Short Name *"
                value={formData.shortName}
                onChange={(text) => setFormData({ ...formData, shortName: text })}
                onFocus={handleInputFocus}
                placeholder="e.g., MI, CSK"
                maxLength={10}
              />
            </View>
          </View>

          {/* Team Type and Established Year in a row */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2" style={{ zIndex: 1002 }}>
              <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Team Type
              </ThemedText>
              <Dropdown
                options={teamTypes}
                selectedValue={formData.teamType}
                onValueChange={(value) => {
                  Keyboard.dismiss();
                  setFormData({ ...formData, teamType: value });
                }}
                placeholder="Select team type"
                iconColor="#2563EB"
              />
            </View>

            <View className="flex-1 ml-2" style={{ zIndex: 1001 }}>
              <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Established Year
              </ThemedText>
              <Dropdown
                options={yearOptions}
                selectedValue={formData.establishedYear}
                onValueChange={(value) => {
                  Keyboard.dismiss();
                  setFormData({ ...formData, establishedYear: value });
                }}
                placeholder="Select year"
                iconColor="#2563EB"
              />
            </View>
          </View>

          {/* City (Google Location Search) */}
          <View ref={cityContainerRef} collapsable={false} style={{ zIndex: 1000 }} className="mb-2">
            <LocationSearch
              label="City"
              locationType="city"
              required
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text, cityLocationId: "" })}
              onSelectLocation={(loc) => {
                const cityText =
                  loc?.structured_formatting?.main_text ||
                  loc?.description ||
                  "";
                setFormData({ ...formData, city: cityText, cityLocationId: loc?.place_id || "" });
              }}
              onFocus={() => handleInputFocus(cityContainerRef)}
              placeholder="Search or enter city"
              isDarkMode={isDarkMode}
            />
          </View>

          {/* Home Ground */}
          <InputField
            label="Home Ground"
            value={formData.homeGround}
            onChange={(text) => setFormData({ ...formData, homeGround: text })}
            onFocus={handleInputFocus}
            placeholder="Home ground name"
          />

          {/* Jersey Color */}
          <InputField
            label="Jersey Color"
            value={formData.jerseyColor}
            onChange={(text) => setFormData({ ...formData, jerseyColor: text })}
            onFocus={handleInputFocus}
            placeholder="e.g., Blue, Red, etc."
          />

          {/* Captain Details */}
          <ThemedText className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Captain Details
          </ThemedText>

          <InputField
            label="Captain Name *"
            value={formData.captainName}
            onChange={(text) => setFormData({ ...formData, captainName: text })}
            onFocus={handleInputFocus}
            placeholder="Enter captain name"
          />

          <InputField
            label="Captain Phone"
            value={formData.captainPhone}
            onChange={(text) => setFormData({ ...formData, captainPhone: text })}
            onFocus={handleInputFocus}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          {/* Coach Details */}
          <ThemedText className={`text-lg font-bold mb-3 mt-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Coach Details (Optional)
          </ThemedText>

          <InputField
            label="Coach Name"
            value={formData.coachName}
            onChange={(text) => setFormData({ ...formData, coachName: text })}
            onFocus={handleInputFocus}
            placeholder="Enter coach name"
          />

          <InputField
            label="Coach Phone"
            value={formData.coachPhone}
            onChange={(text) => setFormData({ ...formData, coachPhone: text })}
            onFocus={handleInputFocus}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          {/* Description */}
          <InputField
            label="Team Description"
            value={formData.description}
            onChange={(text) => setFormData({ ...formData, description: text })}
            onFocus={handleInputFocus}
            placeholder="Describe your team, achievements, etc."
            multiline
            numberOfLines={4}
          />

          {/* Players Section */}
          <View className={`p-4 rounded-lg border mb-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          }`}>
            <View className="flex-row justify-between items-center mb-3">
              <ThemedText className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Players
              </ThemedText>
              <TouchableOpacity 
                className={`p-2 rounded-lg ${
                  isDarkMode ? 'bg-blue-800' : 'bg-blue-100'
                }`}
                onPress={() =>
                  navigation.navigate(SCREENS.AddPlayer, {
                    cb: (incoming) => {
                      if (!incoming) return;
                      const list = Array.isArray(incoming) ? incoming : [incoming];
                      setFormData((prev) => {
                        let updatedPlayers = [...prev.players];
                        list.forEach((item, idx) => {
                          const pId =
                            item.id ||
                            item._id ||
                            item.playerId ||
                            `player_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`;
                          const pName =
                            item.name ||
                            item.username ||
                            item.playerName ||
                            item.title ||
                            item.user?.name ||
                            item.user?.username ||
                            (item.mobile ? `Player (${item.mobile.slice(-4)})` : "Player");
                          const cleanMob = item.mobile ? String(item.mobile).trim() : "";
                          const exists = updatedPlayers.some((p) => {
                            const existingId = p.id || p._id || p.playerId;
                            const existingMob = p.mobile ? String(p.mobile).trim() : "";
                            if (existingId && existingId === pId) return true;
                            if (cleanMob && existingMob) return cleanMob === existingMob;
                            if (!cleanMob && !existingMob && p.name && pName !== "Player") {
                              return p.name.toLowerCase() === pName.toLowerCase();
                            }
                            return false;
                          });
                          if (!exists) {
                            updatedPlayers.push({
                              id: pId,
                              _id: pId,
                              name: pName,
                              mobile: cleanMob,
                              jerseyNumber:
                                item.jerseyNumber || updatedPlayers.length + 1,
                            });
                          }
                        });
                        return {
                          ...prev,
                          players: updatedPlayers,
                        };
                      });
                    },
                  })
                }
              >
                <ThemedText className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                  Add Players
                </ThemedText>
              </TouchableOpacity>
            </View>
            
            {formData.players.length === 0 ? (
              <ThemedText className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No players added yet. Click "Add Players" to add team members.
              </ThemedText>
            ) : (
              <View>
                {formData.players.slice(0, 3).map((player, index) => (
                  <View key={index} className={`flex-row items-center py-2 ${
                    index !== formData.players.length - 1 ? 'border-b border-gray-300' : ''
                  }`}>
                    <MaterialIcons 
                      name="person" 
                      size={20} 
                      color={isDarkMode ? '#9CA3AF' : '#666'} 
                    />
                    <ThemedText className={`ml-2 flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {player.name}
                    </ThemedText>
                    <ThemedText className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      #{player.jerseyNumber}
                    </ThemedText>
                  </View>
                ))}
                {formData.players.length > 3 && (
                  <ThemedText className={`text-sm text-center mt-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    +{formData.players.length - 3} more players
                  </ThemedText>
                )}
              </View>
            )}
          </View>
        </AppKeyboardAwareScrollView>

        {/* Sticky Bottom Create Button */}
        <View
          className={`px-4 py-3 border-t ${
            isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.08,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              className="rounded-xl py-3.5 px-6 items-center justify-center flex-row"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ThemedText className="text-white text-base font-bold">Creating Team...</ThemedText>
              ) : (
                <ThemedText className="text-white text-base font-bold">Create Team</ThemedText>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
}
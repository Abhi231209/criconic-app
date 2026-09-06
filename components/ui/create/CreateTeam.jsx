import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
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
import { teamsApi, upload } from '@/utils/api';

const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  multiline = false, 
  numberOfLines = 1, 
  keyboardType = 'default',
  maxLength
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View className="mb-4">
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
    establishedYear: '',
    jerseyColor: '',
    logo: null,
    description: '',
    players: [],
  });

  const [isLoading, setIsLoading] = useState(false);

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
      Alert.alert('Permission required', 'Please allow access to your photos to upload a logo.');
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
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    if (!formData.shortName.trim()) {
      Alert.alert('Error', 'Please enter a short name');
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
        shortName: formData.shortName.trim(),
        location: formData.city.trim() || "Local",
        teamType: formData.teamType,
        captainName: formData.captainName.trim(),
        captainPhone: formData.captainPhone.trim(),
        coachName: formData.coachName.trim(),
        homeGround: formData.homeGround.trim(),
        establishedYear: formData.establishedYear,
        jerseyColor: formData.jerseyColor,
        description: formData.description,
        teamLogo: logoUrl,
      };

      const res = await teamsApi.createTeam(teamPayload);

      if (res?.data?.success || res?.status === 200 || res?.data?.data?._id) {
        const createdTeam = res.data?.data || {
          _id: res.data?._id,
          name: formData.teamName,
          title: formData.teamName,
          location: formData.city,
        };

        if (route.params?.onTeamCreated) {
          route.params.onTeamCreated(createdTeam);
        }

        Alert.alert(
          'Success',
          res?.data?.message || 'Team created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Notice', res?.data?.message || 'Could not create team. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create team');
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
        className="flex-1 px-4 py-4"
        extraHeight={80}
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
                placeholder="Enter team name"
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Short Name *"
                value={formData.shortName}
                onChange={(text) => setFormData({ ...formData, shortName: text })}
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
                onValueChange={(value) => setFormData({ ...formData, teamType: value })}
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
                onValueChange={(value) => setFormData({ ...formData, establishedYear: value })}
                placeholder="Select year"
                iconColor="#2563EB"
              />
            </View>
          </View>

          {/* City and Home Ground */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="City *"
                value={formData.city}
                onChange={(text) => setFormData({ ...formData, city: text })}
                placeholder="Enter city"
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Home Ground"
                value={formData.homeGround}
                onChange={(text) => setFormData({ ...formData, homeGround: text })}
                placeholder="Home ground name"
              />
            </View>
          </View>

          {/* Jersey Color */}
          <InputField
            label="Jersey Color"
            value={formData.jerseyColor}
            onChange={(text) => setFormData({ ...formData, jerseyColor: text })}
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
            placeholder="Enter captain name"
          />

          <InputField
            label="Captain Phone"
            value={formData.captainPhone}
            onChange={(text) => setFormData({ ...formData, captainPhone: text })}
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
            placeholder="Enter coach name"
          />

          <InputField
            label="Coach Phone"
            value={formData.coachPhone}
            onChange={(text) => setFormData({ ...formData, coachPhone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          {/* Description */}
          <InputField
            label="Team Description"
            value={formData.description}
            onChange={(text) => setFormData({ ...formData, description: text })}
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
                onPress={() => navigation.navigate('AddPlayers', { teamId: 'new' })}
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

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            className="mb-8"
          >
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              className="rounded-lg py-4 px-6 items-center"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ThemedText className="text-white text-lg font-semibold">Creating Team...</ThemedText>
              ) : (
                <ThemedText className="text-white text-lg font-semibold">Create Team</ThemedText>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </AppKeyboardAwareScrollView>
    </SafeAreaView>
  );
}
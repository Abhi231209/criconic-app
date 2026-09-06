import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ThemedText from '@/components/ui/custom/ThemedText';
import { teamsApi } from '@/utils/api';

export default function EditTeam() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const routeTeam = route?.params?.team;
  const teamId = routeTeam?._id || routeTeam?.id;

  // Real team data from route params with safe empty fallbacks
  const team = {
    id: teamId || '',
    name: routeTeam?.title || routeTeam?.name || '',
    shortName: routeTeam?.shortName || '',
    location: routeTeam?.location || '',
    logo: routeTeam?.logoImage || routeTeam?.logo || null,
    founded: routeTeam?.founded || '',
    homeGround: routeTeam?.homeGround || '',
    captain: routeTeam?.captain?.username || routeTeam?.captain || '',
    coach: routeTeam?.coach || '',
    jerseyColor: routeTeam?.jerseyColor || '',
  };

  // HARDCODED SAMPLE TEAM DATA - COMMENTED OUT (API ONLY)
  /*
  const team = route.params?.team || {
    id: '1',
    name: 'Mumbai Indians',
    shortName: 'MI',
    location: 'Mumbai, Maharashtra',
    logo: null,
    founded: '2008',
    homeGround: 'Wankhede Stadium',
    captain: 'Rohit Sharma',
    coach: 'Mark Boucher',
    jerseyColor: 'Blue & Gold',
  };
  */

  const [formData, setFormData] = useState({
    name: team.name,
    shortName: team.shortName,
    location: team.location,
    founded: team.founded,
    homeGround: team.homeGround,
    captain: team.captain,
    coach: team.coach,
    jerseyColor: team.jerseyColor,
    logo: team.logo,
  });

  const [isLoading, setIsLoading] = useState(false);

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

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, logo: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    if (!formData.shortName.trim()) {
      Alert.alert('Error', 'Please enter a short name');
      return;
    }

    if (!formData.location.trim()) {
      Alert.alert('Error', 'Please enter location');
      return;
    }

    setIsLoading(true);
    try {
      if (teamId) {
        await teamsApi.updateTeam(teamId, {
          title: formData.name,
          shortName: formData.shortName,
          location: formData.location,
          logoImage: formData.logo,
        });
      }

      // HARDCODED MOCK UPDATE TIMEOUT - COMMENTED OUT (API ONLY)
      /*
      setTimeout(() => {
        setIsLoading(false);
        Alert.alert(
          'Success',
          'Team updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }, 1500);
      */

      Alert.alert('Success', 'Team updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error('Update team error:', err);
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to update team');
    } finally {
      setIsLoading(false);
    }
  };

  const InputField = ({ 
    label, 
    value, 
    onChange, 
    placeholder, 
    keyboardType = 'default',
    maxLength,
    multiline = false,
    numberOfLines = 1
  }) => (
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
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{ minHeight: multiline ? 80 : 48 }}
      />
    </View>
  );

  const ImageUpload = () => (
    <View className="items-center mb-6">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Team Logo
      </ThemedText>
      <TouchableOpacity
        onPress={pickImage}
        className={`border-2 border-dashed rounded-full items-center justify-center ${
          isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'
        } h-32 w-32`}
      >
        {formData.logo ? (
          <Image
            source={{ uri: formData.logo }}
            className="w-full h-full rounded-full"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center p-3">
            <FontAwesome 
              name="picture-o" 
              size={32} 
              color={isDarkMode ? '#9CA3AF' : '#666'} 
            />
            <ThemedText className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload Logo
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={takePhoto}
        className={`mt-3 flex-row items-center justify-center px-4 py-2 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
        }`}
      >
        <Ionicons name="camera" size={16} color={isDarkMode ? '#9CA3AF' : '#666'} />
        <ThemedText className={`text-sm ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Take Photo
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className={`px-4 py-4 border-b flex-row items-center justify-between ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          
          <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
            Edit Team
          </ThemedText>
          
          <TouchableOpacity onPress={() => setFormData(team)} className="p-2">
            <ThemedText className="text-blue-600 text-sm font-medium">
              Reset
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          {/* Logo Upload */}
          <ImageUpload />

          {/* Team Name and Short Name */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="Team Name *"
                value={formData.name}
                onChange={(text) => setFormData({ ...formData, name: text })}
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

          {/* Location */}
          <InputField
            label="Location *"
            value={formData.location}
            onChange={(text) => setFormData({ ...formData, location: text })}
            placeholder="City, State"
          />

          {/* Founded Year and Home Ground */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="Founded Year"
                value={formData.founded}
                onChange={(text) => setFormData({ ...formData, founded: text })}
                placeholder="Year established"
                keyboardType="numeric"
                maxLength={4}
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

          {/* Captain and Coach */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="Captain"
                value={formData.captain}
                onChange={(text) => setFormData({ ...formData, captain: text })}
                placeholder="Captain's name"
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Coach"
                value={formData.coach}
                onChange={(text) => setFormData({ ...formData, coach: text })}
                placeholder="Coach's name"
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

          {/* Additional Information */}
          <ThemedText className={`text-lg font-bold mb-3 mt-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Additional Information
          </ThemedText>

          <InputField
            label="Team Bio (Optional)"
            value={formData.bio || ''}
            onChange={(text) => setFormData({ ...formData, bio: text })}
            placeholder="Tell us about your team..."
            multiline
            numberOfLines={4}
          />

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            className="mb-8 mt-6"
          >
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              className="rounded-lg py-4 px-6 items-center"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ThemedText className="text-white text-lg font-semibold">Updating...</ThemedText>
              ) : (
                <ThemedText className="text-white text-lg font-semibold">Update Team</ThemedText>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Danger Zone */}
          <View className={`p-4 rounded-xl mb-8 ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border`}>
            <ThemedText className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
              ⚠️ Danger Zone
            </ThemedText>
            
            <ThemedText className={`text-sm mb-4 ${isDarkMode ? 'text-red-200' : 'text-red-600'}`}>
              These actions are irreversible. Please be cautious.
            </ThemedText>

            <View className="space-y-2">
              <TouchableOpacity className={`p-3 rounded-lg flex-row items-center justify-between ${
                isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
              }`}>
                <ThemedText className={isDarkMode ? 'text-red-200' : 'text-red-700'}>
                  Transfer Ownership
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>

              <TouchableOpacity className={`p-3 rounded-lg flex-row items-center justify-between ${
                isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
              }`}>
                <ThemedText className={isDarkMode ? 'text-red-200' : 'text-red-700'}>
                  Delete Team
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
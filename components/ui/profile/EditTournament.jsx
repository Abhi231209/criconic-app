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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ThemedText from '@/components/ui/custom/ThemedText';
import Dropdown from '@/components/ui/custom/Dropdown';
import { tournamentsApi } from '@/utils/api';

export default function EditTournament() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  // HARDCODED SAMPLE TOURNAMENT - COMMENTED OUT (API ONLY)
  /*
  // Get tournament data from route params or use sample data
  const tournament = route.params?.tournament || {
    id: '1',
    name: 'IPL 2024',
    shortName: 'IPL24',
    logo: null,
    startDate: new Date('2024-03-22'),
    endDate: new Date('2024-05-26'),
    location: 'India',
    organizerName: 'BCCI',
    organizerPhone: '+91 9876543210',
    status: 'upcoming',
    format: 'roundRobin',
    prizeMoney: '20000000',
    entryFee: '100000',
    ballType: 'leather',
    isPublic: true,
    description: 'Indian Premier League 2024 season',
    rules: 'Official IPL rules apply',
  };
  */

  const paramTournament = route.params?.tournament || {};
  const tournamentId = paramTournament._id || paramTournament.id || route.params?.tournamentId || route.params?.id;

  const [formData, setFormData] = useState({
    name: paramTournament.title || paramTournament.name || '',
    shortName: paramTournament.slug || paramTournament.shortName || '',
    startDate: paramTournament.date?.start ? new Date(paramTournament.date.start) : (paramTournament.startDate ? new Date(paramTournament.startDate) : new Date()),
    endDate: paramTournament.date?.end ? new Date(paramTournament.date.end) : (paramTournament.endDate ? new Date(paramTournament.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    location: paramTournament.location || paramTournament.city || '',
    organizerName: typeof paramTournament.organizer === 'string' ? paramTournament.organizer : (paramTournament.organizer?.[0]?.username || paramTournament.organizerName || ''),
    organizerPhone: paramTournament.organizerPhone || paramTournament.organizer?.[0]?.mobile || '',
    status: paramTournament.status || 'upcoming',
    format: paramTournament.format || 'roundRobin',
    prizeMoney: paramTournament.prizeMoney ? String(paramTournament.prizeMoney) : '',
    entryFee: paramTournament.entryFee ? String(paramTournament.entryFee) : '',
    ballType: paramTournament.ballType || 'leather',
    isPublic: paramTournament.config?.visibility !== 'PRIVATE',
    description: paramTournament.highlights || paramTournament.description || '',
    rules: paramTournament.rules || '',
    logo: paramTournament.logoImage || paramTournament.bannerImage || paramTournament.logo || null,
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tournamentFormats = [
    { label: 'Round Robin', value: 'roundRobin' },
    { label: 'Knockout', value: 'knockout' },
    { label: 'League', value: 'league' },
    { label: 'Group Stage + Playoffs', value: 'groupPlayoffs' },
  ];

  const tournamentStatuses = [
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Ongoing', value: 'ongoing' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const ballTypes = [
    { label: 'Leather Ball', value: 'leather' },
    { label: 'Tennis Ball', value: 'tennis' },
    { label: 'Composite Ball', value: 'composite' },
  ];

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

  const handleDateChange = (event, selectedDate, type) => {
    const currentDate = selectedDate || (type === 'start' ? formData.startDate : formData.endDate);
    
    if (type === 'start') {
      setShowStartDatePicker(false);
      setFormData({ ...formData, startDate: currentDate });
    } else {
      setShowEndDatePicker(false);
      setFormData({ ...formData, endDate: currentDate });
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a tournament name');
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

    if (!formData.organizerName.trim()) {
      Alert.alert('Error', 'Please enter organizer name');
      return;
    }

    if (formData.startDate > formData.endDate) {
      Alert.alert('Error', 'End date cannot be before start date');
      return;
    }

    setIsLoading(true);
    
    // HARDCODED SIMULATED API CALL - COMMENTED OUT (API ONLY)
    /*
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Success',
        'Tournament updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }, 1500);
    */

    try {
      if (tournamentId) {
        await tournamentsApi.updateTournament(tournamentId, {
          title: formData.name,
          location: formData.location,
          date: {
            start: formData.startDate,
            end: formData.endDate,
          },
          status: formData.status,
          ballType: formData.ballType,
          highlights: formData.description,
          logoImage: formData.logo,
          config: {
            visibility: formData.isPublic ? 'PUBLIC' : 'PRIVATE',
          },
        });
      }
      setIsLoading(false);
      Alert.alert(
        'Success',
        'Tournament updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      setIsLoading(false);
      console.log('Error updating tournament:', error);
      Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to update tournament');
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

  const DatePickerField = ({ label, value, onPress, type }) => (
    <View className="mb-4">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </ThemedText>
      <TouchableOpacity
        className={`rounded-lg px-4 py-3 flex-row justify-between items-center border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
        }`}
        onPress={onPress}
      >
        <ThemedText className={`text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {formatDate(value)}
        </ThemedText>
        <Ionicons name="calendar" size={20} color={isDarkMode ? '#9CA3AF' : '#666'} />
      </TouchableOpacity>
    </View>
  );

  const ImageUpload = () => (
    <View className="items-center mb-6">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Tournament Logo
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
              name="trophy" 
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
            Edit Tournament
          </ThemedText>
          
          <TouchableOpacity onPress={() => setFormData(tournament)} className="p-2">
            <ThemedText className="text-blue-600 text-sm font-medium">
              Reset
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          {/* Logo Upload */}
          <ImageUpload />

          {/* Basic Information */}
          <ThemedText className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Basic Information
          </ThemedText>

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="Tournament Name *"
                value={formData.name}
                onChange={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter tournament name"
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Short Name *"
                value={formData.shortName}
                onChange={(text) => setFormData({ ...formData, shortName: text })}
                placeholder="e.g., IPL, T20"
                maxLength={10}
              />
            </View>
          </View>

          {/* Dates */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <DatePickerField
                label="Start Date *"
                value={formData.startDate}
                onPress={() => setShowStartDatePicker(true)}
                type="start"
              />
            </View>
            <View className="flex-1 ml-2">
              <DatePickerField
                label="End Date *"
                value={formData.endDate}
                onPress={() => setShowEndDatePicker(true)}
                type="end"
              />
            </View>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={formData.startDate}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, 'start')}
              themeVariant={isDarkMode ? 'dark' : 'light'}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={formData.endDate}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, 'end')}
              themeVariant={isDarkMode ? 'dark' : 'light'}
            />
          )}

          {/* Location */}
          <InputField
            label="Location *"
            value={formData.location}
            onChange={(text) => setFormData({ ...formData, location: text })}
            placeholder="City, Country"
          />

          {/* Organizer Details */}
          <ThemedText className={`text-lg font-bold mb-3 mt-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Organizer Details
          </ThemedText>

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="Organizer Name *"
                value={formData.organizerName}
                onChange={(text) => setFormData({ ...formData, organizerName: text })}
                placeholder="Organizer name"
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Organizer Phone"
                value={formData.organizerPhone}
                onChange={(text) => setFormData({ ...formData, organizerPhone: text })}
                placeholder="Phone number"
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>

          {/* Tournament Settings */}
          <ThemedText className={`text-lg font-bold mb-3 mt-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Tournament Settings
          </ThemedText>

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2" style={{ zIndex: 1002 }}>
              <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tournament Format
              </ThemedText>
              <Dropdown
                options={tournamentFormats}
                selectedValue={formData.format}
                onValueChange={(value) => setFormData({ ...formData, format: value })}
                placeholder="Select format"
                iconColor="#2563EB"
              />
            </View>

            <View className="flex-1 ml-2" style={{ zIndex: 1001 }}>
              <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </ThemedText>
              <Dropdown
                options={tournamentStatuses}
                selectedValue={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                placeholder="Select status"
                iconColor="#2563EB"
              />
            </View>
          </View>

          <View className="mb-4" style={{ zIndex: 1000 }}>
            <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Ball Type
            </ThemedText>
            <Dropdown
              options={ballTypes}
              selectedValue={formData.ballType}
              onValueChange={(value) => setFormData({ ...formData, ballType: value })}
              placeholder="Select ball type"
              iconColor="#2563EB"
            />
          </View>

          {/* Financial Information */}
          <ThemedText className={`text-lg font-bold mb-3 mt-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Financial Information
          </ThemedText>

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="Prize Money (₹)"
                value={formData.prizeMoney}
                onChange={(text) => setFormData({ ...formData, prizeMoney: text })}
                placeholder="Enter prize amount"
                keyboardType="numeric"
              />
              {formData.prizeMoney && (
                <ThemedText className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatCurrency(parseInt(formData.prizeMoney) || 0)}
                </ThemedText>
              )}
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Entry Fee (₹)"
                value={formData.entryFee}
                onChange={(text) => setFormData({ ...formData, entryFee: text })}
                placeholder="Enter entry fee"
                keyboardType="numeric"
              />
              {formData.entryFee && (
                <ThemedText className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatCurrency(parseInt(formData.entryFee) || 0)}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Additional Settings */}
          <View className={`flex-row justify-between items-center mb-6 p-4 rounded-lg border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          }`}>
            <ThemedText className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Public Tournament
            </ThemedText>
            <Switch
              value={formData.isPublic}
              onValueChange={(value) => setFormData({ ...formData, isPublic: value })}
              thumbColor={formData.isPublic ? '#2563EB' : '#f4f3f4'}
              trackColor={{ false: '#767577', true: '#93C5FD' }}
            />
          </View>

          {/* Description and Rules */}
          <InputField
            label="Tournament Description"
            value={formData.description}
            onChange={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe the tournament..."
            multiline
            numberOfLines={4}
          />

          <InputField
            label="Rules & Regulations"
            value={formData.rules}
            onChange={(text) => setFormData({ ...formData, rules: text })}
            placeholder="Enter tournament rules..."
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
                <ThemedText className="text-white text-lg font-semibold">Update Tournament</ThemedText>
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
                  Cancel Tournament
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>

              <TouchableOpacity className={`p-3 rounded-lg flex-row items-center justify-between ${
                isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
              }`}>
                <ThemedText className={isDarkMode ? 'text-red-200' : 'text-red-700'}>
                  Delete Tournament
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
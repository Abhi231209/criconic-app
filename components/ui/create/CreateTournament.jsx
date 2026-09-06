import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  useColorScheme,
} from 'react-native';
import { useSelector } from 'react-redux';
import User from '@/utils/User';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ThemedText from '@/components/ui/custom/ThemedText';
import Dropdown from '@/components/ui/custom/Dropdown';
import AppKeyboardAwareScrollView from '@/components/ui/custom/AppKeyboardAwareScrollView';
import { tournamentsApi, upload } from '@/utils/api';

const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(date);
  }
};

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
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
        style={{ minHeight: multiline ? 80 : 48 }}
      />
    </View>
  );
};

const DatePickerField = ({ label, value, onPress }) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
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
};

const ImageUpload = ({ label, image, onPress, type, aspect = 'square' }) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View className="mb-4">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </ThemedText>
      <TouchableOpacity
        onPress={onPress}
        className={`border-2 border-dashed rounded-lg items-center justify-center ${
          isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'
        } ${aspect === 'square' ? 'h-32 w-32' : 'h-40 w-full'}`}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            className="w-full h-full rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center p-3">
            <FontAwesome
              name={type === 'logo' ? 'picture-o' : 'image'}
              size={24}
              color={isDarkMode ? '#9CA3AF' : '#666'}
            />
            <ThemedText className={`text-xs mt-1 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {type === 'logo' ? 'Upload Logo' : 'Upload Cover'}
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default function CreateTournament() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const authUser = useSelector((state) => state.auth?.user);
  const defaultOrgName =
    authUser?.username ||
    authUser?.name ||
    authUser?.fullName ||
    User.name ||
    User.user?.username ||
    User.user?.name ||
    '';
  const defaultOrgPhone =
    authUser?.mobile ||
    authUser?.phoneNumber ||
    authUser?.phone ||
    User.mobile ||
    User.user?.mobile ||
    User.user?.phone ||
    '';

  const [formData, setFormData] = useState({
    tournamentName: '',
    tournamentType: 'knockout',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    venue: '',
    maxTeams: 8,
    description: '',
    rules: '',
    prizeMoney: '',
    entryFee: '',
    isPublic: true,
    logo: null,
    coverImage: null,
    organizerName: defaultOrgName,
    organizerPhone: defaultOrgPhone,
    ballType: 'leather',
  });

  useEffect(() => {
    if (!formData.organizerName && defaultOrgName) {
      setFormData((prev) => ({ ...prev, organizerName: defaultOrgName }));
    }
    if (!formData.organizerPhone && defaultOrgPhone) {
      setFormData((prev) => ({ ...prev, organizerPhone: defaultOrgPhone }));
    }
  }, [defaultOrgName, defaultOrgPhone]);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tournamentTypes = [
    { label: 'Knockout', value: 'knockout' },
    { label: 'Round Robin', value: 'roundRobin' },
    { label: 'League', value: 'league' },
    { label: 'Friendly', value: 'friendly' },
  ];

  const ballTypes = [
    { label: 'Leather Ball', value: 'leather' },
    { label: 'Tennis Ball', value: 'tennis' },
    { label: 'Composite Ball', value: 'composite' },
  ];

  const teamOptions = [4, 8, 16, 32, 64].map(number => ({
    label: `${number} teams`,
    value: number
  }));

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'logo') {
        setFormData({ ...formData, logo: result.assets[0].uri });
      } else {
        setFormData({ ...formData, coverImage: result.assets[0].uri });
      }
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

  const handleSubmit = async () => {
    if (!formData.tournamentName.trim()) {
      Alert.alert('Error', 'Please enter a tournament name');
      return;
    }

    if (formData.startDate > formData.endDate) {
      Alert.alert('Error', 'End date cannot be before start date');
      return;
    }

    if (!formData.organizerName.trim()) {
      Alert.alert('Error', 'Please enter organizer name');
      return;
    }

    if (!formData.organizerPhone.trim()) {
      Alert.alert('Error', 'Please enter organizer phone number');
      return;
    }

    setIsLoading(true);

    try {
      let logoUrl = formData.logo;
      if (formData.logo && !formData.logo.startsWith('http')) {
        const uploadRes = await upload(formData.logo, 'tournament');
        if (uploadRes?.data?.url) {
          logoUrl = uploadRes.data.url;
        }
      }

      let bannerUrl = formData.coverImage;
      if (formData.coverImage && !formData.coverImage.startsWith('http')) {
        const uploadRes = await upload(formData.coverImage, 'tournament');
        if (uploadRes?.data?.url) {
          bannerUrl = uploadRes.data.url;
        }
      }

      const payload = {
        title: formData.tournamentName.trim(),
        tournamentType: formData.tournamentType,
        ballType: formData.ballType,
        location: formData.venue?.trim() || '',
        organizerName: formData.organizerName.trim(),
        organizerNumber: formData.organizerPhone.trim(),
        date: {
          start: formData.startDate.toISOString(),
          end: formData.endDate.toISOString(),
        },
        description: formData.description?.trim() || '',
        rules: formData.rules?.trim() || '',
        prizeMoney: formData.prizeMoney || '',
        entryFee: formData.entryFee || '',
        logo: logoUrl || '',
        banner: bannerUrl || '',
      };

      const res = await tournamentsApi.createTournament(payload);
      if (res?.data?.success || res?.status === 201 || res?.data?.tournament) {
        Alert.alert('Success', 'Tournament created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        const msg = res?.data?.message || 'Failed to create tournament';
        Alert.alert('Notice', msg);
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <View className={`px-4 py-4 border-b flex-row items-center justify-between ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          Create Tournament
        </ThemedText>
        <View className="w-10" />
      </View>

      <AppKeyboardAwareScrollView
        className="flex-1 px-4 py-4"
        extraHeight={80}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
          {/* Image Uploads in a row */}
          <View className="flex-row justify-between mb-6">
            {/* Logo Upload */}
            <View className="flex-1 mr-2">
              <ImageUpload
                label="Tournament Logo"
                image={formData.logo}
                onPress={() => pickImage('logo')}
                type="logo"
                aspect="square"
              />
            </View>

            {/* Cover Image Upload */}
            <View className="flex-1 ml-2">
              <ImageUpload
                label="Cover Image"
                image={formData.coverImage}
                onPress={() => pickImage('cover')}
                type="cover"
                aspect="wide"
              />
            </View>
          </View>

          {/* Tournament Name */}
          <InputField
            label="Tournament Name *"
            value={formData.tournamentName}
            onChange={(text) => setFormData({ ...formData, tournamentName: text })}
            placeholder="Enter tournament name"
          />

          {/* Tournament Type and Ball Type in a row */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2" style={{ zIndex: 1000 }}>
              <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tournament Type
              </ThemedText>
              <Dropdown
                options={tournamentTypes}
                selectedValue={formData.tournamentType}
                onValueChange={(value) => setFormData({ ...formData, tournamentType: value })}
                placeholder="Select tournament type"
                iconColor="#2D5A27"
              />
            </View>

            <View className="flex-1 ml-2">
              <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Ball Type
              </ThemedText>
              <Dropdown
                options={ballTypes}
                selectedValue={formData.ballType}
                onValueChange={(value) => setFormData({ ...formData, ballType: value })}
                placeholder="Select ball type"
                iconColor="#2D5A27"
                itemStyle={{
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                }}
              />
            </View>
          </View>

          {/* Dates */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <DatePickerField
                label="Start Date"
                value={formData.startDate}
                onPress={() => setShowStartDatePicker(true)}
                type="start"
              />
            </View>
            <View className="flex-1 ml-2">
              <DatePickerField
                label="End Date"
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

          {/* Venue */}
          <InputField
            label="Venue"
            value={formData.venue}
            onChange={(text) => setFormData({ ...formData, venue: text })}
            placeholder="Enter venue address"
          />

          {/* Max Teams */}
          {/* <View className="mb-4">
            <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Maximum Teams
            </ThemedText>
            <Dropdown
              options={teamOptions}
              selectedValue={formData.maxTeams}
              onValueChange={(value) => setFormData({ ...formData, maxTeams: value })}
              placeholder="Select maximum teams"
              iconColor="#2D5A27"
              itemStyle={{
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              }}
            />
          </View> */}

          {/* Organizer Details */}
          <ThemedText className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Organizer Details
          </ThemedText>

          <InputField
            label="Organizer Name *"
            value={formData.organizerName}
            onChange={(text) => setFormData({ ...formData, organizerName: text })}
            placeholder="Enter organizer name"
          />

          <InputField
            label="Organizer Phone *"
            value={formData.organizerPhone}
            onChange={(text) => setFormData({ ...formData, organizerPhone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          {/* Description */}
          <InputField
            label="Description"
            value={formData.description}
            onChange={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe your tournament..."
            multiline
            numberOfLines={3}
          />

          {/* Rules */}
          <InputField
            label="Rules & Regulations"
            value={formData.rules}
            onChange={(text) => setFormData({ ...formData, rules: text })}
            placeholder="Enter tournament rules..."
            multiline
            numberOfLines={3}
          />

          {/* Prize Money and Entry Fee in a row */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <InputField
                label="Prize Money"
                value={formData.prizeMoney}
                onChange={(text) => setFormData({ ...formData, prizeMoney: text })}
                placeholder="Prize amount"
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Entry Fee"
                value={formData.entryFee}
                onChange={(text) => setFormData({ ...formData, entryFee: text })}
                placeholder="Entry fee"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Public/Private Toggle */}
          {/* <View className={`flex-row justify-between items-center mb-6 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
            }`}>
            <ThemedText className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Public Tournament
            </ThemedText>
            <Switch
              value={formData.isPublic}
              onValueChange={(value) => setFormData({ ...formData, isPublic: value })}
              thumbColor={formData.isPublic ? '#2D5A27' : '#f4f3f4'}
              trackColor={{ false: '#767577', true: '#4ADE80' }}
            />
          </View> */}

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
    <ThemedText className="text-white text-lg font-semibold">Creating...</ThemedText>
  ) : (
    <ThemedText className="text-white text-lg font-semibold">Create Tournament</ThemedText>
  )}
</LinearGradient>
          </TouchableOpacity>
        </AppKeyboardAwareScrollView>
    </SafeAreaView>
  );
}
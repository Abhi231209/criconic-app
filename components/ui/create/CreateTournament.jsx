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
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ThemedText from '@/components/ui/custom/ThemedText';
import Dropdown from '@/components/ui/custom/Dropdown';
import AppKeyboardAwareScrollView from '@/components/ui/custom/AppKeyboardAwareScrollView';
import LocationSearch from '@/components/ui/custom/LocationSearch';
import { tournamentsApi, upload } from '@/utils/api';
import analytics from '@/utils/analytics';
import { showGlobalAlert } from '@/contexts/AlertContext';

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
  maxLength,
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
  const route = useRoute();
  const returnScreen = route.params?.returnScreen;
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
    tournamentType: 'KNOCK_OUT',
    ballType: 'LEATHER',
    venue: '',
    organizerName: defaultOrgName,
    organizerPhone: defaultOrgPhone,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
    coverImage: null,
    logo: null,
    teams: 8,
    description: '',
    rules: '',
    prizeMoney: '',
    entryFee: '',
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

  const tournamentTypeOptions = [
    { label: 'Knockout', value: 'KNOCK_OUT' },
    { label: 'League', value: 'LEAGUE' },
  ];

  const ballTypeOptions = [
    { label: 'Leather Ball', value: 'LEATHER' },
    { label: 'Tennis Ball', value: 'TENNIS' },
    { label: 'Other', value: 'OTHER' },
  ];

  const teamOptions = [4, 8, 16, 32, 64].map(number => ({
    label: `${number} teams`,
    value: number
  }));

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showGlobalAlert({
        title: 'Permission Required',
        message: 'Please allow access to your photos to upload images.',
        type: 'warning',
      });
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

  const handleSubmit = async () => {
    if (!formData.tournamentName.trim()) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter a tournament name',
        type: 'warning',
      });
      return;
    }

    if (formData.startDate > formData.endDate) {
      showGlobalAlert({
        title: 'Error',
        message: 'End date cannot be before start date',
        type: 'warning',
      });
      return;
    }

    if (!formData.organizerName.trim()) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter organizer name',
        type: 'warning',
      });
      return;
    }

    const cleanPhone = (formData.organizerPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter a valid 10-digit organizer phone number',
        type: 'warning',
      });
      return;
    }

    if (!formData.venue?.trim()) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter and select a tournament venue/location',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);

    try {
      let logoUrl = formData.logo;
      if (formData.logo && !formData.logo.startsWith('http')) {
        const uploadRes = await upload(formData.logo, 'tournament');
        const uploadedLogo =
          uploadRes?.url ||
          uploadRes?.data?.url ||
          uploadRes?.data ||
          (typeof uploadRes === 'string' ? uploadRes : null);
        if (uploadedLogo) {
          logoUrl = uploadedLogo;
        }
      }

      let bannerUrl = formData.coverImage;
      if (formData.coverImage && !formData.coverImage.startsWith('http')) {
        const uploadRes = await upload(formData.coverImage, 'tournament');
        const uploadedBanner =
          uploadRes?.url ||
          uploadRes?.data?.url ||
          uploadRes?.data ||
          (typeof uploadRes === 'string' ? uploadRes : null);
        if (uploadedBanner) {
          bannerUrl = uploadedBanner;
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
        logoImage: logoUrl || '',
        bannerImage: bannerUrl || '',
      };

      const res = await tournamentsApi.createTournament(payload);
      const createdTournament = res?.data?.tournament || res?.data || payload;
      if (res?.data?.success || res?.status === 201 || res?.data?.tournament) {
        analytics.logAction("create_tournament_success", "tournament", {
          tournament_name: formData.tournamentName || "",
        });
        showGlobalAlert({
          title: 'Success',
          message: 'Tournament created successfully!',
          type: 'success',
          confirmText: 'Continue',
          onConfirm: () => {
            if (returnScreen) {
              navigation.navigate(returnScreen, { newTournament: createdTournament });
            } else {
              navigation.goBack();
            }
          },
        });
      } else {
        const msg = res?.data?.message || 'Failed to create tournament';
        analytics.logAction("create_tournament_failed", "tournament", { reason: msg });
        showGlobalAlert({
          title: 'Notice',
          message: msg,
          type: 'warning',
        });
      }
    } catch (error) {
      analytics.logAction("create_tournament_failed", "tournament", { reason: error?.message || 'Unknown error' });
      showGlobalAlert({
        title: 'Error',
        message: error?.message || 'Something went wrong',
        type: 'error',
      });
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
                options={tournamentTypeOptions}
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
                options={ballTypeOptions}
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

          {/* Venue (Google Location Search) */}
          <View style={{ zIndex: 1000 }} className="mb-2">
            <LocationSearch
              label="Venue"
              value={formData.venue}
              onChangeText={(text) => setFormData({ ...formData, venue: text })}
              onSelectLocation={(loc) => {
                const venueText =
                  loc?.description ||
                  loc?.structured_formatting?.main_text ||
                  "";
                setFormData({ ...formData, venue: venueText });
              }}
              placeholder="Search or enter venue / ground address"
              isDarkMode={isDarkMode}
            />
          </View>

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
            onChange={(text) => {
              const clean = text.replace(/[^0-9]/g, '').slice(0, 10);
              setFormData({ ...formData, organizerPhone: clean });
            }}
            placeholder="Enter 10-digit phone number"
            keyboardType="numeric"
            maxLength={10}
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
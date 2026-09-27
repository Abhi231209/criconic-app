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
  DeviceEventEmitter,
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
import LocationSearch from '@/components/ui/custom/LocationSearch';
import AppKeyboardAwareScrollView from '@/components/ui/custom/AppKeyboardAwareScrollView';
import { tournamentsApi, upload } from '@/utils/api';
import { showGlobalAlert } from '@/components/ui/custom/AppAlertModal';
import { formatIndianCurrencyWords } from '@/utils';

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
  keyboardType = 'default',
  maxLength,
  multiline = false,
  numberOfLines = 1,
  errorText,
  helperText,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View className="mb-4">
      <ThemedText className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </ThemedText>
      <TextInput
        className={`rounded-lg px-4 py-3 text-base ${
          errorText
            ? 'border-red-500 bg-red-50/10'
            : isDarkMode 
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
      {errorText ? (
        <ThemedText className="text-xs text-red-500 font-medium mt-1">
          {errorText}
        </ThemedText>
      ) : helperText ? (
        <ThemedText className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {helperText}
        </ThemedText>
      ) : null}
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
        } ${aspect === 'square' ? 'h-32 w-32' : 'h-32 w-full'}`}
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
    locationId: paramTournament.locationId || '',
    organizerName: typeof paramTournament.organizer === 'string' ? paramTournament.organizer : (paramTournament.organizer?.[0]?.username || paramTournament.organizerName || ''),
    organizerPhone: paramTournament.organizerPhone || paramTournament.organizer?.[0]?.mobile || '',
    status: paramTournament.status || 'upcoming',
    format: paramTournament.format || 'roundRobin',
    prizeMoney: paramTournament.prizeMoney ? String(paramTournament.prizeMoney) : '',
    entryFee: paramTournament.entryFee ? String(paramTournament.entryFee) : '',
    ballType: paramTournament.ballType || 'leather',
    logo: paramTournament.logoImage || paramTournament.logo || null,
    coverImage: paramTournament.bannerImage || paramTournament.banner || paramTournament.coverImage || null,
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

  const pickImage = async (type = 'logo') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showGlobalAlert({
        title: 'Permission required',
        message: 'Please allow access to your photos to upload images.',
        type: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
    if (type === 'start') {
      setShowStartDatePicker(false);
    } else {
      setShowEndDatePicker(false);
    }

    const currentDate = selectedDate || (type === 'start' ? formData.startDate : formData.endDate);
    
    if (type === 'start') {
      setFormData({ ...formData, startDate: currentDate });
    } else {
      setFormData({ ...formData, endDate: currentDate });
    }
  };

  const formatCurrencyDisplay = (val) => {
    return formatIndianCurrencyWords(val) || '';
  };
  const formatCurrency = formatCurrencyDisplay;

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter a tournament name',
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

    if (!formData.location.trim()) {
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter location',
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

    if (formData.organizerPhone && formData.organizerPhone.trim()) {
      const cleanPhone = formData.organizerPhone.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        showGlobalAlert({
          title: 'Invalid Phone Number',
          message: 'Organizer phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.',
          type: 'warning',
        });
        return;
      }
    }

    if (formData.startDate > formData.endDate) {
      showGlobalAlert({
        title: 'Error',
        message: 'End date cannot be before start date',
        type: 'warning',
      });
      return;
    }

    // Prize Money & Entry Fee validation
    const MAX_PRIZE_MONEY = 100000000; // ₹10 Crore
    const MAX_ENTRY_FEE = 10000000;    // ₹1 Crore

    const prizeNum = formData.prizeMoney ? Number(formData.prizeMoney) : 0;
    const entryNum = formData.entryFee ? Number(formData.entryFee) : 0;

    if (formData.prizeMoney && (isNaN(prizeNum) || prizeNum < 0)) {
      showGlobalAlert({
        title: 'Invalid Prize Money',
        message: 'Please enter a valid prize money amount.',
        type: 'warning',
      });
      return;
    }

    if (prizeNum > MAX_PRIZE_MONEY) {
      showGlobalAlert({
        title: 'Prize Money Exceeded',
        message: 'Prize money cannot exceed ₹10 Crore (₹10,00,00,000).',
        type: 'warning',
      });
      return;
    }

    if (formData.entryFee && (isNaN(entryNum) || entryNum < 0)) {
      showGlobalAlert({
        title: 'Invalid Entry Fee',
        message: 'Please enter a valid entry fee amount.',
        type: 'warning',
      });
      return;
    }

    if (entryNum > MAX_ENTRY_FEE) {
      showGlobalAlert({
        title: 'Entry Fee Exceeded',
        message: 'Entry fee cannot exceed ₹1 Crore (₹1,00,00,000).',
        type: 'warning',
      });
      return;
    }

    if (prizeNum > 0 && entryNum > prizeNum) {
      showGlobalAlert({
        title: 'Entry Fee Warning',
        message: `Entry fee (${formatCurrencyDisplay(entryNum)}) cannot exceed the total tournament prize money (${formatCurrencyDisplay(prizeNum)}).`,
        type: 'warning',
      });
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

      const updatePayload = {
        title: formData.name.trim(),
        name: formData.name.trim(),
        shortName: formData.shortName?.trim() || '',
        slug: formData.shortName?.trim() || '',
        location: formData.location.trim(),
        city: formData.location.trim(),
        ...(formData.locationId ? { locationId: formData.locationId } : {}),
        date: {
          start: formData.startDate,
          end: formData.endDate,
        },
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        format: formData.format,
        tournamentType: formData.format,
        category: formData.format,
        prizeMoney: formData.prizeMoney || '',
        prize: formData.prizeMoney || '',
        entryFee: formData.entryFee || '',
        ballType: formData.ballType,
        logoImage: logoUrl,
        bannerImage: bannerUrl,
        logo: logoUrl,
        banner: bannerUrl,
      };

      let updatedTournament = null;
      if (tournamentId) {
        const res = await tournamentsApi.updateTournament(tournamentId, updatePayload);
        updatedTournament = res?.data?.content || res?.data?.tournament || res?.data?.data || res?.data;
      }

      const finalTournament = {
        ...(paramTournament || {}),
        ...updatePayload,
        ...(typeof updatedTournament === 'object' && updatedTournament !== null ? updatedTournament : {}),
        _id: tournamentId,
        id: tournamentId,
      };

      if (typeof route.params?.onUpdate === 'function') {
        route.params.onUpdate(finalTournament);
      }
      if (typeof route.params?.cb === 'function') {
        route.params.cb(finalTournament);
      }

      DeviceEventEmitter.emit('TOURNAMENT_UPDATED', {
        tournamentId: String(tournamentId),
        tournament: finalTournament,
      });

      setIsLoading(false);
      showGlobalAlert({
        title: 'Success',
        message: 'Tournament updated successfully!',
        type: 'success',
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              if (route.params?.returnScreen) {
                navigation.navigate(route.params.returnScreen, {
                  tournamentId,
                  tournament: finalTournament,
                  refresh: Date.now(),
                });
              } else {
                navigation.goBack();
              }
            },
          },
        ],
      });
    } catch (error) {
      setIsLoading(false);
      console.log('Error updating tournament:', error);
      showGlobalAlert({
        title: 'Error',
        message: error?.response?.data?.message || error?.message || 'Failed to update tournament',
        type: 'error',
      });
    }
  };

  const handleCancelTournament = () => {
    if (!tournamentId) return;
    showGlobalAlert({
      title: 'Cancel Tournament',
      message: 'Are you sure you want to cancel this tournament? This will mark the tournament as cancelled.',
      type: 'warning',
      buttons: [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await tournamentsApi.cancelTournament(tournamentId);
              setFormData((prev) => ({ ...prev, status: 'cancelled' }));
              const updated = {
                ...(paramTournament || {}),
                status: 'cancelled',
                _id: tournamentId,
                id: tournamentId,
              };
              if (typeof route.params?.onUpdate === 'function') {
                route.params.onUpdate(updated);
              }
              if (typeof route.params?.cb === 'function') {
                route.params.cb(updated);
              }
              DeviceEventEmitter.emit('TOURNAMENT_UPDATED', {
                tournamentId: String(tournamentId),
                tournament: updated,
              });
              showGlobalAlert({
                title: 'Success',
                message: 'Tournament has been cancelled.',
                type: 'success',
                buttons: [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ],
              });
            } catch (err) {
              console.error('Cancel tournament error:', err);
              showGlobalAlert({
                title: 'Error',
                message: err?.response?.data?.message || err?.message || 'Failed to cancel tournament',
                type: 'error',
              });
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    });
  };

  const handleDeleteTournament = () => {
    if (!tournamentId) return;
    showGlobalAlert({
      title: 'Delete Tournament',
      message: 'Are you sure you want to permanently delete this tournament? This action cannot be undone.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await tournamentsApi.deleteTournament(tournamentId);
              DeviceEventEmitter.emit('TOURNAMENT_DELETED', {
                tournamentId: String(tournamentId),
              });
              DeviceEventEmitter.emit('TOURNAMENT_UPDATED', {
                tournamentId: String(tournamentId),
                isDeleted: true,
              });
              showGlobalAlert({
                title: 'Deleted',
                message: 'Tournament has been deleted successfully.',
                type: 'success',
                buttons: [
                  {
                    text: 'OK',
                    onPress: () => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        navigation.navigate('Home');
                      }
                    },
                  },
                ],
              });
            } catch (err) {
              console.error('Delete tournament error:', err);
              showGlobalAlert({
                title: 'Error',
                message: err?.response?.data?.message || err?.message || 'Failed to delete tournament',
                type: 'error',
              });
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    });
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
          Edit Tournament
        </ThemedText>
        
        <TouchableOpacity onPress={() => setFormData(paramTournament)} className="p-2">
          <ThemedText className="text-blue-600 text-sm font-medium">
            Reset
          </ThemedText>
        </TouchableOpacity>
      </View>

      <AppKeyboardAwareScrollView
        className="flex-1 px-4 py-4"
        extraHeight={80}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Image Uploads in a row */}
        <View className="flex-row justify-between mb-4">
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
          <View style={{ zIndex: 1005 }} className="mb-2">
            <LocationSearch
              label="Location *"
              required
              locationType="city"
              value={formData.location}
              onChangeText={(text) =>
                setFormData({ ...formData, location: text, locationId: '' })
              }
              onSelectLocation={(loc) => {
                const locText =
                  loc?.description ||
                  loc?.structured_formatting?.main_text ||
                  '';
                setFormData({
                  ...formData,
                  location: locText,
                  locationId: loc?.place_id || '',
                });
              }}
              placeholder="Search or enter city / location"
              isDarkMode={isDarkMode}
            />
          </View>

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
                onChange={(text) => setFormData({ ...formData, organizerPhone: text.replace(/\D/g, "").slice(0, 10) })}
                placeholder="10-digit phone"
                keyboardType="phone-pad"
                maxLength={10}
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
                onChange={(text) => {
                  const clean = text.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, prizeMoney: clean });
                }}
                placeholder="Max ₹10 Cr"
                keyboardType="numeric"
                maxLength={9}
                errorText={
                  formData.prizeMoney && Number(formData.prizeMoney) > 100000000
                    ? "Max allowed is ₹10 Crore"
                    : null
                }
                helperText={
                  formData.prizeMoney && Number(formData.prizeMoney) <= 100000000
                    ? formatCurrencyDisplay(formData.prizeMoney)
                    : null
                }
              />
            </View>
            <View className="flex-1 ml-2">
              <InputField
                label="Entry Fee (₹)"
                value={formData.entryFee}
                onChange={(text) => {
                  const clean = text.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, entryFee: clean });
                }}
                placeholder="Entry fee"
                keyboardType="numeric"
                maxLength={8}
                errorText={
                  formData.entryFee && Number(formData.entryFee) > 10000000
                    ? "Max allowed is ₹1 Crore"
                    : formData.prizeMoney &&
                      Number(formData.prizeMoney) > 0 &&
                      Number(formData.entryFee) > Number(formData.prizeMoney)
                    ? "Exceeds prize money"
                    : null
                }
                helperText={
                  formData.entryFee &&
                  Number(formData.entryFee) <= 10000000 &&
                  (!formData.prizeMoney ||
                    Number(formData.prizeMoney) <= 0 ||
                    Number(formData.entryFee) <= Number(formData.prizeMoney))
                    ? formatCurrencyDisplay(formData.entryFee)
                    : null
                }
              />
            </View>
          </View>

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
              <TouchableOpacity
                onPress={handleCancelTournament}
                disabled={isLoading}
                activeOpacity={0.7}
                className={`p-3 rounded-lg flex-row items-center justify-between ${
                  isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
                }`}
              >
                <ThemedText className={`font-semibold ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                  Cancel Tournament
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteTournament}
                disabled={isLoading}
                activeOpacity={0.7}
                className={`p-3 rounded-lg flex-row items-center justify-between ${
                  isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
                }`}
              >
                <ThemedText className={`font-semibold ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                  Delete Tournament
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>
            </View>
          </View>
        </AppKeyboardAwareScrollView>
    </SafeAreaView>
  );
}
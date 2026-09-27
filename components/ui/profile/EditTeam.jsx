import React, { useState, useEffect } from 'react';
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
  DeviceEventEmitter,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ThemedText from '@/components/ui/custom/ThemedText';
import LocationSearch from '@/components/ui/custom/LocationSearch';
import { teamsApi, upload } from '@/utils/api';
import AppKeyboardAwareScrollView from '@/components/ui/custom/AppKeyboardAwareScrollView';
import { showGlobalAlert } from '@/components/ui/custom/AppAlertModal';
import User from '@/utils/User';

const InputField = React.memo(({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  keyboardType = 'default',
  maxLength,
  multiline = false,
  numberOfLines = 1,
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
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{ minHeight: multiline ? 80 : 48 }}
      />
    </View>
  );
});

export default function EditTeam() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const authUser = useSelector((state) => state.auth?.user);
  const currentUserId = String(
    authUser?._id || authUser?.id || authUser?.userId || User.id || User.user?._id || ''
  );

  const routeTeam = route?.params?.team;
  const rawTeamId =
    route?.params?.teamId ||
    route?.params?.id ||
    routeTeam?._id ||
    routeTeam?.id ||
    (typeof routeTeam?.teamId === 'object' ? routeTeam?.teamId?._id : routeTeam?.teamId);
  const teamId = rawTeamId ? String(rawTeamId) : '';

  const unnestedRouteTeam =
    routeTeam?.teamId && typeof routeTeam.teamId === 'object'
      ? { ...routeTeam.teamId, ...routeTeam }
      : (routeTeam || {});

  // Real team data from route params with safe empty fallbacks
  const team = {
    id: teamId || '',
    name: unnestedRouteTeam?.title || unnestedRouteTeam?.name || '',
    shortName: unnestedRouteTeam?.shortName || '',
    location: unnestedRouteTeam?.location || '',
    logo: unnestedRouteTeam?.teamLogo || unnestedRouteTeam?.logoImage || unnestedRouteTeam?.logo || null,
    founded: unnestedRouteTeam?.founded || unnestedRouteTeam?.establishedYear || '',
    homeGround: unnestedRouteTeam?.homeGround || '',
    captain: unnestedRouteTeam?.captain?.username || unnestedRouteTeam?.captainName || unnestedRouteTeam?.captain || '',
    coach: unnestedRouteTeam?.coach || unnestedRouteTeam?.coachName || '',
    jerseyColor: unnestedRouteTeam?.jerseyColor || '',
  };

  const [formData, setFormData] = useState({
    name: team.name,
    shortName: team.shortName,
    location: team.location,
    locationId: '',
    founded: team.founded,
    homeGround: team.homeGround,
    captain: team.captain,
    coach: team.coach,
    jerseyColor: team.jerseyColor,
    logo: team.logo,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [squadPlayers, setSquadPlayers] = useState([]);
  const [loadingSquad, setLoadingSquad] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferringOwnership, setTransferringOwnership] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);

  const fetchSquadPlayers = async () => {
    if (!teamId) return [];
    setLoadingSquad(true);
    try {
      const res = await teamsApi.getTeamById(teamId);
      const raw = Array.isArray(res?.data) ? res.data[0] : (res?.data?.data || res?.data);
      const playersList = Array.isArray(raw?.players) ? raw.players : (Array.isArray(unnestedRouteTeam?.players) ? unnestedRouteTeam.players : []);
      const normalized = playersList.map((p, idx) => {
        const u = p?.id && typeof p.id === 'object' ? p.id : {};
        const pId = String(u._id || u.id || p?.id || p?._id || p?.playerId || idx);
        const name = u.username || u.name || p?.username || p?.name || `Player ${idx + 1}`;
        const image = u.profileImage || u.profileImg || p?.profileImage || p?.profileImg || null;
        const role = u.role || u.playerRole || p?.role || 'Player';
        return { id: pId, name, image, role };
      });
      setSquadPlayers(normalized);
      return normalized;
    } catch (err) {
      console.warn('[EditTeam] fetchSquadPlayers error:', err?.message || err);
      return [];
    } finally {
      setLoadingSquad(false);
    }
  };

  useEffect(() => {
    fetchSquadPlayers();
  }, [teamId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showGlobalAlert({
        title: 'Permission required',
        message: 'Please allow access to your photos to upload a logo.',
        type: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      showGlobalAlert({
        title: 'Permission required',
        message: 'Please allow camera access to take a photo.',
        type: 'warning',
      });
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
      showGlobalAlert({
        title: 'Error',
        message: 'Please enter a team name',
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

    setIsLoading(true);
    try {
      let logoUrl = formData.logo;
      if (formData.logo && !formData.logo.startsWith('http')) {
        const uploadRes = await upload(formData.logo, 'team');
        const uploadedLogo =
          uploadRes?.url ||
          uploadRes?.data?.url ||
          uploadRes?.data ||
          (typeof uploadRes === 'string' ? uploadRes : null);
        if (uploadedLogo) {
          logoUrl = uploadedLogo;
        }
      }

      const updatePayload = {
        title: formData.name.trim(),
        name: formData.name.trim(),
        shortName: formData.shortName.trim().toUpperCase(),
        location: formData.location.trim(),
        city: formData.location.trim(),
        ...(formData.locationId ? { locationId: formData.locationId } : {}),
        teamLogo: logoUrl,
        logo: logoUrl,
        logoImage: logoUrl,
        homeGround: formData.homeGround?.trim() || '',
        founded: formData.founded?.trim() || '',
        establishedYear: formData.founded?.trim() || '',
        captain: formData.captain?.trim() || '',
        coach: formData.coach?.trim() || '',
        jerseyColor: formData.jerseyColor?.trim() || '',
      };

      let updatedTeam = null;
      if (teamId) {
        const res = await teamsApi.updateTeam(teamId, updatePayload);
        const isSuccess = res?.status >= 200 && res?.status < 300 && res?.data?.success !== false;
        if (!isSuccess) {
          throw new Error(res?.data?.message || res?.data?.error || 'Failed to update team');
        }
        updatedTeam = res?.data?.data || res?.data?.team || res?.data?.content || res?.data;
      }

      const finalTeam = {
        ...(unnestedRouteTeam || {}),
        ...updatePayload,
        ...(typeof updatedTeam === 'object' && updatedTeam !== null ? updatedTeam : {}),
        _id: teamId,
        id: teamId,
      };

      if (typeof route.params?.onUpdate === 'function') {
        route.params.onUpdate(finalTeam);
      }
      if (typeof route.params?.cb === 'function') {
        route.params.cb(finalTeam);
      }

      DeviceEventEmitter.emit('TEAM_UPDATED', {
        teamId: String(teamId),
        team: finalTeam,
      });

      showGlobalAlert({
        title: 'Success',
        message: 'Team updated successfully!',
        type: 'success',
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              if (route.params?.returnScreen) {
                navigation.navigate(route.params.returnScreen, {
                  teamId,
                  team: finalTeam,
                  refresh: Date.now(),
                });
              } else {
                navigation.goBack();
              }
            },
          },
        ],
      });
    } catch (err) {
      console.error('Update team error:', err);
      showGlobalAlert({
        title: 'Error',
        message: err?.response?.data?.message || err.message || 'Failed to update team',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTransferModal = async () => {
    let list = squadPlayers;
    if (!list || list.length === 0) {
      list = await fetchSquadPlayers();
    }
    const currentOrganizerId = String(
      unnestedRouteTeam?.organizer?.[0]?._id ||
      unnestedRouteTeam?.organizer?.[0] ||
      unnestedRouteTeam?.createdBy ||
      currentUserId
    );
    const eligibleMembers = (list || []).filter(
      (p) => String(p.id) !== currentOrganizerId && String(p.id) !== currentUserId
    );
    if (!eligibleMembers || eligibleMembers.length === 0) {
      showGlobalAlert({
        title: 'Transfer Ownership',
        message: 'No eligible squad members available. Ownership can only be transferred to a player in the team squad. Please add players to the squad first.',
        type: 'warning',
      });
      return;
    }
    setTransferModalVisible(true);
  };

  const handleSelectNewOwner = (player) => {
    setTransferModalVisible(false);
    showGlobalAlert({
      title: 'Transfer Ownership',
      message: `Are you sure you want to transfer ownership of this team to ${player.name}? You will lose organizer privileges for this team.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: () => performTransfer(player.id, player.name),
        },
      ],
    });
  };

  const performTransfer = async (newOwnerId, newOwnerName) => {
    setTransferringOwnership(true);
    try {
      await teamsApi.transferOwnership(teamId, newOwnerId);
      DeviceEventEmitter.emit('TEAM_UPDATED', {
        teamId: String(teamId),
      });
      showGlobalAlert({
        title: 'Ownership Transferred',
        message: `Team ownership has been transferred to ${newOwnerName}.`,
        type: 'success',
        buttons: [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (err) {
      console.error('Transfer ownership error:', err);
      showGlobalAlert({
        title: 'Error',
        message: err?.response?.data?.message || err.message || 'Failed to transfer ownership',
        type: 'error',
      });
    } finally {
      setTransferringOwnership(false);
    }
  };

  const handleDeleteTeam = () => {
    showGlobalAlert({
      title: 'Delete Team',
      message: 'Are you sure you want to permanently delete this team? All team details and stats will be removed. This cannot be undone.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDeleteTeam,
        },
      ],
    });
  };

  const performDeleteTeam = async () => {
    setDeletingTeam(true);
    try {
      await teamsApi.deleteTeam(teamId);
      DeviceEventEmitter.emit('TEAM_DELETED', {
        teamId: String(teamId),
      });
      DeviceEventEmitter.emit('TEAM_UPDATED', {
        teamId: String(teamId),
        isDeleted: true,
      });
      showGlobalAlert({
        title: 'Deleted',
        message: 'Team has been deleted successfully.',
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
      console.error('Delete team error:', err);
      showGlobalAlert({
        title: 'Error',
        message: err?.response?.data?.message || err.message || 'Failed to delete team',
        type: 'error',
      });
    } finally {
      setDeletingTeam(false);
    }
  };

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

      <AppKeyboardAwareScrollView
        extraHeight={80}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={{ zIndex: 1000 }} className="mb-2">
            <LocationSearch
              label="Location *"
              locationType="city"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text, locationId: '' })}
              onSelectLocation={(loc) => {
                const locationText =
                  loc?.structured_formatting?.main_text || loc?.description || '';
                setFormData({ ...formData, location: locationText, locationId: loc?.place_id || '' });
              }}
              placeholder="Search or enter city"
              isDarkMode={isDarkMode}
            />
          </View>

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
              <TouchableOpacity
                onPress={handleOpenTransferModal}
                disabled={transferringOwnership || deletingTeam}
                activeOpacity={0.7}
                className={`p-3 rounded-lg flex-row items-center justify-between ${
                  isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
                }`}
              >
                <ThemedText className={`font-semibold ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                  Transfer Ownership
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteTeam}
                disabled={transferringOwnership || deletingTeam}
                activeOpacity={0.7}
                className={`p-3 rounded-lg flex-row items-center justify-between ${
                  isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
                }`}
              >
                <ThemedText className={`font-semibold ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                  Delete Team
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>
            </View>
          </View>
        </AppKeyboardAwareScrollView>

      {/* Transfer Ownership Modal */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View
            className={`w-full max-h-[80%] rounded-2xl p-5 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}
          >
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
              <View>
                <ThemedText className="text-lg font-bold text-gray-900 dark:text-white">
                  Transfer Ownership
                </ThemedText>
                <ThemedText className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Select a member from the team squad
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setTransferModalVisible(false)}
                className="p-1"
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDarkMode ? '#9CA3AF' : '#6B7280'}
                />
              </TouchableOpacity>
            </View>

            {loadingSquad ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
                <ThemedText className="text-sm text-gray-500 mt-2">
                  Loading squad members...
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={(squadPlayers || []).filter(
                  (p) =>
                    String(p.id) !== currentUserId &&
                    String(p.id) !==
                      String(
                        unnestedRouteTeam?.organizer?.[0]?._id ||
                          unnestedRouteTeam?.organizer?.[0] ||
                          unnestedRouteTeam?.createdBy ||
                          ''
                      )
                )}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectNewOwner(item)}
                    className={`flex-row items-center p-3 mb-2 rounded-xl border ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        className="w-10 h-10 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center">
                        <ThemedText className="text-white font-bold text-base">
                          {(item.name || 'P').charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <ThemedText className="font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </ThemedText>
                      <ThemedText className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {item.role || 'Squad Member'}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={isDarkMode ? '#9CA3AF' : '#6B7280'}
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="py-6 items-center">
                    <ThemedText className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      No other squad members found in this team.
                    </ThemedText>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
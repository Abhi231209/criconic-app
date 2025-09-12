import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import ThemedText from '@/components/ui/custom/ThemedText';
import ScoreCard from '@/components/ui/ScoreCard';
import SCREENS from '@/screens';

export default function MyCricket() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState('matches');
  const [refreshing, setRefreshing] = useState(false);

  // Sample data with some missing prize money
  const recentMatches = [
    { id: '1', team1: 'MI', team2: 'CSK', score: 'MI 185/5 (20) vs CSK 176/8 (20)', result: 'MI won by 9 runs', date: '2 hours ago' },
    { id: '2', team1: 'RCB', team2: 'KKR', score: 'RCB 205/3 (20) vs KKR 208/4 (19.2)', result: 'KKR won by 6 wickets', date: '1 day ago' },
    { id: '3', team1: 'DC', team2: 'SRH', score: 'DC 175/6 (20) vs SRH 176/5 (19.1)', result: 'SRH won by 5 wickets', date: '2 days ago' },
  ];

  const tournaments = [
    { id: '1', name: 'IPL 2024', teams: 10, matches: 74, status: 'Ongoing', prize: '₹20 Crores' },
    { id: '2', name: 'Local League', teams: 8, matches: 28, status: 'Completed' }, // No prize money
    { id: '3', name: 'Friendly Matches', teams: 4, matches: 6, status: 'Upcoming' }, // No prize money
    { id: '4', name: 'Corporate Cup', teams: 12, matches: 33, status: 'Upcoming', prize: '₹5 Lakhs' },
  ];

  const teams = [
    { id: '1', name: 'Mumbai Indians', shortName: 'MI', players: 25, matches: 14, wins: 9 },
    { id: '2', name: 'Chennai Super Kings', shortName: 'CSK', players: 22, matches: 14, wins: 8 },
    { id: '3', name: 'Royal Challengers Bangalore', shortName: 'RCB', players: 23, matches: 14, wins: 7 },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const TabButton = ({ title, tabName, icon }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tabName)}
      className={`flex-1 py-4 px-2 items-center rounded-lg mx-1 ${
        activeTab === tabName 
          ? 'bg-blue-600' 
          : isDarkMode 
            ? 'bg-gray-800' 
            : 'bg-gray-200'
      }`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={activeTab === tabName ? '#FFFFFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
      />
      <ThemedText
        className={`text-xs mt-1 font-medium ${
          activeTab === tabName 
            ? 'text-white' 
            : isDarkMode 
              ? 'text-gray-400' 
              : 'text-gray-600'
        }`}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderMatchesTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ alignItems: 'center' }} // Center align all content
    >
      <ThemedText className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Recent Matches
      </ThemedText>
      
      {recentMatches.map((match) => (
        <View key={match.id} className="mb-4 w-full max-w-md"> // Center aligned with max width
          <ScoreCard
            match={match}
            onPress={() => console.log('Match pressed:', match.id)}
          />
        </View>
      ))}
      
      {recentMatches.length === 0 && (
        <View className="items-center py-8 w-full">
          <Ionicons name="trophy-outline" size={48} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          <ThemedText className={`text-lg mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No matches found
          </ThemedText>
          <ThemedText className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Create your first match to get started
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );

  const renderTournamentsTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ alignItems: 'center' }} // Center align all content
    >
      <ThemedText className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Your Tournaments
      </ThemedText>
      
      {tournaments.map((tournament) => (
        <TouchableOpacity
          key={tournament.id}
          className={`p-4 rounded-xl mb-4 w-full max-w-md ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-sm`}
          onPress={() => navigation.navigate(SCREENS.TournamentProfile)} // Assuming a TournamentDetails screen exists
        >
          <View className="flex-row justify-between items-start mb-2">
            <ThemedText className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {tournament.name}
            </ThemedText>
            <View className={`px-3 py-1 rounded-full ${
              tournament.status === 'Ongoing' ? 'bg-green-100' :
              tournament.status === 'Completed' ? 'bg-gray-100' :
              'bg-blue-100'
            }`}>
              <ThemedText className={`text-xs font-medium ${
                tournament.status === 'Ongoing' ? 'text-green-800' :
                tournament.status === 'Completed' ? 'text-gray-800' :
                'text-blue-800'
              }`}>
                {tournament.status}
              </ThemedText>
            </View>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="people-outline" size={16} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
              <ThemedText className={`text-sm ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {tournament.teams} teams
              </ThemedText>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
              <ThemedText className={`text-sm ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {tournament.matches} matches
              </ThemedText>
            </View>
          </View>
          
          {/* Prize Money - Only show if available */}
          {tournament.prize ? (
            <View className="flex-row justify-between items-center mb-2">
              <ThemedText className={`text-sm font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                🏆 {tournament.prize}
              </ThemedText>
            </View>
          ) : (
            <View className="mb-2">
              <ThemedText className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                No prize money
              </ThemedText>
            </View>
          )}
          
          <View className="flex-row justify-between items-center">
            <ThemedText className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Click to view details
            </ThemedText>
            <TouchableOpacity className="p-2">
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
      
      {tournaments.length === 0 && (
        <View className="items-center py-8 w-full">
          <Ionicons name="trophy-outline" size={48} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          <ThemedText className={`text-lg mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No tournaments found
          </ThemedText>
          <ThemedText className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Create your first tournament to get started
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );

  const renderTeamsTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      className="px-4"
      contentContainerStyle={{ alignItems: 'center' }} // Center align all content
    >
      <ThemedText className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Your Teams
      </ThemedText>
      
      {teams.map((team) => (
        <TouchableOpacity
          key={team.id}
          className={`p-4 rounded-xl mb-4 w-full max-w-md ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-sm`}
          onPress={() => navigation.navigate('TeamProfile', { teamId: team.id })} // Assuming a TeamDetails screen exists
        >
          <View className="flex-row justify-between items-start mb-3">
            <View>
              <ThemedText className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {team.name}
              </ThemedText>
              <ThemedText className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                ({team.shortName})
              </ThemedText>
            </View>
            <View className={`px-3 py-1 rounded-full bg-blue-100`}>
              <ThemedText className="text-xs font-medium text-blue-800">
                {team.wins} Wins
              </ThemedText>
            </View>
          </View>
          
          <View className="flex-row justify-between">
            <View className="flex-row items-center">
              <Ionicons name="people-outline" size={16} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
              <ThemedText className={`text-sm ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {team.players} players
              </ThemedText>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
              <ThemedText className={`text-sm ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {team.matches} matches
              </ThemedText>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      
      {teams.length === 0 && (
        <View className="items-center py-8 w-full">
          <Ionicons name="people-outline" size={48} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          <ThemedText className={`text-lg mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No teams found
          </ThemedText>
          <ThemedText className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Create your first team to get started
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header with Back Button */}
      <View className={`px-4 py-4 border-b flex-row items-center ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="p-2 mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <View className="flex-1">
          <ThemedText className="text-2xl font-bold text-gray-900 dark:text-white">
            My Cricket
          </ThemedText>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your cricket activities
          </ThemedText>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className={`px-4 py-3 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <View className="flex-row justify-between">
          <TabButton title="Matches" tabName="matches" icon="calendar-outline" />
          <TabButton title="Tournaments" tabName="tournaments" icon="trophy-outline" />
          <TabButton title="Teams" tabName="teams" icon="people-outline" />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563EB']}
              tintColor={isDarkMode ? '#2563EB' : '#2563EB'}
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {activeTab === 'matches' && renderMatchesTab()}
          {activeTab === 'tournaments' && renderTournamentsTab()}
          {activeTab === 'teams' && renderTeamsTab()}
        </ScrollView>
      </View>

      {/* Create New Button */}
      <View className={`p-4 border-t ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <TouchableOpacity className="items-center">
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            className="rounded-full py-3 px-8 items-center"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ThemedText className="text-white text-lg font-semibold">
              Create New
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
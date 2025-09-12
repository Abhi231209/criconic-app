import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  useColorScheme,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInRight,
  ZoomIn,
  LightSpeedInRight,
  FadeOut,
  SlideOutRight,
} from 'react-native-reanimated';
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome5, 
  MaterialCommunityIcons,
  Feather 
} from '@expo/vector-icons';
import ThemedText from '../custom/ThemedText';

// Dummy data for the component
const dummyData = {
  score: {
    title: "ICC World Cup 2023 - Match 24",
    tournament: {
      title: "ICC World Cup 2023",
      _id: "tournament123"
    },
    roundType: "Group Stage",
    matchTotalOver: 50,
    date: "2023-10-24T14:30:00Z",
    venue: "Melbourne Cricket Ground",
    ballType: "white",
    matchType: "one day",
    toss: "India won the toss and elected to bat",
    matchOfficials: {
      umpires: ["Aleem Dar", "Kumar Dharmasena"],
      referee: "Ranjan Madugalle"
    },
    teams: [
      {
        teamId: "team1",
        title: "India",
        teamLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/1200px-Flag_of_India.svg.png",
        shortName: "IND"
      },
      {
        teamId: "team2",
        title: "Australia",
        teamLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Flag_of_Australia_%28converted%29.svg/1200px-Flag_of_Australia_%28converted%29.svg.png",
        shortName: "AUS"
      }
    ]
  },
  headToHeadStats: {
    matchesPlayed: 142,
    teamA: "team1",
    teamAWins: 50,
    teamB: "team2",
    teamBWins: 80,
    draws: 12
  },
  teamsRecentForm: {
    recentForms: [
      {
        teamId: "team1",
        title: "India",
        recentForm: ["W", "W", "L", "W", "W"]
      },
      {
        teamId: "team2",
        title: "Australia",
        recentForm: ["W", "L", "W", "L", "W"]
      }
    ]
  },
  weather: {
    condition: "Sunny",
    temperature: "28°C",
    humidity: "45%",
    precipitation: "0%"
  },
  pitchReport: "Good batting surface with some help for spinners as the match progresses"
};

// Custom date formatting function
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const options = { 
    weekday: 'short',
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleDateString('en-US', options);
};

// Capitalize first word function
const capitalizeFirstWord = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Image placeholder component
const ImagePlaceHolder = ({ image, name, className, size = 12 }) => {
  const colorScheme = useColorScheme();
  const bgColor = colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200';
  const borderColor = colorScheme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  
  if (image) {
    return (
      <Image
        source={{ uri: image }}
        className={`w-${size} h-${size} rounded-full border-2 ${borderColor} ${className}`}
      />
    );
  }
  
  return (
    <View className={`w-${size} h-${size} rounded-full border-2 ${borderColor} ${bgColor} justify-center items-center ${className}`}>
      <ThemedText className={`${colorScheme === 'dark' ? 'text-white' : 'text-gray-800'} font-bold text-lg`}>
        {name?.charAt(0)?.toUpperCase() || 'T'}
      </ThemedText>
    </View>
  );
};

// Animated Section Header Component
const AnimatedSectionHeader = ({ title, icon, isExpanded, onPress }) => {
  const colorScheme = useColorScheme();
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-900';
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const iconColor = colorScheme === 'dark' ? '#60a5fa' : '#3b82f6';
  
  return (
    <ScrollView>
    <Animated.View entering={SlideInRight}>
      <TouchableOpacity 
        onPress={onPress}
        className={`flex-row justify-between items-center py-4 px-5 rounded-xl ${bgColor} mb-2 shadow-sm`}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center gap-3">
          {icon}
          <ThemedText className={`text-lg font-semibold ${textColor}`}>{title}</ThemedText>
        </View>
        <Animated.View 
          style={{ transform: [{ rotate: isExpanded ? '0deg' : '180deg' }] }}
          className="transition-transform duration-300"
        >
          <Feather name="chevron-up" size={24} color={iconColor} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
    </ScrollView>
  );
};

// Info Item Component
const InfoItem = ({ icon, label, value, clickable }) => {
  const colorScheme = useColorScheme();
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-800';
  const labelColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  
  return (
    <View className={`flex-row items-center gap-4 p-4 rounded-xl ${bgColor} mb-2 shadow-sm`}>
      <View className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
        {icon}
      </View>
      <View className="flex-1">
        <ThemedText className={`text-sm ${labelColor}`}>{label}</ThemedText>
        <ThemedText className={`text-base font-medium ${textColor} ${clickable ? 'text-blue-500 dark:text-blue-400' : ''}`}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
};

// Recent Form Indicator
const FormIndicator = ({ result }) => {
  const getBgColor = () => {
    if (result === 'W') return 'bg-green-500';
    if (result === 'L') return 'bg-red-500';
    return 'bg-gray-500';
  };
  
  return (
    <View className={`w-7 h-7 rounded-full ${getBgColor()} items-center justify-center mx-0.5`}>
      <ThemedText className="text-xs font-bold text-white">{result}</ThemedText>
    </View>
  );
};

// Teams and Head to Head Section
const TeamsSection = ({ score, headToHeadStats, cardBg, textColor }) => {
  const matchWin = (teamId) => {
    if (!teamId) {
      return headToHeadStats?.draws || 0;
    }
    if (headToHeadStats?.teamA == teamId) {
      return headToHeadStats?.teamAWins || 0;
    } else {
      return headToHeadStats?.teamBWins || 0;
    }
  };

  return (
    <Animated.View 
      entering={FadeIn}
      className={`${cardBg} rounded-2xl p-5 shadow-sm`}
    >
      {/* Teams List */}
      <View className="mb-6">
        {score.teams.map((team, index) => (
          <Animated.View
            key={team.teamId}
            entering={SlideInRight.delay(index * 100)}
            className="flex-row items-center gap-4 p-3 mb-3 rounded-xl bg-gray-100 dark:bg-gray-700"
          >
            <ImagePlaceHolder
              image={team.teamLogo}
              name={team.title}
            />
            <ThemedText className={`text-lg font-medium ${textColor}`}>
              {team.title}
            </ThemedText>
          </Animated.View>
        ))}
      </View>

      {/* Head to Head Stats */}
      {headToHeadStats?.matchesPlayed && (
        <Animated.View 
          entering={SlideInRight.delay(200)}
          className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20"
        >
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="stats-chart" size={18} color="#60a5fa" />
            <ThemedText className={`text-md font-semibold ${textColor}`}>
              HEAD TO HEAD
            </ThemedText>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <View className="items-center flex-1">
              <ThemedText className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {headToHeadStats.matchesPlayed}
              </ThemedText>
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400">Matches</ThemedText>
            </View>
            
            <View className="items-center flex-1 border-l border-r border-gray-200 dark:border-gray-700">
              <ThemedText className="text-2xl font-bold text-green-600 dark:text-green-400">
                {matchWin(score.teams[0].teamId)}
              </ThemedText>
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400">{score.teams[0].shortName}</ThemedText>
            </View>
            
            <View className="items-center flex-1">
              <ThemedText className="text-2xl font-bold text-red-600 dark:text-red-400">
                {matchWin(score.teams[1].teamId)}
              </ThemedText>
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400">{score.teams[1].shortName}</ThemedText>
            </View>
          </View>
          
          {headToHeadStats.draws > 0 && (
            <View className="items-center mt-2">
              <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                {headToHeadStats.draws} Draws
              </ThemedText>
            </View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};

// Match Details Section
const MatchDetailsSection = ({ infoItems, cardBg }) => {
  return (
    <Animated.View 
      entering={FadeIn}
      className={`${cardBg} rounded-2xl p-1 shadow-sm`}
    >
      {infoItems.map((item, index) => (
        <InfoItem
          key={index}
          icon={item.icon}
          label={item.label}
          value={item.value}
          clickable={item.clickable}
        />
      ))}
    </Animated.View>
  );
};

// Recent Form Section
const RecentFormSection = ({ teamsRecentForm, cardBg, textColor }) => {
  return (
    <Animated.View 
      entering={FadeIn}
      className={`${cardBg} rounded-2xl p-5 shadow-sm`}
    >
      <View className="flex-row justify-between">
        {teamsRecentForm.recentForms.map((team, index) => (
          <Animated.View 
            key={team.teamId}
            entering={LightSpeedInRight.delay(index * 150)}
            className="items-center flex-1 mx-2"
          >
            <ThemedText className={`text-sm font-medium mb-3 ${textColor}`}>
              {team.title}
            </ThemedText>
            <View className="flex-row justify-center">
              {team.recentForm.map((result, i) => (
                <FormIndicator key={i} result={result} />
              ))}
            </View>
          </Animated.View>
        ))}
      </View>
      
      <View className="flex-row justify-center mt-5 gap-4">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-green-500 mr-1" />
          <ThemedText className="text-xs text-gray-500 dark:text-gray-400">Win</ThemedText>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-red-500 mr-1" />
          <ThemedText className="text-xs text-gray-500 dark:text-gray-400">Loss</ThemedText>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-gray-500 mr-1" />
          <ThemedText className="text-xs text-gray-500 dark:text-gray-400">Draw/NR</ThemedText>
        </View>
      </View>
    </Animated.View>
  );
};

export default function MatchInfo() {
  const { score, headToHeadStats, teamsRecentForm, weather, pitchReport } = dummyData;
  const colorScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    details: true,
    recentForm: true,
    conditions: true,
  });

  // Toggle section
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Theme-based colors
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';
  const cardBg = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-900';
  const secondaryText = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  // Enhanced info items with more cricket-specific data
  const infoItems = [
    score?.tournament?.title && {
      icon: <Ionicons name="trophy" size={20} color="#f59e0b" />,
      label: 'Tournament',
      value: score?.tournament?.title,
      clickable: true,
    },
    score?.roundType && {
      icon: <MaterialIcons name="emoji-events" size={20} color="#60a5fa" />,
      label: 'Round',
      value: score?.roundType,
    },
    score?.matchTotalOver && {
      icon: <MaterialCommunityIcons name="cricket" size={20} color="#10b981" />,
      label: 'Overs',
      value: `${score?.matchTotalOver} overs match`,
    },
    score?.date && {
      icon: <FontAwesome5 name="calendar" size={18} color="#a78bfa" />,
      label: 'Date & Time',
      value: formatDate(score?.date),
    },
    score?.venue && {
      icon: <FontAwesome5 name="map-marker-alt" size={18} color="#ef4444" />,
      label: 'Venue',
      value: score?.venue,
    },
    score?.ballType && {
      icon: <Ionicons name="baseball" size={20} color="#f97316" />,
      label: 'Ball Type',
      value: capitalizeFirstWord(score.ballType),
    },
    score?.matchType && {
      icon: <MaterialIcons name="format-list-bulleted" size={20} color="#ec4899" />,
      label: 'Match Format',
      value: capitalizeFirstWord(score.matchType),
    },
    score?.toss && {
      icon: <MaterialIcons name="casino" size={20} color="#14b8a6" />,
      label: 'Toss Result',
      value: score.toss,
    },
    score?.matchOfficials?.umpires && {
      icon: <MaterialCommunityIcons name="account-tie" size={20} color="#8b5cf6" />,
      label: 'Umpires',
      value: score.matchOfficials.umpires.join(', '),
    },
    score?.matchOfficials?.referee && {
      icon: <MaterialCommunityIcons name="whistle" size={20} color="#f43f5e" />,
      label: 'Match Referee',
      value: score.matchOfficials.referee,
    },
    weather && {
      icon: <Ionicons name="partly-sunny" size={20} color="#f59e0b" />,
      label: 'Weather',
      value: `${weather.condition}, ${weather.temperature}`,
    },
    pitchReport && {
      icon: <Ionicons name="leaf" size={20} color="#10b981" />,
      label: 'Pitch Report',
      value: pitchReport,
    },
  ].filter(Boolean);

  return (
      <View className="p-4">
        {/* Match Header */}
        <Animated.View 
          entering={ZoomIn.duration(600)}
          className={`${cardBg} rounded-2xl p-5 mb-5 shadow-lg`}
        >
          <ThemedText className={`text-xl font-bold text-center ${textColor} mb-1`}>
            {score.title}
          </ThemedText>
          <ThemedText className={`text-sm text-center ${secondaryText}`}>
            {formatDate(score.date)}
          </ThemedText>
          
          {/* Teams vs Badge */}
          <View className="flex-row justify-center items-center my-6">
            <View className="items-center flex-1">
              <ImagePlaceHolder 
                image={score.teams[0].teamLogo} 
                name={score.teams[0].title}
                size="16"
              />
              <ThemedText className={`font-bold mt-2 ${textColor}`}>
                {score.teams[0].shortName}
              </ThemedText>
            </View>
            
            <View className="mx-4 items-center">
              <View className="bg-red-500 px-3 py-1 rounded-full">
                <ThemedText className="text-white font-bold">VS</ThemedText>
              </View>
            </View>
            
            <View className="items-center flex-1">
              <ImagePlaceHolder 
                image={score.teams[1].teamLogo} 
                name={score.teams[1].title}
                size="16"
              />
              <ThemedText className={`font-bold mt-2 ${textColor}`}>
                {score.teams[1].shortName}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Teams Section with Head-to-Head */}
        <View className="mb-5">
          <AnimatedSectionHeader
            title="TEAMS & HEAD TO HEAD"
            icon={<Ionicons name="people" size={22} color="#60a5fa" />}
            isExpanded={expandedSections.teams}
            onPress={() => toggleSection('teams')}
          />
          
          {expandedSections.teams && (
            <TeamsSection 
              score={score} 
              headToHeadStats={headToHeadStats} 
              cardBg={cardBg} 
              textColor={textColor} 
            />
          )}
        </View>

        {/* Match Information */}
        <View className="mb-5">
          <AnimatedSectionHeader
            title="MATCH DETAILS"
            icon={<Ionicons name="information-circle" size={22} color="#60a5fa" />}
            isExpanded={expandedSections.details}
            onPress={() => toggleSection('details')}
          />
          
          {expandedSections.details && (
            <MatchDetailsSection 
              infoItems={infoItems} 
              cardBg={cardBg} 
            />
          )}
        </View>

        {/* Recent Form */}
        {teamsRecentForm?.recentForms?.length > 0 && (
          <View className="mb-5">
            <AnimatedSectionHeader
              title="RECENT FORM"
              icon={<Ionicons name="pulse" size={22} color="#a78bfa" />}
              isExpanded={expandedSections.recentForm}
              onPress={() => toggleSection('recentForm')}
            />
            
            {expandedSections.recentForm && (
              <RecentFormSection 
                teamsRecentForm={teamsRecentForm} 
                cardBg={cardBg} 
                textColor={textColor} 
              />
            )}
          </View>
        )}

        {/* Add some extra space at the bottom for better scrolling */}
        <View className="h-10" />
      </View>
  );
}
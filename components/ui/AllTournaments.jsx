import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";

export default function AllTournaments() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  // Sample tournament data
  const tournaments = [
    {
      id: "1",
      name: "IPL 2024",
      shortName: "IPL24",
      logo: null,
      startDate: "2024-03-22",
      endDate: "2024-05-26",
      location: "India",
      teams: 10,
      status: "ongoing",
      format: "T20",
      prizeMoney: "₹20 Crores",
      matches: 74,
      progress: 65,
    },
    {
      id: "2",
      name: "T20 World Cup 2024",
      shortName: "T20WC24",
      logo: null,
      startDate: "2024-06-01",
      endDate: "2024-06-29",
      location: "West Indies & USA",
      teams: 20,
      status: "upcoming",
      format: "T20",
      prizeMoney: "$5.6 Million",
      matches: 55,
      progress: 0,
    },
    {
      id: "3",
      name: "Big Bash League 2023-24",
      shortName: "BBL13",
      logo: null,
      startDate: "2023-12-07",
      endDate: "2024-01-24",
      location: "Australia",
      teams: 8,
      status: "completed",
      format: "T20",
      prizeMoney: "A$1.2 Million",
      matches: 44,
      progress: 100,
    },
    {
      id: "4",
      name: "PSL 2024",
      shortName: "PSL9",
      logo: null,
      startDate: "2024-02-17",
      endDate: "2024-03-18",
      location: "Pakistan",
      teams: 6,
      status: "ongoing",
      format: "T20",
      prizeMoney: "$1 Million",
      matches: 34,
      progress: 40,
    },
    {
      id: "5",
      name: "Cricket World Cup 2023",
      shortName: "CWC23",
      logo: null,
      startDate: "2023-10-05",
      endDate: "2023-11-19",
      location: "India",
      teams: 10,
      status: "completed",
      format: "ODI",
      prizeMoney: "$10 Million",
      matches: 48,
      progress: 100,
    },
    {
      id: "6",
      name: "The Hundred 2024",
      shortName: "HUND24",
      logo: null,
      startDate: "2024-07-23",
      endDate: "2024-08-18",
      location: "England",
      teams: 8,
      status: "upcoming",
      format: "100-Ball",
      prizeMoney: "£600,000",
      matches: 34,
      progress: 0,
    },
  ];

  const filters = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === "all") return matchesSearch;
    return matchesSearch && tournament.status === activeFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "ongoing": return { bg: "bg-green-100", text: "text-green-800", darkBg: "bg-green-900/30", darkText: "text-green-400" };
      case "upcoming": return { bg: "bg-blue-100", text: "text-blue-800", darkBg: "bg-blue-900/30", darkText: "text-blue-400" };
      case "completed": return { bg: "bg-gray-100", text: "text-gray-800", darkBg: "bg-gray-700", darkText: "text-gray-400" };
      default: return { bg: "bg-gray-100", text: "text-gray-800", darkBg: "bg-gray-700", darkText: "text-gray-400" };
    }
  };

  const renderTournamentCard = ({ item }) => {
    const statusColors = getStatusColor(item.status);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate(SCREENS.TournamentProfile, { tournament: item })}
        className={`rounded-xl mb-4 overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}
      >
        <LinearGradient
          colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
          className="p-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-3">
                <ThemedText className="text-white font-bold text-sm">
                  {item.shortName}
                </ThemedText>
              </View>
              <View>
                <ThemedText className="text-white font-bold text-lg">
                  {item.name}
                </ThemedText>
                <ThemedText className="text-blue-100 text-sm">
                  {item.location}
                </ThemedText>
              </View>
            </View>
            <View className={`px-3 py-1 rounded-full ${isDarkMode ? statusColors.darkBg : statusColors.bg}`}>
              <ThemedText className={`text-xs font-medium ${isDarkMode ? statusColors.darkText : statusColors.text}`}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        <View className="p-4">
          <View className="flex-row justify-between mb-3">
            <View className="items-center">
              <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}>
                Teams
              </ThemedText>
              <ThemedText className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {item.teams}
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}>
                Matches
              </ThemedText>
              <ThemedText className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {item.matches}
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}>
                Format
              </ThemedText>
              <ThemedText className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {item.format}
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}>
                Prize
              </ThemedText>
              <ThemedText className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {item.prizeMoney}
              </ThemedText>
            </View>
          </View>

          {/* Progress bar */}
          {item.status !== "upcoming" && (
            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Progress
                </ThemedText>
                <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {item.progress}%
                </ThemedText>
              </View>
              <View className={`h-2 rounded-full ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                <View 
                  className={`h-2 rounded-full ${
                    item.status === "completed" ? "bg-green-500" : 
                    item.status === "ongoing" ? "bg-blue-500" : "bg-gray-400"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </View>
            </View>
          )}

          <View className="flex-row justify-between items-center mt-2">
            <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              {item.startDate} - {item.endDate}
            </ThemedText>
            <TouchableOpacity 
              className={`px-3 py-1 rounded-full ${isDarkMode ? "bg-blue-900/30" : "bg-blue-100"}`}
              onPress={() => navigation.navigate(SCREENS.TournamentProfile, { tournament: item })}
            >
              <ThemedText className={`text-xs ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                View Details
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ filter }) => (
    <TouchableOpacity
      onPress={() => setActiveFilter(filter.id)}
      className={`px-4 py-2 rounded-full mr-2 ${
        activeFilter === filter.id
          ? isDarkMode ? "bg-blue-700" : "bg-blue-600"
          : isDarkMode ? "bg-gray-700" : "bg-gray-200"
      }`}
    >
      <ThemedText
        className={`text-sm ${
          activeFilter === filter.id
            ? "text-white"
            : isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {filter.label}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header */}
      <View
        className={`px-4 py-4 border-b flex-row items-center justify-between ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#FFFFFF" : "#000000"} />
        </TouchableOpacity>

        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          All Tournaments
        </ThemedText>

        <TouchableOpacity className="p-2">
          <Ionicons name="add-circle-outline" size={24} color={isDarkMode ? "#FFFFFF" : "#000000"} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className={`p-4 ${isDarkMode ? "bg-gray-800" : "bg-white"} border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
        <View className={`flex-row items-center px-3 py-2 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <TextInput
            placeholder="Search tournaments..."
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className={`flex-1 ml-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips - Fixed Layout */}
      <View className={`py-3 px-4 ${isDarkMode ? "bg-gray-800" : "bg-white"} border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {filters.map((filter) => (
            <FilterButton key={filter.id} filter={filter} />
          ))}
        </ScrollView>
      </View>

      {/* Tournament List */}
      <FlatList
        data={filteredTournaments}
        keyExtractor={(item) => item.id}
        renderItem={renderTournamentCard}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor={isDarkMode ? "#FFFFFF" : "#000000"}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-10">
            <Ionicons name="trophy-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <ThemedText className={`text-lg mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              No tournaments found
            </ThemedText>
            <ThemedText className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              Try adjusting your search or filters
            </ThemedText>
          </View>
        }
      />
    </SafeAreaView>
  );
}
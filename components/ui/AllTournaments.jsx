import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import AnimatedFooter from "./AnimatedFooter";
import { tournamentsApi } from "@/utils/api";

export default function AllTournaments() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapTournament = (t) => {
    const startDateStr = t.date?.start
      ? new Date(t.date.start).toISOString().split("T")[0]
      : "TBD";
    const endDateStr = t.date?.end
      ? new Date(t.date.end).toISOString().split("T")[0]
      : "TBD";
    const now = new Date();
    const start = t.date?.start ? new Date(t.date.start) : null;
    const end = t.date?.end ? new Date(t.date.end) : null;
    let status = "ongoing";
    if (start && now < start) status = "upcoming";
    else if (end && now > end) status = "completed";
    if (t.status) status = t.status.toLowerCase();

    return {
      id: String(t._id || t.id || t.slug),
      name: t.title || t.name || "Tournament",
      shortName:
        t.shortName ||
        (t.title ? t.title.slice(0, 4).toUpperCase() : "TRN"),
      logo: t.logoImage || t.logo || null,
      startDate: startDateStr,
      endDate: endDateStr,
      location: t.location || "Location not specified",
      teams: Array.isArray(t.teams) ? t.teams.length : t.maxTeams || 0,
      status,
      format: t.ballType
        ? t.ballType.charAt(0).toUpperCase() + t.ballType.slice(1)
        : "T20",
      prizeMoney: t.prizeMoney ? `₹${t.prizeMoney}` : "N/A",
      matches: Array.isArray(t.matches) ? t.matches.length : 0,
      progress: status === "completed" ? 100 : status === "upcoming" ? 0 : 50,
      raw: t,
    };
  };

  const fetchTournaments = async () => {
    try {
      const res = await tournamentsApi.getAllTournaments();
      const list = res?.data?.content || res?.data || [];
      if (Array.isArray(list)) {
        setTournaments(list.map(mapTournament));
      }
    } catch (error) {
      console.warn("[AllTournaments] Failed to fetch tournaments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const filters = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesSearch =
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tournament.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "all") return matchesSearch;
    return matchesSearch && tournament.status === activeFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "ongoing":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          darkBg: "bg-green-900/30",
          darkText: "text-green-400",
        };
      case "upcoming":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          darkBg: "bg-blue-900/30",
          darkText: "text-blue-400",
        };
      case "completed":
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          darkBg: "bg-gray-700",
          darkText: "text-gray-400",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          darkBg: "bg-gray-700",
          darkText: "text-gray-400",
        };
    }
  };

  const renderTournamentCard = ({ item }) => {
    const statusColors = getStatusColor(item.status);

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate(SCREENS.TournamentProfile, { tournament: item })
        }
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
            <View
              className={`px-3 py-1 rounded-full ${isDarkMode ? statusColors.darkBg : statusColors.bg}`}
            >
              <ThemedText
                className={`text-xs font-medium ${isDarkMode ? statusColors.darkText : statusColors.text}`}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        <View className="p-4">
          <View className="flex-row justify-between mb-3">
            <View className="items-center">
              <ThemedText
                className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
              >
                Teams
              </ThemedText>
              <ThemedText
                className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {item.teams}
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText
                className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
              >
                Matches
              </ThemedText>
              <ThemedText
                className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {item.matches}
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText
                className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
              >
                Format
              </ThemedText>
              <ThemedText
                className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {item.format}
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText
                className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"} mb-1`}
              >
                Prize
              </ThemedText>
              <ThemedText
                className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {item.prizeMoney}
              </ThemedText>
            </View>
          </View>

          {/* Progress bar */}
          {item.status !== "upcoming" && (
            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <ThemedText
                  className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Progress
                </ThemedText>
                <ThemedText
                  className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {item.progress}%
                </ThemedText>
              </View>
              <View
                className={`h-2 rounded-full ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
              >
                <View
                  className={`h-2 rounded-full ${
                    item.status === "completed"
                      ? "bg-green-500"
                      : item.status === "ongoing"
                        ? "bg-blue-500"
                        : "bg-gray-400"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </View>
            </View>
          )}

          <View className="flex-row justify-between items-center mt-2">
            <ThemedText
              className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {item.startDate} - {item.endDate}
            </ThemedText>
            <TouchableOpacity
              className={`px-3 py-1 rounded-full ${isDarkMode ? "bg-blue-900/30" : "bg-blue-100"}`}
              onPress={() =>
                navigation.navigate(SCREENS.TournamentProfile, {
                  tournament: item,
                })
              }
            >
              <ThemedText
                className={`text-xs ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
              >
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
          ? isDarkMode
            ? "bg-blue-700"
            : "bg-blue-600"
          : isDarkMode
            ? "bg-gray-700"
            : "bg-gray-200"
      }`}
    >
      <ThemedText
        className={`text-sm ${
          activeFilter === filter.id
            ? "text-white"
            : isDarkMode
              ? "text-gray-300"
              : "text-gray-700"
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
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkMode ? "#FFFFFF" : "#000000"}
          />
        </TouchableOpacity>

        <ThemedText className="text-xl font-bold text-gray-900 dark:text-white">
          All Tournaments
        </ThemedText>

        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.CreateTournament)}
          className="p-2"
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={isDarkMode ? "#FFFFFF" : "#000000"}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        className={`p-4 ${isDarkMode ? "bg-gray-800" : "bg-white"} border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
      >
        <View
          className={`flex-row items-center px-3 py-2 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}
        >
          <Ionicons
            name="search"
            size={20}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <TextInput
            placeholder="Search tournaments..."
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className={`flex-1 ml-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips - Fixed Layout */}
      <View
        className={`py-3 px-4 ${isDarkMode ? "bg-gray-800" : "bg-white"} border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
      >
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
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
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
            <Ionicons
              name="trophy-outline"
              size={48}
              color={isDarkMode ? "#4B5563" : "#9CA3AF"}
            />
            <ThemedText
              className={`text-lg mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              No tournaments found
            </ThemedText>
            <ThemedText
              className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
            >
              Try adjusting your search or filters
            </ThemedText>
          </View>
        }
      />
      <AnimatedFooter currentTab="Tournament" />
    </SafeAreaView>
  );
}

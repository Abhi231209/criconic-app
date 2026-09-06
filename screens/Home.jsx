import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ImageBackground,
  useColorScheme,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import useMatches from "../hooks/useMatches";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useAxiosGet } from "@/hooks/useApi";
import ScoreCard from "@/components/ui/ScoreCard";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import NavBar from "@/components/ui/NavBar";
import SCREENS from "@/screens";
import AnimatedFooter from "@/components/ui/AnimatedFooter";

const MATCHES_CONDITION = { items: 10 };

export default function Home({}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [homeConfig, setHomeConfig] = useState({});
  const [tournaments, setTournaments] = useState([]);

  const { matchesIds, setMatchesIds, refresh: refreshMatches } = useMatches({
    initialCondition: MATCHES_CONDITION,
  });

  useFocusEffect(
    useCallback(() => {
      refreshMatches?.();
    }, [refreshMatches])
  );

  const {
    get: getConfigDetails,
    isLoading,
    data,
    error,
  } = useAxiosGet("api/configs", {
    showAlert: true,
    useBaseURL: true,
  });

  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  const getConfig = async () => {
    const res = await getConfigDetails();
    if (res?.data?.content && res?.data?.success) {
      setHomeConfig(res.data.content.homePage);
      if (res.data.content?.tournaments?.length) {
        setTournaments(res.data.content.tournaments);
      }
    }
  };

  useEffect(() => {
    getConfig();
  }, []);

  // Sleek Reusable Section Header Component
  const SectionHeader = ({ title, actionText, onAction }) => (
    <View className="flex-row justify-between items-center mb-3 mt-4">
      <View className="flex-row items-center">
        <View className="w-1.5 h-4 rounded-full bg-blue-600 mr-2" />
        <ThemedText
          className={`text-lg font-bold tracking-tight ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {title}
        </ThemedText>
      </View>
      {actionText && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
          className={`flex-row items-center px-2.5 py-1 rounded-full ${
            isDarkMode ? "bg-gray-800" : "bg-blue-50"
          }`}
        >
          <ThemedText
            className={`text-xs font-semibold mr-1 ${
              isDarkMode ? "text-blue-400" : "text-blue-600"
            }`}
          >
            {actionText}
          </ThemedText>
          <Ionicons
            name="chevron-forward"
            size={12}
            color={isDarkMode ? "#60A5FA" : "#2563EB"}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <NavBar />

      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          className="px-4"
        >
          {/* Quick-Start Actions Row */}
          <View className="mt-3 mb-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
              contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
            >
              {/* Create Match Chip */}
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.CreateMatch)}
                activeOpacity={0.8}
                className="overflow-hidden rounded-xl"
              >
                <LinearGradient
                  colors={["#2563EB", "#1D4ED8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="flex-row items-center px-4 py-2.5"
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <ThemedText className="text-white text-xs font-bold ml-1.5">
                    Create Match
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>

              {/* Add Team Chip */}
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.CreateTeam)}
                activeOpacity={0.8}
                className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDarkMode ? 0.2 : 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={isDarkMode ? "#60A5FA" : "#2563EB"}
                />
                <ThemedText
                  className={`text-xs font-semibold ml-1.5 ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Add Team
                </ThemedText>
              </TouchableOpacity>

              {/* Add Tournament Chip */}
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.CreateTournament)}
                activeOpacity={0.8}
                className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDarkMode ? 0.2 : 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons
                  name="trophy-outline"
                  size={16}
                  color={isDarkMode ? "#FBBF24" : "#D97706"}
                />
                <ThemedText
                  className={`text-xs font-semibold ml-1.5 ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  Add Tournament
                </ThemedText>
              </TouchableOpacity>

              {/* My Matches Shortcut */}
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.MyCricket)}
                activeOpacity={0.8}
                className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDarkMode ? 0.2 : 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <MaterialCommunityIcons
                  name="cricket"
                  size={16}
                  color={isDarkMode ? "#34D399" : "#059669"}
                />
                <ThemedText
                  className={`text-xs font-semibold ml-1.5 ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  My Cricket
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Hero Highlights Carousel */}
          <View className="my-2">
            <Carousel
              loop
              width={width - 32}
              height={width * 0.48}
              autoPlay={true}
              autoPlayInterval={5000}
              data={[1, 2, 3]}
              scrollAnimationDuration={800}
              mode="parallax"
              parallaxScrollingScale={0.92}
              parallaxScrollingOffset={40}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  className="rounded-2xl overflow-hidden border border-slate-700/20"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <ImageBackground
                    source={require("../assets/stadium-background-image.jpg")}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  >
                    <LinearGradient
                      colors={[
                        "rgba(15,23,42,0.1)",
                        "rgba(15,23,42,0.6)",
                        "rgba(15,23,42,0.92)",
                      ]}
                      className="absolute inset-0 px-4 pb-4 justify-between"
                    >
                      {/* Top Pill */}
                      <View className="flex-row justify-between items-center pt-3">
                        <View className="px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/20">
                          <ThemedText className="text-[11px] font-bold text-white uppercase tracking-wider">
                            Match Highlights • #{index + 1}
                          </ThemedText>
                        </View>
                        <View className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md items-center justify-center">
                          <Ionicons name="play" size={16} color="#FFFFFF" />
                        </View>
                      </View>

                      {/* Bottom Info */}
                      <View>
                        <ThemedText className="text-white text-lg font-bold">
                          Grand Finale: Thunderbolts vs Knights
                        </ThemedText>
                        <ThemedText className="text-gray-300 text-xs mt-0.5">
                          Thrilling final over thriller • 14 runs needed off 6 balls
                        </ThemedText>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Recent Matches Section */}
          <SectionHeader
            title="Recent Matches"
            actionText="View All"
            onAction={() => navigation.navigate(SCREENS.MyCricket)}
          />

          {matchesIds && matchesIds.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={matchesIds}
              keyExtractor={(item, index) =>
                String(item?._id || item?.id || item || index)
              }
              renderItem={({ item, index }) => (
                <View
                  style={{
                    marginRight: index !== matchesIds.length - 1 ? 12 : 0,
                  }}
                >
                  <ScoreCard
                    matchId={item?._id || item?.id || item}
                    startDate={item?.startDate || item?.createdAt}
                  />
                </View>
              )}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={3}
              contentContainerStyle={{ paddingVertical: 4 }}
            />
          ) : (
            <View className="py-6 px-4 items-center justify-center">
              <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                No active matches found. Start a match to see live scores!
              </ThemedText>
            </View>
          )}

          {/* Live Streaming & Broadcast Banner */}
          <SectionHeader title="Live Cricket Arena" />
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate(SCREENS.MyCricket)}
            className="rounded-2xl overflow-hidden border border-slate-700/30 mb-5"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0.35 : 0.12,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <ImageBackground
              source={require("../assets/dark-background.png")}
              className="w-full justify-between p-5"
              style={{ minHeight: 140 }}
              resizeMode="cover"
            >
              <View className="flex-row justify-between items-center">
                <View className="bg-red-600/90 px-3 py-1 rounded-full flex-row items-center border border-red-400/40">
                  <View className="w-2 h-2 bg-white rounded-full mr-1.5" />
                  <ThemedText className="text-white text-xs font-extrabold uppercase tracking-wide">
                    Live Broadcast
                  </ThemedText>
                </View>
                <View className="bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
                  <ThemedText className="text-blue-300 text-xs font-semibold">
                    HD Commentary
                  </ThemedText>
                </View>
              </View>

              <View className="mt-3">
                <ThemedText className="text-white text-xl font-bold">
                  Ball-by-Ball Live Scoring
                </ThemedText>
                <ThemedText className="text-gray-300 text-xs mt-1">
                  Follow live match updates, run rates, commentary & player stats
                </ThemedText>
              </View>

              <View className="flex-row items-center mt-3 pt-2 border-t border-white/10">
                <ThemedText className="text-blue-400 text-xs font-bold mr-1">
                  Open Match Center
                </ThemedText>
                <Ionicons name="arrow-forward" size={14} color="#60A5FA" />
              </View>
            </ImageBackground>
          </TouchableOpacity>

          {/* Tournaments Section */}
          {tournaments?.map((tournament, index) => (
            <View key={`tournament_${index}`} className="mb-4">
              <SectionHeader
                title={tournament?.title || "Featured Tournament"}
                actionText="View Tournament"
                onAction={() =>
                  navigation.navigate(SCREENS.TournamentProfile, {
                    slug: tournament?.slug || tournament?._id,
                  })
                }
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                {tournament?.matches?.map((item, idx) => (
                  <View
                    key={`tournament_match_${idx}`}
                    style={{
                      marginRight:
                        idx !== tournament.matches.length - 1 ? 12 : 0,
                    }}
                  >
                    <ScoreCard
                      match={item}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        <AnimatedFooter />
      </View>
    </View>
  );
}
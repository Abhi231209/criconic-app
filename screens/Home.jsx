import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
  useColorScheme,
  RefreshControl,
  Linking,
  BackHandler,
  DeviceEventEmitter,
} from "react-native";
import useMatches from "../hooks/useMatches";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useAxiosGet } from "@/hooks/useApi";
import ScoreCard from "@/components/ui/ScoreCard";
import { matchesApi } from "@/utils/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import NavBar from "@/components/ui/NavBar";
import SCREENS from "@/screens";
import AnimatedFooter from "@/components/ui/AnimatedFooter";
import useRequireAuth from "@/hooks/useRequireAuth";
import GreetingHeader from "@/components/ui/home/GreetingHeader";
import HeroCarousel from "@/components/ui/home/HeroCarousel";
import CricketPulse from "@/components/ui/home/CricketPulse";
import FeatureHighlights from "@/components/ui/home/FeatureHighlights";
import TopPlayersSpotlight from "@/components/ui/home/TopPlayersSpotlight";
import CtaBanner from "@/components/ui/home/CtaBanner";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "@/contexts/SocketContext";
import { slimMatch } from "@/utils/savedLists";

const MATCHES_CONDITION = { items: 10 };

// The Recent Matches list as it was last loaded, kept on the phone so the
// section still shows matches without a connection.
const SAVED_MATCHES_KEY = "@criconic_home_matches";

export default function Home({}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { requireAuth } = useRequireAuth(navigation);

  const [homeConfig, setHomeConfig] = useState({});
  const [tournaments, setTournaments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [matchDetailsMap, setMatchDetailsMap] = useState({});
  const lastFocusFetch = React.useRef(Date.now());

  const {
    matchesIds,
    setMatchesIds,
    refresh: refreshMatches,
    loading: matchesLoading,
    error: matchesError,
    loadedAt: matchesLoadedAt,
  } = useMatches({
    initialCondition: MATCHES_CONDITION,
  });
  const { isConnected } = useSocket();
  const matchesLoadedRef = React.useRef(false);
  matchesLoadedRef.current = matchesLoadedAt > 0;

  // useMatches only returns bare ids ({_id, startDate, createdAt, address}) with
  // no teams/score, so ScoreCard would otherwise start empty and depend entirely
  // on the socket "score" round-trip to show anything. Fetch the full match list
  // (same call AllMatches makes) so cards render real data immediately and the
  // socket only has to layer live updates on top, not populate from scratch.
  const fetchMatchDetails = useCallback(async () => {
    try {
      const res = await matchesApi.getMatches(
        { limit: MATCHES_CONDITION.items },
        { errorAlert: false }
      );
      const list = res?.data?.matches || res?.data?.content;
      // No list in the answer means the request failed (request() doesn't
      // throw): keep the cards as they are.
      if (!Array.isArray(list)) return;
      const map = {};
      list.forEach((m) => {
        const id = String(m?._id || m?.id || m?.matchId || "");
        if (id) map[id] = m;
      });
      setMatchDetailsMap(map);
    } catch (err) {
      console.log("[Home] fetchMatchDetails error:", err);
    }
  }, []);

  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  // Start from the saved copy of the list, unless the server has already
  // answered by the time it is read.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SAVED_MATCHES_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : null;
        if (cancelled || !saved || matchesLoadedRef.current) return;
        if (Array.isArray(saved.ids)) {
          setMatchesIds((prev) => (prev.length ? prev : saved.ids));
        }
        if (saved.details && typeof saved.details === "object") {
          setMatchDetailsMap((prev) => (Object.keys(prev).length ? prev : saved.details));
        }
      })
      .catch((e) => console.warn("[Home] Failed to read saved matches:", e));
    return () => {
      cancelled = true;
    };
  }, [setMatchesIds]);

  // Keep the saved copy in step with what the server last returned.
  useEffect(() => {
    if (!matchesLoadedAt) return;
    const details = {};
    matchesIds.forEach((item) => {
      const id = String(item?._id || item?.id || item || "");
      if (matchDetailsMap[id]) details[id] = slimMatch(matchDetailsMap[id]);
    });
    AsyncStorage.setItem(
      SAVED_MATCHES_KEY,
      JSON.stringify({ ids: matchesIds, details })
    ).catch((e) => console.warn("[Home] Failed to save matches:", e));
  }, [matchesLoadedAt, matchesIds, matchDetailsMap]);

  // The connection is back after a load that didn't get through: load again.
  useEffect(() => {
    if (isConnected && matchesError) {
      lastFocusFetch.current = Date.now();
      refreshMatches?.();
      fetchMatchDetails();
    }
  }, [isConnected]);

  // Listen for match deletion globally to immediately prune it from home view
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "MATCH_DELETED",
      ({ matchId: delId }) => {
        if (!delId) return;
        const strDelId = String(delId);
        lastFocusFetch.current = 0;
        setMatchesIds((prev) =>
          prev.filter((m) => {
            const id = String(m?._id || m?.id || m?.matchId || m);
            return id !== strDelId;
          })
        );
        setTournaments((prev) =>
          (prev || []).map((t) => ({
            ...t,
            matches: (t.matches || []).filter((m) => {
              const id = String(m?._id || m?.id || m?.matchId || m);
              return id !== strDelId;
            }),
          }))
        );
      }
    );
    return () => sub.remove();
  }, [setMatchesIds]);

  useFocusEffect(
    useCallback(() => {
      // 1. Sanitize navigation stack: ensure Home is the clean root and Scorer/setup screens cannot be returned to
      const state = navigation.getState?.();
      if (state?.routes && state.index > 0) {
        const preScoreScreenNames = [
          SCREENS.ScorerScreen,
          SCREENS.CreateMatch,
          SCREENS.SelectTeamScreen,
          SCREENS.SelectSquadScreen,
          SCREENS.MatchDetailsScreen,
          SCREENS.TossScreen,
          SCREENS.PlayerSelectionScreen,
        ];
        const hasScorerOrSetupInHistory = state.routes
          .slice(0, state.index)
          .some((r) => preScoreScreenNames.includes(r.name));
        if (hasScorerOrSetupInHistory && navigation.reset) {
          navigation.reset({
            index: 0,
            routes: [{ name: SCREENS.Home }],
          });
          return;
        }
      }

      // 2. Hardware back button handling while on Home screen
      const onHardwareBackPress = () => {
        return false;
      };
      const backSubscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onHardwareBackPress
      );

      // Throttle tab focus refreshes to avoid freezing UI or re-fetching every tab switch
      if (Date.now() - lastFocusFetch.current > 15000) {
        lastFocusFetch.current = Date.now();
        refreshMatches?.();
      }

      return () => {
        backSubscription.remove();
      };
    }, [navigation, refreshMatches])
  );

  const {
    get: getConfigDetails,
    isLoading,
    data,
    error,
  } = useAxiosGet("api/configs/public", {
    showAlert: true,
    useBaseURL: true,
  });

  const getConfig = async () => {
    const res = await getConfigDetails();
    if (res?.data?.content && res?.data?.success) {
      setHomeConfig(res.data.content.homePage);
      if (res.data.content?.tournaments?.length) {
        setTournaments(res.data.content.tournaments);
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    lastFocusFetch.current = Date.now();
    try {
      await Promise.all([
        refreshMatches ? Promise.resolve(refreshMatches()) : Promise.resolve(),
        fetchMatchDetails(),
        getConfig(),
      ]);
    } catch (err) {
      console.log("[Home] Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshMatches, fetchMatchDetails]);

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

  const handleBannerPress = useCallback(
    (item) => {
      if (!item?.callToAction) {
        if (item?.isMatch) navigation.navigate(SCREENS.AllMatches);
        return;
      }
      const target = item.callToAction.trim();
      if (target.startsWith("http://") || target.startsWith("https://")) {
        Linking.openURL(target).catch(() => {});
      } else if (SCREENS[target]) {
        if (
          target === SCREENS.CreateMatch ||
          target === SCREENS.CreateTournament ||
          target === SCREENS.CreateTeam
        ) {
          requireAuth(() => navigation.navigate(SCREENS[target]));
        } else {
          navigation.navigate(SCREENS[target]);
        }
      }
    },
    [navigation, requireAuth]
  );

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <NavBar />

      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
          className="px-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563EB"]}
              tintColor={isDarkMode ? "#60A5FA" : "#2563EB"}
            />
          }
        >
          {/* Personalized Greeting Header */}
          <GreetingHeader />

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
                onPress={() => requireAuth(() => navigation.navigate(SCREENS.CreateMatch))}
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
                onPress={() => requireAuth(() => navigation.navigate(SCREENS.CreateTeam))}
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
                onPress={() => requireAuth(() => navigation.navigate(SCREENS.CreateTournament))}
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
                onPress={() => requireAuth(() => navigation.navigate(SCREENS.MyCricket))}
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
          <HeroCarousel
            banners={homeConfig?.holding}
            onPress={handleBannerPress}
          />

          {/* Personalized "Your Cricket Pulse" */}
          <CricketPulse />

          {/* Recent Matches Section */}
          <SectionHeader
            title="Recent Matches"
            actionText="View All"
            onAction={() => navigation.navigate(SCREENS.AllMatches)}
          />

          {matchesIds && matchesIds.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={matchesIds}
              keyExtractor={(item, index) =>
                String(item?._id || item?.id || item || index)
              }
              renderItem={({ item, index }) => {
                const id = String(item?._id || item?.id || item || "");
                return (
                  <View
                    style={{
                      marginRight: index !== matchesIds.length - 1 ? 12 : 0,
                    }}
                  >
                    <ScoreCard
                      matchId={id}
                      match={matchDetailsMap[id]}
                      startDate={item?.startDate || item?.createdAt}
                    />
                  </View>
                );
              }}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={3}
              contentContainerStyle={{ paddingVertical: 4 }}
            />
          ) : matchesError ? (
            <View className="py-6 px-4 items-center justify-center">
              <Ionicons
                name="cloud-offline-outline"
                size={22}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <ThemedText className={`text-sm text-center mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Couldn't load matches. Check your internet connection.
              </ThemedText>
              <TouchableOpacity
                onPress={onRefresh}
                activeOpacity={0.8}
                className="mt-3 px-4 py-1.5 rounded-full bg-blue-600"
              >
                <ThemedText className="text-white text-xs font-bold">Retry</ThemedText>
              </TouchableOpacity>
            </View>
          ) : matchesLoading || !matchesLoadedAt ? (
            <View className="py-6 px-4 items-center justify-center">
              <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Loading matches…
              </ThemedText>
            </View>
          ) : (
            <View className="py-6 px-4 items-center justify-center">
              <ThemedText className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                No active matches found. Start a match to see live scores!
              </ThemedText>
            </View>
          )}

          {matchesError && matchesIds?.length > 0 ? (
            <ThemedText className={`text-xs mt-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              Couldn't load the latest — showing matches saved on this phone.
            </ThemedText>
          ) : null}

          {/* Why Criconic — Feature Highlights */}
          <FeatureHighlights />

          {/* Live Streaming & Broadcast Banner */}
          <SectionHeader title="Live Cricket Arena" />
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate(SCREENS.AllMatches)}
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

          {/* Top Players Spotlight */}
          <TopPlayersSpotlight />

          {/* High-Impact Call-To-Action */}
          <CtaBanner />

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

        <AnimatedFooter currentTab="Home" />
      </View>
    </View>
  );
}
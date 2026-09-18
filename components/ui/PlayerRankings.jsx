import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import SCREENS from "@/screens";
import { rankingsApi } from "@/utils/api";

const { width } = Dimensions.get("window");

export default function PlayerRankings() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(route.params?.initialRegion || null);

  const [activeTab, setActiveTab] = useState("overall");
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRegions = useCallback(async () => {
    setLoadingRegions(true);
    try {
      const res = await rankingsApi.getRegions();
      const list = res?.data?.regions || [];
      setRegions(list);
      if (!selectedRegion && list.length > 0) {
        setSelectedRegion(list[0]);
      }
    } catch (err) {
      console.warn("[PlayerRankings] Failed to load regions:", err);
    } finally {
      setLoadingRegions(false);
    }
  }, [selectedRegion]);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const loadRankings = useCallback(async () => {
    if (!selectedRegion) return;
    setLoadingPlayers(true);
    try {
      const res = await rankingsApi.getRankings(selectedRegion, activeTab, { limit: 30 });
      setPlayers(res?.data?.players || []);
      setTotal(res?.data?.total || 0);
    } catch (err) {
      console.warn("[PlayerRankings] Failed to load rankings:", err);
      setPlayers([]);
      setTotal(0);
    } finally {
      setLoadingPlayers(false);
      setRefreshing(false);
    }
  }, [selectedRegion, activeTab]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRankings();
  };

  const tabs = [
    { value: "overall", label: "Overall" },
    { value: "batting", label: "Batting" },
    { value: "bowling", label: "Bowling" },
  ];

  const renderKeyStat = (player) => {
    if (activeTab === "bowling") {
      return `${player.stats?.wickets ?? 0} wkts • Eco ${player.stats?.eco ?? "0.00"}`;
    }
    return `${player.stats?.runs ?? 0} runs • Avg ${player.stats?.avg ?? 0}`;
  };

  const navigateToProfile = (playerId) => {
    if (!playerId) return;
    navigation.navigate(SCREENS.PlayerProfile, { playerId });
  };

  // Split into Top 3 for Podium and Remaining for List
  const top1 = players.length > 0 ? players[0] : null;
  const top2 = players.length > 1 ? players[1] : null;
  const top3 = players.length > 2 ? players[2] : null;
  const remainingPlayers = players.slice(3);

  // Render Podium Column
  const renderPodiumPillar = (player, place) => {
    if (!player) return <View style={{ width: (width - 56) / 3 }} />;

    const isFirst = place === 1;
    const isSecond = place === 2;
    const isThird = place === 3;

    const pillarHeight = isFirst ? 110 : isSecond ? 85 : 70;
    const avatarSize = isFirst ? 58 : 50;

    const medalColor = isFirst
      ? "#F59E0B"
      : isSecond
      ? "#94A3B8"
      : "#D97706";

    const gradientColors = isFirst
      ? isDarkMode
        ? ["#B45309", "#78350F"]
        : ["#FDE68A", "#F59E0B"]
      : isSecond
      ? isDarkMode
        ? ["#475569", "#334155"]
        : ["#E2E8F0", "#CBD5E1"]
      : isDarkMode
      ? ["#92400E", "#78350F"]
      : ["#FED7AA", "#FB923C"];

    const badgeLabel = isFirst ? "1st" : isSecond ? "2nd" : "3rd";

    return (
      <TouchableOpacity
        key={player.playerId || place}
        activeOpacity={0.85}
        onPress={() => navigateToProfile(player.playerId)}
        style={{
          width: (width - 56) / 3,
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        {/* Crown or Medal for 1st Place */}
        {isFirst && (
          <View style={{ marginBottom: -6, zIndex: 10 }}>
            <ThemedText style={{ fontSize: 24 }}>👑</ThemedText>
          </View>
        )}

        {/* Avatar with Metallic Border */}
        <View
          style={{
            padding: 3,
            borderRadius: 999,
            borderWidth: isFirst ? 3 : 2.5,
            borderColor: medalColor,
            backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
            shadowColor: medalColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isFirst ? 0.45 : 0.25,
            shadowRadius: 6,
            elevation: 5,
            marginBottom: 6,
          }}
        >
          <PlayerAvatar player={player} size={avatarSize} />
        </View>

        {/* Player Name */}
        <ThemedText
          numberOfLines={1}
          style={{
            fontSize: isFirst ? 13 : 12,
            fontWeight: "700",
            color: isDarkMode ? "#FFFFFF" : "#1E293B",
            textAlign: "center",
            maxWidth: "100%",
          }}
        >
          {player.name}
        </ThemedText>

        {/* Team Name */}
        <ThemedText
          numberOfLines={1}
          style={{
            fontSize: 10,
            fontWeight: "500",
            color: isDarkMode ? "#94A3B8" : "#64748B",
            textAlign: "center",
            maxWidth: "100%",
            marginBottom: 4,
          }}
        >
          {player.team || "Independent"}
        </ThemedText>

        {/* Score / Stats Badge */}
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: isDarkMode ? "rgba(30, 41, 59, 0.8)" : "rgba(241, 245, 249, 0.9)",
            borderWidth: 1,
            borderColor: isDarkMode ? "rgba(51, 65, 85, 0.6)" : "rgba(226, 232, 240, 0.8)",
            marginBottom: 8,
          }}
        >
          <ThemedText
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: medalColor,
            }}
          >
            {player.score} pts
          </ThemedText>
        </View>

        {/* Podium Block / Pillar */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: "100%",
            height: pillarHeight,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(0, 0, 0, 0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThemedText
              style={{
                fontSize: 16,
                fontWeight: "900",
                color: isDarkMode ? "#FFFFFF" : isFirst ? "#78350F" : "#1E293B",
              }}
            >
              {place}
            </ThemedText>
          </View>
          <ThemedText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: isDarkMode ? "rgba(255, 255, 255, 0.8)" : isFirst ? "#92400E" : "#475569",
              marginTop: 4,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {badgeLabel}
          </ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? "#0B0F19" : "#F8FAFC" }}>
      {/* Top Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? "rgba(31, 41, 55, 0.8)" : "rgba(229, 231, 235, 0.8)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: 12, padding: 4 }}
          >
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? "#F3F4F6" : "#111827"} />
          </TouchableOpacity>
          <ThemedText style={{ fontSize: 18, fontWeight: "800", color: isDarkMode ? "#FFFFFF" : "#111827" }}>
            Local Rankings
          </ThemedText>
        </View>

        {total > 0 && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: isDarkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)",
            }}
          >
            <ThemedText style={{ fontSize: 11, fontWeight: "700", color: "#3B82F6" }}>
              {total} Players
            </ThemedText>
          </View>
        )}
      </View>

      {/* Region Picker Chips */}
      {loadingRegions ? (
        <View style={{ paddingVertical: 12, alignItems: "center" }}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      ) : regions.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" }}>
          <Ionicons name="location-outline" size={32} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
          <ThemedText
            style={{
              fontSize: 13,
              textAlign: "center",
              marginTop: 8,
              color: isDarkMode ? "#9CA3AF" : "#64748B",
            }}
          >
            No regions available yet — teams need a location set before players can be ranked locally.
          </ThemedText>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? "rgba(31, 41, 55, 0.6)" : "rgba(229, 231, 235, 0.6)",
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
          >
            {regions.map((region) => {
              const isSelected = selectedRegion === region;
              return (
                <TouchableOpacity
                  key={region}
                  onPress={() => setSelectedRegion(region)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: isSelected
                      ? "#3B82F6"
                      : isDarkMode
                      ? "#1F2937"
                      : "#F1F5F9",
                    shadowColor: isSelected ? "#3B82F6" : "transparent",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.25 : 0,
                    shadowRadius: 4,
                    elevation: isSelected ? 2 : 0,
                  }}
                >
                  <Ionicons
                    name="location-sharp"
                    size={13}
                    color={isSelected ? "#FFFFFF" : isDarkMode ? "#9CA3AF" : "#64748B"}
                    style={{ marginRight: 5 }}
                  />
                  <ThemedText
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? "700" : "500",
                      color: isSelected ? "#FFFFFF" : isDarkMode ? "#D1D5DB" : "#334155",
                    }}
                  >
                    {region}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Category Tabs (Overall / Batting / Bowling) */}
      {selectedRegion && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            marginBottom: 8,
            padding: 4,
            borderRadius: 14,
            flexDirection: "row",
            backgroundColor: isDarkMode ? "#1F2937" : "#E2E8F0",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: isActive
                    ? isDarkMode
                      ? "#3B82F6"
                      : "#FFFFFF"
                    : "transparent",
                  shadowColor: isActive ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.15 : 0,
                  shadowRadius: 2,
                  elevation: isActive ? 1 : 0,
                }}
              >
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? "700" : "500",
                    color: isActive
                      ? isDarkMode
                        ? "#FFFFFF"
                        : "#1E293B"
                      : isDarkMode
                      ? "#9CA3AF"
                      : "#64748B",
                  }}
                >
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Main Content: Podium & Ranked List */}
      {selectedRegion && (
        <>
          {loadingPlayers ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <ThemedText
                style={{
                  fontSize: 13,
                  marginTop: 12,
                  color: isDarkMode ? "#9CA3AF" : "#64748B",
                }}
              >
                Loading rankings for {selectedRegion}...
              </ThemedText>
            </View>
          ) : players.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
              <Ionicons name="trophy-outline" size={48} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
              <ThemedText
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  textAlign: "center",
                  marginTop: 12,
                  color: isDarkMode ? "#E2E8F0" : "#334155",
                }}
              >
                No rankings recorded yet
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 4,
                  color: isDarkMode ? "#9CA3AF" : "#64748B",
                }}
              >
                Match stats for {selectedRegion} will appear here once matches are completed.
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={remainingPlayers}
              keyExtractor={(item) => String(item.playerId || item._id || item.id || item.rank)}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />}
              ListHeaderComponent={
                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 }}>
                  {/* ── Podium Section ── */}
                  <View
                    style={{
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingTop: 16,
                      backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: isDarkMode ? "rgba(31, 41, 55, 0.7)" : "rgba(229, 231, 235, 0.7)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDarkMode ? 0.3 : 0.06,
                      shadowRadius: 10,
                      elevation: 3,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "flex-end",
                      }}
                    >
                      {/* 2nd Place (Left) */}
                      {renderPodiumPillar(top2, 2)}

                      {/* 1st Place (Center - Elevated) */}
                      {renderPodiumPillar(top1, 1)}

                      {/* 3rd Place (Right) */}
                      {renderPodiumPillar(top3, 3)}
                    </View>
                  </View>

                  {/* Section Title for Rest of the List */}
                  {remainingPlayers.length > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8, paddingHorizontal: 4 }}>
                      <ThemedText style={{ fontSize: 14, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1E293B" }}>
                        All Contenders
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: isDarkMode ? "#64748B" : "#94A3B8" }}>
                        Ranks 4 – {players.length}
                      </ThemedText>
                    </View>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => navigateToProfile(item.playerId)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginHorizontal: 16,
                    marginBottom: 8,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: isDarkMode ? "rgba(31, 41, 55, 0.7)" : "rgba(229, 231, 235, 0.7)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDarkMode ? 0.2 : 0.03,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  {/* Rank Number Badge */}
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDarkMode ? "#1F2937" : "#F1F5F9",
                      marginRight: 12,
                    }}
                  >
                    <ThemedText
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: isDarkMode ? "#9CA3AF" : "#64748B",
                      }}
                    >
                      {item.rank}
                    </ThemedText>
                  </View>

                  {/* Player Avatar */}
                  <PlayerAvatar player={item} size={40} />

                  {/* Info */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText
                      numberOfLines={1}
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: isDarkMode ? "#FFFFFF" : "#1E293B",
                      }}
                    >
                      {item.name}
                    </ThemedText>
                    <ThemedText
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        color: isDarkMode ? "#94A3B8" : "#64748B",
                        marginTop: 2,
                      }}
                    >
                      {item.team ? `${item.team} • ` : ""}
                      {renderKeyStat(item)}
                    </ThemedText>
                  </View>

                  {/* Points Pill */}
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: isDarkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)",
                    }}
                  >
                    <ThemedText
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: "#3B82F6",
                      }}
                    >
                      {item.score}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

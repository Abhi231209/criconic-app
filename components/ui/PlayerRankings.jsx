import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import SCREENS from "@/screens";
import { rankingsApi } from "@/utils/api";
import useAppTheme from "@/hooks/useAppTheme";
import {
  getCountries,
  getStatesForCountry,
  getDistrictsForState,
  DISTRICTS_BY_STATE,
  STATES_BY_COUNTRY,
  COUNTRIES,
} from "@/utils/locationsData";

const { width, height } = Dimensions.get("window");

function parseLocationParam(locParam) {
  if (!locParam || typeof locParam !== "string") return null;
  const parts = locParam.split(",").map((s) => s.trim()).filter(Boolean);
  let detectedCountry = "India";
  let detectedState = null;
  let detectedDistrict = null;

  for (const part of parts) {
    const partLower = part.toLowerCase();
    if (COUNTRIES.some((c) => c.name.toLowerCase() === partLower)) {
      detectedCountry = part;
    }
    const stateMatch = STATES_BY_COUNTRY.India?.find(
      (s) => s.toLowerCase() === partLower
    );
    if (stateMatch) {
      detectedState = stateMatch;
    }
  }

  for (const part of parts) {
    const partLower = part.toLowerCase();
    if (detectedState) {
      const dists = DISTRICTS_BY_STATE[detectedState] || [];
      const dMatch = dists.find((d) => d.toLowerCase() === partLower);
      if (dMatch) detectedDistrict = dMatch;
    } else {
      for (const [st, dists] of Object.entries(DISTRICTS_BY_STATE)) {
        const dMatch = dists.find((d) => d.toLowerCase() === partLower);
        if (dMatch) {
          detectedState = st;
          detectedDistrict = dMatch;
          break;
        }
      }
    }
  }

  return {
    country: detectedCountry || "India",
    state: detectedState || "Haryana",
    district: detectedDistrict || "Hisar",
  };
}

export default function PlayerRankings() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDark } = useAppTheme();
  const isDarkMode = isDark;

  // Hierarchical Location State
  const initialParsed = useMemo(() => {
    return (
      parseLocationParam(route.params?.initialRegion) || {
        country: "India",
        state: "Haryana",
        district: "Hisar",
      }
    );
  }, [route.params?.initialRegion]);

  const [selectedCountry, setSelectedCountry] = useState(initialParsed.country);
  const [selectedState, setSelectedState] = useState(initialParsed.state);
  const [selectedDistrict, setSelectedDistrict] = useState(initialParsed.district);

  // Modal Picker State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerType, setPickerType] = useState("district"); // "country" | "state" | "district"
  const [searchQuery, setSearchQuery] = useState("");

  // Backend discovered location metadata
  const [backendStates, setBackendStates] = useState([]);
  const [backendDistricts, setBackendDistricts] = useState([]);

  // Category & Players State
  const [activeTab, setActiveTab] = useState("overall");
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch backend available regions to enrich the pickers
  useEffect(() => {
    rankingsApi
      .getRegions()
      .then((res) => {
        if (res?.data?.states?.length) {
          setBackendStates(res.data.states);
        }
        if (res?.data?.districts?.length) {
          setBackendDistricts(res.data.districts);
        }
      })
      .catch((err) => console.warn("[PlayerRankings] Failed to load regions:", err));
  }, []);

  // Compute available states and districts dynamically
  const availableStates = useMemo(() => {
    const staticStates = getStatesForCountry(selectedCountry);
    const set = new Set([...staticStates, ...backendStates]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [selectedCountry, backendStates]);

  const availableDistricts = useMemo(() => {
    const staticDistricts = getDistrictsForState(selectedState);
    const set = new Set([...staticDistricts, ...backendDistricts]);
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["All Districts", ...sorted];
  }, [selectedState, backendDistricts]);

  // Load rankings based on hierarchical filters
  const loadRankings = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      const districtParam =
        selectedDistrict && selectedDistrict !== "All Districts"
          ? selectedDistrict
          : "";

      const res = await rankingsApi.getRankings(
        {
          country: selectedCountry,
          state: selectedState,
          district: districtParam,
          type: activeTab,
          limit: 30,
        },
        activeTab,
        { limit: 30 }
      );
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
  }, [selectedCountry, selectedState, selectedDistrict, activeTab]);

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

  // Open modal picker
  const openPicker = (type) => {
    setPickerType(type);
    setSearchQuery("");
    setPickerModalVisible(true);
  };

  // Handle selection from picker
  const handleSelectItem = (item) => {
    if (pickerType === "country") {
      const countryName = typeof item === "string" ? item : item.name;
      setSelectedCountry(countryName);
      setSelectedState("Haryana");
      setSelectedDistrict("All Districts");
    } else if (pickerType === "state") {
      setSelectedState(item);
      setSelectedDistrict("All Districts");
    } else if (pickerType === "district") {
      setSelectedDistrict(item);
    }
    setPickerModalVisible(false);
  };

  // Filter picker items based on search
  const pickerItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (pickerType === "country") {
      const countries = getCountries();
      if (!q) return countries;
      return countries.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (pickerType === "state") {
      if (!q) return availableStates;
      return availableStates.filter((s) => s.toLowerCase().includes(q));
    }
    if (pickerType === "district") {
      if (!q) return availableDistricts;
      return availableDistricts.filter((d) => d.toLowerCase().includes(q));
    }
    return [];
  }, [pickerType, searchQuery, availableStates, availableDistricts]);

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
        {/* Crown for 1st Place */}
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
            backgroundColor: isDarkMode
              ? "rgba(30, 41, 59, 0.8)"
              : "rgba(241, 245, 249, 0.9)",
            borderWidth: 1,
            borderColor: isDarkMode
              ? "rgba(51, 65, 85, 0.6)"
              : "rgba(226, 232, 240, 0.8)",
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
              color: isDarkMode
                ? "rgba(255, 255, 255, 0.8)"
                : isFirst
                ? "#92400E"
                : "#475569",
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

  const getPickerModalTitle = () => {
    switch (pickerType) {
      case "country":
        return "Select Country";
      case "state":
        return "Select State";
      case "district":
        return `Select District (${selectedState})`;
      default:
        return "Select Location";
    }
  };

  const isSelectedPickerItem = (item) => {
    if (pickerType === "country") {
      const name = typeof item === "string" ? item : item.name;
      return selectedCountry === name;
    }
    if (pickerType === "state") {
      return selectedState === item;
    }
    if (pickerType === "district") {
      return selectedDistrict === item;
    }
    return false;
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDarkMode ? "#0B0F19" : "#F8FAFC" }}
    >
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
          borderBottomColor: isDarkMode
            ? "rgba(31, 41, 55, 0.8)"
            : "rgba(229, 231, 235, 0.8)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: 12, padding: 4 }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={isDarkMode ? "#F3F4F6" : "#111827"}
            />
          </TouchableOpacity>
          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: isDarkMode ? "#FFFFFF" : "#111827",
            }}
          >
            Local Rankings
          </ThemedText>
        </View>

        {total > 0 && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: isDarkMode
                ? "rgba(59, 130, 246, 0.15)"
                : "rgba(59, 130, 246, 0.1)",
            }}
          >
            <ThemedText
              style={{ fontSize: 11, fontWeight: "700", color: "#3B82F6" }}
            >
              {total} Players
            </ThemedText>
          </View>
        )}
      </View>

      {/* ── Hierarchical Location Selector Bar ── */}
      <View
        style={{
          backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode
            ? "rgba(31, 41, 55, 0.6)"
            : "rgba(229, 231, 235, 0.6)",
        }}
      >
        {/* Selector Pills Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Country Pill */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => openPicker("country")}
            style={[
              styles.locationPill,
              {
                backgroundColor: isDarkMode ? "#1F2937" : "#F1F5F9",
                borderColor: isDarkMode
                  ? "rgba(55, 65, 81, 0.8)"
                  : "rgba(203, 213, 225, 0.8)",
              },
            ]}
          >
            <ThemedText style={{ fontSize: 13, marginRight: 4 }}>🇮🇳</ThemedText>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.locationPillText,
                { color: isDarkMode ? "#E2E8F0" : "#1E293B" },
              ]}
            >
              {selectedCountry}
            </ThemedText>
            <Ionicons
              name="chevron-down"
              size={12}
              color={isDarkMode ? "#9CA3AF" : "#64748B"}
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>

          {/* State Pill */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => openPicker("state")}
            style={[
              styles.locationPill,
              {
                flex: 1.1,
                backgroundColor: isDarkMode ? "#1F2937" : "#F1F5F9",
                borderColor: isDarkMode
                  ? "rgba(55, 65, 81, 0.8)"
                  : "rgba(203, 213, 225, 0.8)",
              },
            ]}
          >
            <Ionicons
              name="map"
              size={12}
              color="#3B82F6"
              style={{ marginRight: 4 }}
            />
            <ThemedText
              numberOfLines={1}
              style={[
                styles.locationPillText,
                { color: isDarkMode ? "#E2E8F0" : "#1E293B" },
              ]}
            >
              {selectedState}
            </ThemedText>
            <Ionicons
              name="chevron-down"
              size={12}
              color={isDarkMode ? "#9CA3AF" : "#64748B"}
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>

          {/* District Pill */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => openPicker("district")}
            style={[
              styles.locationPill,
              {
                flex: 1.2,
                backgroundColor:
                  selectedDistrict && selectedDistrict !== "All Districts"
                    ? isDarkMode
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(16, 185, 129, 0.1)"
                    : isDarkMode
                    ? "#1F2937"
                    : "#F1F5F9",
                borderColor:
                  selectedDistrict && selectedDistrict !== "All Districts"
                    ? "#10B981"
                    : isDarkMode
                    ? "rgba(55, 65, 81, 0.8)"
                    : "rgba(203, 213, 225, 0.8)",
              },
            ]}
          >
            <Ionicons
              name="location-sharp"
              size={12}
              color={
                selectedDistrict && selectedDistrict !== "All Districts"
                  ? "#10B981"
                  : "#3B82F6"
              }
              style={{ marginRight: 4 }}
            />
            <ThemedText
              numberOfLines={1}
              style={[
                styles.locationPillText,
                {
                  fontWeight: "700",
                  color:
                    selectedDistrict && selectedDistrict !== "All Districts"
                      ? "#10B981"
                      : isDarkMode
                      ? "#E2E8F0"
                      : "#1E293B",
                },
              ]}
            >
              {selectedDistrict}
            </ThemedText>
            <Ionicons
              name="chevron-down"
              size={12}
              color={
                selectedDistrict && selectedDistrict !== "All Districts"
                  ? "#10B981"
                  : isDarkMode
                  ? "#9CA3AF"
                  : "#64748B"
              }
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>
        </View>

        {/* Location Breadcrumb & Scope Badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: isDarkMode
              ? "rgba(31, 41, 55, 0.5)"
              : "rgba(241, 245, 249, 0.8)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <Ionicons
              name="navigate-circle"
              size={14}
              color="#3B82F6"
              style={{ marginRight: 5 }}
            />
            <ThemedText
              numberOfLines={1}
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: isDarkMode ? "#9CA3AF" : "#64748B",
              }}
            >
              {selectedDistrict && selectedDistrict !== "All Districts"
                ? `${selectedDistrict}, ${selectedState}`
                : `${selectedState} (All Districts)`}
            </ThemedText>
          </View>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor:
                selectedDistrict && selectedDistrict !== "All Districts"
                  ? isDarkMode
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(16, 185, 129, 0.1)"
                  : isDarkMode
                  ? "rgba(59, 130, 246, 0.15)"
                  : "rgba(59, 130, 246, 0.1)",
            }}
          >
            <ThemedText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color:
                  selectedDistrict && selectedDistrict !== "All Districts"
                    ? "#10B981"
                    : "#3B82F6",
              }}
            >
              {selectedDistrict && selectedDistrict !== "All Districts"
                ? "District Level"
                : "State Level"}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Category Tabs (Overall / Batting / Bowling) */}
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

      {/* Main Content: Podium & Ranked List */}
      {loadingPlayers ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
          <ThemedText
            style={{
              fontSize: 13,
              marginTop: 12,
              color: isDarkMode ? "#9CA3AF" : "#64748B",
            }}
          >
            Loading rankings for{" "}
            {selectedDistrict && selectedDistrict !== "All Districts"
              ? `${selectedDistrict}, ${selectedState}`
              : selectedState}
            ...
          </ThemedText>
        </View>
      ) : players.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Ionicons
            name="trophy-outline"
            size={48}
            color={isDarkMode ? "#4B5563" : "#9CA3AF"}
          />
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
              lineHeight: 18,
              color: isDarkMode ? "#9CA3AF" : "#64748B",
            }}
          >
            Match stats for{" "}
            {selectedDistrict && selectedDistrict !== "All Districts"
              ? `${selectedDistrict}, ${selectedState}`
              : selectedState}{" "}
            will appear here once local matches are completed.
          </ThemedText>

          {/* Quick toggle to All Districts if currently filtering by a single district */}
          {selectedDistrict && selectedDistrict !== "All Districts" && (
            <TouchableOpacity
              onPress={() => setSelectedDistrict("All Districts")}
              activeOpacity={0.8}
              style={{
                marginTop: 16,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isDarkMode
                  ? "rgba(59, 130, 246, 0.2)"
                  : "rgba(59, 130, 246, 0.1)",
                borderWidth: 1,
                borderColor: "#3B82F6",
              }}
            >
              <Ionicons
                name="sparkles-outline"
                size={14}
                color="#3B82F6"
                style={{ marginRight: 6 }}
              />
              <ThemedText
                style={{ fontSize: 13, fontWeight: "700", color: "#3B82F6" }}
              >
                View All Districts in {selectedState}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={remainingPlayers}
          keyExtractor={(item) =>
            String(item.playerId || item._id || item.id || item.rank)
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3B82F6"]}
            />
          }
          ListHeaderComponent={
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 16,
              }}
            >
              {/* ── Podium Section ── */}
              <View
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingTop: 16,
                  backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isDarkMode
                    ? "rgba(31, 41, 55, 0.7)"
                    : "rgba(229, 231, 235, 0.7)",
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
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 20,
                    marginBottom: 8,
                    paddingHorizontal: 4,
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: isDarkMode ? "#E2E8F0" : "#1E293B",
                    }}
                  >
                    All Contenders
                  </ThemedText>
                  <ThemedText
                    style={{
                      fontSize: 12,
                      color: isDarkMode ? "#64748B" : "#94A3B8",
                    }}
                  >
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
                borderColor: isDarkMode
                  ? "rgba(31, 41, 55, 0.7)"
                  : "rgba(229, 231, 235, 0.7)",
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
                  backgroundColor: isDarkMode
                    ? "rgba(59, 130, 246, 0.15)"
                    : "rgba(59, 130, 246, 0.1)",
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

      {/* ── Selection Modal (Country / State / District) ── */}
      <Modal
        visible={pickerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPickerModalVisible(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              justifyContent: "flex-end",
            }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View
                style={{
                  backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingTop: 16,
                  paddingHorizontal: 16,
                  paddingBottom: Platform.OS === "ios" ? 34 : 20,
                  maxHeight: height * 0.78,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                {/* Modal Handlebar */}
                <View
                  style={{
                    width: 38,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDarkMode ? "#374151" : "#D1D5DB",
                    alignSelf: "center",
                    marginBottom: 12,
                  }}
                />

                {/* Modal Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 17,
                      fontWeight: "800",
                      color: isDarkMode ? "#FFFFFF" : "#111827",
                    }}
                  >
                    {getPickerModalTitle()}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => setPickerModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      padding: 4,
                      borderRadius: 14,
                      backgroundColor: isDarkMode ? "#1F2937" : "#F3F4F6",
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={isDarkMode ? "#9CA3AF" : "#64748B"}
                    />
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: Platform.OS === "ios" ? 10 : 6,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? "#1F2937" : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: isDarkMode
                      ? "rgba(55, 65, 81, 0.8)"
                      : "rgba(226, 232, 240, 0.8)",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons
                    name="search"
                    size={16}
                    color={isDarkMode ? "#9CA3AF" : "#64748B"}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={`Search ${pickerType}...`}
                    placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: isDarkMode ? "#FFFFFF" : "#111827",
                    }}
                    autoCorrect={false}
                    autoCapitalize="words"
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && Platform.OS !== "ios" && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={isDarkMode ? "#9CA3AF" : "#64748B"}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Items List */}
                <FlatList
                  data={pickerItems}
                  keyExtractor={(item, index) =>
                    typeof item === "string" ? item : item.name || String(index)
                  }
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={
                    <View style={{ paddingVertical: 24, alignItems: "center" }}>
                      <Ionicons
                        name="search-outline"
                        size={32}
                        color={isDarkMode ? "#4B5563" : "#9CA3AF"}
                      />
                      <ThemedText
                        style={{
                          fontSize: 14,
                          color: isDarkMode ? "#9CA3AF" : "#64748B",
                          marginTop: 8,
                        }}
                      >
                        No {pickerType}s found matching "{searchQuery}"
                      </ThemedText>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const itemName = typeof item === "string" ? item : item.name;
                    const isSelected = isSelectedPickerItem(item);
                    const isAll = itemName === "All Districts";

                    return (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleSelectItem(item)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          marginBottom: 4,
                          backgroundColor: isSelected
                            ? isDarkMode
                              ? "rgba(59, 130, 246, 0.2)"
                              : "rgba(59, 130, 246, 0.1)"
                            : "transparent",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          {pickerType === "country" && (
                            <ThemedText style={{ fontSize: 16, marginRight: 10 }}>
                              {item.flag || "🇮🇳"}
                            </ThemedText>
                          )}
                          {pickerType === "state" && (
                            <Ionicons
                              name="map-outline"
                              size={15}
                              color={isSelected ? "#3B82F6" : isDarkMode ? "#9CA3AF" : "#64748B"}
                              style={{ marginRight: 10 }}
                            />
                          )}
                          {pickerType === "district" && (
                            <Ionicons
                              name={isAll ? "sparkles" : "location-outline"}
                              size={15}
                              color={
                                isSelected
                                  ? "#3B82F6"
                                  : isAll
                                  ? "#F59E0B"
                                  : isDarkMode
                                  ? "#9CA3AF"
                                  : "#64748B"
                              }
                              style={{ marginRight: 10 }}
                            />
                          )}
                          <ThemedText
                            style={{
                              fontSize: 14,
                              fontWeight: isSelected || isAll ? "700" : "500",
                              color: isSelected
                                ? "#3B82F6"
                                : isAll
                                ? isDarkMode
                                  ? "#FBBF24"
                                  : "#D97706"
                                : isDarkMode
                                ? "#FFFFFF"
                                : "#1E293B",
                            }}
                          >
                            {isAll ? `All Districts in ${selectedState}` : itemName}
                          </ThemedText>
                        </View>

                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#3B82F6"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  locationPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 90,
  },
});

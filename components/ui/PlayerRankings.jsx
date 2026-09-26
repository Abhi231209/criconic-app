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

  const knownHisarAreas = ["barwala", "hansi", "uklana", "narnaud", "adampur"];
  for (const part of parts) {
    const partLower = part.toLowerCase();
    if (knownHisarAreas.includes(partLower) && !detectedDistrict) {
      detectedDistrict = "Hisar";
      detectedState = detectedState || "Haryana";
    }
  }

  return {
    country: detectedCountry || "India",
    state: detectedState || "Haryana",
    district: detectedDistrict || (parts.length === 1 && !detectedState ? parts[0] : "Hisar"),
  };
}

export default function PlayerRankings() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDark } = useAppTheme();
  const isDarkMode = isDark;

  // Hierarchical Location Defaults
  const initialParsed = useMemo(() => {
    return (
      parseLocationParam(route.params?.initialRegion) || {
        country: "India",
        state: "Haryana",
        district: "Hisar",
      }
    );
  }, [route.params?.initialRegion]);

  // Scope selection: "country" (National) | "state" (State) | "district" (District)
  const initialScope = useMemo(() => {
    if (route.params?.scope && ["country", "state", "district"].includes(route.params.scope)) {
      return route.params.scope;
    }
    if (route.params?.initialRegion) {
      const region = String(route.params.initialRegion).toLowerCase();
      if (DISTRICTS_BY_STATE.Haryana?.some((d) => d.toLowerCase() === region)) {
        return "district";
      }
      if (STATES_BY_COUNTRY.India?.some((s) => s.toLowerCase() === region)) {
        return "state";
      }
      if (COUNTRIES.some((c) => c.name.toLowerCase() === region)) {
        return "country";
      }
    }
    return "district";
  }, [route.params?.scope, route.params?.initialRegion]);

  const [selectedScope, setSelectedScope] = useState(initialScope);
  const [selectedCountry, setSelectedCountry] = useState(initialParsed.country);
  const [selectedState, setSelectedState] = useState(initialParsed.state);
  const [selectedDistrict, setSelectedDistrict] = useState(initialParsed.district);

  // Discipline selection: "batting" 🏏 | "bowling" ⚾ | "allRounder" ⚡
  const initialDiscipline = useMemo(() => {
    const d = route.params?.discipline;
    if (["batting", "bowling", "allRounder"].includes(d)) return d;
    return "batting";
  }, [route.params?.discipline]);

  const [activeTab, setActiveTab] = useState(initialDiscipline);

  // Ball Type toggle: "all" | "tennis" | "leather"
  const [selectedBallType, setSelectedBallType] = useState("all");

  // Period Filter: "ALL_TIME" | "SEASON" | "CALENDAR_YEAR"
  const [selectedPeriod, setSelectedPeriod] = useState("ALL_TIME");
  const [periodModalVisible, setPeriodModalVisible] = useState(false);

  // Modal Picker State for changing locations
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerType, setPickerType] = useState("district"); // "country" | "state" | "district"
  const [searchQuery, setSearchQuery] = useState("");

  // Backend discovered metadata from api/rankings/scopes
  const [backendCountries, setBackendCountries] = useState([]);
  const [backendStates, setBackendStates] = useState([]);
  const [backendDistricts, setBackendDistricts] = useState([]);

  // Category & Players State
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch backend available scopes to enrich pickers
  useEffect(() => {
    rankingsApi
      .getScopes()
      .then((res) => {
        if (res?.data?.countries?.length) setBackendCountries(res.data.countries);
        if (res?.data?.states?.length) setBackendStates(res.data.states);
        if (res?.data?.districts?.length) setBackendDistricts(res.data.districts);
      })
      .catch((err) => console.warn("[PlayerRankings] Failed to load scopes:", err));
  }, []);

  // Compute available lists dynamically
  const availableCountries = useMemo(() => {
    const staticCountries = getCountries();
    const set = new Set([...staticCountries.map((c) => c.name), ...backendCountries]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [backendCountries]);

  const availableStates = useMemo(() => {
    const staticStates = getStatesForCountry(selectedCountry);
    const set = new Set([...staticStates, ...backendStates]);
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["All States", ...sorted];
  }, [selectedCountry, backendStates]);

  const availableDistricts = useMemo(() => {
    const staticDistricts = getDistrictsForState(selectedState);
    const set = new Set([...staticDistricts, ...backendDistricts]);
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["All Districts", ...sorted];
  }, [selectedState, backendDistricts]);

  // Load rankings based on full multi-filter parameters
  const loadRankings = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      let loc = "";
      let actualScope = selectedScope;
      if (selectedScope === "country") {
        loc = selectedCountry;
      } else if (selectedScope === "state") {
        if (selectedState === "All States") {
          actualScope = "country";
          loc = selectedCountry;
        } else {
          loc = selectedState;
        }
      } else if (selectedScope === "district") {
        loc = selectedDistrict === "All Districts" ? "" : selectedDistrict;
      }

      const periodId = selectedPeriod === "ALL_TIME" ? "ALL" : "2026";

      const res = await rankingsApi.getRankings({
        type: activeTab,
        scope: actualScope,
        location: loc,
        period: selectedPeriod,
        periodId,
        ballType: selectedBallType,
        page: 1,
        limit: 50,
      });

      setPlayers(res?.data?.players || []);
      setTotal(
        res?.data?.meta?.total ?? res?.data?.total ?? (res?.data?.players?.length || 0)
      );
    } catch (err) {
      console.warn("[PlayerRankings] Failed to load rankings:", err);
      setPlayers([]);
      setTotal(0);
    } finally {
      setLoadingPlayers(false);
      setRefreshing(false);
    }
  }, [
    selectedScope,
    selectedCountry,
    selectedState,
    selectedDistrict,
    activeTab,
    selectedBallType,
    selectedPeriod,
  ]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRankings();
  };

  const tabs = [
    { value: "batting", label: "Batting 🏏" },
    { value: "bowling", label: "Bowling ⚾" },
    { value: "allRounder", label: "All-Rounder ⚡" },
  ];

  const ballTypeOptions = [
    { value: "all", label: "All" },
    { value: "tennis", label: "Tennis Ball 🎾" },
    { value: "leather", label: "Leather Ball 🏏" },
  ];

  const periodOptions = [
    {
      value: "ALL_TIME",
      label: "All-Time",
      periodId: "ALL",
      desc: "Lifetime career totals",
    },
    {
      value: "SEASON",
      label: "2026 Season",
      periodId: "2026",
      desc: "Ongoing 2026 season",
    },
    {
      value: "CALENDAR_YEAR",
      label: "Year 2026",
      periodId: "2026",
      desc: "Jan 1 – Dec 31, 2026",
    },
  ];

  const scopeChips = [
    { type: "country", label: "National", emoji: "🇮🇳", value: selectedCountry },
    { type: "state", label: "State", emoji: "🗺️", value: selectedState },
    { type: "district", label: "District", emoji: "🏙️", value: selectedDistrict },
  ];

  const getRankBadgeStyle = (rank) => {
    if (rank === 1) {
      return {
        bg: isDarkMode ? "#78350F" : "#FEF3C7",
        text: isDarkMode ? "#FDE68A" : "#B45309",
        border: "#F59E0B",
      };
    }
    if (rank === 2) {
      return {
        bg: isDarkMode ? "#334155" : "#F1F5F9",
        text: isDarkMode ? "#CBD5E1" : "#475569",
        border: "#94A3B8",
      };
    }
    if (rank === 3) {
      return {
        bg: isDarkMode ? "#7C2D12" : "#FFEDD5",
        text: isDarkMode ? "#FED7AA" : "#C2410C",
        border: "#FB923C",
      };
    }
    return {
      bg: isDarkMode ? "#1F2937" : "#F1F5F9",
      text: isDarkMode ? "#9CA3AF" : "#64748B",
      border: "transparent",
    };
  };

  const renderRankShift = (rankDelta) => {
    if (rankDelta > 0) {
      return (
        <ThemedText style={{ fontSize: 10, fontWeight: "800", color: "#10B981" }}>
          ▲ {rankDelta}
        </ThemedText>
      );
    }
    if (rankDelta < 0) {
      return (
        <ThemedText style={{ fontSize: 10, fontWeight: "800", color: "#EF4444" }}>
          ▼ {Math.abs(rankDelta)}
        </ThemedText>
      );
    }
    return (
      <ThemedText style={{ fontSize: 10, fontWeight: "700", color: "#9CA3AF" }}>
        –
      </ThemedText>
    );
  };

  const renderDisciplineStats = (player, disc) => {
    const stats = player.stats || {};
    if (disc === "batting") {
      const bat = stats.batting || stats;
      const runs = bat.runs ?? 0;
      const avg = bat.avg !== undefined ? bat.avg : 0;
      const sr = bat.strikeRate !== undefined ? bat.strikeRate : 0;
      const fours = bat.fours ?? 0;
      const sixes = bat.sixes ?? 0;
      return `${runs} Runs • Avg ${avg} • SR ${sr} • 4s/6s: ${fours}/${sixes}`;
    }
    if (disc === "bowling") {
      const bowl = stats.bowling || stats;
      const wkts = bowl.wickets ?? 0;
      const overs = bowl.overs !== undefined ? bowl.overs : 0;
      const eco = bowl.economy !== undefined ? bowl.economy : (bowl.eco ?? "0.00");
      const bbi = bowl.bestBowling || "-";
      return `${wkts} Wkts • ${overs} Ov • Eco ${eco} • Best ${bbi}`;
    }
    // allRounder
    const bat = stats.batting || stats;
    const bowl = stats.bowling || stats;
    const field = stats.fielding || stats;
    const runs = bat.runs ?? 0;
    const wkts = bowl.wickets ?? 0;
    const catches = field.catches ?? 0;
    return `${runs} Runs • ${wkts} Wkts • ${catches} Catches`;
  };

  const renderKeyStat = (player) => {
    const stats = player.stats || {};
    if (activeTab === "batting") {
      const bat = stats.batting || stats;
      return `${bat.runs ?? 0} runs • Avg ${bat.avg ?? 0}`;
    }
    if (activeTab === "bowling") {
      const bowl = stats.bowling || stats;
      return `${bowl.wickets ?? 0} wkts • Eco ${bowl.economy ?? bowl.eco ?? "0.00"}`;
    }
    const bat = stats.batting || stats;
    const bowl = stats.bowling || stats;
    return `${bat.runs ?? 0} runs • ${bowl.wickets ?? 0} wkts`;
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
      setSelectedScope("country");
    } else if (pickerType === "state") {
      if (item === "All States") {
        setSelectedState("All States");
        setSelectedDistrict("All Districts");
        setSelectedScope("country");
      } else {
        setSelectedState(item);
        setSelectedDistrict("All Districts");
        setSelectedScope("state");
      }
    } else if (pickerType === "district") {
      setSelectedDistrict(item);
      setSelectedScope("district");
    }
    setPickerModalVisible(false);
  };

  // Filter picker items based on search
  const pickerItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (pickerType === "country") {
      const list = availableCountries;
      if (!q) return list;
      return list.filter((c) => (typeof c === "string" ? c : c.name).toLowerCase().includes(q));
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
  }, [pickerType, searchQuery, availableCountries, availableStates, availableDistricts]);

  const getPickerModalTitle = () => {
    switch (pickerType) {
      case "country":
        return "Select Country";
      case "state":
        return `Select State (${selectedCountry})`;
      case "district":
        return `Select District (${selectedState})`;
      default:
        return "Select Location";
    }
  };

  const isSelectedPickerItem = (item) => {
    const itemName = typeof item === "string" ? item : item.name;
    if (pickerType === "country") return selectedCountry === itemName;
    if (pickerType === "state") {
      if (itemName === "All States") {
        return selectedScope === "country" || selectedState === "All States";
      }
      return selectedState === itemName && selectedScope === "state";
    }
    if (pickerType === "district") return selectedDistrict === itemName;
    return false;
  };

  const getActiveScopeSummary = () => {
    if (selectedScope === "district") return selectedDistrict === "All Districts" ? `${selectedState} (All Districts)` : `${selectedDistrict}, ${selectedState}`;
    if (selectedScope === "state") return selectedState === "All States" ? `${selectedCountry} (All States)` : `${selectedState}, ${selectedCountry}`;
    return `${selectedCountry} (National)`;
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

    const pillarHeight = isFirst ? 116 : isSecond ? 90 : 74;
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
    const teamTitle = typeof player.team === "object" ? player.team?.title : player.team;

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
            marginBottom: 4,
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
            marginBottom: 2,
          }}
        >
          {teamTitle || "Independent"}
        </ThemedText>

        {/* Rank Shift Indicator */}
        <View style={{ marginBottom: 3 }}>
          {renderRankShift(player.rankDelta)}
        </View>

        {/* Provisional Badge if applicable */}
        {player.eligibilityStatus === "PROVISIONAL" && (
          <View
            style={{
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderRadius: 4,
              backgroundColor: isDarkMode
                ? "rgba(245, 158, 11, 0.25)"
                : "rgba(245, 158, 11, 0.15)",
              borderWidth: 1,
              borderColor: "rgba(245, 158, 11, 0.5)",
              marginBottom: 4,
            }}
          >
            <ThemedText style={{ fontSize: 8, fontWeight: "800", color: "#F59E0B" }}>
              PROV
            </ThemedText>
          </View>
        )}

        {/* Score / Rating Badge */}
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
            marginBottom: 6,
          }}
        >
          <ThemedText
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: medalColor,
            }}
          >
            {player.rating || player.score || 0} pts
          </ThemedText>
        </View>

        {/* Key Stats Summary */}
        <ThemedText
          numberOfLines={1}
          style={{
            fontSize: 9,
            color: isDarkMode ? "#94A3B8" : "#64748B",
            textAlign: "center",
            maxWidth: "100%",
            marginBottom: 6,
          }}
        >
          {renderKeyStat(player)}
        </ThemedText>

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
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "rgba(0, 0, 0, 0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThemedText
              style={{
                fontSize: 15,
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
            Player Rankings
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

      {/* ── Scope Navigation Bar ── */}
      <View style={{ backgroundColor: isDarkMode ? "#111827" : "#FFFFFF" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            gap: 8,
          }}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode
              ? "rgba(31, 41, 55, 0.6)"
              : "rgba(229, 231, 235, 0.6)",
          }}
        >
          {scopeChips.map((chip) => {
            const isSelected = selectedScope === chip.type;
            return (
              <TouchableOpacity
                key={chip.type}
                activeOpacity={0.75}
                onPress={() => {
                  setSelectedScope(chip.type);
                  openPicker(chip.type);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isSelected
                    ? "#2563EB"
                    : isDarkMode
                    ? "#1F2937"
                    : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: isSelected
                    ? "#1D4ED8"
                    : isDarkMode
                    ? "rgba(55, 65, 81, 0.8)"
                    : "rgba(203, 213, 225, 0.8)",
                }}
              >
                <ThemedText style={{ fontSize: 13, marginRight: 5 }}>
                  {chip.emoji}
                </ThemedText>
                <ThemedText
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? "700" : "600",
                    color: isSelected
                      ? "#FFFFFF"
                      : isDarkMode
                      ? "#E2E8F0"
                      : "#1E293B",
                  }}
                >
                  {chip.label} ({chip.value})
                </ThemedText>
                <View style={{ marginLeft: 4 }}>
                  <Ionicons
                    name="chevron-down"
                    size={12}
                    color={
                      isSelected
                        ? "#E0E7FF"
                        : isDarkMode
                        ? "#9CA3AF"
                        : "#64748B"
                    }
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Scope & Location Context Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode
              ? "rgba(31, 41, 55, 0.4)"
              : "rgba(241, 245, 249, 0.8)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              marginRight: 8,
            }}
          >
            <Ionicons
              name="navigate-circle"
              size={13}
              color="#3B82F6"
              style={{ marginRight: 5 }}
            />
            <ThemedText
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: isDarkMode ? "#9CA3AF" : "#64748B",
              }}
            >
              Filtering: {getActiveScopeSummary()}
            </ThemedText>
          </View>

          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: isDarkMode
                ? "rgba(59, 130, 246, 0.15)"
                : "rgba(59, 130, 246, 0.1)",
            }}
          >
            <ThemedText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: "#3B82F6",
                textTransform: "capitalize",
              }}
            >
              {selectedScope} Scope
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Discipline Selector (Batting 🏏 / Bowling ⚾ / All-Rounder ⚡) */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 6,
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

      {/* Filters Row: Ball Type Chips + Period Bottom-Sheet Button */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 6,
          marginBottom: 4,
        }}
      >
        {/* Ball Type Chips */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {ballTypeOptions.map((opt) => {
            const isSelected = selectedBallType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.8}
                onPress={() => setSelectedBallType(opt.value)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? isDarkMode
                      ? "#374151"
                      : "#E2E8F0"
                    : isDarkMode
                    ? "#1F2937"
                    : "#F1F5F9",
                  borderWidth: 1,
                  borderColor: isSelected
                    ? isDarkMode
                      ? "#60A5FA"
                      : "#3B82F6"
                    : isDarkMode
                    ? "rgba(55, 65, 81, 0.6)"
                    : "rgba(226, 232, 240, 0.8)",
                }}
              >
                <ThemedText
                  style={{
                    fontSize: 11,
                    fontWeight: isSelected ? "700" : "500",
                    color: isSelected
                      ? isDarkMode
                        ? "#93C5FD"
                        : "#2563EB"
                      : isDarkMode
                      ? "#9CA3AF"
                      : "#64748B",
                  }}
                >
                  {opt.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Period Selector Trigger Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setPeriodModalVisible(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 12,
            backgroundColor: isDarkMode
              ? "rgba(59, 130, 246, 0.15)"
              : "rgba(59, 130, 246, 0.1)",
            borderWidth: 1,
            borderColor: isDarkMode
              ? "rgba(59, 130, 246, 0.4)"
              : "rgba(59, 130, 246, 0.3)",
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={12}
            color="#3B82F6"
            style={{ marginRight: 4 }}
          />
          <ThemedText
            style={{ fontSize: 11, fontWeight: "700", color: "#3B82F6" }}
          >
            {periodOptions.find((p) => p.value === selectedPeriod)?.label ||
              "All-Time"}
          </ThemedText>
          <Ionicons
            name="chevron-down"
            size={10}
            color="#3B82F6"
            style={{ marginLeft: 3 }}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content: Podium & Ranked Contenders */}
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
            Loading rankings for {getActiveScopeSummary()}...
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
            Player match stats for {getActiveScopeSummary()} will appear here
            once matches with the selected filters are completed.
          </ThemedText>

          {/* Quick toggle to State or National level */}
          {selectedScope !== "country" && (
            <TouchableOpacity
              onPress={() => setSelectedScope("country")}
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
                View National Leaderboard
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={remainingPlayers}
          keyExtractor={(item, index) =>
            String(item.playerId || item._id || item.id || index)
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
                paddingTop: 8,
                paddingBottom: 14,
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

              {/* Section Title for Rest of the Contenders */}
              {remainingPlayers.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 18,
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
                    Contenders Leaderboard
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
          renderItem={({ item }) => {
            const badgeStyle = getRankBadgeStyle(item.rank);
            const teamTitle =
              typeof item.team === "object" ? item.team?.title : item.team;

            return (
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
                {/* Position Badge & Rank Shift Column */}
                <View style={{ alignItems: "center", width: 36, marginRight: 8 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: badgeStyle.bg,
                      borderWidth: badgeStyle.border !== "transparent" ? 1 : 0,
                      borderColor: badgeStyle.border,
                    }}
                  >
                    <ThemedText
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: badgeStyle.text,
                      }}
                    >
                      #{item.rank}
                    </ThemedText>
                  </View>

                  {/* Rank Shift Indicator */}
                  <View style={{ marginTop: 2 }}>
                    {renderRankShift(item.rankDelta)}
                  </View>
                </View>

                {/* Player Avatar */}
                <PlayerAvatar player={item} size={42} />

                {/* Info Column */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ThemedText
                      numberOfLines={1}
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: isDarkMode ? "#FFFFFF" : "#1E293B",
                        flexShrink: 1,
                      }}
                    >
                      {item.name}
                    </ThemedText>

                    {item.eligibilityStatus === "PROVISIONAL" && (
                      <View
                        style={{
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                          borderRadius: 4,
                          backgroundColor: isDarkMode
                            ? "rgba(245, 158, 11, 0.25)"
                            : "rgba(245, 158, 11, 0.15)",
                          borderWidth: 1,
                          borderColor: "rgba(245, 158, 11, 0.5)",
                          marginLeft: 6,
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 9,
                            fontWeight: "800",
                            color: "#F59E0B",
                          }}
                        >
                          PROV
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <ThemedText
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      color: isDarkMode ? "#94A3B8" : "#64748B",
                      marginTop: 2,
                    }}
                  >
                    {teamTitle ? `${teamTitle} • ` : ""}
                    {renderDisciplineStats(item, activeTab)}
                  </ThemedText>
                </View>

                {/* Rating Badge */}
                <View
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: isDarkMode
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(59, 130, 246, 0.1)",
                    borderWidth: 1,
                    borderColor: isDarkMode
                      ? "rgba(59, 130, 246, 0.3)"
                      : "rgba(59, 130, 246, 0.2)",
                    alignItems: "center",
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: "#3B82F6",
                    }}
                  >
                    {item.rating || item.score || 0}
                  </ThemedText>
                  <ThemedText
                    style={{
                      fontSize: 9,
                      fontWeight: "600",
                      color: isDarkMode ? "#93C5FD" : "#2563EB",
                    }}
                  >
                    pts
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          }}
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
                    const isAll = itemName === "All Districts" || itemName === "All States";

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
                              name={isAll ? "sparkles" : "map-outline"}
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
                            {isAll
                              ? itemName === "All States"
                                ? `All States in ${selectedCountry}`
                                : `All Districts in ${selectedState}`
                              : itemName}
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

      {/* ── Period Selection Modal (Bottom Sheet Style) ── */}
      <Modal
        visible={periodModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPeriodModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPeriodModalVisible(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              justifyContent: "flex-end",
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: isDarkMode ? "#111827" : "#FFFFFF",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingTop: 16,
                  paddingHorizontal: 20,
                  paddingBottom: Platform.OS === "ios" ? 34 : 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDarkMode ? "#374151" : "#D1D5DB",
                    alignSelf: "center",
                    marginBottom: 16,
                  }}
                />

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: isDarkMode ? "#FFFFFF" : "#111827",
                    }}
                  >
                    Select Ranking Period
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => setPeriodModalVisible(false)}
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

                {periodOptions.map((opt) => {
                  const isSelected = selectedPeriod === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedPeriod(opt.value);
                        setPeriodModalVisible(false);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        borderRadius: 14,
                        marginBottom: 8,
                        backgroundColor: isSelected
                          ? isDarkMode
                            ? "rgba(59, 130, 246, 0.2)"
                            : "rgba(59, 130, 246, 0.1)"
                          : isDarkMode
                          ? "#1F2937"
                          : "#F8FAFC",
                        borderWidth: 1,
                        borderColor: isSelected
                          ? "#3B82F6"
                          : isDarkMode
                          ? "#374151"
                          : "#E2E8F0",
                      }}
                    >
                      <View>
                        <ThemedText
                          style={{
                            fontSize: 15,
                            fontWeight: isSelected ? "700" : "600",
                            color: isSelected
                              ? "#3B82F6"
                              : isDarkMode
                              ? "#FFFFFF"
                              : "#1E293B",
                          }}
                        >
                          {opt.label}
                        </ThemedText>
                        <ThemedText
                          style={{
                            fontSize: 12,
                            color: isDarkMode ? "#9CA3AF" : "#64748B",
                            marginTop: 2,
                          }}
                        >
                          {opt.desc}
                        </ThemedText>
                      </View>

                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#3B82F6"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});

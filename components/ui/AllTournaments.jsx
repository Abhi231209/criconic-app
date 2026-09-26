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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import SCREENS from "@/screens";
import AnimatedFooter from "./AnimatedFooter";
import { tournamentsApi } from "@/utils/api";
import { getImageFullUrl } from "@/utils";

function computeInitials(name) {
  if (!name || typeof name !== "string") return "CR";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0]?.slice(0, 2) || "CR").toUpperCase();
}

function formatDateRange(startDateStr, endDateStr) {
  try {
    if (!startDateStr || startDateStr === "TBD") return "Dates TBA";
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return "Dates TBA";

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const sDay = start.getDate();
    const sMonth = months[start.getMonth()];
    const sYear = start.getFullYear();

    if (!endDateStr || endDateStr === "TBD") {
      return `${sDay} ${sMonth} ${sYear}`;
    }

    const end = new Date(endDateStr);
    if (isNaN(end.getTime())) {
      return `${sDay} ${sMonth} ${sYear}`;
    }

    const eDay = end.getDate();
    const eMonth = months[end.getMonth()];
    const eYear = end.getFullYear();

    if (sDay === eDay && sMonth === eMonth && sYear === eYear) {
      return `${sDay} ${sMonth} ${sYear}`;
    }
    if (sMonth === eMonth && sYear === eYear) {
      return `${sDay} – ${eDay} ${sMonth} ${sYear}`;
    }
    if (sYear === eYear) {
      return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${sYear}`;
    }
    return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
  } catch (e) {
    return "Dates TBA";
  }
}

function TournamentCard({ item, isDarkMode, onPress }) {
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const bannerUri = item.bannerImage ? getImageFullUrl(item.bannerImage) : null;
  const logoUri = item.logoImage ? getImageFullUrl(item.logoImage) : null;
  const initials = computeInitials(item.name);
  const dateDisplay = formatDateRange(
    item.rawStart || item.startDate,
    item.rawEnd || item.endDate
  );

  const getStatusBadge = () => {
    switch (item.status) {
      case "ongoing":
        return {
          label: "Live / Ongoing",
          badgeBg: "bg-emerald-500/20 border-emerald-400/50",
          text: "text-emerald-400",
          dot: "bg-emerald-400",
        };
      case "upcoming":
        return {
          label: "Upcoming",
          badgeBg: "bg-[#4DD6C7]/20 border-[#4DD6C7]/50",
          text: "text-[#8CE9DD]",
          dot: "bg-[#4DD6C7]",
        };
      case "completed":
        return {
          label: "Completed",
          badgeBg: isDarkMode
            ? "bg-slate-800/80 border-slate-600/50"
            : "bg-slate-100 border-slate-300",
          text: isDarkMode ? "text-slate-300" : "text-slate-600",
          dot: isDarkMode ? "bg-slate-400" : "bg-slate-500",
        };
      default:
        return {
          label: item.status.charAt(0).toUpperCase() + item.status.slice(1),
          badgeBg: isDarkMode
            ? "bg-slate-800/80 border-slate-600/50"
            : "bg-slate-100 border-slate-300",
          text: isDarkMode ? "text-slate-300" : "text-slate-600",
          dot: isDarkMode ? "bg-slate-400" : "bg-slate-500",
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      className={`rounded-2xl mb-4 overflow-hidden border ${
        isDarkMode
          ? "bg-[#111A2E] border-slate-800/80 shadow-lg shadow-black/50"
          : "bg-white border-slate-200/90 shadow-sm"
      }`}
    >
      {/* Banner Area */}
      <View className="h-36 w-full relative overflow-hidden bg-slate-900">
        {bannerUri && !bannerError ? (
          <Image
            source={{ uri: bannerUri }}
            className="w-full h-full"
            resizeMode="cover"
            onError={() => setBannerError(true)}
          />
        ) : (
          <LinearGradient
            colors={["#0F293A", "#0F172A", "#1A1438"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-full h-full items-center justify-center relative"
          >
            {/* Ambient decorative glow */}
            <View className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-[#4DD6C7]/15 blur-xl pointer-events-none" />
            <View className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-amber-500/15 blur-xl pointer-events-none" />
            <Ionicons
              name="trophy"
              size={85}
              color="rgba(255,255,255,0.04)"
              style={{
                position: "absolute",
                right: -5,
                bottom: -15,
                transform: [{ rotate: "15deg" }],
              }}
            />
            <View className="items-center justify-center z-10">
              <ThemedText className="text-3xl font-black text-white/90 tracking-widest">
                {initials}
              </ThemedText>
              <ThemedText className="text-[10px] text-[#4DD6C7] uppercase font-bold tracking-[0.2em] mt-0.5">
                CRICKET LEAGUE
              </ThemedText>
            </View>
          </LinearGradient>
        )}

        {/* Top Vignette Scrim */}
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.15)", "transparent"]}
          className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
        />

        {/* Bottom Vignette Scrim */}
        <LinearGradient
          colors={[
            "transparent",
            isDarkMode ? "rgba(17,26,46,0.85)" : "rgba(0,0,0,0.65)",
            isDarkMode ? "#111A2E" : "rgba(0,0,0,0.85)",
          ]}
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        />

        {/* Top Header Floating Badges */}
        <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between z-10">
          {/* Status Badge */}
          <View
            className={`flex-row items-center px-2.5 py-1 rounded-full border ${statusBadge.badgeBg}`}
          >
            <View
              className={`w-2 h-2 rounded-full ${statusBadge.dot} mr-1.5`}
            />
            <ThemedText
              className={`text-[10px] font-bold uppercase tracking-wider ${statusBadge.text}`}
            >
              {statusBadge.label}
            </ThemedText>
          </View>

          {/* Right chips: Ball Type & Verified */}
          <View className="flex-row items-center">
            {item.ballType && (
              <View className="px-2.5 py-1 rounded-full bg-black/60 border border-white/20 mr-1.5">
                <ThemedText className="text-[10px] font-semibold text-slate-200 capitalize">
                  {item.ballType} Ball
                </ThemedText>
              </View>
            )}
            {item.isApproved && (
              <View className="px-2 py-1 rounded-full bg-[#4DD6C7]/20 border border-[#4DD6C7]/40 flex-row items-center">
                <Ionicons name="shield-checkmark" size={11} color="#4DD6C7" />
              </View>
            )}
          </View>
        </View>

        {/* Bottom Avatar and Organizer on Banner */}
        <View className="absolute bottom-2.5 left-3 right-3 flex-row items-center z-10">
          <View className="w-11 h-11 rounded-xl bg-slate-900 border-2 border-white/25 overflow-hidden items-center justify-center shadow-md">
            {logoUri && !logoError ? (
              <Image
                source={{ uri: logoUri }}
                className="w-full h-full"
                resizeMode="cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <LinearGradient
                colors={["#1E293B", "#0F172A"]}
                className="w-full h-full items-center justify-center"
              >
                <Ionicons name="trophy" size={20} color="#F59E0B" />
              </LinearGradient>
            )}
          </View>

          <View className="flex-1 ml-2.5">
            {item.organizerName ? (
              <ThemedText
                className="text-xs text-slate-300 font-medium"
                numberOfLines={1}
              >
                By{" "}
                <ThemedText className="text-white font-bold">
                  {item.organizerName}
                </ThemedText>
              </ThemedText>
            ) : (
              <ThemedText
                className="text-[11px] text-[#8CE9DD] font-semibold uppercase tracking-wider"
                numberOfLines={1}
              >
                Official Tournament
              </ThemedText>
            )}
          </View>
        </View>
      </View>

      {/* Card Content Body */}
      <View className="p-4 pt-3">
        {/* Tournament Name */}
        <ThemedText
          className={`text-base font-bold leading-snug ${
            isDarkMode ? "text-white" : "text-slate-900"
          }`}
          numberOfLines={2}
        >
          {item.name}
        </ThemedText>

        {/* Date & Location */}
        <View className="mt-2.5 space-y-1">
          <View className="flex-row items-center">
            <Ionicons
              name="calendar-outline"
              size={13}
              color="#4DD6C7"
              style={{ marginRight: 6 }}
            />
            <ThemedText
              className={`text-xs font-medium ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
              numberOfLines={1}
            >
              {dateDisplay}
            </ThemedText>
          </View>

          <View className="flex-row items-center">
            <Ionicons
              name="location-sharp"
              size={13}
              color="#F59E0B"
              style={{ marginRight: 6 }}
            />
            <ThemedText
              className={`text-xs capitalize ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
              numberOfLines={1}
            >
              {item.location}
            </ThemedText>
          </View>
        </View>

        {/* Prize Money & Entry Fee Row */}
        {(item.prizeMoney || item.entryFee) && (
          <View className="flex-row flex-wrap items-center mt-3 gap-2">
            {item.prizeMoney && (
              <View className="flex-row items-center px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Ionicons
                  name="trophy-outline"
                  size={12}
                  color="#F59E0B"
                  style={{ marginRight: 4 }}
                />
                <ThemedText className="text-[11px] font-bold text-amber-400">
                  Prize: {item.prizeMoney}
                </ThemedText>
              </View>
            )}
            {item.entryFee && (
              <View className="flex-row items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <Ionicons
                  name="pricetag-outline"
                  size={12}
                  color="#34D399"
                  style={{ marginRight: 4 }}
                />
                <ThemedText className="text-[11px] font-semibold text-emerald-300">
                  Entry: {item.entryFee}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Bottom Bar: Stats Chips + View Arena */}
        <View
          className={`mt-3 pt-3 border-t ${
            isDarkMode ? "border-white/10" : "border-slate-100"
          } flex-row items-center justify-between`}
        >
          <View className="flex-row items-center flex-wrap">
            <View
              className={`px-2.5 py-1 rounded-lg mr-2 flex-row items-center ${
                isDarkMode
                  ? "bg-slate-800/80 border border-white/5"
                  : "bg-slate-100"
              }`}
            >
              <Ionicons
                name="people-outline"
                size={12}
                color={isDarkMode ? "#94A3B8" : "#64748B"}
                style={{ marginRight: 4 }}
              />
              <ThemedText
                className={`text-xs font-semibold ${
                  isDarkMode ? "text-slate-200" : "text-slate-800"
                }`}
              >
                {item.teams} {item.teams === 1 ? "Team" : "Teams"}
              </ThemedText>
            </View>

            <View
              className={`px-2.5 py-1 rounded-lg flex-row items-center ${
                isDarkMode
                  ? "bg-slate-800/80 border border-white/5"
                  : "bg-slate-100"
              }`}
            >
              <Ionicons
                name="baseball-outline"
                size={12}
                color={isDarkMode ? "#94A3B8" : "#64748B"}
                style={{ marginRight: 4 }}
              />
              <ThemedText
                className={`text-xs font-semibold ${
                  isDarkMode ? "text-slate-200" : "text-slate-800"
                }`}
              >
                {item.matches} {item.matches === 1 ? "Match" : "Matches"}
              </ThemedText>
            </View>
          </View>

          <View className="flex-row items-center">
            <ThemedText className="text-xs font-bold text-[#4DD6C7] mr-0.5">
              View Arena
            </ThemedText>
            <Ionicons name="chevron-forward" size={14} color="#4DD6C7" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AllTournaments() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(SCREENS.Home);
    }
  };

  const mapTournament = (t) => {
    const rawStart = t.date?.start || t.startDate;
    const rawEnd = t.date?.end || t.endDate;
    const startDateStr = rawStart
      ? new Date(rawStart).toISOString().split("T")[0]
      : "TBD";
    const endDateStr = rawEnd
      ? new Date(rawEnd).toISOString().split("T")[0]
      : "TBD";
    const now = new Date();
    const start = rawStart ? new Date(rawStart) : null;
    const end = rawEnd ? new Date(rawEnd) : null;

    let status = "ongoing";
    const rawStatus = String(t.status || "").toLowerCase().trim();
    if (rawStatus === "cancelled" || rawStatus === "abandoned") {
      status = "cancelled";
    } else if (rawStatus === "completed" || rawStatus === "finished") {
      status = "completed";
    } else if (end && !isNaN(end.getTime())) {
      const endOfDay = new Date(end.getTime());
      endOfDay.setHours(23, 59, 59, 999);
      if (now > endOfDay) {
        status = "completed";
      } else if (start && !isNaN(start.getTime())) {
        const startOfDay = new Date(start.getTime());
        startOfDay.setHours(0, 0, 0, 0);
        if (now < startOfDay) {
          status = "upcoming";
        } else {
          status = "ongoing";
        }
      } else {
        status = "ongoing";
      }
    } else if (start && !isNaN(start.getTime())) {
      const startOfDay = new Date(start.getTime());
      startOfDay.setHours(0, 0, 0, 0);
      if (now < startOfDay) {
        status = "upcoming";
      } else {
        status = "ongoing";
      }
    } else if (rawStatus === "upcoming" || rawStatus === "ongoing") {
      status = rawStatus;
    }

    const rawEntryFee = t.entryFee;
    const entryFee =
      rawEntryFee !== undefined &&
      rawEntryFee !== null &&
      rawEntryFee !== "" &&
      Number(rawEntryFee) !== 0 &&
      rawEntryFee !== "0"
        ? String(rawEntryFee).startsWith("₹")
          ? String(rawEntryFee)
          : `₹${rawEntryFee}`
        : null;

    let organizerName = t.organizerName || null;
    if (
      !organizerName &&
      Array.isArray(t.organizer) &&
      t.organizer.length > 0
    ) {
      organizerName = t.organizer
        .map((o) => o?.username || o?.name)
        .filter(Boolean)
        .join(", ");
    }
    if (!organizerName && t.createdBy?.username) {
      organizerName = t.createdBy.username;
    }

    return {
      id: String(t._id || t.id || t.slug),
      name: t.title || t.name || "Tournament",
      shortName:
        t.shortName ||
        (t.title ? t.title.slice(0, 4).toUpperCase() : "TRN"),
      logo: t.logoImage || t.logo || null,
      logoImage: t.logoImage || t.logo || null,
      coverImage: t.bannerImage || t.coverImage || t.banner || null,
      bannerImage: t.bannerImage || t.coverImage || t.banner || null,
      banner: t.bannerImage || t.coverImage || t.banner || null,
      startDate: startDateStr,
      endDate: endDateStr,
      rawStart,
      rawEnd,
      location: t.location || t.city || "Venue TBA",
      city: t.city || null,
      organizerName,
      ballType: t.ballType || null,
      teams: Array.isArray(t.teams) ? t.teams.length : t.maxTeams || 0,
      status,
      format:
        t.matchType ||
        (t.ballType
          ? `${t.ballType.charAt(0).toUpperCase() + t.ballType.slice(1)} Ball`
          : "T20"),
      prizeMoney: t.prizeMoney
        ? String(t.prizeMoney).startsWith("₹")
          ? String(t.prizeMoney)
          : `₹${t.prizeMoney}`
        : null,
      entryFee,
      matches: Array.isArray(t.matches)
        ? t.matches.length
        : Array.isArray(t.matchDetails)
        ? t.matchDetails.length
        : 0,
      progress:
        status === "completed" ? 100 : status === "upcoming" ? 0 : 50,
      isApproved: !!t.isApproved || t.tier === "paid",
      raw: t,
    };
  };

  const fetchTournaments = async (pageNum = 1, shouldAppend = false) => {
    try {
      if (pageNum === 1 && !shouldAppend) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await tournamentsApi.getAllTournaments({
        params: { page: pageNum, limit: 12 },
      });
      const list = res?.data?.content || res?.data || [];
      if (Array.isArray(list)) {
        const mapped = list.map(mapTournament);
        if (shouldAppend) {
          setTournaments((prev) => {
            const seen = new Set(prev.map((item) => item.id));
            const newItems = mapped.filter((item) => !seen.has(item.id));
            return [...prev, ...newItems];
          });
        } else {
          setTournaments(mapped);
        }
        setPage(pageNum);
        setHasMore(list.length >= 12);
      } else {
        if (!shouldAppend) setTournaments([]);
        setHasMore(false);
      }
    } catch (error) {
      console.warn("[AllTournaments] Failed to fetch tournaments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTournaments(1, false);
  }, []);

  const filters = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchTournaments(1, false);
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchTournaments(page + 1, true);
    }
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesSearch =
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tournament.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "all") return matchesSearch;
    return matchesSearch && tournament.status === activeFilter;
  });

  const FilterButton = ({ filter }) => {
    const isActive = activeFilter === filter.id;
    return (
      <TouchableOpacity
        onPress={() => setActiveFilter(filter.id)}
        className={`px-4 py-2 rounded-xl mr-2 flex-row items-center ${
          isActive
            ? "bg-[#4DD6C7] shadow-sm shadow-[#4DD6C7]/30"
            : isDarkMode
            ? "bg-[#111A2E] border border-slate-700/60"
            : "bg-slate-100 border border-slate-200"
        }`}
      >
        <ThemedText
          className={`text-xs font-bold ${
            isActive
              ? "text-slate-950"
              : isDarkMode
              ? "text-slate-300"
              : "text-slate-700"
          }`}
        >
          {filter.label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className={`flex-1 ${isDarkMode ? "bg-[#0A0F1D]" : "bg-slate-50"}`}
    >
      {/* Header */}
      <View
        className={`px-4 py-3.5 border-b flex-row items-center justify-between ${
          isDarkMode
            ? "bg-[#0D1526] border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleBack}
            className={`p-2 rounded-xl mr-2.5 ${
              isDarkMode ? "bg-slate-800/60" : "bg-slate-100"
            }`}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={isDarkMode ? "#FFFFFF" : "#0F172A"}
            />
          </TouchableOpacity>
          <View>
            <ThemedText
              className={`text-lg font-black ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Tournaments
            </ThemedText>
            <ThemedText className="text-[11px] text-[#4DD6C7] font-semibold">
              Live Leagues & Arenas
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.CreateTournament)}
          className="flex-row items-center px-3 py-1.5 rounded-xl bg-[#4DD6C7]/15 border border-[#4DD6C7]/40"
        >
          <Ionicons
            name="add-circle"
            size={18}
            color="#4DD6C7"
            style={{ marginRight: 4 }}
          />
          <ThemedText className="text-xs font-bold text-[#8CE9DD]">
            Host League
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        className={`px-4 py-3 ${
          isDarkMode
            ? "bg-[#0D1526] border-b border-slate-800/80"
            : "bg-white border-b border-slate-200"
        }`}
      >
        <View
          className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
            isDarkMode
              ? "bg-[#111A2E] border-slate-700/60"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <Ionicons
            name="search"
            size={18}
            color={isDarkMode ? "#4DD6C7" : "#64748B"}
          />
          <TextInput
            placeholder="Search tournaments, venues, cities..."
            placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className={`flex-1 ml-2 text-sm ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={isDarkMode ? "#94A3B8" : "#64748B"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View
        className={`py-3 px-4 ${
          isDarkMode
            ? "bg-[#0D1526] border-b border-slate-800/80"
            : "bg-white border-b border-slate-200"
        }`}
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
        renderItem={({ item }) => (
          <TournamentCard
            item={item}
            isDarkMode={isDarkMode}
            onPress={() =>
              navigation.navigate(SCREENS.TournamentProfile, {
                tournament: item,
              })
            }
          />
        )}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 120 + insets.bottom,
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" color="#4DD6C7" />
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4DD6C7"]}
            tintColor={isDarkMode ? "#4DD6C7" : "#0D9488"}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#4DD6C7" />
              <ThemedText
                className={`text-xs mt-3 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Loading tournaments...
              </ThemedText>
            </View>
          ) : (
            <View className="items-center justify-center py-16 px-6">
              <View
                className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${
                  isDarkMode
                    ? "bg-slate-800/60 border border-slate-700/50"
                    : "bg-slate-100 border border-slate-200"
                }`}
              >
                <Ionicons
                  name="trophy-outline"
                  size={32}
                  color={isDarkMode ? "#4DD6C7" : "#0D9488"}
                />
              </View>
              <ThemedText
                className={`text-base font-bold text-center ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                No tournaments found
              </ThemedText>
              <ThemedText
                className={`text-xs text-center mt-1.5 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {searchQuery || activeFilter !== "all"
                  ? "Try adjusting your search query or switching filters."
                  : "Be the first to host an exciting cricket tournament!"}
              </ThemedText>
              {(searchQuery || activeFilter !== "all") && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setActiveFilter("all");
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#4DD6C7]/15 border border-[#4DD6C7]/40"
                >
                  <ThemedText className="text-xs font-bold text-[#8CE9DD]">
                    Reset Filters
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
      <AnimatedFooter currentTab="Tournament" />
    </SafeAreaView>
  );
}

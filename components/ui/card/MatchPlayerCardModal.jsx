import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Linking,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import ThemedText from "../custom/ThemedText";
import PlayerAvatar from "../custom/PlayerAvatar";
import { generatePlayerHypeLines, getPlayerPerformanceBadge } from "@/utils/playerHypeLine";
import { userApi } from "@/utils/api";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 360);

export default function MatchPlayerCardModal({
  visible,
  onClose,
  initialPlayer,
  matchData,
  playersList = [],
}) {
  const cardRef = useRef(null);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
  const [isCapturing, setIsCapturing] = useState(false);
  const [careerStats, setCareerStats] = useState(null);
  const [customQuote, setCustomQuote] = useState("");
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Sync selected player when initialPlayer changes
  useEffect(() => {
    if (initialPlayer) {
      setSelectedPlayer(initialPlayer);
      setCustomQuote("");
      setQuoteIndex(0);
    }
  }, [initialPlayer]);

  // Fetch career stats for selected player if available
  useEffect(() => {
    let isMounted = true;
    const playerId =
      selectedPlayer?.playerId ||
      selectedPlayer?.id ||
      selectedPlayer?._id ||
      selectedPlayer?.userId;

    if (playerId && String(playerId) !== "1") {
      userApi
        .getProfile(playerId)
        .then((res) => {
          if (!isMounted) return;
          const u = res?.data?.data || res?.data?.user || res?.data;
          if (u) {
            setCareerStats(
              u?.stats?.batting || u?.stats || u?.userStats || u?.battingStats || null
            );
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [selectedPlayer]);

  // Match info extraction
  const matchTitle =
    matchData?.title ||
    `${matchData?.teams?.[0]?.title || matchData?.teamA?.title || "Team 1"} vs ${
      matchData?.teams?.[1]?.title || matchData?.teamB?.title || "Team 2"
    }`;

  const venue = matchData?.venue || matchData?.ground || matchData?.city || "Match Arena";
  const dateStr = (() => {
    const raw = matchData?.date || matchData?.createdAt || matchData?.publishedTime;
    if (!raw) return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    try {
      const d = new Date(raw);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  })();

  const resultText =
    matchData?.matchResult?.prompt ||
    matchData?.description ||
    (typeof matchData?.result === "string" ? matchData.result : "") ||
    "Match Performance";

  // Check if player is strictly the real Player of the Match
  const isMom = useMemo(() => {
    if (!selectedPlayer) return false;
    const momObj = matchData?.mom || matchData?.manOfTheMatch;
    if (!momObj) return false;

    const momId = String(momObj?.playerId || momObj?._id || momObj?.id || "").trim();
    const momName = String(momObj?.playerName || momObj?.name || (typeof momObj === "string" ? momObj : "")).trim().toLowerCase();

    const pId = String(selectedPlayer?.playerId || selectedPlayer?._id || selectedPlayer?.id || "").trim();
    const pName = String(selectedPlayer?.playerName || selectedPlayer?.name || selectedPlayer?.username || (typeof selectedPlayer === "string" ? selectedPlayer : "")).trim().toLowerCase();

    if (momId && pId && momId !== "undefined" && pId !== "undefined" && momId === pId) {
      return true;
    }
    if (momName && pName && momName !== "player" && pName !== "player" && momName === pName) {
      return true;
    }
    // Also support explicit isMom property if name matches momObj
    if (selectedPlayer?.isMom && momName && pName && momName === pName) {
      return true;
    }
    return false;
  }, [matchData?.mom, matchData?.manOfTheMatch, selectedPlayer]);

  // Dynamic performance badge (always inspiring, positive, and accurate)
  const playerBadge = useMemo(() => {
    return getPlayerPerformanceBadge({ player: selectedPlayer, isMom });
  }, [selectedPlayer, isMom]);

  // Generate dynamic hype lines
  const hypeLines = useMemo(() => {
    if (!selectedPlayer) return [];
    return generatePlayerHypeLines({
      player: selectedPlayer,
      matchData,
      careerStats,
      isMom,
      isWinner: true,
    });
  }, [selectedPlayer, matchData, careerStats, isMom]);

  const activeQuote = customQuote.trim()
    ? customQuote.trim()
    : hypeLines[quoteIndex % (hypeLines.length || 1)] ||
      "A champion's knock! Commanded the crease with poise, power, and relentless authority.";

  const handleNextQuote = () => {
    if (customQuote) {
      setCustomQuote("");
    }
    setQuoteIndex((prev) => (prev + 1) % (hypeLines.length || 1));
  };

  // Performance stats breakdown
  const runs = Number(selectedPlayer?.runs ?? selectedPlayer?.batting?.runs ?? 0);
  const balls = Number(
    selectedPlayer?.ballsFaced ?? selectedPlayer?.balls ?? selectedPlayer?.batting?.balls ?? 0
  );
  const fours = Number(selectedPlayer?.fours ?? selectedPlayer?.batting?.fours ?? 0);
  const sixes = Number(selectedPlayer?.sixes ?? selectedPlayer?.batting?.sixes ?? 0);
  const sr = Number(
    selectedPlayer?.sr ?? (balls > 0 ? ((runs / balls) * 100).toFixed(1) : 0)
  );
  const isNotOut = Boolean(selectedPlayer?.notOut || selectedPlayer?.isNotOut);

  const wickets = Number(
    selectedPlayer?.wicketsTaken ?? selectedPlayer?.wickets ?? selectedPlayer?.bowling?.wickets ?? 0
  );
  const overs = String(
    selectedPlayer?.over ?? selectedPlayer?.overs ?? selectedPlayer?.bowling?.overs ?? "0"
  );
  const runsGiven = Number(
    selectedPlayer?.runsGiven ?? selectedPlayer?.runsConceded ?? selectedPlayer?.bowling?.runsConceded ?? 0
  );
  const eco = Number(
    selectedPlayer?.eco ??
      selectedPlayer?.economy ??
      (overs && parseFloat(overs) > 0 ? (runsGiven / parseFloat(overs)).toFixed(2) : 0)
  );
  const maidens = Number(selectedPlayer?.maiden ?? selectedPlayer?.maidens ?? 0);

  const hasBatting = balls > 0 || runs > 0 || selectedPlayer?.notOut !== undefined;
  const hasBowling = parseFloat(overs) > 0 || wickets > 0;

  // Capture Card image with ViewShot
  const captureCardImage = async () => {
    if (!cardRef.current) {
      throw new Error("Card view is not available for capture.");
    }
    setIsCapturing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      return uri;
    } finally {
      setIsCapturing(false);
    }
  };

  // Share to WhatsApp (Direct Share or via Expo Sharing)
  const handleShareToWhatsApp = async () => {
    try {
      const uri = await captureCardImage();
      const message = `🔥 Check out ${selectedPlayer?.name || "Player"}'s match performance on Criconic! 🏏\n"${activeQuote}"\nDownload Criconic App for live cricket scoring.`;

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `Share to WhatsApp Status: ${selectedPlayer?.name}`,
          UTI: "public.png",
        });
      } else {
        // Fallback for text share
        await Share.share({
          message,
        });
      }
    } catch (error) {
      console.warn("Share to WhatsApp error:", error);
      Alert.alert("Sharing Failed", "Could not export image. Please try again.");
    }
  };

  // Share to Instagram Story (Via OS Share Sheet or native integration)
  const handleShareToInstagram = async () => {
    try {
      const uri = await captureCardImage();
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share to Instagram Story",
          UTI: "public.png",
        });
      } else {
        Alert.alert("Notice", "Sharing is not supported on this device.");
      }
    } catch (error) {
      console.warn("Share to Instagram error:", error);
      Alert.alert("Sharing Failed", "Could not export story image. Please try again.");
    }
  };

  // General Share or Save
  const handleGeneralShare = async () => {
    try {
      const uri = await captureCardImage();
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `Share ${selectedPlayer?.name}'s Player Card`,
          UTI: "public.png",
        });
      } else {
        Alert.alert("Notice", "Sharing is not available.");
      }
    } catch (error) {
      console.warn("General share error:", error);
      Alert.alert("Error", "Could not share card. Please try again.");
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/85 justify-end">
        {/* Backdrop Dismiss */}
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          accessibilityLabel="Close player card modal"
        />

        {/* Modal Sheet Container */}
        <View className="bg-[#0A0F1D] rounded-t-3xl border-t border-slate-700/60 pb-8 pt-4 px-4 max-h-[92%]">
          {/* Header Action Bar */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-800">
            <View>
              <ThemedText className="text-white text-base font-black">
                Match Story Card
              </ThemedText>
              <ThemedText className="text-slate-400 text-xs">
                Criconic Official Verified Spotlight
              </ThemedText>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center border border-slate-700"
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Players Selection Strip (if multiple players available) */}
          {playersList && playersList.length > 1 && (
            <View className="py-2.5">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {playersList.map((p, idx) => {
                  const pId = p?.playerId || p?.id || p?._id || idx;
                  const isCurrent =
                    (selectedPlayer?.playerId && selectedPlayer.playerId === p?.playerId) ||
                    (selectedPlayer?.name && selectedPlayer.name === p?.name);

                  return (
                    <TouchableOpacity
                      key={String(pId)}
                      onPress={() => {
                        setSelectedPlayer(p);
                        setCustomQuote("");
                        setQuoteIndex(0);
                      }}
                      className={`px-3 py-1.5 rounded-full flex-row items-center border ${
                        isCurrent
                          ? "bg-amber-500/25 border-amber-400"
                          : "bg-slate-800/80 border-slate-700"
                      }`}
                      style={{
                        backgroundColor: isCurrent ? "rgba(245, 158, 11, 0.25)" : "rgba(30, 41, 59, 0.85)",
                        borderColor: isCurrent ? "#F59E0B" : "#475569",
                      }}
                    >
                      <PlayerAvatar player={p} size={18} className="mr-1.5" />
                      <ThemedText
                        className={`text-xs font-semibold ${
                          isCurrent ? "text-amber-300" : "text-slate-300"
                        }`}
                        style={{
                          color: isCurrent ? "#FEF08A" : "#E2E8F0",
                        }}
                      >
                        {p?.name || "Player"}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Scrollable Card Preview */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ alignItems: "center", paddingVertical: 12 }}
          >
            {/* THE SHAREABLE 9:16 VERTICAL STORY CARD */}
            <View
              ref={cardRef}
              collapsable={false}
              style={{
                width: CARD_WIDTH,
                borderRadius: 24,
                overflow: "hidden",
                borderWidth: 1.5,
                borderColor: isMom ? "rgba(245, 158, 11, 0.4)" : "rgba(77, 214, 199, 0.35)",
              }}
            >
              <LinearGradient
                colors={["#060B14", "#0C1427", "#050912"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ padding: 18 }}
              >
                {/* Top Criconic Official Brand Banner */}
                <View className="flex-row items-center justify-between pb-3 border-b border-white/10">
                  <View className="flex-row items-center">
                    <Image
                      source={require("@/assets/brand/logo-horizontal-dark.png")}
                      style={{ width: 90, height: 22, resizeMode: "contain" }}
                    />
                  </View>
                  <View className="flex-row items-center px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
                    <Ionicons name="checkmark-circle" size={11} color="#4DD6C7" />
                    <ThemedText className="text-[10px] font-bold text-white ml-1 tracking-wider uppercase">
                      MATCH STORY
                    </ThemedText>
                  </View>
                </View>

                {/* Match Details Pill */}
                <View className="my-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <ThemedText
                    className="text-white text-xs font-bold text-center"
                    numberOfLines={1}
                  >
                    {matchTitle}
                  </ThemedText>
                  <View className="flex-row justify-between items-center mt-0.5">
                    <ThemedText className="text-slate-400 text-[10px]">
                      {dateStr}
                    </ThemedText>
                    <ThemedText
                      className="text-amber-400 text-[10px] font-semibold"
                      numberOfLines={1}
                    >
                      {resultText}
                    </ThemedText>
                  </View>
                </View>

                {/* Hero Player Presentation */}
                <View className="items-center mt-2 mb-3">
                  {/* Glowing Avatar Frame */}
                  <View
                    style={{
                      padding: 4,
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: isMom ? "#F59E0B" : (playerBadge?.iconColor || "#4DD6C7"),
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      shadowColor: isMom ? "#F59E0B" : (playerBadge?.iconColor || "#4DD6C7"),
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 10,
                      elevation: 8,
                    }}
                  >
                    <PlayerAvatar player={selectedPlayer} size={76} />
                  </View>

                  {/* Player Badge */}
                  <View
                    className={`mt-2.5 px-3.5 py-1 rounded-full border flex-row items-center ${
                      playerBadge?.badgeClass || "bg-[#4DD6C7]/20 border-[#4DD6C7]/50"
                    }`}
                    style={{
                      backgroundColor: playerBadge?.backgroundColor || (isMom ? "rgba(120, 53, 15, 0.45)" : "rgba(77, 214, 199, 0.25)"),
                      borderColor: playerBadge?.borderColor || (isMom ? "rgba(245, 158, 11, 0.85)" : "rgba(77, 214, 199, 0.75)"),
                    }}
                  >
                    <Ionicons
                      name={playerBadge?.icon || (isMom ? "trophy" : "star")}
                      size={12}
                      color={playerBadge?.iconColor || (isMom ? "#F59E0B" : "#4DD6C7")}
                      style={{ marginRight: 5 }}
                    />
                    <ThemedText
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        playerBadge?.textClass || "text-[#8CE9DD]"
                      }`}
                      style={{
                        color: playerBadge?.textColor || (isMom ? "#FEF08A" : "#CCFBF1"),
                      }}
                    >
                      {playerBadge?.label || (isMom ? "PLAYER OF THE MATCH" : "MATCH PERFORMER")}
                    </ThemedText>
                  </View>

                  {/* Player Name & Team */}
                  <ThemedText className="text-white text-xl font-black mt-1.5 text-center">
                    {selectedPlayer?.name || "Player"}
                  </ThemedText>
                  <ThemedText className="text-slate-400 text-xs font-semibold mt-0.5">
                    {selectedPlayer?.team || matchData?.teams?.[0]?.title || "Criconic XI"}
                  </ThemedText>
                </View>

                {/* Performance Stats Cards */}
                <View className="mb-3.5">
                  {/* Batting Box */}
                  {hasBatting && (
                    <View className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 mb-2">
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center">
                          <MaterialCommunityIcons
                            name="cricket"
                            size={14}
                            color="#4DD6C7"
                            style={{ marginRight: 4 }}
                          />
                          <ThemedText className="text-[#4DD6C7] text-xs font-bold uppercase tracking-wider">
                            BATTING PERFORMANCE
                          </ThemedText>
                        </View>
                        {isNotOut && (
                          <View
                            className="px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: "rgba(16, 185, 129, 0.25)",
                              borderColor: "rgba(52, 211, 153, 0.65)",
                            }}
                          >
                            <ThemedText
                              className="text-[9px] font-bold tracking-wider"
                              style={{ color: "#6EE7B7" }}
                            >
                              NOT OUT
                            </ThemedText>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-baseline justify-between pt-1">
                        <View className="flex-row items-baseline">
                          <ThemedText className="text-white text-3xl font-black">
                            {runs}
                            {isNotOut ? "*" : ""}
                          </ThemedText>
                          <ThemedText className="text-slate-400 text-xs font-semibold ml-1.5">
                            ({balls} balls)
                          </ThemedText>
                        </View>

                        <View className="flex-row items-center gap-3">
                          <View className="items-center">
                            <ThemedText className="text-white text-sm font-bold">
                              {sr}
                            </ThemedText>
                            <ThemedText className="text-slate-400 text-[10px]">
                              S.R.
                            </ThemedText>
                          </View>
                          <View className="items-center">
                            <ThemedText className="text-white text-sm font-bold">
                              {fours}
                            </ThemedText>
                            <ThemedText className="text-slate-400 text-[10px]">
                              4s
                            </ThemedText>
                          </View>
                          <View className="items-center">
                            <ThemedText className="text-white text-sm font-bold">
                              {sixes}
                            </ThemedText>
                            <ThemedText className="text-slate-400 text-[10px]">
                              6s
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Bowling Box */}
                  {hasBowling && (
                    <View className="p-3 rounded-2xl bg-white/[0.05] border border-white/10">
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center">
                          <Ionicons
                            name="baseball"
                            size={13}
                            color="#F59E0B"
                            style={{ marginRight: 4 }}
                          />
                          <ThemedText className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                            BOWLING SPELL
                          </ThemedText>
                        </View>
                        <ThemedText className="text-slate-400 text-[10px] font-semibold">
                          {overs} Overs
                        </ThemedText>
                      </View>

                      <View className="flex-row items-baseline justify-between pt-1">
                        <View className="flex-row items-baseline">
                          <ThemedText className="text-white text-3xl font-black">
                            {wickets}/{runsGiven}
                          </ThemedText>
                          <ThemedText className="text-slate-400 text-xs font-semibold ml-1.5">
                            wickets
                          </ThemedText>
                        </View>

                        <View className="flex-row items-center gap-3">
                          <View className="items-center">
                            <ThemedText className="text-white text-sm font-bold">
                              {eco}
                            </ThemedText>
                            <ThemedText className="text-slate-400 text-[10px]">
                              ECON
                            </ThemedText>
                          </View>
                          <View className="items-center">
                            <ThemedText className="text-white text-sm font-bold">
                              {maidens}
                            </ThemedText>
                            <ThemedText className="text-slate-400 text-[10px]">
                              MDN
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* THE BEST LINE / HYPE QUOTE BOX */}
                <View className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-teal-500/10 border border-amber-500/25 relative overflow-hidden mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center">
                      <Ionicons name="chatbubble-ellipses" size={12} color="#F59E0B" />
                      <ThemedText className="text-[10px] font-black text-amber-400 ml-1 tracking-wider uppercase">
                        CRICONIC IMPACT SPOTLIGHT
                      </ThemedText>
                    </View>
                    <Ionicons name="flash" size={12} color="#4DD6C7" />
                  </View>

                  <ThemedText className="text-amber-100 text-xs font-bold italic leading-5 mt-0.5">
                    “{activeQuote}”
                  </ThemedText>
                </View>

                {/* Bottom Card Authenticity Footer */}
                <View className="flex-row items-center justify-between pt-2.5 border-t border-white/10">
                  <View className="flex-row items-center">
                    <Image
                      source={require("@/assets/brand/logo-mark.png")}
                      style={{ width: 18, height: 18, resizeMode: "contain", marginRight: 6 }}
                    />
                    <View>
                      <ThemedText className="text-white text-[10px] font-black tracking-wider">
                        CRICONIC CRICKET
                      </ThemedText>
                      <ThemedText className="text-slate-500 text-[8px]">
                        Live Match & Tournament Scores
                      </ThemedText>
                    </View>
                  </View>

                  <View className="items-end">
                    <ThemedText className="text-emerald-400 text-[9px] font-bold">
                      VERIFIED MATCH CARD
                    </ThemedText>
                    <ThemedText className="text-slate-500 text-[8px]">
                      criconic.com
                    </ThemedText>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Custom Quote Editor / Line Shuffler */}
            <View className="flex-row items-center gap-2 mt-3 w-full justify-center px-4">
              <TouchableOpacity
                onPress={handleNextQuote}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 flex-row items-center justify-center"
                activeOpacity={0.8}
              >
                <Ionicons name="shuffle" size={14} color="#4DD6C7" />
                <ThemedText className="text-[#8CE9DD] text-xs font-bold ml-1.5">
                  Shuffle Line
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsEditingQuote(!isEditingQuote)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 flex-row items-center justify-center"
                activeOpacity={0.8}
              >
                <Ionicons name="pencil" size={13} color="#F59E0B" />
                <ThemedText className="text-amber-300 text-xs font-bold ml-1.5">
                  {isEditingQuote ? "Done" : "Custom Quote"}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Custom Quote Input */}
            {isEditingQuote && (
              <View className="w-full px-4 mt-2">
                <TextInput
                  value={customQuote}
                  onChangeText={setCustomQuote}
                  placeholder="Type a custom line for the story card..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={2}
                  maxLength={140}
                  className="bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs leading-4"
                />
              </View>
            )}
          </ScrollView>

          {/* Social Share Buttons Strip */}
          <View className="pt-2 border-t border-slate-800">
            <ThemedText className="text-slate-400 text-[11px] font-semibold text-center mb-2.5">
              POST AS STORY / STATUS WITH CRICONIC BRANDING
            </ThemedText>

            <View className="flex-row items-center gap-2.5">
              {/* WhatsApp Status Button */}
              <TouchableOpacity
                onPress={handleShareToWhatsApp}
                disabled={isCapturing}
                activeOpacity={0.85}
                className="flex-1 rounded-2xl overflow-hidden shadow-lg"
              >
                <LinearGradient
                  colors={["#25D366", "#128C7E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="py-3 px-3 flex-row items-center justify-center"
                >
                  {isCapturing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                      <ThemedText className="text-white font-black text-xs ml-1.5">
                        WhatsApp Status
                      </ThemedText>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Instagram Story Button */}
              <TouchableOpacity
                onPress={handleShareToInstagram}
                disabled={isCapturing}
                activeOpacity={0.85}
                className="flex-1 rounded-2xl overflow-hidden shadow-lg"
              >
                <LinearGradient
                  colors={["#833AB4", "#FD1D1D", "#FCB045"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="py-3 px-3 flex-row items-center justify-center"
                >
                  {isCapturing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
                      <ThemedText className="text-white font-black text-xs ml-1.5">
                        Instagram Story
                      </ThemedText>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* More / Save Button */}
              <TouchableOpacity
                onPress={handleGeneralShare}
                disabled={isCapturing}
                activeOpacity={0.85}
                className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 items-center justify-center"
              >
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

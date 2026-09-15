import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { tournamentsApi } from "@/utils/api";
import User from "@/utils/User";

export default function TournamentUpgrade() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const tournament = route.params?.tournament;
  const tournamentId = tournament?._id || tournament?.id || route.params?.tournamentId;

  const authUser = useSelector((state) => state.auth?.user);
  const isAdmin = User.isAdmin() || authUser?.role === 1 || authUser?.role === 2;

  const [tiers, setTiers] = useState(null);
  const [systemEnabled, setSystemEnabled] = useState(null); // null = still loading
  const [payment, setPayment] = useState(tournament?.payment || { status: "none" });
  const [currentTier, setCurrentTier] = useState(tournament?.tier || "free");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    tournamentsApi.getTiers().then((res) => {
      const body = res?.data?.data || res?.data;
      if (body?.tiers) setTiers(body.tiers);
      setSystemEnabled(Boolean(body?.enabled));
    }).catch(() => setSystemEnabled(false));
  }, []);

  const paidTier = tiers?.paid;
  const freeTier = tiers?.free;

  const handleRequestUpgrade = async () => {
    if (!tournamentId) return;
    setSubmitting(true);
    try {
      const res = await tournamentsApi.requestUpgrade(tournamentId, note);
      const data = res?.data;
      if (data?.success) {
        setPayment(data.payment || { status: "pending" });
        Alert.alert(
          "Upgrade requested",
          data.message || "We'll activate the Paid tier once payment is confirmed."
        );
      } else {
        Alert.alert("Couldn't request upgrade", data?.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Couldn't request upgrade", err?.response?.data?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!tournamentId) return;
    setApproving(true);
    try {
      const res = await tournamentsApi.approveUpgrade(tournamentId);
      const data = res?.data;
      if (data?.success) {
        setCurrentTier("paid");
        setPayment((p) => ({ ...p, status: "paid" }));
        Alert.alert("Approved", "This tournament is now on the Paid tier.");
      } else {
        Alert.alert("Couldn't approve", data?.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Couldn't approve", err?.response?.data?.message || "Please try again.");
    } finally {
      setApproving(false);
    }
  };

  const isPaid = currentTier === "paid";

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      <View className={`flex-row items-center px-4 py-3 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={22} color={isDarkMode ? "#FFFFFF" : "#111827"} />
        </TouchableOpacity>
        <ThemedText className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          Tournament Tier
        </ThemedText>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Current status */}
        <View
          className={`p-4 rounded-xl mb-4 flex-row items-center justify-between ${
            isPaid
              ? isDarkMode ? "bg-yellow-900/30" : "bg-yellow-50"
              : isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <View>
            <ThemedText className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Current tier
            </ThemedText>
            <ThemedText className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {isPaid ? "🏆 Paid" : "Free"}
            </ThemedText>
          </View>
          {payment?.status === "pending" && (
            <View className="px-3 py-1.5 rounded-full bg-amber-500">
              <ThemedText className="text-xs font-semibold text-black">Payment pending</ThemedText>
            </View>
          )}
        </View>

        {systemEnabled === null || !tiers ? (
          <ActivityIndicator />
        ) : systemEnabled === false && !isPaid ? (
          <View className={`p-4 rounded-xl items-center ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            <Ionicons name="hourglass-outline" size={28} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
            <ThemedText className={`text-sm text-center mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Paid tournament tiers aren't available yet. Check back soon!
            </ThemedText>
          </View>
        ) : (
          <>
            {/* Tier comparison */}
            <View className="flex-row mb-4" style={{ gap: 12 }}>
              {[freeTier, paidTier].map((tier) => (
                <View
                  key={tier.id}
                  className={`flex-1 p-4 rounded-xl border ${
                    currentTier === tier.id
                      ? "border-blue-500"
                      : isDarkMode ? "border-gray-700" : "border-gray-200"
                  } ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
                >
                  <ThemedText className={`text-base font-bold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {tier.name}
                  </ThemedText>
                  <ThemedText className={`text-xl font-extrabold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {tier.price === 0 ? "Free" : `₹${tier.price}`}
                    {tier.price > 0 && (
                      <ThemedText className={`text-xs font-normal ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {" "}/ tournament
                      </ThemedText>
                    )}
                  </ThemedText>

                  <FeatureLine
                    isDarkMode={isDarkMode}
                    ok
                    text={tier.maxTeams ? `Up to ${tier.maxTeams} teams` : "Unlimited teams"}
                  />
                  <FeatureLine isDarkMode={isDarkMode} ok={tier.branding} text="Sponsor branding" />
                  <FeatureLine isDarkMode={isDarkMode} ok={tier.pointsTableExport} text="Points table export" />
                </View>
              ))}
            </View>

            {/* Upgrade action */}
            {!isPaid && (
              <View className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <ThemedText className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Upgrade to Paid
                </ThemedText>
                <ThemedText className={`text-xs mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Pay ₹{paidTier?.price} via UPI to the organizer contact shown on the app,
                  then submit your payment reference below. We'll confirm and activate
                  the Paid tier for this tournament.
                </ThemedText>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="UPI transaction ID / reference"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  className={`px-3 py-2.5 rounded-lg mb-3 ${
                    isDarkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                />
                <TouchableOpacity
                  onPress={handleRequestUpgrade}
                  disabled={submitting || payment?.status === "pending"}
                  className={`py-3 rounded-lg items-center ${
                    payment?.status === "pending" ? "bg-gray-400" : "bg-blue-600"
                  }`}
                >
                  <ThemedText className="text-white font-semibold">
                    {submitting
                      ? "Submitting..."
                      : payment?.status === "pending"
                      ? "Upgrade requested — awaiting confirmation"
                      : "Request Upgrade"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {/* Admin approval — only shown to admins, only meaningful once a
                request is pending */}
            {isAdmin && payment?.status === "pending" && (
              <View className={`p-4 rounded-xl mb-4 border border-dashed ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}>
                <ThemedText className={`text-sm font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Admin: confirm payment
                </ThemedText>
                <ThemedText className={`text-xs mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Reference submitted: {payment?.note || "(none)"}
                </ThemedText>
                <TouchableOpacity
                  onPress={handleApprove}
                  disabled={approving}
                  className="py-3 rounded-lg items-center bg-green-600"
                >
                  <ThemedText className="text-white font-semibold">
                    {approving ? "Approving..." : "Approve & Activate Paid Tier"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const FeatureLine = ({ isDarkMode, ok, text }) => (
  <View className="flex-row items-center mb-1.5">
    <Ionicons
      name={ok ? "checkmark-circle" : "close-circle"}
      size={14}
      color={ok ? "#10B981" : isDarkMode ? "#4B5563" : "#D1D5DB"}
    />
    <ThemedText
      className={`text-xs ml-1.5 ${
        ok ? (isDarkMode ? "text-gray-200" : "text-gray-700") : isDarkMode ? "text-gray-500" : "text-gray-400"
      }`}
    >
      {text}
    </ThemedText>
  </View>
);

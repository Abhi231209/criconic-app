import React, { useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useAxiosGet } from "@/hooks/useApi";
import SCREENS from "@/screens";

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function BlogList() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const { get, isLoading, data } = useAxiosGet("api/posts", {
    useBaseURL: true,
  });

  useEffect(() => {
    get({});
  }, []);

  const onRefresh = useCallback(() => {
    get({});
  }, [get]);

  const posts = (data?.posts || []).filter(
    (p) => p?.isPublished !== false
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate(SCREENS.BlogPost, {
          slug: item.slug,
          title: item.title,
        })
      }
      style={[styles.card, isDarkMode ? styles.cardDark : styles.cardLight]}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
      ) : (
        <View
          style={[
            styles.thumb,
            styles.thumbPlaceholder,
            isDarkMode ? styles.phDark : styles.phLight,
          ]}
        >
          <Ionicons
            name="newspaper-outline"
            size={28}
            color={isDarkMode ? "#4B5563" : "#9CA3AF"}
          />
        </View>
      )}
      <View style={styles.cardBody}>
        {!!item.category && (
          <ThemedText style={styles.category}>
            {item.category.toUpperCase()}
          </ThemedText>
        )}
        <ThemedText
          style={[
            styles.title,
            isDarkMode ? styles.textWhite : styles.textBlack,
          ]}
          numberOfLines={2}
        >
          {item.title}
        </ThemedText>
        {!!item.description && (
          <ThemedText style={styles.desc} numberOfLines={2}>
            {item.description}
          </ThemedText>
        )}
        <View style={styles.metaRow}>
          <ThemedText style={styles.meta}>
            {formatDate(item.publishedAt || item.createdAt)}
          </ThemedText>
          <View style={styles.metaDot} />
          <Ionicons name="eye-outline" size={13} color="#9CA3AF" />
          <ThemedText style={styles.meta}> {item.views || 0}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.safe, isDarkMode ? styles.bgDark : styles.bgLight]}
      edges={["top", "bottom", "left", "right"]}
    >
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#3B82F6", "#1D4ED8"]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Blog</ThemedText>
        <View style={styles.backButton} />
      </LinearGradient>

      {isLoading && !data ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id || item.slug}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="newspaper-outline"
                size={48}
                color={isDarkMode ? "#4B5563" : "#9CA3AF"}
              />
              <ThemedText
                style={[
                  styles.emptyText,
                  isDarkMode ? styles.textWhite : styles.textBlack,
                ]}
              >
                No posts yet. Check back soon!
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgLight: { backgroundColor: "#f3f4f6" },
  bgDark: { backgroundColor: "#111827" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { width: 32, alignItems: "flex-start" },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardLight: { backgroundColor: "white" },
  cardDark: { backgroundColor: "#1f2937" },
  thumb: { width: "100%", height: 160 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  phLight: { backgroundColor: "#e5e7eb" },
  phDark: { backgroundColor: "#374151" },
  cardBody: { padding: 14 },
  category: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "bold" },
  desc: { color: "#6B7280", fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  meta: { color: "#9CA3AF", fontSize: 12 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 8,
  },
  emptyState: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
  textWhite: { color: "white" },
  textBlack: { color: "#111827" },
});

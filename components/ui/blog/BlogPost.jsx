import React, { useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  useWindowDimensions,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import RenderHtml from "react-native-render-html";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useAxiosGet } from "@/hooks/useApi";

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

export default function BlogPost() {
  const navigation = useNavigation();
  const route = useRoute();
  const { slug, title: initialTitle } = route.params || {};
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { width } = useWindowDimensions();

  const { get, isLoading, data } = useAxiosGet(`api/posts/${slug}`, {
    useBaseURL: true,
  });

  useEffect(() => {
    if (slug) get({});
  }, [slug]);

  const post = data?.post;

  const baseStyle = {
    color: isDarkMode ? "#E5E7EB" : "#1F2937",
    fontSize: 16,
    lineHeight: 24,
  };
  const tagsStyles = {
    a: { color: "#3B82F6" },
    h1: { color: isDarkMode ? "#F9FAFB" : "#111827" },
    h2: { color: isDarkMode ? "#F9FAFB" : "#111827" },
    h3: { color: isDarkMode ? "#F9FAFB" : "#111827" },
    p: { marginBottom: 12 },
    img: { borderRadius: 8 },
  };

  return (
    <SafeAreaView
      style={[styles.safe, isDarkMode ? styles.bgDark : styles.bgLight]}
      edges={["top"]}
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
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {post?.title || initialTitle || "Article"}
        </ThemedText>
        <View style={styles.backButton} />
      </LinearGradient>

      {isLoading && !data ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : !post ? (
        <View style={styles.centerFill}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={isDarkMode ? "#4B5563" : "#9CA3AF"}
          />
          <ThemedText
            style={[
              styles.emptyText,
              isDarkMode ? styles.textWhite : styles.textBlack,
            ]}
          >
            Post not found.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!!post.thumbnail && (
            <Image source={{ uri: post.thumbnail }} style={styles.thumb} />
          )}
          {!!post.category && (
            <ThemedText style={styles.category}>
              {post.category.toUpperCase()}
            </ThemedText>
          )}
          <ThemedText
            style={[
              styles.title,
              isDarkMode ? styles.textWhite : styles.textBlack,
            ]}
          >
            {post.title}
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText style={styles.meta}>
              {formatDate(post.publishedAt || post.createdAt)}
            </ThemedText>
            <View style={styles.metaDot} />
            <Ionicons name="eye-outline" size={14} color="#9CA3AF" />
            <ThemedText style={styles.meta}> {post.views || 0}</ThemedText>
          </View>

          {!!post.content && (
            <View style={styles.content}>
              <RenderHtml
                contentWidth={width - 32}
                source={{ html: post.content }}
                baseStyle={baseStyle}
                tagsStyles={tagsStyles}
              />
            </View>
          )}
        </ScrollView>
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
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  thumb: { width: "100%", height: 200, borderRadius: 12, marginBottom: 16 },
  category: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: { fontSize: 24, fontWeight: "bold", lineHeight: 30 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  meta: { color: "#9CA3AF", fontSize: 13 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 8,
  },
  content: { marginTop: 16 },
  emptyText: { fontSize: 16 },
  textWhite: { color: "white" },
  textBlack: { color: "#111827" },
});

import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { request } from "@/utils/api";

export default function BlogPosts({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await request("api/posts", { method: "GET" });
      if (res?.data?.success) {
        setPosts(res.data.posts || []);
      }
    } catch (err) {
      console.warn("[BlogPosts] Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <SafeAreaView
      style={[styles.safeArea, isDarkMode ? styles.bgDark : styles.bgLight]}
    >
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          isDarkMode ? styles.headerBarDark : styles.headerBarLight,
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkMode ? "#FFFFFF" : "#111827"}
          />
        </TouchableOpacity>
        <ThemedText
          style={[
            styles.headerTitle,
            isDarkMode ? styles.textWhite : styles.textBlack,
          ]}
        >
          Blog Posts
        </ThemedText>
        <TouchableOpacity onPress={fetchPosts} style={styles.backButton}>
          <Ionicons
            name="refresh"
            size={22}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <ThemedText style={styles.loadingText}>Loading articles...</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeader}>
            <ThemedText
              style={[
                styles.sectionTitle,
                isDarkMode ? styles.textWhite : styles.textBlack,
              ]}
            >
              Published Posts ({posts.length})
            </ThemedText>
          </View>

          {posts.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                isDarkMode ? styles.cardDark : styles.cardLight,
              ]}
            >
              <Ionicons
                name="newspaper-outline"
                size={40}
                color={isDarkMode ? "#4B5563" : "#9CA3AF"}
                style={{ marginBottom: 8 }}
              />
              <ThemedText
                style={[
                  styles.emptyText,
                  isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                ]}
              >
                No blog posts published yet
              </ThemedText>
            </View>
          ) : (
            posts.map((post, idx) => (
              <View
                key={post._id || idx}
                style={[
                  styles.itemCard,
                  isDarkMode ? styles.cardDark : styles.cardLight,
                ]}
              >
                <ThemedText
                  style={[
                    styles.postTitle,
                    isDarkMode ? styles.textWhite : styles.textBlack,
                  ]}
                >
                  {post.title || "Untitled Post"}
                </ThemedText>
                {post.description ? (
                  <ThemedText
                    numberOfLines={2}
                    style={[
                      styles.postDesc,
                      isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                    ]}
                  >
                    {post.description}
                  </ThemedText>
                ) : null}
                <View style={styles.postFooter}>
                  <ThemedText
                    style={[
                      styles.postDate,
                      isDarkMode ? styles.subtitleDark : styles.subtitleLight,
                    ]}
                  >
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString()
                      : "Recently added"}
                  </ThemedText>
                  {post.tags && (
                    <ThemedText style={styles.postTag}>
                      {Array.isArray(post.tags) ? post.tags.join(", ") : post.tags}
                    </ThemedText>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: "#F9FAFB",
  },
  bgDark: {
    backgroundColor: "#111827",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBarLight: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E5E7EB",
  },
  headerBarDark: {
    backgroundColor: "#1F2937",
    borderBottomColor: "#374151",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  itemCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  cardDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  postDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  postDate: {
    fontSize: 12,
  },
  postTag: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
  emptyCard: {
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  subtitleLight: {
    color: "#6B7280",
  },
  subtitleDark: {
    color: "#9CA3AF",
  },
  textWhite: {
    color: "#FFFFFF",
  },
  textBlack: {
    color: "#111827",
  },
});

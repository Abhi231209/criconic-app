import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  useColorScheme,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import { request } from "@/utils/api";
import { searchFallbackLocations } from "@/utils/locationHelper";

export default function LocationSearch({
  label,
  value = "",
  onChangeText,
  onSelectLocation,
  placeholder = "Search location or city...",
  required = false,
  isDarkMode: propDarkMode,
  containerStyle,
  inputContainerStyle,
}) {
  const colorScheme = useColorScheme();
  const isDarkMode = propDarkMode !== undefined ? propDarkMode : colorScheme === "dark";

  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimerRef = useRef(null);

  // Sync internal query if external value changes
  useEffect(() => {
    if (value !== query) {
      setQuery(value || "");
    }
  }, [value]);

  const searchLocations = useCallback(async (text) => {
    if (!text || text.trim().length < 3) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await request(
        `api/users/searchLocation?searchKeyWord=${encodeURIComponent(text.trim())}&type=geocode`,
        { method: "GET", errorAlert: false }
      );

      let predictions =
        res?.data?.data?.predictions ||
        res?.data?.predictions ||
        (Array.isArray(res?.data?.data) ? res?.data?.data : []);

      if (!Array.isArray(predictions) || predictions.length === 0) {
        predictions = searchFallbackLocations(text);
      }

      setResults(predictions);
      setIsOpen(predictions.length > 0);
    } catch (err) {
      console.warn("[LocationSearch] Search error:", err?.message || err);
      const fallback = searchFallbackLocations(text);
      setResults(fallback);
      setIsOpen(fallback.length > 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTextChange = (text) => {
    setQuery(text);
    onChangeText?.(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text || text.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      searchLocations(text);
    }, 350);
  };

  const handleSelect = (item) => {
    const description =
      typeof item === "string"
        ? item
        : item?.description ||
          item?.structured_formatting?.main_text ||
          "";

    setQuery(description);
    setIsOpen(false);
    setResults([]);

    onChangeText?.(description);
    onSelectLocation?.(item);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onChangeText?.("");
    onSelectLocation?.(null);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText
          style={[
            styles.label,
            isDarkMode ? styles.labelDark : styles.labelLight,
          ]}
        >
          {label} {required && <ThemedText style={styles.required}>*</ThemedText>}
        </ThemedText>
      )}

      <View
        style={[
          styles.inputContainer,
          isDarkMode ? styles.inputContainerDark : styles.inputContainerLight,
          inputContainerStyle,
        ]}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          style={styles.searchIcon}
        />

        <TextInput
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? "#9CA3AF" : "#9CA3AF"}
          style={[
            styles.input,
            isDarkMode ? styles.inputDark : styles.inputLight,
          ]}
          autoCapitalize="words"
          returnKeyType="search"
        />

        {isLoading ? (
          <ActivityIndicator
            size="small"
            color="#3B82F6"
            style={styles.rightIcon}
          />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.rightIcon}>
            <Ionicons
              name="close-circle"
              size={18}
              color={isDarkMode ? "#9CA3AF" : "#9CA3AF"}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <View
          style={[
            styles.dropdown,
            isDarkMode ? styles.dropdownDark : styles.dropdownLight,
          ]}
        >
          {results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item, index) =>
                item.place_id || item.id || `loc_${index}`
              }
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              renderItem={({ item, index }) => {
                const mainText =
                  item?.structured_formatting?.main_text ||
                  item?.description ||
                  String(item);
                const secondaryText =
                  item?.structured_formatting?.secondary_text || "";

                return (
                  <TouchableOpacity
                    style={[
                      styles.resultItem,
                      index < results.length - 1 && (
                        isDarkMode
                          ? styles.resultBorderDark
                          : styles.resultBorderLight
                      ),
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="location-sharp"
                      size={16}
                      color="#3B82F6"
                      style={styles.itemIcon}
                    />
                    <View style={styles.itemTextContainer}>
                      <ThemedText
                        numberOfLines={1}
                        style={[
                          styles.mainText,
                          isDarkMode ? styles.textWhite : styles.textBlack,
                        ]}
                      >
                        {mainText}
                      </ThemedText>
                      {secondaryText ? (
                        <ThemedText
                          numberOfLines={1}
                          style={[
                            styles.secondaryText,
                            isDarkMode
                              ? styles.secondaryTextDark
                              : styles.secondaryTextLight,
                          ]}
                        >
                          {secondaryText}
                        </ThemedText>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
              style={styles.resultsList}
            />
          ) : !isLoading && query.trim().length >= 3 ? (
            <View style={styles.noResults}>
              <ThemedText
                style={[
                  styles.noResultsText,
                  isDarkMode ? styles.secondaryTextDark : styles.secondaryTextLight,
                ]}
              >
                No matching locations found
              </ThemedText>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: "relative",
    zIndex: 999,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  labelLight: {
    color: "#374151",
  },
  labelDark: {
    color: "#D1D5DB",
  },
  required: {
    color: "#EF4444",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputContainerLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
  },
  inputContainerDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  inputLight: {
    color: "#111827",
  },
  inputDark: {
    color: "#F9FAFB",
  },
  rightIcon: {
    padding: 4,
    marginLeft: 4,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    maxHeight: 220,
    overflow: "hidden",
  },
  dropdownLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  dropdownDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  resultsList: {
    maxHeight: 220,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  resultBorderLight: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resultBorderDark: {
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  itemIcon: {
    marginRight: 10,
  },
  itemTextContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryText: {
    fontSize: 12,
    marginTop: 2,
  },
  secondaryTextLight: {
    color: "#6B7280",
  },
  secondaryTextDark: {
    color: "#9CA3AF",
  },
  textWhite: {
    color: "#F9FAFB",
  },
  textBlack: {
    color: "#111827",
  },
  noResults: {
    padding: 14,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 13,
  },
});

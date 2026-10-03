import AsyncStorage from "@react-native-async-storage/async-storage";

// The last few queries on the Search screen, newest first, so they can be
// re-run with one tap.
const KEY = "@criconic_recent_searches";
const MAX = 5;

export const loadRecentSearches = async () => {
  try {
    const list = JSON.parse(await AsyncStorage.getItem(KEY));
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
};

// `replacing` drops an entry this one supersedes (e.g. "vir" once "virat" is
// typed), so search-as-you-type doesn't fill the list with prefixes.
// Returns the updated list so the screen can show it without re-reading.
export const addRecentSearch = async (query, replacing = null) => {
  const q = String(query || "").trim();
  const current = await loadRecentSearches();
  if (!q) return current;
  const drop = [q, replacing].filter(Boolean).map((s) => s.toLowerCase());
  const next = [q, ...current.filter((s) => !drop.includes(s.toLowerCase()))].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
};

export const clearRecentSearches = () => AsyncStorage.removeItem(KEY).catch(() => {});

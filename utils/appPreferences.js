import AsyncStorage from "@react-native-async-storage/async-storage";

// Settings kept on this phone (Settings → Scoring).
const KEYS = {
  scorerHaptics: "@criconic_pref_scorer_haptics",
  defaultOvers: "@criconic_pref_default_overs",
};

export const DEFAULT_OVERS_CHOICES = [5, 6, 8, 10, 12, 15, 20, 50];
const DEFAULTS = { scorerHaptics: true, defaultOvers: 20 };

export const getPreference = async (name) => {
  try {
    const raw = await AsyncStorage.getItem(KEYS[name]);
    if (raw === null) return DEFAULTS[name];
    return typeof DEFAULTS[name] === "boolean" ? raw === "true" : Number(raw) || DEFAULTS[name];
  } catch {
    return DEFAULTS[name];
  }
};

export const setPreference = (name, value) =>
  AsyncStorage.setItem(KEYS[name], String(value)).catch(() => {});

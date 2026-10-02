import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Login secrets (JWT, session cookie) live in the OS keychain/keystore via
// SecureStore instead of plain AsyncStorage, which other code on a rooted or
// backed-up device can read. SecureStore doesn't exist on web, so the web
// build falls back to AsyncStorage (localStorage) there.
// Keys may only contain letters, numbers, ".", "-" and "_".
const isWeb = Platform.OS === "web";

export const getSecureItem = async (key) => {
  try {
    return isWeb ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch (e) {
    console.warn(`[secureStorage] Failed to read ${key}:`, e);
    return null;
  }
};

export const setSecureItem = async (key, value) => {
  try {
    if (isWeb) await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.warn(`[secureStorage] Failed to save ${key}:`, e);
  }
};

export const deleteSecureItem = async (key) => {
  try {
    if (isWeb) await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.warn(`[secureStorage] Failed to delete ${key}:`, e);
  }
};

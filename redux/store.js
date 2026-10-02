import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./themeSlice";
import deviceReducer from "./deviceSlice";
import authReducer, { setToken } from "./authSlice";
import userReducer from "./userSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, persistStore, createTransform } from "redux-persist";
import User from "@/utils/User";
import { getSecureItem, setSecureItem, deleteSecureItem } from "@/utils/secureStorage";

const AUTH_TOKEN_KEY = "criconic_auth_token";
const TOKEN_FIELDS = ["access_token", "token", "refresh_token"];

export const selectAuthToken = (state) =>
  state?.auth?.token || state?.auth?.user?.access_token || state?.auth?.user?.token || null;

// Never write the JWT into AsyncStorage — it lives in SecureStore (see
// restoreAndSyncAuthToken). Reading passes a token through unchanged, so one
// saved by an older app version is migrated instead of logging the user out.
const stripTokens = createTransform(
  (inbound, key) => {
    if (key === "token") return null;
    if (key === "user" && inbound) {
      const user = { ...inbound };
      TOKEN_FIELDS.forEach((field) => delete user[field]);
      return user;
    }
    return inbound;
  },
  (outbound) => outbound,
  { whitelist: ["token", "user"] }
);
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist/es/constants";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  blacklist: [],
  timeout: 10000,
  debug: __DEV__,
  transforms: [stripTokens],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    device: deviceReducer,
    auth: persistedAuthReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
      immutableCheck: false,
    }),
  devTools: __DEV__,
});

// Resolves once the saved token is back in the store, so the first API calls
// (e.g. the startup auth check) don't go out without it.
let resolveAuthTokenReady;
export const authTokenReady = new Promise((resolve) => {
  resolveAuthTokenReady = resolve;
});
setTimeout(() => resolveAuthTokenReady(), 12000); // never block requests forever

const restoreAndSyncAuthToken = async () => {
  try {
    const state = store.getState();
    let current = selectAuthToken(state);
    if (current) {
      // Came from AsyncStorage (older app version): move it to SecureStore.
      await setSecureItem(AUTH_TOKEN_KEY, current);
    } else if (state?.auth?.user) {
      const saved = await getSecureItem(AUTH_TOKEN_KEY);
      if (saved) {
        store.dispatch(setToken(saved));
        current = saved;
      }
    }
    // From now on mirror every change (login, logout, new token) to SecureStore.
    let lastSaved = current || null;
    store.subscribe(() => {
      const token = selectAuthToken(store.getState());
      if (token === lastSaved) return;
      lastSaved = token;
      if (token) setSecureItem(AUTH_TOKEN_KEY, token);
      else deleteSecureItem(AUTH_TOKEN_KEY);
    });
  } finally {
    resolveAuthTokenReady();
  }
};

export const persistor = persistStore(store, null, () => {
  const state = store.getState();
  if (state?.auth?.user) {
    User.login(state.auth.user);
    console.log("Rehydration complete - User initialized:", User.id, User.name);
  } else {
    console.log("Rehydration complete - No saved user");
  }
  restoreAndSyncAuthToken();
});
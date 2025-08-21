import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./themeSlice";
import deviceReducer from "./deviceSlice";
import authReducer from "./authSlice";
import userReducer from "./userSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, persistStore } from "redux-persist";
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
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    device: deviceReducer,
    auth: persistedAuthReducer,
    user: userReducer
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

export const persistor = persistStore(store, null, () => {
  console.log('Rehydration complete');
});
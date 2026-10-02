import { createSlice } from "@reduxjs/toolkit";
import User from "@/utils/User";

const initialState = {
  user: null, // User data will be stored here after login
  token: null, // Auth token
  isAuthenticated: false,
  is_logged_in: false, // Add this to match navigation check
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      const payload = action.payload || {};
      const normalizedUser = {
        ...payload,
        id: payload._id || payload.id || null,
        _id: payload._id || payload.id || null,
        username: payload.username || payload.name || null,
        name: payload.username || payload.name || null,
        is_logged_in: true,
      };
      // The startup status check and profile updates re-dispatch login with a
      // user object that has no token. Keep the token we have when it's the
      // same user — dropping it logs the socket out and blocks scoring.
      const isSameUser =
        Boolean(normalizedUser._id) &&
        String(state.user?._id || state.user?.id || "") === String(normalizedUser._id);
      state.user = normalizedUser;
      state.token = payload.token || payload.access_token || (isSameUser ? state.token : null);
      state.isAuthenticated = true;
      state.is_logged_in = true;
      state.loading = false;
      state.error = null;

      // Synchronize User singleton
      User.login(normalizedUser);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.is_logged_in = false;
      state.loading = false;
      state.error = null;

      // Synchronize User singleton
      User.logout();
    },

    updateUser: (state, action) => {
      const payload = action.payload || {};
      const updatedUser = {
        ...(state.user || {}),
        ...payload,
        id: payload._id || payload.id || state.user?._id || state.user?.id || null,
        _id: payload._id || payload.id || state.user?._id || state.user?.id || null,
        username: payload.username || payload.name || state.user?.username || state.user?.name || null,
        name: payload.username || payload.name || state.user?.username || state.user?.name || null,
      };
      state.user = updatedUser;

      // Synchronize User singleton
      User.login(updatedUser);
    },

    // New token for the logged-in user (restored from secure storage on launch,
    // or returned after a password change).
    setToken: (state, action) => {
      state.token = action.payload || null;
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    reset: () => initialState,
  },
});

// Export actions
export const { login, logout, updateUser, setToken, reset, setLoading, setError } = authSlice.actions;

// Export reducer
export default authSlice.reducer;
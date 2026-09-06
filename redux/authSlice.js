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
      state.user = normalizedUser;
      state.token = payload.token || payload.access_token || null;
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
export const { login, logout, reset, setLoading, setError } = authSlice.actions;

// Export reducer
export default authSlice.reducer;
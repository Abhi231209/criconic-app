import { createSlice } from "@reduxjs/toolkit";

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
      state.user = {
        ...(action.payload || {}),
        is_logged_in: true, // Ensure this is set
      };
      state.token = action.payload.access_token;
      state.isAuthenticated = true;
      state.is_logged_in = true;
      state.loading = false;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.is_logged_in = false;
      state.loading = false;
      state.error = null;
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
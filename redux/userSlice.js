import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user_id: null,
  full_name: null,
  email: null,
  mobile_number: null,
  access_token: null,
  refresh_token: null,
  session_id: null,
  is_logged_in: false,
  isLoading: true,
  hasLoggedOut: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Updates user details
    setUser: (state, action) => {
      return { ...state, ...action.payload };
    },
    // Clears user state to the initial state
    clearUser: () => initialState,
    // Updates login status
    setLoginStatus: (state, action) => {
      state.is_logged_in = action.payload;
    },
    // Updates loading state
    setIsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    // Updates logout status and optionally resets user data
    setUserAndLogoutStatus: (state, action) => {
      state.hasLoggedOut = action.payload.hasLoggedOut;
      if (action.payload.user) {
        Object.assign(state, action.payload.user);
      }
    },
  },
});

export const {
  setUser,
  clearUser,
  setLoginStatus,
  setIsLoading,
  setUserAndLogoutStatus,
} = userSlice.actions;

export default userSlice.reducer;
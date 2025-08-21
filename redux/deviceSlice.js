import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as Device from "expo-device";
import { Dimensions } from "react-native";

export const fetchDeviceInfo = createAsyncThunk(
  "device/fetchDeviceInfo",
  async () => {
    return {
      model: Device.modelName,
      brand: Device.brand,
      os: Device.osName,
      osVersion: Device.osVersion,
      isEmulator: !Device.isDevice,
      screenWidth: Dimensions.get("window").width,
      screenHeight: Dimensions.get("window").height,
    };
  }
);

const deviceSlice = createSlice({
  name: "device",
  initialState: {
    model: null,
    brand: null,
    os: null,
    osVersion: null,
    isEmulator: false,
    screenWidth: Dimensions.get("window").width,
    screenHeight: Dimensions.get("window").height,
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeviceInfo.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDeviceInfo.fulfilled, (state, action) => {
        return { ...state, ...action.payload, loading: false };
      })
      .addCase(fetchDeviceInfo.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default deviceSlice.reducer;
// "use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { getDeviceId } from "../utils";
// import toast from "../utils/toast";
// import { AlertService } from "../alert";
import { useSelector } from "react-redux";
import { Alert } from "react-native";
// import toast from "react-hot-toast";
// import { v4 as uuidv4 } from "uuid";

export {
  apiUrl,
  request,
  upload,
  authApi,
  teamsApi,
  tournamentsApi,
  matchesApi,
  searchApi,
  configApi,
  userApi,
} from "../utils/api";
import requestDefault from "../utils/api";
export default requestDefault;

// --------------------------------------------
// GET Request Hook
// --------------------------------------------
export const useAxiosGet = (url = "", options = {}) => {
  const user = useSelector((state) => state.auth.user);

  const mutation = useMutation({
    mutationFn: async (queryParams = {}) => {
      const deviceId = await getDeviceId();

      const fullUrl = `${url}${
        Object.keys(queryParams).length
          ? `?${new URLSearchParams(queryParams).toString()}`
          : ""
      }`;

      try {
        const response = await axios.get(
          options.useBaseURL === false ? fullUrl : `${apiUrl}${fullUrl}`,
          {
            withCredentials: options.withCredentials ?? true,
            headers: {
              ...options.headers,
              device_id: deviceId,
              token: user?.token || user?.access_token,
              access_token: user?.access_token,
              session_id: user?.session_id,
              refresh_token: user?.refresh_token,
            },
          }
        );

        return response.data;
      } catch (error) {
        throw error;
      }
    },

    onSuccess: (data, variables, context) => {
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },

    onError: (error, variables, context) => {
      const status = error?.response?.status;
      let errorMessage =
        error?.response?.data?.reason ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";

      if (status === 413) {
        errorMessage = "One or more images are too large.";
      }

      if (options?.showAlert && errorMessage) {
        try {
        //   toast.error(errorMessage); // or Alert.alert if on mobile
        } catch (e) {
          console.error("Toast error fallback:", e);
          Alert.alert("Error", errorMessage);
        }
      }

      if (options?.onError) {
        options.onError(errorMessage);
      }
    },

    retry: options.retry || 0,
    retryDelay: options.retryDelay || 1000,
    ...options,
  });

  return {
    get: mutation.mutate, // manual trigger
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
};

// --------------------------------------------
// POST Request Hook
// --------------------------------------------
export const useAxiosPost = (url = "", options = {}) => {
  const user = useSelector((state) => state.auth.user);

  const mutation = useMutation({
    mutationFn: async (payload = {}) => {
      const deviceId = await getDeviceId();
      payload.source = "mobile";

      try {
        const response = await axios.post(`${apiUrl}${url}`, payload, {
          withCredentials: true,
          headers: {
            device_id: deviceId,
            token: user?.token || user?.access_token,
            access_token: user?.access_token,
            session_id: user?.session_id,
            refresh_token: user?.refresh_token,
            ...options.headers,
          },
        });

        return response.data;
      } catch (error) {
        // Always throw full error to access response later
        throw error;
      }
    },

    onSuccess: (data, variables, context) => {
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },

    onError: (error, variables, context) => {
      const status = error?.response?.status;
      let errorMessage =
        error?.response?.data?.reason ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";

      if (status === 413) {
        errorMessage = "One or more images are too large.";
      }

      if (options?.showAlert && errorMessage) {
        try {
        //   toast.error(errorMessage);
        } catch (e) {
          console.error("Toast error fallback:", e);
          if (!__DEV__) {
            Alert.alert("Error", errorMessage);
          }
        }
      }

      if (options?.onError) {
        options.onError(errorMessage);
      }
    },

    retry: options.retry || 3,
    retryDelay: options.retryDelay || 1000,
    ...options,
  });

  return {
    post: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
};

// --------------------------------------------
// PUT Request Hook
// --------------------------------------------
export const useAxiosPut = (url = "", options = {}) => {
  let errorMessage = "";
  const mutation = useMutation({
    mutationFn: async (payload) => {
      const deviceId = await getDeviceId();
      const response = await axios.put(`${url}`, payload, {
        withCredentials: true,
        headers: {
          ...options.headers,
          device_id: deviceId,
        },
      });
      return response.data;
    },
    onSuccess: options.onSuccess,
    onError: (error, variables, context) => {
      const errorMessage =
        error?.response?.data?.reason || error?.response?.data?.error?.message;
      if (options.showAlert && errorMessage) {
        // toast.error(errorMessage);
      }
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    retry: options.retry || 3,
    retryDelay: options.retryDelay || 1000,
    ...options,
  });

  return {
    put: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
};

// --------------------------------------------
// DELETE Request Hook
// --------------------------------------------
export const useAxiosDelete = (url = "", options = {}) => {
  const mutation = useMutation({
    mutationFn: async () => {
      const deviceId = await getDeviceId();
      const response = await axios.delete(`${url}`, {
        withCredentials: true,
        headers: {
          ...options.headers,
          device_id: deviceId,
        },
      });
      return response.data;
    },
    onSuccess: options.onSuccess,
    onError: (error, variables, context) => {
      const errorMessage =
        error?.response?.data?.reason || error?.response?.data?.error?.message;
      if (options.showAlert && errorMessage) {
        // toast.error(errorMessage);
      }
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    retry: options.retry || 3,
    retryDelay: options.retryDelay || 1000,
    ...options,
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
};
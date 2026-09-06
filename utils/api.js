import axios from "axios";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDeviceId } from "./index";
import { store } from "@/redux/store";
import User from "./User";

export const apiUrl = "https://devapi.criconic.com/";

const COOKIE_STORAGE_KEY = "@auth_cookie";
let sessionCookie = null;
let isCookieInitialized = false;

/**
 * Extracts cookie pairs (e.g. "connect.sid=...") from a Set-Cookie header.
 */
export const extractCookie = (setCookieHeader) => {
  if (!setCookieHeader) return null;
  const rawList = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  const cookies = [];
  for (const item of rawList) {
    if (typeof item === "string") {
      const parts = item.split(";");
      const cookiePair = parts[0]?.trim();
      if (cookiePair && cookiePair.includes("=")) {
        cookies.push(cookiePair);
      }
    }
  }
  return cookies.length > 0 ? cookies.join("; ") : null;
};

/**
 * Initializes the in-memory session cookie from AsyncStorage.
 */
export const initSessionCookie = async () => {
  try {
    const saved = await AsyncStorage.getItem(COOKIE_STORAGE_KEY);
    if (saved) {
      sessionCookie = saved;
      console.log("🍪 [API] Restored session cookie from AsyncStorage");
    }
  } catch (e) {
    console.warn("🍪 [API] Error loading cookie from storage:", e);
  } finally {
    isCookieInitialized = true;
  }
  return sessionCookie;
};

/**
 * Sets and persists session cookie.
 */
export const setSessionCookie = async (cookie) => {
  if (!cookie) return;
  sessionCookie = cookie;
  isCookieInitialized = true;
  try {
    await AsyncStorage.setItem(COOKIE_STORAGE_KEY, cookie);
    console.log("🍪 [API] Stored session cookie to AsyncStorage");
  } catch (e) {
    console.warn("🍪 [API] Error saving cookie to storage:", e);
  }
};

/**
 * Clears stored session cookie.
 */
export const clearSessionCookie = async () => {
  sessionCookie = null;
  try {
    await AsyncStorage.removeItem(COOKIE_STORAGE_KEY);
    console.log("🍪 [API] Cleared session cookie");
  } catch (e) {
    console.warn("🍪 [API] Error clearing cookie from storage:", e);
  }
};

export const getSessionCookie = () => sessionCookie;

/**
 * Universal request function matching sports-arena website Api.js
 */
export const request = async (
  endpoint = "/",
  {
    method = "GET",
    headers = {},
    data = {},
    withCredentials = true,
    errorAlert = false,
    params = null,
    ...otherParams
  } = {}
) => {
  try {
    if (!isCookieInitialized) {
      await initSessionCookie();
    }

    const deviceId = await getDeviceId();
    const state = store?.getState?.();
    const user = state?.auth?.user || User.user;

    const normalizedEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;

    const fullUrl = normalizedEndpoint.startsWith("http")
      ? normalizedEndpoint
      : `${apiUrl}${normalizedEndpoint}`;

    const requestHeaders = {
      "Content-Type": "application/json",
      device_id: deviceId,
      token: user?.token || user?.access_token,
      access_token: user?.access_token,
      session_id: user?.session_id,
      refresh_token: user?.refresh_token,
      ...headers,
    };

    // Attach session cookie if available
    if (sessionCookie) {
      requestHeaders["Cookie"] = sessionCookie;
    }

    const config = {
      url: fullUrl,
      method: method.toUpperCase(),
      headers: requestHeaders,
      withCredentials,
      ...otherParams,
    };

    if (params) {
      config.params = params;
    }

    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(config.method) &&
      data &&
      Object.keys(data).length > 0
    ) {
      config.data = data;
    }

    const response = await axios.request(config);

    // Capture and save any Set-Cookie headers returned by the server
    const setCookie =
      response?.headers?.["set-cookie"] || response?.headers?.["Set-Cookie"];
    if (setCookie) {
      const parsedCookie = extractCookie(setCookie);
      if (parsedCookie) {
        setSessionCookie(parsedCookie);
      }
    }

    return response;
  } catch (error) {
    let errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.reason;

    if (!errorMsg && error?.response?.data?.error) {
      if (Array.isArray(error.response.data.error)) {
        errorMsg =
          error.response.data.error[0]?.message ||
          error.response.data.error[0];
      } else if (typeof error.response.data.error === "string") {
        errorMsg = error.response.data.error;
      }
    }

    if (!errorMsg && typeof error?.response?.data === "string") {
      errorMsg = error.response.data;
    }

    if (!errorMsg) {
      errorMsg = error?.message || "Request failed";
    }

    console.warn(`[API] Error on ${endpoint}:`, errorMsg);

    if (errorAlert) {
      Alert.alert("Notice", String(errorMsg));
    }

    return error?.response || { data: { success: false, message: errorMsg } };
  }
};


/**
 * Multipart image/file upload matching website upload function
 */
export const upload = async (fileInput, folderName = "general") => {
  try {
    const formData = new FormData();
    const deviceId = await getDeviceId();

    if (typeof fileInput === "string") {
      const filename = fileInput.split("/").pop() || "upload.jpg";
      const match = /\\.(\\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      formData.append("image", {
        uri: fileInput,
        name: filename,
        type,
      });
    } else if (fileInput && fileInput.uri) {
      formData.append("image", {
        uri: fileInput.uri,
        name: fileInput.fileName || fileInput.name || "upload.jpg",
        type: fileInput.mimeType || fileInput.type || "image/jpeg",
      });
    } else {
      throw new Error("Invalid file format");
    }

    const headers = {
      "Content-Type": "multipart/form-data",
      device_id: deviceId,
      folder: folderName,
    };

    const res = await axios.post(`${apiUrl}upload`, formData, {
      headers,
      withCredentials: true,
    });

    return res?.data;
  } catch (error) {
    console.error("[Upload] Upload failed:", error);
    return null;
  }
};

// ============================================
// Grouped API Services matching sports-arena
// ============================================

export const authApi = {
  login: async (credentials) => {
    // 1. Submit login request (backend responds with Set-Cookie: connect.sid=...)
    const res = await request("api/users/login", {
      method: "POST",
      data: credentials,
    });

    if (res?.data?.success || res?.status === 200) {
      console.log(
        "🔐 [authApi.login] Login credentials verified, fetching profile from api/auth/status..."
      );
      // 2. Fetch authenticated user profile using the established session cookie
      const statusRes = await request("api/auth/status", {
        method: "GET",
        errorAlert: false,
      });

      const userProfile = statusRes?.data?.user;
      if (userProfile && (userProfile._id || userProfile.id)) {
        console.log(
          "🔐 [authApi.login] Profile loaded successfully:",
          userProfile._id,
          userProfile.username
        );
        User.login(userProfile);
        return {
          ...res,
          data: {
            ...res.data,
            success: true,
            user: userProfile,
          },
        };
      } else {
        console.warn(
          "🔐 [authApi.login] api/auth/status did not return full user object:",
          statusRes?.data
        );
      }
    }
    return res;
  },
  register: (data) =>
    request("api/users/register", { method: "POST", data }),
  logout: async () => {
    try {
      await request("api/logout", { method: "POST", errorAlert: false });
    } finally {
      User.logout();
      await clearSessionCookie();
    }
  },
  checkStatus: async () => {
    const res = await request("api/auth/status", {
      method: "GET",
      errorAlert: false,
    });
    if (res?.data?.success && res?.data?.user) {
      User.login(res.data.user);
    }
    return res;
  },
  changePassword: (data) =>
    request("api/users/change-password", { method: "POST", data }),
  forgotPassword: (data) =>
    request("api/users/forgotPassword", { method: "POST", data }),
  generateOtp: (data) =>
    request("api/otpVerification/generateOTP", { method: "POST", data }),
  validateOtp: (data) =>
    request("api/otpVerification/validateOtp", { method: "POST", data }),
};


export const teamsApi = {
  getMyTeams: (options = {}) =>
    request("api/teams?self=1", { method: "GET", errorAlert: false, ...options }),
  getOpponentTeams: (options = {}) =>
    request("api/teams/getOpponentTeam", { method: "GET", errorAlert: false, ...options }),
  getAllTeams: (options = {}) =>
    request("api/teams", { method: "GET", errorAlert: false, ...options }),
  getTeamById: (id, options = {}) =>
    request(`api/teams/${id}`, { method: "GET", errorAlert: false, ...options }),
  createTeam: (data, options = {}) =>
    request("api/teams", { method: "POST", data, ...options }),
  updateTeam: (id, data, options = {}) =>
    request(`api/teams/${id}`, { method: "PUT", data, ...options }),
  addPlayerToTeam: (teamId, data, options = {}) =>
    request(`api/teams/addPlayer/${teamId}`, { method: "PUT", data, ...options }),
  getTeamPlayers: (teamId, options = {}) =>
    request(`api/teams/${teamId}/players`, { method: "GET", errorAlert: false, ...options }),
};

export const tournamentsApi = {
  getAllTournaments: (options = {}) =>
    request("api/tournaments", { method: "GET", errorAlert: false, ...options }),
  getMyTournaments: (options = {}) =>
    request("api/tournaments?self=1", { method: "GET", errorAlert: false, ...options }),
  getTournamentById: (id, options = {}) =>
    request(`api/tournaments/${id}`, { method: "GET", errorAlert: false, ...options }),
  createTournament: (data, options = {}) =>
    request("api/tournaments/create", { method: "POST", data, ...options }),
  updateTournament: (id, data, options = {}) =>
    request(`api/tournaments/${id}`, { method: "PUT", data, ...options }),
  getPointsTable: (id, options = {}) =>
    request(`api/tournaments/getPointsTable/${id}`, { method: "GET", errorAlert: false, ...options }),
  getMatchesByTournament: (id, options = {}) =>
    request(`api/matches/tournament/${id}`, { method: "GET", errorAlert: false, ...options }),
};

export const matchesApi = {
  getMatches: (params = {}, options = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`api/matches${query ? `?${query}` : ""}`, {
      method: "GET",
      errorAlert: false,
      ...options,
    });
  },
  getMatchById: (id, options = {}) => {
    const params = { private: 1, ...(options?.params || {}) };
    return request(`api/matches/${id}`, {
      method: "GET",
      errorAlert: false,
      ...options,
      params,
    });
  },
  // Returns the formatted live score object (batting, batsman, bowler, currentOver, etc.)
  // This calls POST api/matches/:id which runs the matchScore() function in the backend.
  getMatchScore: (id) =>
    request(`api/matches/${id}`, { method: "POST", errorAlert: false }),
  createMatch: (data) => request("api/matches", { method: "POST", data }),
  updateMatch: (id, data) =>
    request(`api/matches/${id}`, { method: "PUT", data }),
  toss: (matchId, data) =>
    request(`api/matches/${matchId}/toss`, { method: "POST", data }),
  selectOpener: (data) =>
    request("api/matches/select/opener", { method: "POST", data }),
  updateScore: (matchId, data) => {
    const id = matchId || data?.matchId;
    return request(`api/matches/${id}/score`, {
      method: "PUT",
      data,
      errorAlert: false,
    });
  },
  getCommentary: (matchId, page = 1, limit = 20) =>
    request(`api/commentary?matchId=${matchId}&page=${page}&limit=${limit}`, {
      method: "GET",
    }),
  getMatchSettings: (matchId) =>
    request(`api/matches/${matchId}/settings`, { method: "GET" }),
  updateMatchSettings: (matchId, data) =>
    request(`api/matches/${matchId}/settings`, { method: "POST", data }),
  goLive: (data) =>
    request("api/matches/public/go-live", { method: "POST", data }),
};


export const searchApi = {
  search: (query, forType = null) => {
    const typeParam = forType ? `&for=${encodeURIComponent(forType)}` : "";
    return request(`api/search?q=${encodeURIComponent(query)}${typeParam}`, {
      method: "GET",
    });
  },
};

export const configApi = {
  getHomeConfig: () => request("api/configs", { method: "GET" }),
};

export const userApi = {
  getProfile: (userId) =>
    request(`api/users/${userId}`, { method: "GET" }),
  updateProfile: (userId, data) =>
    request(`api/users/${userId}`, { method: "PUT", data }),
  searchLocation: (keyword) =>
    request(`api/users/searchLocation?searchKeyWord=${encodeURIComponent(keyword)}`, {
      method: "GET",
      errorAlert: false,
    }),
};

export default request;

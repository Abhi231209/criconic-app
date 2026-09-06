/**
 * Global Application Configuration
 *
 * Single source of truth for base URLs and environment configuration.
 * To change the backend API environment, modify DEFAULT_API_URL below
 * or set EXPO_PUBLIC_API_URL in your .env file.
 */

// Primary API Base URL - Change this single value to switch environments:
export const DEFAULT_API_URL = "https://devapi.criconic.com";

// Resolve API base URL (supports EXPO_PUBLIC_API_URL from Expo environment if provided)
const envApiUrl =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
  DEFAULT_API_URL;

// Base API URL with trailing slash (e.g. "https://devapi.criconic.com/")
export const BASE_URL = envApiUrl.endsWith("/") ? envApiUrl : `${envApiUrl}/`;

// Base API URL without trailing slash (e.g. "https://devapi.criconic.com")
export const API_URL = envApiUrl.replace(/\/+$/, "");

// Alias for backwards compatibility with existing apiUrl usages
export const apiUrl = BASE_URL;

// Socket.IO Server URL (derives automatically from API_URL)
export const SOCKET_URL = API_URL;

// Public Web Application URL (for sharing live matches, go-live links)
export const DEFAULT_WEB_URL = "https://criconic.com";
const envWebUrl =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_WEB_URL) ||
  DEFAULT_WEB_URL;
export const WEB_URL = envWebUrl.replace(/\/+$/, "");

// Image Base URL (derives automatically from BASE_URL)
export const IMAGE_BASE_URL = BASE_URL;

const config = {
  BASE_URL,
  API_URL,
  apiUrl,
  SOCKET_URL,
  WEB_URL,
  IMAGE_BASE_URL,
};

export default config;

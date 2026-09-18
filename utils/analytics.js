import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Crypto from "expo-crypto";
import { GA_MEASUREMENT_ID, GA_API_SECRET, GA_DEBUG_MODE } from "@/config";

const CLIENT_ID_STORAGE_KEY = "@ga_client_id";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes session expiry

class GoogleAnalyticsClient {
  constructor() {
    this.clientId = null;
    this.userId = null;
    this.sessionId = null;
    this.lastEventTime = 0;
    this.isInitialized = false;
    this.eventQueue = [];
    this.isSending = false;
    this.deviceInfo = {
      platform: Platform.OS,
      os_version: String(Device.osVersion || Platform.Version || "unknown"),
      device_model: String(Device.modelName || Device.deviceName || "mobile"),
      app_name: "criconic-mobile",
      app_version: "1.0.0",
    };
  }

  /**
   * Initializes the analytics client, generating or restoring persistent client_id.
   */
  async init() {
    if (this.isInitialized) return;
    try {
      let storedId = await AsyncStorage.getItem(CLIENT_ID_STORAGE_KEY);
      if (!storedId) {
        // Generate UUIDv4
        if (Crypto.randomUUID) {
          storedId = Crypto.randomUUID();
        } else {
          storedId = "xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        }
        await AsyncStorage.setItem(CLIENT_ID_STORAGE_KEY, storedId);
      }
      this.clientId = storedId;
      this.refreshSession();
      this.isInitialized = true;

      if (GA_DEBUG_MODE) {
        console.log("📊 [GA4 Mobile] Initialized. Client ID:", this.clientId);
      }

      // Flush any queued events
      if (this.eventQueue.length > 0) {
        const queued = [...this.eventQueue];
        this.eventQueue = [];
        for (const ev of queued) {
          await this.logEvent(ev.name, ev.params);
        }
      }
    } catch (err) {
      console.warn("📊 [GA4 Mobile] Init error:", err);
      // Fallback in-memory ID if storage fails
      this.clientId = this.clientId || `client_${Date.now()}`;
      this.refreshSession();
      this.isInitialized = true;
    }
  }

  /**
   * Refreshes or creates the session ID.
   */
  refreshSession() {
    const now = Date.now();
    if (!this.sessionId || now - this.lastEventTime > SESSION_TIMEOUT_MS) {
      this.sessionId = String(now);
      if (GA_DEBUG_MODE) {
        console.log("📊 [GA4 Mobile] New Session Started:", this.sessionId);
      }
    }
    this.lastEventTime = now;
    return this.sessionId;
  }

  /**
   * Sets the logged-in user ID.
   */
  setUserId(userId) {
    if (!userId) {
      this.userId = null;
      return;
    }
    this.userId = String(userId);
    if (GA_DEBUG_MODE) {
      console.log("📊 [GA4 Mobile] User ID Set:", this.userId);
    }
  }

  /**
   * Clears the user ID on sign out.
   */
  clearUserId() {
    this.userId = null;
    if (GA_DEBUG_MODE) {
      console.log("📊 [GA4 Mobile] User ID Cleared");
    }
  }

  /**
   * Core method to log any GA4 event via Measurement Protocol.
   */
  async logEvent(eventName, params = {}) {
    if (!this.isInitialized) {
      this.eventQueue.push({ name: eventName, params });
      this.init();
      return;
    }

    if (!GA_MEASUREMENT_ID) {
      if (GA_DEBUG_MODE) {
        console.log(`📊 [GA4 Mobile Skipped - No Measurement ID] ${eventName}:`, params);
      }
      return;
    }

    try {
      this.refreshSession();

      const sanitizedParams = {
        ...this.deviceInfo,
        session_id: this.sessionId,
        engagement_time_msec: 100,
        ...params,
      };

      // Clean undefined and null values
      Object.keys(sanitizedParams).forEach((key) => {
        if (sanitizedParams[key] === undefined || sanitizedParams[key] === null) {
          delete sanitizedParams[key];
        } else if (typeof sanitizedParams[key] === "object") {
          sanitizedParams[key] = JSON.stringify(sanitizedParams[key]);
        }
      });

      const payload = {
        client_id: this.clientId,
        user_id: this.userId || undefined,
        events: [
          {
            name: eventName,
            params: sanitizedParams,
          },
        ],
      };

      if (GA_DEBUG_MODE) {
        console.log(`📊 [GA4 Mobile] Track [${eventName}]:`, sanitizedParams);
      }

      let url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}`;
      if (GA_API_SECRET) {
        url += `&api_secret=${GA_API_SECRET}`;
      }

      // Fire and forget - don't block user experience
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch((err) => {
        if (GA_DEBUG_MODE) {
          console.warn("📊 [GA4 Mobile] Dispatch error:", err?.message || err);
        }
      });
    } catch (err) {
      if (GA_DEBUG_MODE) {
        console.warn("📊 [GA4 Mobile] LogEvent error:", err);
      }
    }
  }

  /**
   * Automatically track screen changes
   */
  async logScreenView(screenName, screenClass = "", params = {}) {
    if (!screenName) return;
    return this.logEvent("screen_view", {
      screen_name: screenName,
      screen_class: screenClass || screenName,
      ...params,
    });
  }

  /**
   * Authentication event helpers
   */
  logLogin(method = "password", userId = null) {
    if (userId) this.setUserId(userId);
    return this.logEvent("login", { method });
  }

  logSignUp(method = "phone_otp", userId = null) {
    if (userId) this.setUserId(userId);
    return this.logEvent("sign_up", { method });
  }

  logLogout() {
    this.clearUserId();
    return this.logEvent("user_logout");
  }

  /**
   * Navigation and tab helpers
   */
  logTabChange(tabName, source = "footer") {
    return this.logEvent("tab_click", {
      tab_name: tabName,
      source,
    });
  }

  logDrawerNavigation(destination) {
    return this.logEvent("drawer_click", {
      destination,
    });
  }

  /**
   * General user action helper
   */
  logAction(actionName, category = "general", details = {}) {
    return this.logEvent("app_action", {
      action: actionName,
      category,
      ...details,
    });
  }

  /**
   * Search helper
   */
  logSearch(searchTerm) {
    return this.logEvent("search", {
      search_term: searchTerm,
    });
  }

  /**
   * Scoring & Match helpers
   */
  logScorerAction(actionType, matchId, ballDetails = {}) {
    return this.logEvent("scorer_action", {
      action_type: actionType,
      match_id: matchId,
      ...ballDetails,
    });
  }

  /**
   * Visualizer helpers (Wagon Wheel, Pitch Map, FOW delivery)
   */
  logVisualizerView(type, playerId = "", matchId = "", details = {}) {
    return this.logEvent("visualizer_view", {
      visualizer_type: type, // "wagon_wheel", "pitch_map", "fow_delivery"
      player_id: playerId,
      match_id: matchId,
      ...details,
    });
  }
}

const analytics = new GoogleAnalyticsClient();
analytics.init();

export default analytics;

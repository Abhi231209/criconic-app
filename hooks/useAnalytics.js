import { useCallback } from "react";
import analytics from "@/utils/analytics";

/**
 * Custom hook providing access to Google Analytics 4 (GA4) tracking methods.
 */
export default function useAnalytics() {
  const trackScreen = useCallback((screenName, screenClass = "", params = {}) => {
    analytics.logScreenView(screenName, screenClass, params);
  }, []);

  const trackEvent = useCallback((eventName, params = {}) => {
    analytics.logEvent(eventName, params);
  }, []);

  const trackAction = useCallback((actionName, category = "user_interaction", details = {}) => {
    analytics.logAction(actionName, category, details);
  }, []);

  const trackTabChange = useCallback((tabName, source = "footer") => {
    analytics.logTabChange(tabName, source);
  }, []);

  const trackDrawerNavigation = useCallback((destination) => {
    analytics.logDrawerNavigation(destination);
  }, []);

  const trackSearch = useCallback((searchTerm) => {
    analytics.logSearch(searchTerm);
  }, []);

  const trackScorerAction = useCallback((actionType, matchId, ballDetails = {}) => {
    analytics.logScorerAction(actionType, matchId, ballDetails);
  }, []);

  const trackVisualizer = useCallback((type, playerId = "", matchId = "", details = {}) => {
    analytics.logVisualizerView(type, playerId, matchId, details);
  }, []);

  const setUserId = useCallback((userId) => {
    analytics.setUserId(userId);
  }, []);

  const clearUserId = useCallback(() => {
    analytics.clearUserId();
  }, []);

  return {
    trackScreen,
    trackEvent,
    trackAction,
    trackTabChange,
    trackDrawerNavigation,
    trackSearch,
    trackScorerAction,
    trackVisualizer,
    setUserId,
    clearUserId,
    analytics,
  };
}

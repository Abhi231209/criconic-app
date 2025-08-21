import { useState, useEffect, useCallback, useRef } from "react";
import { useAxiosGet } from "./useApi";
import axios from "axios";

function useMatches({
  playerId,
  teamId,
  initialCondition = { items: 10, page: 1 },
  enableScroll = false, // New prop to enable/disable API calls on scroll
} = {}) {
  const [matchesIds, setMatchesIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(true);
  const [error, setError] = useState(null);
  const [condition, setCondition] = useState(initialCondition);
  const cache = useRef({});

  // Helper to build API URL
const SERVER_BASE_URL = "https://devapi.criconic.com/";
  
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams({
      page: condition.page || 1,
      items: condition.items,
    });
    if (playerId) params.append("playerId", playerId);
    if (teamId) params.append("teamId", teamId);
    return `api/matches/ids?${params.toString()}`;
  }, [condition, playerId, teamId]);

  // Fetch matches
  const fetchMatchIds = useCallback(async () => {
    const apiUrl = buildApiUrl();

    if (!hasData || cache.current[apiUrl]) return; // Prevent redundant calls or requests if data already loaded

    setLoading(true);
    setError(null);

    try {
      const config = {
      url: SERVER_BASE_URL+ apiUrl ,
      method : "GET",
      headers : {
        "Content-Type": "application/json",
      },
    };
        
      const res = await axios.request(config);
      console.log("inside res ",res)
      

      const data = await res.data;
      console.log("this is data ",res)
      const content = data?.content || [];

      // Cache results and update state
      cache.current[apiUrl] = content;
      setMatchesIds((prev) => [...prev, ...content]);

      if (content.length < condition.items) {
        setHasData(false); // No more data available
      } else {
        setCondition((prev) => ({ ...prev, page: prev.page + 1 }));
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
      setError("Failed to load matches. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, condition, hasData]);

  // Effect to fetch matches on initialization
  useEffect(() => {
    if (!enableScroll) {
      fetchMatchIds();
    }
  }, [fetchMatchIds, enableScroll]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      enableScroll &&
      window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200
    ) {
      fetchMatchIds();
    }
  }, [fetchMatchIds, enableScroll]);

  useEffect(() => {
    if (enableScroll) {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll, enableScroll]);

  return {
    matchesIds,
    loading,
    hasData,
    error,
    setMatchesIds,
    fetchMore: fetchMatchIds,
  };
}

export default useMatches;

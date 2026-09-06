import { useState, useEffect, useCallback, useRef } from "react";
import { request } from "@/utils/api";

function useMatches({
  playerId,
  teamId,
  initialCondition = { items: 10, page: 1 },
  enableScroll = false,
} = {}) {
  const itemsPerPage = initialCondition?.items || 10;
  const [matchesIds, setMatchesIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(true);
  const [error, setError] = useState(null);
  const pageRef = useRef(initialCondition?.page || 1);
  const isFetchingRef = useRef(false);
  const cache = useRef({});

  const fetchPage = useCallback(
    async (pageToFetch, isRefresh = false) => {
      if (isFetchingRef.current) return;
      if (!isRefresh && !hasData) return;

      const params = new URLSearchParams({
        page: pageToFetch,
        items: itemsPerPage,
      });
      if (playerId) params.append("playerId", playerId);
      if (teamId) params.append("teamId", teamId);
      const apiUrl = `api/matches/ids?${params.toString()}`;

      if (!isRefresh && cache.current[apiUrl]) {
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const res = await request(apiUrl, { method: "GET", errorAlert: false });
        const content = res?.data?.content || [];

        cache.current[apiUrl] = content;
        if (isRefresh) {
          setMatchesIds(content);
        } else {
          setMatchesIds((prev) => {
            // Deduplicate incoming IDs
            const existing = new Set(
              prev.map((item) => String(item?._id || item?.id || item))
            );
            const filtered = content.filter(
              (item) => !existing.has(String(item?._id || item?.id || item))
            );
            return [...prev, ...filtered];
          });
        }

        if (content.length < itemsPerPage) {
          setHasData(false);
        } else {
          pageRef.current = pageToFetch + 1;
        }
      } catch (err) {
        console.warn("[useMatches] Error fetching matches:", err);
        setError("Failed to load matches. Please try again.");
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [playerId, teamId, itemsPerPage, hasData]
  );

  // Initial fetch on mount or when filter params change
  useEffect(() => {
    pageRef.current = 1;
    cache.current = {};
    setHasData(true);
    fetchPage(1, true);
  }, [playerId, teamId, itemsPerPage]);

  const fetchMore = useCallback(() => {
    if (!isFetchingRef.current && hasData) {
      fetchPage(pageRef.current, false);
    }
  }, [fetchPage, hasData]);

  const handleScroll = useCallback(() => {
    if (
      enableScroll &&
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200
    ) {
      fetchMore();
    }
  }, [fetchMore, enableScroll]);

  useEffect(() => {
    if (enableScroll && typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll, enableScroll]);

  const refresh = useCallback(async () => {
    pageRef.current = 1;
    cache.current = {};
    setHasData(true);
    await fetchPage(1, true);
  }, [fetchPage]);

  return {
    matchesIds,
    loading,
    hasData,
    error,
    setMatchesIds,
    fetchMore,
    refresh,
  };
}

export default useMatches;

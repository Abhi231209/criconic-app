import { useState, useEffect, useCallback, useRef } from "react";
import { DeviceEventEmitter } from "react-native";
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
          setMatchesIds((prev) => {
            if (prev.length === content.length) {
              const same = prev.every((p, i) => {
                const id1 = String(p?._id || p?.id || p);
                const id2 = String(content[i]?._id || content[i]?.id || content[i]);
                return id1 === id2;
              });
              if (same) return prev;
            }
            return content;
          });
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

  // Immediately prune deleted match from matchesIds and invalidate cache
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "MATCH_DELETED",
      ({ matchId: delId }) => {
        if (!delId) return;
        const strDelId = String(delId);
        cache.current = {};
        setMatchesIds((prev) =>
          prev.filter((item) => {
            const id = String(item?._id || item?.id || item?.matchId || item);
            return id !== strDelId;
          })
        );
      }
    );
    return () => sub.remove();
  }, []);

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

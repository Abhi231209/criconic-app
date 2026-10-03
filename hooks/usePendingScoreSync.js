import { useEffect } from "react";
import { AppState, DeviceEventEmitter } from "react-native";
import { useSocket } from "@/contexts/SocketContext";
import { showGlobalAlert } from "@/contexts/AlertContext";
import { matchesApi } from "@/utils/api";
import {
  listPendingMatches,
  flushQueue,
  isScorerOpen,
  loadSnapshot,
  saveSnapshot,
  pruneSnapshots,
} from "@/utils/offlineActionQueue";

const RETRY_EVERY_MS = 30000;

// Only one pass at a time, however many times the effect below re-runs.
let syncing = false;

/**
 * Sends scoring actions that were recorded offline as soon as the app has a
 * connection again — wherever the user is in the app, so a match scored
 * without internet syncs when the app is next opened online, without having
 * to reopen its scorer screen. (An open scorer screen sends its own queue.)
 *
 * Emits "OFFLINE_SCORES_SYNCED" ({ matchId, sent }) after a match's queue
 * has been sent.
 */
export default function usePendingScoreSync() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    pruneSnapshots();
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const emitWithAck = (event, payload, timeoutMs) =>
      new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({ success: false, timedOut: true });
        }, timeoutMs);
        socket.emit(event, payload, (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(response || { success: true });
        });
      });

    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const pending = await listPendingMatches();
        for (const { matchId } of pending) {
          if (!socket.connected) break;
          if (isScorerOpen(matchId)) continue;

          const result = await flushQueue(matchId, {
            emitWithAck,
            isConnected: () => socket.connected,
          });
          if (result.skipped) continue;

          if (result.sent) {
            // The saved score is now behind the server; refresh it so the
            // scorer doesn't reopen on a stale one if it's offline again.
            const [scoreRes, snapshot] = await Promise.all([
              matchesApi.getMatchScore(matchId),
              loadSnapshot(matchId),
            ]);
            const fresh = scoreRes?.data;
            if (fresh && fresh.success !== false && (fresh.batting || fresh.batsman)) {
              await saveSnapshot(matchId, { score: fresh, matchDetails: snapshot?.matchDetails });
            }
            DeviceEventEmitter.emit("OFFLINE_SCORES_SYNCED", { matchId, sent: result.sent });
          }

          if (result.rejected.length) {
            const count = result.rejected.length;
            showGlobalAlert({
              title: "Some offline actions were skipped",
              message: `${count} scoring action${count > 1 ? "s" : ""} recorded while offline ${
                count > 1 ? "were" : "was"
              } rejected by the server${
                result.rejected[0]?.message ? ` (${result.rejected[0].message})` : ""
              }. Please open the match and check the scorecard.`,
              type: "warning",
              confirmText: "OK",
            });
          } else if (result.sent && !result.remaining) {
            showGlobalAlert({
              title: "Offline scoring synced",
              message: `${result.sent} scoring action${result.sent > 1 ? "s" : ""} recorded while offline ${
                result.sent > 1 ? "have" : "has"
              } been uploaded.`,
              confirmText: "OK",
            });
          }

          // Not logged in, or the connection isn't carrying requests: the
          // other matches would fail the same way.
          if (result.stoppedBy === "loggedOut" || result.stoppedBy === "timeout") break;
        }
      } catch (e) {
        console.warn("[usePendingScoreSync] Sync failed:", e);
      } finally {
        syncing = false;
      }
    };

    sync();
    const timer = setInterval(sync, RETRY_EVERY_MS);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => {
      clearInterval(timer);
      appState.remove();
    };
  }, [socket, isConnected]);
}

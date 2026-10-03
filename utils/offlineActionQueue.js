import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Persistent, per-match queue of scoring actions that haven't been confirmed
 * by the server yet. Socket.IO already buffers emitted events in memory and
 * flushes them on reconnect, but that buffer is lost the moment the app is
 * killed while offline — this queue survives that by writing every pending
 * action to disk immediately, before it's known to have been delivered.
 *
 * Next to the queue sits a snapshot of the last score the server sent for the
 * match. Replaying the queue over it (utils/offlineScoreEngine.js) gives the
 * score to show while offline, including after the app is reopened.
 */

const QUEUE_PREFIX = "@criconic_pending_actions_";
const SNAPSHOT_PREFIX = "@criconic_scorer_snapshot_";

const queueKey = (matchId) => `${QUEUE_PREFIX}${matchId}`;
const snapshotKey = (matchId) => `${SNAPSHOT_PREFIX}${matchId}`;

export const generateActionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export async function loadQueue(matchId) {
  if (!matchId) return [];
  try {
    const raw = await AsyncStorage.getItem(queueKey(matchId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to load queue:", e);
    return [];
  }
}

async function saveQueue(matchId, queue) {
  try {
    if (queue.length) {
      await AsyncStorage.setItem(queueKey(matchId), JSON.stringify(queue));
    } else {
      await AsyncStorage.removeItem(queueKey(matchId));
    }
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to save queue:", e);
  }
}

// Every change to a queue is load → modify → save. Two of them overlapping
// (a new ball being queued while a sent one is removed) would drop one of the
// changes, so changes to the same match's queue run one after another.
const queueLocks = new Map();
function withQueueLock(matchId, fn) {
  const key = String(matchId);
  const run = (queueLocks.get(key) || Promise.resolve()).then(fn, fn);
  const tail = run.catch(() => {});
  queueLocks.set(key, tail);
  tail.then(() => {
    if (queueLocks.get(key) === tail) queueLocks.delete(key);
  });
  return run;
}

// Screens keeping a copy of a queue (the scorer) are told about every change,
// whoever made it: listener(matchId, queue).
const queueListeners = new Set();
export function subscribeQueue(listener) {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

/** Loads the queue, applies `change(queue)` and saves the result. Returns the new queue. */
export function updateQueue(matchId, change) {
  if (!matchId) return Promise.resolve([]);
  return withQueueLock(matchId, async () => {
    const queue = await loadQueue(matchId);
    const next = change(queue) || queue;
    if (next !== queue) {
      await saveQueue(matchId, next);
      queueListeners.forEach((listener) => listener(String(matchId), next));
    }
    return next;
  });
}

/** Appends an action to the persisted queue. Returns the new queue. */
export const enqueueAction = (matchId, item) =>
  updateQueue(matchId, (queue) => [...queue, { createdAt: Date.now(), ...item }]);

/** Removes a confirmed action from the persisted queue. Returns the new queue. */
export const removeAction = (matchId, actionId) =>
  updateQueue(matchId, (queue) => queue.filter((item) => item.actionId !== actionId));

/** Changes fields of one queued action. Returns the new queue. */
export const patchAction = (matchId, actionId, patch) =>
  updateQueue(matchId, (queue) =>
    queue.map((item) => (item.actionId === actionId ? { ...item, ...patch } : item))
  );

export async function clearQueue(matchId) {
  if (!matchId) return;
  await updateQueue(matchId, () => []);
}

// How long the server remembers applied action ids (see
// server/models/ProcessedScoreAction.js). Within that window a replayed
// action is recognised and skipped, so the queue never has to guess what the
// server already has.
export const SERVER_DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Drops queued actions older than the server's de-duplication window: past
 * that point the server no longer recognises them, so replaying one could
 * score it twice. Ages are measured on this phone's own clock only — the old
 * approach compared against the server's clock, and a phone running behind
 * silently discarded balls that had never been sent.
 */
export function purgeExpiredActions(matchId, maxAgeMs = SERVER_DEDUPE_WINDOW_MS) {
  return updateQueue(matchId, (queue) => {
    const oldestAllowed = Date.now() - maxAgeMs;
    const filtered = queue.filter((item) => {
      const itemTs = item.createdAt || parseInt(item.actionId?.split("-")?.[0], 10);
      return !itemTs || isNaN(itemTs) || itemTs >= oldestAllowed;
    });
    if (filtered.length === queue.length) return queue;
    console.log(
      `[offlineActionQueue] Dropped ${queue.length - filtered.length} expired actions for match ${matchId}`
    );
    return filtered;
  });
}

/**
 * Whether an action should stay queued and be retried later: it never reached
 * the server (timeout/offline), the socket wasn't logged in yet (401), or the
 * match was busy (503). Any other refusal is final — retrying it would only
 * block every action queued behind it.
 */
export const isRetryableAck = (response) =>
  !response ||
  response.timedOut ||
  response.status === 503 ||
  (response.status === 401 && !isNotAllowedToScore(response));

/** The socket has no logged-in user: reconnecting with the current token can fix it. */
export const isLoggedOutAck = (response) =>
  response?.status === 401 && !isNotAllowedToScore(response);

// The server answers 401 both for "no logged-in user on this socket" (worth
// retrying once logged in) and "you aren't a scorer of this match" (final).
const isNotAllowedToScore = (response) =>
  /not authorized to score/i.test(String(response?.message || ""));

// ─── Score snapshot ──────────────────────────────────────────────────────────

// Large, and not needed to keep scoring.
const SNAPSHOT_OMIT = ["fullCommentary", "commentary", "ads"];

export async function saveSnapshot(matchId, { score, matchDetails }) {
  if (!matchId || !score) return;
  try {
    const slimScore = { ...score };
    SNAPSHOT_OMIT.forEach((field) => delete slimScore[field]);
    await AsyncStorage.setItem(
      snapshotKey(matchId),
      JSON.stringify({ score: slimScore, matchDetails: matchDetails || null, savedAt: Date.now() })
    );
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to save score snapshot:", e);
  }
}

export async function loadSnapshot(matchId) {
  if (!matchId) return null;
  try {
    const raw = await AsyncStorage.getItem(snapshotKey(matchId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.score ? parsed : null;
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to load score snapshot:", e);
    return null;
  }
}

export async function clearSnapshot(matchId) {
  if (!matchId) return;
  try {
    await AsyncStorage.removeItem(snapshotKey(matchId));
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to clear score snapshot:", e);
  }
}

const matchIdsWithPrefix = async (prefix) => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to list stored matches:", e);
    return [];
  }
};

/** Matches with actions still waiting to be sent: [{ matchId, count }]. */
export async function listPendingMatches() {
  const matchIds = await matchIdsWithPrefix(QUEUE_PREFIX);
  const counts = await Promise.all(
    matchIds.map(async (matchId) => ({ matchId, count: (await loadQueue(matchId)).length }))
  );
  return counts.filter((entry) => entry.count > 0);
}

/** Ids of matches this phone has scored (it holds their last score). */
export const listScoredMatchIds = () => matchIdsWithPrefix(SNAPSHOT_PREFIX);

/**
 * Deletes the saved scores of all but the most recently scored matches, so
 * they don't fill the app's storage. A match with actions still queued keeps
 * its score however old it is.
 */
export async function pruneSnapshots(keep = 10) {
  try {
    const [matchIds, pending] = await Promise.all([listScoredMatchIds(), listPendingMatches()]);
    if (matchIds.length <= keep) return;
    const hasPending = new Set(pending.map((entry) => entry.matchId));
    const saved = await Promise.all(
      matchIds.map(async (matchId) => ({ matchId, savedAt: (await loadSnapshot(matchId))?.savedAt || 0 }))
    );
    const stale = saved
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(keep)
      .filter((entry) => !hasPending.has(entry.matchId));
    if (stale.length) await AsyncStorage.multiRemove(stale.map((entry) => snapshotKey(entry.matchId)));
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to prune saved scores:", e);
  }
}

// Matches whose scorer screen is open. It sends its own queue (and has to
// refresh its score afterwards), so the app-wide sync leaves those alone.
const openScorers = new Map();
export function markScorerOpen(matchId) {
  const key = String(matchId);
  openScorers.set(key, (openScorers.get(key) || 0) + 1);
  return () => {
    const left = (openScorers.get(key) || 1) - 1;
    if (left > 0) openScorers.set(key, left);
    else openScorers.delete(key);
  };
}
export const isScorerOpen = (matchId) => openScorers.has(String(matchId));

// ─── Sending the queue ───────────────────────────────────────────────────────

const ACK_TIMEOUT_MS = 8000;
const flushingMatches = new Set();

export const isFlushing = (matchId) => flushingMatches.has(String(matchId));

/**
 * Sends a match's queued actions to the server in order, one at a time,
 * waiting for each to be confirmed before sending the next. Only one flush
 * runs per match at a time, whoever starts it (the scorer screen or the
 * app-wide sync); a second call returns `{ skipped: true }`.
 *
 * `emitWithAck(event, payload, timeoutMs)` resolves with the server's ack, or
 * `{ timedOut: true }`.
 *
 * Stops at the first action that can't be delivered right now and reports why
 * in `stoppedBy`: "offline", "timeout", "loggedOut" or "busy".
 */
export async function flushQueue(matchId, { emitWithAck, isConnected, onSent } = {}) {
  const key = String(matchId || "");
  if (!key || flushingMatches.has(key)) return { skipped: true };
  flushingMatches.add(key);

  const result = { sent: 0, rejected: [], remaining: 0, stoppedBy: null };
  try {
    // Always the action at the head of the queue, re-read each time: actions
    // queued while this runs are picked up in the same pass.
    for (;;) {
      const [item] = await loadQueue(matchId);
      if (!item) break;
      if (isConnected && !isConnected()) {
        result.stoppedBy = "offline";
        break;
      }
      // From here on the server may have it, even if we never hear back
      // (the app can be closed mid-send) — recorded before sending so an
      // undo knows it can't simply drop the action.
      if (!item.attempted) await patchAction(matchId, item.actionId, { attempted: true });
      const response = await emitWithAck(
        "update-score",
        {
          userId: item.userId,
          matchId,
          action: item.action,
          data: item.data,
          actionId: item.actionId,
        },
        ACK_TIMEOUT_MS
      );

      if (response?.success) {
        await removeAction(matchId, item.actionId);
        result.sent++;
        await onSent?.(item);
      } else if (isRetryableAck(response)) {
        // Didn't get through (or can't yet) — keep it and everything after
        // it, in order, for the next flush.
        if (!response || response.timedOut) {
          result.stoppedBy = "timeout";
        } else {
          // The server answered without applying it.
          result.stoppedBy = isLoggedOutAck(response) ? "loggedOut" : "busy";
          if (!item.attempted) await patchAction(matchId, item.actionId, { attempted: false });
        }
        break;
      } else {
        // The server refused it for good; drop it so it doesn't block the
        // rest of the queue.
        console.warn("[offlineActionQueue] Server rejected queued action:", item.action, response?.message);
        await removeAction(matchId, item.actionId);
        result.rejected.push({ action: item.action, message: response?.message });
      }
    }
  } catch (e) {
    console.warn("[offlineActionQueue] Error sending queued actions:", e);
    result.stoppedBy = result.stoppedBy || "timeout";
  } finally {
    flushingMatches.delete(key);
  }
  result.remaining = (await loadQueue(matchId)).length;
  return result;
}

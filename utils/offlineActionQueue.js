import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Persistent, per-match queue of scoring actions that haven't been confirmed
 * by the server yet. Socket.IO already buffers emitted events in memory and
 * flushes them on reconnect, but that buffer is lost the moment the app is
 * killed while offline — this queue survives that by writing every pending
 * action to disk immediately, before it's known to have been delivered.
 */

const queueKey = (matchId) => `@criconic_pending_actions_${matchId}`;

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
    await AsyncStorage.setItem(queueKey(matchId), JSON.stringify(queue));
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to save queue:", e);
  }
}

/** Appends an action to the persisted queue. Returns the new queue. */
export async function enqueueAction(matchId, item) {
  const queue = await loadQueue(matchId);
  const next = [...queue, item];
  await saveQueue(matchId, next);
  return next;
}

/** Removes a confirmed action from the persisted queue. Returns the new queue. */
export async function removeAction(matchId, actionId) {
  const queue = await loadQueue(matchId);
  const next = queue.filter((item) => item.actionId !== actionId);
  await saveQueue(matchId, next);
  return next;
}

export async function clearQueue(matchId) {
  if (!matchId) return;
  try {
    await AsyncStorage.removeItem(queueKey(matchId));
  } catch (e) {
    console.warn("[offlineActionQueue] Failed to clear queue:", e);
  }
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
export async function purgeExpiredActions(matchId, maxAgeMs = SERVER_DEDUPE_WINDOW_MS) {
  if (!matchId) return [];
  const queue = await loadQueue(matchId);
  if (!queue.length) return [];

  const oldestAllowed = Date.now() - maxAgeMs;
  const filtered = queue.filter((item) => {
    const itemTs = item.createdAt || parseInt(item.actionId?.split("-")?.[0], 10);
    return !itemTs || isNaN(itemTs) || itemTs >= oldestAllowed;
  });

  if (filtered.length !== queue.length) {
    console.log(
      `[offlineActionQueue] Dropped ${queue.length - filtered.length} expired actions for match ${matchId}`
    );
    await saveQueue(matchId, filtered);
  }
  return filtered;
}

/**
 * Whether an action should stay queued and be retried later: it never reached
 * the server (timeout/offline), the socket wasn't logged in yet (401), or the
 * match was busy (503). Any other refusal is final — retrying it would only
 * block every action queued behind it.
 */
export const isRetryableAck = (response) =>
  !response || response.timedOut || response.status === 401 || response.status === 503;

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

/**
 * Purges actions created before or at minTimestamp (e.g. server match.updatedAt).
 * Stale actions that were already saved/applied to the database are removed so
 * they are never replayed upon screen load.
 */
export async function purgeStaleActions(matchId, minTimestamp) {
  if (!matchId) return [];
  const queue = await loadQueue(matchId);
  if (!queue.length) return [];

  const filtered = queue.filter((item) => {
    const itemTs = item.createdAt || parseInt(item.actionId?.split("-")?.[0], 10);
    if (!itemTs || isNaN(itemTs)) return false;
    return itemTs > minTimestamp;
  });

  if (filtered.length !== queue.length) {
    console.log(
      `[offlineActionQueue] Purged ${queue.length - filtered.length} stale actions from queue for match ${matchId}`
    );
    await saveQueue(matchId, filtered);
  }
  return filtered;
}

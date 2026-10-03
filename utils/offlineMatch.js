import { loadQueue, loadSnapshot, enqueueAction, generateActionId } from "./offlineActionQueue";
import { applyAction, replayQueue, prepareServerScore } from "./offlineScoreEngine";

/**
 * A match as this phone knows it: the last score the server sent for it with
 * the queued (not yet uploaded) scoring actions applied. While actions are
 * queued this is ahead of the server, so screens that continue the match
 * (picking the next innings' openers) must work from it.
 *
 * Returns `{ match, score, pending }`. `match` has the shape of GET
 * api/matches/:id and is null if this phone has never scored the match.
 */
export async function loadOfflineMatch(matchId) {
  const [snapshot, queue] = await Promise.all([loadSnapshot(matchId), loadQueue(matchId)]);
  if (!snapshot?.score) return { match: null, score: null, pending: queue.length };

  const { score } = replayQueue(prepareServerScore(snapshot.score), queue);
  const details = snapshot.matchDetails || {};
  const innings = {};
  Object.keys(score)
    .filter((key) => /^innings_\d+$/.test(key))
    .forEach((key) => {
      innings[key] = score[key];
    });

  const match = {
    ...details,
    _id: details._id || matchId,
    type: details.type || score.matchType,
    teams: details.teams?.length ? details.teams : score.teams,
    status: score.matchCurrentStatus,
    currentInnings: score.currentInnings || details.currentInnings || 1,
    score: { ...(details.score || {}), ...innings },
  };
  return { match, score, pending: queue.length };
}

/**
 * Queues the openers of the innings about to start (action MATCH_START, the
 * socket form of POST api/matches/select/opener), behind whatever is already
 * queued for the match. Resolves with `{ queued: true }`, or `{ error }` if
 * it can't be done from this phone's copy of the match.
 */
export async function queueInningsOpeners(matchId, { userId, striker, nonStriker, bowler }) {
  const { score } = await loadOfflineMatch(matchId);
  if (!score) return { error: "This match hasn't been scored on this phone yet." };

  const data = {
    innings: score.currentInnings || 1,
    batsman: [
      { name: striker.name, id: striker.id, isStriker: true },
      { name: nonStriker.name, id: nonStriker.id },
    ],
    bowler: { name: bowler.name, id: bowler.id },
  };
  const preview = applyAction(score, "MATCH_START", data);
  if (preview.error || preview.unsupported) {
    return { error: preview.error || "The openers can't be saved without a connection for this match." };
  }

  await enqueueAction(matchId, {
    actionId: generateActionId(),
    userId,
    action: "MATCH_START",
    data,
  });
  return { queued: true };
}

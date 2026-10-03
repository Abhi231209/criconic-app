// Helpers for the scorecard's Charts and Analysis tabs. They read the
// "score" payload the scorecard screen gets over the socket; the same logic
// lives in the web client (client/src/utils/scorecard.js).

const idOf = (value) => String(value?._id || value || "");

// Each over's balls with "added": the runs that ball put on the team total.
// A ball stores the running team total (totalRuns), so "added" is the step
// from the ball before; older balls without it fall back to runs + penalty.
const getOversWithRuns = (inning) => {
  let total = 0;
  return (inning?.overs || [])
    .filter((over) => over?.balls?.length)
    .map((over) =>
      over.balls.map((ball) => {
        const stored = Number(ball?.totalRuns);
        let added;
        if (
          ball?.totalRuns !== undefined &&
          ball?.totalRuns !== null &&
          !Number.isNaN(stored)
        ) {
          added = Math.max(0, stored - total);
          total = stored;
        } else {
          const penalty = ["wide", "no-ball"].includes(ball?.ballType) ? 1 : 0;
          added = (Number(ball?.runs) || 0) + penalty;
          total += added;
        }
        return { ...ball, added, teamTotal: total };
      })
    );
};
const isLegalBall = (ball) => !["wide", "no-ball"].includes(ball?.ballType);

// Per-over runs and wickets with a running total.
export const getOverSeries = (inning) =>
  getOversWithRuns(inning).map((balls, index) => ({
    over: index + 1,
    runs: balls.reduce((sum, ball) => sum + ball.added, 0),
    wickets: balls.filter((ball) => ball?.isWicket).length,
    total: balls[balls.length - 1].teamTotal,
  }));

// Stands between wickets, worked out from the ball-by-ball record. Only
// batters who faced a ball in the stand are named.
export const getPartnerships = (inning) => {
  const stands = [];
  let current = null;
  const start = () => ({ runs: 0, balls: 0, batters: new Map() });
  getOversWithRuns(inning).forEach((balls) => {
    balls.forEach((ball) => {
      current = current || start();
      current.runs += ball.added;
      if (isLegalBall(ball)) current.balls += 1;
      const batterId = idOf(ball.batsman);
      if (batterId && !current.batters.has(batterId)) {
        current.batters.set(batterId, ball.batsmanName || "Batter");
      }
      // A retirement that lets the batter return doesn't end the stand.
      if (ball?.isWicket && !ball?.canBatAgain) {
        stands.push(current);
        current = null;
      }
    });
  });
  if (current && (current.runs || current.balls)) {
    stands.push({ ...current, unbroken: true });
  }
  return stands.map((stand, index) => ({
    wicket: index + 1,
    runs: stand.runs,
    balls: stand.balls,
    unbroken: Boolean(stand.unbroken),
    names: [...stand.batters.values()],
  }));
};

const ORDINALS = ["1st", "2nd", "3rd"];
export const ordinal = (n) => ORDINALS[n - 1] || `${n}th`;

// Label of an innings chip: "Team 1st Inn" for a Test, else the team name or
// "Super Over n".
export const getInningsLabel = (inning, index, isTestMatch) => {
  const team = inning?.batting?.battingTeam;
  if (isTestMatch) {
    const inningsNumber = inning?.inningsNumber || index + 1;
    const teamInnings =
      inning?.teamInningsNumber || (inningsNumber > 2 ? 2 : 1);
    return team
      ? `${team} ${teamInnings === 2 ? "2nd" : "1st"} Inn`
      : `Innings ${inningsNumber}`;
  }
  if (inning?.isSuperOver) return `Super Over ${Math.ceil((index + 1) / 2)}`;
  return team || `Innings ${index + 1}`;
};

// What a ball was worth, for colouring and filtering.
export const getShotKind = ({ runs = 0, isWicket = false } = {}) => {
  if (isWicket) return "wicket";
  const value = Number(runs || 0);
  if (value >= 6) return "six";
  if (value >= 4) return "four";
  if (value > 0) return "runs";
  return "dot";
};

// Every ball of an innings that has wagon wheel or pitch map data on it.
export const getTrackedBalls = (inning) => {
  const balls = [];
  (inning?.overs || []).forEach((over, overIndex) => {
    (over?.balls || []).forEach((ball) => {
      if (!ball?.wagonWheel && !ball?.pitchMap) return;
      balls.push({
        over: overIndex + 1,
        batterId: idOf(ball.batsman),
        batterName: ball.batsmanName || "Batter",
        bowlerId: idOf(ball.bowler || over.bowler),
        bowlerName: ball.bowlerName || "Bowler",
        runs: Number(ball.runs || 0),
        isWicket: Boolean(ball.isWicket),
        wagonWheel: ball.wagonWheel,
        pitchMap: ball.pitchMap,
      });
    });
  });
  return balls;
};

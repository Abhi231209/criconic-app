// Helpers for the copies of match lists that screens keep on the phone so
// they still have something to show without a connection.

// What's kept of a match for a saved list: enough for its card, without the
// ball-by-ball data.
export const slimMatch = (m) => {
  if (!m || typeof m !== "object") return m;
  const score = {};
  Object.entries(m.score || {}).forEach(([key, inn]) => {
    score[key] =
      key.startsWith("innings_") && inn
        ? {
            battingTeam: inn.battingTeam,
            totalRuns: inn.totalRuns,
            totalWickets: inn.totalWickets,
            totalOvers: inn.totalOvers,
            isSuperOver: inn.isSuperOver,
            isDeclared: inn.isDeclared,
            isCompleted: inn.isCompleted,
          }
        : inn;
  });
  return {
    ...m,
    score,
    teams: (m.teams || []).map(({ players, ...team }) => team),
  };
};

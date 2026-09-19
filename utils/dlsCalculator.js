// utils/dlsCalculator.js
// Duckworth-Lewis-Stern (DLS) Standard Edition Mathematical Engine
// Implements the ICC Standard Resource Percentage table and formulas.

/**
 * Standard ICC Duckworth-Lewis Resource Percentage Table
 * Format: Array indexed by overs remaining (0 to 50).
 * Each row contains 10 resource percentages for wickets lost: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.
 * For 10 wickets lost, remaining resource is always 0.0%.
 */
export const DLS_RESOURCE_TABLE = [
  /* 0  */ [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  /* 1  */ [4.7, 4.7, 4.6, 4.5, 4.4, 4.2, 3.8, 3.2, 2.5, 1.6],
  /* 2  */ [8.9, 8.8, 8.7, 8.4, 8.1, 7.5, 6.6, 5.3, 3.9, 2.3],
  /* 3  */ [12.5, 12.3, 12.1, 11.7, 11.1, 10.1, 8.7, 6.9, 4.8, 2.7],
  /* 4  */ [15.9, 15.6, 15.3, 14.7, 13.8, 12.5, 10.5, 8.2, 5.6, 3.1],
  /* 5  */ [19.1, 18.8, 18.3, 17.5, 16.4, 14.6, 12.2, 9.3, 6.2, 3.3],
  /* 6  */ [22.2, 21.8, 21.2, 20.2, 18.8, 16.6, 13.7, 10.3, 6.8, 3.5],
  /* 7  */ [25.2, 24.7, 23.9, 22.7, 21.0, 18.4, 15.0, 11.2, 7.2, 3.7],
  /* 8  */ [28.1, 27.4, 26.5, 25.1, 23.1, 20.1, 16.3, 12.0, 7.7, 3.8],
  /* 9  */ [30.9, 30.1, 29.0, 27.3, 25.0, 21.7, 17.5, 12.7, 8.1, 3.9],
  /* 10 */ [33.5, 32.6, 31.3, 29.4, 26.9, 23.2, 18.6, 13.4, 8.4, 4.0],
  /* 11 */ [36.1, 35.1, 33.6, 31.5, 28.7, 24.6, 19.6, 14.0, 8.7, 4.1],
  /* 12 */ [38.6, 37.5, 35.9, 33.5, 30.4, 25.9, 20.5, 14.6, 9.0, 4.2],
  /* 13 */ [41.0, 39.8, 38.0, 35.4, 32.0, 27.2, 21.4, 15.1, 9.3, 4.2],
  /* 14 */ [43.4, 42.0, 40.1, 37.3, 33.6, 28.4, 22.2, 15.6, 9.5, 4.3],
  /* 15 */ [45.7, 44.2, 42.1, 39.1, 35.1, 29.6, 23.0, 16.1, 9.7, 4.4],
  /* 16 */ [48.0, 46.4, 44.1, 40.9, 36.5, 30.7, 23.8, 16.5, 9.9, 4.4],
  /* 17 */ [50.2, 48.5, 46.0, 42.6, 37.9, 31.8, 24.5, 16.9, 10.1, 4.5],
  /* 18 */ [52.4, 50.5, 47.9, 44.2, 39.3, 32.8, 25.2, 17.3, 10.3, 4.5],
  /* 19 */ [54.5, 52.5, 49.7, 45.8, 40.6, 33.8, 25.9, 17.7, 10.5, 4.6],
  /* 20 */ [56.6, 54.5, 51.5, 47.3, 41.8, 34.7, 26.5, 18.0, 10.6, 4.6],
  /* 21 */ [58.6, 56.4, 53.2, 48.8, 43.0, 35.6, 27.1, 18.3, 10.8, 4.6],
  /* 22 */ [60.6, 58.2, 54.9, 50.3, 44.2, 36.5, 27.6, 18.6, 10.9, 4.7],
  /* 23 */ [62.6, 60.1, 56.5, 51.7, 45.3, 37.3, 28.1, 18.9, 11.0, 4.7],
  /* 24 */ [64.6, 61.9, 58.1, 53.1, 46.4, 38.0, 28.6, 19.2, 11.1, 4.7],
  /* 25 */ [66.5, 63.6, 59.7, 54.4, 47.4, 38.7, 29.0, 19.4, 11.1, 4.7],
  /* 26 */ [68.4, 65.3, 61.2, 55.7, 48.4, 39.4, 29.4, 19.6, 11.2, 4.7],
  /* 27 */ [70.2, 67.0, 62.6, 56.9, 49.4, 40.1, 29.8, 19.8, 11.3, 4.7],
  /* 28 */ [71.9, 68.6, 64.0, 58.0, 50.3, 40.7, 30.2, 20.0, 11.3, 4.7],
  /* 29 */ [73.5, 70.1, 65.3, 59.1, 51.1, 41.3, 30.6, 20.1, 11.4, 4.7],
  /* 30 */ [75.1, 71.5, 66.6, 60.1, 51.9, 41.9, 31.0, 20.3, 11.4, 4.7],
  /* 31 */ [76.7, 73.0, 67.8, 61.1, 52.7, 42.5, 31.3, 20.4, 11.5, 4.7],
  /* 32 */ [78.2, 74.4, 69.0, 62.1, 53.5, 43.0, 31.6, 20.6, 11.5, 4.7],
  /* 33 */ [79.7, 75.7, 70.2, 63.1, 54.2, 43.5, 31.9, 20.7, 11.5, 4.7],
  /* 34 */ [81.2, 77.0, 71.4, 64.1, 54.9, 44.0, 32.1, 20.9, 11.6, 4.7],
  /* 35 */ [82.7, 78.3, 72.5, 65.0, 55.6, 44.4, 32.4, 21.0, 11.6, 4.7],
  /* 36 */ [84.1, 79.5, 73.5, 65.9, 56.2, 44.8, 32.6, 21.1, 11.6, 4.7],
  /* 37 */ [85.5, 80.7, 74.5, 66.7, 56.8, 45.2, 32.9, 21.2, 11.6, 4.7],
  /* 38 */ [86.8, 81.9, 75.5, 67.5, 57.4, 45.6, 33.1, 21.3, 11.6, 4.7],
  /* 39 */ [88.1, 83.1, 76.5, 68.3, 58.0, 46.0, 33.3, 21.3, 11.7, 4.7],
  /* 40 */ [89.3, 84.2, 77.4, 69.0, 58.6, 46.4, 33.5, 21.4, 11.7, 4.7],
  /* 41 */ [90.5, 85.3, 78.3, 69.7, 59.1, 46.7, 33.7, 21.5, 11.7, 4.7],
  /* 42 */ [91.7, 86.3, 79.2, 70.4, 59.6, 47.0, 33.9, 21.6, 11.7, 4.7],
  /* 43 */ [92.8, 87.3, 80.0, 71.1, 60.1, 47.3, 34.0, 21.6, 11.7, 4.7],
  /* 44 */ [93.9, 88.3, 80.8, 71.7, 60.5, 47.6, 34.2, 21.7, 11.8, 4.7],
  /* 45 */ [95.0, 89.2, 81.6, 72.3, 60.9, 47.9, 34.3, 21.7, 11.8, 4.7],
  /* 46 */ [96.1, 90.1, 82.3, 72.9, 61.3, 48.1, 34.5, 21.8, 11.8, 4.7],
  /* 47 */ [97.1, 91.0, 83.0, 73.4, 61.7, 48.4, 34.6, 21.8, 11.8, 4.7],
  /* 48 */ [98.1, 91.8, 83.7, 73.9, 62.0, 48.6, 34.7, 21.9, 11.9, 4.7],
  /* 49 */ [99.0, 92.6, 84.4, 74.4, 62.4, 48.8, 34.8, 21.9, 11.9, 4.7],
  /* 50 */ [100.0, 93.4, 85.1, 74.9, 62.7, 49.0, 34.9, 22.0, 11.9, 4.7],
];

/**
 * Resolves standard overs representation to numeric decimal overs.
 * e.g. "12.3" -> 12.5 (12 overs and 3 balls)
 */
export function normalizeOversToDecimal(oversVal) {
  if (oversVal === undefined || oversVal === null || isNaN(Number(oversVal))) {
    return 0;
  }
  const str = String(oversVal).trim();
  if (str.includes(".")) {
    const [ovStr, ballsStr] = str.split(".");
    const ov = parseInt(ovStr, 10) || 0;
    const balls = parseInt(ballsStr, 10) || 0;
    return ov + Math.min(balls, 5) / 6;
  }
  return Number(oversVal);
}

/**
 * Returns the resource percentage remaining given overs remaining and wickets lost.
 * Performs linear interpolation for fractional overs (e.g. balls bowled in an over).
 *
 * @param {number|string} oversRemaining - Overs left (0 to 50)
 * @param {number} wicketsLost - Wickets lost (0 to 10)
 * @returns {number} Resource percentage remaining (0.0 to 100.0)
 */
export function getResourcePercentage(oversRemaining, wicketsLost = 0) {
  const w = Math.min(Math.max(parseInt(wicketsLost, 10) || 0, 0), 10);
  if (w >= 10) return 0.0;

  const decimalOvers = Math.max(0, Math.min(50, normalizeOversToDecimal(oversRemaining)));
  const lowerOver = Math.floor(decimalOvers);
  const upperOver = Math.ceil(decimalOvers);
  const fraction = decimalOvers - lowerOver;

  const lowerVal = DLS_RESOURCE_TABLE[lowerOver]?.[w] ?? 0.0;
  if (lowerOver === upperOver || fraction === 0) {
    return lowerVal;
  }

  const upperVal = DLS_RESOURCE_TABLE[upperOver]?.[w] ?? lowerVal;
  return lowerVal + (upperVal - lowerVal) * fraction;
}

/**
 * Computes DLS Revised Target when Team 2's overs are reduced (Interruption before or during Innings 2).
 *
 * @param {Object} params
 * @param {number} params.team1Runs - Total runs scored by Team 1
 * @param {number} params.team1Overs - Overs faced/scheduled for Team 1 (default 20)
 * @param {number} params.team2Overs - Revised overs for Team 2 (e.g. 12)
 * @param {number} [params.team1Wickets=0] - Wickets lost by Team 1 if terminated early
 * @param {number} [params.g50=245] - Standard G50 benchmark (default 245)
 * @returns {{
 *   revisedTarget: number,
 *   parScore: number,
 *   team1Resource: number,
 *   team2Resource: number,
 *   rrr: string,
 *   isReduced: boolean
 * }}
 */
export function calculateDLSTarget({
  team1Runs,
  team1Overs = 20,
  team2Overs = 20,
  team1Wickets = 0,
  g50 = 245,
}) {
  const S1 = Math.max(0, parseInt(team1Runs, 10) || 0);
  const O1 = Math.max(1, normalizeOversToDecimal(team1Overs));
  const O2 = Math.max(1, normalizeOversToDecimal(team2Overs));

  // Team 1 Total Resource
  const R1 = getResourcePercentage(O1, team1Wickets);
  // Team 2 Total Resource available for their revised innings
  const R2 = getResourcePercentage(O2, 0);

  let parScore = 0;
  let revisedTarget = 0;

  if (R1 <= 0) {
    parScore = S1;
    revisedTarget = S1 + 1;
  } else if (R2 < R1) {
    // Team 2 has less resources -> Target is scaled down
    parScore = Math.floor(S1 * (R2 / R1));
    revisedTarget = parScore + 1;
  } else if (Math.abs(R2 - R1) < 0.001) {
    // Equal resources
    parScore = S1;
    revisedTarget = S1 + 1;
  } else {
    // Team 2 has more resources (Team 1 had an early stoppage and Team 2 gets more overs)
    const scaledG50 = (g50 * Math.min(O2, 50)) / 50;
    const additionalRuns = Math.floor(((R2 - R1) / 100) * scaledG50);
    parScore = S1 + additionalRuns;
    revisedTarget = parScore + 1;
  }

  // Required Run Rate for the revised target
  const rrr = O2 > 0 ? (revisedTarget / O2).toFixed(2) : "0.00";

  return {
    revisedTarget,
    parScore,
    team1Resource: parseFloat(R1.toFixed(2)),
    team2Resource: parseFloat(R2.toFixed(2)),
    rrr,
    isReduced: O2 < O1,
  };
}

/**
 * Computes the real-time DLS Par Score at any given ball in the 2nd innings.
 * Used for live par score tracking and determining winner if match is called off due to rain.
 *
 * @param {Object} params
 * @param {number} params.team1Runs - Final score of Team 1
 * @param {number} params.team1Overs - Total overs allocated to Team 1
 * @param {number} params.team2TotalOvers - Total scheduled/revised overs for Team 2 innings
 * @param {number|string} params.team2CurrentOvers - Overs completed by Team 2 (e.g. 7.4)
 * @param {number} params.team2WicketsLost - Wickets lost by Team 2
 * @returns {number} Exact DLS Par Score at this ball
 */
export function calculateDLSParScore({
  team1Runs,
  team1Overs = 20,
  team2TotalOvers = 20,
  team2CurrentOvers = 0,
  team2WicketsLost = 0,
}) {
  const S1 = Math.max(0, parseInt(team1Runs, 10) || 0);
  const O1 = Math.max(1, normalizeOversToDecimal(team1Overs));
  const O2Total = Math.max(1, normalizeOversToDecimal(team2TotalOvers));
  const O2Current = Math.max(0, normalizeOversToDecimal(team2CurrentOvers));
  const W2 = Math.min(10, Math.max(0, parseInt(team2WicketsLost, 10) || 0));

  if (W2 >= 10) {
    // If all out, team has consumed 100% of their available resources
    return S1;
  }

  const R1 = getResourcePercentage(O1, 0);
  if (R1 <= 0) return S1;

  // Resources Team 2 started with
  const R2Total = getResourcePercentage(O2Total, 0);
  // Resources Team 2 has left at this moment
  const oversLeft = Math.max(0, O2Total - O2Current);
  const R2Remaining = getResourcePercentage(oversLeft, W2);
  // Resources consumed by Team 2 so far
  const R2Consumed = Math.max(0, R2Total - R2Remaining);

  return Math.floor(S1 * (R2Consumed / R1));
}

/**
 * Determines match winner and summary text when a match is called off/abandoned during 2nd innings.
 *
 * @param {Object} params
 * @returns {{
 *   winnerTeam: "team1" | "team2" | "tie",
 *   winnerName: string,
 *   marginRuns: number,
 *   parScore: number,
 *   summaryText: string
 * }}
 */
export function calculateDLSResult({
  team1Name = "Team A",
  team2Name = "Team B",
  team1Runs,
  team1Overs,
  team2Runs,
  team2CurrentOvers,
  team2WicketsLost,
  team2TotalOvers,
}) {
  const S2 = parseInt(team2Runs, 10) || 0;
  const par = calculateDLSParScore({
    team1Runs,
    team1Overs,
    team2TotalOvers,
    team2CurrentOvers,
    team2WicketsLost,
  });

  if (S2 > par) {
    const margin = S2 - par;
    return {
      winnerTeam: "team2",
      winnerName: team2Name,
      marginRuns: margin,
      parScore: par,
      summaryText: `${team2Name} won by ${margin} run${margin === 1 ? "" : "s"} (DLS Method)`,
    };
  } else if (S2 < par) {
    const margin = par - S2;
    return {
      winnerTeam: "team1",
      winnerName: team1Name,
      marginRuns: margin,
      parScore: par,
      summaryText: `${team1Name} won by ${margin} run${margin === 1 ? "" : "s"} (DLS Method)`,
    };
  } else {
    return {
      winnerTeam: "tie",
      winnerName: "Tie",
      marginRuns: 0,
      parScore: par,
      summaryText: `Match Tied (DLS Method - Par score ${par})`,
    };
  }
}

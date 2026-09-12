export function capitalizeFirstWord(str) {
  return str
    ?.toLowerCase()
    ?.replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
}


export const MATCH_STATUS = {
  TOSS: "TOSS",
  MATCH_CREATED: "MATCH_CREATED", // Match is created but not started
  MATCH_DETAILS_ENTERED: "MATCH_DETAILS_ENTERED", // Match is details are entered
  MATCH_OPENER_SELECTED: "MATCH_OPENER_SELECTED", // Match opener player is selected
  MATCH_STARTED: "MATCH_STARTED", // Match is started
  MATCH_SCHEDULED: "MATCH_SCHEDULED", // Match has been scheduled for a specific date and time
  MATCH_IN_PROGRESS: "MATCH_IN_PROGRESS", // The match is currently being played
  INNINGS_I: "INNINGS_I",
  INNINGS_II: "INNINGS_II",
  MATCH_ENDED: "MATCH_ENDED", // The match is temporarily paused
  MATCH_PAUSED: "MATCH_PAUSED", // The match is temporarily paused
  MATCH_RESUMED: "MATCH_RESUMED", // The match resumes after a pause
  MATCH_COMPLETED: "MATCH_COMPLETED", // The match has been successfully completed
  MATCH_CANCELLED: "MATCH_CANCELLED", // The match has been cancelled for some reason
  MATCH_SUSPENDED: "MATCH_SUSPENDED", // The match is suspended, and gameplay is temporarily halted
  MATCH_INTERRUPTED: "MATCH_INTERRUPTED", // The match is interrupted, and there's a delay in gameplay
  MATCH_DELAYED: "MATCH_DELAYED", // The match is delayed, but not yet started
  INNINGS_I_ENDED: "INNINGS_I_ENDED", // Break between innings
  INNINGS_BREAK: "INNINGS_BREAK", // Break between innings
  RAIN_DELAY: "RAIN_DELAY", // Delay due to rain or adverse weather conditions
  TEA_BREAK: "TEA_BREAK", // Break for tea during the match
  DRINKS_BREAK: "DRINKS_BREAK", // Break for drinks during the match
  TECHNICAL_ISSUE: "TECHNICAL_ISSUE", // Match is paused due to technical issues
  REVIEW_IN_PROGRESS: "REVIEW_IN_PROGRESS", // Decision under review by the third umpire
  UMPIRE_CONSULTATION: "UMPIRE_CONSULTATION", // Umpires are discussing a decision
  OVERTIME: "OVERTIME", // Match extends beyond scheduled time
  EXTRA_INNINGS: "EXTRA_INNINGS", // Additional innings beyond the regular ones
  MATCH_TIE: "MATCH_TIE", // Super Over is being played to break a tie
  SUPER_OVER: "SUPER_OVER", // Super Over is being played to break a tie
  MATCH_ENDED: "MATCH_ENDED", // The match has been successfully ended
};

export function convertBallToOvers(ball = 0) {
  const overs = Math.floor(ball / 6);
  const remainingBalls = ball % 6;
  return `${overs}.${remainingBalls}`;
}

export function calculateCRR(runs, overs) {
  if (runs === undefined || runs === null || !overs) return "0.00";
  const str = String(overs);
  const parts = str.split(".");
  const completedOvers = parseInt(parts[0], 10) || 0;
  const ballsInCurrentOver = parseInt(parts[1], 10) || 0;
  const totalBalls = completedOvers * 6 + ballsInCurrentOver;
  if (totalBalls <= 0) return "0.00";
  return ((Number(runs) / totalBalls) * 6).toFixed(2);
}

export const getMatchStatusDisplay = (status) => {
  switch (status) {
    case MATCH_STATUS.MATCH_SCHEDULED:
    case MATCH_STATUS.MATCH_CREATED:
      return "Upcoming";
    case MATCH_STATUS.MATCH_IN_PROGRESS:
    case MATCH_STATUS.INNINGS_I:
    case MATCH_STATUS.INNINGS_II:
    case MATCH_STATUS.MATCH_RESUMED:
    case MATCH_STATUS.MATCH_STARTED:
      return "Live";
    case MATCH_STATUS.MATCH_COMPLETED:
    case MATCH_STATUS.MATCH_TIE:
    case MATCH_STATUS.MATCH_CANCELLED:
    case MATCH_STATUS.MATCH_INTERRUPTED:
    case MATCH_STATUS.MATCH_SUSPENDED:
    case MATCH_STATUS.RAIN_DELAY:
    case MATCH_STATUS.MATCH_PAUSED:
    case MATCH_STATUS.MATCH_ENDED:
      return "End";
    default:
      return status || "";
  }
};

export const getBatsmenDescription = (player) => {
  if (player?.notOut) {
    return "not out";
  }
  const info = player?.dismissalInfo;
  if (!info) {
    return player?.howOut || "";
  }

  const type = String(info.dismissalType || "").toLowerCase().trim().replace(/_/g, "-");

  const getPlayerName = (p) => {
    if (!p) return "";
    if (typeof p === "string") return p;
    return p.username || p.name || p.playerName || "";
  };

  const caughtBy = getPlayerName(info.caughtBy || info.catcher || info.fielder);
  const bowler = getPlayerName(info.bowler || info.bowlerName);
  const stumpBy = getPlayerName(info.stumpBy || info.keeper || info.wicketKeeper);
  const f1 = getPlayerName(info.runOutfielderOne || info.fielderOne || info.fielder || info.runOutBy);
  const f2 = getPlayerName(info.runOutfielderTwo || info.fielderTwo);

  if (type === "caught") {
    if (caughtBy && bowler && caughtBy !== bowler) {
      return `c ${caughtBy} b ${bowler}`;
    } else if (bowler) {
      return `c&b ${bowler}`;
    } else if (caughtBy) {
      return `c ${caughtBy}`;
    }
    return bowler ? `c b ${bowler}` : "c";
  }

  if (type === "stumped") {
    if (stumpBy && bowler) return `st ${stumpBy} b ${bowler}`;
    if (bowler) return `st b ${bowler}`;
    if (stumpBy) return `st ${stumpBy}`;
    return "stumped";
  }

  if (type === "caught and bowled" || type === "caught-and-bowled" || type === "c&b") {
    return bowler ? `c&b ${bowler}` : "c&b";
  }

  if (type === "run-out" || type === "run out" || type === "runout") {
    const fielderStr = f2 ? `${f1}/${f2}` : f1;
    return fielderStr ? `run out (${fielderStr})` : "run out";
  }

  if (type === "bowled") {
    return bowler ? `b ${bowler}` : "b";
  }

  if (type === "lbw") {
    return bowler ? `lbw b ${bowler}` : "lbw";
  }

  if (type === "hit-wicket" || type === "hit wicket") {
    return bowler ? `hit wicket b ${bowler}` : "hit wicket";
  }

  if (type === "mankaded") {
    return bowler ? `mankaded b ${bowler}` : "mankaded";
  }

  if (type.includes("retire")) {
    return info.dismissalType || "Retired";
  }

  // General fallback
  if (bowler) return `b ${bowler}`;
  return info.dismissalType || player?.howOut || "";
};

export const MATCH_ACTION = {
  TOSS: "TOSS",
  MATCH_START: "MATCH_START",
  BATSMAN_SELECTED: "BATSMAN_SELECTED",
  BOWLER_SELECTED: "BOWLER_SELECTED",
  MATCH_BALL: "MATCH_BALL",
  RUN_SCORED: "RUN_SCORED",
  WICKET_TAKEN: "WICKET_TAKEN",
  NO_BALL: "NO_BALL",
  WIDE: "WIDE",
  BYE: "BYE",
  LEG_BYE: "LEG_BYE",
  BONUS_RUNS: "BONUS_RUNS",
  OVER_COMPLETED: "OVER_COMPLETED",
  END_OF_INNINGS: "END_OF_INNINGS",
  INNINGS_BREAK: "INNINGS_BREAK",
  MATCH_END: "MATCH_END",
  POWERPLAY_START: "POWERPLAY_START",
  POWERPLAY_END: "POWERPLAY_END",
  PLAYER_SUBSTITUTION: "PLAYER_SUBSTITUTION",
  REVIEW_REQUESTED: "REVIEW_REQUESTED",
  REVIEW_SUCCESSFUL: "REVIEW_SUCCESSFUL",
  REVIEW_UNSUCCESSFUL: "REVIEW_UNSUCCESSFUL",
  PENALTY_RUNS: "PENALTY_RUNS",
  PLAYER_INJURY: "PLAYER_INJURY",
  PLAYER_RETIREMENT: "PLAYER_RETIREMENT",
  SUPER_OVER: "SUPER_OVER",
  UNDO_LAST_BALL: "UNDO_LAST_BALL",
  CHANGE_STRIKE: "CHANGE_STRIKE",
  MATCH_TIE: "MATCH_TIE",
  END_OF_MATCH: "END_OF_MATCH",
};

export const MATCH_STATUS_STAGE = {
  MATCH_CREATED: 0,
  TOSS: 1,
  MATCH_OPENER_SELECTED: 2,
  MATCH_START: 3,
  INNINGS_I_ENDED: 4,
};


export const MatchSettingEnum = {
  COUNT_NO_BALL_RUN: "countNoBallRun",
  COUNT_WIDE_RUN: "countWideRun",
  SINGLE_BATSMAN_ALLOWED: "singleBatsmanAllowed",
  END_INNING: "endInning",
  GO_LIVE: "goLive",
  OVERLAY_SETUP: "overlaySetup",
  GO_LIVE_TOURNAMENT: "goLiveTournament",
  LIVE_STREAMING_LINK: "streamUrl",
  SHOW_COMPARISON_GRAPH: "showComparisonGraph",
  SHOW_BATSMEN_STATS: "showBatsmenStats",
  SHOW_MATCH_SUMMARY: "showMatchSummary",
  SHOW_PLAYING_ELEVEN: "showPlayingEleven",
  SHOW_MATCH_PREVIEW: "showMatchPreview",
  SHOW_PARTNERSHIP: "showPartnership",
  SHOW_TOSS: "showToss",
};

export const MatchSettings = {
  [MatchSettingEnum.END_INNING]: "End Inning",
  [MatchSettingEnum.COUNT_NO_BALL_RUN]: "Count No Ball Run",
  [MatchSettingEnum.COUNT_WIDE_RUN]: "Count Wide Run",
  [MatchSettingEnum.SINGLE_BATSMAN_ALLOWED]: "Allow Single Batsman",
  [MatchSettingEnum.LIVE_STREAMING_LINK]: {
    label: "Live Streaming Link",
    placeholder: "Paste Youtube/Facebook Video Link...",
  },
};

export const LiveSettings = {
  [MatchSettingEnum.GO_LIVE_TOURNAMENT]: "Live as Tournament",
  [MatchSettingEnum.GO_LIVE]: "Go Live",
  [MatchSettingEnum.OVERLAY_SETUP]: "Overlay Setup",

  [MatchSettingEnum.SHOW_MATCH_PREVIEW]: "Show Match Preview",
  [MatchSettingEnum.SHOW_TOSS]: "Show Toss Decision",
  [MatchSettingEnum.SHOW_BATSMEN_STATS]: "Show batsmen Score",
  [MatchSettingEnum.SHOW_MATCH_SUMMARY]: "Show Match Summary",
  [MatchSettingEnum.SHOW_PLAYING_ELEVEN]: "Show Playing Eleven",
  [MatchSettingEnum.SHOW_PARTNERSHIP]: "Show Current Partnership",
  [MatchSettingEnum.SHOW_COMPARISON_GRAPH]:
    "Show Comparison Graph on Live Screen",
};
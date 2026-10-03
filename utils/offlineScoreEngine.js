/**
 * Applies scoring actions to a score object on the phone, the same way the
 * server does (see server/models/Match.js `ball`, `selectBatsman`,
 * `selectBowler`, `strikeChange` and server/service/MatchService.js), so the
 * scorer keeps seeing balls, runs and wickets while they are still waiting in
 * the offline queue.
 *
 * It works on the raw innings the server includes in every score
 * (`score.innings_<n>`) and then rebuilds the fields the screens read
 * (`batting`, `batsman`, `bowler`, `currentOver`, ...), mirroring
 * createMatchScore in server/controller/matchController.js.
 *
 * The result is only ever a preview: once the queue is sent, the server's
 * score replaces it. Keep this file free of React Native imports so it can be
 * run under plain Node.
 */

const ACTION = {
  MATCH_START: "MATCH_START",
  BATSMAN_SELECTED: "BATSMAN_SELECTED",
  BOWLER_SELECTED: "BOWLER_SELECTED",
  MATCH_BALL: "MATCH_BALL",
  UNDO_LAST_BALL: "UNDO_LAST_BALL",
  END_OF_INNINGS: "END_OF_INNINGS",
  SUPER_OVER: "SUPER_OVER",
  CHANGE_STRIKE: "CHANGE_STRIKE",
  MATCH_TIE: "MATCH_TIE",
  END_OF_MATCH: "END_OF_MATCH",
};

const STATUS = {
  TOSS: "TOSS",
  MATCH_OPENER_SELECTED: "MATCH_OPENER_SELECTED",
  MATCH_STARTED: "MATCH_STARTED",
  MATCH_SCHEDULED: "MATCH_SCHEDULED",
  MATCH_IN_PROGRESS: "MATCH_IN_PROGRESS",
  INNINGS_II: "INNINGS_II",
  INNINGS_I_ENDED: "INNINGS_I_ENDED",
  INNINGS_BREAK: "INNINGS_BREAK",
  MATCH_COMPLETED: "MATCH_COMPLETED",
  MATCH_ENDED: "MATCH_ENDED",
  MATCH_TIE: "MATCH_TIE",
  SUPER_OVER: "SUPER_OVER",
};

const TEST_INNINGS = 4;

const clone = (value) =>
  value === undefined || value === null ? value : JSON.parse(JSON.stringify(value));

const toInt = (value) => parseInt(value, 10) || 0;

const idOf = (player) =>
  String(player?.playerId || player?.id || player?._id || player || "");

const teamIdOf = (team) => {
  if (!team) return "";
  const raw = team.teamId ?? team._id ?? team.id;
  return String((raw && typeof raw === "object" ? raw._id || raw.id : raw) || "");
};

const findIndex = (players, player) => {
  if (!Array.isArray(players) || !player) return -1;
  const targetId = idOf(player);
  if (!targetId) return -1;
  return players.findIndex((p) => idOf(p) === targetId);
};

const isActive = (batter) => batter && batter.notOut !== false && !batter.dismissalInfo;

const matchType = (score) => String(score?.matchType || "").toLowerCase();
const isTest = (score) => matchType(score) === "test";
const isSingleWicket = (score) => matchType(score) === "single_wicket";

const ballsFromOvers = (overs = "") => {
  const [whole, balls] = String(overs).split(".");
  return toInt(whole) * 6 + toInt(balls);
};

const runRate = (runs, overs) => {
  const balls = ballsFromOvers(overs);
  return balls > 0 ? ((runs / balls) * 6).toFixed(2) : 0;
};

const strikeRate = (runs = 0, balls = 0) =>
  balls ? ((runs / balls) * 100).toFixed(2) : 0;

const teamsOf = (score, inn) => {
  const teams = {};
  (score?.teams || []).forEach((team) => {
    if (teamIdOf(team) === String(inn?.battingTeam?._id || inn?.battingTeam || "")) {
      teams.battingTeam = team;
    } else {
      teams.bowlingTeam = team;
    }
  });
  return teams;
};

const newBatter = (name, playerId, isStrikeEnd) => ({
  name,
  playerId,
  runs: 0,
  ballsFaced: 0,
  fours: 0,
  sixes: 0,
  notOut: true,
  isStrikeEnd: Boolean(isStrikeEnd),
});

const newOver = (bowler) => ({ bowler, ballCount: 0, balls: [] });

// A fresh innings as the server's schema defaults leave it.
const newInnings = (existing, fields) => ({
  totalRuns: 0,
  totalWickets: 0,
  totalOvers: "0",
  extras: 0,
  batsman: [],
  bowlers: [],
  overs: [],
  partnerships: [],
  fallOfWickets: [],
  ...(existing || {}),
  ...fields,
});

const newPartnership = (inn) => ({
  batsman1: { playerId: inn.batsman[inn.strikerIndex]?.playerId, runs: 0, balls: 0 },
  batsman2: { playerId: inn.batsman[inn.nonStrikerIndex]?.playerId, runs: 0, balls: 0 },
  totalRuns: 0,
  balls: 0,
});

// The server's score lists each innings' batters sorted by runs (its match
// summary sorts the same array), so `strikerIndex` / `nonStrikerIndex` can't
// be trusted against that order. `score.batsman` is built before the sort and
// says who is really on strike, so the indexes are re-pointed by player id.
function pointIndexesAtStriker(inn, score) {
  const batsmen = inn?.batsman;
  if (!Array.isArray(batsmen) || !batsmen.length) return;
  const onField = (score.batsman || []).filter(isActive);
  if (!onField.length) return;
  const indexOfActive = (player) => {
    const id = idOf(player);
    const idx = batsmen.findIndex((b) => isActive(b) && idOf(b) === id);
    return idx !== -1 ? idx : findIndex(batsmen, id);
  };
  const striker = onField.find((b) => b.isStrikeEnd) || onField[0];
  const strikerIndex = indexOfActive(striker);
  if (strikerIndex === -1) return;
  const partner = onField.find((b) => b !== striker);
  const partnerIndex = partner ? indexOfActive(partner) : -1;

  inn.strikerIndex = strikerIndex;
  if (partnerIndex !== -1) inn.nonStrikerIndex = partnerIndex;
  batsmen.forEach((b, idx) => {
    b.isStrikeEnd = idx === strikerIndex;
  });
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function strikeChange(ctx, data = {}) {
  const { inn } = ctx;
  const batsman = inn.batsman || [];

  if (ctx.config?.singleBatsmanAllowed && batsman.filter(isActive).length <= 1) return;

  if (data?.striker) {
    const targetId = String(data.striker);
    let matched = false;
    batsman.forEach((player, idx) => {
      if (idOf(player) === targetId || String(player?.name || "") === targetId) {
        player.isStrikeEnd = true;
        inn.strikerIndex = idx;
        matched = true;
      } else if (isActive(player)) {
        player.isStrikeEnd = false;
        inn.nonStrikerIndex = idx;
      }
    });
    if (matched) return;
  }

  let entries = [];
  batsman.forEach((player, idx) => {
    if (isActive(player)) entries.push({ player, idx });
  });

  if (entries.length < 2 && batsman.length >= 2) {
    const sIdx =
      typeof inn.strikerIndex === "number" && inn.strikerIndex < batsman.length
        ? inn.strikerIndex
        : 0;
    const nsIdx =
      typeof inn.nonStrikerIndex === "number" &&
      inn.nonStrikerIndex < batsman.length &&
      inn.nonStrikerIndex !== sIdx
        ? inn.nonStrikerIndex
        : sIdx === 0
        ? 1
        : 0;
    entries = [
      { player: batsman[sIdx], idx: sIdx },
      { player: batsman[nsIdx], idx: nsIdx },
    ];
  }
  if (entries.length < 2) return;

  const current = entries.find((e) => e.player.isStrikeEnd);
  const next = current ? entries.find((e) => e.idx !== current.idx) || entries[1] : entries[1];
  const other = current || entries[0];

  batsman[next.idx].isStrikeEnd = true;
  batsman[other.idx].isStrikeEnd = false;
  inn.strikerIndex = next.idx;
  inn.nonStrikerIndex = other.idx;
}

function selectBowler(ctx, data = {}) {
  const { inn } = ctx;
  const bowlerId = idOf(data?.bowler);
  if (!data?.name || !bowlerId) return "Please select a bowler.";

  if (!Array.isArray(inn.overs)) inn.overs = [];
  if (!Array.isArray(inn.bowlers)) inn.bowlers = [];

  const lastOver = inn.overs[inn.overs.length - 1];
  if (
    lastOver?.ballCount === 6 &&
    !isSingleWicket(ctx.score) &&
    String(lastOver.bowler) === bowlerId
  ) {
    return "A bowler cannot bowl two consecutive overs (Law 22.9).";
  }

  if (findIndex(inn.bowlers, bowlerId) === -1) {
    inn.bowlers.push({
      name: data.name,
      playerId: bowlerId,
      balls: 0,
      runsGiven: 0,
      wicketsTaken: 0,
    });
  }
  if (!inn.overs.length || lastOver?.ballCount === 6) {
    inn.overs.push(newOver(bowlerId));
  }
  return null;
}

// Mirrors the status change at the end of server selectBatsman.
function leaveInningsBreak(ctx) {
  if (ctx.status !== STATUS.INNINGS_I_ENDED && ctx.status !== STATUS.INNINGS_BREAK) return;
  ctx.status = ctx.inn?.isSuperOver
    ? STATUS.SUPER_OVER
    : ctx.n % 2 === 1
    ? STATUS.MATCH_IN_PROGRESS
    : STATUS.INNINGS_II;
}

function selectBatsman(ctx, data = {}) {
  const { inn } = ctx;
  const playerId = idOf(data?.batsman);
  if (!playerId) return "Please select a batter.";
  if (!Array.isArray(inn.batsman)) inn.batsman = [];

  inn.batsman.push(newBatter(data.batsman.name, playerId, data.batsman.isStrikeEnd));
  const newIndex = inn.batsman.length - 1;

  const canPartner = (idx) =>
    idx !== undefined && idx !== newIndex && isActive(inn.batsman[idx]);
  let survivingIndex = canPartner(inn.nonStrikerIndex)
    ? inn.nonStrikerIndex
    : canPartner(inn.strikerIndex)
    ? inn.strikerIndex
    : inn.batsman.findIndex((b, idx) => idx !== newIndex && isActive(b));
  if (survivingIndex === -1) survivingIndex = 0;

  if (data.batsman.isStrikeEnd) {
    inn.strikerIndex = newIndex;
    inn.nonStrikerIndex = survivingIndex;
  } else {
    inn.strikerIndex = survivingIndex;
    inn.nonStrikerIndex = newIndex;
  }
  inn.batsman.forEach((b, idx) => {
    b.isStrikeEnd = idx === inn.strikerIndex;
  });

  if (!Array.isArray(inn.partnerships)) inn.partnerships = [];
  inn.partnerships.push(newPartnership(inn));
  leaveInningsBreak(ctx);
  return null;
}

// Openers and the opening bowler of an innings (the socket form of
// POST api/matches/select/opener).
function startInnings(ctx, data = {}) {
  const { inn } = ctx;
  const openers = (data.batsman || []).filter((b) => idOf(b?.id || b?.playerId));
  if (!openers.length) return "Please select the opening batters.";
  if (!data.bowler) return "Please select the opening bowler.";
  if (inn.batsman?.length) return "This innings has already started.";

  const strikerIsFirst = openers.length === 1 || Boolean(openers[0].isStriker);
  inn.batsman = openers
    .slice(0, 2)
    .map((b, idx) => newBatter(b.name, idOf(b.id || b.playerId), idx === 0 ? strikerIsFirst : !strikerIsFirst));
  inn.strikerIndex = strikerIsFirst ? 0 : 1;
  inn.nonStrikerIndex = strikerIsFirst ? 1 : 0;
  inn.partnerships = [newPartnership(inn)];
  inn.totalRuns = inn.totalRuns || 0;
  inn.totalWickets = inn.totalWickets || 0;
  inn.extras = inn.extras || 0;
  leaveInningsBreak(ctx);

  return selectBowler(ctx, { bowler: data.bowler.id || data.bowler.playerId, name: data.bowler.name });
}

function decideChase(ctx, { runs, lastRuns, wicketsLeft, verb = "won" }) {
  const { battingTeam, bowlingTeam } = teamsOf(ctx.score, ctx.inn);
  if (runs > lastRuns) {
    ctx.status = STATUS.MATCH_COMPLETED;
    ctx.matchResult = {
      winningTeam: ctx.inn.battingTeam,
      prompt: `${battingTeam?.title} won by ${wicketsLeft} wickets`,
    };
  } else if (runs < lastRuns) {
    ctx.status = STATUS.MATCH_COMPLETED;
    ctx.matchResult = {
      winningTeam: teamIdOf(bowlingTeam),
      prompt: `${bowlingTeam?.title} ${verb} by ${lastRuns - runs} runs`,
    };
  } else {
    ctx.status = STATUS.MATCH_TIE;
  }
}

function ball(ctx, rawBall) {
  const { inn, score, n } = ctx;
  const delivery = { ...rawBall };
  delivery.runs = toInt(delivery.runs);
  const test = isTest(score);

  if (
    [STATUS.MATCH_OPENER_SELECTED, STATUS.TOSS, STATUS.MATCH_STARTED, STATUS.MATCH_SCHEDULED].includes(
      ctx.status
    )
  ) {
    ctx.status = STATUS.MATCH_IN_PROGRESS;
  }

  if (!Array.isArray(inn.overs)) inn.overs = [];
  if (isSingleWicket(score)) {
    const last = inn.overs[inn.overs.length - 1];
    if (last?.ballCount >= 6) inn.overs.push(newOver(last.bowler));
  }
  if (!inn.overs.length) inn.overs.push(newOver(idOf(delivery.bowler)));

  const overIndex = inn.overs.length - 1;
  const currentOver = inn.overs[overIndex];
  if ((currentOver.ballCount || 0) > 5) {
    ctx.events.overComplete = true;
    return "Over finished. Kindly select a new bowler.";
  }

  const bowlerIndex = findIndex(inn.bowlers || [], delivery.bowler);
  if (bowlerIndex === -1) return "Please select the bowler before scoring.";
  const batsmanIndex = inn.strikerIndex;
  const striker = inn.batsman?.[batsmanIndex];
  if (!striker) return "Please select the batters before scoring.";
  const bowler = inn.bowlers[bowlerIndex];

  const { battingTeam } = teamsOf(score, inn);
  const squadSize = battingTeam?.players?.length;
  const partnership = inn.partnerships?.[inn.partnerships.length - 1];
  const partnerKey =
    idOf(partnership?.batsman1) === idOf(delivery.batsman)
      ? "batsman1"
      : idOf(partnership?.batsman2) === idOf(delivery.batsman)
      ? "batsman2"
      : null;

  const isWide = delivery.ballType === "wide";
  const isNoBall = delivery.ballType === "no-ball";
  const isMankad = delivery.ballType === "mankaded";
  const isByeRun = delivery.runType === "leg-bye" || delivery.runType === "bye";
  const extraRun =
    (isNoBall && ctx.config?.countNoBallRun) || (isWide && ctx.config?.countWideRun) ? 1 : 0;

  if ((isWide || isNoBall) && partnership) {
    partnership.totalRuns = (partnership.totalRuns || 0) + delivery.runs + extraRun;
  }

  delivery.bowler = delivery.bowler || bowler.playerId;
  delivery.batsman = delivery.batsman || striker.playerId;
  if (bowler.name && !delivery.bowlerName) delivery.bowlerName = bowler.name;
  if (striker.name && !delivery.batsmanName) delivery.batsmanName = striker.name;

  if (!Array.isArray(currentOver.balls)) currentOver.balls = [];
  currentOver.balls.push(delivery);

  if (!isWide && !isNoBall && !isMankad && !delivery.dontCountTheball) {
    currentOver.ballCount = (currentOver.ballCount || 0) + 1;
    bowler.balls = (bowler.balls || 0) + 1;
  }

  const ballsThisOver = currentOver.ballCount || 0;
  inn.totalOvers = `${overIndex + (ballsThisOver === 6 ? 1 : 0)}.${ballsThisOver === 6 ? 0 : ballsThisOver}`;

  if (delivery.runType === "bat" && !isWide && !isMankad) {
    striker.runs = toInt(striker.runs) + delivery.runs;
    striker.ballsFaced = (striker.ballsFaced || 0) + 1;
    if (partnership) {
      partnership.balls = (partnership.balls || 0) + 1;
      partnership.totalRuns = (partnership.totalRuns || 0) + delivery.runs;
      if (partnerKey) {
        partnership[partnerKey].balls = (partnership[partnerKey].balls || 0) + 1;
        partnership[partnerKey].runs = (partnership[partnerKey].runs || 0) + delivery.runs;
      }
    }
    if (delivery.isBoundary) {
      if (delivery.runs === 4) striker.fours = (striker.fours || 0) + 1;
      else if (delivery.runs === 6) striker.sixes = (striker.sixes || 0) + 1;
    }
  }

  if (delivery.isWicket) {
    let outIndex = findIndex(inn.batsman, delivery.actionBatsmen || delivery.batsman);
    if (outIndex === -1) outIndex = inn.strikerIndex ?? 0;
    const outBatter = inn.batsman[outIndex];

    if (!delivery.canBatAgain) inn.totalWickets = (inn.totalWickets || 0) + 1;
    if (outBatter) {
      outBatter.notOut = false;
      outBatter.dismissalInfo = delivery.dismissalInfo;
      if (delivery.canBatAgain) outBatter.canBatAgain = delivery.canBatAgain;
    }
    if (
      !isNoBall &&
      delivery.wicketType !== "Run Out" &&
      delivery.dismissalInfo?.dismissalType !== "run-out" &&
      !delivery.canBatAgain
    ) {
      bowler.wicketsTaken = (bowler.wicketsTaken || 0) + 1;
    }
    if (!Array.isArray(inn.fallOfWickets)) inn.fallOfWickets = [];
    inn.fallOfWickets.push({
      batsman: { playerId: outBatter?.playerId, name: outBatter?.name },
      bowler: { playerId: bowler.playerId, name: bowler.name },
      teamRuns: inn.totalRuns || 0,
      teamOvers: inn.totalOvers || "0.0",
    });

    const wickets = inn.totalWickets || 0;
    const singleBatsman = Boolean(ctx.config?.singleBatsmanAllowed);
    if (singleBatsman && wickets === squadSize - 1) {
      inn.batsman.forEach((b, idx) => {
        if (b.notOut) {
          b.isStrikeEnd = true;
          inn.strikerIndex = idx;
        }
      });
    }

    const superOver = Boolean(inn.isSuperOver || ctx.status === STATUS.SUPER_OVER);
    const allOut =
      (singleBatsman && squadSize === wickets) ||
      (!singleBatsman && squadSize === wickets + 1) ||
      wickets === 10 ||
      (superOver && wickets >= 2);
    if (allOut) {
      if (test) {
        endTestInnings(ctx);
      } else {
        ctx.status =
          n % 2 === 1
            ? superOver
              ? STATUS.SUPER_OVER
              : STATUS.INNINGS_I_ENDED
            : STATUS.MATCH_COMPLETED;
        if (n % 2 === 0) {
          decideChase(ctx, {
            runs: inn.totalRuns || 0,
            lastRuns: score[`innings_${n - 1}`]?.totalRuns || 0,
            wicketsLeft: (superOver ? 2 : Math.min(squadSize || 10, 10)) - wickets,
          });
        }
        if (ctx.status === STATUS.INNINGS_I_ENDED || (ctx.status === STATUS.SUPER_OVER && n % 2 === 1)) {
          ctx.events.inningsComplete = true;
        }
      }
    }
  }

  if (!isByeRun) {
    bowler.runsGiven = (bowler.runsGiven || 0) + delivery.runs + extraRun;
  } else {
    inn.extras = (inn.extras || 0) + delivery.runs;
    if (!isMankad) striker.ballsFaced = (striker.ballsFaced || 0) + 1;
    if (partnership) partnership.totalRuns = (partnership.totalRuns || 0) + delivery.runs;
  }

  if (delivery.runs % 2 !== 0 && !delivery.isWicket) strikeChange(ctx);

  inn.totalRuns = (inn.totalRuns || 0) + delivery.runs + extraRun;
  inn.extras = (inn.extras || 0) + (isWide ? extraRun + delivery.runs : extraRun);

  if (ballsThisOver === 6) {
    const bowlerRuns = currentOver.balls.reduce((total, b) => {
      if (b.runType === "leg-bye" || b.runType === "bye") return total;
      return total + (b.runs || 0) + (b.ballType === "wide" || b.ballType === "no-ball" ? 1 : 0);
    }, 0);
    if (bowlerRuns === 0) bowler.maidens = (bowler.maidens || 0) + 1;

    const superOver = Boolean(inn.isSuperOver || ctx.status === STATUS.SUPER_OVER);
    const maxOvers = inn.inningTotalOver || (superOver ? 1 : ctx.matchOvers);
    if (!test && maxOvers && overIndex >= maxOvers - 1) {
      ctx.status =
        n % 2 === 1
          ? superOver
            ? STATUS.SUPER_OVER
            : STATUS.INNINGS_I_ENDED
          : STATUS.MATCH_COMPLETED;
      if (n % 2 === 0) {
        decideChase(ctx, {
          runs: inn.totalRuns,
          lastRuns: score[`innings_${n - 1}`]?.totalRuns || 0,
          wicketsLeft: Math.min(squadSize || 10, 10) - (inn.totalWickets || 0),
          verb: "win", // the server's wording when the overs run out
        });
      }
      if (ctx.status === STATUS.INNINGS_I_ENDED || (ctx.status === STATUS.SUPER_OVER && n % 2 === 1)) {
        ctx.events.inningsComplete = true;
      }
    } else {
      strikeChange(ctx);
      ctx.events.overComplete = true;
    }
  }

  // The chasing side goes past the target.
  if (!test && n % 2 === 0 && inn.totalRuns > (score[`innings_${n - 1}`]?.totalRuns || 0)) {
    const singleBatsman = Boolean(ctx.config?.singleBatsmanAllowed);
    ctx.status = STATUS.MATCH_COMPLETED;
    ctx.matchResult = {
      winningTeam: inn.battingTeam,
      prompt: `${battingTeam?.title} won by ${
        Math.min(singleBatsman ? squadSize : squadSize - 1, singleBatsman ? 11 : 10) -
        (inn.totalWickets || 0)
      } wickets`,
    };
    ctx.events.overComplete = false;
  }

  delivery.totalRuns = inn.totalRuns;
  delivery.currentOver = inn.totalOvers;
  return null;
}

// A Test innings ends all out (or declared). Whether that also decides the
// match depends on leads the server works out; here the innings just closes.
function endTestInnings(ctx) {
  ctx.inn.isCompleted = true;
  if (ctx.n >= TEST_INNINGS) {
    ctx.status = STATUS.MATCH_COMPLETED;
  } else {
    ctx.status = STATUS.INNINGS_I_ENDED;
    ctx.events.inningsComplete = true;
  }
}

function endOfInnings(ctx, data = {}) {
  const { score, inn, n } = ctx;
  if (isTest(score)) return "UNSUPPORTED";

  if (n % 2 === 1) {
    const { bowlingTeam } = teamsOf(score, inn);
    const next = n + 1;
    ctx.nextInnings = {
      number: next,
      data: newInnings(score[`innings_${next}`], {
        battingTeam: teamIdOf(bowlingTeam),
        isSuperOver: Boolean(inn.isSuperOver),
        ...(inn.inningTotalOver ? { inningTotalOver: inn.inningTotalOver } : {}),
      }),
    };
    ctx.status = inn.isSuperOver ? STATUS.SUPER_OVER : STATUS.INNINGS_I_ENDED;
    ctx.events.inningsStart = true;
    return null;
  }

  ctx.status = STATUS.MATCH_COMPLETED;
  if (data?.isMatchEndedByCommittee) {
    ctx.matchResult = {
      ...(ctx.matchResult || {}),
      winningTeam: data.winnerTeamId,
      isMatchEndedByCommittee: true,
      ...(data.prompt ? { prompt: data.prompt } : {}),
    };
  }
  return null;
}

function startSuperOver(ctx) {
  const { score, inn, n } = ctx;
  if (isTest(score) || isSingleWicket(score)) return "UNSUPPORTED";
  ctx.nextInnings = {
    number: n + 1,
    data: newInnings(score[`innings_${n + 1}`], {
      battingTeam: inn.battingTeam,
      isSuperOver: true,
      inningTotalOver: 1,
    }),
  };
  ctx.status = STATUS.SUPER_OVER;
  ctx.events.inningsStart = true;
  return null;
}

// ─── View fields (mirrors createMatchScore) ──────────────────────────────────

const ballPreview = (over) =>
  (over?.balls || []).map((b) => {
    let text = b?.runs ? `${b.runs}` : "";
    if (b?.ballType === "wide") text += "wd";
    else if (b?.ballType === "no-ball") text += "nb";
    if (b?.runType === "bye") text += "b";
    else if (b?.runType === "leg-bye") text += "lb";
    if (b?.isWicket) text += "w";
    return text || 0;
  });

function bowlerFigures(overs, bowlerId) {
  let totalBall = 0;
  let maidens = 0;
  overs.forEach((over) => {
    if (String(over?.bowler) !== String(bowlerId)) return;
    let isMaiden = true;
    (over.balls || []).forEach((b) => {
      if (b?.ballType === "ball") totalBall++;
      if (b?.runs > 0) isMaiden = false;
    });
    if (isMaiden && over.balls?.length) maidens++;
  });
  const whole = Math.floor(totalBall / 6);
  return { maiden: totalBall > 5 ? maidens : 0, over: `${whole}.${totalBall - whole * 6}` };
}

function currentBowler(inn) {
  const overs = inn?.overs || [];
  const over = overs[overs.length - 1];
  if (!over) return inn?.bowlers?.[0] || {};
  const bowlerId = over.bowler ?? over.balls?.[0]?.bowler ?? "";
  if (bowlerId === "") return {};
  const bowler = {
    ...(inn.bowlers || []).find((b) => idOf(b) === String(bowlerId)),
    isBowlingCurrentOver: over.ballCount < 6,
    ...bowlerFigures(overs, bowlerId),
  };
  return { ...bowler, eco: (bowler.runsGiven / bowler.over)?.toFixed(2) };
}

function inningsView(score, inn) {
  const { battingTeam, bowlingTeam } = teamsOf(score, inn);
  const batsmen = inn?.batsman || [];

  const batting = {
    battingTeam: battingTeam?.title,
    battingId: teamIdOf(battingTeam) || undefined,
    score: {
      runs: inn?.totalRuns || 0,
      wicket: inn?.totalWickets || 0,
      over: inn?.totalOvers || "0.0",
    },
  };
  if (parseFloat(inn?.totalOvers) > 0) {
    batting.score.CRR = runRate(toInt(inn.totalRuns), inn.totalOvers);
    const overs = Number(inn.inningTotalOver || score.matchTotalOver || 0);
    if (overs > 0) {
      batting.score.projectedScore = Math.round(parseFloat(batting.score.CRR || 0) * overs);
    }
  }

  const batsman = [];
  batsmen.forEach((player, idx) => {
    if (!isActive(player)) return;
    batsman.push({
      ...player,
      isStrikeEnd:
        inn.strikerIndex !== undefined ? idx === inn.strikerIndex : Boolean(player.isStrikeEnd),
      sr: strikeRate(player.runs, player.ballsFaced),
    });
  });
  if (batsman.length && !batsman.some((b) => b.isStrikeEnd)) batsman[0].isStrikeEnd = true;
  // Keep the two batters where the scorer last saw them (see
  // pointIndexesAtStriker: the raw order isn't always the batting order).
  const shownAt = (b) => {
    const idx = (score.batsman || []).findIndex((prev) => idOf(prev) === idOf(b));
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  batsman.sort((a, b) => shownAt(a) - shownAt(b));

  const playedBatsman = batsmen.map((p) => ({ ...p, sr: strikeRate(p.runs, p.ballsFaced) }));
  const batsmanUpcoming = (battingTeam?.players || [])
    .filter(
      (player) =>
        !playedBatsman.some((b) => (b.canBatAgain ? false : idOf(b) === String(player?.id)))
    )
    .map((player) => ({ ...player, playerId: player?.id }));

  return {
    batting,
    batsman,
    playedBatsman,
    batsmanUpcoming,
    partnerships: inn?.partnerships?.[inn.partnerships.length - 1],
    fallOfWickets: inn?.fallOfWickets || [],
    bowler: currentBowler(inn),
    bowlingTeamName: bowlingTeam?.title,
    extras: inn?.extras || 0,
    overs: inn?.overs,
  };
}

function rebuildScore(score, ctx) {
  const next = { ...score };
  const n = ctx.nextInnings?.number || ctx.n;
  const inn = ctx.nextInnings?.data || ctx.inn;

  next[`innings_${ctx.n}`] = ctx.inn;
  if (ctx.nextInnings) next[`innings_${n}`] = inn;

  const view = inningsView(next, inn);
  const overs = inn?.overs || [];

  next.currentInnings = n;
  next.matchCurrentStatus = ctx.status;
  next.batting = { ...(score.batting || {}), ...view.batting };
  next.batsman = view.batsman;
  next.playedBatsman = view.playedBatsman;
  next.batsmanUpcoming = view.batsmanUpcoming;
  next.partnerships = view.partnerships;
  next.fallOfWickets = view.fallOfWickets;
  next.bowler = view.bowler;
  next.bowling = { ...(ctx.nextInnings ? {} : score.bowling || {}), teamName: view.bowlingTeamName };
  next.currentInningWicket = inn?.totalWickets;
  next.isSuperOver = Boolean(inn?.isSuperOver);
  next.currentOver = ballPreview(overs[overs.length - 1]);
  next.recentOvers = overs
    .slice(-5)
    .map((over, idx) => ({ over: Math.max(0, overs.length - 5) + idx + 1, balls: over?.balls || [] }))
    .reverse();
  next.overs = overs;
  next.extras = view.extras;
  if (ctx.matchResult?.prompt) {
    next.matchResult = {
      ...ctx.matchResult,
      prompt: ctx.matchResult.prompt.replace(/\bby 1 (wicket|run)s\b/, "by 1 $1"),
    };
  }
  if (ctx.isMatchTied !== undefined) next.isMatchTied = ctx.isMatchTied;

  if (isTest(next)) {
    next.isInningsCompleted = Boolean(inn?.isCompleted);
  } else if (ctx.nextInnings) {
    // A new innings: its overs limit, and the target if it's a chase.
    next.totalOvers = inn?.inningTotalOver || score.matchTotalOver || score.totalOvers;
    delete next.lastInningScore;
    delete next.lastInningWickets;
    delete next.target;
    if (n % 2 === 0) {
      const last = next[`innings_${n - 1}`];
      next.lastInningScore = last?.totalRuns || 0;
      next.lastInningWickets = last?.totalWickets || 0;
      next.target = next.lastInningScore + 1;
    }
  }

  // Written by the server from data this file doesn't recompute.
  next.description = "";
  next.prompt = [];

  if (Array.isArray(score.inning)) {
    next.inning = [...score.inning];
    next.inning[n - 1] = {
      ...(ctx.nextInnings ? {} : next.inning[n - 1] || {}),
      batting: next.batting,
      batsman: next.batsman,
      playedBatsman: next.playedBatsman,
      bowler: next.bowler,
      fallOfWickets: next.fallOfWickets,
      overs,
      extras: next.extras,
    };
  }

  next.isOfflinePreview = true;
  return next;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Whether this score carries the raw innings the engine works on. */
export function canPreviewOffline(score) {
  const n = score?.currentInnings || 1;
  return Boolean(score && score[`innings_${n}`] && Array.isArray(score.teams));
}

/**
 * Call on every score received from the server, before it is shown or used as
 * the base for queued actions: fixes the striker indexes of the current
 * innings (see pointIndexesAtStriker) while `score.batsman` is still the
 * server's own.
 */
export function prepareServerScore(score) {
  if (!canPreviewOffline(score) || score.isOfflinePreview || score.strikeIndexChecked) return score;
  const key = `innings_${score.currentInnings || 1}`;
  const inn = { ...score[key], batsman: (score[key].batsman || []).map((b) => ({ ...b })) };
  pointIndexesAtStriker(inn, score);
  return { ...score, [key]: inn, strikeIndexChecked: true };
}

/**
 * Applies one scoring action to `score` and returns the new score.
 *
 * - `error`: the action isn't valid right now (same checks the server makes)
 *   — it should not be queued.
 * - `unsupported`: the action is fine to queue, but its effect can't be shown
 *   until the server has applied it.
 * - `events`: what the server would have announced over the socket
 *   (`overComplete`, `inningsComplete`, `inningsStart`).
 */
export function applyAction(score, action, data = {}) {
  const events = {};
  if (!canPreviewOffline(score)) return { score, events, unsupported: true };

  const n = score.currentInnings || 1;
  const ctx = {
    score,
    n,
    inn: clone(score[`innings_${n}`]),
    status: score.matchCurrentStatus,
    matchResult: score.matchResult,
    config: score.matchConfig || {},
    matchOvers: Number(score.matchTotalOver || score.totalOvers || 0),
    events,
  };
  if (!score.isOfflinePreview && !score.strikeIndexChecked) pointIndexesAtStriker(ctx.inn, score);

  let error = null;
  switch (action) {
    case ACTION.MATCH_BALL:
      error = ball(ctx, data);
      break;
    case ACTION.BATSMAN_SELECTED:
      error = selectBatsman(ctx, data);
      break;
    case ACTION.BOWLER_SELECTED:
      error = selectBowler(ctx, data);
      break;
    case ACTION.CHANGE_STRIKE:
      strikeChange(ctx, data);
      break;
    case ACTION.MATCH_START:
      error = startInnings(ctx, data);
      break;
    case ACTION.END_OF_INNINGS:
      error = endOfInnings(ctx, data);
      break;
    case ACTION.SUPER_OVER:
      error = startSuperOver(ctx);
      break;
    case ACTION.MATCH_TIE:
      ctx.isMatchTied = true;
      ctx.status = STATUS.MATCH_ENDED;
      break;
    case ACTION.END_OF_MATCH:
      if (ctx.status !== STATUS.MATCH_COMPLETED) return { score, events, unsupported: true };
      ctx.status = STATUS.MATCH_ENDED;
      break;
    default:
      return { score, events, unsupported: true };
  }

  if (error === "UNSUPPORTED") return { score, events, unsupported: true };
  if (error) return { score, events, error };
  return { score: rebuildScore(score, ctx), events };
}

/**
 * Cancels each queued UNDO against the ball it undoes, so the rest can be
 * replayed in order. An undo with no queued ball before it refers to a ball
 * the server already has; those are counted in `unresolvedUndos`.
 */
export function resolveUndos(items = []) {
  const kept = [];
  let unresolvedUndos = 0;
  items.forEach((item) => {
    if (item?.action !== ACTION.UNDO_LAST_BALL) {
      kept.push(item);
      return;
    }
    let ballIndex = -1;
    for (let i = kept.length - 1; i >= 0; i--) {
      if (kept[i].action === ACTION.MATCH_BALL) {
        ballIndex = i;
        break;
      }
    }
    if (ballIndex === -1) {
      unresolvedUndos++;
      kept.push(item);
    } else {
      kept.length = ballIndex;
    }
  });
  return { items: kept, unresolvedUndos };
}

/**
 * The score the scorer should see: the last score from the server plus every
 * queued action that hasn't reached it yet.
 */
export function replayQueue(baseScore, queue = []) {
  let score = baseScore;
  let events = {};
  let unsupported = 0;
  const { items, unresolvedUndos } = resolveUndos(queue.filter((item) => !item?.localSkip));
  items.forEach((item) => {
    const result = applyAction(score, item.action, item.data);
    if (result.unsupported || result.error) {
      unsupported++;
      return;
    }
    score = result.score;
    events = result.events;
  });
  return { score, events, unsupported: unsupported + unresolvedUndos };
}

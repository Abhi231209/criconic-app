/**
 * Criconic Algorithmic Player Hype Line & Badge Generator
 * 
 * Generates compelling, cricket-smart punchlines and encouraging performance badges
 * based on match data and player career stats.
 * Always positive, uplifting, and role-appropriate — never negative.
 */

export function getPlayerPerformanceBadge({ player, isMom }) {
  if (isMom) {
    return {
      label: "PLAYER OF THE MATCH",
      icon: "trophy",
      badgeClass: "bg-amber-950/80 border-amber-500/60",
      textClass: "text-amber-200",
      backgroundColor: "rgba(120, 53, 15, 0.4)",
      borderColor: "rgba(245, 158, 11, 0.8)",
      textColor: "#FEF08A",
      iconColor: "#F59E0B",
    };
  }

  const runs = Number(player?.runs ?? player?.batting?.runs ?? 0);
  const balls = Number(player?.ballsFaced ?? player?.balls ?? player?.batting?.balls ?? 0);
  const sr = Number(player?.sr ?? (balls > 0 ? (runs / balls) * 100 : 0));
  const isNotOut = Boolean(player?.notOut || player?.isNotOut);

  const wickets = Number(player?.wicketsTaken ?? player?.wickets ?? player?.bowling?.wickets ?? 0);
  const overs = String(player?.over ?? player?.overs ?? player?.bowling?.overs ?? "0");
  const parsedOvers = parseFloat(overs) || 0;
  const eco = Number(player?.eco ?? player?.economy ?? 0);

  // 1. All-Round Performance
  if (runs >= 20 && wickets >= 1) {
    return {
      label: "ALL-ROUND IMPACT",
      icon: "flash",
      badgeClass: "bg-purple-950/80 border-purple-500/60",
      textClass: "text-purple-200",
      backgroundColor: "rgba(88, 28, 135, 0.4)",
      borderColor: "rgba(192, 132, 252, 0.8)",
      textColor: "#F3E8FF",
      iconColor: "#C084FC",
    };
  }

  // 2. High Batting Score
  if (runs >= 50) {
    return {
      label: sr >= 150 ? "BLITZKRIEG BATTER" : "TOP RUN SCORER",
      icon: "flame",
      badgeClass: "bg-rose-950/80 border-rose-500/60",
      textClass: "text-rose-200",
      backgroundColor: "rgba(136, 19, 55, 0.4)",
      borderColor: "rgba(251, 113, 133, 0.8)",
      textColor: "#FFE4E6",
      iconColor: "#FB7185",
    };
  }
  if (runs >= 25) {
    if (isNotOut) {
      return {
        label: "CLUTCH FINISHER",
        icon: "shield-checkmark",
        badgeClass: "bg-emerald-950/80 border-emerald-500/60",
        textClass: "text-emerald-200",
        backgroundColor: "rgba(6, 78, 59, 0.4)",
        borderColor: "rgba(52, 211, 153, 0.8)",
        textColor: "#D1FAE5",
        iconColor: "#34D399",
      };
    }
    return {
      label: "IMPACT BATTER",
      icon: "baseball-outline",
      badgeClass: "bg-teal-950/80 border-teal-500/60",
      textClass: "text-teal-200",
      backgroundColor: "rgba(19, 78, 74, 0.4)",
      borderColor: "rgba(45, 212, 191, 0.8)",
      textColor: "#CCFBF1",
      iconColor: "#2DD4BF",
    };
  }

  // 3. High Bowling Impact
  if (wickets >= 3) {
    return {
      label: "STRIKE WICKET HUNTER",
      icon: "flash-outline",
      badgeClass: "bg-red-950/80 border-red-500/60",
      textClass: "text-red-200",
      backgroundColor: "rgba(127, 29, 29, 0.4)",
      borderColor: "rgba(248, 113, 113, 0.8)",
      textColor: "#FEE2E2",
      iconColor: "#F87171",
    };
  }
  if (wickets >= 1) {
    return {
      label: parsedOvers >= 2 && eco <= 6.0 ? "LOCKDOWN SPECIALIST" : "BREAKTHROUGH BOWLER",
      icon: "speedometer-outline",
      badgeClass: "bg-cyan-950/80 border-cyan-500/60",
      textClass: "text-cyan-200",
      backgroundColor: "rgba(22, 78, 99, 0.4)",
      borderColor: "rgba(34, 211, 238, 0.8)",
      textColor: "#CFFAFE",
      iconColor: "#22D3EE",
    };
  }
  if (parsedOvers >= 2 && eco <= 6.0) {
    return {
      label: "ECONOMY DISCIPLINE",
      icon: "lock-closed-outline",
      badgeClass: "bg-blue-950/80 border-blue-500/60",
      textClass: "text-blue-200",
      backgroundColor: "rgba(30, 58, 138, 0.4)",
      borderColor: "rgba(96, 165, 250, 0.8)",
      textColor: "#DBEAFE",
      iconColor: "#60A5FA",
    };
  }

  // 4. Developing / Encouraging Badges (Uplifting & Positive)
  if (runs >= 10) {
    return {
      label: "RISING BATTER",
      icon: "trending-up-outline",
      badgeClass: "bg-amber-950/80 border-amber-500/60",
      textClass: "text-amber-200",
      backgroundColor: "rgba(120, 53, 15, 0.35)",
      borderColor: "rgba(251, 191, 36, 0.75)",
      textColor: "#FEF3C7",
      iconColor: "#FBBF24",
    };
  }

  if (parsedOvers > 0) {
    return {
      label: "BOWL SPELL WORKHORSE",
      icon: "hardware-chip-outline",
      badgeClass: "bg-indigo-950/80 border-indigo-500/60",
      textClass: "text-indigo-200",
      backgroundColor: "rgba(49, 46, 129, 0.45)",
      borderColor: "rgba(129, 140, 248, 0.75)",
      textColor: "#E0E7FF",
      iconColor: "#A5B4FC",
    };
  }

  return {
    label: "TEAM WARRIOR",
    icon: "shield-outline",
    badgeClass: "bg-slate-800/80 border-slate-500/60",
    textClass: "text-slate-200",
    backgroundColor: "rgba(51, 65, 85, 0.45)",
    borderColor: "rgba(148, 163, 184, 0.75)",
    textColor: "#F1F5F9",
    iconColor: "#CBD5E1",
  };
}

export function generatePlayerHypeLines({
  player,
  matchData,
  careerStats,
  isMom,
  isWinner,
}) {
  const name = player?.name || player?.username || "Player";
  const firstName = name.split(" ")[0] || name;

  // Batting stats
  const runs = Number(player?.runs ?? player?.batting?.runs ?? 0);
  const balls = Number(player?.ballsFaced ?? player?.balls ?? player?.batting?.balls ?? 0);
  const fours = Number(player?.fours ?? player?.batting?.fours ?? 0);
  const sixes = Number(player?.sixes ?? player?.batting?.sixes ?? 0);
  const isNotOut = Boolean(player?.notOut || player?.isNotOut);
  const sr = Number(
    player?.sr ?? (balls > 0 ? ((runs / balls) * 100).toFixed(1) : 0)
  );

  // Bowling stats
  const wickets = Number(
    player?.wicketsTaken ?? player?.wickets ?? player?.bowling?.wickets ?? 0
  );
  const overs = String(player?.over ?? player?.overs ?? player?.bowling?.overs ?? "0");
  const runsGiven = Number(
    player?.runsGiven ?? player?.runsConceded ?? player?.bowling?.runsConceded ?? 0
  );
  const eco = Number(
    player?.eco ?? player?.economy ?? (overs && parseFloat(overs) > 0 ? (runsGiven / parseFloat(overs)).toFixed(2) : 0)
  );
  const maidens = Number(player?.maiden ?? player?.maidens ?? 0);

  // Career stats
  const careerMatches = Number(
    careerStats?.matches ?? careerStats?.totalMatches ?? careerStats?.matchesPlayed ?? 0
  );
  const careerRuns = Number(careerStats?.runs ?? careerStats?.totalRuns ?? 0);
  const careerWkts = Number(careerStats?.wickets ?? careerStats?.totalWickets ?? 0);

  const lines = [];

  // 1. REAL Player of the Match Highlights
  if (isMom) {
    lines.push(
      `Crowned Player of the Match! A legendary display of poise, grit, and match-winning pedigree.`,
      `The heart & soul of today's triumph! Stepped onto the big stage and delivered a masterclass for the ages.`,
      `Peak match-winner! When the stakes were highest, ${firstName} rose above and seized glory.`
    );
  }

  // 2. All-Round Brilliance (Bat + Ball)
  if (runs >= 20 && wickets >= 2) {
    lines.push(
      `Master of both halves of the pitch! Bludgeoned ${runs} runs and dismantled the opposition with ${wickets} wickets.`,
      `The ultimate all-round weapon! Leading the charge with willow in hand and leather on the turf.`,
      `Dual-threat dominance! Single-handedly tilted the contest with an elite all-round spectacle.`
    );
  }

  // 3. Batting: Century or Massive Knock (75+)
  if (runs >= 75) {
    lines.push(
      `Pure batting wizardry! An immaculate ${runs}${isNotOut ? "*" : ""} of breathtaking authority and class.`,
      `Stands tall as a batting colossus! Tore the opposition attack apart stroke by stroke.`,
      `A master at work — carving out an unforgettable ${runs} runs that will echo through Criconic folklore.`
    );
  }

  // 4. Batting: Blitzkrieg / High Strike Rate Fifty (50+ runs @ SR > 150)
  else if (runs >= 50 && sr >= 150) {
    lines.push(
      `Carnage unleashed! Ripped the bowling attack to shreds with a blistering ${runs}${isNotOut ? "*" : ""} at a strike rate of ${sr}!`,
      `The Chase Master in imperious touch! Dispatched every bowler to the ropes with ruthless swagger.`,
      `Maximum devastation! ${sixes} sixes and ${fours} fours of pure unadulterated fireworks!`
    );
  }

  // 5. Batting: Anchoring / Clutch Fifty (50+ runs)
  else if (runs >= 50) {
    lines.push(
      `A captain's knock! Anchored the entire innings with nerves of steel and unmatched determination.`,
      `The impenetrable fortress! Weathered the early storm and crafted a match-defining ${runs} runs.`,
      `Class is permanent! Solid technique combined with calculated aggression to deliver when it mattered.`
    );
  }

  // 6. Batting: Explosive Cameo / Death Overs Fireworks (20-45 runs @ SR > 175)
  else if (runs >= 20 && sr >= 175) {
    lines.push(
      `Came, saw, conquered! An electric ${runs}${isNotOut ? "*" : ""} off just ${balls} balls that flipped match momentum in minutes!`,
      `Pure adrenaline at the death! Bludgeoning runs at a supersonic strike rate of ${sr}.`,
      `Impact player of the highest order — delivering instant fireworks and clutch momentum.`
    );
  }

  // 7. Batting: Unbeaten Finisher (notOut && runs >= 20)
  else if (isNotOut && runs >= 20) {
    lines.push(
      `Ice in the veins! Cool, calculated, and unbeaten till the final ball to seal the day.`,
      `The ultimate finisher! Stepped up under pressure and steered the team home with a composed ${runs}*.`,
      `Unconquered at the crease — leading from the front with surgical precision.`
    );
  }

  // 8. Bowling: 4+ Wickets or Fifer (4+ wickets)
  if (wickets >= 4) {
    lines.push(
      `A lethal wrecking ball! Ripped the heart out of the batting order with a devastating ${wickets}-wicket haul!`,
      `Unplayable bowling masterclass! Hunting wickets at will and shattering the opposition's spine.`,
      `Pure pace, swing & venom! Tore through the lineup with an unforgettable ${wickets}/${runsGiven} spell.`
    );
  }

  // 9. Bowling: 3 Wickets with Low Economy
  else if (wickets >= 3) {
    lines.push(
      `Pinpoint sniper! Struck ${wickets} times and suffocated the chase with deadly precision.`,
      `Bowling gold! Broke critical partnerships right when the game hung on a knife's edge.`,
      `A spellbinding exhibition of line, length & guile — claiming ${wickets} vital breakthroughs!`
    );
  }

  // 10. Bowling: Lockdown Artist (Eco <= 5.5 with 2+ overs)
  else if (parseFloat(overs) >= 2 && eco <= 5.5) {
    lines.push(
      `The lockdown artist! Strangled the scoring rate with an ironclad economy of ${eco} RPO.`,
      `Gave nothing away! Bowled with laser discipline to apply maximum chokehold on the batters.`,
      `A miserly, game-turning spell of ${overs} overs — putting on a clinic in pressure bowling.`
    );
  }

  // 11. Career Stats Integration (History)
  if (careerMatches >= 15 && careerRuns >= 200) {
    lines.push(
      `Adding another feather to an illustrious career record of ${careerRuns} runs across ${careerMatches} matches!`,
      `Consistency is ${firstName}'s trademark — proving once again why he's a veteran cornerstone of the league.`
    );
  }
  if (careerMatches >= 10 && careerWkts >= 15) {
    lines.push(
      `A proven strike weapon with ${careerWkts} career wickets — delivering when the stakes are highest!`,
      `Experienced campaigner whose bowling pedigree shines through on every big occasion.`
    );
  }

  // 12. Developing / Encouraging Spirit (Always uplifting, inspiring & focused on progress)
  if (lines.length === 0) {
    if (runs >= 10) {
      lines.push(
        `Promising touch! Showed great temperament and intent, setting the stage for bigger innings ahead.`,
        `Grit in every stroke! Stepped up under pressure with determined focus and hustle.`,
        `Rising talent on the move — fine-tuning the craft and contributing valuable momentum!`
      );
    } else if (wickets >= 1) {
      lines.push(
        `Crucial breakthrough artist! Struck with precision to disrupt the opposition's rhythm.`,
        `Kept the heat on! Bowled with relentless energy and created decisive chances.`,
        `Heart of a warrior — executing plans with fire and backing up the squad.`
      );
    } else if (parseFloat(overs) > 0) {
      lines.push(
        `Stepped up for the team attack — testing batters with tight lines and relentless hustle.`,
        `Gave 100% effort with the cherry — building pressure and backing the team in the field.`,
        `Workhorse mentality! Taking on tough overs with courage and building match sharpness.`
      );
    } else {
      lines.push(
        `Heart, hustle, and unwavering commitment — giving everything for the pride of the jersey!`,
        `A true team fighter — bringing immense energy, discipline, and support to the squad.`,
        `Every match is a stepping stone — sharpening instincts and ready to explode in the next contest!`
      );
    }
  }

  // Deduplicate and return
  return Array.from(new Set(lines));
}

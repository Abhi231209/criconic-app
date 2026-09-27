/**
 * Criconic Algorithmic Player Hype Line Generator
 * 
 * Generates compelling, cricket-smart punchlines and praise lines for a player
 * based on their specific performance in a match combined with their career history.
 */

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
  const careerSr = Number(careerStats?.sr ?? careerStats?.strikeRate ?? 0);

  const lines = [];

  // 1. Player of the Match Highlights
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

  // 12. Solid Fighting Spirit Fallbacks
  if (lines.length === 0) {
    if (runs > 0) {
      lines.push(
        `Fought valiantly for every single run — leaving heart and soul out on the pitch.`,
        `Committed warrior! Stepped up to make every delivery count for the team.`,
        `Pure determination and team-first ethos on full display today!`
      );
    } else if (wickets > 0) {
      lines.push(
        `Bowled with tremendous fire and grit to bag crucial breakthroughs!`,
        `Gave everything for the badge — maintaining tight lines and probing lengths.`,
        `Crucial contributor who kept the contest alive with relentless energy.`
      );
    } else {
      lines.push(
        `Heart, hustle, and unwavering commitment — giving 100% for the team on the field!`,
        `An indispensable presence whose energy and fight lifted the entire squad.`,
        `A true team player ready to fight for every ball and support the badge.`
      );
    }
  }

  // Deduplicate and return
  return Array.from(new Set(lines));
}

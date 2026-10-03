import React, { forwardRef, useMemo } from "react";
import WagonWheel from "./WagonWheel";
import ShareCardFrame, { ShareCardBars } from "./ShareCardFrame";

// Runs per zone for the shots on the wheel, biggest first.
const getTopZones = (shots) => {
  const zones = {};
  shots.forEach((shot) => {
    const ww = shot.wagonWheel || shot;
    const name = ww.zoneName;
    if (!name) return;
    const runs = Number(shot.runs ?? ww.runs ?? 0);
    zones[name] = zones[name] || { name, value: 0, balls: 0 };
    zones[name].value += runs;
    zones[name].balls += 1;
  });
  return Object.values(zones)
    .filter((zone) => zone.value > 0)
    .sort((a, b) => b.value - a.value || b.balls - a.balls)
    .slice(0, 3);
};

// The image shared from the wagon wheel viewer: a batter's shots, their
// figures and their best scoring zones.
const WagonShareCard = forwardRef(function WagonShareCard(
  { playerName = "", shots = [], isBoxCricket = false, batterStance = "RHB", ...frame },
  ref
) {
  const topZones = useMemo(() => getTopZones(shots), [shots]);

  return (
    <ShareCardFrame
      ref={ref}
      tag="WAGON WHEEL"
      playerName={playerName || "All Batters"}
      {...frame}
    >
      <WagonWheel
        readOnly
        size={250}
        title={`${shots.length} ${shots.length === 1 ? "shot" : "shots"} tracked`}
        historicalShots={shots}
        isDarkMode
        isBoxCricket={isBoxCricket}
        batterStance={batterStance}
      />
      <ShareCardBars title="TOP SCORING ZONES" rows={topZones} />
    </ShareCardFrame>
  );
});

export default WagonShareCard;

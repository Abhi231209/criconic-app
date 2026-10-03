import React, { forwardRef } from "react";
import PitchMap, { LENGTH_ZONES } from "./PitchMap";
import ShareCardFrame, { ShareCardBars } from "./ShareCardFrame";

// The image shared from the pitch map viewer: where a bowler landed the
// ball, their figures and how many balls they bowled at each length.
// lengthCounts: { Yorker: n, Full: n, "Good Length": n, Short: n, Bouncer: n }
const PitchShareCard = forwardRef(function PitchShareCard(
  { playerName = "", pitches = [], lengthCounts = {}, batterStance = "RHB", ...frame },
  ref
) {
  const lengths = LENGTH_ZONES.map((zone) => ({
    name: zone.name,
    value: lengthCounts[zone.name] || 0,
    color: zone.color,
  })).filter((row) => row.value > 0);

  return (
    <ShareCardFrame
      ref={ref}
      tag="PITCH MAP"
      playerName={playerName || "All Bowlers"}
      {...frame}
    >
      <PitchMap
        readOnly
        width={250}
        height={300}
        title={`${pitches.length} ${pitches.length === 1 ? "ball" : "balls"} tracked`}
        historicalPitches={pitches}
        isDarkMode
        batterStance={batterStance}
      />
      <ShareCardBars title="LENGTHS BOWLED" rows={lengths} />
    </ShareCardFrame>
  );
});

export default PitchShareCard;

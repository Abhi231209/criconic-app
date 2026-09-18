import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";

export const getRecentOversFromScore = (scoreData) => {
  if (!scoreData) return [];

  // Always normalize overs to oldest -> newest
  const normalizeOvers = (overs) => {
    if (!Array.isArray(overs) || overs.length === 0) {
      return [];
    }

    return overs
      .map((o, idx) => {
        if (Array.isArray(o)) {
          return {
            over: idx + 1,
            balls: o,
          };
        }

        if (Array.isArray(o?.balls)) {
          return {
            over: Number(
              o.over ??
                o.overNumber ??
                o.overNo ??
                idx + 1
            ),
            balls: o.balls,
          };
        }

        if (Array.isArray(o?.deliveries)) {
          return {
            over: Number(
              o.over ??
                o.overNumber ??
                o.overNo ??
                idx + 1
            ),
            balls: o.deliveries,
          };
        }

        return null;
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          Number(a.over) - Number(b.over)
      )
      .slice(-8);
  };

  // =========================================================
  // 1. Direct overs
  // =========================================================

  const currentInn =
    scoreData?.currentInnings ||
    scoreData?.currentInning ||
    1;

  const innObj =
    scoreData?.score?.[`innings_${currentInn}`] ||
    scoreData?.[`innings_${currentInn}`] ||
    scoreData?.score?.innings_1 ||
    scoreData?.innings_1;

  const rawOvers =
    innObj?.overs ||
    scoreData?.score?.overs ||
    scoreData?.overs;

  if (
    Array.isArray(rawOvers) &&
    rawOvers.length > 0
  ) {
    const parsedOvers =
      normalizeOvers(rawOvers);

    if (parsedOvers.length > 0) {
      return parsedOvers;
    }
  }

  // =========================================================
  // 2. Backend recentOvers
  // =========================================================

  if (
    Array.isArray(scoreData?.recentOvers) &&
    scoreData.recentOvers.length > 0
  ) {
    const recentOvers =
      scoreData.recentOvers
        .map((o, idx) => {
          if (Array.isArray(o)) {
            return {
              over: idx + 1,
              balls: o,
            };
          }

          let balls = [];

          if (Array.isArray(o?.balls)) {
            balls = o.balls;
          } else if (
            Array.isArray(o?.deliveries)
          ) {
            balls = o.deliveries;
          } else if (
            typeof o?.balls === "string"
          ) {
            balls = o.balls
              .split("")
              .filter(Boolean);
          }

          return {
            over: Number(
              o?.over ??
                o?.overNumber ??
                o?.overNo ??
                idx + 1
            ),
            balls,
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            Number(a.over) -
            Number(b.over)
        )
        .slice(-8);

    if (recentOvers.length > 0) {
      return recentOvers;
    }
  }

  // =========================================================
  // 3. Commentary fallback
  // =========================================================

  const comments =
    Array.isArray(
      scoreData?.fullCommentary
    ) &&
    scoreData.fullCommentary.length > 0
      ? scoreData.fullCommentary
      : Array.isArray(
          scoreData?.commentary
        )
      ? scoreData.commentary
      : [];

  const overMap = {};

  if (comments.length > 0) {
    // Commentary may come newest -> oldest
    // Reverse it to process chronologically
    const chronological = [
      ...comments,
    ].reverse();

    chronological.forEach((c) => {
      const overStr =
        c?.ballNumber || c?.over;

      if (!overStr) return;

      let overIndex;

      if (typeof overStr === "string") {
        const parts =
          overStr.split(".");

        overIndex = parseInt(
          parts[0],
          10
        );
      } else if (
        typeof overStr === "number"
      ) {
        overIndex = Math.floor(
          overStr
        );
      }

      if (isNaN(overIndex)) return;

      const overNum =
        overIndex + 1;

      if (!overMap[overNum]) {
        overMap[overNum] = [];
      }

      const runVal =
        c?.runs !== undefined &&
        c?.runs !== null &&
        c?.runs !== ""
          ? c.runs
          : "0";

      overMap[overNum].push(
        c?.isWicket
          ? "W"
          : runVal
      );
    });
  }

  // =========================================================
  // 4. Current over
  // =========================================================

  if (
    Array.isArray(
      scoreData?.currentOver
    ) &&
    scoreData.currentOver.length > 0
  ) {
    const currentOverNumber =
      Math.floor(
        parseFloat(
          scoreData?.batting?.score
            ?.over || "0"
        )
      ) + 1;

    overMap[currentOverNumber] =
      scoreData.currentOver;
  }

  // =========================================================
  // 5. Oldest -> newest
  // =========================================================

  const sortedOvers = Object.keys(
    overMap
  )
    .map(Number)
    .sort((a, b) => a - b)
    .map((overNum) => ({
      over: overNum,
      balls: overMap[overNum],
    }));

  if (sortedOvers.length > 0) {
    return sortedOvers.slice(-8);
  }

  return [];
};

// =============================================================
// BALL STYLE
// =============================================================

const getBallStyle = (
  ball,
  isDark
) => {
  let r = 0;
  let isW = false;
  let isEx = false;
  let label = "0";

  if (
    typeof ball === "object" &&
    ball !== null
  ) {
    r = Number(
      ball.runs ??
        ball.run ??
        ball.score ??
        0
    );

    isW = Boolean(
      ball.isWicket ||
        ball.wicket ||
        ball.dismissalInfo
    );

    isEx = Boolean(
      ball.isExtra ||
        ball.extraType
    );

    if (isW) {
      label = "W";
    } else if (isEx) {
      const exType =
        ball.extraType
          ? ball.extraType
              .charAt(0)
              .toUpperCase()
          : "Ex";

      label =
        r > 0
          ? `${r}${exType}`
          : exType;
    } else {
      label = String(r);
    }
  } else {
    const s = String(
      ball || ""
    ).trim();

    const upper =
      s.toUpperCase();

    if (
      upper === "W" ||
      upper.endsWith("W")
    ) {
      isW = true;
      label = "W";

      const num = parseInt(
        upper.replace("W", ""),
        10
      );

      if (!isNaN(num)) {
        r = num;
      }
    } else if (
      upper.includes("WD") ||
      upper.includes("NB") ||
      upper.includes("B") ||
      upper.includes("LB")
    ) {
      isEx = true;
      label = s;

      const num = parseInt(
        s.replace(/[^0-9]/g, ""),
        10
      );

      if (!isNaN(num)) {
        r = num;
      }
    } else {
      const num = parseInt(
        s,
        10
      );

      r = isNaN(num)
        ? 0
        : num;

      label = String(r);
    }
  }

  // Wicket
  if (isW) {
    return {
      bg: "#EF4444",
      text: "#FFFFFF",
      label,
      isW,
      runs: r,
    };
  }

  // Six
  if (r === 6) {
    return {
      bg: "#8B5CF6",
      text: "#FFFFFF",
      label,
      isW,
      runs: r,
    };
  }

  // Four
  if (r === 4) {
    return {
      bg: "#10B981",
      text: "#FFFFFF",
      label,
      isW,
      runs: r,
    };
  }

  // Extras
  if (isEx) {
    return {
      bg: "#F59E0B",
      text: "#FFFFFF",
      label,
      isW,
      runs: r,
    };
  }

  // Dot ball
  if (r === 0) {
    return {
      bg: isDark
        ? "#1E293B"
        : "#F1F5F9",

      text: isDark
        ? "#94A3B8"
        : "#64748B",

      border: isDark
        ? "#334155"
        : "#E2E8F0",

      label: "0",
      isW,
      runs: 0,
    };
  }

  // Normal runs
  return {
    bg: isDark
      ? "#0F172A"
      : "#FFFFFF",

    text: isDark
      ? "#F8FAFC"
      : "#0F172A",

    border: isDark
      ? "#475569"
      : "#CBD5E1",

    label: String(r),
    isW,
    runs: r,
  };
};

// =============================================================
// COMPONENT
// =============================================================

export default function GoogleRecentOversStrip({
  score,
  isDark = false,
}) {
  const overs =
    getRecentOversFromScore(score);

  const scrollViewRef =
    useRef(null);

  // ===========================================================
  // Automatically start at newest over
  // ===========================================================

  useEffect(() => {
    if (
      overs &&
      overs.length > 0
    ) {
      // Wait until ScrollView has rendered
      const timer =
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd(
            {
              animated: false,
            }
          );
        }, 50);

      return () =>
        clearTimeout(timer);
    }
  }, [overs.length]);

  if (
    !overs ||
    overs.length === 0
  ) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "#0B1120"
            : "#F8FAFC",

          borderBottomColor:
            isDark
              ? "#1E293B"
              : "#E2E8F0",
        },
      ]}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* LABEL */}

        <Text
          style={[
            styles.recentTag,
            {
              color: isDark
                ? "#64748B"
                : "#94A3B8",
            },
          ]}
        >
          OVERS
        </Text>

        {/* OVERS */}

        {overs.map(
          (ov, ovIdx) => {
            const ballList =
              Array.isArray(
                ov?.balls
              )
                ? ov.balls
                : typeof ov?.balls ===
                  "string"
                ? ov.balls
                    .split("")
                    .filter(Boolean)
                : [];

            let overRuns = 0;
            let overWkts = 0;

            const parsedBalls =
              ballList.map(
                (b) => {
                  const parsed =
                    getBallStyle(
                      b,
                      isDark
                    );

                  overRuns +=
                    parsed.runs;

                  if (
                    parsed.isW
                  ) {
                    overWkts++;
                  }

                  return parsed;
                }
              );

            return (
              <React.Fragment
                key={`ov-${ov?.over || ovIdx}`}
              >
                {/* DIVIDER */}

                {ovIdx > 0 && (
                  <View
                    style={[
                      styles.divider,
                      {
                        backgroundColor:
                          isDark
                            ? "#1E293B"
                            : "#E2E8F0",
                      },
                    ]}
                  />
                )}

                {/* OVER */}

                <View
                  style={
                    styles.overGroup
                  }
                >
                  {/* OVER NUMBER */}

                  <Text
                    style={[
                      styles.overLabel,
                      {
                        color:
                          isDark
                            ? "#94A3B8"
                            : "#64748B",
                      },
                    ]}
                  >
                    Ov{" "}
                    {ov?.over ??
                      ovIdx + 1}
                  </Text>

                  {/* BALLS */}

                  <View
                    style={
                      styles.ballsRow
                    }
                  >
                    {parsedBalls.map(
                      (
                        b,
                        bIdx
                      ) => (
                        <View
                          key={`b-${bIdx}`}
                          style={[
                            styles.ballDot,
                            {
                              backgroundColor:
                                b.bg,

                              borderColor:
                                b.border ||
                                "transparent",

                              borderWidth:
                                b.border
                                  ? 1
                                  : 0,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.ballText,
                              {
                                color:
                                  b.text,
                              },
                            ]}
                          >
                            {
                              b.label
                            }
                          </Text>
                        </View>
                      )
                    )}
                  </View>

                  {/* OVER TOTAL */}

                  <Text
                    style={[
                      styles.overTotal,
                      {
                        color:
                          overWkts >
                          0
                            ? "#EF4444"
                            : isDark
                            ? "#CBD5E1"
                            : "#334155",
                      },
                    ]}
                  >
                    {`= ${overRuns}${
                      overWkts >
                      0
                        ? ` (${overWkts}w)`
                        : ""
                    }`}
                  </Text>
                </View>
              </React.Fragment>
            );
          }
        )}
      </ScrollView>
    </View>
  );
}

// =============================================================
// STYLES
// =============================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: 7,
    borderBottomWidth: 1,
  },

  scrollContent: {
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 8,
  },

  recentTag: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginRight: 4,
  },

  divider: {
    width: 1,
    height: 18,
    marginHorizontal: 4,
  },

  overGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  overLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  ballsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ballDot: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  ballText: {
    fontSize: 10,
    fontWeight: "800",
  },

  overTotal: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 2,
  },
});
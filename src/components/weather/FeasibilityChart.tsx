/**
 * The 24-hour feasibility line on an activity card (the web's
 * `FeasibilityChart`): the 0-100 score `feasibilitySeries` gives for each
 * forecast hour, drawn in the activity category's mineral with the rating
 * words (Poor, Fair, Good, Excellent) down the side instead of numbers, so it
 * reads as "when is this good today" and not as an abstract score.
 *
 * Drawn with react-native-svg from the measured width. The whole chart is one
 * item for the screen reader with a sentence ("Good until 15:00. Best around
 * 09:00."), because a line has no useful per-point reading. It never moves.
 */

import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Line, Path } from "react-native-svg";

import { usePageColors } from "@/hooks/usePageColors";
import {
  type FeasibilityPoint,
  LEVEL_SCORES,
  scoreLabel,
} from "@/shared/activity-feasibility";
import { heroActivityClause } from "@/shared/hero";
import { SPACE, withAlpha } from "@/theme/mzizi";
import { LANE } from "@/theme/ratings";

import { WxText } from "./WxText";

/** The score ticks labelled down the side, top to bottom. */
export const TREND_TICKS = [100, 75, 50, 25] as const;

/** The fill under the line (the web fills the area under it, lightly). */
const AREA_ALPHA = 0.14;
const GRID_ALPHA = 0.5;

/** How many x labels are drawn: the first hour and every sixth after it. */
export const X_LABEL_STEP = 6;

export type TrendGeometry = {
  /** The line, as an SVG path. */
  line: string;
  /** The area under the line, closed at the bottom. */
  area: string;
  /** y of each labelled tick, top to bottom (same order as `TREND_TICKS`). */
  ticks: number[];
  /** x of each point. */
  xs: number[];
};

const MIN_SCORE = 0;
const MAX_SCORE = 100;

function yOf(score: number, height: number): number {
  const clamped = Math.min(MAX_SCORE, Math.max(MIN_SCORE, score));
  return height - (clamped / MAX_SCORE) * height;
}

/** The chart's shapes for `width` x `height`. Pure; empty for fewer than 2 points. */
export function trendGeometry(
  points: FeasibilityPoint[],
  width: number,
  height: number,
): TrendGeometry | null {
  if (points.length < 2 || width <= 0 || height <= 0) return null;
  const step = width / (points.length - 1);
  const xs = points.map((_, i) => i * step);
  const ys = points.map((p) => yOf(p.score, height));
  const line = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${round(x)} ${round(ys[i])}`)
    .join(" ");
  const area = `${line} L${round(xs[xs.length - 1])} ${height} L0 ${height} Z`;
  return {
    line,
    area,
    ticks: TREND_TICKS.map((t) => yOf(t, height)),
    xs,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The sentence that stands for the chart: when it changes, and the best hour. */
export function trendSummary(
  points: FeasibilityPoint[],
  utcOffsetSeconds?: number | null,
): string {
  if (points.length < 2) return "";
  const clause = heroActivityClause(points, utcOffsetSeconds);
  const best = points.reduce((a, b) => (b.score > a.score ? b : a), points[0]);
  const parts: string[] = [];
  if (clause) parts.push(`${capitalise(clause)}.`);
  if (best.score > LEVEL_SCORES.poor && best.label) {
    parts.push(`${scoreLabel(best.score)} around ${best.label}.`);
  }
  return parts.join(" ");
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type FeasibilityChartProps = {
  points: FeasibilityPoint[];
  /** The category mineral's colour. */
  color: string;
  label: string;
  utcOffsetSeconds?: number | null;
};

export function FeasibilityChart({
  points,
  color,
  label,
  utcOffsetSeconds,
}: FeasibilityChartProps) {
  const { colors } = usePageColors();
  const [width, setWidth] = useState(0);
  if (points.length < 2) return null;

  const geo = trendGeometry(points, width, LANE.trendHeight);
  const grid = withAlpha(colors.border, GRID_ALPHA);
  const labelled = points
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i % X_LABEL_STEP === 0);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label}, next 24 hours. ${trendSummary(points, utcOffsetSeconds)}`}
      testID="feasibility-chart"
    >
      <View style={styles.plotRow}>
        <View style={[styles.yAxis, { height: LANE.trendHeight }]}>
          {TREND_TICKS.map((t, i) => (
            <View
              key={t}
              style={[
                styles.yLabel,
                geo ? { top: Math.max(0, geo.ticks[i] - SPACE.cozy) } : null,
              ]}
            >
              <WxText type="caption" family="mono" color={colors.textTertiary}>
                {scoreLabel(t)}
              </WxText>
            </View>
          ))}
        </View>
        <View
          style={[styles.plot, { height: LANE.trendHeight }]}
          onLayout={(e: LayoutChangeEvent) =>
            setWidth(e.nativeEvent.layout.width)
          }
        >
          {geo ? (
            <Svg width={width} height={LANE.trendHeight}>
              {geo.ticks.map((y, i) => (
                <Line
                  key={TREND_TICKS[i]}
                  x1={0}
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke={grid}
                  strokeWidth={LANE.gridStroke}
                />
              ))}
              <Path d={geo.area} fill={withAlpha(color, AREA_ALPHA)} />
              <Path
                d={geo.line}
                fill="none"
                stroke={color}
                strokeWidth={LANE.trendStroke}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          ) : null}
        </View>
      </View>
      <View style={styles.xRow}>
        <View style={styles.yAxisSpacer} />
        <View style={styles.xLabels}>
          {labelled.map(({ p, i }) => (
            <WxText
              key={p.time}
              type="caption"
              family="mono"
              color={colors.textTertiary}
              style={{
                position: "absolute",
                left: `${(i / (points.length - 1)) * 100}%`,
              }}
            >
              {i === 0 ? "Now" : (p.label ?? "")}
            </WxText>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plotRow: { flexDirection: "row" },
  yAxis: { width: LANE.yAxis },
  yLabel: { position: "absolute", left: 0 },
  plot: { flex: 1 },
  xRow: { flexDirection: "row", marginTop: SPACE.hair },
  yAxisSpacer: { width: LANE.yAxis },
  xLabels: { flex: 1, height: LANE.axis },
});

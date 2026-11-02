/**
 * The 24-hour feasibility line on an activity card (the web's
 * `FeasibilityChart`): the 0-100 score `feasibilitySeries` gives for each
 * forecast hour, drawn in the activity category's mineral with the rating
 * words (Poor, Fair, Good, Excellent) down the side instead of numbers, so it
 * reads as "when is this good today" and not as an abstract score.
 *
 * A thin config of the app's one chart, `TimeSeriesChart`, as on the web. The
 * screen reader hears one sentence ("Good until 15:00. Best around 09:00."),
 * because a line has no useful per-point reading.
 */

import { useMemo } from "react";

import {
  type FeasibilityPoint,
  LEVEL_SCORES,
  scoreLabel,
} from "@/shared/activity-feasibility";
import { heroActivityClause } from "@/shared/hero";

import { TimeSeriesChart } from "./charts/TimeSeriesChart";

/** The score ticks labelled down the side, top to bottom. */
export const TREND_TICKS = [100, 75, 50, 25] as const;

/** Most hour labels along the bottom (the first hour and every sixth). */
export const X_LABELS = 4;

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
  const data = useMemo(
    () =>
      points.map((p, i) => ({
        label: i === 0 ? "Now" : (p.label ?? ""),
        score: p.score,
      })),
    [points],
  );
  if (points.length < 2) return null;
  return (
    <TimeSeriesChart
      title={`${label}, next 24 hours`}
      summary={trendSummary(points, utcOffsetSeconds)}
      data={data}
      labelKey="label"
      series={[{ key: "score", label: "Suitability", color, fill: true }]}
      valueFormat={(_series, value) => scoreLabel(value)}
      yAxes={{
        y: { min: 0, max: 100, ticks: TREND_TICKS, format: scoreLabel },
      }}
      maxTicksLimit={X_LABELS}
      // The web's `aspect-[16/5]`.
      aspect={16 / 5}
      testID="feasibility-chart"
    />
  );
}

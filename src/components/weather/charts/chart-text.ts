/**
 * The words a chart says: the text alternative VoiceOver reads for the whole
 * chart, and the reading for one point. A chart is never only a picture.
 *
 * A web chart is a canvas with no text alternative at all; here every chart
 * has a summary of each series (its lowest and highest values and when they
 * happen) and, one point at a time, the exact values.
 */

import { type Reading } from "./chart-layout";

export type TextSeries = {
  label: string;
  values: readonly Reading[];
};

/** Formats one value of a series with its unit: `("Temperature", 21)` is "21°C". */
export type ValueFormat = (seriesLabel: string, value: number) => string;

export const defaultValueFormat: ValueFormat = (_label, value) => String(value);

/** "Temperature: lowest 21°C at Now, highest 29°C at 14:00." One sentence per series. */
export function describeSeries(
  series: TextSeries,
  labels: readonly string[],
  format: ValueFormat = defaultValueFormat,
): string {
  let lo = -1;
  let hi = -1;
  series.values.forEach((v, i) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return;
    if (lo === -1 || v < (series.values[lo] as number)) lo = i;
    if (hi === -1 || v > (series.values[hi] as number)) hi = i;
  });
  if (lo === -1 || hi === -1) return `${series.label}: no data.`;
  const min = series.values[lo] as number;
  const max = series.values[hi] as number;
  if (min === max) {
    return `${series.label}: steady at ${format(series.label, min)}.`;
  }
  return `${series.label}: lowest ${format(series.label, min)} at ${labels[lo]}, highest ${format(series.label, max)} at ${labels[hi]}.`;
}

/** The whole chart in words: every series, one sentence each. */
export function describeChart(
  all: readonly TextSeries[],
  labels: readonly string[],
  format: ValueFormat = defaultValueFormat,
): string {
  return all.map((s) => describeSeries(s, labels, format)).join(" ");
}

/** One value of one series at a point, or "no data" for a gap. */
export function readingText(
  series: TextSeries,
  index: number,
  format: ValueFormat = defaultValueFormat,
): string {
  const v = series.values[index];
  return typeof v === "number" && Number.isFinite(v)
    ? `${series.label}: ${format(series.label, v)}`
    : `${series.label}: no data`;
}

/** The point read aloud: its label, then each series' value. */
export function pointText(
  all: readonly TextSeries[],
  labels: readonly string[],
  index: number,
  format: ValueFormat = defaultValueFormat,
): string {
  const parts = all.map((s) => readingText(s, index, format));
  return `${labels[index] ?? ""}. ${parts.join(". ")}`;
}

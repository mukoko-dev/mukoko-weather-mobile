/**
 * The next-hour precipitation nowcast: four 15-minute steps and one plain
 * sentence. Ported from mukoko-weather `src/components/weather/MinutelyNowcast.tsx`
 * (`nowcastSummary`, the step labels and the rain threshold), with the web's own
 * test vectors. Pure: no network, no clock.
 */

/** Open-Meteo `minutely_15` block as `/v1/weather` serves it. */
export interface MinutelyData {
  time: string[];
  precipitation: number[];
}

/** Precipitation (mm/15-min) above which we consider it "raining". */
export const RAIN_THRESHOLD_MM = 0.1;

export const STEP_LABELS = ["Now", "+15", "+30", "+45"] as const;

/**
 * Produce a plain-language summary of the next-hour precipitation.
 */
export function nowcastSummary(minutely: MinutelyData): string {
  const precip = minutely.precipitation ?? [];
  if (precip.length === 0) return "No nowcast data available.";

  const firstWetIndex = precip.findIndex((p) => (p ?? 0) >= RAIN_THRESHOLD_MM);

  if (firstWetIndex === -1) {
    return "No rain expected in the next hour.";
  }
  if (firstWetIndex === 0) {
    const stillRaining = precip.every((p) => (p ?? 0) >= RAIN_THRESHOLD_MM);
    return stillRaining
      ? "Rain is falling and continues through the next hour."
      : "Rain is falling now — easing within the hour.";
  }
  const minutes = firstWetIndex * 15;
  return `Rain starting in ~${minutes} min.`;
}

export interface NowcastRow {
  /** "Now", "+15", "+30", "+45". */
  label: string;
  /** mm in the 15 minutes; a missing value is 0 (no rain reported). */
  precip: number;
}

/** The four steps the card draws (the web shows at most four). */
export function nowcastRows(minutely: MinutelyData): NowcastRow[] {
  const precip = minutely.precipitation ?? [];
  return precip.slice(0, 4).map((p, i) => ({
    label: STEP_LABELS[i] ?? `+${i * 15}`,
    precip: typeof p === "number" && Number.isFinite(p) ? p : 0,
  }));
}

/** Total rain over the rows, mm. */
export function nowcastTotal(rows: readonly NowcastRow[]): number {
  return rows.reduce((sum, r) => sum + r.precip, 0);
}

/** The spoken form of the chart: what each step holds. */
export function nowcastSpoken(rows: readonly NowcastRow[]): string {
  if (rows.length === 0) return "No nowcast data.";
  if (nowcastTotal(rows) <= 0) return "No precipitation expected in the next hour.";
  return rows
    .map((r) => `${r.label === "Now" ? "Now" : `in ${r.label.slice(1)} minutes`}, ${r.precip.toFixed(1)} millimetres`)
    .join("; ");
}

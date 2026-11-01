/**
 * The multi-model temperature comparison: how the major forecast models agree
 * or diverge over the next 24 hours. Ported from mukoko-weather
 * `src/components/weather/charts/ModelComparisonChart.tsx`
 * (`prepareModelComparisonData`, the short labels) and `src/lib/weather.ts`
 * (`ForecastModel`, `FORECAST_MODEL_LABELS`, `COMPARISON_MODELS`). Pure.
 */

/** A single model's hourly temperature/precipitation series. */
export interface ModelForecast {
  model: string;
  temperature_2m: (number | null)[];
  precipitation: (number | null)[];
}

/** Open-Meteo model ids the web names (`ForecastModel`). */
export const MODEL_IDS = {
  bestMatch: "best_match",
  ecmwf: "ecmwf_ifs",
  aifs: "ecmwf_aifs025_single",
  gfs: "gfs_seamless",
  icon: "icon_global",
  meteoFrance: "meteofrance_seamless",
} as const;

/** Human-readable labels for each forecast model (the web's wording). */
export const FORECAST_MODEL_LABELS: Record<string, string> = {
  [MODEL_IDS.bestMatch]: "Mukoko blend (recommended)",
  [MODEL_IDS.ecmwf]: "ECMWF IFS (Europe)",
  [MODEL_IDS.aifs]: "ECMWF AIFS (AI model)",
  [MODEL_IDS.gfs]: "GFS (NOAA, USA)",
  [MODEL_IDS.icon]: "ICON (DWD, Germany)",
  [MODEL_IDS.meteoFrance]: "Météo-France",
};

/** The comparison set overlaid on the chart: the blend's core members. */
export const COMPARISON_MODELS: readonly string[] = [
  MODEL_IDS.ecmwf,
  MODEL_IDS.aifs,
  MODEL_IDS.gfs,
  MODEL_IDS.icon,
];

/** Short label for a model id (agency acronym), falling back to the raw id. */
export function modelShortLabel(model: string): string {
  const full = FORECAST_MODEL_LABELS[model];
  if (!full) return model;
  // "ECMWF IFS (Europe)" → "ECMWF IFS"
  return full.split(" (")[0];
}

/**
 * The series the card draws: the web's comparison models, in the web's order,
 * that the answer carries with a usable temperature series. The answer can hold
 * more members (the blend grows); a model with no label is not drawn, so a raw
 * id never reaches the screen.
 */
export function comparisonSeries(
  models: readonly ModelForecast[] | undefined,
): ModelForecast[] {
  if (!models) return [];
  const byId = new Map(models.map((m) => [m.model, m]));
  return COMPARISON_MODELS.flatMap((id) => {
    const m = byId.get(id);
    return m && Array.isArray(m.temperature_2m) && m.temperature_2m.length > 0
      ? [m]
      : [];
  });
}

export interface ComparisonSeries {
  key: string;
  label: string;
  /** Hourly °C, one entry per hour of the shared axis; null where missing. */
  values: (number | null)[];
}

export interface ComparisonData {
  /** ISO times of the shared hourly axis, at most 24. */
  times: string[];
  series: ComparisonSeries[];
}

/** Rows and series for the chart. At most 24 hours. */
export function prepareModelComparisonData(
  models: readonly ModelForecast[],
  time: readonly string[],
): ComparisonData {
  const len = Math.min(24, time.length);
  return {
    times: time.slice(0, len),
    series: models.map((m) => ({
      key: m.model,
      label: modelShortLabel(m.model),
      values: Array.from({ length: len }, (_, i) => m.temperature_2m[i] ?? null),
    })),
  };
}

/** The spread across models at the hour with the widest disagreement, °C. */
export function widestSpread(data: ComparisonData): number | null {
  let widest: number | null = null;
  for (let i = 0; i < data.times.length; i++) {
    const at = data.series
      .map((s) => s.values[i])
      .filter((v): v is number => typeof v === "number");
    if (at.length < 2) continue;
    const spread = Math.max(...at) - Math.min(...at);
    if (widest === null || spread > widest) widest = spread;
  }
  return widest === null ? null : Math.round(widest * 10) / 10;
}

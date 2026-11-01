/**
 * Agriculture helpers: pure, framework-free.
 *
 * Ported from mukoko-weather `src/lib/agriculture.ts` with the same logic and
 * the web's own test vectors (src/shared/agriculture.test.ts). The types
 * mirror the Worker's `GET /v1/agriculture` answer
 * (`weather_core::agriculture::AgricultureResponse`); keep the two in step.
 *
 * Left out because they are web-only: `agricultureUrl` (the app builds its
 * query through `src/api/agriculture.ts`), the Tailwind class lookups
 * (`statusClasses`, `riskClass`, `STAGE_CLASSES`: the screens map a status to
 * a colour token from `src/theme/farm.ts` instead), and the activity
 * catalogue import (the 12 farming activities are pinned below against the
 * Worker's own `/v1/activities?category=farming` answer).
 */

export type WindowStatus = "go" | "wait" | "avoid";
export type RiskLevel = "none" | "moderate" | "high";
export type MoistureBand = "dry" | "adequate" | "moist" | "saturated";
export type BalanceStatus = "deficit" | "balanced" | "surplus";

export interface TimeWindow {
  start: string;
  end: string;
  hours: number;
}

export interface FarmWindow {
  status: WindowStatus;
  label: string;
  detail: string;
  window?: TimeWindow | null;
}

export interface FarmWindows {
  spray: FarmWindow;
  plant: FarmWindow;
  harvest: FarmWindow;
  irrigate: FarmWindow;
}

export interface Risk {
  level: RiskLevel;
  days: string[];
  extremeC: number | null;
  detail: string;
}

export interface AgriDay {
  date: string;
  forecast: boolean;
  rainMm: number | null;
  rainProbability: number | null;
  et0Mm: number | null;
  balanceMm: number | null;
  tMax: number | null;
  tMin: number | null;
  windMaxKmh: number | null;
  gdd: number | null;
  gddCumulative: number | null;
  soilMoisture0to1: number | null;
  soilMoisture1to3: number | null;
  soilMoisture3to9: number | null;
  soilMoisture9to27: number | null;
  soilMoisture27to81: number | null;
  soilTemp0: number | null;
  soilTemp6: number | null;
  soilTemp18: number | null;
  soilTemp54: number | null;
  vpdMaxKpa: number | null;
  leafWetHours: number | null;
  sprayHours: number | null;
}

export type CropStage = "nursery" | "plant" | "grow" | "harvest";

export interface CropCalendar {
  id: string;
  label: string;
  phase: string | null;
  months: Partial<Record<CropStage, number[]>>;
}

export interface AgricultureResponse {
  available: boolean;
  reason?: string | null;
  headline: string | null;
  verdict: WindowStatus | null;
  windows: FarmWindows | null;
  rain: {
    next24hMm: number | null;
    next7dMm: number | null;
    next16dMm: number | null;
    past7dMm: number | null;
    past30dMm: number | null;
    rainyDaysNext7: number;
    nextRainDate: string | null;
  } | null;
  soil: {
    moistureTopsoil: number | null;
    moistureRootZone: number | null;
    moistureBand: MoistureBand | null;
    temperatureSurface: number | null;
    temperatureSeedDepth: number | null;
    temperatureRootZone: number | null;
  } | null;
  waterBalance: {
    et0Next7dMm: number | null;
    rainNext7dMm: number | null;
    balanceNext7dMm: number | null;
    et0Past7dMm: number | null;
    rainPast7dMm: number | null;
    balancePast7dMm: number | null;
    status: BalanceStatus | null;
  } | null;
  gdd: {
    base: number;
    cap: number;
    today: number | null;
    past30d: number | null;
    next7d: number | null;
  } | null;
  risks: { frost: Risk; heat: Risk } | null;
  wind: {
    speedKmh: number | null;
    gustKmh: number | null;
    sprayable: boolean;
    detail: string;
  } | null;
  sprayWindows: TimeWindow[];
  daily: AgriDay[];
  season: { name: string; localName: string; description: string } | null;
  calendar: CropCalendar[];
  profile: {
    koppen: string | null;
    normalHigh: number | null;
    normalLow: number | null;
    ensoPhase: string | null;
  } | null;
  crops: string[];
  timezone: string | null;
  utcOffsetSeconds: number | null;
  elevation: number | null;
  attribution: string;
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Crops: the user's farming activities
// ---------------------------------------------------------------------------

/**
 * The farming activities (`category: "farming"`), id and label, exactly as the
 * Worker's `GET /v1/activities?category=farming` lists them
 * (src/api/__fixtures__/activities-farming.json pins this table to a recorded
 * answer). Ids are stable on the web too. The activity catalogue itself comes
 * with the activities slice; until then this table is the one source of the
 * ids `farmingActivities` accepts.
 */
export const FARMING_ACTIVITIES: readonly { id: string; label: string }[] = [
  { id: "beekeeping", label: "Beekeeping (Mukoko)" },
  { id: "livestock", label: "Cattle Herding & Livestock" },
  { id: "gardening", label: "Communal Gardening (Nhimbe)" },
  { id: "cotton-farming", label: "Cotton Farming" },
  { id: "aquaculture", label: "Fish Farming" },
  { id: "forestry", label: "Forestry" },
  { id: "harvest", label: "Harvest (Kukohwa)" },
  { id: "horticulture", label: "Horticulture & Market Gardening" },
  { id: "irrigation", label: "Irrigation" },
  { id: "crop-farming", label: "Maize & Crop Farming" },
  { id: "planting", label: "Planting Season Prep" },
  { id: "tobacco-farming", label: "Tobacco Farming" },
];

/** Farming activity ids. */
export const FARMING_ACTIVITY_IDS: readonly string[] = FARMING_ACTIVITIES.map(
  (a) => a.id,
);

/**
 * The preference the app stores today is the Farming CATEGORY (`farming`), not
 * individual activities. Choosing it means "I farm", so until a person can
 * pick crops one by one it stands for the one general crop activity.
 */
export const FARMING_CATEGORY_ID = "farming";
export const GENERAL_CROP_ID = "crop-farming";

/** The user's selected activities that are farming ones, in order, de-duplicated. */
export function farmingActivities(selected: readonly string[]): string[] {
  const farming = new Set(FARMING_ACTIVITY_IDS);
  return [...new Set(selected)].filter((id) => farming.has(id));
}

/**
 * The crops to ask for and advise on, from the stored preference ids. Real
 * farming activity ids pass through (`farmingActivities`); the bare Farming
 * category becomes the general crop activity. Nothing selected is nothing.
 */
export function cropsFromPreferences(selected: readonly string[]): string[] {
  const crops = farmingActivities(selected);
  if (selected.includes(FARMING_CATEGORY_ID) && !crops.includes(GENERAL_CROP_ID)) {
    crops.unshift(GENERAL_CROP_ID);
  }
  return crops;
}

/** Display label for an activity id from the farming table. */
export function cropLabel(id: string): string {
  return FARMING_ACTIVITIES.find((a) => a.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

export interface AgriLocationRef {
  /** The place's slug; a bare coordinate has none and the Worker places it by point. */
  slug?: string;
  lat: number;
  lon: number;
  country?: string;
}

/**
 * Query parameters of `GET /v1/agriculture` for a place and the user's
 * farming crops. `country` and `crops` are left out when empty.
 */
export function agricultureQuery(
  location: AgriLocationRef,
  crops: readonly string[] = [],
): Record<string, string> {
  const query: Record<string, string> = {
    lat: String(location.lat),
    lon: String(location.lon),
  };
  if (location.slug) query.location = location.slug;
  if (location.country) query.country = location.country;
  if (crops.length) query.crops = crops.join(",");
  return query;
}

// ---------------------------------------------------------------------------
// Windows and statuses
// ---------------------------------------------------------------------------

export const WINDOW_ORDER: readonly (keyof FarmWindows)[] = [
  "spray",
  "plant",
  "harvest",
  "irrigate",
];

export const WINDOW_TITLES: Record<keyof FarmWindows, string> = {
  spray: "Spray",
  plant: "Plant",
  harvest: "Harvest",
  irrigate: "Irrigate",
};

export const STATUS_LABELS: Record<WindowStatus, string> = {
  go: "Go",
  wait: "Wait",
  avoid: "Hold off",
};

/**
 * The severity tone each status wears (`--color-severity-*`: low is safe,
 * moderate is mild, severe is stop). The colours are in src/theme/farm.ts.
 */
export type SeverityTone = "low" | "moderate" | "severe";

export const STATUS_TONE: Record<WindowStatus, SeverityTone> = {
  go: "low",
  wait: "moderate",
  avoid: "severe",
};

export const RISK_TONE: Record<RiskLevel, SeverityTone> = {
  none: "low",
  moderate: "moderate",
  high: "severe",
};

export const MOISTURE_LABELS: Record<MoistureBand, string> = {
  dry: "Dry",
  adequate: "Adequate",
  moist: "Moist",
  saturated: "Saturated",
};

export function formatMm(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value >= 10 || value === 0
    ? `${Math.round(value)} mm`
    : `${value.toFixed(1)} mm`;
}

/** Signed water balance, e.g. "−18 mm" / "+6 mm". */
export function formatBalance(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const rounded = Math.round(value);
  if (rounded === 0) return "0 mm";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)} mm`;
}

/** Volumetric soil water as a percentage, e.g. 0.27 → "27%". */
export function formatMoisture(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatTempC(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}°C`;
}

export function formatGdd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}`;
}

/** "06:00" from a local ISO timestamp such as "2026-10-11T06:00". */
export function hhmm(iso: string): string {
  const m = /T(\d{2}:\d{2})/.exec(iso);
  return m ? m[1] : iso;
}

/** Only show the card when the backend produced a full picture. */
export function isAgricultureReady(
  data: AgricultureResponse | null | undefined,
): data is AgricultureResponse & {
  headline: string;
  verdict: WindowStatus;
  windows: FarmWindows;
  rain: NonNullable<AgricultureResponse["rain"]>;
} {
  return Boolean(
    data?.available &&
      data.windows &&
      data.rain &&
      data.headline &&
      data.verdict,
  );
}

/** Forecast days only (the charts' 16-day window). */
export function forecastDays(daily: readonly AgriDay[]): AgriDay[] {
  return daily.filter((d) => d.forecast);
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Short x-axis label "13 Oct" from "2026-10-13" (no Date parsing, no TZ drift). */
export function dayLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  return `${Number(m[3])} ${MONTH_SHORT[Number(m[2]) - 1] ?? ""}`.trim();
}

// ---------------------------------------------------------------------------
// Insights page helpers (chart rows, calendar, crop advice)
// ---------------------------------------------------------------------------

/** One chart point: an x label plus numeric series (null = gap). */
export type AgriChartRow = Record<string, string | number | null>;

const pct = (v: number | null): number | null =>
  v === null ? null : Math.round(v * 1000) / 10;

/** 16-day forecast rows for the rain/ET₀, balance, soil and spray charts. */
export function forecastChartRows(daily: readonly AgriDay[]): AgriChartRow[] {
  let running = 0;
  return forecastDays(daily).map((d) => {
    if (d.balanceMm !== null) running += d.balanceMm;
    return {
      date: dayLabel(d.date),
      rainMm: d.rainMm,
      et0Mm: d.et0Mm,
      balanceMm: d.balanceMm,
      cumulativeBalanceMm:
        d.balanceMm === null ? null : Math.round(running * 10) / 10,
      sm0to1: pct(d.soilMoisture0to1),
      sm1to3: pct(d.soilMoisture1to3),
      sm3to9: pct(d.soilMoisture3to9),
      sm9to27: pct(d.soilMoisture9to27),
      sm27to81: pct(d.soilMoisture27to81),
      st0: d.soilTemp0,
      st6: d.soilTemp6,
      st18: d.soilTemp18,
      st54: d.soilTemp54,
      sprayHours: d.sprayHours,
      leafWetHours: d.leafWetHours,
    };
  });
}

/** Cumulative GDD (base 10) over the past 30 days and the forecast. */
export function gddRows(daily: readonly AgriDay[]): AgriChartRow[] {
  return daily.map((d) => ({
    date: dayLabel(d.date),
    gddMaize: d.gddCumulative,
  }));
}

/** True when a series has at least one value (charts skip empty ones). */
export function hasSeries(
  rows: readonly AgriChartRow[],
  keys: readonly string[],
): boolean {
  return rows.some((r) => keys.some((k) => typeof r[k] === "number"));
}

export const MONTH_ABBR = MONTH_SHORT;

export const STAGE_LABELS: Record<CropStage, string> = {
  nursery: "Nursery",
  plant: "Plant",
  grow: "Grow",
  harvest: "Harvest",
};

export const STAGE_ORDER: readonly CropStage[] = [
  "nursery",
  "plant",
  "grow",
  "harvest",
];

/** The stage a crop is in for a 1-based month, or null. */
export function stageForMonth(
  crop: CropCalendar,
  month: number,
): CropStage | null {
  for (const stage of STAGE_ORDER) {
    if (crop.months[stage]?.includes(month)) return stage;
  }
  return null;
}

export interface CropAdvice {
  id: string;
  label: string;
  tips: string[];
}

/**
 * Deterministic, crop-aware notes from the farm data: no AI call. At most
 * three tips per crop, each tied to a number the page also shows.
 */
export function cropAdvice(
  crops: readonly string[],
  data: AgricultureResponse,
): CropAdvice[] {
  const w = data.windows;
  if (!w) return [];
  const heatHigh = data.risks?.heat.level === "high";
  const frost = data.risks?.frost.level !== "none" ? data.risks?.frost : null;
  const wetHours = forecastDays(data.daily)
    .slice(0, 3)
    .reduce((n, d) => n + (d.leafWetHours ?? 0), 0);
  const balance = data.waterBalance?.balanceNext7dMm ?? null;

  const tipsFor = (id: string): string[] => {
    const t: string[] = [];
    switch (id) {
      case "crop-farming":
      case "planting":
        t.push(`Planting: ${w.plant.label}. ${w.plant.detail}`);
        if (data.gdd?.next7d != null)
          t.push(
            `About ${Math.round(data.gdd.next7d)} growing degree days this week; medium-season maize needs roughly 1,300–1,500 from planting.`,
          );
        if (heatHigh)
          t.push(
            "Heat stress this week hurts crops at flowering: irrigate early in the day if you can.",
          );
        break;
      case "tobacco-farming":
        if (wetHours >= 12)
          t.push(
            `${wetHours} leaf-wet hours over 3 days favour leaf disease: scout and spray in the next dry window.`,
          );
        t.push(`Reaping and curing: ${w.harvest.label}. ${w.harvest.detail}`);
        t.push(`Spraying: ${w.spray.label}.`);
        break;
      case "cotton-farming":
        t.push(
          `Picking: ${w.harvest.label}. Rain on open bolls lowers the grade.`,
        );
        t.push(`Pest control: ${w.spray.label}.`);
        break;
      case "horticulture":
      case "gardening":
        t.push(`Water: ${w.irrigate.label}. ${w.irrigate.detail}`);
        if (frost) t.push(frost.detail);
        break;
      case "irrigation":
        t.push(`${w.irrigate.label}. ${w.irrigate.detail}`);
        if (balance !== null)
          t.push(`7-day balance ${formatBalance(balance)} (rain − ET₀).`);
        break;
      case "harvest":
        t.push(`${w.harvest.label}. ${w.harvest.detail}`);
        break;
      case "livestock":
        if (data.risks) t.push(data.risks.heat.detail);
        if (balance !== null && balance < -10)
          t.push("Dry week ahead: check water points and grazing reserves.");
        else if ((data.rain?.rainyDaysNext7 ?? 0) >= 4)
          t.push(
            "Several wet days ahead raise tick pressure: keep to the dipping schedule.",
          );
        break;
      case "forestry":
        if (balance !== null && balance < -10)
          t.push(
            "Dry, high-demand week: fire risk rises; keep firebreaks clear.",
          );
        break;
      case "beekeeping":
        t.push(
          (data.rain?.rainyDaysNext7 ?? 0) >= 4
            ? "Several wet days ahead limit foraging: check hive stores."
            : "Mostly dry week: good foraging days for the colonies.",
        );
        break;
      case "aquaculture":
        if (heatHigh)
          t.push(
            "Hot days lower dissolved oxygen: feed in the cool morning and aerate.",
          );
        break;
    }
    return t.slice(0, 3);
  };

  return crops
    .map((id) => ({ id, label: cropLabel(id), tips: tipsFor(id) }))
    .filter((c) => c.tips.length > 0);
}

// ---------------------------------------------------------------------------
// History vs normals
// ---------------------------------------------------------------------------

export interface HistoryDocLike {
  date?: string;
  daily?: {
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
  };
}

export interface HistorySummary {
  days: number;
  rainMm: number | null;
  meanHigh: number | null;
  meanLow: number | null;
}

const mean = (xs: number[]): number | null =>
  xs.length
    ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10
    : null;

/** Totals and means over the recorded `/v1/history` days. */
export function summarizeHistory(
  docs: readonly HistoryDocLike[],
): HistorySummary {
  const highs: number[] = [];
  const lows: number[] = [];
  const rain: number[] = [];
  for (const d of docs) {
    const hi = d.daily?.temperature_2m_max?.[0];
    const lo = d.daily?.temperature_2m_min?.[0];
    const r = d.daily?.precipitation_sum?.[0];
    if (typeof hi === "number") highs.push(hi);
    if (typeof lo === "number") lows.push(lo);
    if (typeof r === "number") rain.push(r);
  }
  return {
    days: docs.length,
    rainMm: rain.length
      ? Math.round(rain.reduce((a, b) => a + b, 0) * 10) / 10
      : null,
    meanHigh: mean(highs),
    meanLow: mean(lows),
  };
}

/** "+1.4°C" / "−0.6°C" / "0.0°C" anomaly against a normal, or null. */
export function formatAnomaly(
  value: number | null | undefined,
  normal: number | null | undefined,
): string | null {
  if (value == null || normal == null) return null;
  const diff = Math.round((value - normal) * 10) / 10;
  if (diff === 0) return "0.0°C";
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}°C`;
}

/** 1-based month at the location (its UTC offset), never the viewer's clock. */
export function locationMonth(
  utcOffsetSeconds: number | null | undefined,
  nowMs: number = Date.now(),
): number {
  return new Date(nowMs + (utcOffsetSeconds ?? 0) * 1000).getUTCMonth() + 1;
}

// ---------------------------------------------------------------------------
// Why there is no farm data (the Worker's `reason`), in words
// ---------------------------------------------------------------------------

export interface Unavailable {
  /** What happened, in plain words. */
  title: string;
  /** What it means for the person and what to do. */
  body: string;
  /** True when trying again is worth it (a pause or a blip, not a place with no data). */
  retry: boolean;
}

/**
 * The Worker answers `/v1/agriculture` with HTTP 200 and `available: false`
 * plus a `reason` when it cannot build the picture. Each reason has its own
 * words, so the card says what is true and whether trying again will help.
 * An unknown or missing reason gets the general line, never a made-up cause.
 */
export function unavailableFor(reason: string | null | undefined): Unavailable {
  switch (reason) {
    case "provider_unavailable":
      return {
        title: "Farm data is paused",
        body: "The forecast source behind farm data has had errors and is resting for a few minutes. Try again shortly.",
        retry: true,
      };
    case "provider_error":
      return {
        title: "No farm data for this point",
        body: "The forecast source did not give soil and water data for this exact place. It may be out at sea or off the grid, or the source may be busy.",
        retry: true,
      };
    case "insufficient_data":
      return {
        title: "Not enough forecast hours yet",
        body: "Spray, plant, harvest and irrigate windows need more of the coming days than the source has sent. This usually passes within the hour.",
        retry: true,
      };
    case "analysis_error":
      return {
        title: "The farm numbers could not be worked out",
        body: "The forecast arrived but could not be turned into farm windows for this place. Trying again will not change it, so the rest of the page still applies.",
        retry: false,
      };
    default:
      return {
        title: "Farm data is not available",
        body: "Farm windows could not be built for this place right now.",
        retry: true,
      };
  }
}

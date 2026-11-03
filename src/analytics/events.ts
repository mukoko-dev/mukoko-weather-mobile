/**
 * The event vocabulary shared by the app and the web, and the one rule that
 * keeps it safe: an event carries only values picked from a closed set.
 *
 * Owner goal (mukoko-dev/mukoko-weather-mobile#54): weekly active people on
 * the app, measured first open -> first forecast -> saved place. The events
 * here are the ones that measure it, plus the few the web already counts.
 *
 * What an event may carry, by type AND at runtime (`validateEvent`):
 *   - an enum value, a boolean or a small whole number;
 *   - a coarse place: an ISO 3166-1 alpha-2 country code and/or a geohash
 *     cell of at most 4 characters (about 39 x 20 km), the same coarsening
 *     the web applies before anything leaves the browser;
 *   - never free text (a search query, a place name, a slug, a message),
 *     never a coordinate, never anything about the device beyond platform
 *     and app version (sent once per batch, not per event).
 *
 * Anything else is dropped, so a mistake at a call site loses one event
 * instead of leaking what a person typed.
 */

import { encodeCell } from "@/analytics/geohash";

// --- coarse place ------------------------------------------------------------

declare const countryBrand: unique symbol;
declare const cellBrand: unique symbol;

/** An ISO 3166-1 alpha-2 code, only ever produced by `countryCode()`. */
export type CountryCode = string & { readonly [countryBrand]: true };

/** A geohash cell of 1-4 characters, only ever produced by `coarsePlace()`. */
export type GeohashCell = string & { readonly [cellBrand]: true };

/** Where an event happened, no finer than a ~39 x 20 km cell. */
export type CoarsePlace = { country?: CountryCode; cell?: GeohashCell };

const COUNTRY_RE = /^[A-Z]{2}$/;
/** The geohash alphabet (no a, i, l, o), at most four characters. */
const CELL_RE = /^[0-9b-hjkmnp-z]{1,4}$/;

/** The country code in `raw` when it is one (`zw` -> `ZW`), else undefined. */
export function countryCode(raw: unknown): CountryCode | undefined {
  if (typeof raw !== "string") return undefined;
  const code = raw.trim().toUpperCase();
  return COUNTRY_RE.test(code) ? (code as CountryCode) : undefined;
}

/**
 * The coarse place for a coordinate and a country: the coordinate itself never
 * leaves this function, only its 4-character geohash cell.
 */
export function coarsePlace(input: {
  lat?: number;
  lon?: number;
  country?: unknown;
}): CoarsePlace | undefined {
  const place: CoarsePlace = {};
  const country = countryCode(input.country);
  if (country) place.country = country;
  const cell = encodeCell(input.lat, input.lon);
  if (cell) place.cell = cell as GeohashCell;
  return place.country || place.cell ? place : undefined;
}

// --- the vocabulary ----------------------------------------------------------

/** Report types, as `src/lib/report-types.ts` on the web lists them. */
export const REPORT_TYPES = [
  "light-rain",
  "heavy-rain",
  "thunderstorm",
  "hail",
  "flooding",
  "strong-wind",
  "clear-skies",
  "cloudy",
  "fog",
  "mist",
  "haze",
  "dust",
  "frost",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_SEVERITIES = ["mild", "moderate", "severe"] as const;
export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];

/** An activity id: a lowercase slug. The API checks it against /v1/activities. */
export type ActivitySlug = string & { readonly __activitySlug: true };
const ACTIVITY_RE = /^[a-z][a-z0-9-]{0,39}$/;

/** The activity slug in `raw` when it is one, else undefined. */
export function activitySlug(raw: unknown): ActivitySlug | undefined {
  return typeof raw === "string" && ACTIVITY_RE.test(raw)
    ? (raw as ActivitySlug)
    : undefined;
}

/** Most saved places a person can have (MAX_SAVED_LOCATIONS). */
const MAX_SAVED = 10;

/**
 * Every event and what it carries. Web names, where the web already counts the
 * same thing: place_saved = location_saved, activity_selected =
 * activity_toggled, report_submitted = report_submitted.
 */
export type EventProps = {
  /** The first open of this install (or of a reset install id). */
  first_open: { origin: "install" | "reset" };
  /** A forecast was on screen: the home tab, or a place's page. */
  forecast_shown: { surface: "home" | "place"; place?: CoarsePlace };
  /** A place was added to the saved list. `savedCount` is the count after. */
  place_saved: {
    method: "search" | "gps";
    savedCount: number;
    place?: CoarsePlace;
  };
  /** An activity was switched on or off. */
  activity_selected: { activity: ActivitySlug; enabled: boolean };
  /** A community weather report was filed. */
  report_submitted: {
    reportType: ReportType;
    severity: ReportSeverity;
    place?: CoarsePlace;
  };
  /** Push notifications were offered and answered. */
  push_enabled: { granted: boolean };
  /** The share sheet was opened. */
  share: { surface: "place" | "forecast" | "app" };
  /** A premium surface was seen. */
  upgrade_viewed: { surface: "map" | "settings" | "other" };
};

export type EventName = keyof EventProps;

export const EVENT_NAMES: readonly EventName[] = [
  "first_open",
  "forecast_shown",
  "place_saved",
  "activity_selected",
  "report_submitted",
  "push_enabled",
  "share",
  "upgrade_viewed",
];

/** One recorded event: the name, the minute it happened, what it carries. */
export type AppEvent<K extends EventName = EventName> = {
  name: K;
  /** ISO 8601, UTC, truncated to the minute. */
  at: string;
  props: EventProps[K];
};

// --- runtime validation -------------------------------------------------------

type Field =
  | { kind: "enum"; values: readonly string[]; optional?: boolean }
  | { kind: "boolean" }
  | { kind: "int"; min: number; max: number }
  | { kind: "activity" }
  | { kind: "place" };

const SCHEMA: { [K in EventName]: Record<keyof EventProps[K], Field> } = {
  first_open: { origin: { kind: "enum", values: ["install", "reset"] } },
  forecast_shown: {
    surface: { kind: "enum", values: ["home", "place"] },
    place: { kind: "place" },
  },
  place_saved: {
    method: { kind: "enum", values: ["search", "gps"] },
    savedCount: { kind: "int", min: 1, max: MAX_SAVED },
    place: { kind: "place" },
  },
  activity_selected: {
    activity: { kind: "activity" },
    enabled: { kind: "boolean" },
  },
  report_submitted: {
    reportType: { kind: "enum", values: REPORT_TYPES },
    severity: { kind: "enum", values: REPORT_SEVERITIES },
    place: { kind: "place" },
  },
  push_enabled: { granted: { kind: "boolean" } },
  share: { surface: { kind: "enum", values: ["place", "forecast", "app"] } },
  upgrade_viewed: {
    surface: { kind: "enum", values: ["map", "settings", "other"] },
  },
};

function validPlace(value: unknown): CoarsePlace | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v);
  if (keys.some((k) => k !== "country" && k !== "cell")) return null;
  const place: CoarsePlace = {};
  if (v.country !== undefined) {
    if (typeof v.country !== "string" || !COUNTRY_RE.test(v.country)) {
      return null;
    }
    place.country = v.country as CountryCode;
  }
  if (v.cell !== undefined) {
    if (typeof v.cell !== "string" || !CELL_RE.test(v.cell)) return null;
    place.cell = v.cell as GeohashCell;
  }
  return place;
}

/** `value` when it fits `field`, `undefined` when absent, `null` when wrong. */
function checkField(field: Field, value: unknown): unknown {
  switch (field.kind) {
    case "enum":
      return typeof value === "string" && field.values.includes(value)
        ? value
        : null;
    case "boolean":
      return typeof value === "boolean" ? value : null;
    case "int":
      return Number.isInteger(value) &&
        (value as number) >= field.min &&
        (value as number) <= field.max
        ? value
        : null;
    case "activity":
      return activitySlug(value) ?? null;
    case "place":
      if (value === undefined) return undefined;
      return validPlace(value);
  }
}

/**
 * The event's props, rebuilt from the schema, or `null` when the name is
 * unknown, a field is missing or wrong, or there is a field the schema does
 * not name. Nothing outside the schema survives.
 */
export function validateEvent(
  name: unknown,
  props: unknown,
): { name: EventName; props: Record<string, unknown> } | null {
  if (typeof name !== "string" || !EVENT_NAMES.includes(name as EventName)) {
    return null;
  }
  if (!props || typeof props !== "object" || Array.isArray(props)) return null;
  const schema = SCHEMA[name as EventName] as Record<string, Field>;
  const input = props as Record<string, unknown>;
  if (Object.keys(input).some((k) => !(k in schema))) return null;

  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    const checked = checkField(field, input[key]);
    if (checked === null) return null;
    if (checked !== undefined) out[key] = checked;
  }
  return { name: name as EventName, props: out };
}

/** `date` as ISO 8601 UTC, truncated to the minute. */
export function minuteStamp(date: Date): string {
  const d = new Date(date.getTime());
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

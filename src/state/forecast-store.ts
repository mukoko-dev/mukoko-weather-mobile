/**
 * The last good forecast per place, kept on the phone (issue #69), so a page
 * that cannot reach the Worker still shows the weather it last had, marked
 * with its age, instead of an error. The web keeps the same copy per place in
 * IndexedDB; the rules (what is kept, how old is too old) are shared, in
 * src/shared/device-weather.ts.
 *
 * Storage: one small JSON file per place under the app's documents folder
 * (`expo-file-system`), `localStorage` on web. A forecast is tens of KB, past
 * what SecureStore is meant to hold. Nothing here is sent anywhere.
 *
 * Keys: a place's slug, or `home` for the Weather tab's own place. At most
 * MAX_STORED_PLACES are kept; the least recently saved go first. Every read
 * and write is best effort: a storage failure never reaches a screen.
 */

import { Platform } from "react-native";

import {
  type WeatherRecord,
  type WeatherResponse,
  weatherFromRecord,
} from "@/api/weather";
import {
  type Freshness,
  MAX_ENTRY_BYTES,
  MAX_STORED_PLACES,
  freshnessOf,
  rebaseBody,
  slimBody,
} from "@/shared/device-weather";
import { haversineKm } from "@/shared/icao-codes";

/** The Weather tab's own place (wherever the person is). */
export const HOME_KEY = "home";

const KEY = /^[a-z0-9-]{1,120}$/;
const INDEX = "index";

/** One place as kept on the device. */
export type StoredForecast = {
  v: 1;
  /** When the answer came from the Worker (epoch ms). */
  fetchedAt: number;
  /** What the page called the place. */
  name?: string;
  /** The place's slug, for its links (the home entry may have one). */
  slug?: string;
  record: WeatherRecord;
};

/** A stored forecast ready to draw. */
export type SavedView = {
  weather: WeatherResponse;
  fetchedAt: number;
  freshness: Freshness;
  name?: string;
  slug?: string;
};

/** Where the files live; swapped for memory in tests. */
export type ForecastStorage = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

function webStorage(): ForecastStorage {
  const name = (key: string) => `mukoko.forecast.${key}`;
  const ls = () => (typeof window === "undefined" ? null : window.localStorage);
  return {
    read: async (key) => ls()?.getItem(name(key)) ?? null,
    write: async (key, value) => ls()?.setItem(name(key), value),
    remove: async (key) => ls()?.removeItem(name(key)),
  };
}

function fileStorage(): ForecastStorage {
  // Loaded on first use, so a screen that never stores never loads it.
  const fs = () =>
    require("expo-file-system") as typeof import("expo-file-system");
  const dir = () => {
    const { Directory, Paths } = fs();
    const d = new Directory(Paths.document, "forecasts");
    if (!d.exists) d.create({ intermediates: true, idempotent: true });
    return d;
  };
  const file = (key: string) => new (fs().File)(dir(), `${key}.json`);
  return {
    read: async (key) => {
      const f = file(key);
      return f.exists ? await f.text() : null;
    },
    write: async (key, value) => {
      const f = file(key);
      if (!f.exists) f.create();
      await f.write(value);
    },
    remove: async (key) => {
      const f = file(key);
      if (f.exists) f.delete();
    },
  };
}

let storage: ForecastStorage | null = null;
function store(): ForecastStorage {
  if (!storage) storage = Platform.OS === "web" ? webStorage() : fileStorage();
  return storage;
}

/** Tests: use another storage (pass null to go back to the device's). */
export function setForecastStorage(next: ForecastStorage | null): void {
  storage = next;
}

/** Key -> when it was last saved. */
async function readIndex(): Promise<Record<string, number>> {
  try {
    const raw = await store().read(INDEX);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (KEY.test(k) && typeof v === "number") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Keep a real forecast for a place. The seasonal estimate is never kept: it
 * is a stand-in, and drawing it later as "saved weather" would be wrong.
 */
export function saveForecast(
  key: string,
  record: WeatherRecord,
  extra: { name?: string; slug?: string } = {},
  now: number = Date.now(),
): Promise<void> {
  // One save at a time: each reads, changes and writes the shared index, so
  // two at once would drop each other's entries (and their files would never
  // be evicted).
  const next = saving.then(() => saveNow(key, record, extra, now));
  saving = next;
  return next;
}

let saving: Promise<void> = Promise.resolve();

async function saveNow(
  key: string,
  record: WeatherRecord,
  extra: { name?: string; slug?: string },
  now: number,
): Promise<void> {
  if (!KEY.test(key) || key === INDEX) return;
  if (record.meta.provider === "fallback") return;
  try {
    const entry: StoredForecast = {
      v: 1,
      fetchedAt: now,
      name: extra.name,
      slug: extra.slug,
      record: { ...record, raw: slimBody(record.raw) },
    };
    const json = JSON.stringify(entry);
    // UTF-16 length, close enough for a size guard (the web's measure too).
    if (json.length > MAX_ENTRY_BYTES) return;
    await store().write(key, json);
    const index = await readIndex();
    index[key] = now;
    const keys = Object.keys(index).sort((a, b) => index[b] - index[a]);
    for (const old of keys.slice(MAX_STORED_PLACES)) {
      delete index[old];
      await store().remove(old);
    }
    await store().write(INDEX, JSON.stringify(index));
  } catch {
    // Best effort: a full or failing disk costs the offline copy, nothing else.
  }
}

function parse(raw: string | null): StoredForecast | null {
  if (!raw) return null;
  try {
    const e = JSON.parse(raw) as Partial<StoredForecast>;
    if (
      e?.v !== 1 ||
      typeof e.fetchedAt !== "number" ||
      !e.record ||
      typeof e.record !== "object" ||
      !e.record.raw ||
      typeof e.record.raw !== "object"
    ) {
      return null;
    }
    return e as StoredForecast;
  } catch {
    return null;
  }
}

/**
 * The stored forecast for a place, re-based on now, or null when there is
 * none or it no longer covers the current hour (it is then deleted).
 */
export async function loadForecast(
  key: string,
  now: number = Date.now(),
): Promise<SavedView | null> {
  if (!KEY.test(key) || key === INDEX) return null;
  try {
    const entry = parse(await store().read(key));
    if (!entry) return null;
    const freshness = freshnessOf(entry.fetchedAt, entry.record.raw, now);
    if (!freshness) {
      await store().remove(key);
      return null;
    }
    const raw = rebaseBody(entry.record.raw, freshness, now);
    return {
      weather: weatherFromRecord({ ...entry.record, raw }),
      fetchedAt: entry.fetchedAt,
      freshness,
      name: entry.name,
      slug: entry.slug,
    };
  } catch {
    return null;
  }
}

/**
 * The kept home copy is shown for a fix only within this distance of where it
 * was fetched: offline in another city, the last city's weather is not "here".
 */
export const SAVED_HOME_RADIUS_KM = 25;

/**
 * Whether the kept home copy belongs to the point the Weather tab is showing.
 * The default city (no fix: `fallback`) is not the person's place, so any
 * copy of theirs is the better guess.
 */
export function savedHomeFits(
  view: SavedView,
  point: { lat: number; lon: number; fallback?: boolean },
): boolean {
  if (point.fallback) return true;
  const at = view.weather.location ?? view.weather.coordinates;
  if (!at) return false;
  return (
    haversineKm(point.lat, point.lon, at.lat, at.lon) <= SAVED_HOME_RADIUS_KM
  );
}

/**
 * The forecast kept per place on the phone (issue #69): what is kept, what is
 * given back and when, and that a storage failure never reaches a screen.
 */

import harare from "@/api/__fixtures__/weather-harare.json";
import { type WeatherRecord } from "@/api/weather";
import { MAX_STORED_PLACES } from "@/shared/device-weather";
import {
  type ForecastStorage,
  HOME_KEY,
  loadForecast,
  saveForecast,
  savedHomeFits,
  setForecastStorage,
} from "@/state/forecast-store";

function memory(): ForecastStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    read: async (k) => data.get(k) ?? null,
    write: async (k, v) => {
      data.set(k, v);
    },
    remove: async (k) => {
      data.delete(k);
    },
  };
}

function record(provider = "open-meteo:blend"): WeatherRecord {
  return {
    raw: harare as unknown as WeatherRecord["raw"],
    meta: { provider, fetchedAt: null },
    coordinates: { lat: -17.825, lon: 31.034 },
  };
}

/** 03:10 on 1 Nov at Harare (UTC+2), inside the fixture's hours. */
const NOW = Date.UTC(2026, 10, 1, 1, 10);

let store: ReturnType<typeof memory>;
beforeEach(() => {
  store = memory();
  setForecastStorage(store);
});
afterAll(() => setForecastStorage(null));

it("gives back a kept forecast, converted like a live one, with its age and name", async () => {
  await saveForecast(
    HOME_KEY,
    record(),
    { name: "Braeside", slug: "braeside" },
    NOW,
  );
  const view = await loadForecast(HOME_KEY, NOW + 20 * 60_000);
  expect(view).toMatchObject({
    fetchedAt: NOW,
    freshness: "current",
    name: "Braeside",
    slug: "braeside",
  });
  expect(view?.weather.current.temperature).toBe(harare.current.temperature_2m);
  expect(view?.weather.coordinates).toEqual({ lat: -17.825, lon: 31.034 });
  expect(view?.weather.utcOffsetSeconds).toBe(7200);
});

it("keeps neither the seasonal estimate nor a bad key", async () => {
  await saveForecast("harare", record("fallback"), {}, NOW);
  await saveForecast("../escape", record(), {}, NOW);
  await saveForecast("index", record(), {}, NOW);
  expect(store.data.size).toBe(0);
});

it("drops the bulky series it does not need", async () => {
  await saveForecast("harare", record(), {}, NOW);
  const kept = JSON.parse(store.data.get("harare") as string);
  expect(kept.record.raw.models).toBeUndefined();
  expect(kept.record.raw.minutely).toBeUndefined();
});

it("deletes and hides a copy whose hours no longer reach now", async () => {
  await saveForecast("harare", record(), {}, NOW);
  expect(await loadForecast("harare", NOW + 3 * 24 * 3_600_000)).toBeNull();
  expect(store.data.has("harare")).toBe(false);
});

it("keeps at most MAX_STORED_PLACES, dropping the least recently saved", async () => {
  for (let i = 0; i <= MAX_STORED_PLACES; i++) {
    await saveForecast(`place-${i}`, record(), {}, NOW + i);
  }
  expect(store.data.has("place-0")).toBe(false);
  expect(store.data.has(`place-${MAX_STORED_PLACES}`)).toBe(true);
  const index = JSON.parse(store.data.get("index") as string);
  expect(Object.keys(index)).toHaveLength(MAX_STORED_PLACES);
});

it("treats a corrupt or failing store as nothing kept, never an error", async () => {
  store.data.set("harare", "{not json");
  expect(await loadForecast("harare", NOW)).toBeNull();
  setForecastStorage({
    read: async () => {
      throw new Error("disk");
    },
    write: async () => {
      throw new Error("disk full");
    },
    remove: async () => undefined,
  });
  await expect(
    saveForecast("harare", record(), {}, NOW),
  ).resolves.toBeUndefined();
  expect(await loadForecast("harare", NOW)).toBeNull();
});

it("keeps two saves at once from losing each other's index entries", async () => {
  await Promise.all([
    saveForecast("a-place", record(), {}, NOW),
    saveForecast("b-place", record(), {}, NOW + 1),
  ]);
  const index = JSON.parse(store.data.get("index") as string);
  expect(Object.keys(index).sort()).toEqual(["a-place", "b-place"]);
});

it("shows the kept home copy only near the current fix", async () => {
  await saveForecast(HOME_KEY, record(), {}, NOW);
  const view = await loadForecast(HOME_KEY, NOW);
  if (!view) throw new Error("expected a kept copy");
  expect(savedHomeFits(view, { lat: -17.83, lon: 31.05 })).toBe(true);
  // Bulawayo, ~360 km away: not "here".
  expect(savedHomeFits(view, { lat: -20.15, lon: 28.58 })).toBe(false);
  // No fix at all (the default city): the person's last copy is the better guess.
  expect(savedHomeFits(view, { lat: -20.15, lon: 28.58, fallback: true })).toBe(
    true,
  );
});

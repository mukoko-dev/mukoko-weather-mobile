/**
 * Weather (home) tab: the weather where you are.
 *
 * Flow:
 *   1. Ask for foreground location permission.
 *   2. If granted, take a fine GPS fix and name the exact place with
 *      GET /v1/geo (the API answers a `{name}--{geohash}` place; nothing is
 *      stored).
 *   3. Fetch /v1/weather?lat=&lon= and show it.
 *   4. Pull to refresh re-runs the weather fetch (it does not re-locate).
 *
 * Without permission, or without a fix, it falls back to Harare, so the screen
 * always has weather to show; then the eyebrow does not say MY LOCATION.
 *
 * The page itself is `WeatherPage`, the same one a place's page uses, so the
 * two screens match each other and the web location page. This screen only
 * finds the place and loads the weather, and designs each state: loading
 * (`WeatherSkeleton`), failure (`WeatherError`) and ready.
 */

import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

import { geoLookup, type LocationSummary } from "@/api/locations";
import { fetchWeather, type WeatherResponse } from "@/api/weather";
import {
  HARARE_DEFAULT,
  PLACE_LOOKUP_TIMEOUT_MS,
  fallbackPlace,
  weatherForPage,
} from "@/api/place";
import { MukokoLogo } from "@/components/MukokoLogo";
import { WeatherError, WeatherPage } from "@/components/weather/WeatherPage";
import { WeatherSkeleton } from "@/components/weather/WeatherSkeleton";

/** Harare, Mukoko's editorial default, used when there is no location fix. */
const FALLBACK = HARARE_DEFAULT;

type Coords = {
  lat: number;
  lon: number;
  label?: string;
  /** The place the fix was named as, once the geo lookup has answered. */
  place?: LocationSummary;
  /** True once the geo lookup has answered or failed (see `weatherForPage`). */
  settled?: boolean;
  /** The place's slug, for the links to its forecast and atmosphere pages. */
  slug?: string;
  /** True for the Harare default: not the person's own location. */
  fallback?: boolean;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; weather: WeatherResponse }
  | { kind: "error"; message: string };

export default function WeatherHome() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const resolveLocation = useCallback(async (): Promise<Coords> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return { ...FALLBACK, fallback: true };
      // High accuracy so the API can name a road, shop or suburb rather than
      // the nearest city centre.
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      return { ...FALLBACK, fallback: true };
    }
  }, []);

  /**
   * Name the exact place under a GPS fix (nothing is stored). The Harare
   * default is only looked up, never named afresh.
   */
  const resolvePlace = useCallback(
    async (loc: Coords): Promise<LocationSummary | null> => {
      // A slow or hung reverse geocode never keeps the place cards away:
      // after the timeout they are drawn for the bare point.
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), PLACE_LOOKUP_TIMEOUT_MS);
        });
        const lookup = geoLookup(loc.lat, loc.lon, !loc.fallback).then(
          ({ location }) => location,
        );
        return await Promise.race([lookup, timeout]);
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
    [],
  );

  const load = useCallback(async (loc: Coords) => {
    try {
      const weather = await fetchWeather({ lat: loc.lat, lon: loc.lon });
      setState({ kind: "ready", weather });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "We could not load the weather.";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const loc = await resolveLocation();
      setCoords(loc);
      // Start the weather at once; name the place alongside, so a slow
      // geocode never holds the first paint.
      void load(loc);
      const found = await resolvePlace(loc);
      // Settled whether or not it was named: the place cards wait for this, so
      // they ask the Worker once, for the place, not first for the bare point.
      // The Harare default keeps its own name and links.
      setCoords((prev) => {
        const base = prev ?? loc;
        if (loc.fallback) {
          return { ...base, place: fallbackPlace(found), settled: true };
        }
        return {
          ...base,
          ...(found
            ? { label: found.name, slug: found.slug, place: found }
            : {}),
          settled: true,
        };
      });
    })();
  }, [load, resolveLocation, resolvePlace]);

  const onRefresh = useCallback(async () => {
    if (!coords) return;
    setRefreshing(true);
    // A fix the lookup could not name (slow, failed) gets another try.
    const naming =
      coords.settled && !coords.place && !coords.fallback
        ? resolvePlace(coords).then((found) => {
            if (found) {
              setCoords((prev) =>
                prev
                  ? {
                      ...prev,
                      label: found.name,
                      slug: found.slug,
                      place: found,
                    }
                  : prev,
              );
            }
          })
        : Promise.resolve();
    await Promise.all([load(coords), naming]);
    setRefreshing(false);
  }, [coords, load, resolvePlace]);

  const onRetry = useCallback(() => {
    if (!coords) return;
    setState({ kind: "loading" });
    void load(coords);
  }, [coords, load]);

  // The brand mark sits where a place page has Back, as the web header does.
  const brand = <MukokoLogo onSky testID="home-brand" />;
  if (state.kind === "loading") {
    return <WeatherSkeleton leading={brand} inTabs />;
  }
  if (state.kind === "error") {
    return (
      <WeatherError
        message={state.message}
        onRetry={onRetry}
        leading={brand}
        inTabs
      />
    );
  }

  const name =
    coords?.label ?? state.weather.location?.name ?? "Current location";
  return (
    <WeatherPage
      weather={weatherForPage(state.weather, coords)}
      name={name}
      slug={coords?.slug}
      isCurrentLocation={Boolean(coords && !coords.fallback)}
      leading={brand}
      onRefresh={onRefresh}
      refreshing={refreshing}
      inTabs
    />
  );
}

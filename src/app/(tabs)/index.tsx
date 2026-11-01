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

import { geoLookup } from "@/api/locations";
import { fetchWeather, type WeatherResponse } from "@/api/weather";
import { WeatherError, WeatherPage } from "@/components/weather/WeatherPage";
import { WeatherSkeleton } from "@/components/weather/WeatherSkeleton";

/** Harare, Mukoko's editorial default, used when there is no location fix. */
const FALLBACK = { lat: -17.8252, lon: 31.0335, label: "Harare" };

type Coords = {
  lat: number;
  lon: number;
  label?: string;
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

  /** Name the exact place under a GPS fix (nothing is stored). */
  const resolveName = useCallback(
    async (loc: Coords): Promise<string | null> => {
      try {
        const { location } = await geoLookup(loc.lat, loc.lon, true);
        return location?.name ?? null;
      } catch {
        return null;
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
      if (loc.label) return;
      const name = await resolveName(loc);
      if (name) setCoords((prev) => ({ ...(prev ?? loc), label: name }));
    })();
  }, [load, resolveLocation, resolveName]);

  const onRefresh = useCallback(async () => {
    if (!coords) return;
    setRefreshing(true);
    await load(coords);
    setRefreshing(false);
  }, [coords, load]);

  const onRetry = useCallback(() => {
    if (!coords) return;
    setState({ kind: "loading" });
    void load(coords);
  }, [coords, load]);

  if (state.kind === "loading") return <WeatherSkeleton inTabs />;
  if (state.kind === "error") {
    return <WeatherError message={state.message} onRetry={onRetry} inTabs />;
  }

  const name =
    coords?.label ?? state.weather.location?.name ?? "Current location";
  return (
    <WeatherPage
      weather={state.weather}
      name={name}
      isCurrentLocation={Boolean(coords && !coords.fallback)}
      onRefresh={onRefresh}
      refreshing={refreshing}
      inTabs
    />
  );
}

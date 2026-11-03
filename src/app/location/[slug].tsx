/**
 * A place's weather page, driven by a `slug` route param instead of GPS. It is
 * the same `WeatherPage` as the Weather tab (sky, hero, Conditions card, tiles,
 * the week), with a Back control at the left of the top row; this screen only
 * loads the place and designs the states: loading skeleton, failure with a way
 * to try again, ready, and pull to refresh.
 *
 * There is no native header: the hero's own top row carries Back, the trail,
 * Share and Settings, as the web's does.
 */

import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { coarsePlace, track } from "@/analytics";
import { failureMessage } from "@/api/failure";
import { fetchWeatherRecord, type WeatherResponse } from "@/api/weather";
import {
  BackControl,
  WeatherError,
  WeatherPage,
} from "@/components/weather/WeatherPage";
import { placeNameFromSlug } from "@/components/weather/location-routes";
import { WeatherSkeleton } from "@/components/weather/WeatherSkeleton";
import {
  type SavedView,
  loadForecast,
  saveForecast,
} from "@/state/forecast-store";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; weather: WeatherResponse }
  /**
   * The first paint: the copy kept on the phone, shown at once while the
   * request is on its way. The fresh answer replaces it in place.
   */
  | { kind: "stored"; view: SavedView }
  /** The Worker could not be reached; the copy kept on the phone is shown. */
  | { kind: "saved"; view: SavedView; reason: string }
  | { kind: "error"; message: string };

export default function LocationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  // One load at a time: a new load, or leaving the screen, aborts the last,
  // and only the latest may set the screen. Every update lands after the
  // awaited fetch, never synchronously in the mount effect.
  const inFlight = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!slug) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const { signal } = controller;
    try {
      const { weather, record } = await fetchWeatherRecord({ slug }, signal);
      if (signal.aborted) return;
      setState({ kind: "ready", weather });
      void saveForecast(slug, record, { name: weather.location?.name, slug });
      track("forecast_shown", {
        surface: "place",
        place: coarsePlace(weather.location ?? {}),
      });
    } catch (err) {
      if (signal.aborted) return;
      // The forecast this phone kept for the place, with its age, beats an
      // error face.
      const view = await loadForecast(slug);
      if (signal.aborted) return;
      setState(
        view
          ? { kind: "saved", view, reason: failureMessage(err) }
          : { kind: "error", message: failureMessage(err) },
      );
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [slug]);

  useEffect(() => {
    // The kept copy paints at once (a local read); only a screen still
    // loading takes it, so a fresh answer is never replaced by an older one.
    if (slug) {
      void loadForecast(slug).then((kept) => {
        if (!kept) return;
        setState((prev) =>
          prev.kind === "loading" ? { kind: "stored", view: kept } : prev,
        );
      });
    }
    void load();
    return () => inFlight.current?.abort();
  }, [load, slug]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onRetry = useCallback(() => {
    // The kept copy stays on screen while it tries again.
    setState((prev) =>
      prev.kind === "saved" || prev.kind === "stored"
        ? prev
        : { kind: "loading" },
    );
    void load();
  }, [load]);

  const fallbackName = placeNameFromSlug(slug);
  const name =
    state.kind === "ready"
      ? (state.weather.location?.name ?? fallbackName)
      : state.kind === "saved" || state.kind === "stored"
        ? (state.view.name ?? fallbackName)
        : fallbackName;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: name }} />
      {!slug ? (
        <WeatherError
          message="No place was chosen."
          onRetry={onRetry}
          leading={<BackControl />}
        />
      ) : state.kind === "loading" ? (
        <WeatherSkeleton leading={<BackControl />} onRetry={onRetry} />
      ) : state.kind === "error" ? (
        <WeatherError
          message={state.message}
          onRetry={onRetry}
          leading={<BackControl />}
        />
      ) : state.kind === "stored" ? (
        <WeatherPage
          weather={state.view.weather}
          name={name}
          slug={slug}
          leading={<BackControl />}
          onRefresh={onRefresh}
          refreshing
        />
      ) : state.kind === "saved" ? (
        <WeatherPage
          weather={state.view.weather}
          name={name}
          slug={slug}
          leading={<BackControl />}
          onRefresh={onRefresh}
          refreshing={refreshing}
          saved={{
            fetchedAt: state.view.fetchedAt,
            forecastOnly: state.view.freshness === "forecast",
            reason: state.reason,
            onRetry,
          }}
        />
      ) : (
        <WeatherPage
          weather={state.weather}
          name={name}
          leading={<BackControl />}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
    </>
  );
}

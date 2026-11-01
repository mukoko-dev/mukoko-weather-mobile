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
import { useCallback, useEffect, useState } from "react";

import { fetchWeather, type WeatherResponse } from "@/api/weather";
import {
  BackControl,
  WeatherError,
  WeatherPage,
} from "@/components/weather/WeatherPage";
import { WeatherSkeleton } from "@/components/weather/WeatherSkeleton";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; weather: WeatherResponse }
  | { kind: "error"; message: string };

function titleCaseSlug(slug: string | undefined): string {
  if (!slug) return "Location";
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function LocationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  // Every update lands after the awaited fetch, never synchronously in the
  // mount effect.
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const weather = await fetchWeather({ slug }, signal);
        setState({ kind: "ready", weather });
      } catch (err) {
        if (signal?.aborted) return;
        setState({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "We could not load the weather.",
        });
      }
    },
    [slug],
  );

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    void (async () => {
      await load(controller.signal);
    })();
    return () => controller.abort();
  }, [load, slug]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onRetry = useCallback(() => {
    setState({ kind: "loading" });
    void load();
  }, [load]);

  const fallbackName = titleCaseSlug(slug);
  const name =
    state.kind === "ready"
      ? (state.weather.location?.name ?? fallbackName)
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
        <WeatherSkeleton leading={<BackControl />} />
      ) : state.kind === "error" ? (
        <WeatherError
          message={state.message}
          onRetry={onRetry}
          leading={<BackControl />}
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

/**
 * Loads one place's weather by slug for a detail page, with every state the
 * page designs for: `loading` (nothing yet), `ready`, `error` (with the API's
 * words), plus pull-to-refresh and retry. A place the app has just shown is
 * `ready` at once from the in-memory cache (src/hooks/weather-cache.ts);
 * otherwise it is fetched through the one API door.
 */

import { useCallback, useEffect, useState } from "react";

import { fetchWeather, type WeatherResponse } from "@/api/weather";
import { recallWeather, rememberWeather } from "@/hooks/weather-cache";

export type DetailLoad =
  | { kind: "loading" }
  | { kind: "ready"; weather: WeatherResponse }
  | { kind: "error"; message: string };

export function useLocationWeather(slug: string | undefined) {
  const [state, setState] = useState<DetailLoad>(() => {
    const hit = slug ? recallWeather(slug) : undefined;
    return hit ? { kind: "ready", weather: hit } : { kind: "loading" };
  });
  const [refreshing, setRefreshing] = useState(false);

  // Every update lands after the awaited fetch, never synchronously in the
  // mount effect.
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) return;
      try {
        const weather = await fetchWeather({ slug }, signal);
        rememberWeather(slug, weather);
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
    if (!slug || recallWeather(slug)) return;
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

  return { state, refreshing, onRefresh, onRetry };
}

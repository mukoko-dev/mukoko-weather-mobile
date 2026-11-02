/**
 * Loads one place's weather by slug for a detail page, with every state the
 * page designs for: `loading` (nothing yet), `ready`, `error` (with the API's
 * words), plus pull-to-refresh and retry. A place the app has just shown is
 * `ready` at once from the in-memory cache (src/hooks/weather-cache.ts);
 * otherwise it is fetched through the one API door.
 *
 * The state belongs to the slug it was loaded for. If the screen stays mounted
 * while the slug changes (a route reused for another place), the old place's
 * weather is never shown under the new one: the hook starts again for the new
 * place, from the cache or at `loading`, and holds that state from then on.
 *
 * - The seasonal estimate (`source: "fallback"`) is not a forecast, so it is
 *   never drawn as one: it is an error the person can retry.
 * - A refresh that fails keeps the page on screen and says so
 *   (`refreshError`); only a first load that fails shows the error face.
 * - One request at a time: a new load, or leaving the screen, aborts the last.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchWeather, type WeatherResponse } from "@/api/weather";
import {
  recallPlaceName,
  recallWeather,
  rememberWeather,
} from "@/hooks/weather-cache";

export type DetailLoad =
  | { kind: "loading" }
  | { kind: "ready"; weather: WeatherResponse }
  | { kind: "error"; message: string };

/** Said instead of drawing the seasonal estimate as a forecast. */
export const FALLBACK_MESSAGE =
  "The live forecast for this place is unavailable right now. Try again in a few minutes.";

/** What a place shows before its own answer arrives. */
function initialLoad(slug: string | undefined): DetailLoad {
  const hit = slug ? recallWeather(slug) : undefined;
  return hit ? { kind: "ready", weather: hit } : { kind: "loading" };
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "We could not load the weather.";
}

type Held = {
  slug: string | undefined;
  load: DetailLoad;
  refreshError?: string;
};

export function useLocationWeather(slug: string | undefined) {
  const [held, setHeld] = useState<Held>(() => ({
    slug,
    load: initialLoad(slug),
  }));
  // A new slug starts again, once, and that state is then held: it is not
  // re-read from the cache on every render, so an entry expiring later can
  // never drop a drawn page back to the skeleton.
  let current = held;
  if (held.slug !== slug) {
    current = { slug, load: initialLoad(slug) };
    setHeld(current);
  }
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  // Every update lands after the awaited fetch, never synchronously in the
  // mount effect.
  const load = useCallback(async () => {
    if (!slug) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const { signal } = controller;
    try {
      const weather = await fetchWeather({ slug }, signal);
      if (signal.aborted) return;
      if (weather.source === "fallback") throw new Error(FALLBACK_MESSAGE);
      rememberWeather(slug, weather, Date.now(), recallPlaceName(slug));
      setHeld({ slug, load: { kind: "ready", weather } });
    } catch (err) {
      if (signal.aborted) return;
      setHeld((prev) =>
        prev.slug === slug && prev.load.kind === "ready"
          ? { ...prev, refreshError: messageOf(err) }
          : { slug, load: { kind: "error", message: messageOf(err) } },
      );
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [slug]);

  const needsFetch = current.load.kind === "loading";
  useEffect(() => {
    if (!slug || !needsFetch) return;
    void load();
  }, [load, slug, needsFetch]);

  // Leaving the screen stops whatever is still on the way.
  useEffect(() => () => inFlight.current?.abort(), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onRetry = useCallback(() => {
    setHeld({ slug, load: { kind: "loading" } });
  }, [slug]);

  return {
    state: current.load,
    refreshError: current.refreshError,
    refreshing,
    onRefresh,
    onRetry,
  };
}

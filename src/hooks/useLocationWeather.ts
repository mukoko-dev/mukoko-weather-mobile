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
 *   (`refreshError`). A first load that fails shows the forecast kept on the
 *   phone (src/state/forecast-store.ts) when there is one, saying so, and
 *   only otherwise the error face. Every message follows the cause
 *   (src/api/failure.ts), never the error's own text.
 * - One request at a time: a new load, or leaving the screen, aborts the last.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FAILURE_COPY,
  ProviderFallbackError,
  failureMessage,
} from "@/api/failure";
import { fetchWeather, type WeatherResponse } from "@/api/weather";
import {
  recallPlaceName,
  recallWeather,
  rememberWeather,
} from "@/hooks/weather-cache";
import { updatedAgoLabel } from "@/shared/device-weather";
import { loadForecast } from "@/state/forecast-store";

export type DetailLoad =
  | { kind: "loading" }
  | { kind: "ready"; weather: WeatherResponse }
  | { kind: "error"; message: string };

/** Said instead of drawing the seasonal estimate as a forecast. */
export const FALLBACK_MESSAGE = FAILURE_COPY.provider;

/** What a place shows before its own answer arrives. */
function initialLoad(slug: string | undefined): DetailLoad {
  const hit = slug ? recallWeather(slug) : undefined;
  return hit ? { kind: "ready", weather: hit } : { kind: "loading" };
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
      if (weather.source === "fallback") throw new ProviderFallbackError();
      rememberWeather(slug, weather, Date.now(), recallPlaceName(slug));
      setHeld({ slug, load: { kind: "ready", weather } });
    } catch (err) {
      if (signal.aborted) return;
      const reason = failureMessage(err);
      // Nothing on screen yet: the copy the phone kept for this place, with
      // its age, beats an error face.
      const saved = await loadForecast(slug);
      if (signal.aborted) return;
      setHeld((prev) => {
        if (prev.slug === slug && prev.load.kind === "ready") {
          return { ...prev, refreshError: reason };
        }
        if (saved) {
          const age = updatedAgoLabel(saved.fetchedAt).toLowerCase();
          return {
            slug,
            load: { kind: "ready", weather: saved.weather },
            refreshError: `${reason} Showing what is saved on this device, ${age}.`,
          };
        }
        return { slug, load: { kind: "error", message: reason } };
      });
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

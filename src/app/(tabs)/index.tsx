/**
 * Weather (home) tab: the weather where you are.
 *
 * Flow (the web's CurrentLocationHome):
 *   1. Read the location permission WITHOUT asking. Never decided or off:
 *      show the default city's weather at once, with the location ask over it
 *      (`LocationPromptCard`: why it is asked, "Use my location"; when off,
 *      why plus Settings and Search). The system prompt only ever follows a
 *      tap on "Use my location" (issues #65, #66).
 *   2. If already granted (or granted after the tap), take a fine GPS fix and name the exact place with
 *      GET /v1/geo (the API answers a `{name}--{geohash}` place; nothing is
 *      stored).
 *   3. Fetch /v1/weather?lat=&lon= and show it, and keep it on the phone.
 *   4. Pull to refresh re-runs the weather fetch (it does not re-locate).
 *
 * When the Worker cannot be reached (offline, timed out, the source down) the
 * forecast kept from the last good load is shown with its age and the cause
 * (`saved`); with nothing kept, the error face says the cause in plain words.
 *
 * Without permission, or without a fix, it falls back to Harare, so the screen
 * always has weather to show; then neither the eyebrow nor the bar's chip
 * says My Location (src/state/home-status.ts).
 *
 * The page itself is `WeatherPage`, the same one a place's page uses, so the
 * two screens match each other and the web location page. This screen only
 * finds the place and loads the weather, and designs each state: loading
 * (`WeatherSkeleton`, which says it is still trying after a few seconds),
 * saved, failure (`WeatherError`) and ready.
 */

import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";

import { failureMessage } from "@/api/failure";
import { geoLookup, type LocationSummary } from "@/api/locations";
import {
  fetchWeatherRecord,
  type WeatherRecord,
  type WeatherResponse,
} from "@/api/weather";
import {
  HARARE_DEFAULT,
  PLACE_LOOKUP_TIMEOUT_MS,
  fallbackPlace,
  weatherForPage,
} from "@/api/place";
import { MukokoLogo } from "@/components/MukokoLogo";
import {
  type LocationProblem,
  LocationPromptCard,
} from "@/components/weather/LocationPromptCard";
import { WeatherError, WeatherPage } from "@/components/weather/WeatherPage";
import { WeatherSkeleton } from "@/components/weather/WeatherSkeleton";
import {
  HOME_KEY,
  type SavedView,
  loadForecast,
  saveForecast,
  savedHomeFits,
} from "@/state/forecast-store";
import { setHomeStandIn } from "@/state/home-status";
import { locationAskPutOff, putOffLocationAsk } from "@/state/location-ask";

/** Harare, Mukoko's editorial default, used when there is no location fix. */
const FALLBACK = HARARE_DEFAULT;
const DEFAULT_PLACE_NAME = FALLBACK.label ?? "Harare";

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
  /** The Worker could not be reached; the copy kept on the phone is shown. */
  | { kind: "saved"; view: SavedView; reason: string }
  | { kind: "error"; message: string };

export default function WeatherHome() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  // The location ask (the web's LocationPromptCard): shown over the default
  // city, never on the first frame as a system alert.
  const [ask, setAsk] = useState<{
    busy: boolean;
    problem: LocationProblem | null;
  }>({ busy: false, problem: null });
  const [askDismissed, setAskDismissed] = useState(true);

  /** A fine fix, or null when the phone could not give one. */
  const takeFix = useCallback(async (): Promise<Coords | null> => {
    try {
      // High accuracy so the API can name a road, shop or suburb rather than
      // the nearest city centre.
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      return null;
    }
  }, []);

  /**
   * Where to start without asking anything: the fix when location is already
   * allowed (silent, as the web refreshes when the browser already granted
   * it), else the default city at once. The system prompt only ever follows a
   * tap on "Use my location" (issue #65).
   */
  const resolveLocation = useCallback(async (): Promise<Coords> => {
    let status: Location.PermissionStatus | undefined;
    let canAskAgain = true;
    try {
      ({ status, canAskAgain } =
        await Location.getForegroundPermissionsAsync());
    } catch {
      status = undefined;
    }
    if (status === "granted") {
      const fix = await takeFix();
      if (fix) return fix;
      setAsk({ busy: false, problem: "no-location" });
      return { ...FALLBACK, fallback: true };
    }
    // Denied: say so with a way forward (issue #66). Never asked: offer the
    // ask, unless it was put off recently.
    if (status === "denied" && !canAskAgain) {
      setAsk({ busy: false, problem: "denied" });
    }
    return { ...FALLBACK, fallback: true };
  }, [takeFix]);

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

  // One load at a time: a retry or a refresh aborts the last one, and only
  // the latest may set the screen.
  const inFlight = useRef<AbortController | null>(null);
  // The last good answer, kept again under the place's name once it is known.
  const lastRecord = useRef<WeatherRecord | null>(null);
  // The place the fix was named as, whichever of the two answers came first.
  const named = useRef<LocationSummary | null>(null);

  const load = useCallback(async (loc: Coords) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const { signal } = controller;
    try {
      const { weather, record } = await fetchWeatherRecord(
        { lat: loc.lat, lon: loc.lon },
        signal,
      );
      if (signal.aborted) return;
      setState({ kind: "ready", weather });
      lastRecord.current = record;
      void saveForecast(HOME_KEY, record, {
        name: named.current?.name ?? loc.label ?? record.place?.name,
        slug: named.current?.slug ?? loc.slug,
      });
    } catch (err) {
      if (signal.aborted) return;
      // The Worker could not be reached: the forecast this phone kept from
      // the last good load, with its age, beats an error.
      const kept = await loadForecast(HOME_KEY);
      if (signal.aborted) return;
      const view = kept && savedHomeFits(kept, loc) ? kept : null;
      setState(
        view
          ? { kind: "saved", view, reason: failureMessage(err) }
          : { kind: "error", message: failureMessage(err) },
      );
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, []);

  useEffect(() => () => inFlight.current?.abort(), []);

  /** Show the weather for `loc` and name the place alongside. */
  const start = useCallback(
    async (loc: Coords) => {
      named.current = null;
      lastRecord.current = null;
      setCoords(loc);
      setHomeStandIn(loc.fallback ? DEFAULT_PLACE_NAME : null);
      // Start the weather at once; name the place alongside, so a slow
      // geocode never holds the first paint.
      void load(loc);
      const found = await resolvePlace(loc);
      // Settled whether or not it was named: the place cards wait for this, so
      // they ask the Worker once, for the place, not first for the bare point.
      // The Harare default keeps its own name and links.
      setCoords((prev) => {
        // A newer start (the person tapped "Use my location") wins.
        if (prev && (prev.lat !== loc.lat || prev.lon !== loc.lon)) return prev;
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
      // The kept copy carries the place's name and links once it has them.
      if (found && !loc.fallback) named.current = found;
      if (found && !loc.fallback && lastRecord.current) {
        void saveForecast(HOME_KEY, lastRecord.current, {
          name: found.name,
          slug: found.slug,
        });
      }
    },
    [load, resolvePlace],
  );

  useEffect(() => {
    void (async () => {
      const [loc, putOff] = await Promise.all([
        resolveLocation(),
        locationAskPutOff(),
      ]);
      setAskDismissed(putOff);
      await start(loc);
    })();
  }, [resolveLocation, start]);

  // Leaving home with the default city shown: the bar's My Location is not
  // standing in for anything any more.
  useEffect(() => () => setHomeStandIn(null), []);

  /** "Use my location": the only path to the system prompt. */
  const onUseLocation = useCallback(async () => {
    setAsk({ busy: true, problem: null });
    let granted = false;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      granted = status === "granted";
    } catch {
      granted = false;
    }
    if (!granted) {
      setAsk({ busy: false, problem: "denied" });
      return;
    }
    const fix = await takeFix();
    if (!fix) {
      setAsk({ busy: false, problem: "no-location" });
      return;
    }
    setAsk({ busy: false, problem: null });
    setState({ kind: "loading" });
    await start(fix);
  }, [start, takeFix]);

  const onDismissAsk = useCallback(() => {
    setAskDismissed(true);
    setAsk((prev) => ({ ...prev, problem: null }));
    void putOffLocationAsk();
  }, []);

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
    // The saved copy stays on screen while it tries again.
    setState((prev) => (prev.kind === "saved" ? prev : { kind: "loading" }));
    void load(coords);
  }, [coords, load]);

  // The brand mark sits where a place page has Back, as the web header does.
  // The mark alone: the trail (Home / country / province / place) shares the
  // row, and the full wordmark would wrap it onto three lines on a phone.
  const brand = <MukokoLogo onSky showWordmark={false} testID="home-brand" />;
  // Over the default city: say it is a stand-in, why, and the ways forward
  // (issues #65, #66). Gone once the person's own place is on screen.
  const showAsk = Boolean(coords?.fallback) && (!askDismissed || !!ask.problem);
  const notice = showAsk ? (
    <LocationPromptCard
      placeName={standInName(coords)}
      busy={ask.busy}
      problem={ask.problem}
      onUseLocation={() => void onUseLocation()}
      onDismiss={onDismissAsk}
      onSearch={() => router.navigate("/my")}
      onOpenSettings={() => void Linking.openSettings()}
    />
  ) : undefined;
  if (state.kind === "loading") {
    // "Still trying" is about the weather service, so it waits for the fix:
    // while the GPS is still locating there is no request to retry.
    return (
      <WeatherSkeleton
        leading={brand}
        inTabs
        onRetry={coords ? onRetry : undefined}
      />
    );
  }
  if (state.kind === "saved") {
    const { view } = state;
    return (
      <WeatherPage
        weather={view.weather}
        name={view.name ?? view.weather.location?.name ?? "Your last place"}
        slug={view.slug}
        leading={brand}
        onRefresh={onRefresh}
        refreshing={refreshing}
        inTabs
        notice={notice}
        saved={{
          fetchedAt: view.fetchedAt,
          forecastOnly: view.freshness === "forecast",
          reason: state.reason,
          onRetry,
        }}
      />
    );
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
      notice={notice}
    />
  );
}

/** The name the default city is shown under. */
function standInName(coords: Coords | null): string {
  return coords?.label ?? coords?.place?.name ?? DEFAULT_PLACE_NAME;
}

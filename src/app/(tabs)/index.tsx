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
import { AppState, Linking } from "react-native";

import { coarsePlace, track } from "@/analytics";
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
import { haversineKm } from "@/shared/icao-codes";
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

/** How a weather load ended. */
type LoadOutcome = "ready" | "saved" | "error" | "aborted";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; weather: WeatherResponse }
  /**
   * The first paint: the copy kept on the phone, shown at once while the fix
   * and the request are on their way. The fresh answer replaces it in place.
   */
  | { kind: "stored"; view: SavedView }
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
  // True until the permission read (and the fix, if allowed) has finished: the
  // ask waits for it, so it never flashes over a person who has said yes.
  const [locating, setLocating] = useState(true);

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
   * The person's fix, when location is already allowed (silent, as the web
   * refreshes when the browser already granted it), else null. Never asks:
   * the system prompt only ever follows a tap on "Use my location" (issue
   * #65). The screen does not wait for this: the weather is already on its
   * way (issue #94) and the fix upgrades it in place.
   */
  const resolveFix = useCallback(async (): Promise<Coords | null> => {
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
      return null;
    }
    // Denied: say so with a way forward (issue #66). Never asked: offer the
    // ask, unless it was put off recently.
    if (status === "denied" && !canAskAgain) {
      setAsk({ busy: false, problem: "denied" });
    }
    return null;
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

  const load = useCallback(async (loc: Coords): Promise<LoadOutcome> => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const { signal } = controller;
    try {
      const { weather, record } = await fetchWeatherRecord(
        { lat: loc.lat, lon: loc.lon },
        signal,
      );
      if (signal.aborted) return "aborted";
      setState({ kind: "ready", weather });
      lastRecord.current = record;
      void saveForecast(HOME_KEY, record, {
        name: named.current?.name ?? loc.label ?? record.place?.name,
        slug: named.current?.slug ?? loc.slug,
      });
      // Coarse place only: the fix's ~39 x 20 km cell and the country code.
      track("forecast_shown", {
        surface: "home",
        place: coarsePlace({
          lat: loc.lat,
          lon: loc.lon,
          country:
            weather.location?.country ??
            loc.place?.country ??
            (loc.fallback ? FALLBACK.country : undefined),
        }),
      });
      return "ready";
    } catch (err) {
      if (signal.aborted) return "aborted";
      // The Worker could not be reached: the forecast this phone kept from
      // the last good load, with its age, beats an error.
      const kept = await loadForecast(HOME_KEY);
      if (signal.aborted) return "aborted";
      const view = kept && savedHomeFits(kept, loc) ? kept : null;
      setState(
        view
          ? { kind: "saved", view, reason: failureMessage(err) }
          : { kind: "error", message: failureMessage(err) },
      );
      return view ? "saved" : "error";
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, []);

  useEffect(() => () => inFlight.current?.abort(), []);

  // Which start is the latest: an older start's place lookup never writes
  // over a newer one (the person tapped "Use my location" meanwhile).
  const startToken = useRef(0);

  /**
   * Show the weather for `loc` and name the place alongside. Resolves with
   * how the weather load ended.
   */
  const start = useCallback(
    async (loc: Coords): Promise<LoadOutcome> => {
      const token = ++startToken.current;
      named.current = null;
      lastRecord.current = null;
      setCoords(loc);
      setHomeStandIn(loc.fallback ? DEFAULT_PLACE_NAME : null);
      // Start the weather at once; name the place alongside, so a slow
      // geocode never holds the first paint.
      const loaded = load(loc);
      const found = await resolvePlace(loc);
      if (token !== startToken.current) return loaded;
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
      // The kept copy carries the place's name and links once it has them.
      if (found && !loc.fallback) named.current = found;
      if (found && !loc.fallback && lastRecord.current) {
        void saveForecast(HOME_KEY, lastRecord.current, {
          name: found.name,
          slug: found.slug,
        });
      }
      return loaded;
    },
    [load, resolvePlace],
  );

  // Nothing here waits on the location or the GPS fix (issue #94). The kept
  // copy paints first (a local read), the request starts at once for the place
  // that copy was for (else the default city), and the fix, when there is one,
  // upgrades it in place. With a kept copy the default city is never started,
  // so a person's own place is never replaced by Harare while the GPS locates.
  useEffect(() => {
    void locationAskPutOff().then(setAskDismissed);
    void (async () => {
      const kept = await loadForecast(HOME_KEY);
      if (kept) {
        setState((prev) =>
          prev.kind === "loading" ? { kind: "stored", view: kept } : prev,
        );
      }
      const first = (kept && keptCoords(kept)) || {
        ...FALLBACK,
        fallback: true,
      };
      void start(first);
      const fix = await resolveFix();
      setLocating(false);
      if (fix) {
        // The person's place did not load and nothing is kept for it: back to
        // the default city's weather, saying why, rather than an error face.
        if ((await start(fix)) === "error") {
          setAsk({ busy: false, problem: "no-weather" });
          await start({ ...FALLBACK, fallback: true });
        }
      } else if (!first.fallback) {
        // No fix after all (denied, off, or none came): the kept place was a
        // guess, so the default city stands in, as it always did.
        await start({ ...FALLBACK, fallback: true });
      }
    })();
  }, [resolveFix, start]);

  // Leaving home with the default city shown: the bar's My Location is not
  // standing in for anything any more.
  useEffect(() => () => setHomeStandIn(null), []);

  /** "Use my location": the only path to the system prompt. */
  const onUseLocation = useCallback(async () => {
    setAsk({ busy: true, problem: null });
    let answer: { status?: string; canAskAgain?: boolean } = {};
    try {
      answer = await Location.requestForegroundPermissionsAsync();
    } catch {
      answer = {};
    }
    if (answer.status !== "granted") {
      // Blocked for good (iOS after one "Don't Allow"): only Settings can
      // change it. Declined but askable again (Android): offer the ask again.
      setAsk({
        busy: false,
        problem: answer.canAskAgain === false ? "denied" : "declined",
      });
      return;
    }
    const fix = await takeFix();
    if (!fix) {
      setAsk({ busy: false, problem: "no-location" });
      return;
    }
    setAsk({ busy: false, problem: null });
    setState({ kind: "loading" });
    // The person's place did not load and nothing is kept for it: back to
    // the default city's weather, saying why, rather than an error face.
    if ((await start(fix)) === "error") {
      setAsk({ busy: false, problem: "no-weather" });
      await start({ ...FALLBACK, fallback: true });
    }
  }, [start, takeFix]);

  // Back from Settings (or anywhere): read the permission again, so turning
  // location on there takes effect at once.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active" || !coords?.fallback || ask.busy) return;
      void (async () => {
        try {
          const { status, canAskAgain } =
            await Location.getForegroundPermissionsAsync();
          if (status === "granted") {
            const fix = await takeFix();
            if (fix) {
              setAsk({ busy: false, problem: null });
              await start(fix);
            }
          } else if (status === "denied" && !canAskAgain) {
            setAsk({ busy: false, problem: "denied" });
          }
        } catch {
          /* nothing changes */
        }
      })();
    });
    return () => sub.remove();
  }, [coords?.fallback, ask.busy, start, takeFix]);

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
    // The kept copy stays on screen while it tries again.
    setState((prev) =>
      prev.kind === "saved" || prev.kind === "stored"
        ? prev
        : { kind: "loading" },
    );
    void load(coords);
  }, [coords, load]);

  // The brand mark sits where a place page has Back, as the web header does.
  // The mark alone: the trail (Home / country / province / place) shares the
  // row, and the full wordmark would wrap it onto three lines on a phone.
  const brand = <MukokoLogo onSky showWordmark={false} testID="home-brand" />;
  // Over the default city: say it is a stand-in, why, and the ways forward
  // (issues #65, #66). Gone once the person's own place is on screen.
  const showAsk = Boolean(coords?.fallback) && !askDismissed && !locating;
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
  if (state.kind === "stored") {
    const { view } = state;
    // The refresh is on its way: the pull spinner says so, and no banner
    // speaks of a failure that has not happened.
    return (
      <WeatherPage
        weather={view.weather}
        name={view.name ?? view.weather.location?.name ?? "Your last place"}
        slug={view.slug}
        leading={brand}
        onRefresh={onRefresh}
        refreshing
        inTabs
        notice={notice}
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
        notice={notice}
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

/**
 * Where the kept home copy was for, to refresh it at once. The default city is
 * recognised (it is not the person's own place), and a copy with no point has
 * nothing to refresh.
 */
function keptCoords(kept: SavedView): Coords | null {
  const at = kept.weather.location ?? kept.weather.coordinates;
  if (!at) return null;
  const isDefault = haversineKm(at.lat, at.lon, FALLBACK.lat, FALLBACK.lon) < 5;
  return isDefault
    ? { ...FALLBACK, fallback: true }
    : { lat: at.lat, lon: at.lon, label: kept.name, slug: kept.slug };
}

/** The name the default city is shown under. */
function standInName(coords: Coords | null): string {
  return coords?.label ?? coords?.place?.name ?? DEFAULT_PLACE_NAME;
}

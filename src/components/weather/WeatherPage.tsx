/**
 * One weather page, for the Weather tab and for a place's page alike: the sky,
 * the hero, the Conditions card and the tile grid. The hourly and 7-day charts
 * and the atmospheric trends are the place's two detail pages, as on the web
 * ("Full forecast", "24h trends"). Both screens only
 * load the data and say what the eyebrow is; everything on the page is here, so
 * the two cannot drift apart (and neither can drift from the web).
 *
 * States are all designed: `WeatherSkeleton` while it loads, `WeatherError`
 * when it fails (with a way to try again, back, and settings), and, when the
 * forecast has no hourly series, the hero alone from what is known.
 */

import { type Href, router } from "expo-router";
import { type ReactNode, useEffect } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { type WeatherResponse } from "@/api/weather";
import { ChevronLeftIcon } from "@/components/icons/Icon";
import { useLocationLinks } from "@/hooks/useLocationLinks";
import { useNow } from "@/hooks/useNow";
import { rememberWeather } from "@/hooks/weather-cache";
import { usePageColors } from "@/hooks/usePageColors";
import { skyFamily } from "@/shared/hero";
import { weatherCodeToInfo } from "@/shared/weather";
import { RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { NEUTRAL_SKY, SKY_FG, SKY_FG_DIM, skyStops } from "@/theme/sky";

import { ConditionTiles } from "./ConditionTiles";
import { ConditionsCard } from "./ConditionsCard";
import { RoundControl } from "./RoundControl";
import { HeroTopRow, SkyHero } from "./SkyHero";
import { WeatherScroll } from "./WeatherScroll";
import { WxText } from "./WxText";

/** Open the Settings tab (sign in, theme, saved places). */
export function openSettings() {
  router.navigate("/my");
}

/**
 * Go back, or to `fallback` (home by default) when this page is the first
 * screen, as after opening a link that points straight at it.
 */
export function goBack(fallback: Href = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Back, for the left of the top row on a place's page. A detail page names
 * where it goes ("Back to Harare") and falls back to that place's page.
 */
export function BackControl({
  label = "Back",
  fallback,
}: {
  label?: string;
  fallback?: Href;
}) {
  return (
    <RoundControl
      label={label}
      onPress={() => goBack(fallback)}
      testID="back-control"
    >
      <ChevronLeftIcon size={SIZE.iconMd} color={SKY_FG} />
    </RoundControl>
  );
}

/**
 * A country's English name from its ISO 3166-1 alpha-2 code ("ZW" is
 * "Zimbabwe"), as the web's breadcrumb says it. Where the runtime has no region
 * names the code itself is shown, never nothing.
 */
export function countryLabel(code: string | undefined): string | undefined {
  if (!code) return undefined;
  if (!/^[A-Za-z]{2}$/.test(code)) return code;
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(
        code.toUpperCase(),
      ) ?? code
    );
  } catch {
    return code;
  }
}

/** The trail under the top row: country, then province. */
export function breadcrumbOf(
  location: WeatherResponse["location"],
): string | undefined {
  const parts = [countryLabel(location?.country), location?.province].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.length > 0 ? parts.join(" / ") : undefined;
}

/** What a share says. No link: the app talks to one backend and names no site. */
export function shareMessage(
  name: string,
  temperature: number | null | undefined,
  condition: string | undefined,
): string {
  const temp =
    typeof temperature === "number" ? `${Math.round(temperature)}°` : null;
  const parts = [temp, condition].filter(Boolean).join(", ");
  return `${name}${parts ? `: ${parts}` : ""}. Shared from mukoko weather.`;
}

/** Share a place's weather as a plain sentence (no link). */
export function shareWeather(
  name: string,
  temperature: number | null | undefined,
  condition: string | undefined,
): void {
  void Share.share({
    message: shareMessage(name, temperature, condition),
  }).catch(() => {
    /* a cancelled or failed share needs no message */
  });
}

export type WeatherPageProps = {
  weather: WeatherResponse;
  name: string;
  /**
   * The place's slug, for the links to its forecast and atmosphere pages.
   * Defaults to the slug the weather was loaded with; a place the API has not
   * named has none, and its cards then show no links.
   */
  slug?: string;
  /** The place under a GPS fix: the eyebrow says MY LOCATION. */
  isCurrentLocation?: boolean;
  isHome?: boolean;
  leading?: ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  inTabs?: boolean;
};

export function WeatherPage({
  weather,
  name,
  slug: slugProp,
  isCurrentLocation,
  isHome,
  leading,
  onRefresh,
  refreshing,
  inTabs,
}: WeatherPageProps) {
  const now = useNow();
  const { current, daily, forecast } = weather;
  const code = current.weatherCode ?? 0;
  const isDay = current.isDay ?? true;
  const family = skyFamily(code, isDay);
  const info = weatherCodeToInfo(code);
  const slug = slugProp ?? weather.location?.slug;
  const links = useLocationLinks(slug);

  // The detail pages open from this answer without asking again.
  useEffect(() => {
    if (slug) rememberWeather(slug, weather);
  }, [slug, weather]);

  const onShare = () => shareWeather(name, current.temperature, info.label);

  return (
    <WeatherScroll
      family={family}
      onRefresh={onRefresh}
      refreshing={refreshing}
      inTabs={inTabs}
    >
      <SkyHero
        name={name}
        temperature={current.temperature}
        weatherCode={code}
        isDay={isDay}
        high={daily[0]?.tempMax}
        low={daily[0]?.tempMin}
        utcOffsetSeconds={weather.utcOffsetSeconds}
        now={now}
        isCurrentLocation={isCurrentLocation}
        isHome={isHome}
        breadcrumb={breadcrumbOf(weather.location)}
        leading={leading}
        onShare={onShare}
        onSettings={openSettings}
      />
      {forecast ? (
        <>
          <ConditionsCard
            forecast={forecast}
            now={now}
            onOpenForecast={links?.openForecast}
          />
          <ConditionTiles
            forecast={forecast}
            now={now}
            onOpenTrends={links?.openAtmosphere}
          />
        </>
      ) : null}
    </WeatherScroll>
  );
}

export type WeatherErrorProps = {
  message: string;
  onRetry: () => void;
  leading?: ReactNode;
  inTabs?: boolean;
};

/**
 * The failure outcome: what happened in plain words, what to do (one primary
 * button, "Try again"), and the same top row as the page so a person can still
 * go back or open Settings. On the neutral sky, never a blank screen.
 */
export function WeatherError({
  message,
  onRetry,
  leading,
  inTabs,
}: WeatherErrorProps) {
  const { dark } = usePageColors();
  const stops = skyStops(NEUTRAL_SKY, dark);
  return (
    <WeatherScroll family={NEUTRAL_SKY} inTabs={inTabs}>
      <HeroTopRow
        name="this place"
        leading={leading}
        onShare={() => undefined}
        onSettings={openSettings}
      />
      <View style={styles.error} testID="weather-error">
        <WxText
          type="h2"
          weight={600}
          family="serif"
          align="center"
          color={SKY_FG}
          accessibilityRole="header"
        >
          Weather unavailable
        </WxText>
        <WxText type="bodyLg" align="center" color={SKY_FG_DIM}>
          {message}
        </WxText>
        <WxText type="body" align="center" color={SKY_FG_DIM}>
          Check your connection, then try again.
        </WxText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: withAlpha(SKY_FG, pressed ? 0.85 : 1) },
          ]}
        >
          <WxText type="bodyLg" weight={600} color={stops.top}>
            Try again
          </WxText>
        </Pressable>
      </View>
    </WeatherScroll>
  );
}

const styles = StyleSheet.create({
  error: {
    alignItems: "center",
    gap: SPACE.stack,
    paddingTop: SPACE.heroTop,
    paddingBottom: SPACE.heroBottom,
  },
  retry: {
    minHeight: TOUCH.default,
    paddingHorizontal: SIZE.pillPadX,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACE.snug,
  },
});

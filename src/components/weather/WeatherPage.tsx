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
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { placeOf } from "@/api/place";
import { type WeatherResponse } from "@/api/weather";
import { ChevronLeftIcon } from "@/components/icons/Icon";
import { useHeroActivityLine } from "@/hooks/useHeroActivityLine";
import { useLocationLinks } from "@/hooks/useLocationLinks";
import { useNow } from "@/hooks/useNow";
import { rememberWeather } from "@/hooks/weather-cache";
import { usePageColors } from "@/hooks/usePageColors";
import { cropsFromPreferences } from "@/shared/agriculture";
import { skyFamily } from "@/shared/hero";
import { countryLabel } from "@/shared/place-info";
import { type TrailItem, placeTrail } from "@/shared/place-trail";
import { checkFrostRiskAhead, weatherCodeToInfo } from "@/shared/weather";
import { usePreferences } from "@/state/preferences";
import { RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { NEUTRAL_SKY, SKY_FG, SKY_FG_DIM, skyStops } from "@/theme/sky";

import { AboutPlaceCard } from "./AboutPlaceCard";
import { ActivityInvite } from "./ActivityInvite";
import { ActivitySheetsProvider } from "./ActivitySheets";
import { AiFollowup } from "./AiFollowup";
import { AiSummary } from "./AiSummary";
import { AgricultureSnapshot } from "./AgricultureSnapshot";
import { FrostAlertBanner, WeatherUnavailableBanner } from "./AlertBanners";
import { CommunityLane } from "./CommunityLane";
import { ConditionTiles } from "./ConditionTiles";
import { ConditionsCard } from "./ConditionsCard";
import { EnsoCard } from "./EnsoCard";
import { ForecastExtras } from "./ForecastExtras";
import { MapPreviewCard } from "./MapPreviewCard";
import { goHome, openAgriculture } from "./navigation";

import { RoundControl } from "./RoundControl";
import { RecentReports } from "./RecentReports";
import { SeasonFooter } from "./SeasonBadge";
import { HeroTopRow, SkyHero } from "./SkyHero";
import { WeatherScroll } from "./WeatherScroll";
import { WxText } from "./WxText";

/**
 * The hero's account control: the ⋯ menu as a native sheet (src/app/menu.tsx),
 * the web's phone menu: Use my location, the map, Locations, Explore and My
 * Weather (settings, saved places, sign in).
 */
export function openSettings() {
  router.push("/menu");
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
 * The trail under the top row, the web's rules: Home / Country / Province /
 * Place, the province left out when it is the place's own name, the country by
 * name and never its ISO code.
 */
export function trailOf(
  location: WeatherResponse["location"],
  name: string,
): TrailItem[] {
  return placeTrail({
    name,
    countryName: countryLabel(location?.country),
    province: location?.province,
  });
}

/**
 * The point the cards below the hero ask the Worker about: the place's own
 * coordinate when the page was loaded by place, else the (rounded) GPS fix.
 */
export function pointOf(
  weather: WeatherResponse,
): { lat: number; lon: number } | undefined {
  return weather.location ?? weather.coordinates;
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
  const { activities } = usePreferences();
  const crops = useMemo(() => cropsFromPreferences(activities), [activities]);
  // The place the farm and place cards take (also a GPS point the API named).
  const farmPlace = placeOf(weather, name);
  const { current, daily, forecast } = weather;
  const code = current.weatherCode ?? 0;
  const isDay = current.isDay ?? true;
  const family = skyFamily(code, isDay);
  const info = weatherCodeToInfo(code);
  const activityLine = useHeroActivityLine(forecast, now);
  const place = weather.location;
  // The AI insight, once loaded, is what the follow-up chat starts from. It is
  // kept with the place it was written for, so the page reused for another
  // place (GPS moved, a new route param) never hands the follow-up the last
  // place's summary, and a failed summary for the new place leaves none.
  const placeKey = place ? (place.slug ?? `${place.lat},${place.lon}`) : "";
  const [insightFor, setInsightFor] = useState<{
    placeKey: string;
    text: string;
  } | null>(null);
  const insight = insightFor?.placeKey === placeKey ? insightFor.text : null;
  const point = pointOf(weather);
  // The web's two notices above the page: every provider failed, and frost.
  const usingFallback = weather.source === "fallback";
  // No frost alert from the seasonal estimate: its temperatures are not a
  // forecast, and the web shows none either (`usingFallback ? null : ...`).
  const frost = useMemo(
    () =>
      forecast && !usingFallback
        ? checkFrostRiskAhead(forecast.hourly, forecast.utc_offset_seconds, now)
        : null,
    [forecast, usingFallback, now],
  );
  const slug = slugProp ?? weather.location?.slug;
  const links = useLocationLinks(slug);

  // The detail pages open from this answer without asking again.
  // The name goes with it: a GPS place's answer has no `location` to name it.
  useEffect(() => {
    if (slug) rememberWeather(slug, weather, Date.now(), name);
  }, [slug, weather, name]);

  const onShare = () => shareWeather(name, current.temperature, info.label);

  return (
    <ActivitySheetsProvider forecast={forecast} now={now}>
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
          trail={trailOf(weather.location, name)}
          onHome={goHome}
          leading={leading}
          onShare={onShare}
          onSettings={openSettings}
          activityLine={activityLine}
        />
        {usingFallback ? (
          <WeatherUnavailableBanner onRefresh={onRefresh} />
        ) : null}
        {frost ? <FrostAlertBanner alert={frost} /> : null}
        {forecast ? (
          <>
            <ConditionsCard
              forecast={forecast}
              now={now}
              onOpenForecast={links?.openForecast}
              footer={
                farmPlace ? (
                  <SeasonFooter
                    place={farmPlace}
                    now={now}
                    utcOffsetSeconds={weather.utcOffsetSeconds}
                  />
                ) : undefined
              }
            />
            <CommunityLane slug={place?.slug} forecast={forecast} now={now} />
            <ConditionTiles
              forecast={forecast}
              now={now}
              point={point}
              slug={weather.location?.slug}
              refreshKey={weather}
              onOpenTrends={links?.openAtmosphere}
            />
            <ForecastExtras weather={weather} />
            <RecentReports slug={place?.slug} name={name} now={now} />
            <ActivityInvite />
            {place ? (
              <>
                <AiSummary
                  key={`summary:${placeKey}`}
                  place={{
                    slug: place.slug,
                    name,
                    lat: place.lat,
                    lon: place.lon,
                    country: place.country,
                  }}
                  onLoaded={(text) => setInsightFor({ placeKey, text })}
                />
                <AiFollowup
                  key={`followup:${placeKey}`}
                  name={name}
                  slug={place.slug ?? ""}
                  insight={insight}
                />
              </>
            ) : null}
          </>
        ) : null}
        {farmPlace ? (
          <>
            <AgricultureSnapshot
              place={farmPlace}
              crops={crops}
              refreshKey={weather}
              onOpenInsights={
                farmPlace.slug
                  ? () => openAgriculture(farmPlace.slug as string)
                  : undefined
              }
            />
            <EnsoCard
              lat={farmPlace.lat}
              lon={farmPlace.lon}
              countryCode={farmPlace.country}
            />
            <MapPreviewCard placeName={farmPlace.name} />
            <AboutPlaceCard
              place={farmPlace}
              forecastElevation={weather.forecastElevation}
              now={now}
              utcOffsetSeconds={weather.utcOffsetSeconds}
            />
          </>
        ) : null}
      </WeatherScroll>
    </ActivitySheetsProvider>
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

/**
 * One weather page, for the Weather tab and for a place's page alike: the sky,
 * the hero, the Conditions card, the tile grid and the week. Both screens only
 * load the data and say what the eyebrow is; everything on the page is here, so
 * the two cannot drift apart (and neither can drift from the web).
 *
 * States are all designed: `WeatherSkeleton` while it loads, `WeatherError`
 * when it fails (with a way to try again, back, and settings), and, when the
 * forecast has no hourly series, the hero alone from what is known.
 */

import { router } from "expo-router";
import { type ReactNode, useMemo } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { placeOf } from "@/api/place";
import { type WeatherResponse } from "@/api/weather";
import { ChevronLeftIcon } from "@/components/icons/Icon";
import { useNow } from "@/hooks/useNow";
import { usePageColors } from "@/hooks/usePageColors";
import { cropsFromPreferences } from "@/shared/agriculture";
import { skyFamily } from "@/shared/hero";
import { countryLabel } from "@/shared/place-info";
import { type TrailItem, placeTrail } from "@/shared/place-trail";
import { weatherCodeToInfo } from "@/shared/weather";
import { usePreferences } from "@/state/preferences";
import { RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { NEUTRAL_SKY, SKY_FG, SKY_FG_DIM, skyStops } from "@/theme/sky";

import { AboutPlaceCard } from "./AboutPlaceCard";
import { AgricultureSnapshot } from "./AgricultureSnapshot";
import { ConditionTiles } from "./ConditionTiles";
import { ConditionsCard } from "./ConditionsCard";
import { DailyCard } from "./DailyCard";
import { EnsoCard } from "./EnsoCard";
import { MapPreviewCard } from "./MapPreviewCard";
import { goHome, openAgriculture } from "./navigation";

import { RoundControl } from "./RoundControl";
import { SeasonFooter } from "./SeasonBadge";
import { HeroTopRow, SkyHero } from "./SkyHero";
import { WeatherScroll } from "./WeatherScroll";
import { WxText } from "./WxText";

/** Open the Settings tab (sign in, theme, saved places). */
export function openSettings() {
  router.navigate("/my");
}

/** Go back, or home when this page is the first screen. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/** Back, for the left of the top row on a place's page. */
export function BackControl() {
  return (
    <RoundControl label="Back" onPress={goBack} testID="back-control">
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

export type WeatherPageProps = {
  weather: WeatherResponse;
  name: string;
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
  const place = placeOf(weather, name);
  const { current, daily, forecast } = weather;
  const code = current.weatherCode ?? 0;
  const isDay = current.isDay ?? true;
  const family = skyFamily(code, isDay);
  const info = weatherCodeToInfo(code);

  const onShare = () => {
    void Share.share({
      message: shareMessage(name, current.temperature, info.label),
    }).catch(() => {
      /* a cancelled or failed share needs no message */
    });
  };

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
        trail={trailOf(weather.location, name)}
        onHome={goHome}
        leading={leading}
        onShare={onShare}
        onSettings={openSettings}
      />
      {forecast ? (
        <>
          <ConditionsCard
            forecast={forecast}
            now={now}
            footer={
              place ? (
                <SeasonFooter
                  place={place}
                  now={now}
                  utcOffsetSeconds={weather.utcOffsetSeconds}
                />
              ) : undefined
            }
          />
          <ConditionTiles forecast={forecast} now={now} />
          <DailyCard forecast={forecast} />
        </>
      ) : null}
      {place ? (
        <>
          <AgricultureSnapshot
            place={place}
            crops={crops}
            onOpenInsights={
              place.slug
                ? () => openAgriculture(place.slug as string)
                : undefined
            }
          />
          <EnsoCard
            lat={place.lat}
            lon={place.lon}
            countryCode={place.country}
          />
          <MapPreviewCard placeName={place.name} />
          <AboutPlaceCard
            place={place}
            forecastElevation={weather.forecastElevation}
            now={now}
            utcOffsetSeconds={weather.utcOffsetSeconds}
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

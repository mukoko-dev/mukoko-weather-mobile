/**
 * A place's detail page, for /location/[slug]/forecast and
 * /location/[slug]/atmosphere (the web's `/[location]/forecast` and
 * `/[location]/atmosphere`). One screen component, two bodies:
 *
 *   forecast    24-hour chart, the 7-day chart and rows, sunrise and sunset
 *   atmosphere  the Conditions tiles, then humidity and cloud, wind and gusts,
 *               pressure and UV over 24 hours
 *
 * It sits on the place's own sky, with the same top row as the location page
 * (a Back control that names where it goes, the trail, Share, Settings), so a
 * person never loses where they are and there is no native header. Every
 * state is designed: `DetailSkeleton` while loading, `WeatherError` when the
 * request fails or the answer has no hours, the page, and pull to refresh.
 * Each card is in its own `ChartErrorBoundary`, so one crash never takes the
 * page down.
 *
 * Hours are read in the PLACE's time (the forecast's UTC offset), never the
 * phone's clock.
 */

import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { type WeatherResponse } from "@/api/weather";
import { useLocationWeather } from "@/hooks/useLocationWeather";
import { useNow } from "@/hooks/useNow";
import { skyFamily } from "@/shared/hero";
import { weatherCodeToInfo } from "@/shared/weather";
import { SPACE } from "@/theme/mzizi";
import { SKY_FG, SKY_FG_DIM } from "@/theme/sky";

import { AtmosphericDetailsCard } from "./AtmosphericDetailsCard";
import { ChartErrorBoundary } from "./ChartErrorBoundary";
import { ConditionTiles } from "./ConditionTiles";
import { DailyCard } from "./DailyCard";
import { DetailSkeleton } from "./DetailSkeleton";
import { HourlyForecastCard } from "./HourlyForecastCard";
import {
  type LocationSubRoute,
  SUB_ROUTE_TITLE,
  locationHref,
} from "./location-routes";
import { SunTimesCard } from "./SunTimesCard";
import { HeroTopRow } from "./SkyHero";
import { WeatherScroll } from "./WeatherScroll";
import {
  BackControl,
  WeatherError,
  openSettings,
  shareWeather,
} from "./WeatherPage";
import { WxText } from "./WxText";

function titleCaseSlug(slug: string | undefined): string {
  if (!slug) return "Location";
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** "Harare · 1490m": the web's subtitle without the season (that is the place profile). */
export function detailSubtitle(
  location: WeatherResponse["location"],
): string | undefined {
  const parts = [
    location?.province,
    typeof location?.elevation === "number"
      ? `${Math.round(location.elevation)}m`
      : undefined,
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

type SectionProps = { name: string; color: string; children: React.ReactNode };

function Section({ name, color, children }: SectionProps) {
  return (
    <ChartErrorBoundary name={name} color={color}>
      {children}
    </ChartErrorBoundary>
  );
}

export type DetailPageProps = {
  weather: WeatherResponse;
  slug: string;
  sub: LocationSubRoute;
  name: string;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
};

export function DetailPage({
  weather,
  slug,
  sub,
  name,
  onRefresh,
  refreshing,
}: DetailPageProps) {
  const now = useNow();
  const { current, forecast } = weather;
  const code = current.weatherCode ?? 0;
  const family = skyFamily(code, current.isDay ?? true);
  const info = weatherCodeToInfo(code);
  const title = SUB_ROUTE_TITLE[sub];
  const subtitle = detailSubtitle(weather.location);
  const offset = weather.utcOffsetSeconds;

  return (
    <WeatherScroll family={family} onRefresh={onRefresh} refreshing={refreshing}>
      <HeroTopRow
        name={name}
        breadcrumb={`${name} / ${title}`}
        leading={
          <BackControl label={`Back to ${name}`} fallback={locationHref(slug)} />
        }
        onShare={() => shareWeather(name, current.temperature, info.label)}
        onSettings={openSettings}
      />
      <View style={styles.page}>
        <View style={styles.title} testID="detail-title">
          <WxText
            type="h3"
            weight={700}
            family="serif"
            color={SKY_FG}
            accessibilityRole="header"
          >
            {`${name} ${title}`}
          </WxText>
          {subtitle ? (
            <WxText type="body" color={SKY_FG_DIM}>
              {subtitle}
            </WxText>
          ) : null}
        </View>
        {forecast && sub === "forecast" ? (
          <>
            <Section name="hourly forecast" color={SKY_FG_DIM}>
              <HourlyForecastCard
                hourly={forecast.hourly}
                utcOffsetSeconds={offset}
                now={now}
              />
            </Section>
            <Section name="daily forecast" color={SKY_FG_DIM}>
              <DailyCard forecast={forecast} />
            </Section>
            <Section name="sun times" color={SKY_FG_DIM}>
              <SunTimesCard
                daily={forecast.daily}
                utcOffsetSeconds={offset}
                now={now}
              />
            </Section>
          </>
        ) : null}
        {forecast && sub === "atmosphere" ? (
          <>
            <Section name="atmospheric conditions" color={SKY_FG_DIM}>
              <ConditionTiles forecast={forecast} now={now} />
            </Section>
            <Section name="atmospheric details" color={SKY_FG_DIM}>
              <AtmosphericDetailsCard
                hourly={forecast.hourly}
                utcOffsetSeconds={offset}
                now={now}
              />
            </Section>
          </>
        ) : null}
      </View>
    </WeatherScroll>
  );
}

export type LocationDetailScreenProps = {
  /** The route's `slug` param. */
  slug: string | undefined;
  sub: LocationSubRoute;
};

export function LocationDetailScreen({ slug, sub }: LocationDetailScreenProps) {
  const { state, refreshing, onRefresh, onRetry } = useLocationWeather(slug);
  const fallbackName = titleCaseSlug(slug);
  const name =
    state.kind === "ready"
      ? (state.weather.location?.name ?? fallbackName)
      : fallbackName;
  const back = (
    <BackControl
      label={`Back to ${name}`}
      fallback={slug ? locationHref(slug) : "/"}
    />
  );
  const screen = (
    <Stack.Screen
      options={{ headerShown: false, title: `${name} ${SUB_ROUTE_TITLE[sub]}` }}
    />
  );

  if (!slug) {
    return (
      <>
        {screen}
        <WeatherError
          message="No place was chosen."
          onRetry={onRetry}
          leading={back}
        />
      </>
    );
  }
  if (state.kind === "loading") {
    return (
      <>
        {screen}
        <DetailSkeleton
          leading={back}
          what={SUB_ROUTE_TITLE[sub].toLowerCase()}
          cards={sub === "forecast" ? 3 : 2}
        />
      </>
    );
  }
  if (state.kind === "error") {
    return (
      <>
        {screen}
        <WeatherError message={state.message} onRetry={onRetry} leading={back} />
      </>
    );
  }
  if (!state.weather.forecast) {
    return (
      <>
        {screen}
        <WeatherError
          message="The forecast for this place has no hours in it right now."
          onRetry={onRetry}
          leading={back}
        />
      </>
    );
  }
  return (
    <>
      {screen}
      <DetailPage
        weather={state.weather}
        slug={slug}
        sub={sub}
        name={name}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { gap: SPACE.section },
  title: { gap: SPACE.hair, paddingTop: SPACE.heroTop },
});

/**
 * The Conditions section: the web's `AtmosphericSummary`, in its order. Every
 * sentence and number comes from the web's own insight rules
 * (src/shared/metric-insights.ts), read in the place's time:
 *
 *   Air quality (wide)   Haze (only when there is haze)
 *   wind . UV index      (a row)    feels like . visibility  (a row)
 *   precipitation        (wide)     humidity . pressure      (a row)
 *   sun                  (wide)     moon . averages          (a row)
 *
 * Every tile is one button that opens its detail sheet (`MetricDetailSheet`):
 * the headline, the next 24 hours as a chart, the related readings and a plain
 * explanation. The Moon tile shows the next moonrise in the place's clock; the
 * Averages tile compares today's high with the 1991-2020 normal and appears
 * once the Worker has the normal (a quiet placeholder holds its place while it
 * loads, so the row does not jump). With no point (no coordinate for the
 * place) the cards that ask the Worker are left out.
 */

import { useCallback, useMemo, useState } from "react";

import { fetchNormalHigh } from "@/api/climate";
import {
  DropletIcon,
  EyeIcon,
  GaugeIcon,
  CloudRainIcon,
  MoonIcon,
  SunIcon,
  SunriseIcon,
  ThermometerIcon,
  WindIcon,
} from "@/components/icons/Icon";
import { useWorkerData } from "@/hooks/useWorkerData";
import { localIsoDate, todayHighFrom } from "@/shared/conditions";
import { resolveOffsetSeconds } from "@/shared/location-time";
import { type MetricKind, moonriseLabel } from "@/shared/metric-details";
import { moonPhase, nextMoonrise } from "@/shared/moon";
import { next24hPrecipSeries } from "@/shared/insight-series";
import {
  feelsLikeInsight,
  humidityInsight,
  precipitationInsight,
  pressureInsight,
  sunInsight,
  temperatureAverageInsight,
  uvInsight,
  visibilityInsight,
  windInsight,
} from "@/shared/metric-insights";
import { type WeatherData } from "@/shared/weather";
import { usePageColors } from "@/hooks/usePageColors";

import { AirQualityCard } from "./AirQualityCard";
import { CardSkeleton } from "./CardSkeleton";
import { HazeCard } from "./HazeCard";
import { InsightCard, InsightGrid, InsightRow } from "./InsightCard";
import { MetricDetailSheet } from "./MetricDetailSheet";
import { MetricValue } from "./MetricValue";
import { SectionHeader } from "./SectionHeader";
import { SectionBoundary } from "./SectionBoundary";
import {
  CompassDial,
  MiniBars,
  MoonDisc,
  PressureDial,
  ScaleReadout,
  SunArc,
} from "./widgets";
import { WxText } from "./WxText";
import { SIZE } from "@/theme/mzizi";

export type ConditionTilesProps = {
  forecast: WeatherData;
  now: Date;
  /** The place's point (rounded): air quality, haze, moonrise and averages. */
  point?: { lat: number; lon: number };
  /** A catalogue place's slug, for the Averages detail's recorded days. */
  slug?: string;
  /**
   * Changes when the page pulls a new forecast (pull to refresh, "Refresh
   * now"): the Worker-backed cards below ask again and keep what they show
   * until the new answer lands.
   */
  refreshKey?: unknown;
  /** Opens the place's /atmosphere page; no link without it. */
  onOpenTrends?: () => void;
};

/** Moonrise is a few hundred altitude evaluations: recompute every 10 minutes. */
const MOONRISE_BUCKET_MS = 600_000;

export function ConditionTiles({
  forecast,
  now,
  point,
  slug,
  refreshKey,
  onOpenTrends,
}: ConditionTilesProps) {
  const { colors } = usePageColors();
  const [open, setOpen] = useState<MetricKind | null>(null);
  const lat = point?.lat;
  const lon = point?.lon;
  const offset = forecast.utc_offset_seconds;
  const wind = windInsight(forecast, now);
  const uv = uvInsight(forecast, now);
  const feels = feelsLikeInsight(forecast);
  const visibility = visibilityInsight(forecast, now);
  const rain = precipitationInsight(forecast, now);
  const rainSeries = next24hPrecipSeries(
    forecast.hourly,
    now,
    forecast.utc_offset_seconds,
  );
  const humidity = humidityInsight(forecast);
  const pressure = pressureInsight(forecast, now);
  const sun = sunInsight(forecast, now);

  // Moon: the phase is the same everywhere; the moonrise is the place's.
  const moon = moonPhase(now);
  const moonPct = Math.round(moon.illumination * 100);
  const nowBucket = Math.floor(now.getTime() / MOONRISE_BUCKET_MS);
  const moonrise = useMemo(() => {
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    const at = new Date(nowBucket * MOONRISE_BUCKET_MS);
    const rise = nextMoonrise(at, lat, lon);
    return moonriseLabel(
      rise ? rise.getTime() : null,
      at.getTime(),
      resolveOffsetSeconds(offset, at),
    );
  }, [nowBucket, lat, lon, offset]);

  // Averages: today's high against the normal for today's date at this place.
  const todayHigh = todayHighFrom(forecast.daily);
  const date = localIsoDate(now, offset);
  const loadNormal = useCallback(
    (signal: AbortSignal) =>
      fetchNormalHigh(lat as number, lon as number, date, signal),
    [lat, lon, date],
  );
  const normals = useWorkerData<number | null>(
    loadNormal,
    Boolean(point),
    refreshKey,
  );
  const normalHigh = normals.status === "ready" ? normals.data : null;
  const averages = temperatureAverageInsight(todayHigh, normalHigh);
  const averagesLoading = Boolean(point) && normals.status === "loading";

  const extras = useMemo(
    () => ({
      todayHigh,
      normalHigh,
      moonName: moon.name,
      moonIlluminationPct: moonPct,
      moonrise,
    }),
    [todayHigh, normalHigh, moon.name, moonPct, moonrise],
  );
  const opener = (kind: MetricKind) => () => setOpen(kind);

  /** The Moon tile; alone in its row it spans the row, as the web's does. */
  const moonTile = (wide: boolean) => (
    <InsightCard
      wide={wide}
      label="Moon"
      mineral="tanzanite"
      onPress={opener("moon")}
      icon={(c) => <MoonIcon size={SIZE.iconSm} color={c} />}
      sentence={`${moon.name}, ${moonPct}% lit.${moonrise ? ` Moonrise ${moonrise}.` : ""}`}
    >
      <MoonDisc
        phase={moon.phase}
        illumination={moon.illumination}
        southernHemisphere={typeof lat === "number" && lat < 0}
      />
    </InsightCard>
  );

  return (
    <>
      <InsightGrid>
        <SectionHeader
          title="Conditions"
          titleColor={colors.textPrimary}
          actionColor={colors.primary}
          action={
            onOpenTrends
              ? {
                  label: "24h trends",
                  spoken: "24-hour trends",
                  onPress: onOpenTrends,
                  testID: "trends-link",
                }
              : undefined
          }
        />
        {point ? (
          <>
            <SectionBoundary name="air quality">
              <AirQualityCard
                lat={point.lat}
                lon={point.lon}
                now={now}
                refreshKey={refreshKey}
              />
            </SectionBoundary>
            <SectionBoundary name="haze">
              <HazeCard
                lat={point.lat}
                lon={point.lon}
                refreshKey={refreshKey}
              />
            </SectionBoundary>
          </>
        ) : null}
        <InsightRow>
          <InsightCard
            label="Wind"
            onPress={opener("wind")}
            mineral="cobalt"
            icon={(c) => <WindIcon size={SIZE.iconSm} color={c} />}
            summary={`${wind.speed} kilometres per hour from the ${wind.directionLabel}, ${wind.beaufortLabel}`}
            sentence={wind.sentence}
          >
            <CompassDial
              directionDeg={wind.directionDeg}
              speed={wind.speed}
              gust={wind.gust}
            />
          </InsightCard>
          <InsightCard
            label="UV index"
            onPress={opener("uv")}
            mineral="gold"
            icon={(c) => <SunIcon size={SIZE.iconSm} color={c} />}
            summary={`${uv.value}, ${uv.label}`}
            sentence={uv.sentence}
          >
            <ScaleReadout
              value={uv.value}
              label={uv.label}
              positionPct={uv.positionPct}
            />
            {uv.peakTime ? (
              <WxText type="bodySm" color={colors.textTertiary} align="center">
                {`Peak ${uv.peakTime}`}
              </WxText>
            ) : null}
          </InsightCard>
        </InsightRow>

        <InsightRow>
          <InsightCard
            label="Feels like"
            onPress={opener("feels")}
            mineral="copper"
            icon={(c) => <ThermometerIcon size={SIZE.iconSm} color={c} />}
            summary={`${feels.value} degrees`}
            sentence={feels.sentence}
          >
            <MetricValue>{`${feels.value}°`}</MetricValue>
          </InsightCard>
          <InsightCard
            label="Visibility"
            onPress={opener("visibility")}
            mineral="tanzanite"
            icon={(c) => <EyeIcon size={SIZE.iconSm} color={c} />}
            summary={
              visibility.km !== null
                ? `${visibility.km} kilometres, ${visibility.label}`
                : "Unavailable"
            }
            sentence={visibility.sentence}
          >
            <MetricValue>
              {visibility.km !== null ? `${visibility.km} km` : "—"}
            </MetricValue>
            <WxText type="bodySm" color={colors.textTertiary} align="center">
              {visibility.label}
            </WxText>
          </InsightCard>
        </InsightRow>

        <InsightCard
          wide
          label="Precipitation"
          onPress={opener("rain")}
          mineral="sodalite"
          icon={(c) => <CloudRainIcon size={SIZE.iconSm} color={c} />}
          summary={`${rain.next24hMm} millimetres in the next 24 hours`}
          sentence={rain.sentence}
        >
          <WxText
            type="h4"
            weight={600}
            family="serif"
            tabular
            leading="none"
            align="center"
            color={colors.textPrimary}
          >
            {`${rain.next24hMm} mm`}
          </WxText>
          {rainSeries.length > 0 ? (
            <MiniBars
              values={rainSeries}
              label="Rain next 24 hours"
              highlightIndex={0}
            />
          ) : null}
        </InsightCard>

        <InsightRow>
          <InsightCard
            label="Humidity"
            onPress={opener("humidity")}
            mineral="malachite"
            icon={(c) => <DropletIcon size={SIZE.iconSm} color={c} />}
            summary={`${humidity.value} percent, dew point ${humidity.dewPoint} degrees`}
            sentence={humidity.sentence}
          >
            <MetricValue>{`${humidity.value}%`}</MetricValue>
            <WxText type="bodySm" color={colors.textTertiary} align="center">
              {`Dew point ${humidity.dewPoint}°`}
            </WxText>
          </InsightCard>
          <InsightCard
            label="Pressure"
            onPress={opener("pressure")}
            mineral="cobalt"
            icon={(c) => <GaugeIcon size={SIZE.iconSm} color={c} />}
            summary={`${pressure.hPa} hectopascals, ${pressure.trend}`}
            sentence={pressure.sentence}
          >
            <PressureDial hPa={pressure.hPa} trend={pressure.trend} />
          </InsightCard>
        </InsightRow>

        <InsightCard
          wide
          label="Sun"
          onPress={opener("sun")}
          mineral="gold"
          icon={(c) => <SunriseIcon size={SIZE.iconSm} color={c} />}
          sentence={sun.sentence}
        >
          <SunArc
            arcPct={sun.arcPct}
            sunrise={sun.sunrise ?? "—"}
            sunset={sun.sunset ?? "—"}
          />
        </InsightCard>

        {averages || averagesLoading ? (
          <InsightRow>
            {moonTile(false)}
            {averages ? (
              <InsightCard
                label="Averages"
                mineral="copper"
                onPress={opener("averages")}
                icon={(c) => <ThermometerIcon size={SIZE.iconSm} color={c} />}
                summary={`Today's high ${todayHigh} degrees, normal high ${Math.round(normalHigh as number)} degrees`}
                sentence={averages.sentence}
              >
                <MetricValue>{`${todayHigh}°`}</MetricValue>
                <WxText
                  type="bodySm"
                  color={colors.textTertiary}
                  align="center"
                >
                  {`Normal high ${Math.round(normalHigh as number)}°`}
                </WxText>
              </InsightCard>
            ) : (
              <CardSkeleton
                square
                mineral="copper"
                label="Loading the average high"
                testID="averages-tile-loading"
              />
            )}
          </InsightRow>
        ) : (
          moonTile(true)
        )}
      </InsightGrid>
      <MetricDetailSheet
        kind={open}
        data={forecast}
        now={now}
        extras={extras}
        lat={lat}
        lon={lon}
        slug={slug}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

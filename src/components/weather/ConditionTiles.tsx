/**
 * The Conditions tile grid: the web's `AtmosphericSummary` tiles, in its
 * order. Every sentence and number comes from the web's own insight rules
 * (src/shared/metric-insights.ts), read in the place's time:
 *
 *   wind . UV index   (a row)    feels like . visibility  (a row)
 *   precipitation     (wide)     humidity . pressure      (a row)
 *   sun               (wide)
 *
 * Not built yet (they need data this slice does not fetch): the air-quality
 * card, moon and averages. Each tile is a plain, readable card; opening a tile
 * into its detail sheet comes with the detail sheets.
 */

import {
  DropletIcon,
  EyeIcon,
  GaugeIcon,
  CloudRainIcon,
  SunIcon,
  SunriseIcon,
  ThermometerIcon,
  WindIcon,
} from "@/components/icons/Icon";
import { next24hPrecipSeries } from "@/shared/insight-series";
import {
  feelsLikeInsight,
  humidityInsight,
  precipitationInsight,
  pressureInsight,
  sunInsight,
  uvInsight,
  visibilityInsight,
  windInsight,
} from "@/shared/metric-insights";
import { type WeatherData } from "@/shared/weather";
import { usePageColors } from "@/hooks/usePageColors";

import { InsightCard, InsightGrid, InsightRow } from "./InsightCard";
import { SectionHeader } from "./SectionHeader";
import {
  CompassDial,
  MiniBars,
  PressureDial,
  ScaleReadout,
  SunArc,
} from "./widgets";
import { WxText } from "./WxText";
import { SIZE } from "@/theme/mzizi";

export type ConditionTilesProps = {
  forecast: WeatherData;
  now: Date;
  /** Opens the place's /atmosphere page; no link without it. */
  onOpenTrends?: () => void;
};

/** The big numeral on a tile: Noto Serif, h2, weight 600, line = type size. */
function MetricValue({ children }: { children: string }) {
  const { colors } = usePageColors();
  return (
    <WxText
      type="h2"
      weight={600}
      family="serif"
      tabular
      leading="none"
      color={colors.textPrimary}
    >
      {children}
    </WxText>
  );
}

export function ConditionTiles({
  forecast,
  now,
  onOpenTrends,
}: ConditionTilesProps) {
  const { colors } = usePageColors();
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

  return (
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
      <InsightRow>
        <InsightCard
          label="Wind"
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
          mineral="copper"
          icon={(c) => <ThermometerIcon size={SIZE.iconSm} color={c} />}
          summary={`${feels.value} degrees`}
          sentence={feels.sentence}
        >
          <MetricValue>{`${feels.value}°`}</MetricValue>
        </InsightCard>
        <InsightCard
          label="Visibility"
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
    </InsightGrid>
  );
}

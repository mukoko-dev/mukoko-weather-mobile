/**
 * The two cards that close the web's main column (Windy-style additions): the
 * next-hour rain nowcast and the multi-model temperature comparison. Each
 * exists only when `/v1/weather` carried its data (the web's rule), and each is
 * in its own `ChartErrorBoundary`, so a crash in one never takes the page down.
 *
 * - Next hour (`MinutelyCard`): one sentence and four 15-minute rain bars. With
 *   no rain the bars are quiet stubs and the sentence says so.
 * - Model comparison (`ModelComparisonCard`): how ECMWF IFS, ECMWF AIFS, GFS
 *   and ICON agree or diverge over the day, as four lines with a legend in
 *   words. Both draw with the one `TimeSeriesChart`, from the specs in `charts/chart-specs`.
 */

import { StyleSheet, View } from "react-native";

import { type WeatherResponse } from "@/api/weather";
import { usePageColors } from "@/hooks/usePageColors";
import {
  comparisonSeries,
  prepareModelComparisonData,
  widestSpread,
} from "@/shared/model-comparison";
import {
  nowcastRows,
  nowcastSpoken,
  nowcastSummary,
  RAIN_THRESHOLD_MM,
} from "@/shared/nowcast";
import { currentHourIndex, resolveOffsetSeconds } from "@/shared/location-time";
import { BORDER, RADIUS, SPACE, withAlpha } from "@/theme/mzizi";

import { answerKey } from "./answer-key";
import { ChartErrorBoundary } from "./ChartErrorBoundary";
import {
  chartProps,
  modelChartSpec,
  nowcastChartSpec,
} from "./charts/chart-specs";
import { TimeSeriesChart } from "./charts/TimeSeriesChart";
import { WxText } from "./WxText";

function Card({
  heading,
  caption,
  children,
  testID,
}: {
  heading: string;
  caption: string;
  children: React.ReactNode;
  testID: string;
}) {
  const { colors } = usePageColors();
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: withAlpha(colors.primary, 0.25),
        },
      ]}
    >
      <View style={styles.titleRow}>
        <WxText
          type="h6"
          weight={600}
          family="serif"
          color={colors.textPrimary}
          accessibilityRole="header"
        >
          {heading}
        </WxText>
        <WxText type="bodySm" color={colors.textTertiary}>
          {caption}
        </WxText>
      </View>
      {children}
    </View>
  );
}

export function MinutelyCard({
  minutely,
}: {
  minutely: NonNullable<WeatherResponse["minutely"]>;
}) {
  const { colors, scheme } = usePageColors();
  const rows = nowcastRows(minutely);
  if (rows.length === 0) return null;
  // The same threshold as the sentence, so the chart and the words agree.
  const hasRain = rows.some((r) => r.precip >= RAIN_THRESHOLD_MM);
  return (
    <Card
      testID="minutely-card"
      heading="Next hour"
      caption="15-minute precipitation"
    >
      <WxText type="body" color={colors.textSecondary}>
        {nowcastSummary(minutely)}
      </WxText>
      {hasRain ? (
        <TimeSeriesChart
          {...chartProps({ ...nowcastChartSpec(rows, scheme), aspect: 3 })}
        />
      ) : (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={nowcastSpoken(rows)}
          style={styles.stubs}
        >
          {rows.map((r) => (
            <View key={r.label} style={styles.stub}>
              <View
                style={[
                  styles.stubBar,
                  { backgroundColor: withAlpha(colors.textTertiary, 0.2) },
                ]}
              />
              <WxText type="bodySm" color={colors.textTertiary}>
                {r.label}
              </WxText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export function ModelComparisonCard({
  models,
  time,
  utcOffsetSeconds,
  now = new Date(),
}: {
  models: NonNullable<WeatherResponse["models"]>;
  time: string[];
  /** The place's offset: the chart starts at the place's current hour. */
  utcOffsetSeconds?: number;
  now?: Date;
}) {
  const { colors, scheme } = usePageColors();
  const series = comparisonSeries(models);
  const start = currentHourIndex(
    time,
    resolveOffsetSeconds(utcOffsetSeconds, now),
    now,
  );
  const data = prepareModelComparisonData(series, time, start);
  if (data.times.length === 0 || data.series.length === 0) return null;
  const spread = widestSpread(data);
  const names = data.series.map((s) => s.label).join(", ");
  return (
    <Card
      testID="model-comparison-card"
      heading="Model comparison"
      caption="Hourly temperature °C"
    >
      <WxText type="bodySm" color={colors.textTertiary}>
        {`How the major forecast models (${names}) agree or diverge on the day.`}
      </WxText>
      <TimeSeriesChart {...chartProps(modelChartSpec(data, scheme))} />
      {spread !== null ? (
        <WxText type="bodySm" color={colors.textTertiary}>
          {`The models are up to ${spread}° apart at their widest.`}
        </WxText>
      ) : null}
    </Card>
  );
}

export function ForecastExtras({ weather }: { weather: WeatherResponse }) {
  const hasModels =
    (weather.models?.length ?? 0) >= 2 && (weather.modelsTime?.length ?? 0) > 0;
  if (!weather.minutely && !hasModels) return null;
  return (
    <>
      {weather.minutely ? (
        <ChartErrorBoundary
          name="the next-hour nowcast"
          resetKey={answerKey(weather)}
        >
          <MinutelyCard minutely={weather.minutely} />
        </ChartErrorBoundary>
      ) : null}
      {hasModels ? (
        <ChartErrorBoundary
          name="the model comparison"
          resetKey={answerKey(weather)}
        >
          <ModelComparisonCard
            models={weather.models!}
            time={weather.modelsTime!}
            utcOffsetSeconds={weather.utcOffsetSeconds}
          />
        </ChartErrorBoundary>
      ) : null}
    </>
  );
}

/** The quiet stub standing for a dry 15-minute step, dp. */
const STUB_HEIGHT = 32;

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: SPACE.snug,
  },
  stubs: { flexDirection: "row", gap: SPACE.snug },
  stub: { flex: 1, alignItems: "center", gap: SPACE.hair },
  stubBar: { width: "100%", height: STUB_HEIGHT, borderRadius: RADIUS.sm },
});

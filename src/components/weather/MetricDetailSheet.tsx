/**
 * The detail behind a Conditions tile (the web's `MetricDetailModal`): the
 * number, what it means in one sentence, the next 24 hours as a chart, the
 * related readings, and a plain explanation. All of it comes from pure
 * functions over the forecast in the place's time (src/shared/metric-details.ts),
 * with no network and no AI call; only the Averages detail asks the Worker.
 *
 * It keeps showing the last tile while the sheet slides away, so the content
 * does not empty before it is gone.
 */

import { useMemo, useState } from "react";

import { resolveOffsetSeconds } from "@/shared/location-time";
import {
  METRIC_CHART,
  type MetricExtras,
  type MetricKind,
  metricDetail,
  metricSeries,
  uvForecastDays,
} from "@/shared/metric-details";
import { type WeatherData } from "@/shared/weather";
import { usePageColors } from "@/hooks/usePageColors";

import { AveragesDetail } from "./AveragesDetail";
import { DetailSheet, SheetSection, StatGrid } from "./DetailSheet";
import { SectionBoundary } from "./SectionBoundary";
import { SeriesChart } from "./charts/SeriesChart";
import { metricChartSpec, uvDaysChartSpec } from "./charts/chart-specs";
import { WxText } from "./WxText";

export type MetricDetailSheetProps = {
  /** The tile that was opened; null keeps the sheet closed. */
  kind: MetricKind | null;
  data: WeatherData;
  now: Date;
  extras?: MetricExtras;
  /** The place's point and slug, for the Averages detail's Worker calls. */
  lat?: number;
  lon?: number;
  slug?: string;
  onClose: () => void;
};

export function MetricDetailSheet({
  kind,
  data,
  now,
  extras,
  lat,
  lon,
  slug,
  onClose,
}: MetricDetailSheetProps) {
  const { scheme, colors } = usePageColors();
  // The tile shown while the sheet is open, and while it slides away.
  const [last, setLast] = useState<MetricKind | null>(kind);
  if (kind !== null && kind !== last) setLast(kind);
  const shown = kind ?? last;

  const detail = useMemo(
    () => (shown ? metricDetail(shown, data, now, extras) : null),
    [shown, data, now, extras],
  );
  const chart = shown ? METRIC_CHART[shown] : null;
  const series = useMemo(
    () =>
      chart
        ? metricSeries(
            data.hourly,
            resolveOffsetSeconds(data.utc_offset_seconds, now),
            now,
          )
        : [],
    [chart, data.hourly, data.utc_offset_seconds, now],
  );
  const uvDays = useMemo(
    () => (shown === "uv" ? uvForecastDays(data.daily) : []),
    [shown, data.daily],
  );

  return (
    <DetailSheet
      open={kind !== null}
      title={detail?.title ?? ""}
      headline={detail?.headline}
      sentence={detail?.sentence}
      about={detail?.about}
      onClose={onClose}
      testID="metric-detail"
    >
      {detail ? (
        <>
          {shown === "averages" ? (
            <SectionBoundary name="the averages">
              <AveragesDetail data={data} lat={lat} lon={lon} slug={slug} />
            </SectionBoundary>
          ) : null}

          {chart && series.length > 1 ? (
            <SheetSection heading="Next 24 hours">
              <SectionBoundary name={`the ${detail.title.toLowerCase()} chart`}>
                <SeriesChart {...metricChartSpec(chart, series, scheme)} />
              </SectionBoundary>
            </SheetSection>
          ) : null}
          {chart && series.length <= 1 ? (
            <WxText type="body" color={colors.textTertiary}>
              The hourly forecast is not available right now.
            </WxText>
          ) : null}

          {shown === "uv" && uvDays.length > 1 ? (
            <SheetSection heading="Peak UV, next days">
              <SectionBoundary name="the UV by day chart">
                <SeriesChart {...uvDaysChartSpec(uvDays)} />
              </SectionBoundary>
              <StatGrid
                stats={uvDays.map((d) => ({
                  label: d.label,
                  value: `${d.peak} ${d.category}`,
                }))}
              />
            </SheetSection>
          ) : null}

          {detail.stats.length > 0 ? <StatGrid stats={detail.stats} /> : null}
        </>
      ) : null}
    </DetailSheet>
  );
}

/**
 * The agriculture page's chart stack (the web's `AgricultureCharts`): the
 * 16-day forecast as five charts, and growing degree days to date over the
 * past 30 days and the forecast. A chart is drawn only when its series carry
 * data (soil moisture thins out after about 9 days, soil temperature after
 * about 15), so nothing is an empty frame. Each chart is its own card with a
 * heading and a one-line note saying what it shows.
 */

import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { type AxisSpec, type SeriesSpec } from "@/shared/agri-chart";
import {
  type AgriDay,
  forecastChartRows,
  gddRows,
  hasSeries,
} from "@/shared/agriculture";
import { SPACE } from "@/theme/mzizi";

import { AgriSeriesChart } from "./AgriSeriesChart";
import { CardHeading, CardNote, PlaceCard } from "./PlaceCard";

type ChartBlock = {
  id: string;
  title: string;
  note: string;
  /** The keys that must carry data for the chart to be drawn. */
  keys: string[];
  series: SeriesSpec[];
  axis: AxisSpec;
  /** Which rows: the 16 forecast days, or all 46 days of growing degree days. */
  rows: "forecast" | "gdd";
};

const mm = (v: number) => `${v} mm`;

export const CHART_BLOCKS: ChartBlock[] = [
  {
    id: "agri-rain-et",
    title: "Rain against crop water use",
    note: "Daily rain (bars) and reference evapotranspiration, ET₀ (line), in mm.",
    keys: ["rainMm", "et0Mm"],
    series: [
      {
        key: "rainMm",
        label: "Rain (mm)",
        kind: "bar",
        opacity: 0.6,
        tone: "rain",
      },
      { key: "et0Mm", label: "Crop water use, ET₀ (mm)", tone: "terracotta" },
    ],
    axis: { min: 0, format: mm },
    rows: "forecast",
  },
  {
    id: "agri-balance",
    title: "Water balance",
    note: "Rain minus ET₀ each day, and the running total. Below zero the crop draws down soil water.",
    keys: ["balanceMm"],
    series: [
      {
        key: "cumulativeBalanceMm",
        label: "Running balance (mm)",
        kind: "area",
        opacity: 0.15,
        tone: "malachite",
      },
      {
        key: "balanceMm",
        label: "Daily rain − ET₀ (mm)",
        kind: "bar",
        opacity: 0.5,
        tone: "cobalt",
      },
    ],
    axis: { format: mm },
    rows: "forecast",
  },
  {
    id: "agri-soil-moisture",
    title: "Soil moisture by depth",
    note: "Share of the soil volume holding water. Bands depend on soil texture, so read trends, not exact values.",
    keys: ["sm0to1", "sm3to9", "sm27to81"],
    series: [
      { key: "sm0to1", label: "0–1 cm", tone: "earth" },
      { key: "sm1to3", label: "1–3 cm", tone: "gold" },
      { key: "sm3to9", label: "3–9 cm", tone: "malachite" },
      { key: "sm9to27", label: "9–27 cm", dashed: true, tone: "cobalt" },
      { key: "sm27to81", label: "27–81 cm", dashed: true, tone: "sodalite" },
    ],
    axis: { min: 0, format: (v) => `${v}%` },
    rows: "forecast",
  },
  {
    id: "agri-soil-temp",
    title: "Soil temperature by depth",
    note: "Daily means. Seed depth (6 cm) decides germination.",
    keys: ["st0", "st6", "st54"],
    series: [
      { key: "st0", label: "Surface", tone: "earth" },
      { key: "st6", label: "6 cm (seed depth)", tone: "malachite" },
      { key: "st18", label: "18 cm", dashed: true, tone: "cobalt" },
      { key: "st54", label: "54 cm", dashed: true, tone: "sodalite" },
    ],
    axis: { format: (v) => `${v}°C` },
    rows: "forecast",
  },
  {
    id: "agri-spray",
    title: "Spray hours and leaf wetness",
    note: "Hours each day that are fit to spray, against hours the leaves stay wet (disease pressure).",
    keys: ["sprayHours", "leafWetHours"],
    series: [
      {
        key: "sprayHours",
        label: "Hours fit to spray",
        kind: "bar",
        opacity: 0.7,
        tone: "malachite",
      },
      {
        key: "leafWetHours",
        label: "Leaf-wet hours",
        dashed: true,
        tone: "cobalt",
      },
    ],
    axis: { min: 0, max: 24, format: (v) => `${v} h` },
    rows: "forecast",
  },
  {
    id: "agri-gdd",
    title: "Growing degree days to date",
    note: "Running total since 30 days ago (base 10 °C, cap 30 °C), through the forecast.",
    keys: ["gddMaize"],
    series: [
      {
        key: "gddMaize",
        label: "Maize/Soybean (10–30°C)",
        kind: "area",
        opacity: 0.15,
        tone: "malachite",
      },
    ],
    axis: { min: 0, format: (v) => `${v}` },
    rows: "gdd",
  },
];

export function AgricultureCharts({ daily }: { daily: readonly AgriDay[] }) {
  const forecast = useMemo(() => forecastChartRows(daily), [daily]);
  const gdd = useMemo(() => gddRows(daily), [daily]);
  const shown = CHART_BLOCKS.filter((b) =>
    hasSeries(b.rows === "gdd" ? gdd : forecast, b.keys),
  );
  return (
    <View style={styles.stack} testID="agriculture-charts">
      {shown.map((b) => (
        <PlaceCard key={b.id} accent="quiet" testID={b.id}>
          <CardHeading>{b.title}</CardHeading>
          <CardNote>{b.note}</CardNote>
          <AgriSeriesChart
            title={b.title}
            rows={b.rows === "gdd" ? gdd : forecast}
            series={b.series}
            axis={b.axis}
          />
        </PlaceCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: SPACE.section } });

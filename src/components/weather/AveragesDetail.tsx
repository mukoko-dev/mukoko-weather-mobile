/**
 * The Averages detail (the web's `AveragesDetail`): Temperature and
 * Precipitation tabs, the coming week and the recorded days set against the
 * 1991-2020 normals in plain sentences, and the twelve monthly normals as a
 * chart AND a table (the chart's text alternative). Everything comes from the
 * weather Worker; nothing is compared unless both sides exist, and a missing
 * month is a dash, never zero. The logic is the web's own
 * (src/shared/climate-averages.ts).
 *
 * States: loading (a skeleton), ready, unavailable (words and "Try again").
 */

import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchMonthlyNormals, fetchRecentDays } from "@/api/climate";
import { usePageColors } from "@/hooks/usePageColors";
import { useWorkerData } from "@/hooks/useWorkerData";
import {
  type Comparison,
  forecastComparison,
  monthIndexOf,
  monthlyRows,
  recentComparison,
} from "@/shared/climate-averages";
import { type ParsedMonthlyNormals } from "@/shared/climate-averages";
import { type WeatherData } from "@/shared/weather";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";

import { CardSkeleton } from "./CardSkeleton";
import { SheetSection } from "./DetailSheet";
import { SectionBoundary } from "./SectionBoundary";
import { SeriesChart } from "./charts/SeriesChart";
import { monthlyChartSpec } from "./charts/chart-specs";
import { WxText } from "./WxText";

type Mode = "temperature" | "precipitation";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "temperature", label: "Temperature" },
  { mode: "precipitation", label: "Precipitation" },
];

export type AveragesDetailProps = {
  data: WeatherData;
  lat?: number;
  lon?: number;
  /** A catalogue place's slug: only such a place has recorded days. */
  slug?: string;
};

function Sentences({ items }: { items: (Comparison | null)[] }) {
  const { colors } = usePageColors();
  const shown = items.filter((c): c is Comparison => c !== null);
  if (shown.length === 0) return null;
  return (
    <View style={styles.sentences}>
      {shown.map((c) => (
        <WxText key={c.basis} type="body" color={colors.textSecondary}>
          {c.sentence}
        </WxText>
      ))}
    </View>
  );
}

function Tabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const { colors } = usePageColors();
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {TABS.map((t) => {
        const selected = t.mode === mode;
        return (
          <Pressable
            key={t.mode}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(t.mode)}
            style={[
              styles.tab,
              {
                borderColor: selected ? colors.primary : colors.border,
                borderWidth: selected ? BORDER.active : BORDER.rest,
                backgroundColor: selected
                  ? withAlpha(colors.primary, 0.12)
                  : "transparent",
              },
            ]}
          >
            <WxText
              type="body"
              weight={selected ? 600 : 400}
              color={colors.textPrimary}
            >
              {t.label}
            </WxText>
          </Pressable>
        );
      })}
    </View>
  );
}

const dash = "–";
const deg = (v: number | null) => (v === null ? dash : `${Math.round(v)}°`);
const mm = (v: number | null) => (v === null ? dash : `${Math.round(v)} mm`);

function NormalsTable({
  mode,
  rows,
  currentMonth,
}: {
  mode: Mode;
  rows: ReturnType<typeof monthlyRows>;
  currentMonth: number | null;
}) {
  const { colors } = usePageColors();
  const heads =
    mode === "temperature"
      ? ["Month", "High", "Low"]
      : ["Month", "Rain", "Rainy days"];
  return (
    <View accessibilityRole="list">
      <View style={styles.tr} importantForAccessibility="no-hide-descendants">
        {heads.map((h, i) => (
          <WxText
            key={h}
            type="bodySm"
            weight={600}
            color={colors.textTertiary}
            align={i === 0 ? "left" : "right"}
            style={styles.td}
          >
            {h}
          </WxText>
        ))}
      </View>
      {rows.map((r, i) => {
        const cells =
          mode === "temperature"
            ? [deg(r.meanHighC), deg(r.meanLowC)]
            : [
                mm(r.precipMm),
                r.rainyDays === null ? dash : String(Math.round(r.rainyDays)),
              ];
        const spoken =
          mode === "temperature"
            ? `${r.label}: average high ${r.meanHighC === null ? "not available" : deg(r.meanHighC)}, average low ${r.meanLowC === null ? "not available" : deg(r.meanLowC)}`
            : `${r.label}: average rain ${r.precipMm === null ? "not available" : mm(r.precipMm)}, ${r.rainyDays === null ? "no count of rainy days" : `${Math.round(r.rainyDays)} rainy days`}`;
        const current = i === currentMonth;
        return (
          <View
            key={r.label}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${spoken}${current ? ", this month" : ""}`}
            accessibilityState={{ selected: current }}
            style={[
              styles.tr,
              { borderTopColor: colors.border, borderTopWidth: BORDER.rest },
            ]}
          >
            <WxText
              type="bodySm"
              weight={current ? 600 : 400}
              color={current ? colors.textPrimary : colors.textSecondary}
              style={styles.td}
            >
              {r.label}
            </WxText>
            {cells.map((c, k) => (
              <WxText
                key={k}
                type="bodySm"
                weight={current ? 600 : 400}
                tabular
                align="right"
                color={current ? colors.textPrimary : colors.textSecondary}
                style={styles.td}
              >
                {c}
              </WxText>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function Ready({
  data,
  normals,
  recentDays,
}: {
  data: WeatherData;
  normals: ParsedMonthlyNormals;
  recentDays: Parameters<typeof recentComparison>[0];
}) {
  const { colors, scheme } = usePageColors();
  const [mode, setMode] = useState<Mode>("temperature");
  const rows = useMemo(() => monthlyRows(normals.months), [normals]);
  const currentMonth = monthIndexOf(data.daily?.time?.[0]);
  const comparisons = {
    temperature: [
      forecastComparison(data.daily, normals.months, "temperature"),
      recentComparison(recentDays, normals.months, "temperature"),
    ],
    precipitation: [
      forecastComparison(data.daily, normals.months, "precipitation"),
      recentComparison(recentDays, normals.months, "precipitation"),
    ],
  };
  return (
    <View style={styles.stack}>
      <Tabs mode={mode} onChange={setMode} />
      <Sentences items={comparisons[mode]} />
      <SheetSection heading="Monthly averages">
        <SectionBoundary name="the averages chart">
          <SeriesChart {...monthlyChartSpec(rows, mode, scheme)} />
        </SectionBoundary>
        <NormalsTable mode={mode} rows={rows} currentMonth={currentMonth} />
      </SheetSection>
      <WxText type="bodySm" color={colors.textTertiary}>
        {`Averages for ${normals.period}, ${normals.source}. A dash means no average is available.`}
      </WxText>
    </View>
  );
}

export function AveragesDetail({ data, lat, lon, slug }: AveragesDetailProps) {
  const { colors } = usePageColors();
  const hasPoint = typeof lat === "number" && typeof lon === "number";
  const loadNormals = useCallback(
    (signal: AbortSignal) =>
      fetchMonthlyNormals(lat as number, lon as number, signal),
    [lat, lon],
  );
  const normals = useWorkerData(loadNormals, hasPoint);
  const loadRecent = useCallback(
    (signal: AbortSignal) => fetchRecentDays(slug as string, signal),
    [slug],
  );
  const recent = useWorkerData(loadRecent, Boolean(slug));

  if (!hasPoint || normals.status === "unavailable") {
    return (
      <View style={styles.stack} testID="averages-unavailable">
        <WxText
          type="body"
          color={colors.textSecondary}
          accessibilityRole="alert"
        >
          Monthly averages are unavailable for this place right now.
        </WxText>
        {hasPoint ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={normals.reload}
            style={[styles.retry, { borderColor: colors.border }]}
          >
            <WxText type="body" weight={600} color={colors.textPrimary}>
              Try again
            </WxText>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (normals.status === "loading") {
    return (
      <CardSkeleton
        label="Loading monthly averages"
        testID="averages-loading"
      />
    );
  }
  return (
    <Ready
      data={data}
      normals={normals.data}
      recentDays={slug && recent.status === "ready" ? recent.data : []}
    />
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACE.section },
  sentences: { gap: SPACE.snug },
  tabs: { flexDirection: "row", gap: SPACE.snug },
  tab: {
    flex: 1,
    minHeight: TOUCH.min,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.snug,
    paddingVertical: SPACE.tight,
  },
  td: { flex: 1, minWidth: 0 },
  retry: {
    alignSelf: "flex-start",
    minHeight: TOUCH.min,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
    justifyContent: "center",
    paddingHorizontal: SIZE.pillPadX,
  },
});

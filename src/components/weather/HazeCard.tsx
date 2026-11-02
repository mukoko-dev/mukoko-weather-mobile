/**
 * The Haze card (the web's `HazePanel`): smoke, dust, urban smog or mist, how
 * heavy, the visibility and PM2.5 behind it, the regional haze season and, in
 * Singapore, the official PSI. The logic is the web's own (src/shared/haze.ts).
 *
 * Unlike the Air quality card it is a notice, not a fixture of the page: it is
 * drawn only when there is haze, or an active haze season with elevated
 * readings (`isHazeWorthShowing`). With no haze, an unavailable answer or a
 * failed request there is nothing to say, so nothing is drawn (no empty card,
 * no skeleton that would vanish and move the page).
 */

import { StyleSheet, View } from "react-native";

import { fetchHaze } from "@/api/haze";
import {
  CloudFogIcon,
  CloudIcon,
  SunIcon,
  WindIcon,
} from "@/components/icons/Icon";
import { FactoryIcon } from "@/components/icons/CardIcons";
import { usePageColors } from "@/hooks/usePageColors";
import { useWorkerData } from "@/hooks/useWorkerData";
import {
  HAZE_LEVEL_LABELS,
  HAZE_LEVEL_ORDER,
  HAZE_TYPE_ICON,
  HAZE_TYPE_LABELS,
  type HazeIconKey,
  type HazeResponse,
  formatMicrograms,
  formatMonthSpan,
  formatOfficialLine,
  formatPeakTime,
  formatVisibility,
  hazeBandIndex,
  hazeLevelRank,
  isHazeWorthShowing,
} from "@/shared/haze";
import { BORDER, RADIUS, SIZE, SPACE, withAlpha } from "@/theme/mzizi";
import { WX_AQI } from "@/theme/weather-scales";
import { useCallback } from "react";

import { StatGrid } from "./DetailSheet";
import { WxText } from "./WxText";

const TYPE_ICON: Record<HazeIconKey, typeof SunIcon> = {
  sun: SunIcon,
  cloud: CloudIcon,
  wind: WindIcon,
  factory: FactoryIcon,
  fog: CloudFogIcon,
};

const SEGMENT_HEIGHT = 8;
const SWATCH = 10;

/** The card for an answer that is worth showing; the caller has checked. */
export function HazeBody({ data }: { data: HazeResponse }) {
  const { colors } = usePageColors();
  const level = data.level!;
  const type = data.type!;
  const TypeIcon = TYPE_ICON[HAZE_TYPE_ICON[type]];
  const peak = formatPeakTime(data.peakTime);
  const showDust = type === "dust" || (data.dust !== null && data.dust >= 10);
  const rank = hazeLevelRank(level);
  const stats = [
    { label: "Visibility", value: formatVisibility(data.visibilityKm) },
    { label: "PM2.5", value: formatMicrograms(data.pm25) },
    ...(showDust
      ? [{ label: "Dust", value: formatMicrograms(data.dust) }]
      : []),
  ];

  return (
    <View
      testID="haze-card"
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: withAlpha(colors.primary, 0.25),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <WxText
            type="bodySm"
            weight={600}
            uppercase
            tracking="wider"
            color={colors.textTertiary}
          >
            Haze
          </WxText>
          <WxText
            type="h6"
            weight={600}
            family="serif"
            color={colors.textPrimary}
            accessibilityRole="header"
          >
            {data.headline ??
              `${HAZE_LEVEL_LABELS[level]} ${HAZE_TYPE_LABELS[type].toLowerCase()}`}
          </WxText>
        </View>
        <View
          accessible
          accessibilityLabel={`${HAZE_TYPE_LABELS[type]}, ${HAZE_LEVEL_LABELS[level]} level`}
          style={[
            styles.chip,
            { backgroundColor: withAlpha(colors.textTertiary, 0.16) },
          ]}
        >
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: WX_AQI[hazeBandIndex(level)],
                borderColor: colors.outline,
              },
            ]}
          />
          <TypeIcon size={SIZE.iconSm} color={colors.textPrimary} />
          <WxText type="bodySm" weight={600} color={colors.textPrimary}>
            {HAZE_TYPE_LABELS[type]}
          </WxText>
        </View>
      </View>

      <View
        style={styles.segments}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {HAZE_LEVEL_ORDER.slice(1).map((segment) => {
          const filled = rank >= hazeLevelRank(segment);
          return (
            <View
              key={segment}
              style={[
                styles.segment,
                {
                  backgroundColor: filled
                    ? WX_AQI[hazeBandIndex(segment)]
                    : withAlpha(colors.textTertiary, 0.16),
                  borderColor: colors.outline,
                },
              ]}
            />
          );
        })}
      </View>

      <StatGrid stats={stats} />

      {peak ? (
        <WxText type="body" color={colors.textSecondary}>
          {`Worst around ${peak}`}
        </WxText>
      ) : null}

      {data.season ? (
        <WxText type="bodySm" color={colors.textTertiary}>
          {`${data.season.name} · ${formatMonthSpan(data.season.typicalMonths)}${data.season.active ? "" : " (out of season now)"}`}
        </WxText>
      ) : null}

      {data.official ? (
        <WxText type="bodySm" color={colors.textTertiary}>
          {formatOfficialLine(data.official)}
        </WxText>
      ) : null}

      {data.advice.length > 0 ? (
        <View style={styles.advice}>
          {data.advice.slice(0, 3).map((item) => (
            <View key={item} style={styles.adviceRow}>
              <WxText type="body" color={colors.textSecondary}>
                {"•"}
              </WxText>
              <WxText
                type="body"
                color={colors.textSecondary}
                style={styles.adviceText}
              >
                {item}
              </WxText>
            </View>
          ))}
        </View>
      ) : null}

      {data.attribution ? (
        <WxText type="bodySm" color={colors.textTertiary}>
          {data.attribution}
        </WxText>
      ) : null}
    </View>
  );
}

export type HazeCardProps = {
  lat: number;
  lon: number;
  /** Changes when the page pulls a new forecast: the card asks again. */
  refreshKey?: unknown;
};

export function HazeCard({ lat, lon, refreshKey }: HazeCardProps) {
  const load = useCallback(
    (signal: AbortSignal) => fetchHaze(lat, lon, signal),
    [lat, lon],
  );
  const state = useWorkerData<HazeResponse>(load, true, refreshKey);
  if (state.status !== "ready") return null;
  const data = state.data;
  if (!data.available || !data.level || !data.type) return null;
  if (!isHazeWorthShowing(data.level, data.type, data.season)) return null;
  return <HazeBody data={data} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACE.stack,
  },
  titles: { flexShrink: 1, minWidth: 0, gap: SPACE.hair },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.tight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.cozy,
    paddingVertical: SPACE.hair,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.active,
  },
  segments: { flexDirection: "row", gap: SPACE.hair },
  segment: {
    flex: 1,
    height: SEGMENT_HEIGHT,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
  },
  advice: { gap: SPACE.hair },
  adviceRow: { flexDirection: "row", gap: SPACE.snug },
  adviceText: { flex: 1, minWidth: 0 },
});

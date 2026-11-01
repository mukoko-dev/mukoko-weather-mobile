/**
 * The Air quality card (the web's `AirQualityWide`): the US EPA index in large
 * type with its band named, the index on the six-band scale, and one sentence
 * (the band, the main pollutant, how it compares with yesterday). The whole
 * card is one button that opens `AirQualityDetail`.
 *
 * States: loading (a skeleton of the card), ready, and unavailable (the card
 * says so in words and offers "Try again"; it never shows a zero).
 */

import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { type AirQuality, fetchAirQuality } from "@/api/air-quality";
import { CloudIcon } from "@/components/icons/Icon";
import { usePageColors } from "@/hooks/usePageColors";
import { useWorkerData } from "@/hooks/useWorkerData";
import { AQI_BAND_LABELS, aqiBand } from "@/shared/aqi";
import { aqiScalePct } from "@/shared/air-quality-details";
import { aqiSentence } from "@/shared/conditions";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, mineralEdge } from "@/theme/mzizi";

import { AirQualityDetail } from "./AirQualityDetail";
import { CardSkeleton } from "./CardSkeleton";
import { InsightCard } from "./InsightCard";
import { MetricValue } from "./MetricValue";
import { GradientScale } from "./widgets";
import { WxText } from "./WxText";

export type AirQualityCardProps = {
  lat: number;
  lon: number;
  now: Date;
};

export function AirQualityCard({ lat, lon, now }: AirQualityCardProps) {
  const { colors, scheme } = usePageColors();
  const load = useCallback(
    (signal: AbortSignal) => fetchAirQuality(lat, lon, signal),
    [lat, lon],
  );
  const state = useWorkerData<AirQuality>(load, true);
  const [open, setOpen] = useState(false);

  if (state.status === "loading") {
    return (
      <CardSkeleton
        label="Loading air quality"
        mineral="terracotta"
        testID="air-quality-loading"
      />
    );
  }

  if (state.status === "unavailable") {
    return (
      <View
        testID="air-quality-unavailable"
        style={[
          styles.unavailable,
          {
            backgroundColor: colors.card,
            borderColor: mineralEdge("terracotta", scheme),
          },
        ]}
      >
        <View style={styles.header}>
          <CloudIcon size={SIZE.iconSm} color={colors.textTertiary} />
          <WxText
            type="bodySm"
            weight={600}
            uppercase
            tracking="wider"
            color={colors.textTertiary}
            accessibilityRole="header"
          >
            Air quality
          </WxText>
        </View>
        <WxText type="body" color={colors.textSecondary}>
          Air quality is unavailable right now.
        </WxText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={state.reload}
          style={({ pressed }) => [
            styles.retry,
            {
              borderColor: colors.border,
              borderWidth: pressed ? BORDER.active : BORDER.rest,
            },
          ]}
        >
          <WxText type="body" weight={600} color={colors.textPrimary}>
            Try again
          </WxText>
        </Pressable>
      </View>
    );
  }

  const reading = state.data;
  const band = aqiBand(reading.aqi);
  const bandLabel = AQI_BAND_LABELS[band];
  return (
    <>
      <InsightCard
        wide
        label="Air quality"
        mineral="terracotta"
        icon={(c) => <CloudIcon size={SIZE.iconSm} color={c} />}
        summary={`US AQI ${Math.round(reading.aqi)}, ${bandLabel}`}
        sentence={aqiSentence(band, reading.dominantPollutant, reading.trend)}
        onPress={() => setOpen(true)}
      >
        <View style={styles.body}>
          <View style={styles.valueRow}>
            <MetricValue>{String(Math.round(reading.aqi))}</MetricValue>
            <WxText
              type="h6"
              weight={600}
              family="serif"
              color={colors.textPrimary}
            >
              {bandLabel}
            </WxText>
          </View>
          <GradientScale
            stops="aqi"
            positionPct={aqiScalePct(reading.aqi)}
            label={`US AQI ${Math.round(reading.aqi)}, ${bandLabel}`}
          />
        </View>
      </InsightCard>
      <AirQualityDetail
        open={open}
        reading={reading}
        now={now}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { width: "100%", gap: SPACE.snug },
  valueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: SPACE.stack,
  },
  unavailable: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  header: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
  retry: {
    alignSelf: "flex-start",
    minHeight: TOUCH.min,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    paddingHorizontal: SIZE.pillPadX,
  },
});

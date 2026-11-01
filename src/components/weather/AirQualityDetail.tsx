/**
 * The detail behind the Air quality card (the web's `AirQualityDetail`): the
 * index on the EPA scale with all six bands' names AND ranges printed, plain
 * guidance for the band, every pollutant (the main one first, a gap as "No
 * data") against the WHO 2021 guideline, and how fresh the reading is. Colour
 * is never the only signal. The logic is the web's own
 * (src/shared/air-quality-details.ts).
 *
 * The web links on to the map from here; the map is a later slice, so this
 * detail ends at the source line.
 */

import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import {
  AQI_RANGES,
  type AirQualityReading,
  aqiScalePct,
  freshnessLabel,
  guidanceFor,
  pollutantRows,
} from "@/shared/air-quality-details";
import { AQI_BANDS, AQI_BAND_LABELS, aqiBand } from "@/shared/aqi";
import { BORDER, RADIUS, SPACE, withAlpha } from "@/theme/mzizi";
import { WX_AQI } from "@/theme/weather-scales";

import { DetailSheet, SheetSection } from "./DetailSheet";
import { GradientScale } from "./widgets";
import { WxText } from "./WxText";

export type AirQualityDetailProps = {
  open: boolean;
  reading: AirQualityReading;
  now: Date;
  onClose: () => void;
};

const SWATCH = 12;

export function AirQualityDetail({
  open,
  reading,
  now,
  onClose,
}: AirQualityDetailProps) {
  const { colors } = usePageColors();
  const band = aqiBand(reading.aqi);
  const guidance = guidanceFor(reading);
  const rows = pollutantRows(reading);
  const updated = freshnessLabel(reading.fetchedAt, now.getTime());
  const rounded = Math.round(reading.aqi);

  return (
    <DetailSheet
      open={open}
      title="Air quality"
      headline={`${rounded} ${AQI_BAND_LABELS[band]}`}
      sentence="US EPA Air Quality Index, 0 to 500"
      onClose={onClose}
      testID="air-quality-detail"
    >
      <SheetSection heading="Where the index sits on the scale">
        <GradientScale
          stops="aqi"
          positionPct={aqiScalePct(reading.aqi)}
          label={`US AQI ${rounded}, ${AQI_BAND_LABELS[band]}`}
        />
        <View style={styles.bands}>
          {AQI_RANGES.map(({ band: b, range }) => {
            const current = b === band;
            return (
              <View
                key={b}
                accessible
                accessibilityLabel={`${AQI_BAND_LABELS[b]}, ${range}${current ? ", current" : ""}`}
                accessibilityState={{ selected: current }}
                style={styles.bandRow}
              >
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: WX_AQI[AQI_BANDS.indexOf(b)],
                      borderColor: colors.outline,
                    },
                  ]}
                />
                <WxText
                  type="bodySm"
                  weight={current ? 600 : 400}
                  color={current ? colors.textPrimary : colors.textSecondary}
                  style={styles.bandName}
                >
                  {AQI_BAND_LABELS[b]}
                </WxText>
                <WxText
                  type="bodySm"
                  weight={current ? 600 : 400}
                  tabular
                  color={current ? colors.textPrimary : colors.textSecondary}
                >
                  {range}
                </WxText>
              </View>
            );
          })}
        </View>
      </SheetSection>

      <SheetSection heading="What it means for you">
        <WxText type="body" color={colors.textPrimary}>
          {guidance.text}
        </WxText>
        <WxText type="bodySm" color={colors.textTertiary}>
          {guidance.disclaimer}
        </WxText>
      </SheetSection>

      <SheetSection heading="Pollutants">
        <View>
          {rows.map((r, i) => (
            <View
              key={r.key}
              accessible
              accessibilityLabel={[
                `${r.name}${r.isMain ? ", main pollutant" : ""}`,
                r.valueText ?? "No data",
                r.subIndex !== null ? `index ${r.subIndex}` : null,
                r.who,
              ]
                .filter(Boolean)
                .join(", ")}
              style={[
                styles.pollutant,
                {
                  borderTopColor: colors.border,
                  borderTopWidth: i === 0 ? 0 : BORDER.rest,
                },
              ]}
            >
              <View style={styles.pollutantName}>
                <WxText type="body" weight={600} color={colors.textPrimary}>
                  {r.symbol}{" "}
                  <WxText type="body" color={colors.textSecondary}>
                    {r.name}
                  </WxText>
                </WxText>
                {r.isMain ? (
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: withAlpha(colors.textTertiary, 0.16) },
                    ]}
                  >
                    <WxText
                      type="caption"
                      weight={600}
                      color={colors.textPrimary}
                    >
                      Main pollutant
                    </WxText>
                  </View>
                ) : null}
                {r.who ? (
                  <WxText type="bodySm" color={colors.textTertiary}>
                    {r.who}
                  </WxText>
                ) : null}
              </View>
              <View style={styles.pollutantValue}>
                <WxText
                  type="body"
                  tabular
                  align="right"
                  color={colors.textPrimary}
                >
                  {r.valueText ?? "No data"}
                </WxText>
                {r.subIndex !== null ? (
                  <WxText
                    type="bodySm"
                    tabular
                    align="right"
                    color={colors.textTertiary}
                  >
                    {`Index ${r.subIndex}`}
                  </WxText>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        <WxText type="bodySm" color={colors.textTertiary}>
          WHO 2021 guidelines are 24-hour values; these are current readings, so
          the comparison is a guide only.
        </WxText>
      </SheetSection>

      <WxText type="bodySm" color={colors.textTertiary}>
        {[reading.source ? `Source: ${reading.source}` : null, updated]
          .filter(Boolean)
          .join(" · ")}
      </WxText>
    </DetailSheet>
  );
}

const styles = StyleSheet.create({
  bands: { gap: SPACE.snug },
  bandRow: { flexDirection: "row", alignItems: "center", gap: SPACE.snug },
  bandName: { flex: 1 },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.active,
  },
  pollutant: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACE.stack,
    paddingVertical: SPACE.cozy,
  },
  pollutantName: { flex: 1, minWidth: 0, gap: SPACE.hair, alignItems: "flex-start" },
  pollutantValue: { flexShrink: 0, gap: SPACE.hair },
  chip: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.tight,
    paddingVertical: SPACE.hair / 2,
  },
});

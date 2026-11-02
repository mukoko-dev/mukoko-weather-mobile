/**
 * The planting and harvest calendar (the web's `CropCalendarTable`): for each
 * crop in the place's calendar, a strip of the twelve months coloured by stage
 * (nursery, plant, grow, harvest), the current month marked. The calendar is
 * the GEOGLAM crop calendar the Worker holds for the place; a place without
 * one gets an honest note and NO crops are named (the web's rule).
 *
 * A stage is never only a colour: each cell carries the stage's letter, and
 * each crop reads as one VoiceOver item with its months in words. The current
 * month is the one in the user's place, not on the phone's clock.
 */

import { StyleSheet, View } from "react-native";

import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import {
  type CropCalendar,
  type CropStage,
  MONTH_ABBR,
  STAGE_LABELS,
  STAGE_ORDER,
  stageForMonth,
} from "@/shared/agriculture";
import { monthRange } from "@/shared/place-knowledge";
import { FARM_SIZE, type FarmColors } from "@/theme/farm";
import { RADIUS, SPACE, withAlpha } from "@/theme/mzizi";

import { CardBody, CardHeading, CardNote, PlaceCard } from "./PlaceCard";
import { WxText } from "./WxText";

/** The cell fill and its text for a stage, as the web's `STAGE_CLASSES`. */
export function stageStyle(
  stage: CropStage,
  farm: FarmColors,
  textPrimary: string,
): { fill: string; text: string } {
  switch (stage) {
    case "nursery":
      return { fill: withAlpha(farm.malachite, 0.15), text: textPrimary };
    case "plant":
      return { fill: farm.malachite, text: farm.malachiteFg };
    case "grow":
      return { fill: withAlpha(farm.malachite, 0.35), text: textPrimary };
    case "harvest":
      return { fill: farm.gold, text: farm.goldFg };
  }
}

/** "Plant: Nov to Dec. Harvest: Apr to May." for VoiceOver. */
export function spokenStages(crop: CropCalendar): string {
  return STAGE_ORDER.flatMap((stage) => {
    const months = crop.months[stage];
    if (!months?.length) return [];
    return [`${STAGE_LABELS[stage]}: ${monthRange(months).replace(/–/g, " to ")}.`];
  }).join(" ");
}

export type CropCalendarTableProps = {
  calendar: readonly CropCalendar[];
  /** 1-based current month in the place's time zone. */
  currentMonth: number;
};

export function CropCalendarTable({
  calendar,
  currentMonth,
}: CropCalendarTableProps) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  return (
    <PlaceCard accent="quiet" testID="crop-calendar">
      <CardHeading>Planting and harvest calendar</CardHeading>
      {calendar.length === 0 ? (
        <CardBody>
          A crop calendar for this place is not available yet. Local planting
          follows the onset of the rains; check with your extension officer.
        </CardBody>
      ) : (
        <>
          {calendar.map((crop) => (
            <View
              key={crop.id}
              accessible
              accessibilityLabel={`${crop.label}. ${crop.phase ? `Now: ${crop.phase}. ` : ""}${spokenStages(crop)}`}
              style={styles.crop}
            >
              <View>
                <WxText type="body" weight={600} color={colors.textPrimary}>
                  {crop.label}
                </WxText>
                {crop.phase ? (
                  <CardNote>{`Now: ${crop.phase}`}</CardNote>
                ) : null}
              </View>
              <View style={styles.strip}>
                {MONTH_ABBR.map((m, i) => {
                  const stage = stageForMonth(crop, i + 1);
                  const look = stage
                    ? stageStyle(stage, farm, colors.textPrimary)
                    : { fill: farm.surfaceDim, text: colors.textTertiary };
                  return (
                    <View key={m} style={[styles.cell, { backgroundColor: look.fill }]}>
                      <WxText type="caption" weight={600} color={look.text}>
                        {stage ? STAGE_LABELS[stage].charAt(0) : ""}
                      </WxText>
                    </View>
                  );
                })}
              </View>
              <View style={styles.months}>
                {MONTH_ABBR.map((m, i) => (
                  <View key={m} style={styles.monthSlot}>
                    <WxText
                      type="caption"
                      weight={i + 1 === currentMonth ? 700 : 400}
                      color={
                        i + 1 === currentMonth
                          ? colors.textPrimary
                          : colors.textTertiary
                      }
                      style={
                        i + 1 === currentMonth ? styles.current : undefined
                      }
                    >
                      {m.charAt(0)}
                    </WxText>
                  </View>
                ))}
              </View>
            </View>
          ))}
          <View
            style={styles.legend}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {STAGE_ORDER.map((s) => (
              <View key={s} style={styles.legendItem}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: stageStyle(s, farm, colors.textPrimary).fill },
                  ]}
                />
                <CardNote>{`${STAGE_LABELS[s].charAt(0)} ${STAGE_LABELS[s]}`}</CardNote>
              </View>
            ))}
          </View>
        </>
      )}
    </PlaceCard>
  );
}

const styles = StyleSheet.create({
  crop: { gap: SPACE.snug },
  strip: { flexDirection: "row", gap: SPACE.hair },
  cell: {
    flex: 1,
    height: FARM_SIZE.calendarCell,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  months: { flexDirection: "row", gap: SPACE.hair },
  monthSlot: { flex: 1, alignItems: "center" },
  current: { textDecorationLine: "underline" },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: SPACE.stack, rowGap: SPACE.hair },
  legendItem: { flexDirection: "row", alignItems: "center", gap: SPACE.tight },
  swatch: {
    width: FARM_SIZE.swatchWidth,
    height: FARM_SIZE.swatchHeight,
    borderRadius: RADIUS.sm,
  },
});

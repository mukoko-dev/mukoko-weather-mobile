/**
 * The full activity advice (the web's `ActivitiesDetailSheet`): one card per
 * activity the person picked, with its rating now, a 24-hour trend and tips,
 * and an Edit action that goes to the picker. It opens from the Community lane
 * (the "All advice" button, or one activity's row, which scrolls to that
 * activity's card).
 *
 * Ratings use the Worker's suitability rules; if they cannot be read the sheet
 * says so and offers to try again, and shows no rating. Nothing here sends the
 * activities anywhere.
 */

import { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";

import {
  useActivityCatalogue,
  useSuitabilityRules,
} from "@/hooks/useActivityData";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { usePageColors } from "@/hooks/usePageColors";
import { type Activity } from "@/shared/activities";
import {
  type WeatherData,
  synthesizeOpenMeteoInsights,
} from "@/shared/weather";
import { usePreferences } from "@/state/preferences";
import { SPACE } from "@/theme/mzizi";

import { ActivityCard } from "./ActivityCard";
import { DetailSheet } from "./DetailSheet";
import { PillButton } from "./PillButton";
import { WxText } from "./WxText";

export type ActivitiesSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Close this sheet and open the picker. */
  onEdit: () => void;
  /** Scroll to this activity's card once the sheet is open. */
  focusActivityId?: string;
  forecast: WeatherData;
  now: Date;
};

/** The activities the person picked, in the order they picked them. */
export function selectedActivities(
  ids: string[],
  catalogue: Activity[],
): Activity[] {
  return ids
    .map((id) => catalogue.find((a) => a.id === id))
    .filter((a): a is Activity => a !== undefined);
}

export function ActivitiesSheet({
  visible,
  onClose,
  onEdit,
  focusActivityId,
  forecast,
  now,
}: ActivitiesSheetProps) {
  const { colors } = usePageColors();
  const reduceMotion = useReduceMotion();
  const scrollTo = useRef<((y: number, animated: boolean) => void) | null>(
    null,
  );
  const { activities: picked } = usePreferences();
  const { activities } = useActivityCatalogue(visible);
  const items = selectedActivities(picked, activities);
  const { status, rules, retry } = useSuitabilityRules(
    visible && items.length > 0,
  );
  const insights = forecast.insights ?? synthesizeOpenMeteoInsights(forecast);

  const scrollToCard = useCallback(
    (id: string, y: number) => {
      if (id !== focusActivityId) return;
      scrollTo.current?.(y, !reduceMotion);
    },
    [focusActivityId, reduceMotion],
  );

  return (
    <DetailSheet
      visible={visible}
      title="My activities"
      description="How the forecast affects each activity you picked, hour by hour. Ratings come from the same rules as the Community lane."
      onClose={onClose}
      scrollToRef={scrollTo}
      testID="activities-sheet"
    >
      {items.length === 0 ? (
        <View style={styles.block}>
          <WxText type="body" color={colors.textSecondary}>
            You have not picked an activity yet. Pick a few and this shows how
            today&apos;s weather affects each one.
          </WxText>
          <PillButton label="Choose activities" onPress={onEdit} />
        </View>
      ) : (
        <>
          <View style={styles.headRow}>
            <WxText
              type="h6"
              weight={600}
              family="serif"
              color={colors.textPrimary}
              accessibilityRole="header"
            >
              Advice for today
            </WxText>
            <PillButton label="Edit" variant="outline" onPress={onEdit} />
          </View>
          {status === "failed" ? (
            <View style={styles.block} accessibilityRole="alert">
              <WxText type="body" color={colors.textSecondary}>
                Could not load the rules the ratings come from, so no rating is
                shown. Check your connection and try again.
              </WxText>
              <PillButton label="Try again" onPress={retry} />
            </View>
          ) : status === "ready" && rules ? (
            items.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                insights={insights}
                rules={rules}
                forecast={forecast}
                now={now}
                onLayoutTop={(y) => scrollToCard(a.id, y)}
              />
            ))
          ) : (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Loading the rules"
              style={styles.block}
            >
              <WxText type="body" color={colors.textTertiary}>
                Loading the rules…
              </WxText>
            </View>
          )}
        </>
      )}
    </DetailSheet>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACE.stack },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.stack,
  },
});

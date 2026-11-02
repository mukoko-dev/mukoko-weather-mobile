/**
 * The Activities block of the My tab: how many activities are picked, their
 * names, and one button that opens the SAME picker the weather page opens
 * (`ActivityPickerSheet`), so there is one picker, not two. The selection is
 * kept on this device only (`src/state/preferences.ts`).
 */

import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { RADIUS, SPACING, TOUCH_TARGET_MIN } from "@/brand/tokens";
import { BrandText } from "@/components/BrandText";
import { ActivityPickerSheet } from "@/components/weather/ActivityPickerSheet";
import { useActivityCatalogue } from "@/hooks/useActivityData";
import { usePalette } from "@/hooks/usePalette";
import { ACTIVITIES, type Activity } from "@/shared/activities";
import { usePreferences } from "@/state/preferences";

/**
 * The names of the picked activities, in the order they were picked, read from
 * the same list the picker and the advice sheet use (the Worker's, the seed
 * until it answers), so a pick the seed does not know is still named here.
 */
export function pickedNames(
  ids: string[],
  catalogue: Activity[] = ACTIVITIES,
): string[] {
  return ids
    .map((id) => catalogue.find((a) => a.id === id)?.label)
    .filter((l): l is string => l !== undefined);
}

export function ActivitySelector() {
  const palette = usePalette();
  const { activities } = usePreferences();
  const { activities: catalogue } = useActivityCatalogue();
  const [open, setOpen] = useState(false);
  const names = pickedNames(activities, catalogue);

  return (
    <View style={styles.wrap}>
      <BrandText variant="body" tone="textSecondary">
        {names.length === 0 ? "No activities picked yet." : names.join(", ")}
      </BrandText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          names.length === 0
            ? "Choose activities"
            : `Change activities, ${names.length} picked`
        }
        style={[styles.btn, { borderColor: palette.borderStrong }]}
      >
        <BrandText variant="bodyBold" tone="text">
          {names.length === 0 ? "Choose activities" : "Change activities"}
        </BrandText>
      </Pressable>
      <ActivityPickerSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  btn: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.button,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
});

/**
 * ActivitySelector — mineral-coloured chips for the activities the user cares
 * about (farming, mining, travel, tourism, sports, casual). Each activity wears
 * one of the six ring minerals from the Mukoko brand kit (tanzanite is reserved
 * for the brand core), so selections read as the palette, not arbitrary colours.
 *
 * Selection is multi-select and persisted via the preferences store.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { RADIUS, SPACING } from "@/brand/tokens";
import { BrandText } from "@/components/BrandText";
import { usePalette } from "@/hooks/usePalette";
import { type Palette } from "@/theme/colors";
import {
  ACTIVITY_IDS,
  toggleActivity,
  usePreferences,
  type ActivityId,
} from "@/state/preferences";

/** Mineral tone (fill) + its matching on-colour (text on fill) per activity. */
type MineralTone =
  "primary" | "success" | "accent" | "copper" | "terracotta" | "sodalite";

const ACTIVITY_META: Record<
  ActivityId,
  { label: string; tone: MineralTone; on: keyof Palette }
> = {
  farming: { label: "Farming", tone: "success", on: "onSuccess" },
  mining: { label: "Mining", tone: "copper", on: "onCopper" },
  travel: { label: "Travel", tone: "primary", on: "onPrimary" },
  tourism: { label: "Tourism", tone: "accent", on: "onAccent" },
  sports: { label: "Sports", tone: "terracotta", on: "onTerracotta" },
  casual: { label: "Casual", tone: "sodalite", on: "onSodalite" },
};

export function ActivitySelector() {
  const palette = usePalette();
  const { activities } = usePreferences();

  return (
    <View style={styles.wrap}>
      {ACTIVITY_IDS.map((id) => {
        const meta = ACTIVITY_META[id];
        const selected = activities.includes(id);
        const mineral = palette[meta.tone];
        return (
          <Pressable
            key={id}
            onPress={() => toggleActivity(id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={meta.label}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? mineral : "transparent",
                borderColor: selected ? mineral : mineral + "66",
              },
            ]}
          >
            <BrandText
              variant="smallBold"
              tone={meta.tone}
              style={selected ? { color: palette[meta.on] } : undefined}
            >
              {meta.label}
            </BrandText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
  },
});

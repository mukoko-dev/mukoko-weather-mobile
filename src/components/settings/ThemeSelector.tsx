/**
 * ThemeSelector — a segmented control for the app theme (light / dark /
 * system). The choice is persisted via the preferences store. `system`
 * follows the OS colour scheme, which is what the app currently renders with.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { RADIUS, SPACING } from "@/brand/tokens";
import { BrandText } from "@/components/BrandText";
import { usePalette } from "@/hooks/usePalette";
import {
  setThemePreference,
  usePreferences,
  type ThemePreference,
} from "@/state/preferences";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeSelector() {
  const palette = usePalette();
  const { theme } = usePreferences();

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: palette.surfaceDim, borderColor: palette.border },
      ]}
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setThemePreference(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.label} theme`}
            style={[
              styles.segment,
              active && { backgroundColor: palette.primary },
            ]}
          >
            <BrandText
              variant="smallBold"
              tone="text"
              style={
                active
                  ? { color: palette.onPrimary }
                  : { color: palette.textSecondary }
              }
            >
              {opt.label}
            </BrandText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.pill,
  },
});

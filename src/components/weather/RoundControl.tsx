/**
 * A round 48 dp icon control on the sky: Share, Settings, Back. A hairline
 * border and a faint fill in the sky foreground, no shadow (Mzizi separates
 * with borders). It is at least `TOUCH.min` square and always has a spoken
 * label. Presses scale it down a little and lift the fill; under Reduce Motion
 * the scale is skipped and only the fill changes.
 */

import { type ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";

import { useReduceMotion } from "@/hooks/useReduceMotion";
import { BORDER, RADIUS, TOUCH, withAlpha } from "@/theme/mzizi";
import { SKY_FG, SKY_SURFACE } from "@/theme/sky";

/** `active:scale-95` on the web. */
const PRESS_SCALE = 0.95;

export type RoundControlProps = {
  label: string;
  onPress: () => void;
  children: ReactNode;
  testID?: string;
};

export function RoundControl({
  label,
  onPress,
  children,
  testID,
}: RoundControlProps) {
  const reduceMotion = useReduceMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.control,
        {
          backgroundColor: withAlpha(
            SKY_FG,
            pressed ? SKY_SURFACE.round.fillPressed : SKY_SURFACE.round.fill,
          ),
          borderColor: withAlpha(SKY_FG, SKY_SURFACE.round.border),
          transform: pressed && !reduceMotion ? [{ scale: PRESS_SCALE }] : [],
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    width: TOUCH.min,
    height: TOUCH.min,
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.sky,
    alignItems: "center",
    justifyContent: "center",
  },
});

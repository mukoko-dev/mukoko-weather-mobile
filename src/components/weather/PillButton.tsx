/**
 * The pill button on the weather page's cards and sheets (the web's `.kudu`
 * filled pill, `.kudu-sm`, `.impala` outline pill). Filled uses the app's
 * primary; outline is a 0.5 dp border. Both are at least `TOUCH.min` (48 dp)
 * tall, `TOUCH.default` (56 dp) for the large size, with a visible label, a
 * disabled state that says so to the screen reader, and no shadow.
 *
 * Presses lift the fill; the scale a press adds is skipped under Reduce Motion.
 */

import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH, withAlpha } from "@/theme/mzizi";
import { ON_FILL } from "@/theme/ratings";

import { WxText } from "./WxText";

/** `active:scale-95` on the web. */
const PRESS_SCALE = 0.97;
const DISABLED_OPACITY = 0.5;

export type PillButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "filled" | "outline";
  /** `md` is 56 dp tall (the web's `.kudu`), `sm` 48 dp (`.kudu-sm`). */
  size?: "sm" | "md";
  /** A drawn icon before the label; it receives the text colour. */
  icon?: (color: string) => ReactNode;
  disabled?: boolean;
  /** Tell the screen reader why a disabled button is disabled. */
  hint?: string;
  testID?: string;
  /** Stretch to the full width of the row. */
  stretch?: boolean;
};

export function PillButton({
  label,
  onPress,
  variant = "filled",
  size = "sm",
  icon,
  disabled = false,
  hint,
  testID,
  stretch = false,
}: PillButtonProps) {
  const { colors, scheme } = usePageColors();
  const reduceMotion = useReduceMotion();
  const filled = variant === "filled";
  const ink = filled ? ON_FILL[scheme] : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { minHeight: size === "md" ? TOUCH.default : TOUCH.min },
        stretch ? styles.stretch : styles.hug,
        filled
          ? {
              backgroundColor: pressed
                ? withAlpha(colors.primary, 0.85)
                : colors.primary,
              borderColor: colors.primary,
            }
          : {
              backgroundColor: pressed
                ? withAlpha(colors.textPrimary, 0.08)
                : "transparent",
              borderColor: colors.border,
            },
        disabled ? { opacity: DISABLED_OPACITY } : null,
        { transform: pressed && !reduceMotion ? [{ scale: PRESS_SCALE }] : [] },
      ]}
    >
      <View style={styles.row}>
        {icon ? icon(ink) : null}
        <WxText type="body" weight={600} color={ink}>
          {label}
        </WxText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.pill,
    borderWidth: BORDER.rest,
    paddingHorizontal: SIZE.pillPadX,
    alignItems: "center",
    justifyContent: "center",
  },
  hug: { alignSelf: "flex-start" },
  stretch: { alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: SPACE.snug },
});

/**
 * The buttons on a card (the web's `.kudu-sm`, `.impala-sm` and the prose link
 * `.sunbird`): a pill at least 48 dp tall, a spoken label, a press that scales
 * a little (skipped under Reduce Motion). `primary` is filled, `outline` has
 * the border colour, `link` is text in the primary colour with the same 48 dp
 * target. Borders, no shadows.
 */

import { Pressable, StyleSheet } from "react-native";

import { useFarmColors } from "@/hooks/useFarmColors";
import { usePageColors } from "@/hooks/usePageColors";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { BORDER, RADIUS, SIZE, TOUCH } from "@/theme/mzizi";

import { WxText } from "./WxText";

/** `active:scale-95` on the web. */
const PRESS_SCALE = 0.95;

export type PillButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "link";
  /** What VoiceOver reads after the label. */
  hint?: string;
  testID?: string;
};

export function PillButton({
  label,
  onPress,
  variant = "outline",
  hint,
  testID,
}: PillButtonProps) {
  const { colors } = usePageColors();
  const farm = useFarmColors();
  const reduceMotion = useReduceMotion();
  const filled = variant === "primary";
  const link = variant === "link";
  return (
    <Pressable
      accessibilityRole={link ? "link" : "button"}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        link ? styles.link : styles.pill,
        {
          backgroundColor: filled ? colors.primary : "transparent",
          borderColor: filled ? colors.primary : colors.border,
          borderWidth: link ? 0 : BORDER.rest,
          opacity: pressed && reduceMotion ? 0.7 : 1,
          transform: pressed && !reduceMotion ? [{ scale: PRESS_SCALE }] : [],
        },
      ]}
    >
      <WxText
        type="body"
        weight={600}
        color={filled ? farm.onPrimary : link ? colors.primary : colors.textPrimary}
      >
        {label}
      </WxText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH.min,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  pill: { borderRadius: RADIUS.pill, paddingHorizontal: SIZE.pillPadX },
  link: { justifyContent: "center" },
});

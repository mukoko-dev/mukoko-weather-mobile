/**
 * Text on the Mzizi type scale: one of the `--text-*` sizes with its leading,
 * at weight 400, 600 or 700, in Noto Sans, Noto Serif or JetBrains Mono. Never
 * a size or weight of its own. It scales with the person's text size
 * (Dynamic Type) and wraps; it never truncates unless the caller says so.
 */

import { Text, type TextProps } from "react-native";

import {
  FONT_FILE,
  type Family,
  type TypeToken,
  type Weight,
  TYPE,
  lineHeightOf,
} from "@/theme/mzizi";

/** `tracking-tight`, `tracking-wider`, `tracking-widest` in em. */
const TRACKING = { tight: -0.025, wider: 0.05, widest: 0.1 } as const;

export type WxTextProps = TextProps & {
  type?: TypeToken;
  weight?: Weight;
  family?: Family;
  /** Required: every colour comes from a token, so there is no default. */
  color: string;
  tabular?: boolean;
  tracking?: keyof typeof TRACKING;
  uppercase?: boolean;
  /** `leading-none` for a large numeral: the line is exactly the type size. */
  leading?: "none";
  align?: "left" | "center" | "right";
};

export function WxText({
  type = "body",
  weight = 400,
  family = "sans",
  color,
  tabular = false,
  tracking,
  uppercase = false,
  leading,
  align,
  style,
  children,
  ...rest
}: WxTextProps) {
  const { size } = TYPE[type];
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: FONT_FILE[family][weight],
          fontSize: size,
          lineHeight: leading === "none" ? size : lineHeightOf(type),
          color,
          textAlign: align,
          letterSpacing: tracking ? TRACKING[tracking] * size : undefined,
          textTransform: uppercase ? "uppercase" : undefined,
          fontVariant: tabular ? ["tabular-nums"] : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

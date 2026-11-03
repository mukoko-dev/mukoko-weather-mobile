/**
 * The big numeral on a tile or card: Noto Serif, h2, weight 600, the line as
 * tall as the type (the web's `MetricValue`). Used by the Conditions tiles, the
 * air-quality card and the sheets.
 */

import { usePageColors } from "@/hooks/usePageColors";

import { WxText } from "./WxText";

export function MetricValue({ children }: { children: string }) {
  const { colors } = usePageColors();
  return (
    <WxText
      type="h2"
      weight={600}
      family="serif"
      tabular
      leading="none"
      color={colors.textPrimary}
    >
      {children}
    </WxText>
  );
}

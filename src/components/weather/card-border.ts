/**
 * The border colour of a page card: the primary family at 25% for the common
 * card (the web's `.baobab`), the plain border for a quiet one inside a page
 * of cards (`.acacia`). One place, so the cards on the detail pages cannot
 * drift apart.
 */

import { usePageColors } from "@/hooks/usePageColors";
import { withAlpha } from "@/theme/mzizi";

export type CardTone = "primary" | "quiet";

export function useCardBorder(tone: CardTone = "primary"): string {
  const { colors } = usePageColors();
  return tone === "primary" ? withAlpha(colors.primary, 0.25) : colors.border;
}

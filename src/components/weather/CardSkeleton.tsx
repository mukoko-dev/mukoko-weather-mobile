/**
 * The loading state of a card below the hero: the card's own frame with a
 * heading bar, a numeral bar and a sentence bar, shimmering (still under
 * Reduce Motion). One status region with a spoken name; the bars are hidden
 * from VoiceOver. The same card outline as the loaded card, so nothing jumps
 * when the data arrives (Apple HIG, Loading).
 */

import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import {
  BORDER,
  RADIUS,
  SIZE,
  SPACE,
  TYPE,
  mineralEdge,
  type Mineral,
  withAlpha,
} from "@/theme/mzizi";

import { Bar, ShimmerProvider } from "./Shimmer";

export type CardSkeletonProps = {
  /** "Loading air quality": what VoiceOver says. */
  label: string;
  mineral?: Mineral;
  /** A square tile (a minimum height) rather than a wide card. */
  square?: boolean;
  testID?: string;
};

export function CardSkeleton({
  label,
  mineral,
  square = false,
  testID,
}: CardSkeletonProps) {
  const { colors, scheme } = usePageColors();
  const bar = withAlpha(colors.textTertiary, 0.28);
  return (
    <ShimmerProvider>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
        testID={testID}
        style={[
          styles.card,
          square ? styles.square : null,
          {
            backgroundColor: colors.card,
            borderColor: mineral
              ? mineralEdge(mineral, scheme)
              : colors.border,
          },
        ]}
      >
        <Bar color={bar} width="40%" height={Math.round(TYPE.bodySm.size * 0.8)} />
        <Bar color={bar} width="30%" height={Math.round(TYPE.h2.size * 0.8)} />
        <Bar color={bar} width="85%" height={Math.round(TYPE.bodySm.size * 0.8)} />
      </View>
    </ShimmerProvider>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
    minWidth: 0,
  },
  square: { minHeight: SIZE.insightMin },
});

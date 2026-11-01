/**
 * The loading and failure faces every remote card shares, so a card is never a
 * blank hole and never a lone spinner:
 *
 *   - `CardLoading`: bars in the card's own shape, one VoiceOver item
 *     ("Loading {what}"), still under Reduce Motion (the shared Shimmer).
 *   - `CardFailed`: what happened in plain words and ONE action, "Try again".
 *     It is for a request that failed (offline, a bad answer). A card that got
 *     a clear "no data" answer from the Worker says why, in its own words.
 */

import { StyleSheet, View } from "react-native";

import { usePageColors } from "@/hooks/usePageColors";
import { SPACE, TYPE, lineHeightOf, withAlpha } from "@/theme/mzizi";

import { CardBody, CardHeading } from "./PlaceCard";
import { PillButton } from "./PillButton";
import { Bar, ShimmerProvider } from "./Shimmer";

/** Bar widths as a share of the card, the middle of what the text measures. */
const BAR = { heading: "45%", line: "100%", short: "70%" } as const;

export function CardLoading({ what }: { what: string }) {
  const { colors } = usePageColors();
  const tint = withAlpha(colors.textTertiary, 0.35);
  const bar = Math.round(TYPE.body.size * 0.7);
  return (
    <ShimmerProvider>
      <View
        accessible
        accessibilityLabel={`Loading ${what}`}
        accessibilityState={{ busy: true }}
        style={styles.loading}
        testID="card-loading"
      >
        <View style={styles.row}>
          <Bar color={tint} width={BAR.heading} height={bar} />
        </View>
        <View style={styles.row}>
          <Bar color={tint} width={BAR.line} height={bar} />
        </View>
        <View style={styles.row}>
          <Bar color={tint} width={BAR.short} height={bar} />
        </View>
      </View>
    </ShimmerProvider>
  );
}

export function CardFailed({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.failed} testID="card-failed">
      <CardHeading>{title}</CardHeading>
      <CardBody>{body}</CardBody>
      {onRetry ? <PillButton label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { gap: SPACE.snug },
  row: { height: lineHeightOf("body"), justifyContent: "center" },
  failed: { gap: SPACE.stack },
});

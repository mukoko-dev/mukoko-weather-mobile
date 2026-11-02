/**
 * Shamwari's weather insight (the web's `AISummary` and its sign-in card).
 * On the web this is for signed-in people only. The app's sign-in is switched
 * off (`SIGN_IN_AVAILABLE` in `src/api/auth.ts`: no token exchange route
 * exists on the API yet), so the card that shows today is the designed
 * signed-out state, and says plainly that sign-in is not available yet. It
 * never fakes a session and never calls the AI route.
 *
 * Behind the same switch the signed-in card is built: it asks
 * `POST /v1/ai/summary` for the place (nothing about the person, no
 * activities), shows loading lines, the insight, or a failure with a way to
 * try again, and hands the text up so the follow-up chat can start from it.
 */

import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { type SummaryPlace, fetchAiSummary } from "@/api/ai";
import { SparklesIcon } from "@/components/icons/Icon";
import { usePageColors } from "@/hooks/usePageColors";
import { useSignedIn } from "@/hooks/useSignedIn";
import { SIZE, SPACE, withAlpha } from "@/theme/mzizi";
import { mineralColor } from "@/theme/ratings";

import { PageCard } from "./PageCard";
import { PillButton } from "./PillButton";
import { WxMarkdown } from "./WxMarkdown";
import { WxText } from "./WxText";

/** The sodalite border at 40%, as the web's `border-mineral-sodalite/40`. */
const BORDER_ALPHA = 0.4;

export type AiSummaryProps = {
  place: SummaryPlace;
  /** Called with the insight once it has loaded (the follow-up starts from it). */
  onLoaded?: (insight: string) => void;
  /** Test seam: the sign-in switch. Defaults to `SIGN_IN_AVAILABLE`. */
  signInAvailable?: boolean;
};

export function AiSummary({
  place,
  onLoaded,
  signInAvailable,
}: AiSummaryProps) {
  const { colors, scheme } = usePageColors();
  const { available, signedIn } = useSignedIn(signInAvailable);
  const sodalite = mineralColor("sodalite", colors, scheme);
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; insight: string }
    | { status: "failed" }
  >({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  const { slug, name, lat, lon, country, elevation } = place;
  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    let alive = true;
    setState({ status: "loading" });
    fetchAiSummary(
      { slug, name, lat, lon, country, elevation },
      controller.signal,
    )
      .then((s) => {
        if (!alive) return;
        setState({ status: "ready", insight: s.insight });
        onLoaded?.(s.insight);
      })
      .catch(() => {
        if (alive) setState({ status: "failed" });
      });
    return () => {
      alive = false;
      controller.abort();
    };
    // `onLoaded` is a callback from the page; it must not restart the request.
    // Nor must `name`: the place is its slug and point, and a label that
    // improves after first paint (the GPS geocode) would cancel the request
    // and spend a second metered model call for the same place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, slug, lat, lon, country, elevation, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const header = <SparklesIcon size={SIZE.iconSm} color={sodalite} />;

  if (!signedIn) {
    return (
      <PageCard
        title="Shamwari Weather Insight"
        headerStart={header}
        borderColor={withAlpha(sodalite, BORDER_ALPHA)}
        testID="ai-summary-signed-out"
      >
        <WxText type="body" color={colors.textSecondary}>
          Sign in to see Mukoko&apos;s AI insights for {place.name}.
        </WxText>
        {available ? (
          <PillButton label="Sign in" onPress={() => router.push("/sign-in")} />
        ) : (
          <WxText type="body" weight={600} color={colors.textPrimary}>
            Sign-in is not available in the app yet. The insight appears here
            once it is.
          </WxText>
        )}
      </PageCard>
    );
  }

  return (
    <PageCard
      title="Shamwari Weather Insight"
      headerStart={header}
      borderColor={withAlpha(sodalite, BORDER_ALPHA)}
      testID="ai-summary"
    >
      {state.status === "loading" || state.status === "idle" ? (
        <View
          style={styles.lines}
          accessibilityRole="progressbar"
          accessibilityLabel="Loading the AI summary"
        >
          {[0.75, 1, 0.66].map((w) => (
            <View
              key={w}
              style={[
                styles.line,
                {
                  width: `${w * 100}%`,
                  backgroundColor: withAlpha(colors.textTertiary, 0.25),
                },
              ]}
            />
          ))}
        </View>
      ) : null}
      {state.status === "ready" ? <WxMarkdown content={state.insight} /> : null}
      {state.status === "failed" ? (
        <View style={styles.lines} accessibilityRole="alert">
          <WxText type="body" color={colors.textSecondary}>
            Unable to load the AI summary. The weather above is still here.
          </WxText>
          <PillButton label="Try again" variant="outline" onPress={retry} />
        </View>
      ) : null}
    </PageCard>
  );
}

const styles = StyleSheet.create({
  lines: { gap: SPACE.snug },
  line: { height: SIZE.iconSm, borderRadius: SIZE.iconSm },
});

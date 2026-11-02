/**
 * Shamwari's agronomy briefing (the web's `AgricultureBriefing`). On the web it
 * is signed-in only: the model explains the farm data for the user's crops.
 * Sign-in is switched off in the app (there is no session exchange on the
 * Cloudflare backend yet), so this card says exactly that: what it is, why it
 * is not here, and what the rest of the page still gives. It has no button that
 * leads nowhere. The API routes it needs are listed in the pull request.
 */

import { StyleSheet, View } from "react-native";

import { SIGN_IN_AVAILABLE } from "@/api/auth";
import { SparklesIcon } from "@/components/icons/Icon";
import { useFarmColors } from "@/hooks/useFarmColors";
import { SIZE, SPACE } from "@/theme/mzizi";

import { CardBody, CardHeading, PlaceCard } from "./PlaceCard";

export function briefingPending(placeName: string): string {
  return `Shamwari's farm briefing for ${placeName}, written for your crops, needs an account. Sign-in is not available in the app yet. The windows, crop advice and charts on this page are live and do not need one.`;
}

export function AgricultureBriefing({ placeName }: { placeName: string }) {
  const farm = useFarmColors();
  // While sign-in is off nothing may pretend to hold a session (see src/api/auth.ts).
  const signedOut = !SIGN_IN_AVAILABLE;
  return (
    <PlaceCard accent="malachite" testID="agriculture-briefing">
      <View style={styles.head}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <SparklesIcon size={SIZE.iconMd} color={farm.malachite} />
        </View>
        <CardHeading>Shamwari agronomy briefing</CardHeading>
      </View>
      {signedOut ? (
        <CardBody>{briefingPending(placeName)}</CardBody>
      ) : (
        <CardBody>
          The briefing is not available right now. The windows and charts on
          this page are still current.
        </CardBody>
      )}
    </PlaceCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: SPACE.snug },
});

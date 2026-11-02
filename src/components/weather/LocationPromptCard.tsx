/**
 * The ONE location ask on the Weather tab (the web's `LocationPromptCard`).
 *
 * The page already shows the weather for the default city, so nothing waits
 * on this. It says the place is a stand-in ("Showing weather for Harare"),
 * why location is asked ("It is only used to find your place"), and offers
 * "Use my location". The system prompt only ever follows that tap, never the
 * first frame (issue #65). When location is off for the app, it says so and
 * offers the ways forward: Settings to turn it on, or Search (issue #66).
 * "×" puts it off for a week; a blocked permission brings it back each launch
 * because the page is still not the person's place.
 */

import { Pressable, StyleSheet, View } from "react-native";

import { NavigationIcon, SearchIcon } from "@/components/icons/Icon";
import { CloseIcon } from "@/components/shell/ShellIcons";
import { usePageColors } from "@/hooks/usePageColors";
import { BORDER, RADIUS, SIZE, SPACE, TOUCH } from "@/theme/mzizi";

import { PillButton } from "./PillButton";
import { WxText } from "./WxText";

export type LocationProblem = "denied" | "no-location";

/** Why the last attempt did not land, in words a person can act on. */
export const LOCATION_PROBLEM_COPY: Record<LocationProblem, string> = {
  denied:
    "Location is off for Mukoko. Turn it on in Settings, or search for your place.",
  "no-location":
    "We couldn't find where you are. Try again, or search for your place.",
};

export function LocationPromptCard({
  placeName,
  busy,
  problem,
  onUseLocation,
  onDismiss,
  onSearch,
  onOpenSettings,
}: {
  /** The place on screen, e.g. "Harare". */
  placeName: string;
  /** The permission ask or the fix is in flight. */
  busy: boolean;
  problem: LocationProblem | null;
  onUseLocation: () => void;
  onDismiss: () => void;
  /** Opens place search, the way forward when location is off. */
  onSearch: () => void;
  /** Opens the app's page in Settings, where location is turned on. */
  onOpenSettings: () => void;
}) {
  const { colors } = usePageColors();
  return (
    <View
      testID="location-prompt"
      accessibilityLabel="Use your location"
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.text}>
          <WxText type="body" weight={600} color={colors.textPrimary}>
            {`Showing weather for ${placeName}`}
          </WxText>
          {problem ? (
            <WxText
              type="body"
              color={colors.textSecondary}
              accessibilityRole="alert"
            >
              {LOCATION_PROBLEM_COPY[problem]}
            </WxText>
          ) : (
            <WxText type="body" color={colors.textSecondary}>
              Allow location to see the weather where you are. It is only used
              to find your place.
            </WxText>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          hitSlop={SPACE.tight}
          style={styles.close}
          testID="location-prompt-dismiss"
        >
          <CloseIcon size={SIZE.iconSm} color={colors.textTertiary} />
        </Pressable>
      </View>
      <View style={styles.actions}>
        {problem === "denied" ? (
          <PillButton label="Open Settings" onPress={onOpenSettings} />
        ) : (
          <PillButton
            label={busy ? "Locating…" : "Use my location"}
            onPress={onUseLocation}
            disabled={busy}
            hint={busy ? "Finding your place" : undefined}
            icon={(c) => <NavigationIcon size={SIZE.iconSm} color={c} />}
          />
        )}
        {problem ? (
          <PillButton
            label="Search"
            variant="outline"
            onPress={onSearch}
            icon={(c) => <SearchIcon size={SIZE.iconSm} color={c} />}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: BORDER.rest,
    padding: SPACE.card,
    gap: SPACE.stack,
  },
  top: { flexDirection: "row", gap: SPACE.snug },
  text: { flex: 1, minWidth: 0, gap: SPACE.hair },
  close: {
    minWidth: TOUCH.min,
    minHeight: TOUCH.min,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -SPACE.snug,
    marginRight: -SPACE.snug,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.snug },
});

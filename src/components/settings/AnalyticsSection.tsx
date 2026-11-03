/**
 * AnalyticsSection — the person's switch for measurement, on the My screen.
 *
 *   - "Share anonymous usage" on/off. Off drops what is queued on the phone,
 *     records nothing more and asks the API to forget the install id
 *     (src/analytics/queue.ts). Turning it back on starts a new id.
 *   - "Reset anonymous id": a new id; the queue is cleared and the old id
 *     forgotten.
 *
 * The switch must be on screen before the app ever uploads
 * (`EVENTS_UPLOAD_ENABLED` in src/analytics/index.ts).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import {
  getEventQueue,
  resetAnalyticsId,
  setAnalyticsOptOut,
} from "@/analytics";
import { RADIUS, SPACING, TOUCH_TARGET_MIN } from "@/brand/tokens";
import { BrandText } from "@/components/BrandText";
import { usePalette } from "@/hooks/usePalette";

export function AnalyticsSection() {
  const palette = usePalette();
  /** Null until the stored choice is read; "unavailable" if it cannot be. */
  const [sharing, setSharing] = useState<boolean | "unavailable" | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);

  /** What the queue holds now: never "off" for a choice it could not read. */
  const readChoice = useCallback(() => {
    const queue = getEventQueue();
    return queue.available() ? !queue.snapshot().optOut : "unavailable";
  }, []);

  useEffect(() => {
    mounted.current = true;
    void getEventQueue()
      .load()
      .then(() => {
        if (mounted.current) setSharing(readChoice());
      });
    return () => {
      mounted.current = false;
    };
  }, [readChoice]);

  const onToggle = useCallback(
    async (next: boolean) => {
      setBusy(true);
      setNotice(null);
      let failed = false;
      try {
        await setAnalyticsOptOut(!next);
      } catch {
        failed = true;
      }
      if (!mounted.current) return;
      if (failed) {
        setNotice(
          "Could not save that choice. Nothing is recorded meanwhile; please try again.",
        );
      }
      setSharing(readChoice());
      setBusy(false);
    },
    [readChoice],
  );

  const onReset = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    let message: string;
    try {
      await resetAnalyticsId();
      message = "Your anonymous id is new. Nothing links it to the old one.";
    } catch {
      message = "Could not reset the id. Please try again.";
    }
    if (!mounted.current) return;
    setNotice(message);
    setBusy(false);
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.label}>
          <BrandText variant="bodyBold" tone="text">
            Share anonymous usage
          </BrandText>
          <BrandText variant="caption" tone="textTertiary">
            Counts like "a forecast was shown" with your country and a ~40 km
            area. Never your name, searches or exact location.
          </BrandText>
        </View>
        <Switch
          value={sharing === true}
          disabled={typeof sharing !== "boolean" || busy}
          onValueChange={(next) => void onToggle(next)}
          accessibilityLabel="Share anonymous usage"
          trackColor={{ true: palette.primary, false: palette.surfaceDim }}
        />
      </View>
      {sharing === "unavailable" ? (
        <BrandText variant="caption" tone="textSecondary">
          Your choice cannot be read right now, so nothing is being recorded.
          Open this screen again in a moment.
        </BrandText>
      ) : null}
      {sharing === true ? (
        <Pressable
          onPress={() => void onReset()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Reset anonymous id"
          style={[styles.btn, { borderColor: palette.borderStrong }]}
        >
          <BrandText variant="bodyBold" tone="text">
            Reset anonymous id
          </BrandText>
        </Pressable>
      ) : null}
      {notice ? (
        <BrandText variant="caption" tone="textSecondary">
          {notice}
        </BrandText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: TOUCH_TARGET_MIN,
  },
  label: { flex: 1, gap: SPACING.xs },
  btn: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.button,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});

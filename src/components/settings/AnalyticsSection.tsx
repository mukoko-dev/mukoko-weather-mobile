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

import { useCallback, useEffect, useState } from "react";
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
  /** Null until the stored choice is read. */
  const [sharing, setSharing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const queue = getEventQueue();
    void queue.load().then(() => {
      if (active) setSharing(!queue.snapshot().optOut);
    });
    return () => {
      active = false;
    };
  }, []);

  const onToggle = useCallback(async (next: boolean) => {
    setBusy(true);
    setNotice(null);
    try {
      await setAnalyticsOptOut(!next);
    } catch {
      setNotice("Could not save that choice. Please try again.");
    } finally {
      setSharing(!getEventQueue().snapshot().optOut);
      setBusy(false);
    }
  }, []);

  const onReset = useCallback(async () => {
    setBusy(true);
    try {
      await resetAnalyticsId();
      setNotice("Your anonymous id is new. Nothing links it to the old one.");
    } catch {
      setNotice("Could not reset the id. Please try again.");
    } finally {
      setBusy(false);
    }
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
          value={sharing ?? false}
          disabled={sharing === null || busy}
          onValueChange={(next) => void onToggle(next)}
          accessibilityLabel="Share anonymous usage"
          trackColor={{ true: palette.primary, false: palette.surfaceDim }}
        />
      </View>
      {sharing ? (
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

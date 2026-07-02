/**
 * My Weather tab — the mobile equivalent of the web "My Weather" modal.
 *
 * Sections:
 *   - Account: sign-in status (SecureStore session) + sign in / out.
 *   - Saved locations: pin up to 10 places, jump to a forecast, add by search
 *     or from GPS ("Use my current location").
 *   - Theme: light / dark / system.
 *   - Activities: mineral-coloured interest chips.
 *   - Device: install id + app version (support / debugging).
 *
 * Preferences persist locally via src/state/preferences.ts (expo-secure-store).
 */

import { router, useFocusEffect } from "expo-router";
import * as Application from "expo-application";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSession, signOut, type Session } from "@/api/auth";
import { RADIUS, SPACING, TOUCH_TARGET_MIN } from "@/brand/tokens";
import { BaobabCard } from "@/components/BaobabCard";
import { BrandText } from "@/components/BrandText";
import { Header } from "@/components/Header";
import { ActivitySelector } from "@/components/settings/ActivitySelector";
import { SavedLocationsSection } from "@/components/settings/SavedLocationsSection";
import { SectionCard } from "@/components/settings/SectionCard";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { getOrCreateDeviceId } from "@/device/identity";
import { usePalette } from "@/hooks/usePalette";
import { MAX_SAVED_LOCATIONS, usePreferences } from "@/state/preferences";

export default function MyScreen() {
  const palette = usePalette();
  const { savedLocations } = usePreferences();
  const [session, setSession] = useState<Session | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [s, id] = await Promise.all([
          getSession(),
          getOrCreateDeviceId(),
        ]);
        if (!active) return;
        setSession(s);
        setDeviceId(id);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const onSignIn = useCallback(() => router.push("/sign-in"), []);
  const onSignOut = useCallback(async () => {
    await signOut();
    setSession(null);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={["top"]}
    >
      <Header title="My Weather" subtitle="Locations & preferences" />
      <ScrollView contentContainerStyle={styles.body}>
        <BaobabCard>
          <BrandText
            variant="smallBold"
            tone="textSecondary"
            style={styles.cardLabel}
          >
            ACCOUNT
          </BrandText>
          {session ? (
            <>
              <BrandText variant="bodyBold" tone="text">
                {session.email ?? "Signed in"}
              </BrandText>
              <Pressable
                onPress={onSignOut}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                style={[styles.btn, { borderColor: palette.borderStrong }]}
              >
                <BrandText variant="bodyBold" tone="text">
                  Sign out
                </BrandText>
              </Pressable>
            </>
          ) : (
            <>
              <BrandText variant="body" tone="textSecondary">
                Sign in to sync saved locations and preferences across your
                devices.
              </BrandText>
              <Pressable
                onPress={onSignIn}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Mukoko"
                style={[
                  styles.btnPrimary,
                  { backgroundColor: palette.primary },
                ]}
              >
                <BrandText
                  variant="bodyBold"
                  tone="text"
                  style={{ color: palette.onPrimary }}
                >
                  Sign in with Mukoko
                </BrandText>
              </Pressable>
            </>
          )}
        </BaobabCard>

        <SectionCard
          title="Saved locations"
          trailing={
            <BrandText variant="caption" tone="textTertiary">
              {savedLocations.length}/{MAX_SAVED_LOCATIONS}
            </BrandText>
          }
        >
          <SavedLocationsSection />
        </SectionCard>

        <SectionCard title="Theme" hint="How Mukoko looks on this device.">
          <ThemeSelector />
        </SectionCard>

        <SectionCard
          title="Activities"
          hint="Pick what you follow the weather for — we tune advice to match."
        >
          <ActivitySelector />
        </SectionCard>

        <BaobabCard>
          <BrandText
            variant="smallBold"
            tone="textSecondary"
            style={styles.cardLabel}
          >
            DEVICE
          </BrandText>
          <BrandText variant="mono" tone="text" selectable>
            {deviceId ?? "—"}
          </BrandText>
          <BrandText variant="caption" tone="textTertiary">
            v{Application.nativeApplicationVersion ?? "0.0.0"} · build{" "}
            {Application.nativeBuildVersion ?? "—"}
          </BrandText>
        </BaobabCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  cardLabel: {
    letterSpacing: 0.6,
  },
  btnPrimary: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.button,
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  btn: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.button,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: SPACING.xs,
  },
});

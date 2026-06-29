/**
 * My Weather tab — sign-in status, saved locations, settings.
 *
 * For the bootstrap we expose:
 *   - sign-in state (driven by SecureStore session)
 *   - device id (for support / debugging)
 *   - app version
 *
 * Saved locations + preferences sync arrive once the platform `device.devices`
 * endpoint is live.
 */

import { router, useFocusEffect } from 'expo-router';
import * as Application from 'expo-application';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSession, signOut, type Session } from '@/api/auth';
import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { Header } from '@/components/Header';
import { getOrCreateDeviceId } from '@/device/identity';
import { usePalette } from '@/hooks/usePalette';

export default function MyScreen() {
  const palette = usePalette();
  const [session, setSession] = useState<Session | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [s, id] = await Promise.all([getSession(), getOrCreateDeviceId()]);
        if (!active) return;
        setSession(s);
        setDeviceId(id);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const onSignIn = useCallback(() => router.push('/sign-in'), []);
  const onSignOut = useCallback(async () => {
    await signOut();
    setSession(null);
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Header title="My Weather" subtitle="Account & device" />
      <View style={styles.body}>
        <Card>
          <BrandText variant="small" tone="textSecondary">
            Account
          </BrandText>
          {session ? (
            <>
              <BrandText variant="bodyBold" tone="text">
                {session.email ?? 'Signed in'}
              </BrandText>
              <Pressable
                onPress={onSignOut}
                style={[styles.btn, { borderColor: palette.borderStrong }]}>
                <BrandText variant="bodyBold" tone="text">
                  Sign out
                </BrandText>
              </Pressable>
            </>
          ) : (
            <>
              <BrandText variant="body" tone="textSecondary">
                Sign in to sync saved locations and preferences across your devices.
              </BrandText>
              <Pressable
                onPress={onSignIn}
                style={[styles.btnPrimary, { backgroundColor: palette.primary }]}>
                <BrandText variant="bodyBold" tone="textInverse">
                  Sign in with Mukoko
                </BrandText>
              </Pressable>
            </>
          )}
        </Card>

        <Card>
          <BrandText variant="small" tone="textSecondary">
            Device
          </BrandText>
          <BrandText variant="mono" tone="text" selectable>
            {deviceId ?? '—'}
          </BrandText>
          <BrandText variant="caption" tone="textTertiary">
            v{Application.nativeApplicationVersion ?? '0.0.0'} · build{' '}
            {Application.nativeBuildVersion ?? '—'}
          </BrandText>
        </Card>
      </View>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const palette = usePalette();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  btnPrimary: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  btn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: SPACING.sm,
  },
});

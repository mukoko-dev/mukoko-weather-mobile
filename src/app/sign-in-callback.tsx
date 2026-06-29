/**
 * Sign-in callback. Receives `?code=...` from the WorkOS redirect, exchanges
 * it for a session via `completeSignIn`, then bounces back to the My tab.
 *
 * In practice expo-web-browser's openAuthSessionAsync resolves directly with
 * the URL, so most users never see this screen — it exists as a safety net
 * for any redirect that escapes the in-app browser (e.g. universal links
 * during cold launch).
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { completeSignIn } from '@/api/auth';
import { SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';

export default function SignInCallback() {
  const palette = usePalette();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    const code = typeof params.code === 'string' ? params.code : null;
    if (!code) {
      router.replace('/sign-in');
      return;
    }
    void (async () => {
      try {
        await completeSignIn(code);
        router.replace('/(tabs)/my');
      } catch {
        router.replace('/sign-in');
      }
    })();
  }, [params.code]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.body}>
        <ActivityIndicator color={palette.primary} />
        <BrandText variant="body" tone="textSecondary">
          Finishing sign-in...
        </BrandText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
});

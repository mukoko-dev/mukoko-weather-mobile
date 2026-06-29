/**
 * Sign-in launcher. Kicks off the WorkOS AuthKit hosted page via
 * expo-web-browser. The redirect lands on /sign-in-callback which finishes
 * the code exchange.
 */

import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { completeSignIn, startSignIn } from '@/api/auth';
import { RADIUS, SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';

export default function SignInScreen() {
  const palette = usePalette();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPress = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await startSignIn();
    if (result.type === 'cancel') {
      setBusy(false);
      return;
    }
    if (result.type === 'error') {
      setError(result.message);
      setBusy(false);
      return;
    }
    try {
      await completeSignIn(result.code);
      router.replace('/(tabs)/my');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.body}>
        <BrandText variant="title" tone="text">
          Sign in to Mukoko
        </BrandText>
        <BrandText variant="body" tone="textSecondary">
          We use Mukoko Sign-In (powered by WorkOS) so your saved locations
          sync across the web app and your phone.
        </BrandText>

        {error ? (
          <BrandText variant="small" tone="terracotta">
            {error}
          </BrandText>
        ) : null}

        <Pressable
          onPress={onPress}
          disabled={busy}
          style={[
            styles.btn,
            { backgroundColor: busy ? palette.surfaceDim : palette.primary },
          ]}>
          {busy ? (
            <ActivityIndicator color={palette.textInverse} />
          ) : (
            <BrandText variant="bodyBold" tone="textInverse">
              Continue
            </BrandText>
          )}
        </Pressable>

        <BrandText variant="caption" tone="textTertiary">
          By continuing you agree to the Mukoko Terms and Privacy Policy.
        </BrandText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
    justifyContent: 'center',
  },
  btn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
});

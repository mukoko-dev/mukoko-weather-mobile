/**
 * Shamwari tab — placeholder for the AI weather assistant.
 *
 * The web app exposes /api/py/chat with tool-use over Claude. The mobile
 * client will wire this up in a follow-up phase once we settle on a streaming
 * UX (SSE through expo-fetch streams vs polling).
 */

import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { Header } from '@/components/Header';
import { usePalette } from '@/hooks/usePalette';

export default function ShamwariScreen() {
  const palette = usePalette();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Header title="Shamwari" subtitle="Your weather friend" />
      <View style={styles.center}>
        <BrandText variant="display" tone="sodalite">
          ✨
        </BrandText>
        <BrandText variant="title" tone="text">
          Coming soon
        </BrandText>
        <BrandText variant="body" tone="textSecondary" style={styles.copy}>
          Shamwari is your in-app weather assistant. Ask about the forecast,
          farming windows, frost risk, or what to wear. We&apos;re wiring it
          up in the next release.
        </BrandText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  copy: { textAlign: 'center', maxWidth: 320 },
});

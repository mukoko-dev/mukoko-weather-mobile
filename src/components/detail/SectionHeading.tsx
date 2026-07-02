/**
 * Consistent section heading for the location detail screen. Keeps the
 * subtitle-weight label + top spacing identical across Hourly / Atmospheric /
 * 7-day sections so the page reads as one rhythm.
 */

import { StyleSheet } from 'react-native';

import { SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';

export function SectionHeading({ children }: { children: string }) {
  return (
    <BrandText variant="subtitle" tone="text" style={styles.heading} accessibilityRole="header">
      {children}
    </BrandText>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
});

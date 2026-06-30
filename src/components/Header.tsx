/**
 * Brand header — Seed of Life mark + "mukoko" wordmark with optional
 * subtitle and trailing action. The 7-mineral BrandStripe runs flush
 * along the bottom edge, mirroring the web Header layout.
 *
 * Bottom tabs (not top nav) live in `src/app/(tabs)/_layout.tsx` — this
 * component only renders the brand row.
 */

import { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { SPACING } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { MukokoLogo } from '@/components/MukokoLogo';
import { usePalette } from '@/hooks/usePalette';

// Note: the 7-mineral BrandStripe is a fixed VERTICAL left-edge accent
// mounted once in src/app/_layout.tsx — it does not belong inside the Header.

export type HeaderProps = ViewProps & {
  /**
   * Optional page label rendered below the mukoko wordmark in subtitle
   * weight. Use this for the current page name (e.g. "Explore", "Shamwari").
   * The wordmark itself is always "mukoko" per brand doctrine.
   */
  title?: string;
  /** Tertiary subtitle — typically a status line (location, count, etc.). */
  subtitle?: string;
  /** Optional right-side action node (icon button, etc.). */
  trailing?: ReactNode;
  /** Hide the wordmark text (mark only). Default false. */
  markOnly?: boolean;
};

export function Header({
  title,
  subtitle,
  trailing,
  markOnly = false,
  style,
  ...rest
}: HeaderProps) {
  const palette = usePalette();
  return (
    <View
      {...rest}
      style={[
        styles.container,
        { backgroundColor: palette.background, borderBottomColor: palette.border },
        style,
      ]}>
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <MukokoLogo size={32} showWordmark={!markOnly} />
          {title ? (
            <BrandText variant="bodyBold" tone="text" style={styles.pageLabel}>
              {title}
            </BrandText>
          ) : null}
          {subtitle ? (
            <BrandText variant="small" tone="textSecondary" style={styles.subtitle}>
              {subtitle}
            </BrandText>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  titleBlock: {
    flexShrink: 1,
  },
  pageLabel: {
    marginTop: 2,
    marginLeft: 40, // align with wordmark (mark 32 + gap 8)
  },
  subtitle: {
    marginLeft: 40, // align with wordmark
  },
  trailing: {
    flexShrink: 0,
  },
});

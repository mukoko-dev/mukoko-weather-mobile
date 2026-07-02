/**
 * LocationCard — a tappable result row used by both Explore search results and
 * category / country browse. Navigates to `/location/[slug]` on press. Tag
 * badges are tinted with their mineral tone. Minimum 56px touch target.
 */

import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RADIUS, SPACING, TOUCH_TARGET_MIN } from '@/brand/tokens';
import { BrandText } from '@/components/BrandText';
import { usePalette } from '@/hooks/usePalette';

import { getCategoryMeta } from './categories';

/** Minimal shape shared by `LocationSummary` (search) + `WeatherLocation` (browse). */
export type LocationCardData = {
  slug: string;
  name: string;
  province?: string;
  country?: string;
  tags?: string[];
};

const MAX_TAGS = 3;

export const LocationCard = memo(function LocationCard({
  location,
}: {
  location: LocationCardData;
}) {
  const palette = usePalette();
  const subtitle = [location.province, location.country].filter(Boolean).join(' · ');
  const tags = (location.tags ?? []).slice(0, MAX_TAGS);

  return (
    <Pressable
      onPress={() => router.push(`/location/${location.slug}`)}
      accessibilityRole="link"
      accessibilityLabel={`Open weather for ${location.name}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.body}>
        <BrandText variant="bodyBold" tone="text" numberOfLines={1}>
          {location.name}
        </BrandText>
        {subtitle ? (
          <BrandText variant="small" tone="textSecondary" numberOfLines={1}>
            {subtitle}
          </BrandText>
        ) : null}
        {tags.length ? (
          <View style={styles.tagRow}>
            {tags.map((tag) => {
              const meta = getCategoryMeta(tag);
              return (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: palette[meta.tone] + '1F' }]}>
                  <BrandText variant="caption" tone={meta.tone}>
                    {meta.label}
                  </BrandText>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
      <BrandText variant="title" tone="primary">
        {'›'}
      </BrandText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: TOUCH_TARGET_MIN,
  },
  body: {
    flexShrink: 1,
    gap: SPACING.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
});

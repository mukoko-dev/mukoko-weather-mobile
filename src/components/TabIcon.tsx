/**
 * Tab bar icon — a single glyph rendered in the active/inactive tint.
 *
 * We don't ship @expo/vector-icons in this app yet, so tab icons are
 * Unicode glyphs in the brand body font. When a richer icon set is
 * added (e.g. lucide-react-native), only this component needs to change.
 */

import { StyleSheet, Text, View, type ColorValue } from 'react-native';

import { FONT_FAMILY } from '@/brand/tokens';

export type TabIconName = 'weather' | 'explore' | 'shamwari' | 'my';

const GLYPHS: Record<TabIconName, string> = {
  weather: '☀',     // ☀ sun — for the home/weather tab
  explore: '◉',     // ◉ fisheye / compass dial
  shamwari: '✨',    // ✨ sparkles — Shamwari AI surface
  my: '☸',          // ☸ wheel — settings / my locations
};

export type TabIconProps = {
  name: TabIconName;
  /** Accepts any RN ColorValue — react-navigation passes ColorValue, our palette returns string. */
  color: ColorValue;
  size?: number;
  focused?: boolean;
};

export function TabIcon({ name, color, size = 22, focused = false }: TabIconProps) {
  return (
    <View style={styles.wrap}>
      {/*
        No `accessibilityElementsHidden` here — the bottom tab's label
        ("Weather", "Explore", …) is the accessible name; the glyph is
        decorative. Keeping it visible to the test renderer means the icon
        also shows up in component snapshots, which is what we want.
      */}
      <Text
        style={[
          styles.glyph,
          {
            color,
            fontSize: size,
            lineHeight: size + 2,
            opacity: focused ? 1 : 0.85,
          },
        ]}>
        {GLYPHS[name]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: FONT_FAMILY.body,
    textAlign: 'center',
  },
});

/**
 * Bottom tab navigator — Weather, Explore, Shamwari, My.
 *
 * Uses expo-router's standard `<Tabs>` (powered by @react-navigation/bottom-tabs)
 * rather than `NativeTabs`, because:
 *   - it renders a real bottom tab bar on web (NativeTabs is iOS/Android only),
 *   - we control active/inactive tint exactly (cobalt active, text-tertiary
 *     inactive), matching the web Header's mobile bottom nav.
 *
 * Active tab pill uses cobalt (`palette.primary`). Tab bar background uses
 * `palette.surface` with a hairline top border in `palette.border`.
 */

import { Tabs } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

import { FONT_FAMILY } from '@/brand/tokens';
import { TabIcon } from '@/components/TabIcon';
import { paletteFor } from '@/theme/colors';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const palette = paletteFor(scheme === 'dark' ? 'dark' : 'light');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          // Slightly taller on web so it reads as a real nav bar, not a strip.
          height: Platform.OS === 'web' ? 64 : undefined,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'web' ? 8 : undefined,
        },
        tabBarLabelStyle: {
          fontFamily: FONT_FAMILY.bodyBold,
          fontSize: 11,
          letterSpacing: 0.1,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Weather',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="weather" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="explore" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shamwari"
        options={{
          title: 'Shamwari',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="shamwari" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: 'My',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="my" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

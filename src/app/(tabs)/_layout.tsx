/**
 * Bottom tab navigator — Weather, Explore, Shamwari, My.
 *
 * Uses expo-router's NativeTabs (UITabBarController on iOS, BottomNavigationView
 * on Android) so we get platform-correct gestures, haptics, and large-title
 * collapse. Tab icons are simple PNG glyphs in assets/images/tabIcons.
 */

import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { paletteFor } from '@/theme/colors';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const palette = paletteFor(scheme === 'dark' ? 'dark' : 'light');

  return (
    <NativeTabs
      backgroundColor={palette.surface}
      indicatorColor={palette.surfaceDim}
      labelStyle={{ selected: { color: palette.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Weather</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shamwari">
        <NativeTabs.Trigger.Label>Shamwari</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="my">
        <NativeTabs.Trigger.Label>My</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

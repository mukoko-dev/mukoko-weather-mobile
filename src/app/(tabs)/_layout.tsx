/**
 * The home group: My Location (index), Locations, Explore, My and the paused
 * Shamwari. A tab navigator keeps each screen mounted, so going to Explore and
 * back leaves the home forecast where it was, but its own tab bar is NOT
 * drawn: the one bottom bar is the web's floating Map / places / Locations
 * bar, mounted once by AppChrome over every weather page.
 *
 * (The old four-tab bar collapsed to a sliver on iOS: its style set
 * `height` and `paddingBottom` to `undefined`, which overrides the
 * navigator's own height and safe-area padding. See #56.)
 *
 * The lists (Locations, Explore, My) leave the bar's clearance at the bottom;
 * the weather page leaves it itself (WeatherScroll), so its sky runs to the
 * edge behind the floating bar.
 */

import { Tabs } from "expo-router";

import { useShell } from "@/components/shell/ShellContext";
import { usePageColors } from "@/hooks/usePageColors";
import { isFeatureEnabled } from "@/shared/feature-flags";

export default function TabsLayout() {
  const { clearance } = useShell();
  const { colors } = usePageColors();
  const listScene = {
    paddingBottom: clearance,
    backgroundColor: colors.background,
  };

  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "My Location" }} />
      <Tabs.Screen
        name="locations"
        options={{ title: "Locations", sceneStyle: listScene }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore", sceneStyle: listScene }}
      />
      <Tabs.Screen
        name="my"
        options={{ title: "My Weather", sceneStyle: listScene }}
      />
      <Tabs.Screen
        name="shamwari"
        options={{
          title: "Shamwari",
          href: isFeatureEnabled("shamwari_chat") ? undefined : null,
        }}
      />
    </Tabs>
  );
}

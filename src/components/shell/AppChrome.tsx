/**
 * The app shell, mounted once in the root layout so it survives navigation
 * (the web's `AppChrome`): the floating bottom bar over every weather page
 * and the shell's own lists, and the swipe between places.
 *
 * It owns the pager: the sequence comes from the saved places through the
 * ported web logic (src/shared/location-pager.ts), its page keys are mapped
 * to app routes by src/shell/routes.ts, and a tap on a chip and a swipe walk
 * the same pages. Screens learn the bar's clearance and the swipe handlers
 * from `useShell()`.
 */

import { router, usePathname } from "expo-router";
import { type ReactNode, useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  laneActiveIndex,
  laneChipName,
  laneChips,
  pagerSequence,
  type LaneChip,
} from "@/shared/location-pager";
import { applyMove, pageMove } from "@/shell/navigate";
import {
  LOCATIONS_ROUTE,
  barActiveId,
  mapRoute,
  pageForPathname,
  showsBottomBar,
} from "@/shell/routes";
import { usePreferences } from "@/state/preferences";
import { barClearance } from "@/theme/shell";

import { BottomBar } from "./BottomBar";
import { ShellContext } from "./ShellContext";
import { useLocationSwipe } from "./useLocationSwipe";

/** The place slug on screen (`/location/harare/...` → `harare`), or null. */
export function placeSlugOf(pathname: string): string | null {
  const page = pageForPathname(pathname);
  return pathname.startsWith("/location/") ? page.slice(1) : null;
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const insets = useSafeAreaInsets();
  const { savedLocations } = usePreferences();
  const visible = showsBottomBar(pathname);

  const names = useMemo(
    () => Object.fromEntries(savedLocations.map((l) => [l.slug, l.name])),
    [savedLocations],
  );
  const sequence = useMemo(
    () => pagerSequence(savedLocations.map((l) => l.slug)),
    [savedLocations],
  );
  const chips = useMemo(
    () => laneChips(sequence, (slug) => laneChipName(slug, {}, names)),
    [sequence, names],
  );
  const activeIndex = laneActiveIndex(
    pageForPathname(pathname),
    sequence,
    chips.length,
  );

  const goTo = useCallback(
    (page: string) => applyMove(router, pageMove(pathname, page)),
    [pathname],
  );
  const swipeHandlers = useLocationSwipe(pathname, sequence, goTo, visible);

  const onChipPress = useCallback((chip: LaneChip) => goTo(chip.href), [goTo]);
  const slug = placeSlugOf(pathname);
  const onMap = useCallback(() => router.push(mapRoute(slug) as never), [slug]);
  const onLocations = useCallback(
    () =>
      slug
        ? router.dismissTo(LOCATIONS_ROUTE as never)
        : router.navigate(LOCATIONS_ROUTE as never),
    [slug],
  );

  const value = useMemo(
    () => ({
      clearance: visible ? barClearance(insets.bottom) : 0,
      swipeHandlers,
    }),
    [visible, insets.bottom, swipeHandlers],
  );

  return (
    <ShellContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {visible ? (
          <BottomBar
            chips={chips}
            activeIndex={activeIndex}
            activeId={barActiveId(pathname)}
            hasMapLocation={slug !== null || pathname === "/"}
            onChipPress={onChipPress}
            onMap={onMap}
            onLocations={onLocations}
          />
        ) : null}
      </View>
    </ShellContext.Provider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

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
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
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

/** Routes that open over a page (sheet, modal): the page under them stays the base. */
const OVERLAY_ROUTES: ReadonlySet<string> = new Set([
  "/menu",
  "/map",
  "/sign-in",
  "/sign-in-callback",
]);

export function isOverlayRoute(pathname: string): boolean {
  return OVERLAY_ROUTES.has(pathname);
}

export function AppChrome({ children }: { children: ReactNode }) {
  const route = usePathname() ?? "/";
  // The page under a sheet or modal: opening the ⋯ menu must not hide the bar
  // or re-lay out the page still visible above the sheet. Derived state,
  // updated during render (React's pattern for "remember the last value").
  const [pathname, setPathname] = useState(route);
  if (!isOverlayRoute(route) && route !== pathname) setPathname(route);
  const insets = useSafeAreaInsets();
  const { savedLocations } = usePreferences();
  // On iOS sheets and modals are native and cover the bar; elsewhere they
  // render in the same stack, under an absolute bar, so hide it there.
  const visible =
    showsBottomBar(pathname) &&
    (Platform.OS === "ios" || !isOverlayRoute(route));
  const noSwipe = useRef(false);
  const markNoSwipe = useCallback(() => {
    noSwipe.current = true;
  }, []);

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
  const swipe = useLocationSwipe(pathname, sequence, goTo, visible);

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
      swipe,
      basePath: pathname,
      inShell: true,
      noSwipe,
      markNoSwipe,
    }),
    [visible, insets.bottom, swipe, pathname, markNoSwipe],
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
            hasMapLocation={slug !== null}
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

/**
 * The bridge between the web's page keys and this app's routes.
 *
 * The pager (src/shared/location-pager.ts, ported from the web unchanged) keys
 * pages as the web's URLs: `/` for My Location and `/{slug}` for a place. In
 * the app a place lives at `/location/{slug}` (and its sub-pages under it).
 * These two functions convert, so the pager logic is never forked.
 *
 * Also here: where the shell's bottom bar is drawn, and the routes the shell
 * opens. Pure, so every rule is unit-tested.
 */

import { MY_LOCATION_HREF } from "@/shared/location-pager";

/** The app route for a pager page key (`/harare` → `/location/harare`). */
export function routeForPage(page: string): string {
  if (page === MY_LOCATION_HREF) return "/";
  return `/location/${page.replace(/^\//, "")}`;
}

/**
 * The pager page key for an app pathname: `/` is My Location,
 * `/location/harare` (and `/location/harare/forecast`) is `/harare`. Any other
 * route returns its own path, which `pagerIndex` then reports as not a page.
 */
export function pageForPathname(pathname: string | null | undefined): string {
  const segments = (pathname ?? "").split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return MY_LOCATION_HREF;
  if (segments[0] === "location" && segments[1]) {
    return `/${decodeURIComponent(segments[1])}`;
  }
  return `/${segments.join("/")}`;
}

/** Routes that show the bottom bar: the weather pages and the shell's own lists. */
export function showsBottomBar(pathname: string | null | undefined): boolean {
  const segments = (pathname ?? "").split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return true;
  if (segments.length === 1) {
    return ["locations", "explore", "my"].includes(segments[0]);
  }
  // A place's own page, not its sub-pages (they carry their own top row).
  return segments[0] === "location" && segments.length === 2;
}

/** Which pinned bar item is the current page ("none" when it is the lane's). */
export function barActiveId(
  pathname: string | null | undefined,
): "locations" | "map" | "none" {
  if (pathname === "/locations") return "locations";
  if (pathname === "/map") return "map";
  return "none";
}

/** The map placeholder for the place on screen (#55). */
export function mapRoute(slug: string | null): string {
  return slug ? `/map?slug=${encodeURIComponent(slug)}` : "/map";
}

export const LOCATIONS_ROUTE = "/locations";
export const MENU_ROUTE = "/menu";

/**
 * How the shell moves between pager pages, as data, so the rule is tested
 * without a navigator.
 *
 * - To My Location (`/`) from a place page: pop back to the home screen
 *   (`dismissTo`), so paging never piles up a stack of places.
 * - To a place from a place: `replace`, a sideways move like Apple Weather's.
 * - To a place from anywhere else (home, Locations, Explore): `push`.
 * - To the page already on screen: nothing.
 */

import { MY_LOCATION_HREF } from "@/shared/location-pager";

import { pageForPathname, routeForPage } from "./routes";

export type PageMove =
  | { kind: "none" }
  | { kind: "navigate" | "dismissTo" | "push" | "replace"; route: string };

function isPlacePath(pathname: string): boolean {
  return /^\/location\/[^/]+/.test(pathname);
}

export function pageMove(fromPathname: string, toPage: string): PageMove {
  const route = routeForPage(toPage);
  if (pageForPathname(fromPathname) === toPage && fromPathname === route) {
    return { kind: "none" };
  }
  const fromPlace = isPlacePath(fromPathname);
  if (toPage === MY_LOCATION_HREF) {
    return { kind: fromPlace ? "dismissTo" : "navigate", route };
  }
  return { kind: fromPlace ? "replace" : "push", route };
}

/** The router calls a move needs (expo-router's `router`, or a test double). */
export type MoveRouter = {
  navigate: (href: never) => void;
  push: (href: never) => void;
  replace: (href: never) => void;
  dismissTo: (href: never) => void;
};

export function applyMove(router: MoveRouter, move: PageMove): void {
  if (move.kind === "none") return;
  router[move.kind](move.route as never);
}

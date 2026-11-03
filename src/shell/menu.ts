/**
 * The ⋯ menu's rows, as data (the web's `PhoneMenu` + `header-nav.ts`):
 * My Location, the weather map, then the destinations the app has.
 * History and Aviation have no mobile screens yet, so they are left out
 * rather than shown as dead links; Shamwari only while its flag is on.
 */

import { type FeatureFlag } from "@/shared/feature-flags";

export type MenuIcon =
  | "location"
  | "map"
  | "list"
  | "compass"
  | "settings"
  | "chat";

export type MenuRow = {
  id: string;
  label: string;
  description: string;
  route: string;
  icon: MenuIcon;
  flag?: FeatureFlag;
};

export const MENU_ROWS: readonly MenuRow[] = [
  {
    id: "my-location",
    label: "My Location",
    description: "Weather where you are right now",
    route: "/",
    icon: "location",
  },
  {
    id: "map",
    label: "Weather map",
    description: "Rain, wind and cloud on a map",
    route: "/map",
    icon: "map",
  },
  {
    id: "locations",
    label: "Saved locations",
    description: "The places you follow",
    route: "/locations",
    icon: "list",
  },
  {
    id: "explore",
    label: "Explore",
    description: "Browse places by category and country",
    route: "/explore",
    icon: "compass",
  },
  {
    id: "shamwari",
    label: "Shamwari",
    description: "Ask Shamwari about the weather",
    route: "/shamwari",
    icon: "chat",
    flag: "shamwari_chat",
  },
  {
    id: "my-weather",
    label: "My Weather",
    description: "Sign in, theme, activities and saved places",
    route: "/my",
    icon: "settings",
  },
];

/** The rows visible now (flagged rows only while their flag is on). */
export function visibleMenuRows(
  isEnabled: (flag: FeatureFlag) => boolean,
): MenuRow[] {
  return MENU_ROWS.filter((row) => !row.flag || isEnabled(row.flag));
}

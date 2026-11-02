/**
 * Slug helpers the location pager needs, ported from mukoko-weather
 * `src/lib/current-slug.ts` (`isLocationSlug`, `displayNameFromSlug`) and
 * `src/lib/utils.ts` (`slugToDisplayName`) with the same logic.
 *
 * The one difference: `NON_LOCATION_ROUTES` names the APP's routes (a slug
 * can never be "explore", "locations", "my", …), not the website's.
 */

import { countryName } from "./countries";

/** `LOCATION_SLUG_RE` from the web's `src/lib/location-gate.ts`. */
export const LOCATION_SLUG_RE = /^[a-z0-9-]{1,80}$/;

/** Route names in this app that are never a place. */
export const NON_LOCATION_ROUTES: ReadonlySet<string> = new Set([
  "explore",
  "locations",
  "shamwari",
  "history",
  "aviation",
  "my",
  "menu",
  "map",
  "location",
  "sign-in",
  "sign-in-callback",
]);

/** True when `value` is a syntactically valid location slug that is not a route. */
export function isLocationSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    LOCATION_SLUG_RE.test(value) &&
    !NON_LOCATION_ROUTES.has(value)
  );
}

/** Title-case a slug; a trailing two-letter part is a country code. */
export function slugToDisplayName(slug: string): string {
  const parts = slug.split("-");
  // Strip trailing numeric-only segments (slug collision suffixes)
  while (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts
    .map((part, i) => {
      if (i === parts.length - 1 && part.length === 2) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

/** Trailing 6-hex platform hash (`harare-a1b2c3` → `harare`). */
const PLATFORM_HASH_RE = /-[0-9a-f]{6}$/;

/** True for a two-letter segment that is a real ISO 3166-1 region code. */
function isRegionCode(part: string): boolean {
  // The static table: Hermes has no Intl.DisplayNames (issue #72).
  return /^[a-z]{2}$/.test(part) && countryName(part) !== undefined;
}

/**
 * The name part of a slug: the text before a smart-slug `--`, minus a
 * platform hash and minus a trailing ISO country suffix.
 */
export function nameSegmentOf(slug: string): string {
  const namePart = slug.includes("--") ? slug.split("--")[0] : slug;
  const stripped = namePart.replace(PLATFORM_HASH_RE, "") || namePart;
  const parts = stripped.split("-");
  if (parts.length > 1 && isRegionCode(parts[parts.length - 1])) {
    return parts.slice(0, -1).join("-");
  }
  return stripped;
}

/** Human-readable name for a slug when no real name is known yet. */
export function displayNameFromSlug(slug: string): string {
  return slugToDisplayName(nameSegmentOf(slug));
}

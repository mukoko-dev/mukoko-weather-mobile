/**
 * The season line: what the web's `SeasonBadge` says under the Conditions
 * card and what the "About {place}" card's Season row says.
 *
 * The web reads a country calendar from its database and falls back to
 * `getDefaultSeason(date, lat)`. The app has no database: the same calendar
 * comes from the Worker's place profile (`current.season`, the compiled-in
 * country calendars, local names included), and the hemisphere default is the
 * fallback while the profile loads or when it fails. Both read the PLACE's
 * month, never the phone's clock.
 *
 * A season that is not a verified local calendar (a derived one, or the
 * hemisphere default) is `estimated`, and the screens say so.
 */

import type { PlaceProfile } from "./place-knowledge";
import { type Season, getDefaultSeason } from "./weather";

export interface SeasonLine {
  /** The local name when it differs from the name, else the name. */
  title: string;
  /** The rest of the line, "Name — description" or just the description. */
  detail: string;
}

/**
 * The line as the web's `SeasonBadge` writes it: the local name leads, and the
 * English name and the description follow; with no distinct local name the
 * description alone follows the name.
 */
export function seasonLine(season: Season): SeasonLine {
  const showLocalName = Boolean(
    season.localName && season.localName !== season.name,
  );
  return {
    title: showLocalName ? season.localName : season.name,
    detail: showLocalName
      ? `${season.name} — ${season.description}`
      : season.description,
  };
}

/** The hemisphere default for a 1-based month at a latitude. */
export function defaultSeasonAt(month: number, lat: number): Season {
  const m = Math.min(12, Math.max(1, Math.round(month)));
  // 15th of the month, built in local time, so the month is read back as m.
  return getDefaultSeason(new Date(2001, m - 1, 15), lat);
}

export interface ResolvedSeason {
  season: Season;
  /** True when the season is derived or the hemisphere default, not a verified calendar. */
  estimated: boolean;
}

/** The season the profile reports now, or null when it has none. */
export function seasonFromProfile(
  profile: PlaceProfile | null | undefined,
): ResolvedSeason | null {
  const now = profile?.current?.season;
  if (!now) return null;
  return {
    season: {
      name: now.name,
      localName: now.localName ?? now.name,
      description: now.description ?? "",
    },
    estimated: !now.verified,
  };
}

/** The profile's season when there is one, else the hemisphere default. */
export function resolveSeason(
  profile: PlaceProfile | null | undefined,
  month: number,
  lat: number,
): ResolvedSeason {
  return (
    seasonFromProfile(profile) ?? {
      season: defaultSeasonAt(month, lat),
      estimated: true,
    }
  );
}

/** The Season row of the About card: "Masika (Main rains)", with the hedge. */
export function seasonRowValue({ season, estimated }: ResolvedSeason): string {
  const base =
    season.localName && season.localName !== season.name
      ? `${season.localName} (${season.name})`
      : season.name;
  return estimated ? `${base}, estimated` : base;
}

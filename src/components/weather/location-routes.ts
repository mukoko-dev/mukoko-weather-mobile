/**
 * The routes under a place: its page, and the two detail pages the web has at
 * `/[location]/forecast` and `/[location]/atmosphere`. One place builds the
 * href, so a link and a test cannot name different screens.
 */

export type LocationSubRoute = "forecast" | "atmosphere";

export const SUB_ROUTE_PATH = {
  forecast: "/location/[slug]/forecast",
  atmosphere: "/location/[slug]/atmosphere",
} as const;

/** The href of a place's detail page. */
export function locationSubHref(slug: string, sub: LocationSubRoute) {
  return { pathname: SUB_ROUTE_PATH[sub], params: { slug } } as const;
}

/** The href of a place's own page. */
export function locationHref(slug: string) {
  return { pathname: "/location/[slug]", params: { slug } } as const;
}

/** The titles the detail pages share (the web's `<h1>` suffix and trail). */
export const SUB_ROUTE_TITLE: Record<LocationSubRoute, string> = {
  forecast: "Forecast",
  atmosphere: "Atmosphere",
};

/**
 * A readable name from a slug, for the moment before the API names the place:
 * "harare" -> "Harare", "nairobi-ke" -> "Nairobi Ke". A smart slug's ref after
 * `--` (a geohash or `osm-w890123`) is an identity, not words, so it is
 * dropped: "strathaven--ksy4dd7" -> "Strathaven".
 */
export function placeNameFromSlug(slug: string | undefined): string {
  const words = (slug ?? "")
    .split("--")[0]
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.length > 0 ? words.join(" ") : "Location";
}

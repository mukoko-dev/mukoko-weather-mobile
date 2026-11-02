/**
 * The breadcrumb trail above a place's name: Home / Country / Province /
 * Place, the web's rules (`WeatherDashboard.tsx`):
 *
 *   - Home always leads and is the only link.
 *   - The country is shown whenever it is known, by NAME (never the ISO code).
 *   - The province is skipped when it is the same as the place's name
 *     (Harare is both), so the trail never says it twice.
 *   - The place itself closes the trail and is the current page.
 */

export type TrailKind = "home" | "plain" | "current";

export interface TrailItem {
  label: string;
  kind: TrailKind;
}

export interface TrailInput {
  /** The place's name. */
  name: string;
  /** The country's name, already resolved from its ISO code. */
  countryName?: string;
  province?: string;
}

function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function placeTrail({
  name,
  countryName,
  province,
}: TrailInput): TrailItem[] {
  const place = clean(name) ?? "";
  const country = clean(countryName);
  const region = clean(province);
  const items: TrailItem[] = [{ label: "Home", kind: "home" }];
  if (country) items.push({ label: country, kind: "plain" });
  if (region && region.toLowerCase() !== place.toLowerCase()) {
    items.push({ label: region, kind: "plain" });
  }
  if (place) items.push({ label: place, kind: "current" });
  return items;
}

/** The trail as one line, "Home / Zimbabwe / Mashonaland East / Marondera". */
export function trailText(items: readonly TrailItem[]): string {
  return items.map((i) => i.label).join(" / ");
}

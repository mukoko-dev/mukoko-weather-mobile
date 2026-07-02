/**
 * Explore browse taxonomy — maps location tags to Mukoko mineral colours and
 * derives category / country browse data from the static `LOCATIONS` seed
 * catalog (mirrors the web `/explore` browse experience, offline-first).
 *
 * Mineral doctrine (Mzizi `mukoko-design`, styling-minerals v4.1.0):
 *   farming  -> malachite  (palette.success)
 *   mining   -> terracotta (palette.terracotta)
 *   travel   -> cobalt     (palette.primary)
 *   tourism  -> tanzanite  (palette.tanzanite)
 *   sports   -> gold       (palette.accent)   [no location tag today]
 * The palette keys below resolve to those exact minerals via
 * `src/theme/colors.ts`, so no colours are invented here.
 */

import { LOCATIONS, type WeatherLocation } from '@/shared';

/**
 * Palette keys that map 1:1 to a mineral in `src/brand/tokens.ts`.
 * Subset of `BrandText` tones so a category tone is always renderable.
 */
export type CategoryTone =
  | 'primary' // cobalt
  | 'success' // malachite
  | 'accent' // gold
  | 'tanzanite'
  | 'sodalite'
  | 'copper'
  | 'terracotta';

export type CategoryMeta = {
  tag: string;
  /** Short label used for both browse chips and card tag badges. */
  label: string;
  /** Palette key -> mineral colour. */
  tone: CategoryTone;
  description: string;
};

/** Ordered so the most common / recognisable categories lead the row. */
export const CATEGORY_ORDER = [
  'city',
  'farming',
  'mining',
  'tourism',
  'travel',
  'education',
  'border',
  'national-park',
] as const;

export const CATEGORY_META: Record<string, CategoryMeta> = {
  city: { tag: 'city', label: 'City', tone: 'sodalite', description: 'Capitals and major towns' },
  farming: {
    tag: 'farming',
    label: 'Farming',
    tone: 'success',
    description: 'Agriculture and forestry regions',
  },
  mining: {
    tag: 'mining',
    label: 'Mining',
    tone: 'terracotta',
    description: 'Mines and heavy industry',
  },
  tourism: {
    tag: 'tourism',
    label: 'Tourism',
    tone: 'tanzanite',
    description: 'Resorts and attractions',
  },
  travel: {
    tag: 'travel',
    label: 'Travel',
    tone: 'primary',
    description: 'Transit hubs and routes',
  },
  education: {
    tag: 'education',
    label: 'Education',
    tone: 'copper',
    description: 'University and school towns',
  },
  border: { tag: 'border', label: 'Border', tone: 'accent', description: 'Border crossings' },
  'national-park': {
    tag: 'national-park',
    label: 'Parks',
    tone: 'success',
    description: 'Parks and reserves',
  },
};

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

/** Metadata for a tag, with a sensible fallback for DB-driven / unknown tags. */
export function getCategoryMeta(tag: string): CategoryMeta {
  return (
    CATEGORY_META[tag] ?? {
      tag,
      label: titleCase(tag),
      tone: 'primary',
      description: '',
    }
  );
}

export type CategoryBrowse = CategoryMeta & { count: number };

/** Known categories present in the catalog, in `CATEGORY_ORDER`, with counts. */
export function categoriesWithCounts(locations: WeatherLocation[] = LOCATIONS): CategoryBrowse[] {
  const counts = new Map<string, number>();
  for (const loc of locations) {
    for (const tag of loc.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return CATEGORY_ORDER.filter((tag) => counts.has(tag)).map((tag) => ({
    ...getCategoryMeta(tag),
    count: counts.get(tag) ?? 0,
  }));
}

export type CountryBrowse = { code: string; name: string; flag: string; count: number };

/** ISO 3166-1 alpha-2 -> regional-indicator flag emoji (fallback: white flag). */
export function countryFlag(code: string): string {
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '\u{1F3F3}\u{FE0F}';
  const BASE = 0x1f1e6;
  return String.fromCodePoint(BASE + (cc.charCodeAt(0) - 65), BASE + (cc.charCodeAt(1) - 65));
}

/** ISO code -> English display name, falling back to the code itself. */
export function countryName(code: string): string {
  const cc = code.toUpperCase();
  try {
    const display = new Intl.DisplayNames(['en'], { type: 'region' });
    return display.of(cc) ?? cc;
  } catch {
    return cc;
  }
}

/** Countries present in the catalog, sorted by location count then name. */
export function countriesWithCounts(locations: WeatherLocation[] = LOCATIONS): CountryBrowse[] {
  const counts = new Map<string, number>();
  for (const loc of locations) {
    if (!loc.country) continue;
    counts.set(loc.country, (counts.get(loc.country) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, name: countryName(code), flag: countryFlag(code), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Filter + sort the browse catalog by an optional tag and/or country code. */
export function filterLocations(opts: {
  tag?: string | null;
  country?: string | null;
  locations?: WeatherLocation[];
  limit?: number;
}): WeatherLocation[] {
  const { tag, country, locations = LOCATIONS, limit } = opts;
  let out = locations;
  if (country) out = out.filter((loc) => loc.country === country);
  if (tag) out = out.filter((loc) => loc.tags.includes(tag));
  out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  return typeof limit === 'number' ? out.slice(0, limit) : out;
}

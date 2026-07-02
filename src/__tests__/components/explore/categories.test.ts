/**
 * Browse taxonomy logic — mineral mapping, category/country derivation, and
 * catalog filtering. Pure functions, no rendering.
 */

import {
  CATEGORY_META,
  categoriesWithCounts,
  countriesWithCounts,
  countryFlag,
  countryName,
  filterLocations,
  getCategoryMeta,
} from '@/components/explore/categories';
import type { WeatherLocation } from '@/shared';

const sample: WeatherLocation[] = [
  { slug: 'harare', name: 'Harare', province: 'Harare', lat: -17.8, lon: 31, elevation: 1490, tags: ['city', 'education'], country: 'ZW' },
  { slug: 'kwekwe', name: 'Kwekwe', province: 'Midlands', lat: -18.9, lon: 29.8, elevation: 1214, tags: ['city', 'mining'], country: 'ZW' },
  { slug: 'nairobi-ke', name: 'Nairobi', province: 'Nairobi', lat: -1.3, lon: 36.8, elevation: 1795, tags: ['city'], country: 'KE' },
  { slug: 'nyanga', name: 'Nyanga', province: 'Manicaland', lat: -18.2, lon: 32.7, elevation: 1850, tags: ['farming', 'tourism'], country: 'ZW' },
];

describe('mineral tone mapping (Mzizi doctrine)', () => {
  it('maps required categories to their doctrine minerals', () => {
    expect(CATEGORY_META.farming.tone).toBe('success'); // malachite
    expect(CATEGORY_META.mining.tone).toBe('terracotta');
    expect(CATEGORY_META.tourism.tone).toBe('tanzanite');
    expect(CATEGORY_META.travel.tone).toBe('primary'); // cobalt
  });

  it('falls back to a title-cased primary tone for unknown tags', () => {
    const meta = getCategoryMeta('deep-mine');
    expect(meta.label).toBe('Deep Mine');
    expect(meta.tone).toBe('primary');
  });
});

describe('categoriesWithCounts', () => {
  it('returns known categories present in the catalog, in CATEGORY_ORDER', () => {
    const cats = categoriesWithCounts(sample);
    const tags = cats.map((c) => c.tag);
    // Present tags, emitted in canonical CATEGORY_ORDER.
    expect(tags).toEqual(['city', 'farming', 'mining', 'tourism', 'education']);
    expect(tags[0]).toBe('city');
    expect(cats.find((c) => c.tag === 'city')?.count).toBe(3);
    expect(cats.find((c) => c.tag === 'mining')?.count).toBe(1);
  });
});

describe('country helpers', () => {
  it('builds a regional-indicator flag for a valid ISO code', () => {
    expect(countryFlag('ZW')).toBe(String.fromCodePoint(0x1f1ff, 0x1f1fc));
  });

  it('falls back to a white flag for invalid codes', () => {
    expect(countryFlag('X')).toBe('\u{1F3F3}\u{FE0F}');
  });

  it('resolves an English display name (or the code itself)', () => {
    expect(typeof countryName('ZW')).toBe('string');
    expect(countryName('ZW').length).toBeGreaterThan(0);
  });

  it('counts and sorts countries by frequency then name', () => {
    const list = countriesWithCounts(sample);
    expect(list[0].code).toBe('ZW');
    expect(list[0].count).toBe(3);
    expect(list.find((c) => c.code === 'KE')?.count).toBe(1);
  });
});

describe('filterLocations', () => {
  it('filters by tag', () => {
    const out = filterLocations({ tag: 'mining', locations: sample });
    expect(out.map((l) => l.slug)).toEqual(['kwekwe']);
  });

  it('filters by country', () => {
    const out = filterLocations({ country: 'KE', locations: sample });
    expect(out.map((l) => l.slug)).toEqual(['nairobi-ke']);
  });

  it('combines tag + country and sorts by name', () => {
    const out = filterLocations({ tag: 'city', country: 'ZW', locations: sample });
    expect(out.map((l) => l.name)).toEqual(['Harare', 'Kwekwe']);
  });

  it('honours the limit', () => {
    const out = filterLocations({ locations: sample, limit: 2 });
    expect(out).toHaveLength(2);
  });
});

/**
 * ICAO lookup — slug map + nearest-airport haversine fallback.
 */

import { getIcaoForSlug, getNearestIcao, getSlugForIcao } from '@/shared/icao-codes';

describe('getIcaoForSlug', () => {
  it('returns the ICAO code for a known seed slug', () => {
    expect(getIcaoForSlug('harare')).toBe('FVHA');
    expect(getIcaoForSlug('bulawayo')).toBe('FVBU');
    expect(getIcaoForSlug('nairobi-ke')).toBe('HKJK');
    expect(getIcaoForSlug('singapore-sg')).toBe('WSSS');
  });

  it('returns null for an unknown slug', () => {
    expect(getIcaoForSlug('not-a-real-place')).toBeNull();
  });
});

describe('getNearestIcao', () => {
  it('finds the closest airport for known coordinates', () => {
    // Harare GPS ~ FVHA at (-17.932, 31.093)
    expect(getNearestIcao(-17.83, 31.05)).toBe('FVHA');
  });

  it('returns null when no airport is within range', () => {
    // Middle of the Atlantic — nowhere near our mapped airports
    expect(getNearestIcao(0, -30, 100)).toBeNull();
  });
});

describe('getSlugForIcao', () => {
  it('reverse-resolves a known ICAO code', () => {
    expect(getSlugForIcao('FVHA')).toBe('harare');
    expect(getSlugForIcao('fvha')).toBe('harare'); // case-insensitive
    expect(getSlugForIcao('WSSS')).toBe('singapore-sg');
  });

  it('returns null for an unmapped ICAO', () => {
    expect(getSlugForIcao('ZZZZ')).toBeNull();
  });
});

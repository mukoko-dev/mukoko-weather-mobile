/**
 * Smoke tests for the ported locations seed data. We don't assert every
 * row — just that the combined seed list has the shape we promise.
 */

import { GLOBAL_LOCATIONS, LOCATIONS, SEED_LOCATIONS_ZW } from '@/shared';
import * as locationsModule from '@/shared/locations';

describe('locations seed data', () => {
  it('exposes the Zimbabwe seed locations with country="ZW"', () => {
    // Matches the count produced by the mukoko-weather seed (97 unique slugs).
    expect(SEED_LOCATIONS_ZW.length).toBeGreaterThanOrEqual(95);
    for (const loc of SEED_LOCATIONS_ZW) {
      expect(loc.country).toBe('ZW');
    }
  });

  it('exposes the global seed locations, all with country codes', () => {
    expect(GLOBAL_LOCATIONS.length).toBeGreaterThanOrEqual(160);
    for (const loc of GLOBAL_LOCATIONS) {
      expect(typeof loc.country).toBe('string');
      expect(loc.country?.length).toBe(2);
    }
  });

  it('combines ZW + global into LOCATIONS', () => {
    expect(LOCATIONS.length).toBe(SEED_LOCATIONS_ZW.length + GLOBAL_LOCATIONS.length);
    expect(LOCATIONS.length).toBeGreaterThanOrEqual(255);
  });

  it('every location has lat/lon within valid global bounds', () => {
    for (const loc of LOCATIONS) {
      expect(loc.lat).toBeGreaterThanOrEqual(-90);
      expect(loc.lat).toBeLessThanOrEqual(90);
      expect(loc.lon).toBeGreaterThanOrEqual(-180);
      expect(loc.lon).toBeLessThanOrEqual(180);
    }
  });

  it('does NOT export the deprecated ZW_LOCATIONS / ZimbabweLocation aliases', () => {
    const mod = locationsModule as unknown as Record<string, unknown>;
    expect(mod.ZW_LOCATIONS).toBeUndefined();
    expect(mod.ZimbabweLocation).toBeUndefined();
  });
});

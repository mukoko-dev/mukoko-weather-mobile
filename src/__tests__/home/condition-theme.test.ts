/**
 * condition-theme — WMO code -> hero mood bucketing + palette tint resolution.
 */

import { lightPalette } from '@/theme/colors';
import {
  heroMoodFor,
  moodColors,
  withAlpha,
  type HeroMoodKey,
} from '@/components/home/condition-theme';

describe('heroMoodFor', () => {
  it('maps clear skies by day/night', () => {
    expect(heroMoodFor(0, true)).toBe('clear-day');
    expect(heroMoodFor(0, false)).toBe('clear-night');
  });

  it('maps partly cloudy by day/night', () => {
    expect(heroMoodFor(1, true)).toBe('partly-day');
    expect(heroMoodFor(2, false)).toBe('partly-night');
  });

  it('maps overcast, fog, precipitation, snow and storms', () => {
    expect(heroMoodFor(3)).toBe('cloudy');
    expect(heroMoodFor(45)).toBe('fog');
    expect(heroMoodFor(48)).toBe('fog');
    expect(heroMoodFor(53)).toBe('drizzle');
    expect(heroMoodFor(63)).toBe('rain');
    expect(heroMoodFor(81)).toBe('rain');
    expect(heroMoodFor(73)).toBe('snow');
    expect(heroMoodFor(86)).toBe('snow');
    expect(heroMoodFor(95)).toBe('thunder');
    expect(heroMoodFor(99)).toBe('thunder');
  });

  it('falls back to a partly-cloudy mood for null/undefined codes', () => {
    expect(heroMoodFor(null, true)).toBe('partly-day');
    expect(heroMoodFor(undefined, false)).toBe('partly-night');
  });
});

describe('withAlpha', () => {
  it('appends a hex alpha to a 6-digit hex colour', () => {
    expect(withAlpha('#0047AB', '14')).toBe('#0047AB14');
  });

  it('leaves non-hex colours untouched', () => {
    expect(withAlpha('rgba(0,0,0,0.5)', '14')).toBe('rgba(0,0,0,0.5)');
  });
});

describe('moodColors', () => {
  const allMoods: HeroMoodKey[] = [
    'clear-day',
    'clear-night',
    'partly-day',
    'partly-night',
    'cloudy',
    'fog',
    'drizzle',
    'rain',
    'snow',
    'thunder',
  ];

  it('returns three defined tint colours for every mood', () => {
    for (const mood of allMoods) {
      const c = moodColors(mood, lightPalette);
      expect(typeof c.base).toBe('string');
      expect(typeof c.orbA).toBe('string');
      expect(typeof c.orbB).toBe('string');
      expect(c.base.length).toBeGreaterThan(0);
    }
  });

  it('emits low-alpha 8-digit hex from mineral tokens (clear-day glow)', () => {
    const c = moodColors('clear-day', lightPalette);
    // gold accent + cobalt primary, both 6-digit hex -> 8-digit with alpha
    expect(c.base).toMatch(/^#[0-9a-fA-F]{8}$/);
    expect(c.orbA).toMatch(/^#[0-9a-fA-F]{8}$/);
  });
});

/**
 * Shared i18n smoke tests — translation lookup + Intl formatting.
 */

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  formatPercent,
  formatTemp,
  formatWindSpeed,
  t,
} from '@/shared/i18n';

describe('i18n', () => {
  it('exposes the three supported locales (en, sn, nd)', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'sn', 'nd']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('looks up English translation keys', () => {
    expect(t('weather.feelsLike')).toBe('Feels like');
    expect(t('weather.sunrise')).toBe('Sunrise');
  });

  it('interpolates {param} placeholders', () => {
    expect(t('weather.current', { location: 'Harare' })).toBe(
      'Current weather conditions in Harare',
    );
  });

  it('falls back to the key when missing', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('formats temperature with Intl', () => {
    const out = formatTemp(28);
    // Intl output varies by ICU version — assert the rounded value + degree
    expect(out).toMatch(/28/);
    expect(out).toMatch(/°/);
  });

  it('formats wind speed with Intl', () => {
    const out = formatWindSpeed(12);
    expect(out).toMatch(/12/);
  });

  it('formats percentages with Intl', () => {
    const out = formatPercent(62);
    expect(out).toMatch(/62/);
    expect(out).toMatch(/%/);
  });
});

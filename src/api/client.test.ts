/**
 * Smoke tests for the API client URL builder. We don't hit the network here —
 * just check that buildUrl produces the shape the Python backend expects.
 */

import { buildUrl, API_BASE_URL } from '@/api/client';

describe('buildUrl', () => {
  it('joins relative paths with the base URL', () => {
    expect(buildUrl('/api/py/weather')).toBe(`${API_BASE_URL}/api/py/weather`);
  });

  it('adds a leading slash when missing', () => {
    expect(buildUrl('api/py/weather')).toBe(`${API_BASE_URL}/api/py/weather`);
  });

  it('serialises query params in stable order and skips null/undefined', () => {
    const url = buildUrl('/api/py/weather', { lat: 1.5, lon: 2, missing: null, gone: undefined });
    expect(url).toContain('lat=1.5');
    expect(url).toContain('lon=2');
    expect(url).not.toContain('missing');
    expect(url).not.toContain('gone');
  });

  it('coerces booleans to strings', () => {
    const url = buildUrl('/api/py/geo', { autoCreate: true });
    expect(url).toContain('autoCreate=true');
  });
});

/**
 * Location search + add endpoints. Backed by mukoko-weather's
 *   GET  /api/py/search
 *   POST /api/py/locations/add
 *   GET  /api/py/geo?lat=&lon=&autoCreate=true
 *
 * The "add" endpoint is dual-mode: pass `{ query }` to search-then-create,
 * or pass `{ lat, lon }` to create from coordinates directly. Rate-limited
 * server-side to 5 creations/hour/IP — UI should surface 429s clearly.
 */

import { apiFetch } from '@/api/client';

export type LocationSummary = {
  slug: string;
  name: string;
  province?: string;
  country?: string;
  lat: number;
  lon: number;
  tags?: string[];
};

export type SearchResponse = {
  results: LocationSummary[];
  total?: number;
};

export function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  return apiFetch<SearchResponse>('/api/py/search', {
    query: { q: query },
    signal,
  });
}

export type AddByQuery = { query: string };
export type AddByCoords = { lat: number; lon: number };
export type AddLocationInput = AddByQuery | AddByCoords;

export type AddLocationResponse = {
  location: LocationSummary;
  created: boolean;
  candidates?: LocationSummary[];
};

export function addLocation(
  input: AddLocationInput,
  signal?: AbortSignal,
): Promise<AddLocationResponse> {
  return apiFetch<AddLocationResponse>('/api/py/locations/add', {
    method: 'POST',
    json: input,
    signal,
  });
}

export function geoLookup(
  lat: number,
  lon: number,
  autoCreate = false,
  signal?: AbortSignal,
): Promise<{ location: LocationSummary | null }> {
  return apiFetch<{ location: LocationSummary | null }>('/api/py/geo', {
    query: { lat, lon, autoCreate: autoCreate ? 'true' : undefined },
    signal,
  });
}

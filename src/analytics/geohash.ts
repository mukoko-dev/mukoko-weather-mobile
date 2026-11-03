/**
 * A geohash cell for analytics: 4 characters, about 39 x 20 km, the same
 * coarsening the web uses (`ANALYTICS_GEOHASH_CHARS` in mukoko-weather's
 * `src/lib/location-privacy.ts`). This module can only produce a cell that
 * coarse: there is no precision argument to get wrong.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Characters in an analytics cell. Never more. */
export const CELL_CHARS = 4;

/**
 * The 4-character geohash cell holding `lat`, `lon`, or undefined when either
 * is missing or outside WGS 84 bounds.
 */
export function encodeCell(lat?: number, lon?: number): string | undefined {
  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return undefined;
  }
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let even = true;
  let bit = 0;
  let ch = 0;
  let out = "";
  while (out.length < CELL_CHARS) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        ch = (ch << 1) | 1;
        lonMin = mid;
      } else {
        ch <<= 1;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        latMin = mid;
      } else {
        ch <<= 1;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      out += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return out;
}

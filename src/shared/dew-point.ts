/**
 * Dew point from air temperature and relative humidity.
 *
 * Ported verbatim from `dewPointFromTempHumidity` in mukoko-weather
 * `src/lib/activity-feasibility.ts` (Magnus-Tetens approximation, accurate to
 * about 0.35 °C between -45 and 60 °C), so the mobile and web humidity tiles
 * say the same dew point.
 */
export function dewPointFromTempHumidity(
  tempC: number,
  rhPercent: number,
): number {
  const rh = Math.min(100, Math.max(1, rhPercent));
  const a = 17.62;
  const b = 243.12;
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}

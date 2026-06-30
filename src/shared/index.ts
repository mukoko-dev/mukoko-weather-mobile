/**
 * Shared, platform-neutral logic ported from mukoko-weather/src/lib/*.
 *
 * Everything in this directory is pure TypeScript — no DOM, no Next.js, no
 * React Native — so it can be lifted into web, mobile, or worker runtimes
 * without modification. If a module needs platform glue (network base URL,
 * storage, geolocation), that glue lives outside `src/shared/`.
 */

export {
  humidityLabel,
  pressureLabel,
  cloudLabel,
  precipitationLabel,
  feelsLikeContext,
} from './weather-labels';

export {
  getIcaoForSlug,
  getNearestIcao,
  getSlugForIcao,
  ICAO_MAP,
} from './icao-codes';

export type {
  Locale,
} from './i18n';
export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  t,
  formatTemp,
  formatWindSpeed,
  formatPercent,
  formatTime,
  formatDayName,
  formatDate,
} from './i18n';

export type {
  WeatherLocation,
  LocationTag,
  NominatimAddress,
} from './locations';
export {
  SEED_LOCATIONS_ZW,
  LOCATIONS,
} from './locations';

export { GLOBAL_LOCATIONS } from './locations-global';

export type {
  WeatherData,
  CurrentWeather,
  HourlyWeather,
  DailyWeather,
  WeatherInsights,
  FrostAlert,
  Season,
} from './weather';
export {
  fetchWeather,
  checkFrostRisk,
  weatherCodeToInfo,
  getDefaultSeason,
  windDirection,
  uvLevel,
  createFallbackWeather,
  synthesizeOpenMeteoInsights,
} from './weather';

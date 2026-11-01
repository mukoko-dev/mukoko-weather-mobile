/**
 * The colours of chart series that plot a measured weather quantity, mirrored
 * from the web (`--wx-series-*` in mukoko-weather `src/app/globals.css`, read
 * by `WX_SERIES` in `src/lib/weather-scales.ts`).
 *
 * A colour that encodes a weather value follows the convention weather users
 * expect worldwide (temperature red to blue, rain blue, wind teal, cloud grey),
 * never a brand mineral. The light values are the ones the web draws on its
 * white card; the dark values are lifted for the dark card. Each holds 3:1 on
 * its card and every series in a theme is a different colour
 * (src/__tests__/wx-series.test.ts computes both, as the web's test does).
 *
 * The UV bar chart colours each bar from the WHO UV bands (`WX_UV` in
 * src/theme/mzizi.ts), not from this table.
 */

export type SeriesKey =
  | "temp"
  | "tempLow"
  | "feels"
  | "feelsLow"
  | "rain"
  | "rainProb"
  | "wind"
  | "gust"
  | "cloud"
  | "humidity"
  | "pressure"
  | "dew"
  | "visibility"
  | "storm";

export const WX_SERIES_LIGHT: Record<SeriesKey, string> = {
  temp: "#d73027",
  tempLow: "#4575b4",
  feels: "#b8570b",
  feelsLow: "#2f7f96",
  rain: "#0b6fb8",
  rainProb: "#08519c",
  wind: "#2a9d8f",
  gust: "#1b6a5f",
  cloud: "#6b7280",
  humidity: "#238b45",
  pressure: "#6a51a3",
  dew: "#0e7490",
  visibility: "#525252",
  storm: "#7b3294",
};

export const WX_SERIES_DARK: Record<SeriesKey, string> = {
  temp: "#f4806f",
  tempLow: "#74add1",
  feels: "#fdae61",
  feelsLow: "#7fc4d8",
  rain: "#4fc3f7",
  rainProb: "#9ecae1",
  wind: "#5fd3c4",
  gust: "#8fe0d3",
  cloud: "#a1a1aa",
  humidity: "#74c476",
  pressure: "#b2a3e0",
  dew: "#67d1e6",
  visibility: "#a3a3a3",
  storm: "#c996dd",
};

/** The series colours for a colour scheme. */
export function seriesColors(dark: boolean): Record<SeriesKey, string> {
  return dark ? WX_SERIES_DARK : WX_SERIES_LIGHT;
}

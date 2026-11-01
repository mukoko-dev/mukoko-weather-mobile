/**
 * Sizes for the small charts, in dp. A chart's colours come from
 * src/theme/weather-scales.ts and the page tokens; its text is on the Mzizi
 * type scale. Nothing here is a colour.
 */

export const CHART = {
  /** Plot height on a detail sheet, and on a card. */
  height: 168,
  heightCompact: 112,
  /** Width assumed before the first layout (and in tests). */
  defaultWidth: 280,
  /** Line and gridline thickness, dp. */
  line: 2,
  grid: 0.5,
  /** Dash and gap of a dashed line, dp. */
  dash: 4,
  /** The point marker on a lone value, radius. */
  dot: 3,
  /** The legend swatch. */
  swatchWidth: 16,
  swatchHeight: 3,
  /** Most labels along the x axis. */
  maxXLabels: 6,
} as const;

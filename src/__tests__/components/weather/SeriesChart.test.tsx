/**
 * The small chart: one image to VoiceOver with the whole story in its label,
 * real text for the axes (so they follow the text size), a legend in words,
 * gaps that stay gaps, and dashed lines that are dashed.
 */

import { render } from "@testing-library/react-native";

import {
  type ChartSeries,
  SeriesChart,
} from "@/components/weather/charts/SeriesChart";
import { WX_SERIES } from "@/theme/weather-scales";

const labels = ["Now", "15:00", "16:00", "17:00"];
const wind: ChartSeries = {
  key: "wind",
  label: "Wind speed (km/h)",
  unit: "km/h",
  values: [10, 14, 18, 12],
  color: WX_SERIES.light.wind,
  kind: "area",
};
const gusts: ChartSeries = {
  key: "gusts",
  label: "Gusts (km/h)",
  unit: "km/h",
  values: [14, 20, 26, 18],
  color: WX_SERIES.light.gust,
  dashed: true,
};

/** react-native-svg turns a colour into an ARGB number in the tree. */
const argb = (hex: string) => parseInt(`ff${hex.replace("#", "")}`, 16);

/** The axis texts are hidden from VoiceOver on purpose (the chart's label covers them). */
const HIDDEN = { includeHiddenElements: true } as const;

function counts(tree: { toJSON: () => unknown }) {
  const json = JSON.stringify(tree.toJSON());
  return {
    paths: (json.match(/RNSVGPath/g) ?? []).length,
    rects: (json.match(/RNSVGRect/g) ?? []).length,
    circles: (json.match(/RNSVGCircle/g) ?? []).length,
    dashed: (json.match(/"strokeDasharray":\[/g) ?? []).length,
  };
}

describe("SeriesChart", () => {
  it("is ONE image whose label gives each series' start, end, lowest and highest", async () => {
    const tree = await render(
      <SeriesChart
        title="Wind, next 24 hours"
        labels={labels}
        series={[wind, gusts]}
        left={{ min: 0, format: (v) => `${v}` }}
      />,
    );
    const chart = tree.getByRole("image");
    expect(chart.props.accessibilityLabel).toBe(
      "Wind, next 24 hours. " +
        "Wind speed (km/h): from 10 km/h at Now to 12 km/h at 17:00; lowest 10 km/h at Now, highest 18 km/h at 16:00. " +
        "Gusts (km/h): from 14 km/h at Now to 18 km/h at 17:00; lowest 14 km/h at Now, highest 26 km/h at 16:00.",
    );
  });

  it("draws the axis and x labels as real text and a legend with words", async () => {
    const tree = await render(
      <SeriesChart
        title="Wind"
        labels={labels}
        series={[wind, gusts]}
        left={{ min: 0, format: (v) => `${v} u` }}
      />,
    );
    expect(tree.getAllByText(/ u$/, HIDDEN).length).toBeGreaterThan(2);
    expect(tree.getAllByText("Now", HIDDEN).length).toBeGreaterThan(0);
    expect(tree.getByText("17:00", HIDDEN)).toBeTruthy();
    expect(tree.getByText("Wind speed (km/h)", HIDDEN)).toBeTruthy();
    expect(tree.getByText("Gusts (km/h)", HIDDEN)).toBeTruthy();
  });

  it("draws a dashed line dashed (colour is not the only signal)", async () => {
    const tree = await render(
      <SeriesChart
        title="Wind"
        labels={labels}
        series={[wind, gusts]}
        left={{ min: 0, format: String }}
      />,
    );
    expect(counts(tree).dashed).toBe(1);
  });

  it("draws bars as rectangles from the floor, one per value, colour per bar when given", async () => {
    const tree = await render(
      <SeriesChart
        title="UV"
        labels={labels}
        series={[
          {
            key: "uv",
            label: "UV index",
            unit: "",
            values: [1, 4, 7, 12],
            color: "#f7e400",
            barColors: ["#299501", "#f7e400", "#f85900", "#6b49c8"],
            kind: "bar",
          },
        ]}
        left={{ min: 0, max: 13, format: String }}
      />,
    );
    const json = JSON.stringify(tree.toJSON());
    // Four bars; the plot's gridlines are lines, not rects.
    expect(counts(tree).rects).toBe(4);
    for (const c of ["#299501", "#f7e400", "#f85900", "#6b49c8"]) {
      expect(json).toContain(`"payload":${argb(c)}`);
    }
  });

  it("keeps a gap in a line as a gap: two paths, no bridge across the missing hour", async () => {
    const tree = await render(
      <SeriesChart
        title="Pressure"
        labels={labels}
        series={[
          {
            key: "p",
            label: "Pressure (hPa)",
            unit: "hPa",
            values: [1010, null, 1012, 1013],
            color: WX_SERIES.light.pressure,
          },
        ]}
        left={{ format: String }}
        legend
      />,
    );
    // The lone first point is a dot (a circle), the last two a path.
    expect(counts(tree).circles).toBe(1);
    expect(counts(tree).paths).toBe(1);
    expect(tree.getByRole("image").props.accessibilityLabel).toMatch(
      /from 1010 hPa at Now to 1013 hPa at 17:00/,
    );
  });

  it("puts a second value axis on the right when asked", async () => {
    const tree = await render(
      <SeriesChart
        title="Rain"
        labels={labels}
        series={[
          {
            key: "mm",
            label: "Rainfall (mm)",
            unit: "mm",
            values: [0, 1, 3, 0],
            color: WX_SERIES.light.rain,
            kind: "bar",
          },
          {
            key: "pct",
            label: "Chance (%)",
            unit: "%",
            values: [10, 40, 80, 20],
            color: WX_SERIES.light.rainProb,
            dashed: true,
            axis: "right",
          },
        ]}
        left={{ min: 0, format: (v) => `${v} mm` }}
        right={{ min: 0, max: 100, format: (v) => `${v}%` }}
      />,
    );
    expect(tree.getAllByText(/ mm$/, HIDDEN).length).toBeGreaterThan(1);
    expect(tree.getAllByText(/%$/, HIDDEN).length).toBeGreaterThan(1);
  });

  it("says no data rather than zero for an empty series", async () => {
    const tree = await render(
      <SeriesChart
        title="Rain"
        labels={[]}
        series={[
          {
            key: "r",
            label: "Rain",
            unit: "mm",
            values: [null, null],
            color: "#0b6fb8",
          },
        ]}
        left={{ format: String }}
      />,
    );
    expect(tree.getByRole("image").props.accessibilityLabel).toBe(
      "Rain. Rain: no data.",
    );
  });
});

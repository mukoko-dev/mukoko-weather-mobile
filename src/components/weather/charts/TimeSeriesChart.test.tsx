/**
 * The reusable chart, rendered for real (react-native-svg in the test
 * renderer): what it draws, the legend and the touch readout, the one
 * VoiceOver element with its text alternative and its adjustable steps, the
 * empty state, a gap that stays a gap, dark colours, Dynamic Type and Reduce
 * Motion.
 */

import { act, fireEvent, render } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { prepareHourlyData } from "@/shared/chart-data";
import { setWindow } from "@/test-utils/mocks";
import { NOW, harareWeather } from "@/test-utils/weather-fixtures";
import { WX_SERIES_DARK, WX_SERIES_LIGHT } from "@/theme/wx-series";

import { HourlyChart, HOURLY_SERIES, hourlyAxes, hourlyValue } from "./HourlyChart";
import { TimeSeriesChart } from "./TimeSeriesChart";

const forecast = harareWeather().forecast!;
const data = prepareHourlyData(forecast.hourly, forecast.utc_offset_seconds, NOW);

const WIDTH = 320;

async function mount(node = (
  <TimeSeriesChart
    title="Temperature and chance of rain, next 24 hours"
    data={data}
    labelKey="label"
    series={HOURLY_SERIES}
    yAxes={hourlyAxes(data)}
    valueFormat={hourlyValue}
    testID="c"
  />
)) {
  const tree = await render(node);
  const plot = tree.getByTestId("c-plot");
  await act(async () => {
    fireEvent(plot, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: WIDTH / 2 } },
    });
  });
  return { tree, plot };
}

function touch(plot: Parameters<typeof fireEvent>[0], type: string, x: number, y = 40) {
  fireEvent(plot, type, { nativeEvent: { locationX: x, locationY: y } });
}

const json = (tree: { toJSON: () => unknown }) => JSON.stringify(tree.toJSON());

/** A colour as react-native-svg serialises it: opaque ARGB as an unsigned integer. */
const payloadOf = (hex: string) =>
  `"payload":${(0xff000000 | parseInt(hex.slice(1), 16)) >>> 0}`;

/** `toContain` without printing a whole rendered tree when it fails. */
const has = (haystack: string, needle: string) => haystack.includes(needle);

// The colour scheme the chart reads (`usePageColors` -> `useColorScheme`).
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => (globalThis as { __scheme?: string }).__scheme ?? "light",
}));

beforeEach(() => {
  setWindow(393, 852);
  jest.restoreAllMocks();
  (globalThis as { __scheme?: string }).__scheme = "light";
});

describe("TimeSeriesChart", () => {
  it("draws the grid, labels, an area, lines and bars as SVG, with no text outside it", async () => {
    const { tree } = await mount();
    const out = json(tree);
    expect(out).toContain("RNSVGSvgView");
    expect(out).toContain("RNSVGPath");
    expect(out).toContain("RNSVGRect");
    expect(out).toContain("RNSVGText");
    // The first x label is "Now" (the place's current hour).
    expect(out).toContain("Now");
  });

  it("paints the series in the weather-convention colours of the colour scheme", async () => {
    const light = json((await mount()).tree);
    expect(has(light, payloadOf(WX_SERIES_LIGHT.temp))).toBe(true);
    expect(has(light, payloadOf(WX_SERIES_DARK.temp))).toBe(false);
    (globalThis as { __scheme?: string }).__scheme = "dark";
    const dark = json((await mount()).tree);
    expect(has(dark, payloadOf(WX_SERIES_DARK.temp))).toBe(true);
    expect(has(dark, payloadOf(WX_SERIES_LIGHT.temp))).toBe(false);
  });

  it("is one VoiceOver element: the title, then a sentence per series", async () => {
    const { tree } = await mount();
    const chart = tree.getByTestId("c");
    expect(chart.props.accessible).toBe(true);
    expect(chart.props.accessibilityRole).toBe("adjustable");
    const label: string = chart.props.accessibilityLabel;
    expect(label).toContain("Temperature and chance of rain, next 24 hours.");
    expect(label).toMatch(/Temperature: lowest -?\d+°C at [\w:]+, highest -?\d+°C at [\w:]+\./);
    expect(label).toMatch(/Feels Like: lowest/);
    expect(label).toMatch(/Rain %: /);
    expect(chart.props.accessibilityHint).toBe("Swipe up or down to hear each value.");
    expect(chart.props.accessibilityActions).toEqual([
      { name: "increment" },
      { name: "decrement" },
    ]);
  });

  it("shows the legend until a point is chosen, with a swatch that is not only colour", async () => {
    const { tree } = await mount();
    const readout = tree.getByTestId("c-readout");
    for (const s of HOURLY_SERIES) expect(json({ toJSON: () => readout })).toContain(s.label);
    // A dashed line has a dash pattern in its swatch.
    expect(json(tree)).toContain("strokeDasharray");
  });

  it("steps through the points with the adjustable actions and speaks each one", async () => {
    const { tree } = await mount();
    const chart = () => tree.getByTestId("c");
    expect(chart().props.accessibilityValue).toBeUndefined();
    await act(async () => {
      fireEvent(chart(), "accessibilityAction", {
        nativeEvent: { actionName: "increment" },
      });
    });
    const first: string = chart().props.accessibilityValue.text;
    expect(first.startsWith("Now.")).toBe(true);
    expect(first).toContain("Temperature:");
    await act(async () => {
      fireEvent(chart(), "accessibilityAction", {
        nativeEvent: { actionName: "increment" },
      });
    });
    expect(chart().props.accessibilityValue.text.startsWith(data[1].label)).toBe(true);
    await act(async () => {
      fireEvent(chart(), "accessibilityAction", {
        nativeEvent: { actionName: "decrement" },
      });
    });
    expect(chart().props.accessibilityValue.text.startsWith("Now.")).toBe(true);
    // It stops at the first point.
    await act(async () => {
      fireEvent(chart(), "accessibilityAction", {
        nativeEvent: { actionName: "decrement" },
      });
    });
    expect(chart().props.accessibilityValue.text.startsWith("Now.")).toBe(true);
  });

  it("stops at the last point", async () => {
    const { tree } = await mount();
    for (let i = 0; i < data.length + 5; i++) {
      await act(async () => {
        fireEvent(tree.getByTestId("c"), "accessibilityAction", {
          nativeEvent: { actionName: "increment" },
        });
      });
    }
    expect(
      tree.getByTestId("c").props.accessibilityValue.text.startsWith(data[data.length - 1].label),
    ).toBe(true);
  });

  it("reads a point on tap: the readout shows its label and every value", async () => {
    const { tree, plot } = await mount();
    await act(async () => {
      touch(plot, "touchStart", 4);
      touch(plot, "touchEnd", 4);
    });
    const text = json({ toJSON: () => tree.getByTestId("c-readout") });
    expect(text).toContain("Now");
    expect(text).toMatch(/Temperature: -?\d+°C/);
    expect(text).toMatch(/Rain %: \d+%/);
    // The selection rule and dots are drawn on the plot.
    expect(json(tree)).toContain("RNSVGCircle");
  });

  it("clears the point when the same one is tapped again", async () => {
    const { tree, plot } = await mount();
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        touch(plot, "touchStart", 4);
        touch(plot, "touchEnd", 4);
      });
    }
    expect(json({ toJSON: () => tree.getByTestId("c-readout") })).not.toMatch(
      /Temperature: -?\d+°C/,
    );
  });

  it("follows a finger dragged along the chart, and ignores a mostly vertical drag", async () => {
    const { tree, plot } = await mount();
    const readout = () => json({ toJSON: () => tree.getByTestId("c-readout") });
    // A vertical swipe (scrolling the page) selects nothing.
    await act(async () => {
      touch(plot, "touchStart", 100, 10);
      touch(plot, "touchMove", 102, 80);
      touch(plot, "touchEnd", 102, 80);
    });
    expect(readout()).not.toMatch(/Temperature: -?\d+°C/);
    // A horizontal drag to the far right ends on the last point.
    await act(async () => {
      touch(plot, "touchStart", 20, 40);
      touch(plot, "touchMove", 60, 41);
      touch(plot, "touchMove", WIDTH - 2, 41);
      touch(plot, "touchEnd", WIDTH - 2, 41);
    });
    expect(readout()).toContain(data[data.length - 1].label);
  });

  it("shows a quiet message, not an empty box, when there is nothing to draw", async () => {
    const empty = data.map((d) => ({ ...d, temp: null, feelsLike: null, rain: null }));
    const tree = await render(
      <TimeSeriesChart
        title="Temperature"
        data={empty}
        labelKey="label"
        series={HOURLY_SERIES}
        testID="c"
      />,
    );
    expect(tree.getByText("Not enough forecast hours to draw this chart.")).toBeTruthy();
    expect(tree.getByTestId("c-empty").props.accessibilityLabel).toContain("Temperature.");
    const one = await render(
      <TimeSeriesChart
        title="Temperature"
        data={data.slice(0, 1)}
        labelKey="label"
        series={HOURLY_SERIES}
        testID="d"
      />,
    );
    expect(one.getByTestId("d-empty")).toBeTruthy();
  });

  it("keeps a missing reading as a gap, spoken as no data", async () => {
    const gappy = data.map((d, i) => (i === 3 ? { ...d, temp: null } : d));
    const { tree } = await mount(
      <TimeSeriesChart
        title="Temperature"
        data={gappy}
        labelKey="label"
        series={HOURLY_SERIES}
        valueFormat={hourlyValue}
        testID="c"
      />,
    );
    await act(async () => {
      for (let i = 0; i < 4; i++) {
        fireEvent(tree.getByTestId("c"), "accessibilityAction", {
          nativeEvent: { actionName: "increment" },
        });
      }
    });
    expect(tree.getByTestId("c").props.accessibilityValue.text).toContain(
      "Temperature: no data",
    );
  });

  it("scales its axis labels with the text size, capped", async () => {
    const sizeOf = async (fontScale: number) => {
      setWindow(393, 852, fontScale);
      const { tree } = await mount();
      const m = /"font":\{"fontSize":([\d.]+)/.exec(json(tree));
      return Number(m?.[1]);
    };
    expect(await sizeOf(1)).toBe(12);
    expect(await sizeOf(1.3)).toBeCloseTo(15.6);
    expect(await sizeOf(3)).toBe(18);
  });

  it("fades in, and does not move at all under Reduce Motion", async () => {
    const opacity = (tree: { getByTestId: (id: string) => { props: { style?: unknown } } }) => {
      const style = ([] as object[]).concat(tree.getByTestId("c-plot").props.style as object).flat(3);
      return style.reduce((a: number | undefined, s) => (s as { opacity?: number }).opacity ?? a, undefined);
    };
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    expect(opacity((await mount()).tree)).toBe(0);
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const reduced = await mount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(opacity(reduced.tree)).toBe(1);
  });

  it("is small: the chart is as wide as its box and as tall as the aspect says", async () => {
    const { tree } = await mount();
    const plot = tree.getByTestId("c-plot");
    const flat = ([] as object[]).concat(plot.props.style as object).flat(3);
    expect(flat.some((s) => (s as { aspectRatio?: number }).aspectRatio === 2)).toBe(true);
  });
});

describe("HourlyChart", () => {
  it("is the web's chart: temperature, feels like and the chance of rain, from the place's current hour", async () => {
    const tree = await render(
      <HourlyChart
        hourly={forecast.hourly}
        utcOffsetSeconds={forecast.utc_offset_seconds}
        now={NOW}
      />,
    );
    expect(tree.getByTestId("hourly-chart")).toBeTruthy();
    expect(tree.getByTestId("hourly-chart").props.accessibilityLabel).toContain(
      "Temperature and chance of rain, next 24 hours.",
    );
  });
});

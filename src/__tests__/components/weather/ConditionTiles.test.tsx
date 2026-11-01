/**
 * The tile grid: the web's tiles in the web's order, each one item to
 * VoiceOver, with the web's insight sentences, two columns on a phone and one
 * at the largest text size.
 */

import { render } from "@testing-library/react-native";

import { ConditionTiles } from "@/components/weather/ConditionTiles";
import { SINGLE_COLUMN_FONT_SCALE } from "@/components/weather/InsightCard";
import { BORDER, RADIUS, SIZE, mineralEdge } from "@/theme/mzizi";

import { PHONE_WIDTHS, setWindow } from "@/test-utils/mocks";
import {
  HAS_EMOJI,
  NOW,
  allText,
  harareWeather,
  withCondition,
} from "@/test-utils/weather-fixtures";

function flat(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? style.flat(3).reduce((a: object, b: object) => ({ ...a, ...b }), {})
    : ((style ?? {}) as Record<string, unknown>);
}

const forecast = harareWeather().forecast!;

describe("ConditionTiles", () => {
  beforeEach(() => setWindow(393, 852));

  it("shows the web's tiles in its order", async () => {
    const { getAllByRole } = await render(
      <ConditionTiles forecast={forecast} now={NOW} />,
    );
    const labels = getAllByRole("header").map((h) => h.props.children);
    expect(labels).toEqual([
      "Conditions",
      "Wind",
      "UV index",
      "Feels like",
      "Visibility",
      "Precipitation",
      "Humidity",
      "Pressure",
      "Sun",
    ]);
  });

  it("uses the web's sentences, computed by the web's rules, from the recorded answer", async () => {
    const { getByText } = await render(
      <ConditionTiles forecast={forecast} now={NOW} />,
    );
    // Harare, 02:45 local, clear night, 10 km/h from the NE, gusts 19.
    expect(getByText("Gusts up to 19 km/h from the NE.")).toBeTruthy();
    expect(getByText("Similar to the actual temperature.")).toBeTruthy();
    expect(getByText("Steady — no big change expected.")).toBeTruthy();
    expect(getByText(/^The dew point is \d+° right now\./)).toBeTruthy();
    expect(getByText(/^Sunrise in /)).toBeTruthy();
    expect(
      getByText("0 mm in the last 24 h. No rain expected in the next week."),
    ).toBeTruthy();
  });

  it("reads each tile as one item: label, value, sentence", async () => {
    const { getByLabelText } = await render(
      <ConditionTiles forecast={forecast} now={NOW} />,
    );
    expect(
      getByLabelText(
        "Wind. 10 kilometres per hour from the NE, Light breeze. Gusts up to 19 km/h from the NE.",
      ),
    ).toBeTruthy();
  });

  it("is the normal card surface with a solid 0.5 dp border tinted with the tile's mineral at 60%, radius 14, no shadow", async () => {
    const { getByLabelText } = await render(
      <ConditionTiles forecast={forecast} now={NOW} />,
    );
    const wind = flat(getByLabelText(/^Wind\./).props.style);
    expect(wind.borderWidth).toBe(BORDER.rest);
    expect(wind.borderColor).toBe(mineralEdge("cobalt", "light"));
    expect(wind.borderRadius).toBe(RADIUS.card);
    expect(wind.backgroundColor).toBe("#ffffff");
    expect(wind.shadowOpacity).toBeUndefined();
    expect(wind.elevation).toBeUndefined();
    // A square tile has a minimum height, not a fixed ratio.
    expect(wind.minHeight).toBe(SIZE.insightMin);
    expect(wind.aspectRatio).toBeUndefined();
    const precip = flat(getByLabelText(/^Precipitation\./).props.style);
    expect(precip.minHeight).toBeUndefined();
  });

  it("draws no emoji", async () => {
    const tree = await render(<ConditionTiles forecast={forecast} now={NOW} />);
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("names a storm's wind and a rainy hour, not a placeholder", async () => {
    const stormy = withCondition(95, 1, {
      wind_gusts_10m: 60,
      wind_speed_10m: 35,
    }).forecast!;
    const { getByText } = await render(
      <ConditionTiles forecast={stormy} now={NOW} />,
    );
    expect(getByText(/Gusts up to 60 km\/h/)).toBeTruthy();
  });

  it.each(PHONE_WIDTHS)("lays out two columns at %i pt", async (width) => {
    setWindow(width, 852);
    const { toJSON } = await render(
      <ConditionTiles forecast={forecast} now={NOW} />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"flexDirection":"row"');
  });

  it("goes to one column at the largest text size so no tile is too narrow", async () => {
    setWindow(320, 568, SINGLE_COLUMN_FONT_SCALE + 0.65);
    const { toJSON } = await render(
      <ConditionTiles forecast={forecast} now={NOW} />,
    );
    // No row of two: every tile row is a column.
    const rows = JSON.stringify(toJSON()).match(
      /"flexDirection":"row","gap":12,"alignItems":"stretch"/g,
    );
    expect(rows).toBeNull();
  });
});

/**
 * The Conditions card: translucent bordered card on the sky, the one-sentence
 * outlook and the hour strip, with every hour read in the PLACE's time.
 */

import { render } from "@testing-library/react-native";

import {
  ConditionsCard,
  STRIP_HOURS,
  hourTiles,
} from "@/components/weather/ConditionsCard";
import { BORDER, RADIUS } from "@/theme/mzizi";

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

describe("hourTiles", () => {
  const forecast = harareWeather().forecast!;

  it("starts at the place's current hour and says Now", () => {
    const tiles = hourTiles(forecast, NOW);
    expect(tiles).toHaveLength(STRIP_HOURS);
    expect(tiles[0].label).toBe("Now");
    expect(tiles[0].time).toBe("2026-11-01T02:00");
    expect(tiles[1].label).toBe("03:00");
    expect(tiles[2].label).toBe("04:00");
  });

  it("is the same whatever zone the phone is in (the place's offset decides)", () => {
    // 00:45 UTC. A phone in UTC-8 would call it 16:45 the day before.
    const spy = jest
      .spyOn(Date.prototype, "getTimezoneOffset")
      .mockReturnValue(480);
    try {
      expect(hourTiles(forecast, NOW)[1].label).toBe("03:00");
    } finally {
      spy.mockRestore();
    }
  });

  it("shows a rain chance only when it is above zero, as the web does", () => {
    const wet = withCondition(61, 1, {
      precipitation_probability: 40,
    }).forecast!;
    const tiles = hourTiles(wet, NOW);
    expect(tiles[0].rainPct).toBe(40);
    expect(tiles[0].spoken).toContain("40% chance of rain");
    expect(hourTiles(forecast, NOW)[0].rainPct).toBeNull();
  });

  it("gives every hour a spoken label with the time, degrees and condition", () => {
    expect(hourTiles(forecast, NOW)[0].spoken).toBe(
      "Now: 17 degrees, Clear sky",
    );
  });

  it("is empty for a forecast with no hours", () => {
    expect(
      hourTiles({ ...forecast, hourly: { ...forecast.hourly, time: [] } }, NOW),
    ).toEqual([]);
  });
});

describe("ConditionsCard", () => {
  it("renders the heading, the outlook sentence and a tile per hour", async () => {
    const forecast = harareWeather().forecast!;
    const { getByText, getAllByLabelText, getByLabelText } = await render(
      <ConditionsCard forecast={forecast} now={NOW} />,
    );
    expect(getByText("Conditions")).toBeTruthy();
    expect(
      getByText(/Clear conditions will continue for the next 12 hours/),
    ).toBeTruthy();
    expect(getByLabelText("Hourly forecast, scroll horizontally")).toBeTruthy();
    expect(getAllByLabelText(/^(Now|\d\d:00): /)).toHaveLength(STRIP_HOURS);
  });

  it("names a coming change with its hour in the place's clock", async () => {
    const raw = harareWeather().forecast!;
    const codes = raw.hourly.weather_code.map((c, i) => (i >= 6 ? 63 : c));
    const forecast = { ...raw, hourly: { ...raw.hourly, weather_code: codes } };
    const { getByText } = await render(
      <ConditionsCard forecast={forecast} now={NOW} />,
    );
    // Index 6 is 06:00 at the place; now is 02:00 (index 2).
    expect(getByText("Rain expected around 06:00.")).toBeTruthy();
  });

  it("is a translucent bordered card: sky foreground at 7% and 16%, radius 22, no shadow", async () => {
    const { getByTestId } = await render(
      <ConditionsCard forecast={harareWeather().forecast!} now={NOW} />,
    );
    const s = flat(getByTestId("conditions-card").props.style);
    expect(s.backgroundColor).toBe("rgba(255, 255, 255, 0.07)");
    expect(s.borderColor).toBe("rgba(255, 255, 255, 0.16)");
    expect(s.borderRadius).toBe(RADIUS.skyCard);
    expect(s.borderWidth).toBe(BORDER.sky);
    expect(s.shadowOpacity).toBeUndefined();
    expect(s.elevation).toBeUndefined();
  });

  it("draws drawn icons only, no emoji", async () => {
    const tree = await render(
      <ConditionsCard forecast={harareWeather().forecast!} now={NOW} />,
    );
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("renders nothing without an hourly series", async () => {
    const f = harareWeather().forecast!;
    const { toJSON } = await render(
      <ConditionsCard
        forecast={{ ...f, hourly: { ...f.hourly, time: [] } }}
        now={NOW}
      />,
    );
    expect(toJSON()).toBeNull();
  });
});

/**
 * The Conditions section with its point: the air-quality card, the haze card,
 * the Moon and Averages tiles, and every tile opening its detail sheet. The
 * Worker is a recorded set of answers, routed by path.
 */

import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { ConditionTiles } from "@/components/weather/ConditionTiles";

import { routeFetch } from "@/api/mock-routes";
import airQualityHarare from "@/api/__fixtures__/air-quality-harare.json";
import hazeHarare from "@/api/__fixtures__/haze-harare.json";
import historyHarare from "@/api/__fixtures__/history-harare.json";
import normalsMonthlyHarare from "@/api/__fixtures__/normals-monthly-harare.json";
import normalsTodayHarare from "@/api/__fixtures__/normals-today-harare.json";
import { setInsets, IPHONE_INSETS, setWindow } from "@/test-utils/mocks";
import {
  HAS_EMOJI,
  NOW,
  allText,
  harareWeather,
} from "@/test-utils/weather-fixtures";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const forecast = harareWeather().forecast!;
const POINT = { lat: -17.825, lon: 31.034 };

const ALL_ROUTES = {
  "/v1/air-quality": { body: airQualityHarare },
  "/v1/haze": { body: hazeHarare },
  "/v1/normals": { body: normalsTodayHarare },
  "/v1/normals/monthly": { body: normalsMonthlyHarare },
  "/v1/history": { body: historyHarare },
};

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

describe("the cards that ask the Worker", () => {
  it("shows air quality first under the heading, then haze, then the tiles", async () => {
    routeFetch(ALL_ROUTES);
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} slug="harare" />,
    );
    await waitFor(() => expect(tree.getByText("Moderate")).toBeTruthy());
    await waitFor(() => expect(tree.getByTestId("haze-card")).toBeTruthy());
    const headers = tree.getAllByRole("header").map((h) => h.props.children);
    expect(headers.slice(0, 4)).toEqual([
      "Conditions",
      "Air quality",
      "Light smog",
      "Wind",
    ]);
    expect(headers.at(-1)).toBe("Averages");
  });

  it("says what the air is: the index, its band, the sentence", async () => {
    routeFetch(ALL_ROUTES);
    const { getByText, getByLabelText } = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    await waitFor(() => expect(getByText("68")).toBeTruthy());
    expect(getByText("Moderate, mainly PM2.5.")).toBeTruthy();
    expect(
      getByLabelText(
        "Air quality. US AQI 68, Moderate. Moderate, mainly PM2.5.",
      ),
    ).toBeTruthy();
  });

  it("makes no request for the cards without a point", async () => {
    const calls = routeFetch(ALL_ROUTES);
    const tree = await render(<ConditionTiles forecast={forecast} now={NOW} />);
    expect(calls).toHaveLength(0);
    expect(tree.queryByText("Air quality")).toBeNull();
    // The Moon tile needs no request and spans the row on its own.
    expect(tree.getByLabelText(/^Moon\./)).toBeTruthy();
  });

  it("asks only for the rounded point (about 110 m)", async () => {
    const calls = routeFetch(ALL_ROUTES);
    await render(
      <ConditionTiles
        forecast={forecast}
        now={NOW}
        point={{ lat: -17.82521234, lon: 31.03351234 }}
      />,
    );
    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(3));
    for (const c of calls) {
      const q = new URL(c.url).searchParams;
      expect(q.get("lat")).toBe("-17.825");
      expect(q.get("lon")).toBe("31.034");
    }
  });
});

describe("Averages and Moon", () => {
  it("shows a quiet placeholder while the normal loads, then the tile", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    routeFetch({
      ...ALL_ROUTES,
      "/v1/normals": async () => {
        await gate;
        return { body: normalsTodayHarare };
      },
    });
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    expect(tree.getByTestId("averages-tile-loading")).toBeTruthy();
    await act(async () => release());
    await waitFor(() => expect(tree.getByLabelText(/^Averages\./)).toBeTruthy());
    expect(tree.queryByTestId("averages-tile-loading")).toBeNull();
    expect(tree.getByText("Normal high 29°")).toBeTruthy();
  });

  it("leaves the Averages tile out when the Worker has no normal, and the Moon spans the row", async () => {
    routeFetch({
      ...ALL_ROUTES,
      "/v1/normals": { body: { available: false, reason: "no_data" } },
    });
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    await waitFor(() =>
      expect(tree.queryByTestId("averages-tile-loading")).toBeNull(),
    );
    expect(tree.queryByLabelText(/^Averages\./)).toBeNull();
    const moon = tree.getByLabelText(/^Moon\./);
    const style = JSON.stringify(moon.props.style);
    // A wide tile has no minimum height (a square one does).
    expect(style).not.toContain('"minHeight":168');
  });

  it("names the moon phase, how much is lit and the next moonrise in the place's clock", async () => {
    routeFetch(ALL_ROUTES);
    const { getByLabelText } = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    const moon = getByLabelText(/^Moon\./);
    // 2026-11-01: a waning moon; Harare is southern hemisphere, UTC+2.
    expect(moon.props.accessibilityLabel).toMatch(/% lit\. Moonrise \d{2}:\d{2}( tomorrow)?\./);
  });
});

describe("opening a tile", () => {
  it("opens the detail with the headline, the next 24 hours and the related readings", async () => {
    routeFetch(ALL_ROUTES);
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    expect(tree.queryByText("Next 24 hours")).toBeNull();
    await fireEvent.press(tree.getByLabelText(/^Wind\./));
    expect(tree.getByText("10 km/h NE")).toBeTruthy();
    expect(tree.getByText("Next 24 hours")).toBeTruthy();
    expect(tree.getByText("Gusts")).toBeTruthy();
    expect(tree.getByText("Beaufort")).toBeTruthy();
    // The chart is one image with a spoken summary.
    expect(
      tree.getByLabelText(/^Wind, next 24 hours\. Wind speed \(km\/h\): from 9 km\/h at Now to 12 km\/h at 01:00/),
    ).toBeTruthy();
  });

  it("closes with the Close button", async () => {
    routeFetch(ALL_ROUTES);
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    await fireEvent.press(tree.getByLabelText(/^Humidity\./));
    expect(tree.getByText("Dew point")).toBeTruthy();
    await fireEvent.press(tree.getByLabelText("Close"));
    expect(tree.queryByText("Dew point")).toBeNull();
  });

  it.each([
    ["Wind", "Wind"],
    ["UV index", "UV index"],
    ["Feels like", "Feels like"],
    ["Visibility", "Visibility"],
    ["Precipitation", "Precipitation"],
    ["Humidity", "Humidity"],
    ["Pressure", "Pressure"],
    ["Sun", "Sun"],
    ["Moon", "Moon"],
  ])("the %s tile is one button that opens its detail", async (label) => {
    routeFetch(ALL_ROUTES);
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    const tile = tree.getByLabelText(new RegExp(`^${label}\\.`));
    expect(tile.props.accessibilityRole).toBe("button");
    expect(tile.props.accessibilityHint).toBe("Opens details");
    await fireEvent.press(tile);
    expect(tree.getAllByText(label, { exact: false }).length).toBeGreaterThan(0);
    expect(tree.getByLabelText("Close")).toBeTruthy();
  });

  it("opens the air-quality detail from its card", async () => {
    routeFetch(ALL_ROUTES);
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    await waitFor(() => expect(tree.getByLabelText(/^Air quality\./)).toBeTruthy());
    await fireEvent.press(tree.getByLabelText(/^Air quality\./));
    expect(tree.getByText("68 Moderate")).toBeTruthy();
    expect(tree.getByText("What it means for you")).toBeTruthy();
    expect(tree.getByText("Pollutants")).toBeTruthy();
  });

  it("opens the Averages detail from its tile and reads the Worker's monthly normals", async () => {
    routeFetch(ALL_ROUTES);
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} slug="harare" />,
    );
    await waitFor(() => expect(tree.getByLabelText(/^Averages\./)).toBeTruthy());
    await fireEvent.press(tree.getByLabelText(/^Averages\./));
    await waitFor(() => expect(tree.getByText("Monthly averages")).toBeTruthy());
    expect(tree.getByLabelText("Temperature")).toBeTruthy();
    expect(tree.getByLabelText("Precipitation")).toBeTruthy();
  });

  it("draws no emoji anywhere, tiles and sheet", async () => {
    routeFetch(ALL_ROUTES);
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} point={POINT} />,
    );
    await waitFor(() => expect(tree.getByText("68")).toBeTruthy());
    await fireEvent.press(tree.getByLabelText(/^UV index\./));
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });
});

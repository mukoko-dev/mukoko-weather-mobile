/**
 * The detail behind every tile, against the recorded forecast: the headline,
 * the sentence, the next 24 hours as a chart where the web has one, the related
 * readings and the plain explanation, in the place's time.
 */

import { fireEvent, render } from "@testing-library/react-native";
import { useState } from "react";

import { MetricDetailSheet } from "@/components/weather/MetricDetailSheet";
import {
  METRIC_CHART,
  METRIC_KINDS,
  METRIC_TITLES,
  type MetricKind,
  metricDetail,
} from "@/shared/metric-details";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
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
const extras = {
  todayHigh: 31,
  normalHigh: 28,
  moonName: "Last quarter",
  moonIlluminationPct: 66,
  moonrise: "00:27 tomorrow",
};

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

const sheet = (kind: MetricKind | null) => (
  <MetricDetailSheet
    kind={kind}
    data={forecast}
    now={NOW}
    extras={extras}
    onClose={jest.fn()}
  />
);

describe("MetricDetailSheet", () => {
  it("draws nothing while no tile is open", async () => {
    const tree = await render(sheet(null));
    expect(tree.queryByText("Close", { exact: false })).toBeNull();
  });

  const withoutAveragesFetch = METRIC_KINDS.filter((k) => k !== "averages");

  it.each(withoutAveragesFetch)(
    "%s: title, headline, sentence, explanation and related readings",
    async (kind) => {
      const tree = await render(sheet(kind));
      const detail = metricDetail(kind, forecast, NOW, extras);
      // The chart's legend can repeat the title ("UV index").
      expect(tree.getAllByText(METRIC_TITLES[kind]).length).toBeGreaterThan(0);
      // A headline can repeat in a related reading ("0 mm", "Last quarter").
      expect(tree.getAllByText(detail.headline).length).toBeGreaterThan(0);
      expect(tree.getByText(detail.sentence)).toBeTruthy();
      expect(tree.getByText(detail.about)).toBeTruthy();
      for (const stat of detail.stats) {
        expect(
          tree.getByLabelText(`${stat.label}: ${stat.value}`),
        ).toBeTruthy();
      }
      expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
    },
  );

  it.each(withoutAveragesFetch.filter((k) => METRIC_CHART[k]))(
    "%s has the next 24 hours as a chart; the others have none",
    async (kind) => {
      const tree = await render(sheet(kind));
      expect(tree.getByText("Next 24 hours")).toBeTruthy();
      // The app's one chart: a single adjustable element with a spoken summary.
      expect(tree.getAllByRole("adjustable").length).toBeGreaterThan(0);
    },
  );

  it("the sun and moon sheets have stats only, as the web's do", async () => {
    for (const kind of ["sun", "moon"] as const) {
      const tree = await render(sheet(kind));
      expect(tree.queryByText("Next 24 hours")).toBeNull();
    }
  });

  it("the UV sheet adds the coming days' peak UV with the WHO category", async () => {
    const tree = await render(sheet("uv"));
    expect(tree.getByText("Peak UV, next days")).toBeTruthy();
    expect(
      tree.getAllByText(/^[\d.]+ (Low|Moderate|High|Very high|Extreme)$/)
        .length,
    ).toBeGreaterThan(1);
  });

  it("the moon sheet gives the phase, the lit part and the moonrise in the place's clock", async () => {
    const tree = await render(sheet("moon"));
    expect(tree.getByLabelText("Phase: Last quarter")).toBeTruthy();
    expect(tree.getByLabelText("Lit: 66%")).toBeTruthy();
    expect(tree.getByLabelText("Moonrise: 00:27 tomorrow")).toBeTruthy();
  });

  it("keeps the last tile's content while it closes, then empties", async () => {
    function Harness() {
      const [kind, setKind] = useState<MetricKind | null>("wind");
      return (
        <MetricDetailSheet
          kind={kind}
          data={forecast}
          now={NOW}
          extras={extras}
          onClose={() => setKind(null)}
        />
      );
    }
    const tree = await render(<Harness />);
    expect(tree.getByText("Beaufort")).toBeTruthy();
    await fireEvent.press(tree.getByLabelText(/^Close/));
    expect(tree.queryByText("Beaufort")).toBeNull();
  });

  it("says the hourly forecast is unavailable instead of drawing an empty chart", async () => {
    const bare = {
      ...forecast,
      hourly: { ...forecast.hourly, time: forecast.hourly.time.slice(0, 1) },
    };
    const tree = await render(
      <MetricDetailSheet
        kind="wind"
        data={bare}
        now={NOW}
        extras={extras}
        onClose={jest.fn()}
      />,
    );
    expect(
      tree.getByText("The hourly forecast is not available right now."),
    ).toBeTruthy();
    expect(tree.queryByText("Next 24 hours")).toBeNull();
  });
});

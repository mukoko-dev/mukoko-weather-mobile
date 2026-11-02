/**
 * The Air quality card and its detail: loading, ready, unavailable with "Try
 * again", the six bands named AND ranged, the pollutants (a gap is "No data"),
 * the WHO comparison and the guidance with its not-medical-advice line.
 */

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AirQualityCard } from "@/components/weather/AirQualityCard";
import { AirQualityDetail } from "@/components/weather/AirQualityDetail";
import { toAirQuality } from "@/api/air-quality";
import { routeFetch } from "@/api/mock-routes";
import airQualityHarare from "@/api/__fixtures__/air-quality-harare.json";
import { AQI_BAND_LABELS, AQI_BANDS } from "@/shared/aqi";
import { AQI_RANGES, GUIDANCE_DISCLAIMER } from "@/shared/air-quality-details";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { HAS_EMOJI, NOW, allText } from "@/test-utils/weather-fixtures";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

const reading = toAirQuality(airQualityHarare)!;

describe("AirQualityCard states", () => {
  it("is a skeleton with a spoken name while it loads", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    routeFetch({
      "/v1/air-quality": async () => {
        await gate;
        return { body: airQualityHarare };
      },
    });
    const tree = await render(
      <AirQualityCard lat={-17.8} lon={31} now={NOW} />,
    );
    const loading = tree.getByTestId("air-quality-loading");
    expect(loading.props.accessibilityLabel).toBe("Loading air quality");
    expect(loading.props.accessibilityState).toEqual({ busy: true });
    await act(async () => release());
    await waitFor(() => expect(tree.getByText("68")).toBeTruthy());
    expect(tree.queryByTestId("air-quality-loading")).toBeNull();
  });

  it("says it is unavailable, in words, and tries again on request", async () => {
    let calls = 0;
    routeFetch({
      "/v1/air-quality": () => {
        calls += 1;
        return calls === 1
          ? { status: 502, body: { error: "upstream" } }
          : { body: airQualityHarare };
      },
    });
    const tree = await render(
      <AirQualityCard lat={-17.8} lon={31} now={NOW} />,
    );
    await waitFor(() =>
      expect(
        tree.getByText("Air quality is unavailable right now."),
      ).toBeTruthy(),
    );
    const retry = tree.getByLabelText("Try again");
    expect(retry.props.accessibilityRole).toBe("button");
    await fireEvent.press(retry);
    await waitFor(() => expect(tree.getByText("68")).toBeTruthy());
    expect(calls).toBe(2);
  });

  it("is unavailable, not zero, when the answer holds no index", async () => {
    routeFetch({ "/v1/air-quality": { body: { error: "x" } } });
    const tree = await render(
      <AirQualityCard lat={-17.8} lon={31} now={NOW} />,
    );
    await waitFor(() =>
      expect(tree.getByTestId("air-quality-unavailable")).toBeTruthy(),
    );
    expect(tree.queryByText("0")).toBeNull();
  });
});

describe("AirQualityDetail", () => {
  const open = (r = reading) =>
    render(<AirQualityDetail open reading={r} now={NOW} onClose={jest.fn()} />);

  it("prints every band's name AND range, and marks the current one", async () => {
    const tree = await open();
    for (const { band, range } of AQI_RANGES) {
      const row = tree.getByLabelText(
        new RegExp(`^${AQI_BAND_LABELS[band]}, ${range.replace("+", "\\+")}`),
      );
      expect(row).toBeTruthy();
    }
    expect(AQI_BANDS).toHaveLength(6);
    expect(
      tree.getByLabelText("Moderate, 51–100, current").props.accessibilityState,
    ).toEqual({ selected: true });
  });

  it("gives the guidance with the not-medical-advice line", async () => {
    const tree = await open();
    expect(tree.getByText("What it means for you")).toBeTruthy();
    expect(tree.getByText(GUIDANCE_DISCLAIMER)).toBeTruthy();
    expect(
      tree.getByText(/Acceptable\. Unusually sensitive people/),
    ).toBeTruthy();
  });

  it("lists the main pollutant first, a gap as No data, and the WHO comparison", async () => {
    const tree = await open();
    const rows = tree.getAllByLabelText(/µg\/m³|No data/);
    expect(rows[0].props.accessibilityLabel).toMatch(
      /^Fine particles, main pollutant, 20\.4 µg\/m³, index 68, 1\.4× the WHO guideline$/,
    );
    expect(tree.getByLabelText("Ammonia, No data")).toBeTruthy();
    expect(
      tree.getByText(/WHO 2021 guidelines are 24-hour values/),
    ).toBeTruthy();
  });

  it("states the source and how fresh the reading is", async () => {
    const tree = await open();
    expect(tree.getByText(/^Source: open-meteo · Updated /)).toBeTruthy();
  });

  it("draws no emoji and has a Close button", async () => {
    const onClose = jest.fn();
    const tree = await render(
      <AirQualityDetail open reading={reading} now={NOW} onClose={onClose} />,
    );
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
    await fireEvent.press(tree.getByLabelText(/^Close/));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while closed", async () => {
    const tree = await render(
      <AirQualityDetail
        open={false}
        reading={reading}
        now={NOW}
        onClose={jest.fn()}
      />,
    );
    expect(tree.queryByText("What it means for you")).toBeNull();
  });
});

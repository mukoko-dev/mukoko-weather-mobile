/**
 * The Averages detail: tabs, the plain comparisons, the chart AND the table
 * (the chart's text alternative), and its states against the Worker.
 */

import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { AveragesDetail } from "@/components/weather/AveragesDetail";
import { routeFetch } from "@/api/mock-routes";
import historyHarare from "@/api/__fixtures__/history-harare.json";
import normalsMonthlyHarare from "@/api/__fixtures__/normals-monthly-harare.json";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { HAS_EMOJI, allText, harareWeather } from "@/test-utils/weather-fixtures";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const forecast = harareWeather().forecast!;
const ROUTES = {
  "/v1/normals/monthly": { body: normalsMonthlyHarare },
  "/v1/history": { body: historyHarare },
};

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

describe("AveragesDetail", () => {
  it("shows a skeleton with a spoken name while it loads", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    routeFetch({
      ...ROUTES,
      "/v1/normals/monthly": async () => {
        await gate;
        return { body: normalsMonthlyHarare };
      },
    });
    const tree = await render(
      <AveragesDetail data={forecast} lat={-17.8} lon={31} />,
    );
    expect(tree.getByLabelText("Loading monthly averages")).toBeTruthy();
    await act(async () => release());
    await waitFor(() => expect(tree.getByText("Monthly averages")).toBeTruthy());
  });

  it("has Temperature and Precipitation tabs, Temperature first and selected", async () => {
    routeFetch(ROUTES);
    const tree = await render(
      <AveragesDetail data={forecast} lat={-17.8} lon={31} />,
    );
    await waitFor(() => expect(tree.getByLabelText("Temperature")).toBeTruthy());
    expect(tree.getByLabelText("Temperature").props.accessibilityState).toEqual({ selected: true });
    expect(tree.getByLabelText("Precipitation").props.accessibilityState).toEqual({ selected: false });
    expect(tree.getByLabelText("Temperature").props.accessibilityRole).toBe("tab");
  });

  it("gives the chart a text alternative: twelve months in a table, this month marked", async () => {
    routeFetch(ROUTES);
    const tree = await render(
      <AveragesDetail data={forecast} lat={-17.8} lon={31} />,
    );
    await waitFor(() => expect(tree.getByText("Monthly averages")).toBeTruthy());
    expect(
      tree.getByLabelText("Jan: average high 25°, average low 16°"),
    ).toBeTruthy();
    // 2026-11-01 is November.
    const nov = tree.getByLabelText(/^Nov: average high .*, this month$/);
    expect(nov.props.accessibilityState).toEqual({ selected: true });
    expect(tree.getAllByLabelText(/^[A-Z][a-z]{2}: average high/)).toHaveLength(12);
  });

  it("switches to rainfall and reads rainy days", async () => {
    routeFetch(ROUTES);
    const tree = await render(
      <AveragesDetail data={forecast} lat={-17.8} lon={31} />,
    );
    await waitFor(() => expect(tree.getByLabelText("Precipitation")).toBeTruthy());
    await fireEvent.press(tree.getByLabelText("Precipitation"));
    expect(tree.getByLabelText("Precipitation").props.accessibilityState).toEqual({ selected: true });
    expect(
      tree.getByLabelText("Jan: average rain 213 mm, 21 rainy days"),
    ).toBeTruthy();
  });

  it("compares the coming week and the recorded days with the normals, in sentences", async () => {
    routeFetch(ROUTES);
    const tree = await render(
      <AveragesDetail data={forecast} lat={-17.8} lon={31} slug="harare" />,
    );
    await waitFor(() => expect(tree.getByText("Monthly averages")).toBeTruthy());
    expect(tree.getByText(/^Next 7 days: highs average \d+° against a normal \d+°\./)).toBeTruthy();
    await waitFor(() =>
      expect(tree.getByText(/^Last 9 recorded days: highs average/)).toBeTruthy(),
    );
  });

  it("asks for recorded days only for a place with a slug", async () => {
    const calls = routeFetch(ROUTES);
    await render(<AveragesDetail data={forecast} lat={-17.8} lon={31} />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls.some((c) => c.url.includes("/v1/history"))).toBe(false);
  });

  it("states the period and source, and what a dash means", async () => {
    routeFetch(ROUTES);
    const tree = await render(
      <AveragesDetail data={forecast} lat={-17.8} lon={31} />,
    );
    await waitFor(() =>
      expect(
        tree.getByText(
          "Averages for 1991–2020, ERA5 via Open-Meteo, 1991–2020. A dash means no average is available.",
        ),
      ).toBeTruthy(),
    );
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("says it is unavailable, with Try again, when the Worker has no normals", async () => {
    let calls = 0;
    routeFetch({
      ...ROUTES,
      "/v1/normals/monthly": () => {
        calls += 1;
        return calls === 1
          ? { body: { available: false, reason: "upstream_error" } }
          : { body: normalsMonthlyHarare };
      },
    });
    const tree = await render(
      <AveragesDetail data={forecast} lat={-17.8} lon={31} />,
    );
    await waitFor(() =>
      expect(
        tree.getByText("Monthly averages are unavailable for this place right now."),
      ).toBeTruthy(),
    );
    await fireEvent.press(tree.getByLabelText("Try again"));
    await waitFor(() => expect(tree.getByText("Monthly averages")).toBeTruthy());
  });

  it("is unavailable at once, with no request, without a point", async () => {
    const calls = routeFetch(ROUTES);
    const tree = await render(<AveragesDetail data={forecast} />);
    expect(tree.getByTestId("averages-unavailable")).toBeTruthy();
    expect(calls).toHaveLength(0);
    expect(tree.queryByLabelText("Try again")).toBeNull();
  });
});

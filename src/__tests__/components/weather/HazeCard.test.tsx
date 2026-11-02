/**
 * The Haze card is a notice: drawn only when there is haze (or an active haze
 * season with elevated readings), nothing otherwise, never an empty card.
 */

import { render, waitFor } from "@testing-library/react-native";

import { HazeBody, HazeCard } from "@/components/weather/HazeCard";
import { toHaze } from "@/api/haze";
import { routeFetch } from "@/api/mock-routes";
import hazeHarare from "@/api/__fixtures__/haze-harare.json";
import { HAS_EMOJI, allText } from "@/test-utils/weather-fixtures";
import { setWindow } from "@/test-utils/mocks";

beforeEach(() => setWindow(393, 852));

describe("HazeCard", () => {
  it("draws the recorded light smog with its level in words, the bar, the stats and the advice", async () => {
    routeFetch({ "/v1/haze": { body: hazeHarare } });
    const tree = await render(<HazeCard lat={-17.8} lon={31} />);
    await waitFor(() => expect(tree.getByTestId("haze-card")).toBeTruthy());
    expect(tree.getByText("Light smog")).toBeTruthy();
    expect(tree.getByLabelText("Smog, Light level")).toBeTruthy();
    expect(tree.getByLabelText("Visibility: 32.2 km")).toBeTruthy();
    expect(tree.getByLabelText("PM2.5: 20 µg/m³")).toBeTruthy();
    expect(
      tree.getByText("Sensitive groups should cut back on prolonged outdoor exertion."),
    ).toBeTruthy();
    expect(tree.getByText(/Worst around 06:00/)).toBeTruthy();
    expect(tree.getByText(/Southern African burning season · Jun–Oct \(out of season now\)/)).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it.each([
    ["no haze", { ...hazeHarare, level: "none", type: "clear", season: null }],
    ["mist out of season", { ...hazeHarare, type: "mist" }],
    ["an unavailable answer", { available: false, reason: "circuit_open" }],
  ])("draws nothing for %s", async (_name, body) => {
    routeFetch({ "/v1/haze": { body } });
    const tree = await render(<HazeCard lat={-17.8} lon={31} />);
    await waitFor(() =>
      expect(JSON.stringify(tree.toJSON())).toBe("null"),
    );
  });

  it("draws nothing when the request fails (no empty card, no error card)", async () => {
    routeFetch({ "/v1/haze": { status: 500, body: {} } });
    const tree = await render(<HazeCard lat={-17.8} lon={31} />);
    await waitFor(() => expect(tree.toJSON()).toBeNull());
  });

  it("names a heavier level, shows dust when it is dust or 10 µg/m³ or more, and the official line", async () => {
    const data = toHaze({
      available: true,
      level: "heavy",
      type: "dust",
      headline: "Heavy dust",
      dust: 120,
      pm25: 80,
      visibilityKm: 2.5,
      advice: [],
      official: { source: "NEA Singapore", metric: "PSI", value: 142, band: "Unhealthy", region: "West" },
      attribution: "Test attribution",
      fetchedAt: "2026-11-01T00:00:00Z",
    });
    const tree = await render(<HazeBody data={data} />);
    expect(tree.getByLabelText("Dust, Heavy level")).toBeTruthy();
    expect(tree.getByLabelText("Dust: 120 µg/m³")).toBeTruthy();
    expect(tree.getByText("NEA Singapore PSI 142 · Unhealthy · West")).toBeTruthy();
    expect(tree.getByText("Test attribution")).toBeTruthy();
  });
});

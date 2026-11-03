/**
 * Saving a place records place_saved with a coarse place only: the country
 * code and a ~39 x 20 km cell, never the name, the slug or the coordinate,
 * and never what the person typed into the search field.
 */

import { fireEvent, render } from "@testing-library/react-native";

import { mockFetch } from "@/api/mock-fetch";
import search from "@/api/__fixtures__/search-harare.json";
import { SavedLocationsSection } from "@/components/settings/SavedLocationsSection";
import { __resetPreferencesForTests } from "@/state/preferences";

const mockTrack = jest.fn();
jest.mock("@/analytics", () => ({
  ...jest.requireActual("@/analytics"),
  track: (...args: unknown[]) => mockTrack(...args),
}));

describe("SavedLocationsSection analytics", () => {
  beforeEach(() => {
    mockTrack.mockClear();
    __resetPreferencesForTests();
  });

  it("records place_saved from search, with a coarse place", async () => {
    mockFetch({ status: 200, body: search });
    const screen = await render(<SavedLocationsSection />);

    await fireEvent.changeText(
      screen.getByLabelText("Search to add a location"),
      "Harare",
    );
    // The search is debounced (250 ms); findBy waits for the results.
    await fireEvent.press(await screen.findByLabelText("Add Harare"));

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("place_saved", {
      method: "search",
      savedCount: 1,
      place: { country: "ZW", cell: "ksy4" },
    });
    expect(JSON.stringify(mockTrack.mock.calls)).not.toMatch(
      /Harare|harare|17\.8|31\.0/,
    );
  });
});

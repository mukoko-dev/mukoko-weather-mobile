/**
 * The activity picker: the grid of tiles, the category chips and the search,
 * the selection stored on the device, and its states (empty search, the
 * built-in list when the Worker cannot be reached).
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import activitiesFixture from "@/api/__fixtures__/activities.json";
import categoriesFixture from "@/api/__fixtures__/activity-categories.json";
import { resetActivityCaches } from "@/api/activities";
import { mockFetch } from "@/api/mock-fetch";
import { ActivityPickerSheet } from "@/components/weather/ActivityPickerSheet";
import { ACTIVITIES } from "@/shared/activities";
import { toggleActivity } from "@/state/preferences";
import { resetPreferences } from "@/test-utils/preferences";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { HAS_EMOJI, allText } from "@/test-utils/weather-fixtures";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

beforeEach(async () => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  resetActivityCaches();
  await resetPreferences();
});

function live() {
  return mockFetch({ body: activitiesFixture }, { body: categoriesFixture });
}

describe("ActivityPickerSheet", () => {
  it("shows a tile for every activity, with the title, the privacy line and Done", async () => {
    live();
    const tree = await render(
      <ActivityPickerSheet visible onClose={jest.fn()} />,
    );
    expect(tree.getByText("Choose activities")).toBeTruthy();
    expect(
      tree.getByText(/stay on this device and are never sent anywhere/),
    ).toBeTruthy();
    expect(tree.getByText("None selected")).toBeTruthy();
    for (const a of ACTIVITIES) {
      expect(tree.getByTestId(`activity-tile-${a.id}`)).toBeTruthy();
    }
    expect(tree.getByLabelText("Done")).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("toggles an activity on and off, says selected, and counts", async () => {
    live();
    const tree = await render(
      <ActivityPickerSheet visible onClose={jest.fn()} />,
    );
    const tile = () => tree.getByTestId("activity-tile-football");
    expect(tile().props.accessibilityState.selected).toBe(false);
    await fireEvent.press(tile());
    await waitFor(() =>
      expect(tile().props.accessibilityState.selected).toBe(true),
    );
    expect(tree.getByText("1 selected")).toBeTruthy();
    expect(tile().props.accessibilityHint).toBe("Double tap to remove");
    await fireEvent.press(tile());
    await waitFor(() => expect(tree.getByText("None selected")).toBeTruthy());
  });

  it("counts several picks", async () => {
    live();
    toggleActivity("football");
    toggleActivity("driving");
    const tree = await render(
      <ActivityPickerSheet visible onClose={jest.fn()} />,
    );
    await waitFor(() => expect(tree.getByText("2 selected")).toBeTruthy());
  });

  it("narrows by category", async () => {
    live();
    const tree = await render(
      <ActivityPickerSheet visible onClose={jest.fn()} />,
    );
    await fireEvent.press(tree.getByLabelText("Sports & Fitness"));
    expect(tree.getByTestId("activity-tile-football")).toBeTruthy();
    expect(tree.queryByTestId("activity-tile-crop-farming")).toBeNull();
  });

  it("narrows by search and shows an empty state with a way back", async () => {
    live();
    const tree = await render(
      <ActivityPickerSheet visible onClose={jest.fn()} />,
    );
    await fireEvent.changeText(
      tree.getByLabelText("Search activities"),
      "braai",
    );
    expect(tree.getByTestId("activity-tile-barbecue")).toBeTruthy();
    expect(tree.queryByTestId("activity-tile-football")).toBeNull();

    await fireEvent.changeText(
      tree.getByLabelText("Search activities"),
      "zzzz nothing",
    );
    expect(tree.getByText('No activities match "zzzz nothing".')).toBeTruthy();
    await fireEvent.press(tree.getByLabelText("Show all activities"));
    expect(tree.getByTestId("activity-tile-football")).toBeTruthy();
  });

  it("says so, and still works, when the Worker cannot be reached", async () => {
    mockFetch(
      { status: 503, body: { error: "unavailable" } },
      { status: 503, body: { error: "unavailable" } },
    );
    const tree = await render(
      <ActivityPickerSheet visible onClose={jest.fn()} />,
    );
    await waitFor(() =>
      expect(
        tree.getByText(/Could not reach the weather service/),
      ).toBeTruthy(),
    );
    expect(tree.getByTestId("activity-tile-football")).toBeTruthy();
  });

  it("closes from Done and from Close", async () => {
    live();
    const onClose = jest.fn();
    const tree = await render(
      <ActivityPickerSheet visible onClose={onClose} />,
    );
    await fireEvent.press(tree.getByLabelText("Done"));
    await fireEvent.press(tree.getByLabelText("Close Choose activities"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("makes no request while closed", async () => {
    const calls = mockFetch();
    await render(<ActivityPickerSheet visible={false} onClose={jest.fn()} />);
    expect(calls).toHaveLength(0);
  });

  it("sends only plain reads of the lists: never the picks", async () => {
    toggleActivity("football");
    const calls = live();
    await render(<ActivityPickerSheet visible onClose={jest.fn()} />);
    await waitFor(() => expect(calls).toHaveLength(2));
    for (const c of calls) {
      expect(c.method).toBe("GET");
      expect(c.url).not.toContain("football");
      expect(c.body).toBeUndefined();
    }
  });
});

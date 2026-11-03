/**
 * The My tab's Activities block: the picked activities by name and the button
 * to the shared picker (one picker, not two).
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import activitiesFixture from "@/api/__fixtures__/activities.json";
import categoriesFixture from "@/api/__fixtures__/activity-categories.json";
import { resetActivityCaches } from "@/api/activities";
import {
  ActivitySelector,
  pickedNames,
} from "@/components/settings/ActivitySelector";
import { toggleActivity } from "@/state/preferences";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { resetPreferences } from "@/test-utils/preferences";
import { routedFetch } from "@/test-utils/routed-fetch";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

beforeEach(async () => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  resetActivityCaches();
  await resetPreferences();
  routedFetch({
    "GET /v1/activities": { status: 503, body: { error: "unavailable" } },
  });
});

describe("pickedNames", () => {
  it("names the picks in the order they were picked, skipping ids it does not know", () => {
    expect(pickedNames(["football", "no-such-thing", "driving"])).toEqual([
      "Soccer (Football)",
      "Driving",
    ]);
    expect(pickedNames([])).toEqual([]);
  });

  it("reads names from the list it is given (the Worker's), not only the seed", () => {
    const catalogue = [
      { id: "sky-lanterns", label: "Sky lanterns", category: "casual" },
    ] as never;
    expect(pickedNames(["sky-lanterns", "football"], catalogue)).toEqual([
      "Sky lanterns",
    ]);
  });
});

describe("ActivitySelector", () => {
  it("says nothing is picked, and offers to choose", async () => {
    const tree = await render(<ActivitySelector />);
    expect(tree.getByText("No activities picked yet.")).toBeTruthy();
    expect(tree.getByLabelText("Choose activities")).toBeTruthy();
  });

  it("names a pick the Worker added that the shipped seed does not have", async () => {
    resetActivityCaches();
    routedFetch({
      "GET /v1/activities": (call: { url: string }) => ({
        body: call.url.includes("mode=categories")
          ? categoriesFixture
          : {
              activities: [
                ...(activitiesFixture.activities as object[]),
                {
                  id: "sky-lanterns",
                  label: "Sky lanterns",
                  category: "casual",
                  description: "Lantern night",
                  icon: "sparkles",
                  relevantTags: [],
                },
              ],
            },
      }),
    });
    toggleActivity("sky-lanterns");
    const tree = await render(<ActivitySelector />);
    await waitFor(() => expect(tree.getByText("Sky lanterns")).toBeTruthy());
    expect(tree.queryByText("No activities picked yet.")).toBeNull();
    expect(tree.getByLabelText("Change activities, 1 picked")).toBeTruthy();
  });

  it("lists the picks and opens the shared picker", async () => {
    toggleActivity("football");
    const tree = await render(<ActivitySelector />);
    await waitFor(() =>
      expect(tree.getByText("Soccer (Football)")).toBeTruthy(),
    );
    await fireEvent.press(tree.getByLabelText("Change activities, 1 picked"));
    expect(await tree.findByTestId("activity-picker")).toBeTruthy();
  });
});

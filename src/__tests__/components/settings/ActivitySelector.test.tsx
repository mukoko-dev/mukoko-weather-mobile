/**
 * The My tab's Activities block: the picked activities by name and the button
 * to the shared picker (one picker, not two).
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";

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
});

describe("ActivitySelector", () => {
  it("says nothing is picked, and offers to choose", async () => {
    const tree = await render(<ActivitySelector />);
    expect(tree.getByText("No activities picked yet.")).toBeTruthy();
    expect(tree.getByLabelText("Choose activities")).toBeTruthy();
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

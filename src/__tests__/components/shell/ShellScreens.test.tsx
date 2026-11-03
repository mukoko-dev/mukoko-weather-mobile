/**
 * The shell's screens: a Locations card's accessible name and actions, the
 * ⋯ menu (Shamwari hidden while paused, each row going where it says), and
 * the map placeholder's way back.
 */

import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import MapPlaceholder from "@/app/map";
import MenuSheet from "@/app/menu";
import { LocationWeatherCard } from "@/components/shell/LocationWeatherCard";
import { IPHONE_INSETS, setInsets } from "@/test-utils/mocks";

jest.mock("expo-router", () => ({
  router: {
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => ({ slug: "harare" }),
}));
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  jest.clearAllMocks();
});

describe("LocationWeatherCard", () => {
  const summary = {
    temperature: 25.4,
    high: 27,
    low: 17,
    condition: "Clear sky",
    family: "clear-day" as const,
    localTime: "14:00",
  };

  it("reads as one sentence and opens the place", async () => {
    const onPress = jest.fn();
    const onMore = jest.fn();
    const tree = await render(
      <LocationWeatherCard
        name="Harare"
        summary={summary}
        isHome
        onPress={onPress}
        onMore={onMore}
      />,
    );
    await fireEvent.press(
      tree.getByRole("button", {
        name: "Harare, 25°, Clear sky, high 27 low 17, Home",
      }),
    );
    expect(onPress).toHaveBeenCalled();
    await fireEvent.press(
      tree.getByRole("button", { name: "Actions for Harare" }),
    );
    expect(onMore).toHaveBeenCalled();
  });

  it("has no actions for My Location and says when weather is loading", async () => {
    const tree = await render(
      <LocationWeatherCard
        name="Braeside"
        summary={null}
        loading
        isCurrent
        onPress={jest.fn()}
      />,
    );
    expect(tree.queryByLabelText(/Actions for/)).toBeNull();
    expect(
      tree.getByRole("button", { name: "Braeside, loading weather" }),
    ).toBeTruthy();
  });
});

describe("MenuSheet", () => {
  it("lists the app's destinations without the paused Shamwari", async () => {
    const tree = await render(<MenuSheet />);
    for (const label of [
      "My Location",
      "Weather map",
      "Saved locations",
      "Explore",
      "My Weather",
    ]) {
      expect(tree.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(tree.queryByText("Shamwari")).toBeNull();
    expect(tree.getByLabelText("mukoko weather")).toBeTruthy();
  });

  it("closes into the chosen screen", async () => {
    const tree = await render(<MenuSheet />);
    await fireEvent.press(tree.getByRole("button", { name: "Explore" }));
    expect(router.dismissTo).toHaveBeenCalledWith("/explore");
    await fireEvent.press(tree.getByRole("button", { name: "Weather map" }));
    expect(router.replace).toHaveBeenCalledWith("/map");
    // (rendered outside the shell, so there is no place under the menu)
    await fireEvent.press(tree.getByRole("button", { name: "Close menu" }));
    expect(router.back).toHaveBeenCalled();
  });
});

describe("MapPlaceholder", () => {
  it("names the place, says why there is no map yet, and goes back", async () => {
    const tree = await render(<MapPlaceholder />);
    expect(tree.getByText("The map for Harare is coming")).toBeTruthy();
    await fireEvent.press(
      tree.getByRole("button", { name: "Back to the weather" }),
    );
    expect(router.back).toHaveBeenCalled();
  });
});

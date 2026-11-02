/**
 * The app shell: the brand mark on the sky, the floating bar (Map, the
 * places lane, Locations) with its accessibility contract, the swipe rule,
 * and the bar mounted by AppChrome only where the web draws it.
 */

import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { Text } from "react-native";

import { MukokoLogo } from "@/components/MukokoLogo";
import { AppChrome, placeSlugOf } from "@/components/shell/AppChrome";
import { BottomBar } from "@/components/shell/BottomBar";
import { useShell } from "@/components/shell/ShellContext";
import {
  SWIPE_ACTIVATE_DP,
  swipeActiveOffsetX,
  swipeTarget,
} from "@/components/shell/useLocationSwipe";
import { laneChips, pagerSequence } from "@/shared/location-pager";
import { IPHONE_INSETS, setInsets } from "@/test-utils/mocks";
import { BAR, barClearance } from "@/theme/shell";

let mockPathname = "/";
jest.mock("expo-router", () => ({
  ...require("@/test-utils/mocks").routerMock(),
  router: {
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  usePathname: () => mockPathname,
}));
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);
jest.mock("expo-glass-effect", () => ({
  GlassView: () => null,
  isLiquidGlassAvailable: () => false,
}));

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  mockPathname = "/";
  jest.clearAllMocks();
});

describe("MukokoLogo", () => {
  it("says mukoko weather, with the weather wordmark, on the sky too", async () => {
    const tree = await render(<MukokoLogo onSky />);
    expect(tree.getByLabelText("mukoko weather")).toBeTruthy();
    expect(tree.getByText("weather")).toBeTruthy();
  });
});

describe("BottomBar", () => {
  const chips = laneChips(pagerSequence(["harare", "nairobi-ke"]), (s) =>
    s === "harare" ? "Harare" : "Nairobi",
  );

  async function bar(activeIndex = 1, activeId: "none" | "locations" = "none") {
    const handlers = {
      onChipPress: jest.fn(),
      onMap: jest.fn(),
      onLocations: jest.fn(),
    };
    const tree = await render(
      <BottomBar
        chips={chips}
        activeIndex={activeIndex}
        activeId={activeId}
        hasMapLocation
        {...handlers}
      />,
    );
    return { tree, ...handlers };
  }

  it("pins Map and Locations around My Location and the saved places", async () => {
    const { tree } = await bar();
    expect(tree.getByRole("button", { name: "Weather map" })).toBeTruthy();
    expect(tree.getByRole("button", { name: "All locations" })).toBeTruthy();
    expect(tree.getByRole("button", { name: "My Location" })).toBeTruthy();
    expect(tree.getByRole("button", { name: "Harare" })).toBeTruthy();
    expect(tree.getByRole("button", { name: "Nairobi" })).toBeTruthy();
  });

  it("marks exactly the current page as selected", async () => {
    const { tree } = await bar(1);
    const selected = tree
      .getAllByRole("button")
      .filter((b) => b.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe("Harare");
  });

  it("marks Locations on the Locations list and no chip", async () => {
    const { tree } = await bar(-1, "locations");
    const selected = tree
      .getAllByRole("button")
      .filter((b) => b.props.accessibilityState?.selected);
    expect(selected.map((b) => b.props.accessibilityLabel)).toEqual([
      "All locations",
    ]);
  });

  it("routes each press", async () => {
    const { tree, onChipPress, onMap, onLocations } = await bar();
    await fireEvent.press(tree.getByRole("button", { name: "Nairobi" }));
    expect(onChipPress).toHaveBeenCalledWith(chips[2]);
    await fireEvent.press(tree.getByRole("button", { name: "Weather map" }));
    expect(onMap).toHaveBeenCalled();
    await fireEvent.press(tree.getByRole("button", { name: "All locations" }));
    expect(onLocations).toHaveBeenCalled();
  });
});

describe("swipe", () => {
  const seq = pagerSequence(["harare", "nairobi-ke"]);

  it("activates only towards a page that exists", () => {
    const d = SWIPE_ACTIVATE_DP;
    expect(swipeActiveOffsetX("/", seq)).toBe(-d); // left only
    expect(swipeActiveOffsetX("/location/harare", seq)).toEqual([-d, d]);
    expect(swipeActiveOffsetX("/location/nairobi-ke", seq)).toBe(d); // right only
    expect(swipeActiveOffsetX("/location/gweru", seq)).toBeNull();
    expect(swipeActiveOffsetX("/", pagerSequence([]))).toBeNull();
  });

  it("left is the next page, right the previous, stopping at the ends", () => {
    expect(swipeTarget("/", seq, -120, 0)).toBe("/harare");
    expect(swipeTarget("/location/harare", seq, -120, 0)).toBe("/nairobi-ke");
    expect(swipeTarget("/location/harare", seq, 120, 0)).toBe("/");
    expect(swipeTarget("/", seq, 120, 0)).toBeNull();
    expect(swipeTarget("/location/nairobi-ke", seq, -120, 0)).toBeNull();
    expect(swipeTarget("/", seq, -40, 0)).toBeNull();
    expect(swipeTarget("/explore", seq, -120, 0)).toBeNull();
  });
});

describe("AppChrome", () => {
  it("keeps the bar for the page under a sheet", async () => {
    const tree = await render(
      <AppChrome>
        <Text>page</Text>
      </AppChrome>,
    );
    expect(tree.getByTestId("bottom-bar")).toBeTruthy();
    mockPathname = "/menu";
    await tree.rerender(
      <AppChrome>
        <Text>page</Text>
      </AppChrome>,
    );
    expect(tree.getByTestId("bottom-bar")).toBeTruthy();
  });

  function Probe() {
    const { clearance } = useShell();
    return <Text testID="clearance">{String(clearance)}</Text>;
  }

  it("draws the bar on home and leaves its clearance", async () => {
    const tree = await render(
      <AppChrome>
        <Probe />
      </AppChrome>,
    );
    expect(tree.getByTestId("bottom-bar")).toBeTruthy();
    expect(tree.getByTestId("clearance").props.children).toBe(
      String(barClearance(IPHONE_INSETS.bottom)),
    );
    expect(barClearance(0)).toBe(BAR.lift + BAR.height + BAR.breath);
  });

  it("draws no bar on a sub-page", async () => {
    mockPathname = "/location/harare/forecast";
    const tree = await render(
      <AppChrome>
        <Probe />
      </AppChrome>,
    );
    expect(tree.queryByTestId("bottom-bar")).toBeNull();
    expect(tree.getByTestId("clearance").props.children).toBe("0");
  });

  it("opens the map for the place on screen and Locations from a place", async () => {
    mockPathname = "/location/harare";
    const tree = await render(
      <AppChrome>
        <Probe />
      </AppChrome>,
    );
    await fireEvent.press(tree.getByRole("button", { name: "Weather map" }));
    expect(router.push).toHaveBeenCalledWith("/map?slug=harare");
    await fireEvent.press(tree.getByRole("button", { name: "All locations" }));
    expect(router.dismissTo).toHaveBeenCalledWith("/locations");
    expect(placeSlugOf("/location/harare/forecast")).toBe("harare");
    expect(placeSlugOf("/explore")).toBeNull();
  });

  it("goes back to My Location from a place", async () => {
    mockPathname = "/location/harare";
    const tree = await render(
      <AppChrome>
        <Probe />
      </AppChrome>,
    );
    await fireEvent.press(tree.getByRole("button", { name: "My Location" }));
    expect(router.dismissTo).toHaveBeenCalledWith("/");
  });
});

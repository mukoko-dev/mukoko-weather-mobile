/**
 * The swipe frame mounts its gestures around the page inside the gesture
 * root (the native recognisers themselves can only be driven on a device).
 */

import "react-native-gesture-handler/jestSetup";
import { fireEvent, render } from "@testing-library/react-native";
import { useEffect } from "react";
import { ScrollView, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { NoSwipeZone } from "@/components/shell/NoSwipeZone";
import { ShellContext } from "@/components/shell/ShellContext";
import { SwipeFrame } from "@/components/shell/SwipeFrame";
import { WeatherScroll } from "@/components/weather/WeatherScroll";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("expo-status-bar", () =>
  require("@/test-utils/mocks").statusBarMock(),
);
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

describe("SwipeFrame", () => {
  it("renders the page and what sits over it", async () => {
    const tree = await render(
      <GestureHandlerRootView>
        <SwipeFrame
          swipe={{ activeOffsetX: [-12, 12], onSwipe: jest.fn() }}
          noSwipe={{ current: false }}
          style={{ flex: 1 }}
          scroll={
            <ScrollView>
              <Text>page</Text>
            </ScrollView>
          }
        >
          <Text>scrim</Text>
        </SwipeFrame>
      </GestureHandlerRootView>,
    );
    expect(tree.getByText("page")).toBeTruthy();
    expect(tree.getByText("scrim")).toBeTruthy();
  });
});

describe("NoSwipeZone", () => {
  it("marks a touch that starts inside it", async () => {
    const markNoSwipe = jest.fn();
    const tree = await render(
      <ShellContext.Provider
        value={{ clearance: 0, basePath: "/", inShell: true, markNoSwipe }}
      >
        <NoSwipeZone testID="zone">
          <Text>strip</Text>
        </NoSwipeZone>
      </ShellContext.Provider>,
    );
    await fireEvent(tree.getByTestId("zone"), "touchStart");
    expect(markNoSwipe).toHaveBeenCalled();
  });
});

describe("SwipeFrame with no swipe", () => {
  it("keeps the same tree, the pan off", async () => {
    const tree = await render(
      <GestureHandlerRootView>
        <SwipeFrame
          noSwipe={{ current: false }}
          style={{ flex: 1 }}
          scroll={
            <ScrollView>
              <Text>page</Text>
            </ScrollView>
          }
        />
      </GestureHandlerRootView>,
    );
    expect(tree.getByText("page")).toBeTruthy();
  });
});

describe("WeatherScroll in the shell", () => {
  it("does not remount the page when swiping turns on or off", async () => {
    let mounts = 0;
    function Child() {
      useEffect(() => {
        mounts += 1;
      }, []);
      return <Text>card</Text>;
    }
    const base = {
      clearance: 0,
      basePath: "/",
      inShell: true,
      noSwipe: { current: false },
    };
    const page = (swipe?: { activeOffsetX: number; onSwipe: () => void }) => (
      <GestureHandlerRootView>
        <ShellContext.Provider value={{ ...base, swipe }}>
          <WeatherScroll family="clear-day">
            <Child />
          </WeatherScroll>
        </ShellContext.Provider>
      </GestureHandlerRootView>
    );
    const tree = await render(page({ activeOffsetX: -12, onSwipe: jest.fn() }));
    await tree.rerender(page(undefined));
    await tree.rerender(page({ activeOffsetX: 12, onSwipe: jest.fn() }));
    expect(tree.getByText("card")).toBeTruthy();
    expect(mounts).toBe(1);
  });
});

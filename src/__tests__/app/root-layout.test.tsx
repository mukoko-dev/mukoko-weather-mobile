/**
 * The app never waits on a load before it shows (issue #94): the shell is on
 * screen on the first frame while the brand fonts load, and the native splash
 * is covering it for FONT_WAIT_MS at most.
 */

import { act, render } from "@testing-library/react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import type { ReactNode } from "react";

jest.mock("expo-font", () => ({ useFonts: jest.fn() }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));

/** How many times the shell's Stack has mounted (the mock counts on mount). */
const mounts = () => (globalThis as { __mounts?: number }).__mounts ?? 0;
jest.mock("expo-router", () => {
  const R = require("react");
  const { View } = require("react-native");
  function Probe() {
    R.useEffect(() => {
      const g = globalThis as { __mounts?: number };
      g.__mounts = (g.__mounts ?? 0) + 1;
    }, []);
    return R.createElement(View, { testID: "stack" });
  }
  const Stack = Object.assign(() => R.createElement(Probe), {
    Screen: () => null,
  });
  return {
    DarkTheme: {},
    DefaultTheme: {},
    Stack,
    ThemeProvider: ({ children }: { children: unknown }) => children,
  };
});
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("@/analytics", () => ({ recordAppOpen: jest.fn() }));
jest.mock("@/api/auth", () => ({ initAuth: jest.fn() }));
jest.mock("@/device/register", () => ({ registerDevice: jest.fn() }));
jest.mock("@/components/BrandStripe", () => ({ BrandStripe: () => null }));
jest.mock("@/components/shell/AppChrome", () => ({
  AppChrome: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("@/components/shell/ModalGuard", () => ({ ModalGuard: () => null }));

import RootLayout from "@/app/_layout";

const fonts = useFonts as jest.Mock;
const hide = SplashScreen.hideAsync as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (globalThis as { __mounts?: number }).__mounts = 0;
});
afterEach(() => {
  jest.useRealTimers();
});

it("renders the shell on the first frame while the fonts are still loading", async () => {
  fonts.mockReturnValue([false, null]);
  const tree = await render(<RootLayout />);
  expect(tree.getByTestId("stack")).toBeTruthy();
  // The splash is still up: nothing has hidden it yet.
  expect(hide).not.toHaveBeenCalled();
});

it("hides the splash as soon as the fonts are ready, and never remounts", async () => {
  fonts.mockReturnValue([false, null]);
  const tree = await render(<RootLayout />);
  fonts.mockReturnValue([true, null]);
  await tree.rerender(<RootLayout />);
  expect(hide).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(mounts()).toBe(1);
});

it("hides the splash after 400 ms even if the fonts have not loaded", async () => {
  fonts.mockReturnValue([false, null]);
  await render(<RootLayout />);
  await act(async () => {
    jest.advanceTimersByTime(399);
  });
  expect(hide).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(2);
  });
  expect(hide).toHaveBeenCalledTimes(1);
});

it("remounts the shell once when the fonts arrive after the splash went", async () => {
  fonts.mockReturnValue([false, null]);
  const tree = await render(<RootLayout />);
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
  expect(mounts()).toBe(1);
  fonts.mockReturnValue([true, null]);
  await tree.rerender(<RootLayout />);
  expect(mounts()).toBe(2);
});

it("does not wait for fonts that failed to load", async () => {
  fonts.mockReturnValue([false, new Error("no font")]);
  const tree = await render(<RootLayout />);
  expect(tree.getByTestId("stack")).toBeTruthy();
  expect(hide).toHaveBeenCalledTimes(1);
});

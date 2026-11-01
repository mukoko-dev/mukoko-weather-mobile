/**
 * Shared test doubles for the weather screens. A test file mounts them with
 * `jest.mock("<module>", () => require("../helpers/mocks").<factory>())`.
 *
 * The safe-area insets and the window size are read from `globalThis` at call
 * time, so one test file can render the same screen at several phone sizes.
 */

import * as React from "react";
import { Dimensions } from "react-native";

export type Insets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

const ZERO: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

/** A modern iPhone in portrait: status bar and home indicator. */
export const IPHONE_INSETS: Insets = { top: 47, bottom: 34, left: 0, right: 0 };

export function setInsets(insets: Insets) {
  (globalThis as { __insets?: Insets }).__insets = insets;
}

export function routerMock() {
  return {
    router: {
      navigate: jest.fn(),
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
      canGoBack: jest.fn(() => true),
    },
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(cb, [cb]);
    },
  };
}

export function safeAreaMock() {
  return {
    useSafeAreaInsets: () =>
      (globalThis as { __insets?: Insets }).__insets ?? ZERO,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  };
}

export function statusBarMock() {
  return { setStatusBarStyle: jest.fn(), StatusBar: () => null };
}

/** Make `useWindowDimensions` report this window (a phone width and text size). */
export function setWindow(width: number, height: number, fontScale = 1) {
  const metrics = { width, height, scale: 3, fontScale };
  (
    Dimensions as unknown as {
      set: (d: { window: typeof metrics; screen: typeof metrics }) => void;
    }
  ).set({ window: metrics, screen: metrics });
}

/** The phone widths the owner named, in points. */
export const PHONE_WIDTHS = [320, 375, 393, 430] as const;

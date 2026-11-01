/**
 * The page container: gutter, safe areas, sky and status bar, at the phone
 * widths the owner named (320, 375, 393 and 430 pt) and in landscape.
 */

import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { setStatusBarStyle } from "expo-status-bar";

import {
  WeatherScroll,
  pagePadding,
  STATUS_SCRIM,
} from "@/components/weather/WeatherScroll";
import { SIZE, SPACE } from "@/theme/mzizi";

import {
  IPHONE_INSETS,
  PHONE_WIDTHS,
  setInsets,
  setWindow,
} from "@/test-utils/mocks";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("expo-status-bar", () =>
  require("@/test-utils/mocks").statusBarMock(),
);
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

type Node = {
  type: string;
  props: Record<string, unknown>;
  children?: (Node | string)[] | null;
};

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, s) => ({ ...acc, ...flatten(s) }),
      {},
    );
  }
  return (style ?? {}) as Record<string, unknown>;
}

function find(
  node: Node | string | null,
  test: (s: Record<string, unknown>) => boolean,
): Record<string, unknown>[] {
  if (!node || typeof node === "string") return [];
  const own = test(flatten(node.props?.style))
    ? [flatten(node.props.style)]
    : [];
  return own.concat((node.children ?? []).flatMap((c) => find(c, test)));
}

describe("pagePadding", () => {
  it("is the 16 dp gutter plus nothing when there is no inset", () => {
    expect(
      pagePadding({ top: 0, bottom: 0, left: 0, right: 0 }, false),
    ).toEqual({
      paddingTop: 0,
      paddingLeft: SPACE.gutter,
      paddingRight: SPACE.gutter,
      paddingBottom: SPACE.section,
    });
  });

  it("clears the status bar and the home indicator", () => {
    const p = pagePadding(IPHONE_INSETS, false);
    expect(p.paddingTop).toBe(47);
    expect(p.paddingBottom).toBe(SPACE.section + 34);
  });

  it("leaves the home indicator to the tab bar inside tabs", () => {
    expect(pagePadding(IPHONE_INSETS, true).paddingBottom).toBe(SPACE.section);
  });

  it("never sits under a landscape notch: the gutter is at least the inset", () => {
    const p = pagePadding({ top: 0, bottom: 21, left: 59, right: 59 }, false);
    expect(p.paddingLeft).toBe(59);
    expect(p.paddingRight).toBe(59);
    // A small inset still gets the full gutter.
    expect(
      pagePadding({ top: 0, bottom: 0, left: 4, right: 4 }, false).paddingLeft,
    ).toBe(SPACE.gutter);
  });
});

describe.each(PHONE_WIDTHS)("WeatherScroll at %i pt", (width) => {
  beforeEach(() => {
    setInsets(IPHONE_INSETS);
    setWindow(width, 852);
    (setStatusBarStyle as jest.Mock).mockClear();
  });

  it("puts the page gutter on both sides of the column, nothing flush to an edge", async () => {
    const tree = await render(
      <WeatherScroll family="rain">
        <Text>content</Text>
      </WeatherScroll>,
    );
    const padded = find(
      tree.toJSON() as Node,
      (s) => "paddingLeft" in s && "paddingRight" in s,
    );
    expect(padded).toHaveLength(1);
    expect(padded[0].paddingLeft).toBe(SPACE.gutter);
    expect(padded[0].paddingRight).toBe(SPACE.gutter);
    expect(padded[0].paddingTop).toBe(47);
  });

  it("keeps the column inside the screen: full width up to a cap, centred", async () => {
    const tree = await render(
      <WeatherScroll family="rain">
        <Text>content</Text>
      </WeatherScroll>,
    );
    const column = find(
      tree.toJSON() as Node,
      (s) => s.maxWidth === SIZE.contentMax,
    );
    expect(column).toHaveLength(1);
    expect(column[0].width).toBe("100%");
    expect(column[0].alignSelf).toBe("center");
  });

  it("paints the sky for the family under the status bar and hands the bar white text", async () => {
    const tree = await render(
      <WeatherScroll family="clear-night">
        <Text>content</Text>
      </WeatherScroll>,
    );
    expect(
      tree.getByTestId("weather-sky-clear-night", {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(setStatusBarStyle).toHaveBeenCalledWith("light");
    await tree.unmount();
    expect(setStatusBarStyle).toHaveBeenLastCalledWith("auto");
  });
});

describe("status bar", () => {
  it("flips to the page's own text once cards scroll under it", () => {
    expect(STATUS_SCRIM.end).toBeGreaterThan(STATUS_SCRIM.start);
    expect(STATUS_SCRIM.start).toBeGreaterThan(0);
  });
});

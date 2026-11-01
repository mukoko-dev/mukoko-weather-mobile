/**
 * The loading state: a structural skeleton of the same layout on the same sky,
 * busy to VoiceOver, no spinner screen and no text, still under Reduce Motion.
 */

import { act, render } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import {
  SKELETON,
  WeatherSkeleton,
} from "@/components/weather/WeatherSkeleton";
import { SkyHero } from "@/components/weather/SkyHero";
import { Text } from "react-native";
import { TYPE, lineHeightOf } from "@/theme/mzizi";

import {
  IPHONE_INSETS,
  PHONE_WIDTHS,
  setInsets,
  setWindow,
} from "@/test-utils/mocks";
import { HARARE_OFFSET, NOW, allText } from "@/test-utils/weather-fixtures";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("expo-status-bar", () =>
  require("@/test-utils/mocks").statusBarMock(),
);
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

function flat(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? style.flat(3).reduce((a: object, b: object) => ({ ...a, ...b }), {})
    : ((style ?? {}) as Record<string, unknown>);
}

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

describe("WeatherSkeleton", () => {
  it("is one busy 'Loading weather' item for VoiceOver, never the bars", async () => {
    const { getByRole } = await render(<WeatherSkeleton inTabs />);
    const status = getByRole("progressbar", { name: "Loading weather" });
    expect(status.props.accessibilityState).toEqual({ busy: true });
  });

  it("shows no text, no spinner and no splash: bars only", async () => {
    const tree = await render(<WeatherSkeleton inTabs />);
    expect(allText(tree.toJSON()).trim()).toBe("");
    expect(JSON.stringify(tree.toJSON())).not.toContain("ActivityIndicator");
  });

  it("has the hero rows, the Conditions card and the tile grid", async () => {
    const { getByTestId } = await render(<WeatherSkeleton inTabs />);
    expect(
      getByTestId("skeleton-hero", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      getByTestId("skeleton-conditions", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      getByTestId("skeleton-tiles", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(SKELETON.hours).toBeGreaterThanOrEqual(6);
  });

  it("paints the same sky as the loaded page: the last family, else a neutral overcast day", async () => {
    const neutral = await render(<WeatherSkeleton inTabs />);
    expect(
      neutral.getByTestId("weather-sky-cloudy-day", {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    const night = await render(<WeatherSkeleton inTabs family="clear-night" />);
    expect(
      night.getByTestId("weather-sky-clear-night", {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
  });

  it("keeps a live Back control reachable while loading", async () => {
    const { getByText } = await render(
      <WeatherSkeleton
        leading={
          <Text accessible accessibilityRole="button">
            Back
          </Text>
        }
      />,
    );
    expect(getByText("Back")).toBeTruthy();
  });

  it("gives every hero row the real type size's line height, so nothing moves when content arrives", async () => {
    const skeleton = await render(<WeatherSkeleton inTabs />);
    // The skeleton's row heights, collected from its tree.
    const heights = [
      ...JSON.stringify(skeleton.toJSON()).matchAll(
        /"height":([\d.]+),"justifyContent":"center"/g,
      ),
    ].map((m) => Number(m[1]));
    for (const token of ["caption", "h2", "display", "h5", "bodyLg"] as const) {
      expect(heights).toContain(lineHeightOf(token));
    }
    // And the loaded hero uses the same line heights for the same rows.
    const loaded = await render(
      <SkyHero
        name="Harare"
        temperature={20}
        weatherCode={0}
        isDay
        high={25}
        low={15}
        utcOffsetSeconds={HARARE_OFFSET}
        now={NOW}
        onShare={jest.fn()}
        onSettings={jest.fn()}
      />,
    );
    const name = flat(loaded.getByText("Harare").props.style);
    expect(name.lineHeight).toBe(lineHeightOf("h2"));
    expect(TYPE.h2.size).toBe(36);
  });

  it.each(PHONE_WIDTHS)("renders at %i pt", async (width) => {
    setWindow(width, 852);
    const { getByTestId } = await render(<WeatherSkeleton inTabs />);
    expect(getByTestId("weather-skeleton")).toBeTruthy();
  });
});

describe("shimmer motion", () => {
  function opacities(json: unknown): number[] {
    return [...JSON.stringify(json).matchAll(/"opacity":([\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
  }

  it("is still under Reduce Motion: the bars sit at one steady opacity", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    jest.useFakeTimers();
    const tree = await render(<WeatherSkeleton inTabs />);
    await act(async () => {
      await Promise.resolve();
    });
    const before = opacities(tree.toJSON()).filter((o) => o !== 1 && o !== 0);
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    const after = opacities(tree.toJSON()).filter((o) => o !== 1 && o !== 0);
    expect(new Set(after)).toEqual(new Set([0.5]));
    expect(after).toEqual(before);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
});

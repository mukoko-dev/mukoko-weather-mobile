/**
 * The frost and weather-unavailable notices: the level in words, announced as
 * the web announces them, readable on any sky (an opaque card under the tint),
 * and wired into the page.
 */

import { fireEvent, render } from "@testing-library/react-native";

import {
  BANNER_TINT,
  FrostAlertBanner,
  WeatherUnavailableBanner,
  frostTitle,
} from "@/components/weather/AlertBanners";
import { WeatherPage } from "@/components/weather/WeatherPage";
import { DARK, LIGHT, MINERAL_EDGE, contrastRatio } from "@/theme/mzizi";
import { frostColor } from "@/theme/weather-scales";
import { type FrostAlert } from "@/shared/weather";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import {
  HAS_EMOJI,
  allText,
  harareWeather,
} from "@/test-utils/weather-fixtures";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("expo-status-bar", () =>
  require("@/test-utils/mocks").statusBarMock(),
);
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

const alert = (risk: FrostAlert["risk"], lowest: number): FrostAlert => ({
  risk,
  lowestTemp: lowest,
  startTime: "2026-11-02T22:00",
  endTime: "2026-11-03T06:00",
  message:
    lowest <= 0
      ? `Severe frost warning: ${lowest}°C expected. Protect all crops immediately.`
      : `Frost risk tonight: temperatures dropping to ${lowest}°C. Cover sensitive plants.`,
});

describe("frostTitle", () => {
  it("is the web's wording: Warning for severe, Advisory otherwise, with the level in capitals", () => {
    expect(frostTitle({ risk: "severe" })).toBe("Frost Warning — SEVERE");
    expect(frostTitle({ risk: "high" })).toBe("Frost Advisory — HIGH");
    expect(frostTitle({ risk: "moderate" })).toBe("Frost Advisory — MODERATE");
  });
});

describe("FrostAlertBanner", () => {
  it("names the level and the advice, and announces assertively", async () => {
    const tree = await render(<FrostAlertBanner alert={alert("severe", -1)} />);
    expect(tree.getByText("Frost Warning — SEVERE")).toBeTruthy();
    expect(tree.getByText(/Protect all crops immediately/)).toBeTruthy();
    const banner = tree.getByTestId("frost-banner");
    expect(banner.props.accessibilityRole).toBe("alert");
    expect(banner.props.accessibilityLiveRegion).toBe("assertive");
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it.each([
    ["light", LIGHT],
    ["dark", DARK],
  ] as const)(
    "holds 4.5:1 for its text in %s on any sky (opaque card under the tint)",
    (scheme, page) => {
      for (const risk of ["moderate", "high", "severe"] as const) {
        const edge = frostColor(risk, scheme);
        // The tint over the card colour, as drawn.
        const n = parseInt(edge.slice(1), 16);
        const mix = (c: number, e: number) =>
          Math.round(c * (1 - BANNER_TINT.frost) + e * BANNER_TINT.frost);
        const c = parseInt(page.card.slice(1), 16);
        const blended = `#${[16, 8, 0]
          .map((sh) =>
            mix((c >> sh) & 255, (n >> sh) & 255)
              .toString(16)
              .padStart(2, "0"),
          )
          .join("")}`;
        expect(contrastRatio(page.textPrimary, blended)).toBeGreaterThanOrEqual(
          4.5,
        );
        expect(
          contrastRatio(page.textSecondary, blended),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});

describe("WeatherUnavailableBanner", () => {
  it("is informational: polite, and offers Refresh now when it can", async () => {
    const onRefresh = jest.fn();
    const tree = await render(
      <WeatherUnavailableBanner onRefresh={onRefresh} />,
    );
    expect(
      tree.getByText("Live weather data temporarily unavailable"),
    ).toBeTruthy();
    expect(
      tree.getByText(/Showing seasonal estimates for this location/),
    ).toBeTruthy();
    expect(
      tree.getByTestId("unavailable-banner").props.accessibilityLiveRegion,
    ).toBe("polite");
    await fireEvent.press(tree.getByLabelText("Refresh now"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("offers no button it cannot honour", async () => {
    const tree = await render(<WeatherUnavailableBanner />);
    expect(tree.queryByLabelText("Refresh now")).toBeNull();
  });

  it("uses the gold edge (the web's warmth) and holds 4.5:1 in both themes", () => {
    for (const [scheme, page] of [
      ["light", LIGHT],
      ["dark", DARK],
    ] as const) {
      const edge = MINERAL_EDGE.gold[scheme];
      const n = parseInt(edge.slice(1), 16);
      const c = parseInt(page.card.slice(1), 16);
      const blended = `#${[16, 8, 0]
        .map((sh) =>
          Math.round(
            ((c >> sh) & 255) * (1 - BANNER_TINT.warning) +
              ((n >> sh) & 255) * BANNER_TINT.warning,
          )
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;
      expect(contrastRatio(page.textPrimary, blended)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
});

describe("in the page", () => {
  it("shows the unavailable notice when every provider failed, above the Conditions card", async () => {
    const weather = { ...harareWeather(), source: "fallback" as const };
    const tree = await render(
      <WeatherPage weather={weather} name="Harare" onRefresh={jest.fn()} />,
    );
    expect(tree.getByTestId("unavailable-banner")).toBeTruthy();
  });

  it("shows no notice for a healthy answer", async () => {
    const tree = await render(
      <WeatherPage weather={harareWeather()} name="Harare" />,
    );
    expect(tree.queryByTestId("unavailable-banner")).toBeNull();
    expect(tree.queryByTestId("frost-banner")).toBeNull();
  });

  it("shows the frost notice when the forecast drops to freezing overnight", async () => {
    const weather = harareWeather();
    const hourly = weather.forecast!.hourly;
    const cold = {
      ...weather,
      forecast: {
        ...weather.forecast!,
        hourly: {
          ...hourly,
          temperature_2m: hourly.temperature_2m.map((t, i) =>
            i === 3 ? -1 : t,
          ),
        },
      },
    };
    // Hour 3 is 03:00 local: inside the 22:00-08:00 frost window.
    const tree = await render(<WeatherPage weather={cold} name="Harare" />);
    expect(tree.getByText("Frost Warning — SEVERE")).toBeTruthy();
  });
});

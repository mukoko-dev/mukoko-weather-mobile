/**
 * The whole page from a recorded answer, in every state: ready (clear night,
 * rain, storm), loading, error and the first screen's eyebrow.
 */

import { fireEvent, render } from "@testing-library/react-native";
import { Share } from "react-native";
import { router } from "expo-router";

import {
  BackControl,
  WeatherError,
  WeatherPage,
  breadcrumbOf,
  countryLabel,
  shareMessage,
} from "@/components/weather/WeatherPage";

import {
  IPHONE_INSETS,
  PHONE_WIDTHS,
  setInsets,
  setWindow,
} from "@/test-utils/mocks";
import {
  HAS_EMOJI,
  allText,
  harareWeather,
  withCondition,
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
  jest.clearAllMocks();
});

describe("WeatherPage", () => {
  it("renders the whole page: sky, hero, Conditions card, tiles and the week", async () => {
    const tree = await render(
      <WeatherPage
        weather={harareWeather()}
        name="Harare"
        isCurrentLocation
        inTabs
      />,
    );
    expect(
      tree.getByTestId("weather-sky-clear-night", {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(tree.getByTestId("sky-hero")).toBeTruthy();
    expect(tree.getByText("My Location")).toBeTruthy();
    // The Conditions card on the sky and the Conditions section of tiles.
    expect(tree.getAllByText("Conditions")).toHaveLength(2);
    expect(tree.getByText("Wind")).toBeTruthy();
    expect(tree.getByText("7-Day Forecast")).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it.each([
    [61, true, "rain"],
    [95, true, "storm"],
    [0, true, "clear-day"],
    [73, false, "snow"],
    [45, false, "fog"],
    [3, false, "cloudy-night"],
  ] as const)(
    "paints the %i / day=%s page on the %s sky",
    async (code, isDay, family) => {
      const tree = await render(
        <WeatherPage
          weather={withCondition(code, isDay ? 1 : 0)}
          name="Harare"
          inTabs
        />,
      );
      expect(
        tree.getByTestId(`weather-sky-${family}`, {
          includeHiddenElements: true,
        }),
      ).toBeTruthy();
    },
  );

  it.each(PHONE_WIDTHS)(
    "renders at %i pt with the largest text size",
    async (width) => {
      setWindow(width, 852, 2);
      const tree = await render(
        <WeatherPage
          weather={harareWeather()}
          name="Singapore American School"
          inTabs
        />,
      );
      expect(tree.getByText("Singapore American School")).toBeTruthy();
    },
  );

  it("shows the hero alone when the forecast has no hours", async () => {
    const weather = { ...harareWeather(), forecast: undefined };
    const tree = await render(
      <WeatherPage weather={weather} name="Harare" inTabs />,
    );
    expect(tree.getByText("Harare")).toBeTruthy();
    expect(tree.queryAllByText("Conditions")).toHaveLength(0);
  });

  it("shares a plain-text line, with no link and no site name", async () => {
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: "sharedAction", activityType: undefined });
    const tree = await render(
      <WeatherPage weather={harareWeather()} name="Harare" inTabs />,
    );
    await fireEvent.press(
      tree.getByRole("button", { name: "Share weather for Harare" }),
    );
    expect(share).toHaveBeenCalledWith({
      message: "Harare: 16°, Clear sky. Shared from mukoko weather.",
    });
    expect(shareMessage("Harare", null, undefined)).toBe(
      "Harare. Shared from mukoko weather.",
    );
  });

  it("opens Settings from the top row", async () => {
    const tree = await render(
      <WeatherPage weather={harareWeather()} name="Harare" inTabs />,
    );
    await fireEvent.press(
      tree.getByRole("button", { name: "Settings and sign in" }),
    );
    expect(router.navigate).toHaveBeenCalledWith("/my");
  });

  it("builds the trail from country then province", () => {
    expect(
      breadcrumbOf({ lat: 0, lon: 0, country: "Zimbabwe", province: "Harare" }),
    ).toBe("Zimbabwe / Harare");
    expect(breadcrumbOf({ lat: 0, lon: 0, country: "Zimbabwe" })).toBe(
      "Zimbabwe",
    );
    expect(breadcrumbOf(undefined)).toBeUndefined();
  });

  it("says the country's name, not its ISO code, as the web does", () => {
    expect(countryLabel("ZW")).toBe("Zimbabwe");
    expect(countryLabel("zw")).toBe("Zimbabwe");
    expect(
      breadcrumbOf({ lat: 0, lon: 0, country: "ZW", province: "Harare" }),
    ).toBe("Zimbabwe / Harare");
    // Not a code: shown as given. Missing: nothing.
    expect(countryLabel("Zimbabwe")).toBe("Zimbabwe");
    expect(countryLabel(undefined)).toBeUndefined();
  });

  it("falls back to the code where the runtime has no region names", () => {
    const spy = jest.spyOn(Intl, "DisplayNames").mockImplementation(() => {
      throw new TypeError("Intl.DisplayNames is not supported");
    });
    try {
      expect(countryLabel("ZW")).toBe("ZW");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("Back control", () => {
  it("goes back when there is somewhere to go, else home", async () => {
    const tree = await render(<BackControl />);
    await fireEvent.press(tree.getByRole("button", { name: "Back" }));
    expect(router.back).toHaveBeenCalledTimes(1);
    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await fireEvent.press(tree.getByRole("button", { name: "Back" }));
    expect(router.replace).toHaveBeenCalledWith("/");
  });
});

describe("WeatherError", () => {
  it("says what happened, what to do, and offers one primary action", async () => {
    const onRetry = jest.fn();
    const tree = await render(
      <WeatherError
        message="The weather service did not answer."
        onRetry={onRetry}
        leading={<BackControl />}
        inTabs
      />,
    );
    expect(tree.getByText("Weather unavailable")).toBeTruthy();
    expect(tree.getByText("The weather service did not answer.")).toBeTruthy();
    expect(
      tree.getByText("Check your connection, then try again."),
    ).toBeTruthy();
    await fireEvent.press(tree.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    // A person can still go back or open Settings.
    expect(tree.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(
      tree.getByRole("button", { name: "Settings and sign in" }),
    ).toBeTruthy();
  });

  it("is a 56 dp pill, not a blank screen", async () => {
    const tree = await render(
      <WeatherError message="x" onRetry={jest.fn()} inTabs />,
    );
    const style = JSON.stringify(
      tree.getByRole("button", { name: "Try again" }).props.style,
    );
    expect(style).toContain('"minHeight":56');
    expect(tree.getByTestId("weather-error")).toBeTruthy();
  });
});

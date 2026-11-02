/**
 * "Full forecast" on the Conditions card and "24h trends" above the tiles open
 * the place's two detail pages, as on the web. They are real links with
 * 48 dp touch targets, they exist only for a place with a slug, and a page
 * that shows a place primes the detail pages so they open without a request.
 */

import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { ConditionTiles } from "@/components/weather/ConditionTiles";
import { ConditionsCard } from "@/components/weather/ConditionsCard";
import { WeatherPage } from "@/components/weather/WeatherPage";
import {
  SUB_ROUTE_PATH,
  locationHref,
  locationSubHref,
} from "@/components/weather/location-routes";
import { clearWeatherCache, recallWeather } from "@/hooks/weather-cache";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { NOW, harareWeather } from "@/test-utils/weather-fixtures";
import { TOUCH } from "@/theme/mzizi";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("expo-status-bar", () =>
  require("@/test-utils/mocks").statusBarMock(),
);
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const forecast = harareWeather().forecast!;

function flat(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? style.flat(3).reduce((a: object, b: object) => ({ ...a, ...b }), {})
    : ((style ?? {}) as Record<string, unknown>);
}

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  jest.clearAllMocks();
  clearWeatherCache();
});

describe("the routes", () => {
  it("builds the typed hrefs the router takes", () => {
    expect(locationSubHref("harare", "forecast")).toEqual({
      pathname: "/location/[slug]/forecast",
      params: { slug: "harare" },
    });
    expect(locationSubHref("harare", "atmosphere")).toEqual({
      pathname: "/location/[slug]/atmosphere",
      params: { slug: "harare" },
    });
    expect(locationHref("harare")).toEqual({
      pathname: "/location/[slug]",
      params: { slug: "harare" },
    });
    expect(Object.values(SUB_ROUTE_PATH)).toEqual([
      "/location/[slug]/forecast",
      "/location/[slug]/atmosphere",
    ]);
  });
});

describe("Full forecast (the Conditions card)", () => {
  it("is a link, at least 48 dp tall, that calls its handler", async () => {
    const open = jest.fn();
    const tree = await render(
      <ConditionsCard forecast={forecast} now={NOW} onOpenForecast={open} />,
    );
    const link = tree.getByTestId("full-forecast-link");
    expect(link.props.accessibilityRole).toBe("link");
    expect(link.props.accessibilityLabel).toBe(
      "Full forecast, hourly and 7-day",
    );
    expect(flat(link.props.style).minHeight).toBe(TOUCH.min);
    expect(tree.getByText("Full forecast")).toBeTruthy();
    await fireEvent.press(link);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("is not drawn without a handler (no dead link)", async () => {
    const tree = await render(<ConditionsCard forecast={forecast} now={NOW} />);
    expect(tree.queryByTestId("full-forecast-link")).toBeNull();
    expect(tree.getByText("Conditions")).toBeTruthy();
  });
});

describe("24h trends (above the tiles)", () => {
  it("is a link, at least 48 dp tall, that calls its handler", async () => {
    const open = jest.fn();
    const tree = await render(
      <ConditionTiles forecast={forecast} now={NOW} onOpenTrends={open} />,
    );
    const link = tree.getByTestId("trends-link");
    expect(link.props.accessibilityRole).toBe("link");
    expect(link.props.accessibilityLabel).toBe("24-hour trends");
    expect(flat(link.props.style).minHeight).toBe(TOUCH.min);
    await fireEvent.press(link);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("is not drawn without a handler", async () => {
    const tree = await render(<ConditionTiles forecast={forecast} now={NOW} />);
    expect(tree.queryByTestId("trends-link")).toBeNull();
  });
});

describe("from the page", () => {
  it("opens the forecast and the atmosphere pages of the place", async () => {
    const tree = await render(
      <WeatherPage weather={harareWeather()} name="Harare" inTabs />,
    );
    await fireEvent.press(tree.getByTestId("full-forecast-link"));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: "/location/[slug]/forecast",
      params: { slug: "harare" },
    });
    await fireEvent.press(tree.getByTestId("trends-link"));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: "/location/[slug]/atmosphere",
      params: { slug: "harare" },
    });
  });

  it("uses the slug the screen gives (the place under a GPS fix)", async () => {
    const weather = { ...harareWeather(), location: undefined };
    const tree = await render(
      <WeatherPage
        weather={weather}
        name="Milton Park"
        slug="milton-park--kv0xq9z"
        inTabs
      />,
    );
    await fireEvent.press(tree.getByTestId("full-forecast-link"));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: "/location/[slug]/forecast",
      params: { slug: "milton-park--kv0xq9z" },
    });
  });

  it("draws no links for a place the API has not named", async () => {
    const weather = { ...harareWeather(), location: undefined };
    const tree = await render(
      <WeatherPage weather={weather} name="Here" inTabs />,
    );
    expect(tree.queryByTestId("full-forecast-link")).toBeNull();
    expect(tree.queryByTestId("trends-link")).toBeNull();
    expect(recallWeather("here")).toBeUndefined();
  });

  it("remembers what it shows, so the detail page opens with no wait", async () => {
    const weather = harareWeather();
    await render(<WeatherPage weather={weather} name="Harare" inTabs />);
    expect(recallWeather("harare")).toBe(weather);
  });

  it("no longer shows the week itself: the 7-day card is on /forecast, as on the web", async () => {
    const tree = await render(
      <WeatherPage weather={harareWeather()} name="Harare" inTabs />,
    );
    expect(tree.queryByTestId("daily-card")).toBeNull();
  });
});

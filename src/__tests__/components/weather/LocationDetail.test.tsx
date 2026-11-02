/**
 * A place's detail pages, /forecast and /atmosphere, rendered from the
 * recorded Harare answer: every card, the title and trail, Back that names
 * where it goes, one crash staying in its own card, and every state of the
 * screen (loading, ready, failed, no hours, no place, remembered).
 */

import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { Share } from "react-native";

import { fetchWeather } from "@/api/weather";
import { ChartErrorBoundary } from "@/components/weather/ChartErrorBoundary";
import {
  DetailPage,
  LocationDetailScreen,
  detailSubtitle,
} from "@/components/weather/LocationDetail";
import {
  clearWeatherCache,
  recallWeather,
  rememberWeather,
} from "@/hooks/weather-cache";
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
} from "@/test-utils/weather-fixtures";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("expo-status-bar", () =>
  require("@/test-utils/mocks").statusBarMock(),
);
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);
jest.mock("@/api/weather", () => ({
  ...jest.requireActual("@/api/weather"),
  fetchWeather: jest.fn(),
}));

const fetchMock = fetchWeather as jest.MockedFunction<typeof fetchWeather>;

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  jest.clearAllMocks();
  clearWeatherCache();
});

/** The first value of a prop anywhere in a rendered tree. */
function findProp(node: unknown, name: string): unknown {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findProp(n, name);
      if (hit !== undefined) return hit;
    }
    return undefined;
  }
  const n = node as { props?: Record<string, unknown>; children?: unknown };
  if (n.props && name in n.props) return n.props[name];
  return findProp(n.children, name);
}

/** Let the load promise settle and the page render. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("the forecast page", () => {
  it("shows the title, the trail, the subtitle, and the three cards of the web's /forecast", async () => {
    const tree = await render(
      <DetailPage
        weather={harareWeather()}
        slug="harare"
        sub="forecast"
        name="Harare"
      />,
    );
    expect(tree.getByText("Harare Forecast")).toBeTruthy();
    expect(tree.getByText("Harare / Forecast")).toBeTruthy();
    expect(tree.getByText("Harare · 1490m")).toBeTruthy();
    expect(tree.getByText("24-Hour Forecast")).toBeTruthy();
    expect(tree.getByText("7-Day Forecast")).toBeTruthy();
    expect(tree.getByText("Sun")).toBeTruthy();
    expect(tree.getByTestId("hourly-chart")).toBeTruthy();
    expect(tree.getByTestId("daily-chart")).toBeTruthy();
    // Not the atmosphere page's content.
    expect(tree.queryByTestId("atmospheric-details-card")).toBeNull();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("reads sunrise and sunset in the place's time", async () => {
    const tree = await render(
      <DetailPage
        weather={harareWeather()}
        slug="harare"
        sub="forecast"
        name="Harare"
      />,
    );
    // The recorded answer: sunrise 05:16, sunset 18:02 at Harare.
    expect(tree.getByLabelText("Sunrise at 05:16")).toBeTruthy();
    expect(tree.getByLabelText("Sunset at 18:02")).toBeTruthy();
    expect(
      tree.getByLabelText(/12 hours and 46 minutes of daylight/),
    ).toBeTruthy();
  });

  it("has one heading for the page and one per card, for VoiceOver", async () => {
    const tree = await render(
      <DetailPage
        weather={harareWeather()}
        slug="harare"
        sub="forecast"
        name="Harare"
      />,
    );
    const headings = tree.getAllByRole("header").map((h) => h.props.children);
    expect(headings).toEqual([
      "Harare Forecast",
      "24-Hour Forecast",
      "7-Day Forecast",
      "Sun",
    ]);
  });
});

describe("the atmosphere page", () => {
  it("shows the Conditions tiles and the four 24-hour charts of the web's /atmosphere", async () => {
    const tree = await render(
      <DetailPage
        weather={harareWeather()}
        slug="harare"
        sub="atmosphere"
        name="Harare"
      />,
    );
    expect(tree.getByText("Harare Atmosphere")).toBeTruthy();
    expect(tree.getByText("Harare / Atmosphere")).toBeTruthy();
    expect(tree.getByText("Wind")).toBeTruthy();
    expect(tree.getByText("Atmospheric Details")).toBeTruthy();
    expect(tree.getByText("24-hour hourly trends")).toBeTruthy();
    for (const id of [
      "humidity-cloud-chart",
      "wind-chart",
      "pressure-chart",
      "uv-chart",
    ]) {
      expect(tree.getByTestId(id)).toBeTruthy();
    }
    const headings = tree.getAllByRole("header").map((h) => h.props.children);
    for (const heading of [
      "Humidity & Cloud Cover",
      "Wind Speed & Gusts",
      "Barometric Pressure",
      "UV Index",
    ]) {
      expect(headings).toContain(heading);
    }
    // This page does not link to itself.
    expect(tree.queryByTestId("trends-link")).toBeNull();
    expect(tree.queryByTestId("hourly-chart")).toBeNull();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("the charts start at the place's current hour", async () => {
    const tree = await render(
      <DetailPage
        weather={harareWeather()}
        slug="harare"
        sub="atmosphere"
        name="Harare"
      />,
    );
    expect(tree.getByTestId("wind-chart").props.accessibilityLabel).toMatch(
      /Wind Speed: lowest/,
    );
  });
});

describe("the top row", () => {
  const page = () => (
    <DetailPage
      weather={harareWeather()}
      slug="harare"
      sub="forecast"
      name="Harare"
    />
  );

  it("Back names where it goes and returns to the previous screen", async () => {
    const tree = await render(page());
    const back = tree.getByLabelText("Back to Harare");
    expect(back.props.accessibilityRole).toBe("button");
    await fireEvent.press(back);
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("Back falls back to the place's own page when opened straight from a link", async () => {
    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    const tree = await render(page());
    await fireEvent.press(tree.getByLabelText("Back to Harare"));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: "/location/[slug]",
      params: { slug: "harare" },
    });
  });

  it("Share sends a plain sentence with no link, and Settings opens the Settings tab", async () => {
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: "sharedAction", activityType: undefined });
    const tree = await render(page());
    await fireEvent.press(tree.getByLabelText("Share weather for Harare"));
    expect(share).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(share.mock.calls[0][0])).not.toMatch(/https?:/);
    await fireEvent.press(tree.getByLabelText("Settings and sign in"));
    expect(router.navigate).toHaveBeenCalledWith("/my");
  });
});

describe("one crash stays in its own card", () => {
  it("the hourly card fails alone; the week and the sun still show", async () => {
    const weather = harareWeather();
    const broken = {
      ...weather,
      forecast: { ...weather.forecast!, hourly: null as never },
    };
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const tree = await render(
      <DetailPage
        weather={broken}
        slug="harare"
        sub="forecast"
        name="Harare"
      />,
    );
    expect(tree.getByText("Unable to display hourly forecast.")).toBeTruthy();
    expect(tree.getByText("7-Day Forecast")).toBeTruthy();
    expect(tree.getByText("Sun")).toBeTruthy();
  });

  it("the boundary is an alert for VoiceOver and renders children when nothing throws", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const Boom = () => {
      throw new Error("boom");
    };
    const failed = await render(
      <ChartErrorBoundary name="wind chart" color="#000000">
        <Boom />
      </ChartErrorBoundary>,
    );
    expect(failed.getByRole("alert").props.accessibilityLabel).toBe(
      "Unable to display wind chart",
    );
    const fine = await render(
      <ChartErrorBoundary name="wind chart" color="#000000">
        <></>
      </ChartErrorBoundary>,
    );
    expect(fine.queryByTestId("chart-error")).toBeNull();
  });

  it("a failed section draws again when the next answer arrives, and only then", async () => {
    let broken = true;
    const Flaky = () => {
      if (broken) throw new Error("bad column");
      return <></>;
    };
    const tree = await render(
      <ChartErrorBoundary name="pressure chart" color="#000000" resetKey="a">
        <Flaky />
      </ChartErrorBoundary>,
    );
    expect(tree.getByTestId("chart-error")).toBeTruthy();
    // The same answer again (a re-render) does not retry a section that failed.
    broken = false;
    await tree.rerender(
      <ChartErrorBoundary name="pressure chart" color="#000000" resetKey="a">
        <Flaky />
      </ChartErrorBoundary>,
    );
    expect(tree.getByTestId("chart-error")).toBeTruthy();
    // A new answer gets another go.
    await tree.rerender(
      <ChartErrorBoundary name="pressure chart" color="#000000" resetKey="b">
        <Flaky />
      </ChartErrorBoundary>,
    );
    expect(tree.queryByTestId("chart-error")).toBeNull();
  });
});

describe("the subtitle", () => {
  it("is the province and the height, and only what is known", () => {
    expect(
      detailSubtitle({
        province: "Mashonaland East",
        elevation: 1490.4,
        lat: 0,
        lon: 0,
      }),
    ).toBe("Mashonaland East · 1490m");
    expect(detailSubtitle({ elevation: 12, lat: 0, lon: 0 })).toBe("12m");
    expect(detailSubtitle({ province: "Harare", lat: 0, lon: 0 })).toBe(
      "Harare",
    );
    expect(detailSubtitle(undefined)).toBeUndefined();
  });

  it("never prints the API's placeholder height of 0 as a real one", () => {
    // A spot under a GPS fix comes back with elevation 0 (unmeasured).
    expect(
      detailSubtitle({ province: "Harare", elevation: 0, lat: 0, lon: 0 }),
    ).toBe("Harare");
    expect(detailSubtitle({ elevation: 0, lat: 0, lon: 0 })).toBeUndefined();
    expect(detailSubtitle({ elevation: 0.4, lat: 0, lon: 0 })).toBeUndefined();
    // A real height below sea level is still a height.
    expect(detailSubtitle({ elevation: -430, lat: 0, lon: 0 })).toBe("-430m");
    expect(
      detailSubtitle({ elevation: Number.NaN, lat: 0, lon: 0 }),
    ).toBeUndefined();
  });
});

describe("the screen: every state", () => {
  it("loading: the structural skeleton with a live Back and one busy item", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="forecast" />,
    );
    expect(tree.getByTestId("detail-skeleton")).toBeTruthy();
    expect(tree.getByLabelText("Back to Harare")).toBeTruthy();
    const busy = tree.getByLabelText("Loading forecast");
    expect(busy.props.accessibilityRole).toBe("progressbar");
    expect(busy.props.accessibilityState).toEqual({ busy: true });
    expect(fetchMock).toHaveBeenCalledWith(
      { slug: "harare" },
      expect.anything(),
    );
  });

  it("loading the atmosphere page says atmosphere", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="atmosphere" />,
    );
    expect(tree.getByLabelText("Loading atmosphere")).toBeTruthy();
  });

  it("ready: the page, and the answer is remembered for the next page", async () => {
    fetchMock.mockResolvedValue(harareWeather());
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="forecast" />,
    );
    await settle();
    expect(tree.getByText("Harare Forecast")).toBeTruthy();
    expect(tree.queryByTestId("detail-skeleton")).toBeNull();
    expect(recallWeather("harare")).toBeDefined();
  });

  it("opens at once from what the previous page already loaded, with no request", async () => {
    rememberWeather("harare", harareWeather());
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="atmosphere" />,
    );
    expect(tree.getByText("Harare Atmosphere")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("failed: says what happened, offers Try again, and keeps Back and Settings", async () => {
    fetchMock.mockRejectedValueOnce(
      new Error("The weather service is not answering."),
    );
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="forecast" />,
    );
    await settle();
    expect(tree.getByText("Weather unavailable")).toBeTruthy();
    expect(
      tree.getByText("The weather service is not answering."),
    ).toBeTruthy();
    expect(tree.getByLabelText("Back to Harare")).toBeTruthy();
    expect(tree.getByLabelText("Settings and sign in")).toBeTruthy();
    fetchMock.mockResolvedValueOnce(harareWeather());
    await fireEvent.press(tree.getByLabelText("Try again"));
    await settle();
    expect(tree.getByText("Harare Forecast")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("empty: an answer with no hours is said in words, not drawn as empty charts", async () => {
    fetchMock.mockResolvedValue({ ...harareWeather(), forecast: undefined });
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="forecast" />,
    );
    await settle();
    expect(
      tree.getByText(
        "The forecast for this place has no hours in it right now.",
      ),
    ).toBeTruthy();
    expect(tree.queryByTestId("hourly-chart")).toBeNull();
  });

  it("no place: nothing is requested and the screen says so", async () => {
    const tree = await render(
      <LocationDetailScreen slug={undefined} sub="forecast" />,
    );
    expect(tree.getByText("No place was chosen.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a route reused for another place never shows the first place's weather", async () => {
    const bulawayo = {
      ...harareWeather(),
      location: {
        ...harareWeather().location!,
        slug: "bulawayo",
        name: "Bulawayo",
      },
    };
    fetchMock.mockResolvedValueOnce(harareWeather());
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="forecast" />,
    );
    await settle();
    expect(tree.getByText("Harare Forecast")).toBeTruthy();

    // The slug changes while the screen stays mounted: the old place goes at once.
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));
    await tree.rerender(
      <LocationDetailScreen slug="bulawayo" sub="forecast" />,
    );
    expect(tree.queryByText("Harare Forecast")).toBeNull();
    expect(tree.getByTestId("detail-skeleton")).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith(
      { slug: "bulawayo" },
      expect.anything(),
    );

    // And a place the app already holds opens from memory under the new slug.
    rememberWeather("bulawayo", bulawayo);
    await tree.rerender(
      <LocationDetailScreen slug="bulawayo" sub="forecast" />,
    );
    await tree.rerender(
      <LocationDetailScreen slug="harare" sub="atmosphere" />,
    );
    await tree.rerender(
      <LocationDetailScreen slug="bulawayo" sub="atmosphere" />,
    );
    expect(tree.getByText("Bulawayo Atmosphere")).toBeTruthy();
    expect(tree.queryByText("Harare Atmosphere")).toBeNull();
  });

  it("does not remember a seasonal estimate for the next page", async () => {
    fetchMock.mockResolvedValue({
      ...harareWeather(),
      source: "fallback",
    });
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="forecast" />,
    );
    await settle();
    expect(tree.getByText("Harare Forecast")).toBeTruthy();
    expect(recallWeather("harare")).toBeUndefined();
  });

  it("pull to refresh asks again and keeps the page", async () => {
    fetchMock.mockResolvedValue(harareWeather());
    const tree = await render(
      <LocationDetailScreen slug="harare" sub="forecast" />,
    );
    await settle();
    const control = findProp(tree.toJSON(), "refreshControl") as {
      props: { onRefresh: () => Promise<void> };
    };
    await act(async () => {
      await control.props.onRefresh();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(tree.getByText("Harare Forecast")).toBeTruthy();
  });
});

describe.each(PHONE_WIDTHS)("at %i pt", (width) => {
  it.each(["forecast", "atmosphere"] as const)(
    "renders the %s page at the largest text size",
    async (sub) => {
      setWindow(width, 852, 2);
      const tree = await render(
        <DetailPage
          weather={harareWeather()}
          slug="singapore-american-school--w1xzjbp"
          sub={sub}
          name="Singapore American School"
        />,
      );
      expect(
        tree.getByText(
          `Singapore American School ${sub === "forecast" ? "Forecast" : "Atmosphere"}`,
        ),
      ).toBeTruthy();
    },
  );
});

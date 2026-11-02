/**
 * The cards under the week that are about the place: the El Niño outlook, the
 * About card with the place's profile rows, the season line, the map card's
 * honest placeholder and the breadcrumb trail. Recorded Worker answers only.
 */

import { fireEvent, render } from "@testing-library/react-native";

import profileLondon from "@/api/__fixtures__/profile-london.json";
import { AboutPlaceCard } from "@/components/weather/AboutPlaceCard";
import { ConditionsCard } from "@/components/weather/ConditionsCard";
import { EnsoCard } from "@/components/weather/EnsoCard";
import { MapPreviewCard } from "@/components/weather/MapPreviewCard";
import { PlaceTrail } from "@/components/weather/PlaceTrail";
import { SeasonBadge, SeasonFooter } from "@/components/weather/SeasonBadge";
import { SubPageError } from "@/components/weather/SubPage";
import { type PlaceInfo } from "@/shared/place-info";
import { placeTrail } from "@/shared/place-trail";

import { RECORDED, routeFetch } from "@/test-utils/farm-fetch";
import {
  HAS_EMOJI,
  HARARE_OFFSET,
  NOW,
  allText,
  harareWeather,
} from "@/test-utils/weather-fixtures";

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const HARARE: PlaceInfo = {
  slug: "harare",
  name: "Harare",
  lat: -17.83,
  lon: 31.05,
  country: "ZW",
  province: "Harare",
  elevation: 1490,
  source: "seed",
};

describe("EnsoCard", () => {
  it("shows the recorded very strong El Niño with its recent seasons and southern-Africa lines", async () => {
    routeFetch(RECORDED);
    const tree = await render(
      <EnsoCard lat={-17.83} lon={31.05} countryCode="ZW" />,
    );
    expect(await tree.findByText("El Niño")).toBeTruthy();
    expect(tree.getByText("Very strong")).toBeTruthy();
    expect(tree.getByText("ONI +2.16 for JAS 2026")).toBeTruthy();
    expect(tree.getByLabelText("JAS 2026, ONI +2.16")).toBeTruthy();
    expect(tree.getAllByLabelText(/ONI \+/)).toHaveLength(6);
    expect(
      tree.getByText(/drier, hotter rainy season to southern Africa/),
    ).toBeTruthy();
    expect(
      tree.getByText(
        "Seasonal outlook, not a forecast for today. Source: NOAA CPC ONI.",
      ),
    ).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("uses the generic line for a country with no regional guidance", async () => {
    routeFetch(RECORDED);
    const tree = await render(
      <EnsoCard lat={51.5} lon={-0.12} countryCode="GB" />,
    );
    expect(await tree.findByText(/effects vary locally/)).toBeTruthy();
    expect(tree.queryByText(/southern Africa/)).toBeNull();
  });

  it("says NOAA's reading is not available (a clear no, not a bug) and offers Try again", async () => {
    routeFetch({
      "/v1/enso": {
        body: { available: false, series: [], source: "NOAA CPC ONI" },
      },
    });
    const tree = await render(<EnsoCard lat={0} lon={0} />);
    expect(await tree.findByTestId("enso-unavailable")).toBeTruthy();
    expect(tree.getByText(/not available right now/)).toBeTruthy();
    routeFetch(RECORDED);
    await fireEvent.press(tree.getByRole("button", { name: "Try again" }));
    expect(await tree.findByText("El Niño")).toBeTruthy();
  });

  it("says the request failed when offline", async () => {
    routeFetch({ "/v1/enso": "offline" });
    const tree = await render(<EnsoCard lat={0} lon={0} />);
    expect(await tree.findByTestId("card-failed")).toBeTruthy();
    expect(tree.getByText(/did not load/)).toBeTruthy();
  });
});

describe("AboutPlaceCard", () => {
  it("lists the web's rows at once and the profile rows when they arrive", async () => {
    routeFetch(RECORDED);
    const tree = await render(
      <AboutPlaceCard
        place={HARARE}
        forecastElevation={1484}
        now={NOW}
        utcOffsetSeconds={HARARE_OFFSET}
      />,
    );
    expect(tree.getByText("About Harare")).toBeTruthy();
    expect(tree.getByLabelText("Country: Zimbabwe")).toBeTruthy();
    expect(tree.getByLabelText("Elevation: 1490 m")).toBeTruthy();
    expect(
      tree.getByLabelText("Coordinates: 17.8300°S, 31.0500°E"),
    ).toBeTruthy();
    // Then the profile.
    expect(
      await tree.findByLabelText("Season: Masika (Main rains)"),
    ).toBeTruthy();
    expect(
      tree.getByLabelText(
        "Climate zone: Subtropical highland, dry winter (Cwb), estimated",
      ),
    ).toBeTruthy();
    expect(
      tree.getByLabelText(
        "Typical in November: 27° high, 17° low, 77 mm of rain",
      ),
    ).toBeTruthy();
    expect(
      tree.getByLabelText("Next season: Munakamwe from 1 Apr"),
    ).toBeTruthy();
    expect(tree.getByLabelText(/^Crop calendar: Maize/)).toBeTruthy();
  });

  it("names no crops for a place with no crop calendar, and hedges what is derived", async () => {
    routeFetch({
      ...RECORDED,
      "/v1/locations/profile": { body: profileLondon },
    });
    const tree = await render(
      <AboutPlaceCard
        place={{
          name: "London",
          lat: 51.5,
          lon: -0.12,
          country: "GB",
          slug: "london-gb",
        }}
        forecastElevation={11}
        now={NOW}
        utcOffsetSeconds={0}
      />,
    );
    expect(
      await tree.findByLabelText("Season: Autumn, estimated"),
    ).toBeTruthy();
    expect(tree.queryByLabelText(/^Crop calendar/)).toBeNull();
    expect(tree.getByLabelText(/^Growing window: .*estimated$/)).toBeTruthy();
    expect(tree.getByLabelText("Country: United Kingdom")).toBeTruthy();
    // A named place without a stored height takes the forecast's for the point.
    expect(tree.getByLabelText("Elevation: 11 m")).toBeTruthy();
  });

  it("keeps the facts and says the details did not load, with Try again, when the profile fails", async () => {
    routeFetch({ ...RECORDED, "/v1/locations/profile": "offline" });
    const tree = await render(
      <AboutPlaceCard
        place={HARARE}
        now={NOW}
        utcOffsetSeconds={HARARE_OFFSET}
      />,
    );
    expect(await tree.findByTestId("place-knowledge-failed")).toBeTruthy();
    expect(tree.getByLabelText("Country: Zimbabwe")).toBeTruthy();
    // The season falls back to the hemisphere default for the place's month, marked estimated.
    expect(tree.getByLabelText("Season: Spring, estimated")).toBeTruthy();
    expect(tree.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

describe("the season line", () => {
  it("is the web's line: local name, English name and description", async () => {
    const tree = await render(
      <SeasonBadge
        resolved={{
          season: {
            name: "Main rains",
            localName: "Masika",
            description: "Flooding, road damage, planting",
          },
          estimated: false,
        }}
      />,
    );
    expect(tree.getByText("Masika")).toBeTruthy();
    expect(
      tree.getByText("Main rains — Flooding, road damage, planting"),
    ).toBeTruthy();
    expect(tree.getByLabelText(/^Season: Masika\. Main rains/)).toBeTruthy();
  });

  it("says estimated when the season is derived", async () => {
    const tree = await render(
      <SeasonBadge
        resolved={{
          season: {
            name: "Winter",
            localName: "Winter",
            description: "Coldest season with shorter days",
          },
          estimated: true,
        }}
      />,
    );
    expect(
      tree.getByText("Coldest season with shorter days · estimated"),
    ).toBeTruthy();
    expect(tree.getByLabelText(/Estimated$/)).toBeTruthy();
  });

  it("holds the footer's height with a bar while the profile loads", async () => {
    routeFetch({ "/v1/locations/profile": "hang" });
    const forecast = harareWeather().forecast!;
    const tree = await render(
      <ConditionsCard
        forecast={forecast}
        now={NOW}
        footer={
          <SeasonFooter
            place={HARARE}
            now={NOW}
            utcOffsetSeconds={HARARE_OFFSET}
          />
        }
      />,
    );
    const bar = tree.getByTestId("season-loading");
    expect(bar.props.accessibilityLabel).toBe("Loading the season");
    expect(bar.props.accessibilityState).toEqual({ busy: true });
    expect(tree.queryByTestId("season-badge")).toBeNull();
  });

  it("writes the Worker's local season in the Conditions card footer", async () => {
    routeFetch(RECORDED);
    const forecast = harareWeather().forecast!;
    const tree = await render(
      <ConditionsCard
        forecast={forecast}
        now={NOW}
        footer={
          <SeasonFooter
            place={HARARE}
            now={NOW}
            utcOffsetSeconds={HARARE_OFFSET}
          />
        }
      />,
    );
    expect(await tree.findByTestId("season-badge")).toBeTruthy();
    expect(tree.getByText("Masika")).toBeTruthy();
    expect(tree.queryByTestId("season-loading")).toBeNull();
  });

  it("falls back to the hemisphere default when the profile cannot be read", async () => {
    routeFetch({ "/v1/locations/profile": "offline" });
    const tree = await render(
      <SeasonFooter
        place={HARARE}
        now={NOW}
        utcOffsetSeconds={HARARE_OFFSET}
      />,
    );
    expect(await tree.findByTestId("season-badge")).toBeTruthy();
    // 1 November in Harare is spring in the southern hemisphere.
    expect(tree.getByText("Spring")).toBeTruthy();
    expect(tree.getByText(/estimated$/)).toBeTruthy();
  });

  it("is a Conditions card without a footer when none is given", async () => {
    const tree = await render(
      <ConditionsCard forecast={harareWeather().forecast!} now={NOW} />,
    );
    expect(tree.queryByTestId("season-badge")).toBeNull();
  });
});

describe("MapPreviewCard", () => {
  it("is an honest placeholder: it says the map is coming, draws no tiles and offers no button", async () => {
    const tree = await render(<MapPreviewCard placeName="Harare" />);
    expect(tree.getByText("Weather Map")).toBeTruthy();
    expect(tree.getByText("The map is coming")).toBeTruthy();
    expect(
      tree.getByLabelText("The weather map for Harare is not in the app yet"),
    ).toBeTruthy();
    expect(tree.queryByRole("button")).toBeNull();
    expect(tree.queryByRole("link")).toBeNull();
    expect(tree.queryByRole("image")).toBeNull();
  });
});

describe("PlaceTrail", () => {
  it("makes Home a 48 dp-tall link, reads the place as the current page and hides the slashes", async () => {
    const onHome = jest.fn();
    const items = placeTrail({
      name: "Marondera",
      countryName: "Zimbabwe",
      province: "Mashonaland East",
    });
    const tree = await render(
      <PlaceTrail items={items} onHome={onHome} color="#000000" />,
    );
    const home = tree.getByRole("link", { name: "Home" });
    await fireEvent.press(home);
    expect(onHome).toHaveBeenCalledTimes(1);
    const slop = home.props.hitSlop as { top: number; bottom: number };
    expect(slop.top + slop.bottom + 21).toBeGreaterThanOrEqual(48);
    expect(tree.getByLabelText("Marondera, current page")).toBeTruthy();
    expect(tree.getByLabelText("Zimbabwe")).toBeTruthy();
    expect(tree.getByTestId("place-trail").props.accessibilityLabel).toBe(
      "Breadcrumb: Home / Zimbabwe / Mashonaland East / Marondera",
    );
    // The trail wraps; nothing is cut to a line count.
    expect(
      tree.getByText("Mashonaland East").props.numberOfLines,
    ).toBeUndefined();
  });

  it("draws two crumbs with the same label (a city-state's province is its country) without a key clash", async () => {
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    const items = placeTrail({
      name: "Woodlands",
      countryName: "Singapore",
      province: "Singapore",
    });
    expect(items.map((i) => i.label)).toEqual([
      "Home",
      "Singapore",
      "Singapore",
      "Woodlands",
    ]);
    const tree = await render(
      <PlaceTrail items={items} onHome={jest.fn()} color="#000000" />,
    );
    expect(tree.getAllByText("Singapore")).toHaveLength(2);
    const keyWarnings = errors.mock.calls.filter((c) =>
      String(c[0]).includes("same key"),
    );
    expect(keyWarnings).toHaveLength(0);
    errors.mockRestore();
  });
});

describe("SubPageError", () => {
  it("scrolls, so Try again is reachable at the largest text size, and both controls work", async () => {
    const onRetry = jest.fn();
    const onBack = jest.fn();
    const tree = await render(
      <SubPageError
        title="This place did not load"
        message="Mukoko could not be reached or does not know this place."
        onRetry={onRetry}
        onBack={onBack}
      />,
    );
    // One scroll container holds the whole face, Back and Try again included.
    expect(JSON.stringify(tree.toJSON())).toContain("RCTScrollView");
    expect(tree.getByTestId("subpage-error")).toBeTruthy();
    await fireEvent.press(tree.getByLabelText("Try again"));
    await fireEvent.press(tree.getByLabelText("Back"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

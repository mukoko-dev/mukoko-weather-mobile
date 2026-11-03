/**
 * The activity and community sections on the whole page: where they sit, what
 * a person with nothing picked sees, what a person with picks sees (the hero
 * line, the lane), and that none of it sends the picks anywhere.
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import activitiesFixture from "@/api/__fixtures__/activities.json";
import categoriesFixture from "@/api/__fixtures__/activity-categories.json";
import suitabilityFixture from "@/api/__fixtures__/suitability.json";
import { resetActivityCaches } from "@/api/activities";
import { WeatherPage } from "@/components/weather/WeatherPage";
import { toggleActivity } from "@/state/preferences";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { resetPreferences } from "@/test-utils/preferences";
import { routedFetch } from "@/test-utils/routed-fetch";
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

const ROUTES = {
  "GET /v1/activities": (call: { url: string }) => ({
    body: call.url.includes("mode=categories")
      ? categoriesFixture
      : activitiesFixture,
  }),
  "GET /v1/suitability": { body: suitabilityFixture },
};

const weather = () => ({
  ...harareWeather(),
  location: {
    slug: "harare",
    name: "Harare",
    province: "Harare",
    country: "ZW",
    lat: -17.8252,
    lon: 31.0335,
  },
});

beforeEach(async () => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  resetActivityCaches();
  await resetPreferences();
});

describe("a person with nothing picked", () => {
  it("sees the lane's invitation, the reports card (not live), the activity invitation and the signed-out insight, and the network is silent", async () => {
    const calls = routedFetch({});
    const tree = await render(
      <WeatherPage weather={weather()} name="Harare" inTabs />,
    );
    expect(tree.getByTestId("community-lane-empty")).toBeTruthy();
    expect(tree.getByTestId("recent-reports")).toBeTruthy();
    expect(tree.getByTestId("reports-off")).toBeTruthy();
    expect(tree.getByTestId("activity-invite")).toBeTruthy();
    expect(tree.getByTestId("ai-summary-signed-out")).toBeTruthy();
    expect(tree.queryByTestId("hero-activity-line")).toBeNull();
    expect(tree.queryByTestId("ai-followup")).toBeNull();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
    // No activities, no rules, no reports, no AI: none of those is requested.
    // (The weather cards below the tiles read air quality, haze and the
    // normals for the place's point; those carry no picks.)
    expect(
      calls.filter((c) =>
        /\/v1\/(activities|suitability|reports|ai\/|devices)/.test(c.url),
      ),
    ).toHaveLength(0);
  });

  it("opens the picker from the invitation", async () => {
    routedFetch(ROUTES);
    const tree = await render(
      <WeatherPage weather={weather()} name="Harare" inTabs />,
    );
    await fireEvent.press(tree.getByLabelText("Choose activities"));
    await waitFor(() =>
      expect(tree.getByTestId("activity-picker")).toBeTruthy(),
    );
    // Picking one removes the invitation from the page.
    await fireEvent.press(tree.getByTestId("activity-tile-football"));
    await waitFor(() =>
      expect(tree.queryByTestId("activity-invite")).toBeNull(),
    );
  });

  it("puts the sections in the web's order: Conditions, lane, tiles, week, reports, invitation, insight", async () => {
    const tree = await render(
      <WeatherPage weather={weather()} name="Harare" inTabs />,
    );
    const order = [
      "conditions-card",
      "community-lane-empty",
      "recent-reports",
      "activity-invite",
      "ai-summary-signed-out",
    ].map((id) => JSON.stringify(tree.toJSON()).indexOf(`"${id}"`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("a person with picks", () => {
  it("sees the lane and a hero line for the first pick, from the Worker's rules", async () => {
    toggleActivity("football");
    toggleActivity("crop-farming");
    const calls = routedFetch(ROUTES);
    const tree = await render(
      <WeatherPage weather={weather()} name="Harare" inTabs />,
    );
    const line = await tree.findByTestId("hero-activity-line");
    expect(line.props.accessibilityLabel).toMatch(
      /^Soccer \(Football\): (excellent|good|fair|poor) /,
    );
    expect(await tree.findByTestId("lane-football")).toBeTruthy();
    expect(tree.getByTestId("lane-crop-farming")).toBeTruthy();
    expect(tree.queryByTestId("activity-invite")).toBeNull();
    // Rules are asked for once for the hero, the lane and the sheet together.
    expect(calls.filter((c) => c.url.endsWith("/v1/suitability"))).toHaveLength(
      1,
    );
  });

  it("sends the picks nowhere: every request is a plain read of a list", async () => {
    toggleActivity("football");
    const calls = routedFetch(ROUTES);
    const tree = await render(
      <WeatherPage weather={weather()} name="Harare" inTabs />,
    );
    await tree.findByTestId("lane-football");
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.method).toBe("GET");
      expect(c.body).toBeUndefined();
      expect(c.url).not.toMatch(/football|activit(y|ies)=|selected/i);
    }
    expect(calls.some((c) => /\/v1\/(ai\/|reports|devices)/.test(c.url))).toBe(
      false,
    );
  });
});

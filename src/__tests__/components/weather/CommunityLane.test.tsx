/**
 * The Community lane: the empty invitation, the loading and failed rule
 * states, the 24 bars per activity (taller and stronger for a better hour,
 * in the PLACE's time), the sentence VoiceOver reads for a lane, the way into
 * the advice sheet, and the report pins (the pure parts: the switch is off, so
 * the screen shows none and says why).
 */

import { fireEvent, render, waitFor } from "@testing-library/react-native";

import activitiesFixture from "@/api/__fixtures__/activities.json";
import categoriesFixture from "@/api/__fixtures__/activity-categories.json";
import suitabilityFixture from "@/api/__fixtures__/suitability.json";
import { resetActivityCaches, rulesByKey, toRules } from "@/api/activities";
import { ActivitySheetsProvider } from "@/components/weather/ActivitySheets";
import {
  AXIS_STEP,
  CommunityLane,
  countLine,
  pinLeft,
} from "@/components/weather/CommunityLane";
import { ACTIVITIES, laneMineral } from "@/shared/activities";
import {
  LANE_HOURS,
  LANE_PAST_HOURS,
  buildLaneCells,
  laneSummary,
} from "@/shared/community-lane";
import { weatherOffsetSeconds } from "@/shared/location-time";
import { toggleActivity } from "@/state/preferences";
import { resetPreferences } from "@/test-utils/preferences";
import { LANE_ALPHA, LANE_HEIGHT } from "@/theme/ratings";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { routedFetch } from "@/test-utils/routed-fetch";
import {
  HAS_EMOJI,
  NOW,
  allText,
  harareWeather,
} from "@/test-utils/weather-fixtures";
import { TOUCH } from "@/theme/mzizi";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const forecast = harareWeather().forecast!;

const ROUTES = {
  "GET /v1/activities": (call: { url: string }) => ({
    body: call.url.includes("mode=categories")
      ? categoriesFixture
      : activitiesFixture,
  }),
  "GET /v1/suitability": { body: suitabilityFixture },
};

beforeEach(async () => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
  resetActivityCaches();
  await resetPreferences();
});

function Lane({ slug = "harare" }: { slug?: string }) {
  return (
    <ActivitySheetsProvider forecast={forecast} now={NOW}>
      <CommunityLane slug={slug} forecast={forecast} now={NOW} />
    </ActivitySheetsProvider>
  );
}

describe("CommunityLane with nothing picked", () => {
  it("invites the person to pick, and the button opens the picker", async () => {
    const calls = routedFetch(ROUTES);
    const tree = await render(<Lane />);
    expect(tree.getByText("Community lane")).toBeTruthy();
    expect(tree.getByText(/Choose the activities you care about/)).toBeTruthy();
    // Nothing is asked for until something is picked.
    expect(calls).toHaveLength(0);
    await fireEvent.press(tree.getByLabelText("Pick activities"));
    await waitFor(() =>
      expect(tree.getByText("Choose activities")).toBeTruthy(),
    );
  });
});

describe("CommunityLane with activities picked", () => {
  it("rates 24 hours per activity from the Worker's rules, and says what the lane means", async () => {
    toggleActivity("crop-farming");
    toggleActivity("football");
    routedFetch(ROUTES);
    const tree = await render(<Lane />);

    const rules = rulesByKey(toRules(suitabilityFixture));
    const offset = weatherOffsetSeconds(forecast, NOW);
    for (const id of ["crop-farming", "football"]) {
      const activity = ACTIVITIES.find((a) => a.id === id)!;
      const row = await tree.findByTestId(`lane-${id}`);
      const cells = buildLaneCells(
        activity,
        forecast.hourly,
        rules,
        NOW,
        offset,
      );
      // The sentence VoiceOver reads is the web's laneSummary.
      expect(row.props.accessibilityLabel).toBe(
        laneSummary(activity.label, cells, offset),
      );
      expect(row.props.accessibilityHint).toBe(
        `Opens the advice for ${activity.label}`,
      );
    }
    expect(
      tree.getByText(
        "12 hours back and 12 ahead. Bars are taller for better hours.",
      ),
    ).toBeTruthy();
    expect(tree.getByLabelText("All advice")).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("draws one bar per hour, taller and stronger for a better rating, in the category's lane mineral", async () => {
    toggleActivity("crop-farming");
    routedFetch(ROUTES);
    const tree = await render(<Lane />);
    await tree.findByTestId("lane-crop-farming");

    const rules = rulesByKey(toRules(suitabilityFixture));
    const offset = weatherOffsetSeconds(forecast, NOW);
    const crop = ACTIVITIES.find((a) => a.id === "crop-farming")!;
    const cells = buildLaneCells(crop, forecast.hourly, rules, NOW, offset);
    expect(cells).toHaveLength(LANE_HOURS);

    // One bar per hour; its height and strength are the cell's rating.
    const flat = (style: unknown) =>
      (Array.isArray(style) ? style.flat(3) : [style]).reduce(
        (acc: Record<string, unknown>, part) => ({
          ...acc,
          ...(part as object),
        }),
        {},
      );
    const opts = { includeHiddenElements: true };
    expect(laneMineral(crop.category)).toBe("malachite");
    let rated = 0;
    for (const c of cells) {
      const bar = tree.getByTestId(`lane-crop-farming-bar-${c.index}`, opts);
      const style = flat(bar.props.style);
      if (c.level) {
        rated += 1;
        expect(style.height).toBe(`${LANE_HEIGHT[c.level] * 100}%`);
        expect(String(style.backgroundColor)).toContain(
          `, ${Math.round(LANE_ALPHA[c.level] * 1000) / 1000})`,
        );
      } else {
        // No data is a quarter-height grey bar, never a rating.
        expect(style.height).toBe("25%");
      }
    }
    expect(rated).toBeGreaterThan(0);
    // The current hour is the 13th cell: past hours are dimmed, it is not.
    const past = flat(
      tree.getByTestId("lane-crop-farming-cell-0", opts).props.style,
    );
    const now = flat(
      tree.getByTestId(`lane-crop-farming-cell-${LANE_PAST_HOURS}`, opts).props
        .style,
    );
    expect(past.opacity).toBe(0.6);
    expect(now.opacity).toBeUndefined();
    expect(now.borderLeftWidth).toBe(2);
  });

  it("opens the advice sheet from a lane's row and from All advice", async () => {
    toggleActivity("football");
    routedFetch(ROUTES);
    const tree = await render(<Lane />);
    await fireEvent.press(await tree.findByTestId("lane-football"));
    await waitFor(() =>
      expect(tree.getByTestId("activities-sheet")).toBeTruthy(),
    );
    expect(tree.getByText("My activities")).toBeTruthy();
    await fireEvent.press(tree.getByLabelText("Close My activities"));
    await fireEvent.press(tree.getByLabelText("All advice"));
    await waitFor(() =>
      expect(tree.getByTestId("activities-sheet")).toBeTruthy(),
    );
  });

  it("shows loading, then a failure with a retry, and never a bar it could not rate", async () => {
    toggleActivity("football");
    routedFetch({
      "GET /v1/activities": ROUTES["GET /v1/activities"],
      "GET /v1/suitability": { status: 503, body: { error: "unavailable" } },
    });
    const tree = await render(<Lane />);
    await waitFor(() =>
      expect(
        tree.getByText(/Could not load the rules the lane is rated with/),
      ).toBeTruthy(),
    );
    expect(tree.queryByTestId("lane-football")).toBeNull();

    // The retry asks again and recovers.
    routedFetch(ROUTES);
    await fireEvent.press(tree.getByLabelText("Try again"));
    expect(await tree.findByTestId("lane-football")).toBeTruthy();
  });

  it("says plainly that neighbours' pins are not live yet, and makes no reports request", async () => {
    toggleActivity("football");
    const calls = routedFetch(ROUTES);
    const tree = await render(<Lane />);
    await tree.findByTestId("lane-football");
    expect(
      tree.getByText(/will show here as pins once community reports are live/),
    ).toBeTruthy();
    expect(calls.some((c) => c.url.includes("/v1/reports"))).toBe(false);
  });

  it("shows at most four lanes", async () => {
    for (const id of [
      "football",
      "driving",
      "crop-farming",
      "mining",
      "golf",
      "picnic",
    ]) {
      toggleActivity(id);
    }
    routedFetch(ROUTES);
    const tree = await render(<Lane />);
    await tree.findByTestId("lane-football");
    expect(tree.queryByTestId("lane-golf")).toBeNull();
    expect(tree.queryByTestId("lane-picnic")).toBeNull();
    expect(tree.getByTestId("lane-mining")).toBeTruthy();
  });

  it("sends no activity id and no coordinate anywhere", async () => {
    toggleActivity("football");
    const calls = routedFetch(ROUTES);
    const tree = await render(<Lane />);
    await tree.findByTestId("lane-football");
    for (const c of calls) {
      expect(c.method).toBe("GET");
      expect(c.url).not.toMatch(/football|lat=|lon=/);
    }
  });
});

describe("lane helpers", () => {
  it("words a pin's lines as the web does", () => {
    expect(countLine(1, "Heavy Rain")).toBe("1 report: heavy rain");
    expect(countLine(3, "Frost")).toBe("3 reports: frost");
  });

  it("keeps a pin's touch target inside the lane", () => {
    const width = 300;
    expect(pinLeft(0, width)).toBe(0);
    expect(pinLeft(LANE_HOURS - 1, width)).toBe(width - TOUCH.min);
    const mid = pinLeft(12, width);
    expect(mid).toBeGreaterThan(0);
    expect(mid + TOUCH.min).toBeLessThanOrEqual(width);
  });

  it("labels the axis every six hours", () => {
    expect(AXIS_STEP).toBe(6);
    expect(LANE_HOURS % AXIS_STEP).toBe(0);
  });
});

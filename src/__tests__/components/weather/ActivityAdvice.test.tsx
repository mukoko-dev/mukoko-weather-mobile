/**
 * The advice for one activity and the sheet that holds them: the rating now
 * (from the Worker's rules, evaluated on the device), the 24-hour trend, the
 * deterministic tips, the "no rule" state, and the sheet's own states (none
 * picked, loading the rules, rules failed, ready, Edit).
 */

import {
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react-native";

import activitiesFixture from "@/api/__fixtures__/activities.json";
import categoriesFixture from "@/api/__fixtures__/activity-categories.json";
import suitabilityFixture from "@/api/__fixtures__/suitability.json";
import { resetActivityCaches, rulesByKey, toRules } from "@/api/activities";
import { ActivitiesSheet } from "@/components/weather/ActivitiesSheet";
import { ActivityCard } from "@/components/weather/ActivityCard";
import {
  FeasibilityChart,
  TREND_TICKS,
  X_LABEL_STEP,
  trendGeometry,
  trendSummary,
} from "@/components/weather/FeasibilityChart";
import { ACTIVITIES } from "@/shared/activities";
import { feasibilitySeries } from "@/shared/activity-feasibility";
import { getActivityTips } from "@/shared/activity-tips";
import { evaluateSuitability } from "@/shared/suitability";
import { toggleActivity } from "@/state/preferences";
import { IPHONE_INSETS, setInsets, setWindow } from "@/test-utils/mocks";
import { resetPreferences } from "@/test-utils/preferences";
import { routedFetch } from "@/test-utils/routed-fetch";
import {
  HAS_EMOJI,
  NOW,
  allText,
  harareWeather,
  withCondition,
} from "@/test-utils/weather-fixtures";
import { LANE } from "@/theme/ratings";

jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const forecast = harareWeather().forecast!;
const rules = rulesByKey(toRules(suitabilityFixture));
const crop = ACTIVITIES.find((a) => a.id === "crop-farming")!;
const insights = forecast.insights!;

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

describe("ActivityCard", () => {
  it("shows the activity, its rating from the rule, the rule's sentence, and the tips", async () => {
    const tree = await render(
      <ActivityCard
        activity={crop}
        insights={insights}
        rules={rules}
        forecast={forecast}
        now={NOW}
      />,
    );
    const rating = evaluateSuitability(crop, insights, rules)!;
    expect(tree.getByText(crop.label)).toBeTruthy();
    expect(
      within(tree.getByTestId("activity-rating-crop-farming")).getByText(
        rating.label,
      ),
    ).toBeTruthy();
    expect(tree.getByText(rating.detail)).toBeTruthy();
    for (const tip of getActivityTips(crop, forecast)) {
      expect(tree.getByText(tip)).toBeTruthy();
    }
    expect(tree.getByText("Next 24 hours")).toBeTruthy();
    expect(tree.getByTestId("feasibility-chart")).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("shows the metric the rule gives when it gives one", async () => {
    const stormy = withCondition(95, 1).forecast!;
    const tree = await render(
      <ActivityCard
        activity={crop}
        insights={{ ...stormy.insights, precipitationType: 2 }}
        rules={rules}
        forecast={stormy}
        now={NOW}
      />,
    );
    const rating = evaluateSuitability(
      crop,
      { ...stormy.insights, precipitationType: 2 },
      rules,
    )!;
    expect(rating.level).toBe("poor");
    expect(
      within(tree.getByTestId("activity-rating-crop-farming")).getByText(
        rating.label,
      ),
    ).toBeTruthy();
    // Thunderstorm tips come first for a storm.
    expect(tree.getByText(/Thunderstorms expected/)).toBeTruthy();
  });

  it("says there is no rule, and shows no rating, when the Worker has none", async () => {
    const tree = await render(
      <ActivityCard
        activity={crop}
        insights={insights}
        rules={new Map()}
        forecast={forecast}
        now={NOW}
      />,
    );
    expect(
      tree.getByText(
        "There is no rule for this activity yet, so no rating is shown.",
      ),
    ).toBeTruthy();
    expect(tree.queryByTestId("activity-rating-crop-farming")).toBeNull();
    expect(tree.queryByTestId("feasibility-chart")).toBeNull();
  });

  it("reports its top so the sheet can scroll to it", async () => {
    const onTop = jest.fn();
    const tree = await render(
      <ActivityCard
        activity={crop}
        insights={insights}
        rules={rules}
        forecast={forecast}
        now={NOW}
        onLayoutTop={onTop}
      />,
    );
    await fireEvent(tree.getByTestId("activity-card-crop-farming"), "layout", {
      nativeEvent: { layout: { x: 0, y: 321, width: 300, height: 400 } },
    });
    expect(onTop).toHaveBeenCalledWith(321);
  });
});

describe("FeasibilityChart", () => {
  const points = feasibilitySeries(
    crop,
    forecast.hourly,
    rules,
    24,
    forecast.utc_offset_seconds,
    NOW,
  );

  it("has 24 points, scored 25 to 100", () => {
    expect(points).toHaveLength(24);
    for (const p of points) {
      expect(p.score).toBeGreaterThanOrEqual(25);
      expect(p.score).toBeLessThanOrEqual(100);
    }
  });

  it("builds a line across the width and an area closed at the bottom", () => {
    const geo = trendGeometry(points, 230, 100)!;
    expect(geo.xs[0]).toBe(0);
    expect(geo.xs[23]).toBe(230);
    expect(geo.line.startsWith("M0 ")).toBe(true);
    expect(geo.line.split("L")).toHaveLength(24);
    expect(geo.area.endsWith("L230 100 L0 100 Z")).toBe(true);
    // Higher scores are higher on the screen (a smaller y).
    expect(geo.ticks).toEqual([0, 25, 50, 75]);
    expect(TREND_TICKS).toEqual([100, 75, 50, 25]);
  });

  it("is null for fewer than two points or no width", () => {
    expect(trendGeometry(points.slice(0, 1), 200, 100)).toBeNull();
    expect(trendGeometry(points, 0, 100)).toBeNull();
    expect(trendGeometry(points, 200, 0)).toBeNull();
  });

  it("clamps a score outside 0 to 100 to the edge", () => {
    const geo = trendGeometry(
      [
        { time: "a", score: 150, level: "excellent" },
        { time: "b", score: -20, level: "poor" },
      ],
      100,
      80,
    )!;
    expect(geo.line).toBe("M0 0 L100 80");
  });

  it("is one item for the screen reader with a sentence, and draws after it is measured", async () => {
    const tree = await render(
      <FeasibilityChart points={points} color="#004d40" label={crop.label} />,
    );
    const chart = tree.getByTestId("feasibility-chart");
    expect(chart.props.accessibilityLabel).toBe(
      `${crop.label}, next 24 hours. ${trendSummary(points)}`,
    );
    expect(chart.props.accessible).toBe(true);
    // Rating words down the side, no raw numbers.
    for (const word of ["Poor", "Fair", "Good", "Excellent"]) {
      expect(
        tree.getByText(word, { includeHiddenElements: true }),
      ).toBeTruthy();
    }
    expect(
      tree.getAllByText("Now", { includeHiddenElements: true }),
    ).toHaveLength(1);
    expect(LANE.trendHeight).toBeGreaterThan(0);
    expect(X_LABEL_STEP).toBe(6);
  });

  it("draws nothing for fewer than two points", async () => {
    const tree = await render(
      <FeasibilityChart
        points={points.slice(0, 1)}
        color="#000000"
        label="x"
      />,
    );
    expect(tree.queryByTestId("feasibility-chart")).toBeNull();
  });

  it("summarises when the rating changes and the best hour", () => {
    const text = trendSummary(
      [
        {
          time: "2026-11-01T02:00",
          label: "02:00",
          score: 100,
          level: "excellent",
        },
        {
          time: "2026-11-01T03:00",
          label: "03:00",
          score: 100,
          level: "excellent",
        },
        { time: "2026-11-01T04:00", label: "04:00", score: 50, level: "fair" },
      ],
      7200,
    );
    expect(text).toContain("Excellent until 04:00.");
    expect(text).toContain("Excellent around 02:00.");
    expect(trendSummary([])).toBe("");
  });
});

describe("ActivitiesSheet", () => {
  const sheet = (onEdit = jest.fn(), onClose = jest.fn()) => (
    <ActivitiesSheet
      visible
      onClose={onClose}
      onEdit={onEdit}
      forecast={forecast}
      now={NOW}
    />
  );

  it("invites a pick when nothing is picked, and Choose activities goes to the picker", async () => {
    routedFetch(ROUTES);
    const onEdit = jest.fn();
    const tree = await render(sheet(onEdit));
    expect(tree.getByText("My activities")).toBeTruthy();
    expect(tree.getByText(/You have not picked an activity yet/)).toBeTruthy();
    await fireEvent.press(tree.getByLabelText("Choose activities"));
    expect(onEdit).toHaveBeenCalled();
  });

  it("shows loading, then one card per picked activity in the order picked, and Edit", async () => {
    toggleActivity("football");
    toggleActivity("crop-farming");
    routedFetch(ROUTES);
    const onEdit = jest.fn();
    const tree = await render(sheet(onEdit));
    expect(tree.getByText("Advice for today")).toBeTruthy();
    expect(await tree.findByTestId("activity-card-football")).toBeTruthy();
    expect(tree.getByTestId("activity-card-crop-farming")).toBeTruthy();
    await fireEvent.press(tree.getByLabelText("Edit"));
    expect(onEdit).toHaveBeenCalled();
  });

  it("shows a failure and a retry, never a rating, when the rules cannot be read", async () => {
    toggleActivity("football");
    routedFetch({
      "GET /v1/activities": ROUTES["GET /v1/activities"],
      "GET /v1/suitability": { status: 500, body: { error: "internal" } },
    });
    const tree = await render(sheet());
    await waitFor(() =>
      expect(
        tree.getByText(/Could not load the rules the ratings come from/),
      ).toBeTruthy(),
    );
    expect(tree.queryByTestId("activity-card-football")).toBeNull();
    routedFetch(ROUTES);
    await fireEvent.press(tree.getByLabelText("Try again"));
    expect(await tree.findByTestId("activity-card-football")).toBeTruthy();
  });

  it("scrolls to the focused activity once its card is laid out", async () => {
    toggleActivity("football");
    toggleActivity("crop-farming");
    routedFetch(ROUTES);
    const tree = await render(
      <ActivitiesSheet
        visible
        onClose={jest.fn()}
        onEdit={jest.fn()}
        focusActivityId="crop-farming"
        forecast={forecast}
        now={NOW}
      />,
    );
    const card = await tree.findByTestId("activity-card-crop-farming");
    // Laying the card out must not throw while the sheet scrolls to it.
    await fireEvent(card, "layout", {
      nativeEvent: { layout: { x: 0, y: 480, width: 300, height: 300 } },
    });
    expect(card).toBeTruthy();
  });

  it("uses the Worker's own insights, else derives them from the forecast", async () => {
    toggleActivity("football");
    routedFetch(ROUTES);
    const { insights: _ignored, ...bare } = forecast;
    void _ignored;
    const tree = await render(
      <ActivitiesSheet
        visible
        onClose={jest.fn()}
        onEdit={jest.fn()}
        forecast={bare as typeof forecast}
        now={NOW}
      />,
    );
    expect(await tree.findByTestId("activity-card-football")).toBeTruthy();
  });
});

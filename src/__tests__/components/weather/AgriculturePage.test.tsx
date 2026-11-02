/**
 * The agriculture page from recorded Worker answers: the whole page, the page
 * when the Worker has no farm data, the briefing's honest signed-out state, the
 * crop advice and calendar rules (a place with no calendar names no crops), the
 * charts' spoken summaries, and the 30-day card in each outcome.
 */

import { fireEvent, render } from "@testing-library/react-native";

import agricultureHarare from "@/api/__fixtures__/agriculture-harare.json";
import agricultureOff from "@/api/__fixtures__/agriculture-unavailable.json";
import { AgricultureBriefing } from "@/components/weather/AgricultureBriefing";
import { AgricultureCharts } from "@/components/weather/AgricultureCharts";
import { AgricultureCropAdvice } from "@/components/weather/AgricultureCropAdvice";
import { AgricultureHistory } from "@/components/weather/AgricultureHistory";
import { AgricultureScreen } from "@/components/weather/AgricultureScreen";
import {
  CropCalendarTable,
  spokenStages,
} from "@/components/weather/CropCalendarTable";
import { type AgriDay, type AgricultureResponse } from "@/shared/agriculture";
import { type PlaceInfo } from "@/shared/place-info";

import { RECORDED, routeFetch } from "@/test-utils/farm-fetch";
import {
  IPHONE_INSETS,
  PHONE_WIDTHS,
  setInsets,
  setWindow,
} from "@/test-utils/mocks";
import { HAS_EMOJI, allText } from "@/test-utils/weather-fixtures";
import { clearAgricultureCache } from "@/api/agriculture";

// The farm answer is shared between screens: each test starts with none.
beforeEach(() => clearAgricultureCache());

jest.mock("expo-router", () => require("@/test-utils/mocks").routerMock());
jest.mock("react-native-safe-area-context", () =>
  require("@/test-utils/mocks").safeAreaMock(),
);

const data = agricultureHarare as unknown as AgricultureResponse;
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

beforeEach(() => {
  setInsets(IPHONE_INSETS);
  setWindow(393, 852);
});

function screen(
  props: Partial<React.ComponentProps<typeof AgricultureScreen>> = {},
) {
  return (
    <AgricultureScreen
      place={HARARE}
      onBack={jest.fn()}
      onHome={jest.fn()}
      onPickCrops={jest.fn()}
      {...props}
    />
  );
}

describe("the agriculture page", () => {
  it("shows the title, the trail, the snapshot, the briefing, the charts, the calendar, the 30 days and the outlook", async () => {
    routeFetch(RECORDED);
    const tree = await render(screen());
    expect(tree.getByText("Harare Agriculture")).toBeTruthy();
    expect(tree.getByTestId("place-trail").props.accessibilityLabel).toBe(
      "Breadcrumb: Home / Harare / Agriculture",
    );
    expect(
      await tree.findByText("Good day to spray, harvest and irrigate."),
    ).toBeTruthy();
    expect(await tree.findByTestId("crop-calendar")).toBeTruthy();
    expect(await tree.findByTestId("agri-rain-et")).toBeTruthy();
    expect(await tree.findByTestId("agri-gdd")).toBeTruthy();
    expect(await tree.findByTestId("crop-advice")).toBeTruthy();
    expect(await tree.findByLabelText(/^Rain on file: /)).toBeTruthy();
    expect(await tree.findByText("El Niño")).toBeTruthy();
    expect(tree.getByTestId("agriculture-briefing")).toBeTruthy();
    // Province and height under the title; the page variant has no advice line or link.
    expect(tree.getByText("Harare · 1490 m")).toBeTruthy();
    expect(tree.queryByText(/Shamwari's farm advice/)).toBeNull();
    expect(
      tree.queryByRole("link", { name: /Full agriculture insights/ }),
    ).toBeNull();
    // Attribution, as the licence asks.
    expect(tree.getByText(/Windows and risks are rules of thumb/)).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("asks the Worker for the place, the point and the crops once, not once per card", async () => {
    const asked = routeFetch(RECORDED);
    const tree = await render(screen());
    await tree.findByTestId("crop-calendar");
    expect(asked.filter((p) => p === "/v1/agriculture")).toHaveLength(1);
    expect(asked.filter((p) => p === "/v1/locations/profile")).toHaveLength(1);
  });

  it("leaves out the cards that need farm data, and still shows the outlook, when the Worker has none", async () => {
    routeFetch({
      ...RECORDED,
      "/v1/agriculture": {
        body: { ...agricultureOff, reason: "provider_unavailable" },
      },
    });
    const tree = await render(screen());
    expect(await tree.findByText("Farm data is paused")).toBeTruthy();
    expect(tree.queryByTestId("crop-calendar")).toBeNull();
    expect(tree.queryByTestId("agriculture-charts")).toBeNull();
    expect(tree.queryByTestId("agriculture-history")).toBeNull();
    expect(tree.queryByTestId("crop-advice")).toBeNull();
    expect(await tree.findByText("El Niño")).toBeTruthy();
    expect(tree.getByTestId("agriculture-briefing")).toBeTruthy();
  });

  it("goes Back and Home from the top row", async () => {
    routeFetch(RECORDED);
    const onBack = jest.fn();
    const onHome = jest.fn();
    const tree = await render(screen({ onBack, onHome }));
    await fireEvent.press(tree.getByRole("button", { name: "Back" }));
    await fireEvent.press(tree.getByRole("link", { name: "Home" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it.each(PHONE_WIDTHS)(
    "renders at %i pt and at the largest text size",
    async (width) => {
      routeFetch(RECORDED);
      setWindow(width, 852, 2);
      const tree = await render(screen());
      expect(tree.getByText("Harare Agriculture")).toBeTruthy();
      await tree.findByTestId("crop-calendar");
    },
  );
});

describe("Shamwari's briefing while sign-in is off", () => {
  it("says what it is, why it is not here and what still works, with no sign-in button", async () => {
    const tree = await render(<AgricultureBriefing placeName="Harare" />);
    expect(tree.getByText("Shamwari agronomy briefing")).toBeTruthy();
    expect(tree.getByText(/needs an account/)).toBeTruthy();
    expect(
      tree.getByText(/Sign-in is not available in the app yet/),
    ).toBeTruthy();
    expect(tree.getByText(/live and do not need one/)).toBeTruthy();
    expect(tree.queryByRole("button")).toBeNull();
    expect(tree.queryByRole("link")).toBeNull();
  });
});

describe("crop advice", () => {
  const advice = [
    {
      id: "crop-farming",
      label: "Maize & Crop Farming",
      tips: ["Planting: Wait for planting rains. Topsoil is dry."],
    },
  ];

  it("lists the tips under each chosen crop", async () => {
    const tree = await render(
      <AgricultureCropAdvice
        advice={advice}
        crops={["crop-farming"]}
        onPickCrops={jest.fn()}
      />,
    );
    expect(tree.getByText("Maize & Crop Farming")).toBeTruthy();
    expect(tree.getByText(/Wait for planting rains/)).toBeTruthy();
  });

  it("offers to pick crops when none is chosen", async () => {
    const onPick = jest.fn();
    const tree = await render(
      <AgricultureCropAdvice advice={[]} crops={[]} onPickCrops={onPick} />,
    );
    await fireEvent.press(
      tree.getByRole("button", { name: "Pick your crops" }),
    );
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("says nothing needs action when crops are chosen but the week is quiet", async () => {
    const tree = await render(
      <AgricultureCropAdvice
        advice={[]}
        crops={["forestry"]}
        onPickCrops={jest.fn()}
      />,
    );
    expect(
      tree.getByText(/Nothing in this week's forecast needs special action/),
    ).toBeTruthy();
    expect(tree.queryByRole("button")).toBeNull();
  });
});

describe("the crop calendar", () => {
  it("draws a strip per crop with the stage letter in each cell and reads it as words", async () => {
    const tree = await render(
      <CropCalendarTable calendar={data.calendar} currentMonth={11} />,
    );
    const crop = tree.getByLabelText(/^Maize\. Now: planting\./);
    expect(crop.props.accessibilityLabel).toBe(
      "Maize. Now: planting. Plant: Nov to Dec. Grow: Dec to Mar. Harvest: Apr to May.",
    );
    // Colour is not the only signal: P, G and H sit in the cells.
    expect(tree.getAllByText("P").length).toBeGreaterThanOrEqual(2);
    expect(tree.getAllByText("H").length).toBeGreaterThanOrEqual(2);
  });

  it("names no crops for a place with no calendar, and says so", async () => {
    const tree = await render(
      <CropCalendarTable calendar={[]} currentMonth={11} />,
    );
    expect(
      tree.getByText(/A crop calendar for this place is not available yet/),
    ).toBeTruthy();
    expect(tree.queryByText(/Maize|Wheat|Sorghum/)).toBeNull();
  });

  it("speaks only the stages a crop has", () => {
    expect(
      spokenStages({
        id: "x",
        label: "X",
        phase: null,
        months: { harvest: [4, 5] },
      }),
    ).toBe("Harvest: Apr to May.");
  });
});

describe("the charts", () => {
  it("draws the five forecast charts and growing degree days from the recorded 46 days, each one spoken", async () => {
    const tree = await render(<AgricultureCharts daily={data.daily} />);
    const ids = [
      "agri-rain-et",
      "agri-balance",
      "agri-soil-moisture",
      "agri-soil-temp",
      "agri-spray",
      "agri-gdd",
    ];
    for (const id of ids) expect(tree.getByTestId(id)).toBeTruthy();
    const rain = tree.getByLabelText(/^Rain against crop water use\. 16 days,/);
    expect(rain.props.accessibilityLabel).toMatch(
      /Rain \(mm\): lowest 0 mm on .*highest/,
    );
    // Each is the app's one chart: one adjustable element with its summary.
    expect(tree.getAllByRole("adjustable").length).toBe(6);
  });

  it("leaves out a chart with no data instead of an empty frame (soil thins out after ~9 days)", async () => {
    const bare: AgriDay[] = data.daily.map((d) => ({
      ...d,
      soilMoisture0to1: null,
      soilMoisture1to3: null,
      soilMoisture3to9: null,
      soilMoisture9to27: null,
      soilMoisture27to81: null,
    }));
    const tree = await render(<AgricultureCharts daily={bare} />);
    expect(tree.queryByTestId("agri-soil-moisture")).toBeNull();
    expect(tree.getByTestId("agri-soil-temp")).toBeTruthy();
  });

  it("draws nothing when there are no days", async () => {
    const tree = await render(<AgricultureCharts daily={[]} />);
    expect(tree.queryAllByRole("adjustable")).toHaveLength(0);
  });
});

describe("the past 30 days against normal", () => {
  it("shows the recorded rain and mean high and low beside the normals, with the anomaly signed", async () => {
    routeFetch(RECORDED);
    const tree = await render(
      <AgricultureHistory
        slug="harare"
        lat={-17.83}
        lon={31.05}
        modelRain30dMm={27.5}
      />,
    );
    expect(await tree.findByLabelText(/^Mean high: /)).toBeTruthy();
    expect(
      tree.getByLabelText(/^Rain on file: /).props.accessibilityLabel,
    ).toContain("8 days stored (forecast or archive, not a gauge)");
    expect(tree.getByLabelText("Rain (forecast model): 28 mm")).toBeTruthy();
    expect(tree.getByLabelText(/^Mean high: .*Normal 29°C/)).toBeTruthy();
    expect(tree.getByText(/Normals: 1991–2020 average/)).toBeTruthy();
    expect(tree.queryByTestId("agriculture-history-trouble")).toBeNull();
  });

  it("says the history could not load, with Try again, and keeps the model's rain", async () => {
    routeFetch({ ...RECORDED, "/v1/history": "offline" });
    const tree = await render(
      <AgricultureHistory
        slug="harare"
        lat={-17.83}
        lon={31.05}
        modelRain30dMm={27.5}
      />,
    );
    expect(await tree.findByTestId("agriculture-history-trouble")).toBeTruthy();
    expect(
      tree.getByText("History could not be loaded just now."),
    ).toBeTruthy();
    expect(tree.getByLabelText("Rain (forecast model): 28 mm")).toBeTruthy();
    expect(tree.getByLabelText("Rain on file: —")).toBeTruthy();
  });

  it("says a partial answer may be incomplete (the Worker's degraded flag), not that the archive is late", async () => {
    const history = {
      ...(RECORDED["/v1/history"] as { body: object }).body,
      degraded: true,
    };
    routeFetch({ ...RECORDED, "/v1/history": { body: history } });
    const tree = await render(
      <AgricultureHistory
        slug="harare"
        lat={-17.83}
        lon={31.05}
        modelRain30dMm={null}
      />,
    );
    expect(await tree.findByText(/may be incomplete/)).toBeTruthy();
    expect(tree.getByLabelText("Rain (forecast model): —")).toBeTruthy();
  });

  it("shows a dash, never zero, for normals the Worker does not have", async () => {
    routeFetch({ ...RECORDED, "/v1/normals": { body: { available: false } } });
    const tree = await render(
      <AgricultureHistory
        slug="harare"
        lat={-17.83}
        lon={31.05}
        modelRain30dMm={1}
      />,
    );
    expect(await tree.findByLabelText(/^Mean high: .*Normal —/)).toBeTruthy();
  });

  it("says a bare GPS point has no record, and asks for no history", async () => {
    const asked = routeFetch(RECORDED);
    const tree = await render(
      <AgricultureHistory lat={-17.76} lon={31.06} modelRain30dMm={12} />,
    );
    expect(
      await tree.findByText(/Recorded days are kept for named places/),
    ).toBeTruthy();
    expect(asked).not.toContain("/v1/history");
    expect(tree.getByLabelText("Rain (forecast model): 12 mm")).toBeTruthy();
  });
});

/**
 * The Next hour and Model comparison cards: present only when the answer
 * carries their data, each in its own boundary, with the web's wording.
 */

import { render } from "@testing-library/react-native";

import {
  ForecastExtras,
  MinutelyCard,
  ModelComparisonCard,
} from "@/components/weather/ForecastExtras";
import { SectionBoundary } from "@/components/weather/SectionBoundary";
import { Text } from "react-native";
import { setWindow } from "@/test-utils/mocks";
import {
  HAS_EMOJI,
  allText,
  harareWeather,
} from "@/test-utils/weather-fixtures";

beforeEach(() => setWindow(393, 852));

describe("ForecastExtras", () => {
  it("draws both cards from the recorded answer", async () => {
    const tree = await render(<ForecastExtras weather={harareWeather()} />);
    expect(tree.getByTestId("minutely-card")).toBeTruthy();
    expect(tree.getByTestId("model-comparison-card")).toBeTruthy();
  });

  it("draws nothing when the answer has neither", async () => {
    const weather = {
      ...harareWeather(),
      minutely: undefined,
      models: undefined,
      modelsTime: undefined,
    };
    const tree = await render(<ForecastExtras weather={weather} />);
    expect(tree.toJSON()).toBeNull();
  });

  it("draws only the models when there is no nowcast, and the reverse", async () => {
    const a = await render(
      <ForecastExtras weather={{ ...harareWeather(), minutely: undefined }} />,
    );
    expect(a.queryByTestId("minutely-card")).toBeNull();
    expect(a.getByTestId("model-comparison-card")).toBeTruthy();
    const b = await render(
      <ForecastExtras weather={{ ...harareWeather(), models: undefined }} />,
    );
    expect(b.getByTestId("minutely-card")).toBeTruthy();
    expect(b.queryByTestId("model-comparison-card")).toBeNull();
  });
});

describe("MinutelyCard", () => {
  it("says there is no rain and shows four quiet steps, not a chart of zeros", async () => {
    const tree = await render(
      <MinutelyCard minutely={{ time: [], precipitation: [0, 0, 0, 0] }} />,
    );
    expect(tree.getByText("Next hour")).toBeTruthy();
    expect(tree.getByText("15-minute precipitation")).toBeTruthy();
    expect(tree.getByText("No rain expected in the next hour.")).toBeTruthy();
    expect(
      tree.getByLabelText("No precipitation expected in the next hour."),
    ).toBeTruthy();
    for (const step of ["Now", "+15", "+30", "+45"]) {
      expect(tree.getByText(step)).toBeTruthy();
    }
  });

  it("charts the rain when there is some, and says when it starts", async () => {
    const tree = await render(
      <MinutelyCard minutely={{ time: [], precipitation: [0, 0, 0.5, 0.2] }} />,
    );
    expect(tree.getByText("Rain starting in ~30 min.")).toBeTruthy();
    expect(
      tree.getByLabelText(/^Rain, next hour\. Rain \(mm\): from 0 mm at Now/),
    ).toBeTruthy();
  });
});

describe("ModelComparisonCard", () => {
  it("names the four models, charts their lines and says how far apart they are", async () => {
    const w = harareWeather();
    const tree = await render(
      <ModelComparisonCard models={w.models!} time={w.modelsTime!} />,
    );
    expect(tree.getByText("Model comparison")).toBeTruthy();
    expect(tree.getByText("Hourly temperature °C")).toBeTruthy();
    expect(
      tree.getByText(
        "How the major forecast models (ECMWF IFS, ECMWF AIFS, GFS, ICON) agree or diverge on the day.",
      ),
    ).toBeTruthy();
    // The two extra blend members the Worker sends are not drawn, and no raw id shows.
    expect(JSON.stringify(tree.toJSON())).not.toContain("ukmo_global");
    expect(JSON.stringify(tree.toJSON())).not.toContain("jma_gsm");
    expect(
      tree.getByText(/^The models are up to [\d.]+° apart at their widest\.$/),
    ).toBeTruthy();
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("draws nothing without a usable model or time axis", async () => {
    const tree = await render(<ModelComparisonCard models={[]} time={[]} />);
    expect(tree.toJSON()).toBeNull();
  });
});

describe("SectionBoundary", () => {
  it("shows a compact fallback instead of taking the page down", async () => {
    const spy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const warn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    function Boom(): never {
      throw new Error("chart exploded");
    }
    const tree = await render(
      <>
        <SectionBoundary name="the thing">
          <Boom />
        </SectionBoundary>
        <Text>the rest of the page</Text>
      </>,
    );
    expect(tree.getByText("Unable to display the thing.")).toBeTruthy();
    expect(tree.getByText("the rest of the page")).toBeTruthy();
    spy.mockRestore();
    warn.mockRestore();
  });
});

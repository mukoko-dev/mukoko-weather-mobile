/**
 * The labels and `prepareModelComparisonData` mirror mukoko-weather
 * `ModelComparisonChart.tsx`; the filtering and spread are the mobile card's.
 */

import {
  COMPARISON_MODELS,
  FORECAST_MODEL_LABELS,
  type ModelForecast,
  comparisonSeries,
  modelShortLabel,
  prepareModelComparisonData,
  widestSpread,
} from "./model-comparison";

const hours = Array.from({ length: 30 }, (_, i) => `2026-11-01T${String(i % 24).padStart(2, "0")}:00`);
const model = (id: string, base: number): ModelForecast => ({
  model: id,
  temperature_2m: hours.map((_, i) => base + i / 10),
  precipitation: hours.map(() => 0),
});

describe("labels", () => {
  it("shortens to the agency acronym, as the web does", () => {
    expect(modelShortLabel("ecmwf_ifs")).toBe("ECMWF IFS");
    expect(modelShortLabel("ecmwf_aifs025_single")).toBe("ECMWF AIFS");
    expect(modelShortLabel("gfs_seamless")).toBe("GFS");
    expect(modelShortLabel("icon_global")).toBe("ICON");
    expect(modelShortLabel("meteofrance_seamless")).toBe("Météo-France");
    expect(modelShortLabel("something_new")).toBe("something_new");
  });

  it("labels every comparison model", () => {
    for (const id of COMPARISON_MODELS) {
      expect(FORECAST_MODEL_LABELS[id]).toBeTruthy();
    }
  });
});

describe("comparisonSeries", () => {
  it("keeps the web's four models in the web's order and drops the rest", () => {
    const answer = [
      model("jma_gsm", 20),
      model("icon_global", 21),
      model("ukmo_global_deterministic_10km", 22),
      model("ecmwf_ifs", 23),
      model("gfs_seamless", 24),
      model("ecmwf_aifs025_single", 25),
    ];
    expect(comparisonSeries(answer).map((m) => m.model)).toEqual([
      "ecmwf_ifs",
      "ecmwf_aifs025_single",
      "gfs_seamless",
      "icon_global",
    ]);
  });

  it("skips a model with no temperature series, and copes with no answer", () => {
    const empty: ModelForecast = { model: "gfs_seamless", temperature_2m: [], precipitation: [] };
    expect(comparisonSeries([empty])).toEqual([]);
    expect(comparisonSeries(undefined)).toEqual([]);
  });
});

describe("prepareModelComparisonData", () => {
  it("is at most 24 hours and keeps a gap as null", () => {
    const m = model("ecmwf_ifs", 20);
    m.temperature_2m[3] = null;
    const data = prepareModelComparisonData([m], hours);
    expect(data.times).toHaveLength(24);
    expect(data.series[0].label).toBe("ECMWF IFS");
    expect(data.series[0].values).toHaveLength(24);
    expect(data.series[0].values[3]).toBeNull();
    expect(data.series[0].values[4]).toBeCloseTo(20.4);
  });

  it("is empty for no time axis", () => {
    expect(prepareModelComparisonData([model("ecmwf_ifs", 20)], []).times).toEqual([]);
  });
});

describe("widestSpread", () => {
  it("is the widest disagreement between models at one hour", () => {
    const data = prepareModelComparisonData(
      [model("ecmwf_ifs", 20), model("gfs_seamless", 23)],
      hours,
    );
    expect(widestSpread(data)).toBe(3);
  });
  it("is null with fewer than two models", () => {
    expect(widestSpread(prepareModelComparisonData([model("ecmwf_ifs", 20)], hours))).toBeNull();
  });
});

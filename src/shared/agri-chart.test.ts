import agricultureHarare from "@/api/__fixtures__/agriculture-harare.json";

import { type AxisSpec, type SeriesSpec, describeChart } from "./agri-chart";
import { type AgricultureResponse, forecastChartRows } from "./agriculture";

const rows = forecastChartRows(
  (agricultureHarare as unknown as AgricultureResponse).daily,
);
const mm: AxisSpec = { min: 0, format: (v) => `${v} mm` };
const rain: SeriesSpec = {
  key: "rainMm",
  label: "Rain",
  kind: "bar",
  tone: "rain",
};
const et0: SeriesSpec = { key: "et0Mm", label: "ET₀", tone: "terracotta" };

describe("describeChart (what VoiceOver reads)", () => {
  it("names the span and each series' low and high with the day", () => {
    const text = describeChart(
      "Rain against crop water use",
      rows,
      [rain, et0],
      mm,
    );
    expect(text).toContain("Rain against crop water use. 16 days,");
    expect(text).toContain(`${rows[0].date} to ${rows[rows.length - 1].date}`);
    expect(text).toMatch(/Rain: lowest .* mm on .*, highest .* mm on .*\./);
    expect(text).toContain("ET₀: lowest");
  });

  it("says so, instead of reading zero, for a series with no value", () => {
    const text = describeChart(
      "Soil",
      [{ date: "1 Nov", sm: null }],
      [{ key: "sm", label: "Topsoil", tone: "x" }],
      { format: String },
    );
    expect(text).toContain("Topsoil: no data.");
  });

  it("says there is no data for no rows", () => {
    expect(describeChart("Soil", [], [], { format: String })).toBe(
      "Soil. No data.",
    );
  });
});

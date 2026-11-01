/**
 * What each detail chart draws, against the web's chart components: the series,
 * the axes, the colours (a measured quantity in its weather colour, never a
 * mineral; a model in its categorical line).
 */

import { metricChartSpec, modelChartSpec, monthlyChartSpec, nowcastChartSpec, uvDaysChartSpec } from "@/components/weather/charts/chart-specs";
import { resolveAxis } from "@/shared/chart-geometry";
import { type MetricChart, metricSeries } from "@/shared/metric-details";
import { nowcastRows } from "@/shared/nowcast";
import { prepareModelComparisonData } from "@/shared/model-comparison";
import { WX_UV } from "@/theme/mzizi";
import { WX_SERIES, modelLineColor } from "@/theme/weather-scales";

import { HARARE_OFFSET, NOW, harareWeather } from "@/test-utils/weather-fixtures";

const weather = harareWeather();
const points = metricSeries(weather.forecast!.hourly, HARARE_OFFSET, NOW);

describe("the next-24-hours charts", () => {
  const charts: NonNullable<MetricChart>[] = [
    "wind",
    "uv",
    "feels",
    "visibility",
    "rain",
    "humidity",
    "pressure",
  ];

  it.each(charts)("%s has a title, an x label per hour and a value per label", (chart) => {
    const spec = metricChartSpec(chart, points, "light");
    expect(spec.title).toMatch(/next 24 hours/);
    expect(spec.labels).toHaveLength(points.length);
    expect(spec.labels[0]).toBe("Now");
    for (const s of spec.series) {
      expect(s.values).toHaveLength(points.length);
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it("draws wind as an area with dashed gusts, on a floor of zero with headroom", () => {
    const spec = metricChartSpec("wind", points, "light");
    expect(spec.series.map((s) => [s.kind ?? "line", s.dashed ?? false])).toEqual([
      ["area", false],
      ["line", true],
    ]);
    expect(spec.left.min).toBe(0);
    const top = Math.max(...points.map((p) => Math.max(p.windSpeed, p.windGusts)));
    expect(spec.left.max).toBe(top + 5);
  });

  it("colours UV bars by the WHO band of each value, not by a mineral", () => {
    const spec = metricChartSpec("uv", points, "light");
    const s = spec.series[0];
    expect(s.kind).toBe("bar");
    expect(s.barColors).toHaveLength(points.length);
    for (const c of s.barColors ?? []) expect(WX_UV).toContain(c);
    expect(spec.left.max).toBeGreaterThanOrEqual(12);
  });

  it("puts rain bars on the left (mm) and the chance as a dashed line on the right (%)", () => {
    const spec = metricChartSpec("rain", points, "dark");
    expect(spec.series[0].kind).toBe("bar");
    expect(spec.series[0].color).toBe(WX_SERIES.dark.rain);
    expect(spec.series[1].axis).toBe("right");
    expect(spec.series[1].dashed).toBe(true);
    expect(spec.right).toMatchObject({ min: 0, max: 100 });
    expect(spec.right!.format(50)).toBe("50%");
    expect(spec.left.format(3)).toBe("3 mm");
  });

  it("scales pressure to its own range, not from zero", () => {
    const spec = metricChartSpec("pressure", points, "light");
    const p = points.map((x) => x.pressure);
    expect(spec.left.min).toBe(Math.min(...p) - 2);
    expect(spec.left.max).toBe(Math.max(...p) + 2);
    const axis = resolveAxis(spec.series[0].values, spec.left);
    expect(axis.min).toBeGreaterThan(800);
  });

  it("fixes humidity to 0-100 percent and visibility to a floor of 0 km", () => {
    expect(metricChartSpec("humidity", points, "light").left).toMatchObject({ min: 0, max: 100 });
    expect(metricChartSpec("visibility", points, "light").left.min).toBe(0);
  });
});

describe("the other charts", () => {
  it("the UV days are one bar a day, banded", () => {
    const spec = uvDaysChartSpec([
      { date: "2026-11-01", label: "Today", peak: 11.2, category: "Extreme" },
      { date: "2026-11-02", label: "Mon", peak: 4, category: "Moderate" },
    ]);
    expect(spec.labels).toEqual(["Today", "Mon"]);
    expect(spec.series[0].barColors).toEqual([WX_UV[4], WX_UV[1]]);
  });

  it("monthly temperature is two lines (the low dashed); rainfall is bars from zero", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      label: `M${i}`,
      meanHighC: 25,
      meanLowC: 14,
      precipMm: i * 10,
      rainyDays: 3,
    }));
    const t = monthlyChartSpec(rows, "temperature", "light");
    expect(t.series.map((s) => s.dashed ?? false)).toEqual([false, true]);
    expect(t.left.format(25)).toBe("25°");
    const p = monthlyChartSpec(rows, "precipitation", "light");
    expect(p.series[0].kind).toBe("bar");
    expect(p.left.min).toBe(0);
    expect(p.labels).toHaveLength(12);
  });

  it("monthly rainfall keeps a missing month as a gap, not zero", () => {
    const rows = [{ label: "Jan", meanHighC: null, meanLowC: null, precipMm: null, rainyDays: null }];
    expect(monthlyChartSpec(rows, "precipitation", "light").series[0].values).toEqual([null]);
  });

  it("the models chart draws one coloured line per model with hour labels", () => {
    const models = weather.models!.filter((m) => m.model !== "jma_gsm");
    const data = prepareModelComparisonData(models, weather.modelsTime!);
    const spec = modelChartSpec(data, "light");
    expect(spec.labels[0]).toBe("00:00");
    expect(spec.series.map((s) => s.color)).toEqual(
      data.series.map((s) => modelLineColor(s.key, "light")),
    );
    expect(spec.legend).toBe(true);
  });

  it("the nowcast is four rain bars from zero", () => {
    const spec = nowcastChartSpec(nowcastRows({ time: [], precipitation: [0, 0.2, 0.4, 0.1] }), "light");
    expect(spec.labels).toEqual(["Now", "+15", "+30", "+45"]);
    expect(spec.series[0].kind).toBe("bar");
    expect(spec.left.min).toBe(0);
  });
});

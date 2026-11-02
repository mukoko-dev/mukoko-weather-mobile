/**
 * What each detail chart draws, against the web's chart components: the series,
 * the axes, the colours (a measured quantity in its weather colour, never a
 * mineral; a model in its categorical line).
 */

import {
  type ChartSpec,
  chartProps,
  metricChartSpec,
  modelChartSpec,
  monthlyChartSpec,
  nowcastChartSpec,
  uvDaysChartSpec,
} from "@/components/weather/charts/chart-specs";
import { resolveDomain } from "@/components/weather/charts/chart-layout";
import { type MetricChart, metricSeries } from "@/shared/metric-details";
import { nowcastRows } from "@/shared/nowcast";
import { prepareModelComparisonData } from "@/shared/model-comparison";
import { WX_UV } from "@/theme/mzizi";
import { WX_SERIES, modelLineColor } from "@/theme/weather-scales";

import {
  HARARE_OFFSET,
  NOW,
  harareWeather,
} from "@/test-utils/weather-fixtures";

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

  it.each(charts)(
    "%s has a title, an x label per hour and a value per label",
    (chart) => {
      const spec = metricChartSpec(chart, points, "light");
      expect(spec.title).toMatch(/next 24 hours/);
      expect(spec.labels).toHaveLength(points.length);
      expect(spec.labels[0]).toBe("Now");
      for (const s of spec.series) {
        expect(s.values).toHaveLength(points.length);
        expect(s.label.length).toBeGreaterThan(0);
      }
    },
  );

  it("draws wind as an area with dashed gusts, on a floor of zero with headroom", () => {
    const spec = metricChartSpec("wind", points, "light");
    expect(
      spec.series.map((s) => [s.kind ?? "line", s.dashed ?? false]),
    ).toEqual([
      ["area", false],
      ["line", true],
    ]);
    expect(spec.left.min).toBe(0);
    const top = Math.max(
      ...points.map((p) => Math.max(p.windSpeed ?? 0, p.windGusts ?? 0)),
    );
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
    const p = points.map((x) => x.pressure as number);
    expect(spec.left.min).toBe(Math.min(...p) - 2);
    expect(spec.left.max).toBe(Math.max(...p) + 2);
    const domain = resolveDomain(spec.series[0].values, spec.left, false);
    expect(domain!.min).toBeGreaterThan(800);
  });

  it("leaves a gap for an hour with no reading, and never scales an axis from a zero", () => {
    // Hours the forecast has no pressure, visibility or UV for are `null`.
    const gappy = points.map((p, i) =>
      i % 4 === 1
        ? { ...p, pressure: null, visibility: null, uvIndex: null }
        : p,
    );
    const pressure = metricChartSpec("pressure", gappy, "light");
    expect(pressure.series[0].values.filter((v) => v === null)).toHaveLength(
      gappy.filter((_, i) => i % 4 === 1).length,
    );
    // The axis still follows the real readings (about 1012 hPa), not a 0.
    expect(pressure.left.min).toBeGreaterThan(800);
    expect(
      metricChartSpec("visibility", gappy, "light").series[0].values,
    ).toContain(null);
    const uv = metricChartSpec("uv", gappy, "light");
    expect(uv.series[0].values).toContain(null);
    expect(uv.series[0].barColors).toHaveLength(gappy.length);
    // With no reading at all, an axis falls back instead of going to -2.
    const none = points.map((p) => ({ ...p, pressure: null }));
    expect(metricChartSpec("pressure", none, "light").left.min).toBe(1008);
  });

  it("fixes humidity to 0-100 percent and visibility to a floor of 0 km", () => {
    expect(metricChartSpec("humidity", points, "light").left).toMatchObject({
      min: 0,
      max: 100,
    });
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
    const rows = [
      {
        label: "Jan",
        meanHighC: null,
        meanLowC: null,
        precipMm: null,
        rainyDays: null,
      },
    ];
    expect(
      monthlyChartSpec(rows, "precipitation", "light").series[0].values,
    ).toEqual([null]);
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
    const spec = nowcastChartSpec(
      nowcastRows({ time: [], precipitation: [0, 0.2, 0.4, 0.1] }),
      "light",
    );
    expect(spec.labels).toEqual(["Now", "+15", "+30", "+45"]);
    expect(spec.series[0].kind).toBe("bar");
    expect(spec.left.min).toBe(0);
  });
});

describe("chartProps: every spec is drawn by the one TimeSeriesChart", () => {
  const spec: ChartSpec = {
    title: "Rain",
    labels: ["Now", "15:00"],
    series: [
      {
        key: "mm",
        label: "Rain (mm)",
        unit: "mm",
        values: [1, null],
        color: "#123456",
        kind: "bar",
        barColors: ["#aa0000", "#00aa00"],
      },
      {
        key: "pct",
        label: "Chance",
        unit: "%",
        values: [20, 40],
        color: "#654321",
        kind: "area",
        axis: "right",
      },
    ],
    left: { min: 0, format: (v) => `${v} mm` },
    right: { min: 0, max: 100, format: (v) => `${v}%` },
    maxXLabels: 4,
  };
  const props = chartProps(spec, "rain-chart");

  it("turns the labels and values into points, a missing reading a gap", () => {
    expect(props.data).toEqual([
      { label: "Now", mm: 1, pct: 20 },
      { label: "15:00", mm: null, pct: 40 },
    ]);
    expect(props.labelKey).toBe("label");
    expect(props.testID).toBe("rain-chart");
    expect(props.maxTicksLimit).toBe(4);
  });

  it("keeps kind, axis and per-bar colours", () => {
    const [bars, area] = props.series;
    expect(bars).toMatchObject({ type: "bar", fill: false, yAxisID: "y" });
    expect(bars.colorByValue?.(1, 0)).toBe("#aa0000");
    expect(bars.colorByValue?.(null, 1)).toBe("#00aa00");
    expect(area).toMatchObject({ type: "line", fill: true, yAxisID: "right" });
    expect(props.yAxes?.y).toMatchObject({ min: 0, position: "left" });
    expect(props.yAxes?.right).toMatchObject({ max: 100, position: "right" });
  });

  it("says each value with its unit", () => {
    expect(props.valueFormat?.("Rain (mm)", 2)).toBe("2 mm");
    expect(props.valueFormat?.("Chance", 40)).toBe("40%");
  });
});

/** The words a chart says for VoiceOver: a sentence per series, and one point at a time. */

import {
  defaultValueFormat,
  describeChart,
  describeSeries,
  pointText,
  readingText,
} from "./chart-text";

const labels = ["Now", "09:00", "10:00", "11:00"];
const deg = (_l: string, v: number) => `${v}°C`;

describe("describeSeries", () => {
  it("names the lowest and highest value and when they happen", () => {
    expect(
      describeSeries({ label: "Temperature", values: [21, 25, 29, 27] }, labels, deg),
    ).toBe("Temperature: lowest 21°C at Now, highest 29°C at 10:00.");
  });

  it("says steady for a flat series", () => {
    expect(
      describeSeries({ label: "Pressure", values: [1013, 1013, 1013, 1013] }, labels, (
        _l,
        v,
      ) => `${v} hPa`),
    ).toBe("Pressure: steady at 1013 hPa.");
  });

  it("ignores gaps, and says no data when there is nothing", () => {
    expect(
      describeSeries({ label: "Wind", values: [null, 12, null, 8] }, labels),
    ).toBe("Wind: lowest 8 at 11:00, highest 12 at 09:00.");
    expect(describeSeries({ label: "Wind", values: [null, null] }, labels)).toBe(
      "Wind: no data.",
    );
  });

  it("uses the plain number when no format is given", () => {
    expect(defaultValueFormat("x", 4)).toBe("4");
  });
});

describe("describeChart and pointText", () => {
  const series = [
    { label: "Temperature", values: [21, 25, 29, 27] },
    { label: "Rain %", values: [0, 30, null, 10] },
  ];

  it("joins one sentence per series", () => {
    expect(describeChart(series, labels, deg)).toBe(
      "Temperature: lowest 21°C at Now, highest 29°C at 10:00. Rain %: lowest 0°C at Now, highest 30°C at 09:00.",
    );
  });

  it("reads one point: its label, then each series, a gap as no data", () => {
    expect(pointText(series, labels, 2, deg)).toBe(
      "10:00. Temperature: 29°C. Rain %: no data",
    );
    expect(readingText(series[0], 1, deg)).toBe("Temperature: 25°C");
    expect(readingText(series[1], 2, deg)).toBe("Rain %: no data");
  });
});

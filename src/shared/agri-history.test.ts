import historyHarare from "@/api/__fixtures__/history-harare-8.json";
import normalsHarare from "@/api/__fixtures__/normals-harare.json";

import { summarizeHistory } from "./agriculture";
import {
  DEGRADED_NOTE,
  HISTORY_FAILED_NOTE,
  WINDOW_DAYS,
  averageNormals,
  isoDaysAgo,
  readHistoryAnswer,
  readNormals,
} from "./agri-history";

describe("readHistoryAnswer", () => {
  it("reads a recorded Harare answer", () => {
    const a = readHistoryAnswer(historyHarare);
    expect(a.data).toHaveLength(8);
    expect(a.degraded).toBe(false);
    expect(a.missing).toBe(0);
  });

  it("feeds the summary the recorded days", () => {
    const s = summarizeHistory(
      readHistoryAnswer(historyHarare).data as never[],
    );
    expect(s.days).toBe(8);
    expect(s.meanHigh).not.toBeNull();
    expect(s.meanLow).not.toBeNull();
    expect(s.rainMm).not.toBeNull();
  });

  it("treats an unreadable body as empty and not degraded", () => {
    for (const bad of [null, undefined, "x", 3, []]) {
      expect(readHistoryAnswer(bad)).toEqual({
        data: [],
        degraded: false,
        missing: 0,
      });
    }
  });

  it("carries the degraded flag and the missing count only as the Worker sent them", () => {
    expect(
      readHistoryAnswer({ data: [], degraded: true, missing: 3 }),
    ).toEqual({ data: [], degraded: true, missing: 3 });
    expect(readHistoryAnswer({ degraded: "yes", missing: "3" })).toEqual({
      data: [],
      degraded: false,
      missing: 0,
    });
  });

  it("has honest notes", () => {
    expect(DEGRADED_NOTE).toContain("may be incomplete");
    expect(HISTORY_FAILED_NOTE).toBe("History could not be loaded just now.");
  });
});

describe("normals for the window", () => {
  it("reads a recorded answer", () => {
    expect(readNormals(normalsHarare)).toEqual({
      available: true,
      normalHigh: 28.6,
      normalLow: 16.2,
    });
  });

  it("is unavailable unless the Worker says available", () => {
    expect(readNormals({ available: false, reason: "no_data" })).toEqual({
      available: false,
    });
    expect(readNormals(null)).toEqual({ available: false });
    expect(
      readNormals({ available: true, normalHigh: "hot", normalLow: 10 }),
    ).toEqual({ available: true, normalHigh: null, normalLow: 10 });
  });

  it("averages both ends of the window", () => {
    expect(
      averageNormals(
        { available: true, normalHigh: 26, normalLow: 14 },
        { available: true, normalHigh: 28.6, normalLow: 16.2 },
      ),
    ).toEqual({ available: true, normalHigh: 27.3, normalLow: 15.1 });
  });

  it("lets one end stand alone and knows nothing when both are missing", () => {
    const some = { available: true, normalHigh: 27, normalLow: 15 };
    expect(averageNormals({ available: false }, some)).toEqual(some);
    expect(averageNormals(some, { available: false })).toEqual(some);
    expect(
      averageNormals({ available: false }, { available: false }),
    ).toEqual({ available: false });
  });

  it("keeps the one value an end has", () => {
    expect(
      averageNormals(
        { available: true, normalHigh: 26, normalLow: null },
        { available: true, normalHigh: 28, normalLow: 16 },
      ),
    ).toEqual({ available: true, normalHigh: 27, normalLow: 16 });
  });
});

describe("the window", () => {
  it("is 30 days and counts back from now", () => {
    expect(WINDOW_DAYS).toBe(30);
    const now = Date.UTC(2026, 10, 1, 12);
    expect(isoDaysAgo(0, now)).toBe("2026-11-01");
    expect(isoDaysAgo(WINDOW_DAYS - 1, now)).toBe("2026-10-03");
  });
});

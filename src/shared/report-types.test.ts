/**
 * The report types and the wizard's rules. The type vectors are the web's
 * (`src/lib/report-types.test.ts`); the rest pins the Worker's contract
 * (`weather_core::community`): the 300 character cap, three severities, two
 * fallback questions per type, the submit body without a coordinate, and the
 * defensive reading of the list answer.
 */

import {
  MAX_DESCRIPTION,
  REPORT_TYPES,
  SEVERITIES,
  checkReportDraft,
  fallbackQuestions,
  getReportTypeInfo,
  parseReports,
  submitBody,
  validReportId,
} from "./report-types";

describe("REPORT_TYPES", () => {
  it("has 13 report types", () => {
    expect(REPORT_TYPES).toHaveLength(13);
  });

  it("matches the Worker's allowlist", () => {
    const ids = REPORT_TYPES.map((t) => t.id).sort();
    expect(ids).toEqual(
      [
        "light-rain",
        "heavy-rain",
        "thunderstorm",
        "hail",
        "flooding",
        "strong-wind",
        "clear-skies",
        "cloudy",
        "fog",
        "mist",
        "haze",
        "dust",
        "frost",
      ].sort(),
    );
  });

  it("every type has a non-empty label and no duplicate id", () => {
    for (const type of REPORT_TYPES)
      expect(type.label.length).toBeGreaterThan(0);
    const ids = REPORT_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getReportTypeInfo", () => {
  it("returns the matching entry for a known id", () => {
    expect(getReportTypeInfo("frost")?.label).toBe("Frost");
  });

  it("returns undefined for an unknown id", () => {
    expect(getReportTypeInfo("unknown-type")).toBeUndefined();
  });
});

describe("SEVERITIES", () => {
  it("are mild, moderate and severe, each with words for the person", () => {
    expect(SEVERITIES.map((s) => s.id)).toEqual(["mild", "moderate", "severe"]);
    for (const s of SEVERITIES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });
});

describe("fallbackQuestions (the Worker's fallback_questions)", () => {
  it("gives two questions for every type, none empty", () => {
    for (const t of REPORT_TYPES) {
      const q = fallbackQuestions(t.id);
      expect(q).toHaveLength(2);
      for (const text of q) expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  it("matches the Worker's wording for a few types", () => {
    expect(fallbackQuestions("flooding")).toEqual([
      "How deep is the water on the road?",
      "Are vehicles able to pass?",
    ]);
    expect(fallbackQuestions("hail")[0]).toBe(
      "How large are the hailstones — pea, marble, or larger?",
    );
  });

  it("falls back to two general questions for an unknown type", () => {
    expect(fallbackQuestions("nope")).toEqual([
      "How severe would you rate it?",
      "Is it affecting your plans?",
    ]);
  });

  it("never uses an emoji", () => {
    for (const t of REPORT_TYPES) {
      for (const q of fallbackQuestions(t.id)) {
        expect(q).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });
});

describe("checkReportDraft", () => {
  const ok = {
    reportType: "heavy-rain",
    severity: "moderate" as const,
    description: "",
  };

  it("accepts a type with the default severity and no description", () => {
    expect(checkReportDraft(ok)).toBeNull();
  });

  it("refuses a missing or unknown type", () => {
    expect(checkReportDraft({ ...ok, reportType: null })).not.toBeNull();
    expect(checkReportDraft({ ...ok, reportType: "snowstorm" })).not.toBeNull();
  });

  it("allows exactly 300 characters and refuses 301, counting characters not bytes", () => {
    expect(
      checkReportDraft({ ...ok, description: "a".repeat(MAX_DESCRIPTION) }),
    ).toBeNull();
    expect(
      checkReportDraft({ ...ok, description: "a".repeat(MAX_DESCRIPTION + 1) }),
    ).toBe("Description too long (max 300 characters)");
    // 300 two-byte characters are still 300 characters.
    expect(
      checkReportDraft({ ...ok, description: "é".repeat(MAX_DESCRIPTION) }),
    ).toBeNull();
  });

  it("checks the description before the type, as the Worker does", () => {
    expect(
      checkReportDraft({
        reportType: null,
        severity: "mild",
        description: "a".repeat(301),
      }),
    ).toBe("Description too long (max 300 characters)");
  });
});

describe("submitBody", () => {
  it("carries the slug, type, severity and trimmed description, and no coordinate", () => {
    const body = submitBody("harare", {
      reportType: "frost",
      severity: "severe",
      description: "  white on the lawn  ",
    });
    expect(body).toEqual({
      locationSlug: "harare",
      reportType: "frost",
      severity: "severe",
      description: "white on the lawn",
    });
    expect(Object.keys(body).sort()).toEqual([
      "description",
      "locationSlug",
      "reportType",
      "severity",
    ]);
    expect(JSON.stringify(body)).not.toMatch(/"(lat|lon|latitude|longitude)"/);
  });
});

describe("parseReports", () => {
  const good = {
    id: "0123456789abcdef01234567",
    reportType: "heavy-rain",
    severity: "severe",
    description: "Roads are flooding",
    reportedAt: "2026-11-01T01:00:00.000Z",
    upvotes: 3,
    verified: true,
    locationName: "Harare",
  };

  it("reads the list answer", () => {
    expect(parseReports({ reports: [good], location: "harare" })).toEqual([
      good,
    ]);
  });

  it("is empty for anything that is not a list", () => {
    expect(parseReports(null)).toEqual([]);
    expect(parseReports({})).toEqual([]);
    expect(parseReports({ reports: "x" })).toEqual([]);
  });

  it("drops a row with no id, an unknown type or an unreadable time, keeps the rest", () => {
    const rows = [
      { ...good, id: undefined },
      { ...good, reportType: "snowstorm" },
      { ...good, reportedAt: "yesterday-ish" },
      null,
      "x",
      { ...good, id: "ffffffffffffffffffffffff" },
    ];
    expect(parseReports({ reports: rows }).map((r) => r.id)).toEqual([
      "ffffffffffffffffffffffff",
    ]);
  });

  it("defaults an unknown severity to moderate, bad votes to zero, a missing flag to unverified", () => {
    const [r] = parseReports({
      reports: [{ ...good, severity: "wild", upvotes: -4, verified: "yes" }],
    });
    expect(r.severity).toBe("moderate");
    expect(r.upvotes).toBe(0);
    expect(r.verified).toBe(false);
  });
});

describe("validReportId", () => {
  it("is 24 hexadecimal characters", () => {
    expect(validReportId("0123456789abcdef01234567")).toBe(true);
    expect(validReportId("0123456789abcdef0123456")).toBe(false);
    expect(validReportId("zzzzzzzzzzzzzzzzzzzzzzzz")).toBe(false);
  });
});

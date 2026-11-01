/**
 * Community weather reports: the types, the wizard's rules and the wire shapes.
 *
 * Ported from mukoko-weather `src/lib/report-types.ts` (the 13 types and their
 * labels, without the icons, which are drawn in `src/components/icons`) and
 * from the Worker's rules (`workers/crates/weather-core/src/community.rs`):
 * the three severities, the 300 character description, the two fallback
 * questions per type and the shapes of `POST /v1/reports`,
 * `GET /v1/reports` and `POST /v1/reports/upvote`.
 *
 * Privacy: the submit body carries the place's slug and the person's choices,
 * nothing else. It never carries a coordinate (the Worker accepts optional
 * `lat` and `lon`; the web wizard does not send them and neither does the
 * app), so the stored report is at the place's own point. The reporter is
 * identified on the server only by a hash of the network address.
 *
 * Pure: no React, no network.
 */

export type ReportTypeInfo = {
  id: string;
  label: string;
};

/** The 13 types, in the web wizard's order. The Worker's allowlist is the same. */
export const REPORT_TYPES: readonly ReportTypeInfo[] = [
  { id: "light-rain", label: "Light Rain" },
  { id: "heavy-rain", label: "Heavy Rain" },
  { id: "thunderstorm", label: "Thunderstorm" },
  { id: "hail", label: "Hail" },
  { id: "flooding", label: "Flooding" },
  { id: "strong-wind", label: "Strong Wind" },
  { id: "clear-skies", label: "Clear Skies" },
  { id: "cloudy", label: "Cloudy" },
  { id: "fog", label: "Fog" },
  { id: "mist", label: "Mist" },
  { id: "haze", label: "Haze" },
  { id: "dust", label: "Dust" },
  { id: "frost", label: "Frost" },
];

const BY_ID: Record<string, ReportTypeInfo> = Object.fromEntries(
  REPORT_TYPES.map((t) => [t.id, t]),
);

/** The matching entry for a known id, else `undefined`. */
export function getReportTypeInfo(id: string): ReportTypeInfo | undefined {
  return BY_ID[id];
}

export type ReportSeverity = "mild" | "moderate" | "severe";

export const SEVERITIES: readonly {
  id: ReportSeverity;
  label: string;
  description: string;
}[] = [
  { id: "mild", label: "Mild", description: "Noticeable but not disruptive" },
  {
    id: "moderate",
    label: "Moderate",
    description: "Affecting plans or travel",
  },
  {
    id: "severe",
    label: "Severe",
    description: "Dangerous or highly disruptive",
  },
];

/** The report's description is capped at this many characters. */
export const MAX_DESCRIPTION = 300;

/** How far back the list reads, by default and at most (hours). */
export const LIST_HOURS = 24;
export const MAX_LIST_HOURS = 72;

/**
 * Two short questions per report type: what the web asks when the model is
 * unavailable (`fallback_questions` in the Worker's `community.rs`). The model's
 * own questions come from `POST /v1/reports/clarify`, which no Worker serves
 * yet, so the app always uses these.
 */
export function fallbackQuestions(reportType: string): [string, string] {
  switch (reportType) {
    case "light-rain":
      return [
        "Is it a drizzle or steady light rain?",
        "Can you see across the street clearly?",
      ];
    case "heavy-rain":
      return [
        "Can you hear the rain hitting the roof loudly?",
        "Is water pooling on the ground?",
      ];
    case "thunderstorm":
      return [
        "How close are the lightning flashes?",
        "Is there hail or just rain?",
      ];
    case "hail":
      return [
        "How large are the hailstones — pea, marble, or larger?",
        "Is the hail causing damage?",
      ];
    case "flooding":
      return [
        "How deep is the water on the road?",
        "Are vehicles able to pass?",
      ];
    case "strong-wind":
      return [
        "Are tree branches bending or breaking?",
        "Is it hard to walk against the wind?",
      ];
    case "clear-skies":
      return ["Is the sun fully visible?", "Are there any clouds at all?"];
    case "cloudy":
      return [
        "Is it fully overcast or partly cloudy?",
        "Any sign of rain coming?",
      ];
    case "fog":
      return [
        "How far can you see ahead?",
        "Is the fog getting thicker or thinner?",
      ];
    case "mist":
      return [
        "How far can you see ahead?",
        "Is it affecting your visibility while driving?",
      ];
    case "haze":
      return [
        "Does the air look dusty, smoky, or just hazy?",
        "How far can you see ahead?",
      ];
    case "dust":
      return ["Can you taste the dust in the air?", "How far can you see?"];
    case "frost":
      return [
        "Is the frost visible on surfaces?",
        "Are your car windows frosted over?",
      ];
    default:
      return ["How severe would you rate it?", "Is it affecting your plans?"];
  }
}

export type ReportDraft = {
  reportType: string | null;
  severity: ReportSeverity;
  description: string;
};

/**
 * What stops a draft from being sent, in the Worker's own order (description
 * first, then the type), or `null` when it can go. The Worker checks again.
 */
export function checkReportDraft(draft: ReportDraft): string | null {
  if ([...draft.description].length > MAX_DESCRIPTION) {
    return `Description too long (max ${MAX_DESCRIPTION} characters)`;
  }
  if (!draft.reportType || !BY_ID[draft.reportType]) {
    return "Choose what you are seeing first.";
  }
  return null;
}

/** The body of `POST /v1/reports`. No coordinate, by design (see the header). */
export type SubmitBody = {
  locationSlug: string;
  reportType: string;
  severity: ReportSeverity;
  description: string;
};

export function submitBody(
  locationSlug: string,
  draft: ReportDraft,
): SubmitBody {
  return {
    locationSlug,
    reportType: draft.reportType ?? "",
    severity: draft.severity,
    description: draft.description.trim(),
  };
}

/** One report as `GET /v1/reports` lists it. */
export type CommunityReport = {
  id: string;
  reportType: string;
  severity: ReportSeverity;
  description: string;
  /** ISO 8601. */
  reportedAt: string;
  upvotes: number;
  /** True when the forecast at the place backed it up when it was filed. */
  verified: boolean;
  locationName: string;
};

function severityOf(v: unknown): ReportSeverity {
  return v === "mild" || v === "severe" ? v : "moderate";
}

/**
 * The list answer as reports: `{ reports: [...] }`, read defensively. An entry
 * without an id, a known type or a readable time is dropped, so one bad row
 * cannot break the card.
 */
export function parseReports(body: unknown): CommunityReport[] {
  const list = (body as { reports?: unknown } | null | undefined)?.reports;
  if (!Array.isArray(list)) return [];
  const out: CommunityReport[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.reportType !== "string") continue;
    if (!BY_ID[r.reportType]) continue;
    if (typeof r.reportedAt !== "string") continue;
    if (Number.isNaN(new Date(r.reportedAt).getTime())) continue;
    out.push({
      id: r.id,
      reportType: r.reportType,
      severity: severityOf(r.severity),
      description: typeof r.description === "string" ? r.description : "",
      reportedAt: r.reportedAt,
      upvotes:
        typeof r.upvotes === "number" && Number.isFinite(r.upvotes)
          ? Math.max(0, Math.floor(r.upvotes))
          : 0,
      verified: r.verified === true,
      locationName: typeof r.locationName === "string" ? r.locationName : "",
    });
  }
  return out;
}

/** A report id is a MongoDB ObjectId: 24 hexadecimal characters. */
export function validReportId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

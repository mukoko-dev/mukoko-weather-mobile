/**
 * Place knowledge: the pure part of the stored place profile (the Worker's
 * `GET /v1/locations/profile`, mukoko-dev/mukoko-weather#277) and the
 * formatting behind the "About {place}" rows.
 *
 * Ported from mukoko-weather `src/lib/place-knowledge.ts` with the same rules
 * and the web's own test vectors (src/shared/place-knowledge.test.ts). The
 * fetch, the 30-minute cache and the shared in-flight request live in
 * `src/api/profile.ts`. Anything derived or unverified is labelled
 * "estimated": it is never shown as a local fact.
 */

export interface ProfileMonthlyNormal {
  month: number;
  meanHighC: number | null;
  meanLowC: number | null;
  precipMm: number | null;
}

export interface ProfileCropPhase {
  crop: string;
  cropLabel: string;
  season: string | null;
  phaseLabel: string;
  nextPhaseLabel: string;
  /** ISO date. */
  nextPhaseOn: string;
}

export interface PlaceProfile {
  climate: { koppen: { code: string; label: string } | null };
  agriculture: {
    derived: { months: number[]; basis: string } | null;
  } | null;
  current: {
    month: number;
    season: {
      name: string;
      localName: string | null;
      /** One line about the season; absent on older answers. */
      description?: string | null;
      verified: boolean;
    } | null;
    nextSeason: {
      name: string;
      localName: string | null;
      startsOn: string;
    } | null;
    normalsThisMonth: ProfileMonthlyNormal | null;
    cropPhases: ProfileCropPhase[];
    inDerivedGrowingWindow: boolean | null;
  } | null;
}

export interface ProfileRow {
  label: string;
  value: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-11-01" → "1 Nov". */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]?.slice(0, 3) ?? ""}`.trim();
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * "May–Oct", or "Mar–May, Oct–Dec" when the window has a gap: a dry gap
 * between two rainy seasons is never reported as growing season. Runs wrap
 * the year end ("Nov–Mar").
 */
export function monthRange(months: number[]): string {
  const present = new Set(months.filter((m) => m >= 1 && m <= 12));
  if (present.size === 0) return "";
  const short = (m: number) => MONTHS[m - 1].slice(0, 3);
  if (present.size === 12) return `${short(1)}–${short(12)}`;
  const starts = [...present]
    .sort((a, b) => a - b)
    .filter((m) => !present.has(((m + 10) % 12) + 1));
  return starts
    .map((start) => {
      let last = start;
      while (present.has((last % 12) + 1)) last = (last % 12) + 1;
      return last === start ? short(start) : `${short(start)}–${short(last)}`;
    })
    .join(", ");
}

/**
 * The rows shown under "About {place}": climate zone, what is typical this
 * month, the next season, and the crop calendar (or an estimated growing
 * window where no local calendar exists). Derived values say "estimated".
 * Returns [] when there is nothing to show.
 */
export function profileRows(profile: PlaceProfile | null): ProfileRow[] {
  const cur = profile?.current;
  if (!profile || !cur) return [];
  const rows: ProfileRow[] = [];

  const koppen = profile.climate?.koppen;
  if (koppen) {
    rows.push({
      label: "Climate zone",
      value: `${capitalise(koppen.label)} (${koppen.code}), estimated`,
    });
  }

  const n = cur.normalsThisMonth;
  if (n && n.meanHighC !== null && n.meanLowC !== null) {
    const rain =
      n.precipMm !== null ? `, ${Math.round(n.precipMm)} mm of rain` : "";
    rows.push({
      label: `Typical in ${MONTHS[cur.month - 1] ?? "this month"}`,
      value: `${Math.round(n.meanHighC)}° high, ${Math.round(n.meanLowC)}° low${rain}`,
    });
  }

  if (cur.nextSeason) {
    const name = cur.nextSeason.localName ?? cur.nextSeason.name;
    const hedge = cur.season && !cur.season.verified ? ", estimated" : "";
    rows.push({
      label: "Next season",
      value: `${name} from ${shortDate(cur.nextSeason.startsOn)}${hedge}`,
    });
  }

  if (cur.cropPhases.length > 0) {
    const value = cur.cropPhases
      .slice(0, 2)
      .map((p) => {
        const season = p.season ? ` (${p.season.toLowerCase()})` : "";
        return `${p.cropLabel}${season}: ${p.phaseLabel.toLowerCase()}, ${p.nextPhaseLabel.toLowerCase()} from ${shortDate(p.nextPhaseOn)}`;
      })
      .join("; ");
    rows.push({ label: "Crop calendar", value });
  } else if (
    profile.agriculture?.derived &&
    profile.agriculture.derived.months.length > 0
  ) {
    const window = monthRange(profile.agriculture.derived.months);
    const state =
      cur.inDerivedGrowingWindow === null
        ? ""
        : cur.inDerivedGrowingWindow
          ? ", now inside it"
          : ", now outside it";
    rows.push({
      label: "Growing window",
      value: `${window}${state}, estimated`,
    });
  }

  return rows;
}

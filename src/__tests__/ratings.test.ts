/**
 * The colours of ratings, report severities and category minerals, held to the
 * Mzizi floor: text at 4.5:1 on the card it sits on (and on the faint tint
 * behind a rating word), and the text on a filled mineral at 4.5:1. The values
 * are the web's (`--color-severity-*`, `--mineral-*`, `--mineral-*-fg`).
 */

import suitability from "@/api/__fixtures__/suitability.json";
import { ACTIVITY_CATEGORIES, laneMineral } from "@/shared/activities";
import { DARK, LIGHT, contrastRatio, pageColorsFor } from "@/theme/mzizi";
import {
  LANE_ALPHA,
  LANE_HEIGHT,
  LEGEND_HEIGHT,
  ON_FILL,
  SEVERITY,
  SEVERITY_TINT,
  TEXT_CONTRAST,
  blend,
  inkOn,
  isSeverityName,
  mineralColor,
  ratingInk,
  severityColor,
  severityOfRating,
  severityOfReport,
  type SeverityName,
} from "@/theme/ratings";

const FLOOR = TEXT_CONTRAST;

const SCHEMES = [
  ["light", LIGHT],
  ["dark", DARK],
] as const;

describe("severity colours", () => {
  const NAMES = Object.keys(SEVERITY.light) as SeverityName[];

  it.each(SCHEMES)(
    "a rating word reads at 4.5:1 on its own 10%% tint over the %s card",
    (scheme, colors) => {
      for (const name of NAMES) {
        const ink = ratingInk(name, scheme, colors);
        const tint = blend(
          severityColor(name, scheme),
          colors.card,
          SEVERITY_TINT,
        );
        expect(contrastRatio(ink, tint)).toBeGreaterThanOrEqual(FLOOR);
      }
    },
  );

  it("writes the word in the severity colour itself wherever that passes", () => {
    for (const [scheme, colors] of SCHEMES) {
      for (const name of NAMES) {
        const color = severityColor(name, scheme);
        const tint = blend(color, colors.card, SEVERITY_TINT);
        if (contrastRatio(color, tint) >= FLOOR) {
          expect(ratingInk(name, scheme, colors)).toBe(color);
        }
      }
    }
  });

  it("falls back to the text colour for the web's orange in the light theme (4.02:1 on its tint)", () => {
    const tint = blend(SEVERITY.light.high, LIGHT.card, SEVERITY_TINT);
    expect(contrastRatio(SEVERITY.light.high, tint)).toBeLessThan(FLOOR);
    expect(ratingInk("high", "light", LIGHT)).toBe(LIGHT.textPrimary);
  });

  it("are the web's values", () => {
    expect(SEVERITY.light.low).toBe("#004d40");
    expect(SEVERITY.light.severe).toBe("#b3261e");
    expect(SEVERITY.dark.low).toBe("#64ffda");
    expect(SEVERITY.dark.severe).toBe("#ff5252");
  });

  it("reads the severity from the Worker's class name, whatever the level", () => {
    expect(severityOfRating("good", "text-severity-moderate")).toBe("moderate");
    expect(severityOfRating("poor", "text-severity-cold")).toBe("cold");
    expect(severityOfRating("fair", "text-severity-high")).toBe("high");
  });

  it("falls back to the level when the class is missing or unknown", () => {
    expect(severityOfRating("excellent")).toBe("low");
    expect(severityOfRating("good", "")).toBe("low");
    expect(severityOfRating("fair", "text-foo")).toBe("moderate");
    expect(severityOfRating("poor", undefined)).toBe("severe");
  });

  it("every class the Worker sends today maps to a severity we draw", () => {
    const classes = new Set<string>();
    for (const rule of suitability.rules) {
      classes.add(rule.fallback.colorClass);
      for (const c of rule.conditions) classes.add(c.colorClass);
    }
    for (const cls of classes) {
      const name = severityOfRating("fair", cls);
      expect(isSeverityName(name)).toBe(true);
      expect(/severity-/.test(cls)).toBe(true);
      expect(cls.endsWith(name)).toBe(true);
    }
  });

  it("maps a report's mild to low and keeps moderate and severe", () => {
    expect(severityOfReport("mild")).toBe("low");
    expect(severityOfReport("moderate")).toBe("moderate");
    expect(severityOfReport("severe")).toBe("severe");
  });

  it("picks the scheme's colour", () => {
    expect(severityColor("low", "dark")).toBe(SEVERITY.dark.low);
    expect(severityColor("low", "light")).toBe(SEVERITY.light.low);
    expect(severityColor("low", "light")).toBe(SEVERITY.light.low);
  });
});

describe("category minerals", () => {
  it.each(SCHEMES)(
    "a category's mineral reads at 4.5:1 as text on the %s card (the lane's Best line, the picker's selected label)",
    (scheme, colors) => {
      for (const c of ACTIVITY_CATEGORIES) {
        const mineral = mineralColor(
          // The text colour is the card mineral, as the web's `style.text`.
          c.id === "casual" ? "primary" : (laneMineral(c.id) as "gold"),
          colors,
          scheme,
        );
        expect(contrastRatio(mineral, colors.card)).toBeGreaterThanOrEqual(
          FLOOR,
        );
      }
    },
  );

  it.each(SCHEMES)(
    "text on a filled category colour (a chip label) reads at 4.5:1 in %s",
    (scheme, colors) => {
      for (const m of [
        "cobalt",
        "gold",
        "malachite",
        "tanzanite",
        "terracotta",
      ] as const) {
        const fill = mineralColor(m, colors, scheme);
        expect(contrastRatio(inkOn(fill), fill)).toBeGreaterThanOrEqual(FLOOR);
      }
      expect(
        contrastRatio(inkOn(colors.primary), colors.primary),
      ).toBeGreaterThanOrEqual(FLOOR);
    },
  );

  it.each(SCHEMES)(
    "the icon on a copper pin reads at 3:1 in %s (a graphic, not text; copper is 4.4 to 4.5:1 in light)",
    (scheme, colors) => {
      const fill = mineralColor("copper", colors, scheme);
      expect(contrastRatio(inkOn(fill), fill)).toBeGreaterThanOrEqual(3);
    },
  );

  it("inkOn picks the clearer of the web's white and near-black", () => {
    expect(inkOn("#000000")).toBe(ON_FILL.light);
    expect(inkOn("#ffffff")).toBe(ON_FILL.dark);
    expect(inkOn("#bf5a36")).toBe(ON_FILL.dark);
    expect(inkOn("#64ffda")).toBe(ON_FILL.dark);
  });

  it("primary is the app's primary, not a mineral", () => {
    expect(mineralColor("primary", LIGHT, "light")).toBe(LIGHT.primary);
    expect(mineralColor("primary", DARK, "dark")).toBe(DARK.primary);
    expect(pageColorsFor("dark")).toBe(DARK);
  });
});

describe("the lane's encoding", () => {
  it("makes every better level both stronger and taller", () => {
    const order = ["poor", "fair", "good", "excellent"] as const;
    for (let i = 1; i < order.length; i += 1) {
      expect(LANE_ALPHA[order[i]]).toBeGreaterThan(LANE_ALPHA[order[i - 1]]);
      expect(LANE_HEIGHT[order[i]]).toBeGreaterThan(LANE_HEIGHT[order[i - 1]]);
      expect(LEGEND_HEIGHT[order[i]]).toBeGreaterThan(
        LEGEND_HEIGHT[order[i - 1]],
      );
    }
  });

  it("matches the web's opacities and heights", () => {
    expect(LANE_ALPHA).toEqual({
      excellent: 1,
      good: 0.7,
      fair: 0.45,
      poor: 0.25,
    });
    expect(LANE_HEIGHT).toEqual({
      excellent: 1,
      good: 0.75,
      fair: 0.5,
      poor: 0.25,
    });
  });
});

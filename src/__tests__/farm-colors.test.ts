/**
 * The colours of the farm and place cards hold the contrast the Mzizi doctrine
 * asks for in light and in dark: text 4.5:1 on its surface, a plotted line or
 * bar 3:1 against the card. The tones are the web's severity tokens, so a
 * failure here means the web's value is the thing to question, not this file.
 */

import { FARM_DARK, FARM_LIGHT, farmColorsFor } from "@/theme/farm";
import { DARK, LIGHT, contrastRatio, withAlpha } from "@/theme/mzizi";

/** The colour a translucent fill shows over a solid card (#rrggbb). */
function over(fill: string, alpha: number, card: string): string {
  const f = parseInt(fill.slice(1), 16);
  const c = parseInt(card.slice(1), 16);
  const mix = (shift: number) =>
    Math.round(
      ((f >> shift) & 255) * alpha + ((c >> shift) & 255) * (1 - alpha),
    );
  return `#${[16, 8, 0].map((s) => mix(s).toString(16).padStart(2, "0")).join("")}`;
}

const SCHEMES = [
  ["light", LIGHT, FARM_LIGHT],
  ["dark", DARK, FARM_DARK],
] as const;

describe.each(SCHEMES)("%s", (_name, page, farm) => {
  it.each(["low", "moderate", "severe"] as const)(
    "the %s severity tone is readable as text on the card and on its own 15%% tint",
    (tone) => {
      expect(
        contrastRatio(farm.severity[tone], page.card),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(
          farm.severity[tone],
          over(farm.severity[tone], 0.15, page.card),
        ),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("text sits on a malachite or gold fill and on a primary button at 4.5:1", () => {
    expect(
      contrastRatio(farm.malachiteFg, farm.malachite),
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(farm.goldFg, farm.gold)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(farm.onPrimary, page.primary)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("text on the small inset tile (surface-dim) holds 4.5:1", () => {
    expect(
      contrastRatio(page.textPrimary, farm.surfaceDim),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(page.textTertiary, farm.surfaceDim),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("the ENSO phase badge text holds 4.5:1 on both phase fills", () => {
    expect(contrastRatio(farm.ensoFg, farm.ensoWarm)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(farm.ensoFg, farm.ensoCool)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("every plotted series stands out from the card at 3:1", () => {
    const series = [
      farm.series.rain,
      farm.series.terracotta,
      farm.series.cobalt,
      farm.series.sodalite,
      farm.series.earth,
      farm.series.gold,
      farm.malachite,
    ];
    for (const color of series) {
      expect(contrastRatio(color, page.card)).toBeGreaterThanOrEqual(3);
    }
  });

  it("the stage cells keep their letters readable: nursery and grow (tinted) take the primary text", () => {
    for (const alpha of [0.15, 0.35]) {
      expect(
        contrastRatio(page.textPrimary, over(farm.malachite, alpha, page.card)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("farmColorsFor", () => {
  it("picks the palette for the scheme", () => {
    expect(farmColorsFor("dark")).toBe(FARM_DARK);
    expect(farmColorsFor("light")).toBe(FARM_LIGHT);
  });

  it("makes a translucent tint with withAlpha as the cards do", () => {
    expect(withAlpha(FARM_LIGHT.malachite, 0.4)).toBe("rgba(0, 77, 64, 0.4)");
  });
});

/**
 * The route structure under a place: /location/[slug] with the two detail
 * pages beside it, no native header anywhere on them (each page carries its
 * own top row with Back), and screens that only read the `slug` and hand it to
 * the shared screen.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { SUB_ROUTE_PATH } from "@/components/weather/location-routes";

const app = join(__dirname, "..", "app");

/** `/location/[slug]/forecast` is `src/app/location/[slug]/forecast.tsx`. */
const fileOf = (pathname: string) => join(app, `${pathname.slice(1)}.tsx`);

describe("the detail routes", () => {
  it.each(Object.entries(SUB_ROUTE_PATH))(
    "%s is a screen file next to the place's page",
    (sub, pathname) => {
      expect(existsSync(fileOf(pathname))).toBe(true);
      expect(existsSync(join(app, "location", "[slug].tsx"))).toBe(true);
      const text = readFileSync(fileOf(pathname), "utf8");
      expect(text).toContain("useLocalSearchParams");
      expect(text).toContain("LocationDetailScreen");
      expect(text).toContain(`sub="${sub}"`);
    },
  );

  it("are thin: no safe area, scroll view, padding or stack options of their own", () => {
    for (const pathname of Object.values(SUB_ROUTE_PATH)) {
      const text = readFileSync(fileOf(pathname), "utf8");
      expect(text).not.toMatch(/\bSafeAreaView\b|\bScrollView\b/);
      expect(text).not.toMatch(/\bpadding\w*\s*:/);
      expect(text).not.toMatch(/headerShown/);
    }
  });

  it("do not add a layout under the slug (that would nest a second navigator)", () => {
    expect(existsSync(join(app, "location", "[slug]", "_layout.tsx"))).toBe(
      false,
    );
  });
});

describe("the root stack", () => {
  const layout = readFileSync(join(app, "_layout.tsx"), "utf8");

  it("shows no native header by default, so a new page under a place needs no entry", () => {
    expect(layout).toContain("<Stack screenOptions={{ headerShown: false }}>");
  });

  it("keeps the header on the two sign-in modals", () => {
    for (const name of ["sign-in", "sign-in-callback"]) {
      const block = layout.slice(layout.indexOf(`name="${name}"`));
      expect(block.slice(0, block.indexOf("/>"))).toContain(
        "headerShown: true",
      );
    }
  });
});

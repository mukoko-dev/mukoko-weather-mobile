import { isFeatureEnabled } from "@/shared/feature-flags";

import { MENU_ROWS, visibleMenuRows } from "./menu";

describe("menu rows", () => {
  it("hides Shamwari while it is paused", () => {
    const ids = visibleMenuRows(isFeatureEnabled).map((r) => r.id);
    expect(ids).not.toContain("shamwari");
    expect(ids).toEqual([
      "my-location",
      "map",
      "locations",
      "explore",
      "my-weather",
    ]);
  });

  it("shows Shamwari when the flag is on", () => {
    expect(visibleMenuRows(() => true).map((r) => r.id)).toContain("shamwari");
  });

  it("links only to screens the app has (no History or Aviation yet)", () => {
    const routes = MENU_ROWS.map((r) => r.route);
    expect(routes).not.toContain("/history");
    expect(routes).not.toContain("/aviation");
    expect(new Set(MENU_ROWS.map((r) => r.id)).size).toBe(MENU_ROWS.length);
  });
});

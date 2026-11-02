/** A page opened over the map or the menu is never left behind it (#76). */

import { uncoverModals } from "@/shell/covered-modals";

const route = (name: string, extra = {}) => ({
  key: `${name}-k`,
  name,
  ...extra,
});

describe("uncoverModals", () => {
  it("drops the map when a place was pushed above it", () => {
    const fix = uncoverModals({
      key: "root",
      index: 2,
      routes: [route("(tabs)"), route("map"), route("location/[slug]")],
    });
    expect(fix?.target).toBe("root");
    expect(fix?.state.routes.map((r) => r.name)).toEqual([
      "(tabs)",
      "location/[slug]",
    ]);
    expect(fix?.state.index).toBe(1);
  });

  it("leaves a modal that is on top alone", () => {
    expect(
      uncoverModals({
        key: "root",
        routes: [route("(tabs)"), route("location/[slug]"), route("menu")],
      }),
    ).toBeNull();
  });

  it("finds the stack inside the router's own root", () => {
    const fix = uncoverModals({
      key: "outer",
      routes: [
        route("__root", {
          state: {
            key: "inner",
            routes: [
              route("(tabs)"),
              route("menu"),
              route("map"),
              route("location/[slug]"),
            ],
          },
        }),
      ],
    });
    expect(fix?.target).toBe("inner");
    expect(fix?.state.routes.map((r) => r.name)).toEqual([
      "(tabs)",
      "location/[slug]",
    ]);
  });

  it("keeps a modal opened on a modal (sign-in from the menu)", () => {
    expect(
      uncoverModals({
        key: "root",
        routes: [route("(tabs)"), route("menu"), route("sign-in")],
      }),
    ).toBeNull();
  });

  it("drops the covered modals but keeps a modal above the page", () => {
    const fix = uncoverModals({
      key: "root",
      routes: [
        route("(tabs)"),
        route("map"),
        route("location/[slug]"),
        route("menu"),
      ],
    });
    expect(fix?.state.routes.map((r) => r.name)).toEqual([
      "(tabs)",
      "location/[slug]",
      "menu",
    ]);
  });

  it("does nothing without state", () => {
    expect(uncoverModals(undefined)).toBeNull();
    expect(uncoverModals({ routes: [] })).toBeNull();
  });
});

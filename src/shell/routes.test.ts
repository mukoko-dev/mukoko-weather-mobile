import { pagerIndex, pagerSequence } from "@/shared/location-pager";

import {
  barActiveId,
  mapRoute,
  pageForPathname,
  routeForPage,
  showsBottomBar,
} from "./routes";

describe("routeForPage / pageForPathname", () => {
  it("maps the web's page keys to app routes and back", () => {
    expect(routeForPage("/")).toBe("/");
    expect(routeForPage("/harare")).toBe("/location/harare");
    expect(pageForPathname("/")).toBe("/");
    expect(pageForPathname("")).toBe("/");
    expect(pageForPathname(null)).toBe("/");
    expect(pageForPathname("/location/harare")).toBe("/harare");
    expect(pageForPathname("/location/harare/forecast")).toBe("/harare");
  });

  it("round-trips every page of a sequence", () => {
    const seq = pagerSequence(["harare", "west-paddock--ksy4dd7"]);
    for (const page of seq) {
      expect(pageForPathname(routeForPage(page))).toBe(page);
    }
  });

  it("lets pagerIndex find the place on its app route", () => {
    const seq = pagerSequence(["harare", "nairobi-ke"]);
    expect(pagerIndex(pageForPathname("/"), seq)).toBe(0);
    expect(pagerIndex(pageForPathname("/location/nairobi-ke"), seq)).toBe(2);
    expect(pagerIndex(pageForPathname("/explore"), seq)).toBe(-1);
    expect(pagerIndex(pageForPathname("/locations"), seq)).toBe(-1);
    expect(pagerIndex(pageForPathname("/location/gweru"), seq)).toBe(-1);
  });
});

describe("showsBottomBar", () => {
  it("shows on home, a place page and the shell's lists", () => {
    for (const p of [
      "/",
      "/location/harare",
      "/locations",
      "/explore",
      "/my",
    ]) {
      expect(showsBottomBar(p)).toBe(true);
    }
  });

  it("hides on sub-pages, sheets, the map and sign-in", () => {
    for (const p of [
      "/location/harare/forecast",
      "/menu",
      "/map",
      "/sign-in",
      "/shamwari",
    ]) {
      expect(showsBottomBar(p)).toBe(false);
    }
  });
});

describe("barActiveId and mapRoute", () => {
  it("marks only the Locations list as the current pinned item", () => {
    expect(barActiveId("/locations")).toBe("locations");
    expect(barActiveId("/")).toBe("none");
    expect(barActiveId("/explore")).toBe("none");
  });

  it("opens the map for the place on screen", () => {
    expect(mapRoute("harare")).toBe("/map?slug=harare");
    expect(mapRoute(null)).toBe("/map");
  });
});

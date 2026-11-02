import { applyMove, pageMove } from "./navigate";

describe("pageMove", () => {
  it("pushes a place from home and from the shell's lists", () => {
    expect(pageMove("/", "/harare")).toEqual({
      kind: "push",
      route: "/location/harare",
    });
    expect(pageMove("/locations", "/harare").kind).toBe("push");
  });

  it("replaces sideways between places", () => {
    expect(pageMove("/location/harare", "/gweru")).toEqual({
      kind: "replace",
      route: "/location/gweru",
    });
  });

  it("pops back home from a place, and switches to home from a list", () => {
    expect(pageMove("/location/harare", "/")).toEqual({
      kind: "dismissTo",
      route: "/",
    });
    expect(pageMove("/explore", "/")).toEqual({ kind: "navigate", route: "/" });
  });

  it("does nothing for the page already on screen", () => {
    expect(pageMove("/", "/").kind).toBe("none");
    expect(pageMove("/location/harare", "/harare").kind).toBe("none");
  });

  it("opens a place from its own sub-page", () => {
    expect(pageMove("/location/harare/forecast", "/harare").kind).toBe(
      "replace",
    );
  });
});

describe("applyMove", () => {
  it("calls the matching router method", () => {
    const router = {
      navigate: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
      dismissTo: jest.fn(),
    };
    applyMove(router, { kind: "replace", route: "/location/a" });
    expect(router.replace).toHaveBeenCalledWith("/location/a");
    applyMove(router, { kind: "none" });
    expect(router.push).not.toHaveBeenCalled();
  });
});

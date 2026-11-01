import { placeTrail, trailText } from "./place-trail";

describe("placeTrail (the web's breadcrumb rules)", () => {
  it("is Home / Country / Province / Place for a town inside a province", () => {
    const items = placeTrail({
      name: "Marondera",
      countryName: "Zimbabwe",
      province: "Mashonaland East",
    });
    expect(trailText(items)).toBe(
      "Home / Zimbabwe / Mashonaland East / Marondera",
    );
    expect(items.map((i) => i.kind)).toEqual([
      "home",
      "plain",
      "plain",
      "current",
    ]);
  });

  it("skips the province only when it is the place's own name", () => {
    expect(
      trailText(
        placeTrail({
          name: "Harare",
          countryName: "Zimbabwe",
          province: "Harare",
        }),
      ),
    ).toBe("Home / Zimbabwe / Harare");
    expect(
      trailText(
        placeTrail({
          name: "Harare",
          countryName: "Zimbabwe",
          province: " harare ",
        }),
      ),
    ).toBe("Home / Zimbabwe / Harare");
  });

  it("keeps a city-state's district, which is not the place's name", () => {
    expect(
      trailText(
        placeTrail({
          name: "Singapore American School",
          countryName: "Singapore",
          province: "Woodlands",
        }),
      ),
    ).toBe("Home / Singapore / Woodlands / Singapore American School");
  });

  it("drops a country or province it does not know instead of guessing", () => {
    expect(trailText(placeTrail({ name: "A spot" }))).toBe("Home / A spot");
    expect(
      trailText(placeTrail({ name: "A spot", countryName: "  ", province: "" })),
    ).toBe("Home / A spot");
  });

  it("makes only Home a link and marks the place as the current page", () => {
    const items = placeTrail({
      name: "Nairobi",
      countryName: "Kenya",
      province: "Nairobi County",
    });
    expect(items.filter((i) => i.kind === "home")).toHaveLength(1);
    expect(items[items.length - 1].kind).toBe("current");
  });
});

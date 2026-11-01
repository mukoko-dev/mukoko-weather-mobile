import { aboutElevation, aboutRows, formatCoords } from "./place-info";

const harare = {
  slug: "harare",
  name: "Harare",
  lat: -17.83,
  lon: 31.05,
  country: "ZW",
  province: "Harare",
  elevation: 1490,
  source: "seed",
};
const masika = {
  season: {
    name: "Main rains",
    localName: "Masika",
    description: "Flooding, road damage, planting",
  },
  estimated: false,
};

describe("formatCoords (the web's rule)", () => {
  it("prints four decimals and the hemisphere", () => {
    expect(formatCoords(-17.83, 31.05)).toBe("17.8300°S, 31.0500°E");
    expect(formatCoords(51.5072, -0.1276)).toBe("51.5072°N, 0.1276°W");
    expect(formatCoords(0, 0)).toBe("0.0000°N, 0.0000°E");
  });
});

describe("aboutElevation", () => {
  it("keeps a stored height for a catalogue place", () => {
    expect(aboutElevation(harare, 1484)).toBe(1490);
  });

  it("takes the forecast's terrain height for a spot with the placeholder 0", () => {
    expect(aboutElevation({ elevation: 0, source: "geolocation" }, 1484.4)).toBe(
      1484,
    );
    expect(aboutElevation({ source: "geocoded" }, 12)).toBe(12);
    expect(aboutElevation({ elevation: 0, source: "seed" }, 1484)).toBe(1484);
  });

  it("ignores Open-Meteo's no-data value and anything not a height", () => {
    expect(aboutElevation({ elevation: 0 }, -9999)).toBeNull();
    expect(aboutElevation({ elevation: 0 }, Number.NaN)).toBeNull();
    expect(aboutElevation({}, undefined)).toBeNull();
    expect(aboutElevation({}, null)).toBeNull();
  });

  it("falls back to a stored height from a spot when the forecast has none", () => {
    expect(aboutElevation({ elevation: 640, source: "geocoded" }, null)).toBe(
      640,
    );
  });
});

describe("aboutRows", () => {
  it("lists the web's rows in its order", () => {
    const rows = aboutRows({
      place: harare,
      countryName: "Zimbabwe",
      season: masika,
      forecastElevation: 1484,
    });
    expect(rows).toEqual([
      { label: "Country", value: "Zimbabwe" },
      { label: "Province", value: "Harare" },
      { label: "Elevation", value: "1490 m" },
      { label: "Coordinates", value: "17.8300°S, 31.0500°E" },
      { label: "Season", value: "Masika (Main rains)" },
    ]);
  });

  it("leaves out what it does not know and keeps an address", () => {
    const rows = aboutRows({
      place: {
        name: "Bargate Road",
        lat: -17.7595,
        lon: 31.0601,
        address: "Bargate Road, Northwood, Harare, Zimbabwe",
      },
      season: { ...masika, estimated: true },
    });
    expect(rows.map((r) => r.label)).toEqual([
      "Coordinates",
      "Address",
      "Season",
    ]);
    expect(rows[rows.length - 1].value).toBe("Masika (Main rains), estimated");
  });
});

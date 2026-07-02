/**
 * Preferences store — verifies defaults, theme + activity mutations, saved-
 * location add/remove semantics (cap + de-dupe), and hydration from a
 * persisted SecureStore payload.
 *
 * expo-secure-store is mocked with an in-memory Map in jest.setup.ts, so
 * persistence round-trips without native code. We reset the module singleton
 * and clear the store between cases for isolation.
 */

import * as SecureStore from "expo-secure-store";

import {
  __resetPreferencesForTests,
  addSavedLocation,
  hydratePreferences,
  MAX_SAVED_LOCATIONS,
  removeSavedLocation,
  setThemePreference,
  toggleActivity,
  type SavedLocation,
} from "@/state/preferences";

const STORAGE_KEY = "mukoko.preferences";

// getSnapshot equivalent for assertions — hydrate is a no-op after first load,
// so we read the persisted payload directly where we need the raw state.
async function readStored(): Promise<Record<string, unknown> | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

function makeLocation(slug: string): SavedLocation {
  return { slug, name: slug, province: "Harare", country: "ZW" };
}

beforeEach(async () => {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
  __resetPreferencesForTests();
});

describe("preferences store", () => {
  it("hydrates to sensible defaults when nothing is stored", async () => {
    await hydratePreferences();
    expect(await readStored()).toBeNull();
  });

  it("persists a theme change", async () => {
    await hydratePreferences();
    setThemePreference("dark");
    expect((await readStored())?.theme).toBe("dark");
  });

  it("toggles activities on and off, preserving canonical order", async () => {
    await hydratePreferences();
    toggleActivity("travel");
    toggleActivity("farming");
    expect((await readStored())?.activities).toEqual(["farming", "travel"]);
    toggleActivity("farming");
    expect((await readStored())?.activities).toEqual(["travel"]);
  });

  it("adds a saved location and reports the result", async () => {
    await hydratePreferences();
    expect(addSavedLocation(makeLocation("harare"))).toBe("added");
    expect((await readStored())?.savedLocations).toHaveLength(1);
  });

  it("de-duplicates saved locations by slug", async () => {
    await hydratePreferences();
    addSavedLocation(makeLocation("harare"));
    expect(addSavedLocation(makeLocation("harare"))).toBe("duplicate");
    expect((await readStored())?.savedLocations).toHaveLength(1);
  });

  it("caps saved locations at the maximum", async () => {
    await hydratePreferences();
    for (let i = 0; i < MAX_SAVED_LOCATIONS; i += 1) {
      expect(addSavedLocation(makeLocation(`loc-${i}`))).toBe("added");
    }
    expect(addSavedLocation(makeLocation("one-too-many"))).toBe("full");
    expect((await readStored())?.savedLocations).toHaveLength(
      MAX_SAVED_LOCATIONS,
    );
  });

  it("removes a saved location", async () => {
    await hydratePreferences();
    addSavedLocation(makeLocation("harare"));
    addSavedLocation(makeLocation("bulawayo"));
    removeSavedLocation("harare");
    const stored = (await readStored())?.savedLocations as { slug: string }[];
    expect(stored.map((l) => l.slug)).toEqual(["bulawayo"]);
  });

  it("hydrates and sanitises a previously persisted payload", async () => {
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify({
        theme: "dark",
        activities: ["farming", "not-real", "mining"],
        savedLocations: [
          { slug: "harare", name: "Harare" },
          { slug: "harare", name: "Harare dup" },
          { nope: true },
        ],
      }),
    );
    await hydratePreferences();
    // A no-op mutation re-persists the normalised in-memory state.
    setThemePreference("dark"); // same value -> no write
    toggleActivity("travel");
    const stored = await readStored();
    expect(stored?.theme).toBe("dark");
    expect(stored?.activities).toEqual(["farming", "mining", "travel"]);
    expect((stored?.savedLocations as unknown[]).length).toBe(1);
  });
});

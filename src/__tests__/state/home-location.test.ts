import * as SecureStore from "expo-secure-store";

import {
  __resetHomeLocationForTests,
  hydrateHomeLocation,
  setHomeLocation,
} from "@/state/home-location";

const KEY = "mukoko.homeLocation";

beforeEach(async () => {
  await SecureStore.deleteItemAsync(KEY);
  __resetHomeLocationForTests();
});

describe("home location", () => {
  it("persists a set slug and clears it", async () => {
    setHomeLocation("harare");
    await Promise.resolve();
    expect(await SecureStore.getItemAsync(KEY)).toBe("harare");
    setHomeLocation(null);
    await Promise.resolve();
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });

  it("ignores a value that is not a place slug", async () => {
    setHomeLocation("explore");
    await Promise.resolve();
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });

  it("hydrates only a valid stored slug", async () => {
    await SecureStore.setItemAsync(KEY, "Not A Slug");
    await hydrateHomeLocation();
    __resetHomeLocationForTests();
    await SecureStore.setItemAsync(KEY, "nairobi-ke");
    await expect(hydrateHomeLocation()).resolves.toBeUndefined();
  });
});

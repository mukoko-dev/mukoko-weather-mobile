/** "Not now" on the location ask lasts a week, then the ask may come back. */

import * as SecureStore from "expo-secure-store";

import {
  LOCATION_ASK_PUT_OFF_MS,
  locationAskPutOff,
  putOffLocationAsk,
} from "@/state/location-ask";

jest.mock("expo-secure-store", () => {
  const data = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => data.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      data.set(k, v);
    }),
  };
});

it("is off until put off, stays off for a week, then may ask again", async () => {
  const now = 1_000_000_000_000;
  expect(await locationAskPutOff(now)).toBe(false);
  await putOffLocationAsk(now);
  expect(await locationAskPutOff(now + 1000)).toBe(true);
  expect(await locationAskPutOff(now + LOCATION_ASK_PUT_OFF_MS)).toBe(false);
});

it("never throws when storage fails", async () => {
  (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error("x"));
  expect(await locationAskPutOff()).toBe(false);
  (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error("x"));
  await expect(putOffLocationAsk()).resolves.toBeUndefined();
});

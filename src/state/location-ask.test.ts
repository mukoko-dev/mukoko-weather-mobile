/** "Not now" on the location ask lasts a week, then the ask may come back. */

import {
  LOCATION_ASK_PUT_OFF_MS,
  locationAskPutOff,
  putOffLocationAsk,
} from "@/state/location-ask";

const mockFiles = new Map<string, string>();
jest.mock("@/state/device-file", () => ({
  readDeviceText: jest.fn(async (k: string) => mockFiles.get(k) ?? null),
  writeDeviceText: jest.fn(async (k: string, v: string) => {
    mockFiles.set(k, v);
  }),
}));

it("is off until put off, stays off for a week, then may ask again", async () => {
  const now = 1_000_000_000_000;
  expect(await locationAskPutOff(now)).toBe(false);
  await putOffLocationAsk(now);
  expect(await locationAskPutOff(now + 1000)).toBe(true);
  expect(await locationAskPutOff(now + LOCATION_ASK_PUT_OFF_MS)).toBe(false);
});

it("reads a corrupt value as no put-off", async () => {
  mockFiles.set("location-ask-put-off-at", "garbage");
  expect(await locationAskPutOff()).toBe(false);
});

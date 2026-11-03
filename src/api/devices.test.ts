/**
 * Device profiles. `POST /v1/devices` writes a record, so it is never called
 * for real from a test: the replies below follow the Worker's documented
 * contract (workers/places/src/community.rs in mukoko-dev/mukoko-weather).
 */

import { createDeviceProfile } from "@/api/devices";
import { mockFetch } from "@/api/mock-fetch";

const BASE = "https://weather-api.mukoko.com";
const ID = "3f2a9c10-6d4e-4f4b-9a3a-0b1c2d3e4f50";

const CREATED = {
  deviceId: ID,
  preferences: {
    theme: "system",
    selectedLocation: "",
    savedLocations: [],
    selectedActivities: [],
    hasOnboarded: false,
    selectedForecastModel: "best_match",
  },
  createdAt: "2026-11-01T08:00:00Z",
  updatedAt: "2026-11-01T08:00:00Z",
};

describe("createDeviceProfile", () => {
  it("POSTs the install id to /v1/devices and nothing else", async () => {
    const calls = mockFetch({ status: 201, body: CREATED });
    const profile = await createDeviceProfile(ID);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE}/v1/devices`);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toEqual({ deviceId: ID });
    expect(profile.deviceId).toBe(ID);
    expect(profile.preferences?.theme).toBe("system");
  });

  it("surfaces the Worker's refusal of a bad id", async () => {
    mockFetch({
      status: 400,
      body: {
        error: "invalid_request",
        error_description: "Invalid device id",
      },
    });
    await expect(createDeviceProfile("not valid!")).rejects.toMatchObject({
      status: 400,
      message: "Invalid device id",
    });
  });

  it("surfaces an unavailable store", async () => {
    mockFetch({
      status: 503,
      body: {
        error: "unavailable",
        error_description: "Device sync is unavailable.",
      },
    });
    await expect(createDeviceProfile(ID)).rejects.toMatchObject({
      status: 503,
    });
  });
});

/**
 * registerDevice. A development build (jest runs as one) must write nothing;
 * a release build sends the install id to /v1/devices and nothing else. The
 * network is a recorded reply, never the real API.
 */

import { mockFetch } from "@/api/mock-fetch";
import { getOrCreateDeviceId, resetDeviceId } from "@/device/identity";
import { registerDevice } from "@/device/register";

describe("device registration", () => {
  beforeEach(async () => {
    await resetDeviceId();
  });

  it("writes nothing in a development build, which is the default under jest", async () => {
    const calls = mockFetch();
    const result = await registerDevice();
    expect(calls).toHaveLength(0);
    expect(result).toEqual({ ok: true, serverId: null, stubbed: true });
  });

  it("writes nothing when switched off", async () => {
    const calls = mockFetch();
    expect(await registerDevice(false)).toMatchObject({ stubbed: true });
    expect(calls).toHaveLength(0);
  });

  it("sends only the install id to /v1/devices in a release build", async () => {
    const calls = mockFetch({
      status: 201,
      body: { deviceId: "echoed-by-server" },
    });
    const result = await registerDevice(true);
    const id = await getOrCreateDeviceId();

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://weather-api.mukoko.com/v1/devices");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toEqual({ deviceId: id });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result).toEqual({
      ok: true,
      serverId: "echoed-by-server",
      stubbed: false,
    });
  });

  it("is safe on every cold start: the same id is sent each time", async () => {
    const calls = mockFetch(
      { status: 201, body: { deviceId: "x" } },
      { status: 201, body: { deviceId: "x" } },
    );
    await registerDevice(true);
    await registerDevice(true);
    expect((calls[0].body as { deviceId: string }).deviceId).toBe(
      (calls[1].body as { deviceId: string }).deviceId,
    );
  });

  it("reports a refusal without throwing, so the app never waits on it", async () => {
    mockFetch({
      status: 503,
      body: {
        error: "unavailable",
        error_description: "Device sync is unavailable.",
      },
    });
    expect(await registerDevice(true)).toEqual({
      ok: false,
      error: "Device sync is unavailable.",
    });
  });

  it("reports a network failure without throwing", async () => {
    mockFetch({ networkError: new Error("Network request failed") });
    expect(await registerDevice(true)).toEqual({
      ok: false,
      error: "Network request failed",
    });
  });
});

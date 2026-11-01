/**
 * Device registration with the weather API: `POST /v1/devices` (see
 * `src/api/devices.ts`).
 *
 * The app sends its own random install id (`./identity`) and nothing else, so
 * the API can hold a preference profile for it. The call is idempotent for a
 * given id, so it is safe on every cold start.
 *
 * It runs in release builds only. A development build (Expo Go, a dev client,
 * `npx expo start`) logs what it would send and writes nothing, so working on
 * the app never creates profiles on the production API.
 */

import { createDeviceProfile } from "@/api/devices";
import { getOrCreateDeviceId } from "@/device/identity";

export type RegisterDeviceResult =
  | { ok: true; serverId: string | null; stubbed: boolean }
  | { ok: false; error: string };

/**
 * Register this install. `enabled` defaults to "not a development build";
 * tests pass it explicitly.
 */
export async function registerDevice(
  enabled: boolean = !__DEV__,
): Promise<RegisterDeviceResult> {
  const deviceId = await getOrCreateDeviceId();

  if (!enabled) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[device.register] development build, not registering");
    }
    return { ok: true, serverId: null, stubbed: true };
  }

  try {
    const profile = await createDeviceProfile(deviceId);
    return { ok: true, serverId: profile?.deviceId ?? null, stubbed: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[device.register] failed", message);
    }
    return { ok: false, error: message };
  }
}

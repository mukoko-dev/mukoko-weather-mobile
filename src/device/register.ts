/**
 * Device registration with the weather API: `POST /v1/devices` (see
 * `src/api/devices.ts`).
 *
 * The app sends its own random install id (`./identity`) and nothing else, so
 * the API can hold a preference profile for it. The call is idempotent for a
 * given id, so it is safe on every cold start.
 *
 * It runs in release builds only, and only while `DEVICE_REGISTRATION_ENABLED`
 * is true. A development build (Expo Go, a dev client, `npx expo start`) logs
 * what it would send and writes nothing, so working on the app never creates
 * profiles on the production API.
 */

import { createDeviceProfile } from "@/api/devices";
import { getOrCreateDeviceId } from "@/device/identity";

/**
 * Off until a person's own synced database (owner decision, 2026-11-01) replaces
 * the server-side device profile: the app is not in a store, and an install
 * profile on the API is not needed to show weather. Flip to true to register.
 */
export const DEVICE_REGISTRATION_ENABLED = false;

export type RegisterDeviceResult =
  | { ok: true; serverId: string | null; stubbed: boolean }
  | { ok: false; error: string };

/**
 * Register this install. `enabled` defaults to "switched on and not a
 * development build"; tests pass it explicitly.
 */
export async function registerDevice(
  enabled: boolean = DEVICE_REGISTRATION_ENABLED && !__DEV__,
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

/**
 * "Not now" on the home's location ask (the web's `device-state.ts` rule): a
 * dismissal is remembered on this device for a week, then the ask may come
 * back. Kept as a plain file (src/state/device-file.ts), not in the
 * Keychain, so a reinstall asks again. A blocked permission is not stored
 * here: the system's own answer says so on every launch.
 */

import { readDeviceText, writeDeviceText } from "@/state/device-file";

const NAME = "location-ask-put-off-at";

/** How long a "Not now" lasts. */
export const LOCATION_ASK_PUT_OFF_MS = 7 * 24 * 60 * 60 * 1000;

/** True while a "Not now" from the last week stands. Never throws. */
export async function locationAskPutOff(
  now: number = Date.now(),
): Promise<boolean> {
  const at = Number(await readDeviceText(NAME));
  return Number.isFinite(at) && at > 0 && now - at < LOCATION_ASK_PUT_OFF_MS;
}

/** Remember a "Not now". Best effort. */
export async function putOffLocationAsk(
  now: number = Date.now(),
): Promise<void> {
  await writeDeviceText(NAME, String(now));
}

/**
 * "Not now" on the home's location ask (the web's `device-state.ts` rule): a
 * dismissal is remembered on this device for a week, then the ask may come
 * back. A blocked permission is not stored here: the system's own answer says
 * so on every launch, and the ask then explains it instead.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "mukoko.locationAskPutOffAt";

/** How long a "Not now" lasts. */
export const LOCATION_ASK_PUT_OFF_MS = 7 * 24 * 60 * 60 * 1000;

async function readRaw(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window === "undefined"
      ? null
      : window.localStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}

async function writeRaw(value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, value);
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}

/** True while a "Not now" from the last week stands. Never throws. */
export async function locationAskPutOff(
  now: number = Date.now(),
): Promise<boolean> {
  try {
    const at = Number(await readRaw());
    return Number.isFinite(at) && at > 0 && now - at < LOCATION_ASK_PUT_OFF_MS;
  } catch {
    return false;
  }
}

/** Remember a "Not now". Best effort. */
export async function putOffLocationAsk(
  now: number = Date.now(),
): Promise<void> {
  try {
    await writeRaw(String(now));
  } catch {
    /* a failed write only means the ask may come back sooner */
  }
}

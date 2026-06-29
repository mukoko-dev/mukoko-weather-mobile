/**
 * Persistent per-install device identifier. Stored in SecureStore so it
 * survives app updates but is wiped on uninstall — same lifecycle the
 * Nyuchi Platform's `device.devices` collection expects for `deviceIdentifier`.
 *
 * UUID v4 is generated with expo-crypto.randomUUID(), which uses the
 * platform's CSPRNG (SecRandomCopyBytes on iOS, java.security.SecureRandom
 * on Android, crypto.getRandomValues on web).
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'mukoko.deviceId';

/**
 * Web fallback — SecureStore isn't supported in browsers, so we fall back to
 * localStorage. Mobile (iOS/Android) always uses SecureStore.
 */
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

/**
 * Returns the device id, generating + persisting a new UUID v4 on first call.
 * Subsequent calls return the same id for the lifetime of the install.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getItem(STORAGE_KEY);
  if (existing && existing.length > 0) return existing;

  const fresh = Crypto.randomUUID();
  await setItem(STORAGE_KEY, fresh);
  return fresh;
}

/** Test/debug only — clears the persisted id so the next call regenerates one. */
export async function resetDeviceId(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

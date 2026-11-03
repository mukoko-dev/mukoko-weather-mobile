/**
 * Start a test with nothing picked and nothing saved. The SecureStore mock in
 * jest.setup.ts keeps its values between tests, so a reset has to clear the
 * stored copy too, not only the in-memory store.
 */

import * as SecureStore from "expo-secure-store";

import {
  __resetPreferencesForTests,
  hydratePreferences,
} from "@/state/preferences";

export async function resetPreferences(): Promise<void> {
  await SecureStore.deleteItemAsync("mukoko.preferences");
  __resetPreferencesForTests();
  await hydratePreferences();
}

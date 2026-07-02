/**
 * Local user preferences for the "My" screen — saved locations, theme choice,
 * and activity interests. This is the mobile port of the web "My Weather"
 * modal's client-side preferences.
 *
 * Persistence uses expo-secure-store (with a localStorage fallback on web,
 * mirroring src/device/identity.ts). AsyncStorage is intentionally NOT a
 * dependency of this app, so SecureStore is the single local-storage surface.
 *
 * The store is a tiny observable singleton consumed via `usePreferences()`
 * (useSyncExternalStore) so any screen re-renders when preferences change,
 * without pulling in a state-management library.
 */

import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "mukoko.preferences";

/** Theme selection. `system` follows the OS color scheme. */
export type ThemePreference = "light" | "dark" | "system";

/** Activity interests — drive contextual weather advice + mineral accents. */
export type ActivityId =
  "farming" | "mining" | "travel" | "tourism" | "sports" | "casual";

/** Ordered, canonical list of selectable activities. */
export const ACTIVITY_IDS: readonly ActivityId[] = [
  "farming",
  "mining",
  "travel",
  "tourism",
  "sports",
  "casual",
] as const;

/** A location the user has pinned to their "My" screen. */
export type SavedLocation = {
  slug: string;
  name: string;
  province?: string;
  country?: string;
};

export type Preferences = {
  theme: ThemePreference;
  activities: ActivityId[];
  savedLocations: SavedLocation[];
};

/** Upper bound on pinned locations — matches the web modal. */
export const MAX_SAVED_LOCATIONS = 10;

const THEME_VALUES: readonly ThemePreference[] = ["light", "dark", "system"];

const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  activities: [],
  savedLocations: [],
};

/** Result of an add attempt, so the UI can explain why nothing happened. */
export type AddLocationResult = "added" | "duplicate" | "full";

// --- storage helpers (mirror src/device/identity.ts web fallback) ----------

async function readRaw(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

// --- normalisation ---------------------------------------------------------

function sanitizeSavedLocation(value: unknown): SavedLocation | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.slug !== "string" || typeof v.name !== "string") return null;
  return {
    slug: v.slug,
    name: v.name,
    province: typeof v.province === "string" ? v.province : undefined,
    country: typeof v.country === "string" ? v.country : undefined,
  };
}

/** Coerce arbitrary parsed JSON into a valid Preferences object. */
function normalize(input: unknown): Preferences {
  if (!input || typeof input !== "object") return DEFAULT_PREFERENCES;
  const raw = input as Record<string, unknown>;

  const theme = THEME_VALUES.includes(raw.theme as ThemePreference)
    ? (raw.theme as ThemePreference)
    : DEFAULT_PREFERENCES.theme;

  const activities = Array.isArray(raw.activities)
    ? ACTIVITY_IDS.filter((id) => (raw.activities as unknown[]).includes(id))
    : [];

  const savedLocationsRaw = Array.isArray(raw.savedLocations)
    ? raw.savedLocations
    : [];
  const seen = new Set<string>();
  const savedLocations: SavedLocation[] = [];
  for (const entry of savedLocationsRaw) {
    const loc = sanitizeSavedLocation(entry);
    if (!loc || seen.has(loc.slug)) continue;
    seen.add(loc.slug);
    savedLocations.push(loc);
    if (savedLocations.length >= MAX_SAVED_LOCATIONS) break;
  }

  return { theme, activities: [...activities], savedLocations };
}

// --- observable store ------------------------------------------------------

let state: Preferences = DEFAULT_PREFERENCES;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: Preferences): void {
  state = next;
  emit();
  void writeRaw(STORAGE_KEY, JSON.stringify(state)).catch(() => {
    // Persistence is best-effort; an unavailable keystore must not crash the UI.
  });
}

/**
 * Load persisted preferences into memory. Idempotent and safe to call from
 * multiple subscribers concurrently — the first call wins and the rest await
 * the same promise.
 */
export function hydratePreferences(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const raw = await readRaw(STORAGE_KEY);
      if (raw) state = normalize(JSON.parse(raw));
    } catch {
      // Corrupt / unreadable store -> fall back to defaults already in `state`.
    } finally {
      hydrated = true;
      emit();
    }
  })();
  return hydrating;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydratePreferences();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Preferences {
  return state;
}

/** React hook — returns the live preferences and re-renders on change. */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// --- mutations -------------------------------------------------------------

export function setThemePreference(theme: ThemePreference): void {
  if (state.theme === theme) return;
  commit({ ...state, theme });
}

export function toggleActivity(id: ActivityId): void {
  const has = state.activities.includes(id);
  const activities = has
    ? state.activities.filter((a) => a !== id)
    : ACTIVITY_IDS.filter((a) => a === id || state.activities.includes(a));
  commit({ ...state, activities });
}

/** Pin a location. Returns why the add did or didn't happen. */
export function addSavedLocation(location: SavedLocation): AddLocationResult {
  if (state.savedLocations.some((l) => l.slug === location.slug)) {
    return "duplicate";
  }
  if (state.savedLocations.length >= MAX_SAVED_LOCATIONS) {
    return "full";
  }
  commit({
    ...state,
    savedLocations: [...state.savedLocations, sanitizeSavedLocation(location)!],
  });
  return "added";
}

export function removeSavedLocation(slug: string): void {
  if (!state.savedLocations.some((l) => l.slug === slug)) return;
  commit({
    ...state,
    savedLocations: state.savedLocations.filter((l) => l.slug !== slug),
  });
}

/**
 * Reset in-memory state. Test-only — production code never needs to wipe the
 * singleton, but tests must isolate the module state between cases.
 */
export function __resetPreferencesForTests(): void {
  state = DEFAULT_PREFERENCES;
  hydrated = false;
  hydrating = null;
  listeners.clear();
}

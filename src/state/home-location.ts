/**
 * The Home location: one saved place the person marks as home on the
 * Locations screen (the web's `homeLocation`, set from `/locations`' ⋯ menu).
 * Device-local, as on the web, which does not sync it yet.
 *
 * Kept apart from src/state/preferences.ts so the shell adds no field to that
 * store's shape. Same pattern: an observable singleton persisted to
 * SecureStore (localStorage on web), read through `useHomeLocation()`.
 */

import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { isLocationSlug } from "@/shared/current-slug";

const STORAGE_KEY = "mukoko.homeLocation";

let home: string | null = null;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

async function readRaw(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeRaw(value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(STORAGE_KEY, value);
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function hydrateHomeLocation(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const raw = await readRaw();
      home = isLocationSlug(raw) ? raw : null;
    } catch {
      home = null;
    } finally {
      hydrated = true;
      emit();
    }
  })();
  return hydrating;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrateHomeLocation();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string | null {
  return home;
}

/** The Home location's slug, or null. Re-renders on change. */
export function useHomeLocation(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Set (a slug) or clear (null) the Home location. */
export function setHomeLocation(slug: string | null): void {
  const next = isLocationSlug(slug) ? slug : null;
  if (next === home) return;
  home = next;
  emit();
  void writeRaw(next).catch(() => {
    /* best-effort, as preferences */
  });
}

/** Test-only reset of the singleton. */
export function __resetHomeLocationForTests(): void {
  home = null;
  hydrated = false;
  hydrating = null;
  listeners.clear();
}

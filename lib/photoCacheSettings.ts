"use client";

import { useSyncExternalStore } from "react";

/**
 * Global, user-configurable settings for the persistent (IndexedDB) photo
 * cache — see `lib/photoCacheDb.ts`. Same external-store pattern as
 * `lib/useTheme.ts` (`useSyncExternalStore` + `localStorage` persistence).
 */
export type PhotoCacheSettings = {
  enabled: boolean;
  maxSizeMB: number;
};

const STORAGE_KEY = "photo-cache-settings";

export const PHOTO_CACHE_SIZE_MIN_MB = 50;
export const PHOTO_CACHE_SIZE_MAX_MB = 1000;

const DEFAULT_SETTINGS: PhotoCacheSettings = {
  enabled: true,
  maxSizeMB: 200,
};

let state: PhotoCacheSettings = DEFAULT_SETTINGS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated || globalThis.window === undefined) return;
  hydrated = true;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state = {
        enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_SETTINGS.enabled,
        maxSizeMB:
          typeof parsed.maxSizeMB === "number"
            ? Math.min(PHOTO_CACHE_SIZE_MAX_MB, Math.max(PHOTO_CACHE_SIZE_MIN_MB, parsed.maxSizeMB))
            : DEFAULT_SETTINGS.maxSizeMB,
      };
    }
  } catch {
    // localStorage unavailable or corrupt value — keep defaults
  }
}

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(callback: () => void): () => void {
  hydrate();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): PhotoCacheSettings {
  hydrate();
  return state;
}

function getServerSnapshot(): PhotoCacheSettings {
  return DEFAULT_SETTINGS;
}

export function usePhotoCacheSettings(): PhotoCacheSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Non-hook read for use outside React (the `usePhoto` fetcher). */
export function getPhotoCacheSettings(): PhotoCacheSettings {
  hydrate();
  return state;
}

export function setPhotoCacheSetting<K extends keyof PhotoCacheSettings>(
  key: K,
  value: PhotoCacheSettings[K],
): void {
  hydrate();
  state = { ...state, [key]: value };
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, etc.) — session-only toggle still works
  }
  emit();
}

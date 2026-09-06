"use client";

import { useSyncExternalStore } from "react";

export type DiscoverDisplaySettings = {
  showName: boolean;
  showExternalId: boolean;
  showManager: boolean;
};

const STORAGE_KEY = "discover-display-settings";

const DEFAULT_SETTINGS: DiscoverDisplaySettings = {
  showName: true,
  showExternalId: true,
  showManager: true,
};

let state: DiscoverDisplaySettings = DEFAULT_SETTINGS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<DiscoverDisplaySettings>) };
  } catch {
    // Corrupt/unavailable storage — keep defaults.
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DiscoverDisplaySettings {
  hydrate();
  return state;
}

function getServerSnapshot(): DiscoverDisplaySettings {
  return DEFAULT_SETTINGS;
}

export function setDiscoverDisplaySetting<K extends keyof DiscoverDisplaySettings>(
  key: K,
  value: DiscoverDisplaySettings[K],
): void {
  state = { ...state, [key]: value };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota/private-mode — setting still applies for this session.
  }
  emit();
}

export function useDiscoverDisplaySettings(): DiscoverDisplaySettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

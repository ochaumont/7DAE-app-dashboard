"use client";

import { useSyncExternalStore } from "react";

/**
 * Theme is the user's color preference, stored on `<html data-theme="…">`
 * before hydration by the inline anti-FOUC script in `app/layout.tsx`.
 *
 * Components subscribe through `useTheme()` which uses `useSyncExternalStore`
 * + a `MutationObserver` on `data-theme` so any external write (e.g. another
 * tab via storage event, or the toggle on a different component) is reflected
 * everywhere within a single tick.
 */
export type Theme = "light" | "dark";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  if (typeof document === "undefined") return "dark";
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setTheme(next: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // localStorage unavailable (private mode, etc.) — session-only bascule still works
  }
}

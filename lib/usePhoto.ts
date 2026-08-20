"use client";

import useSWR from "swr";
import { NEXT_PUBLIC_ATOM_API_BASE_URL } from "@/lib/atom-api";
import { PHOTO_PLACEHOLDER } from "@/lib/photo";

/** Cached photo: the decoded Blob (reused by the PDF export) plus a session-long
 * object URL for `<img>`. The URL is created ONCE in the fetcher and never
 * revoked per-component — that is what lets catalogue, detail and export share
 * the same image without re-POSTing. */
export type CachedPhoto = { url: string; blob: Blob };

/** SWR key for a photo resource. Keep in sync with the PDF export cache read in
 * `CatalogueClient`. The uri is captured by the fetcher, not part of the key. */
export function photoKey(resourceId: string): [string, string] | null {
  return resourceId ? ["photo", resourceId] : null;
}

export async function fetchPhoto(
  resourceId: string,
  resourceUri: string,
): Promise<CachedPhoto> {
  const res = await fetch(`${NEXT_PUBLIC_ATOM_API_BASE_URL}/api/infos/resource`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: resourceId, uri: resourceUri }),
  });
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), blob };
}

/**
 * Returns a session-cached object URL for a backend photo resource, or
 * PHOTO_PLACEHOLDER while loading / on error. Backed by SWR so the same
 * resource is fetched once and shared everywhere.
 */
export function usePhoto(resourceId: string, resourceUri: string): string {
  const { data } = useSWR(
    resourceId && resourceUri ? photoKey(resourceId) : null,
    () => fetchPhoto(resourceId, resourceUri),
  );
  return data?.url ?? PHOTO_PLACEHOLDER;
}

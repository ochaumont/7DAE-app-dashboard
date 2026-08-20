import type { SyntheticEvent } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_HREF ?? "";

export const PHOTO_PLACEHOLDER = `${BASE_PATH}/covers/no-ltm-photo.png`;

/**
 * `onError` handler that swaps a broken `<img>` `src` to the local placeholder.
 * Guards against infinite error loops if the placeholder itself fails to load.
 */
export function placeholderOnError(
  e: SyntheticEvent<HTMLImageElement>,
): void {
  const t = e.currentTarget;
  if (!t.src.endsWith(PHOTO_PLACEHOLDER)) t.src = PHOTO_PLACEHOLDER;
}

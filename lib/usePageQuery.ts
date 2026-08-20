"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keeps a 1-based page number in sync with the `?page=N` query string.
 *
 * - `?page=1` is normalized to absent (canonical URL is the bare path).
 * - Invalid values (`abc`, `0`, negative) fall back to `1`.
 * - When the current page goes out of range (e.g. filters reduced the result
 *   set), the URL is rewritten to `1`.
 *
 * Returns the **clamped** page (always in `[1, totalPages]`) and a setter
 * that uses `router.replace({ scroll: false })` so pagination doesn't pollute
 * the browser history.
 */
export function usePageQuery(totalPages: number): {
  page: number;
  setPage: (next: number) => void;
} {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const raw = searchParams.get("page");
  const parsed = parsePage(raw);
  const page = Math.min(parsed, Math.max(1, totalPages));

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 1) params.delete("page");
    else params.set("page", String(next));
    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    const currentQs = searchParams.toString();
    const current = currentQs ? `${pathname}?${currentQs}` : pathname;
    if (target !== current) {
      router.replace(target, { scroll: false });
    }
  };

  useEffect(() => {
    if (parsed > totalPages) {
      setPage(1);
    } else if (raw !== null && parsed === 1) {
      // Strip a redundant `?page=1` from the URL.
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, totalPages, raw]);

  return { page, setPage };
}

function parsePage(raw: string | null): number {
  if (!raw) return 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

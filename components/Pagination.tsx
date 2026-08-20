"use client";

import clsx from "clsx";

type Props = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (p: number) => void;
};

function computePageSlots(
  page: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([
    1,
    totalPages,
    page - 1,
    page,
    page + 1,
  ]);
  if (page <= 3) [2, 3, 4, 5].forEach((n) => set.add(n));
  if (page >= totalPages - 2)
    [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach(
      (n) => set.add(n),
    );
  const sorted = Array.from(set)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("...");
    result.push(sorted[i]);
  }
  return result;
}

export default function Pagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
}: Props) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const slots = computePageSlots(page, totalPages);

  const btnBase =
    "px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const btnInactive =
    "bg-surface text-fg border-border hover:border-accent/50";
  const btnActive = "bg-accent text-accent-fg border-accent";

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="text-sm text-muted">
        Showing {start}–{end} of {totalItems}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={clsx(btnBase, btnInactive)}
        >
          ← Previous
        </button>
        {slots.map((slot, i) =>
          slot === "..." ? (
            <span
              key={`ellipsis-${i}`}
              aria-hidden="true"
              className="px-1.5 text-muted select-none"
            >
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              onClick={() => onPageChange(slot)}
              aria-label={`Go to page ${slot}`}
              aria-current={slot === page ? "page" : undefined}
              className={clsx(
                btnBase,
                slot === page ? btnActive : btnInactive,
              )}
            >
              {slot}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className={clsx(btnBase, btnInactive)}
        >
          Next →
        </button>
      </div>
    </nav>
  );
}

"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { SWR_KEY_APPLICATIONS } from "@/lib/useApplications";

/**
 * Forces a re-fetch of the applications (the only data with no automatic
 * revalidation — see `Providers`). Photo caches are left untouched.
 */
export default function RefreshButton() {
  const { mutate } = useSWRConfig();
  const [spinning, setSpinning] = useState(false);

  const onClick = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await mutate(SWR_KEY_APPLICATIONS);
    } finally {
      setSpinning(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={spinning}
      aria-label="Refresh data"
      title="Refresh data"
      className="inline-flex items-center justify-center w-9 h-9 rounded text-muted hover:text-fg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors disabled:opacity-60"
    >
      <RefreshIcon spinning={spinning} />
    </button>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={spinning ? "animate-spin" : ""}
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

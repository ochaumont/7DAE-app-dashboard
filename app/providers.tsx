"use client";

import { SWRConfig } from "swr";

/**
 * App-wide SWR config: load each resource ONCE per session and keep it.
 * No automatic revalidation (focus/reconnect/stale) — data is refreshed only
 * by the explicit Refresh button in the Header (see `RefreshButton`). The
 * default global SWR cache is used so `mutate` from anywhere hits the same data.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}

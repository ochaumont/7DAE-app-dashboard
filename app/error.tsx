"use client";

import { useEffect } from "react";
import type { AtomErrorDetails } from "@/lib/atom-api";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; details?: AtomErrorDetails };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // `lib/atom-api.ts` prefixes backend errors with machine-readable markers and
  // attaches structured `details` (the REAL params used). We surface both so the
  // page is self-sufficient for diagnosis — logs are hard to reach in val/prod.
  const isBackendDown = error.message.startsWith("ATOM_BACKEND_DOWN:");
  const isUnauthorized = error.message.startsWith("ATOM_UNAUTHORIZED:");
  const d = error.details;

  const title = isBackendDown
    ? "ATOM API unavailable"
    : isUnauthorized
      ? "Access not authorized"
      : "Something went wrong";

  const summary = isBackendDown
    ? "The request to the ATOM API did not complete (network, CORS, mixed-content or timeout). See the parameters below to diagnose."
    : isUnauthorized
      ? "The ATOM API rejected the request (401/403). The token was missing, expired, or not injected by the gateway. See the parameters below."
      : "An unexpected error occurred. See the details below.";

  // Build the diagnostics table from the real values carried on the error.
  const rows: Array<[string, string]> = [];
  if (d) {
    rows.push(["Requested URL", d.url]);
    rows.push([
      "Configured base",
      `${d.baseUrl}${d.baseUrlFromEnv ? "" : "  ⚠ fallback (NEXT_PUBLIC_ATOM_API_BASE_URL not set at build)"}`,
    ]);
    if (d.pageOrigin) rows.push(["Page origin", d.pageOrigin]);
    if (d.sameOrigin !== null)
      rows.push([
        "Same-origin",
        d.sameOrigin ? "yes" : "no  ⚠ cross-origin → CORS / no gateway Bearer injection",
      ]);
    rows.push(["Auth header sent", d.auth === "bearer-dev" ? "Bearer (dev JWT)" : "none"]);
    rows.push(["HTTP status", d.status ? `${d.status} ${d.statusText}` : `— (${d.statusText})`]);
    if (d.cause) rows.push(["Cause", d.cause]);
  }

  const copyText = [
    `[${title}]`,
    error.message,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    error.digest ? `Error ID: ${error.digest}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="px-4 md:px-6 py-16 max-w-3xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/15 text-danger mb-6">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        <p className="text-muted mb-6 max-w-xl mx-auto">{summary}</p>
      </div>

      {rows.length > 0 && (
        <div className="text-left rounded-lg border border-border bg-surface/60 overflow-hidden mb-4">
          <div className="px-4 py-2 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted">
            Diagnostics — parameters used
          </div>
          <dl className="divide-y divide-border text-sm font-mono">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="break-all whitespace-pre-wrap">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <details className="text-left rounded-lg border border-border bg-surface/60 mb-6">
        <summary className="px-4 py-2 cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">
          Raw error message
        </summary>
        <pre className="px-4 py-3 text-xs font-mono whitespace-pre-wrap break-all">
          {error.message}
          {error.digest ? `\n\nError ID: ${error.digest}` : ""}
        </pre>
      </details>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 rounded bg-accent text-accent-fg font-semibold hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(copyText)}
          className="px-5 py-2.5 rounded border border-border font-semibold hover:bg-surface transition-colors"
        >
          Copy diagnostics
        </button>
      </div>
    </main>
  );
}

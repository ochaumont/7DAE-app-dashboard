export const NEXT_PUBLIC_ATOM_API_BASE_URL =
  process.env.NEXT_PUBLIC_ATOM_API_BASE_URL ??
  "http://localhost:8080/atom-synchronizer-dev";

export type FactsheetRef = {
  id: string;
  externalId: string;
  name: string;
  etags?: unknown;
  userSubscriptions?: unknown;
};

export type DocumentRef = {
  id: string;
  name: string | null;
  documentType: string;
  url: string;
};

export type ApplicationDto = {
  id: string;
  externalId: string;
  name: string;
  appCategory:
    | "ivbot"
    | "END_USER_TOOL"
    | "component"
    | "official"
    | "not1v"
    | "notDefined"
    | null;
  appStatus: "active" | "developmentPhase" | "inactive" | "planPhase" | null;
  description: string | null;
  version: string | null;
  completion: number;
  businessCriticality:
    | "missionCritical"
    | "businessCritical"
    | "businessOperational"
    | "administrativeService"
    | null;
  airbusSite?: string | null;
  functionalSuitability?: string | null;
  technicalSuitability?: string | null;
  programCategory?: string | null;
  partIS?: string | null;
  obsoRiskStatus?: string | null;
  BRDURL?: string | null;
  ARDURL?: string | null;
  confluenceURL?: string | null;
  gDrivePath?: string | null;
  providerType: "airbus" | "external" | null;
  operator: string | null;
  deptProviders: string[];
  portfolio: FactsheetRef | null;
  manager: FactsheetRef | null;
  managerDelegates: FactsheetRef[];
  architectSolution: FactsheetRef | null;
  lifeCycle_phaseIn: string | null;
  lifeCycle_active: string | null;
  lifeCycle_phaseOut: string | null;
  lifeCycle_endOfLife: string | null;
  lifeCycle_plan: string | null;
  documentRefs: DocumentRef[] | null;
};

export type AtomErrorKind = "backend-down" | "unauthorized" | "http-error";

/** Structured diagnostics carried on every AtomApiError so the error screen can
 * show the REAL parameters used (full URL, configured base, auth mode, cause)
 * without anyone having to read server/browser logs. */
export type AtomErrorDetails = {
  kind: AtomErrorKind;
  /** The full URL actually requested (the real value, after env resolution). */
  url: string;
  /** The configured base URL = process.env.NEXT_PUBLIC_ATOM_API_BASE_URL or the
   * hardcoded fallback when the env var was not injected at build time. */
  baseUrl: string;
  /** Whether the env var was set at build time (false → fallback in use). */
  baseUrlFromEnv: boolean;
  /** Whether the page origin matches the API origin (cross-origin → CORS risk). */
  sameOrigin: boolean | null;
  /** The page origin the call was made from (browser only). */
  pageOrigin: string | null;
  /** "bearer-dev" when NEXT_PUBLIC_DEV_JWT was attached, else "none". */
  auth: "bearer-dev" | "none";
  /** HTTP status (0 for network/timeout failures). */
  status: number;
  statusText: string;
  /** Underlying fetch rejection for network failures (name: message). */
  cause?: string;
};

export class AtomApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string,
    public details?: AtomErrorDetails,
  ) {
    super(message ?? `ATOM API error ${status} ${statusText}`);
    this.name = "AtomApiError";
  }
}

/** Did the build actually inject NEXT_PUBLIC_ATOM_API_BASE_URL? When false the
 * fallback above is in use — a very common deploy misconfiguration. */
export const BASE_URL_FROM_ENV = Boolean(
  process.env.NEXT_PUBLIC_ATOM_API_BASE_URL,
);

/** Compares the API origin to the page origin (browser only) to surface
 * cross-origin calls, which break the same-origin gateway-injection model. */
function originInfo(url: string): {
  sameOrigin: boolean | null;
  pageOrigin: string | null;
} {
  if (typeof window === "undefined") {
    return { sameOrigin: null, pageOrigin: null };
  }
  const pageOrigin = window.location.origin;
  try {
    return { sameOrigin: new URL(url).origin === pageOrigin, pageOrigin };
  } catch {
    return { sameOrigin: null, pageOrigin };
  }
}

/** Wall-clock timeout for any single ATOM API call (ms). */
const FETCH_TIMEOUT_MS = 15_000;

async function atomFetch(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  // Auth header is DEV-ONLY: in production the app is served same-origin behind
  // the AFTER Istio gateway, which injects the user's `Authorization: Bearer`
  // from the session cookies — the SPA adds nothing. In dev there is no gateway,
  // so a test JWT can be supplied via NEXT_PUBLIC_DEV_JWT (.env.local). When
  // unset, no header is added and behaviour is unchanged.
  const devJwt = process.env.NEXT_PUBLIC_DEV_JWT;
  const auth = devJwt ? `Bearer ${devJwt}` : "";
  const { sameOrigin, pageOrigin } = originInfo(url);
  // Shared diagnostics baked into every error so the page can show the REAL
  // parameters (full URL, base, origin, auth) without anyone reading logs.
  const baseDetails = {
    url,
    baseUrl: NEXT_PUBLIC_ATOM_API_BASE_URL,
    baseUrlFromEnv: BASE_URL_FROM_ENV,
    sameOrigin,
    pageOrigin,
    auth: (auth ? "bearer-dev" : "none") as "bearer-dev" | "none",
  };
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        ...(auth ? { Authorization: auth } : {}),
      },
      signal: controller.signal,
    });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    const cause = `${e?.name ?? "Error"}: ${e?.message ?? String(err)}`;
    if (e?.name === "AbortError") {
      throw new AtomApiError(
        0,
        "Timeout",
        // `ATOM_BACKEND_DOWN:` is a machine-readable prefix consumed by
        // `app/error.tsx` to render the dedicated "API unavailable" screen.
        // Keep the prefix stable; the human-readable suffix may change.
        `ATOM_BACKEND_DOWN: timeout after ${FETCH_TIMEOUT_MS}ms at ${url}`,
        { kind: "backend-down", status: 0, statusText: "Timeout", cause, ...baseDetails },
      );
    }
    // A browser fetch that rejects (vs returning a 4xx/5xx) means the request
    // never completed: DNS/connection refused, CORS preflight blocked, or
    // mixed-content (https page → http URL). The `cause` text disambiguates.
    throw new AtomApiError(
      0,
      "Network error",
      `ATOM_BACKEND_DOWN: ${cause} at ${url}`,
      { kind: "backend-down", status: 0, statusText: "Network error", cause, ...baseDetails },
    );
  } finally {
    clearTimeout(timer);
  }
  // 401/403 → dedicated "not authorized" screen. `ATOM_UNAUTHORIZED:` is a
  // machine-readable prefix consumed by `app/error.tsx` (like ATOM_BACKEND_DOWN).
  if (res.status === 401 || res.status === 403) {
    throw new AtomApiError(
      res.status,
      res.statusText,
      `ATOM_UNAUTHORIZED: ${res.status} ${res.statusText} on ${url}`,
      {
        kind: "unauthorized",
        status: res.status,
        statusText: res.statusText,
        ...baseDetails,
      },
    );
  }
  return res;
}

/** Throws a diagnostics-rich AtomApiError for a non-OK HTTP response. The fetch
 * helpers call this so the error screen gets the URL + status, not a bare code. */
function httpError(res: Response, url: string): never {
  const { sameOrigin, pageOrigin } = originInfo(url);
  throw new AtomApiError(
    res.status,
    res.statusText,
    `ATOM_HTTP_ERROR: ${res.status} ${res.statusText} on ${url}`,
    {
      kind: "http-error",
      url,
      baseUrl: NEXT_PUBLIC_ATOM_API_BASE_URL,
      baseUrlFromEnv: BASE_URL_FROM_ENV,
      sameOrigin,
      pageOrigin,
      auth: process.env.NEXT_PUBLIC_DEV_JWT ? "bearer-dev" : "none",
      status: res.status,
      statusText: res.statusText,
    },
  );
}

export async function fetchApplications(): Promise<ApplicationDto[]> {
  const res = await atomFetch(
    `${NEXT_PUBLIC_ATOM_API_BASE_URL}/api/infos/applications`,
    {},
  );
  if (!res.ok)
    httpError(res, `${NEXT_PUBLIC_ATOM_API_BASE_URL}/api/infos/applications`);
  return (await res.json()) as ApplicationDto[];
}

export async function fetchApplication(
  externalId: string,
): Promise<ApplicationDto | null> {
  const res = await atomFetch(
    `${NEXT_PUBLIC_ATOM_API_BASE_URL}/api/infos/applications/${encodeURIComponent(externalId)}`,
    { next: { revalidate: 60 } },
  );
  if (res.status === 404) return null;
  if (!res.ok)
    httpError(
      res,
      `${NEXT_PUBLIC_ATOM_API_BASE_URL}/api/infos/applications/${encodeURIComponent(externalId)}`,
    );
  return (await res.json()) as ApplicationDto;
}

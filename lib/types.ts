export type ApplicationCategory =
  | "ivbot"
  | "END_USER_TOOL"
  | "component"
  | "official"
  | "not1v"
  | "notDefined";

export type ApplicationStatus =
  | "active"
  | "developmentPhase"
  | "inactive"
  | "planPhase"
  | "NA";

export type BusinessCriticality =
  | "missionCritical"
  | "businessCritical"
  | "businessOperational"
  | "administrativeService"
  | "NA";

export type ProviderType = "airbus" | "external" | "NA";

/** Tri-state photo filter: any Application / only with ≥1 photo / only without photos. */
export type PhotoFilter = "all" | "with" | "without";

/**
 * A photo attached to an application.
 *
 * - `resourceId` / `resourceUri` are passed directly to the ATOM backend
 *   `POST /api/infos/resource` from the browser (CORS enabled).
 * - `kind` reflects the `SELECTED` naming convention from the backend.
 * - `is360` is true when the document name ends with `3D.<ext>` — equirectangular panoramas.
 */
export type Photo = {
  resourceId: string;
  resourceUri: string;
  alt?: string;
  kind?: "selected" | "other";
  is360?: boolean;
};

export type CoverPhoto = { id: string; uri: string };

export type LinkedResourceKind = "video" | "slides" | "docs" | "sheets";

/** A video (documentRefs entries with documentType === "video") or a Google
 * Docs/Slides/Sheets document (detected from the URL shape, independent of
 * documentType) attached to an application, embeddable via Google's own
 * preview/embed iframes. `embedUrl` is null when the file ID couldn't be
 * extracted from `url` — callers fall back to a plain "Open" link. */
export type LinkedResourceRef = {
  id: string;
  name: string;
  url: string;
  kind: LinkedResourceKind;
  embedUrl: string | null;
};

export type Person = {
  name: string;
  email: string;
};

export type ApplicationLifecycle = {
  phaseIn?: string;
  active?: string;
  phaseOut?: string;
  endOfLife?: string;
  plan?: string;
};

export type Application = {
  id: string;
  externalId: string;
  name: string;
  category: ApplicationCategory;
  status: ApplicationStatus;
  description: string;
  lifecycle: ApplicationLifecycle;
  version: string | null;
  portfolio: { id: string; name: string } | null;
  operator: string | null;
  providerType: ProviderType;
  deptProviders: string[];
  manager: Person | null;
  managerDelegates: Person[];
  solutionArchitect: Person | null;
  completion: number;
  businessCriticality: BusinessCriticality;
  airbusSite: string | null;
  functionalSuitability: string | null;
  technicalSuitability: string | null;
  programCategory: string | null;
  partIS: string | null;
  obsoRiskStatus: string | null;
  BRDURL: string | null;
  ARDURL: string | null;
  confluenceURL: string | null;
  gDrivePath: string | null;
  coverPhoto: CoverPhoto | null;
  photos: Photo[];
  linkedResources: LinkedResourceRef[];
};

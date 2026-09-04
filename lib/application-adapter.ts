import type { ApplicationDto, FactsheetRef } from "./atom-api";
import { detectGoogleDocFromUrl, getGoogleDriveEmbedUrl } from "./google-embed";
import type { Application, Person } from "./types";

function toPerson(ref: FactsheetRef): Person {
  return { name: ref.name, email: ref.externalId };
}

const DEFAULT_DOC_NAMES: Record<"slides" | "docs" | "sheets", string> = {
  slides: "Présentation",
  docs: "Document",
  sheets: "Feuille de calcul",
};

/** The URL shape decides the kind, not `documentType` — that backend field
 * is a manual category label we don't control and can't rely on (e.g. a
 * Slides deck has been seen tagged `documentType: "video"` in real data).
 * Slides/Docs/Sheets are detected first from the URL; anything left is
 * treated as a Drive file ("video") only if `documentType` says so, or if
 * the URL itself looks like a Drive file link. */
function toLinkedResources(dto: ApplicationDto): Application["linkedResources"] {
  return (dto.documentRefs ?? [])
    .filter((d): d is NonNullable<typeof d> => !!d && !!d.url)
    .map((d): Application["linkedResources"][number] | null => {
      const detected = detectGoogleDocFromUrl(d.url);
      if (detected) {
        return {
          id: d.id,
          name: d.name?.trim() || DEFAULT_DOC_NAMES[detected.kind],
          url: d.url,
          kind: detected.kind,
          embedUrl: detected.embedUrl,
        };
      }
      const embedUrl = getGoogleDriveEmbedUrl(d.url);
      if (d.documentType?.toLowerCase() === "video" || embedUrl) {
        return {
          id: d.id,
          name: d.name?.trim() || "Vidéo",
          url: d.url,
          kind: "video",
          embedUrl,
        };
      }
      return null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
}

/** Real photos come from `documentRefs` entries with `documentType: "photo"`
 * AND `origin: "LX_STORAGE_SERVICE"` (both required — confirmed backend
 * convention, distinct from the video/Slides/Sheets documents which share
 * `documentType: "video"` / `origin: "CUSTOM_LINK"`), streamed via the ATOM
 * resource API (`usePhoto`, `POST /api/infos/resource`) rather than embedded.
 * The "SELECTED" name convention picks the cover; when no photo is marked,
 * `coverPhoto` stays null (no fallback to the first photo) so the UI keeps
 * showing the generated per-application cover as the main image — real,
 * non-selected photos are still available as extra thumbnails, just never
 * chosen automatically as the cover. */
function toPhotos(
  dto: ApplicationDto,
): Pick<Application, "coverPhoto" | "photos"> {
  const photos: Application["photos"] = (dto.documentRefs ?? [])
    .filter(
      (d): d is NonNullable<typeof d> =>
        !!d &&
        d.documentType?.toLowerCase() === "photo" &&
        d.origin === "LX_STORAGE_SERVICE" &&
        !!d.url,
    )
    .map((d) => ({
      resourceId: d.id,
      resourceUri: d.url,
      alt: d.name ?? undefined,
      kind: d.name?.toUpperCase().includes("SELECTED") ? "selected" : "other",
      is360: /3D/i.test(d.name ?? ""),
    }));

  const selected = photos.find((p) => p.kind === "selected") ?? null;
  const coverPhoto = selected
    ? { id: selected.resourceId, uri: selected.resourceUri }
    : null;

  return { coverPhoto, photos };
}

function toLifecycle(dto: ApplicationDto): Application["lifecycle"] {
  const lifecycle: Application["lifecycle"] = {};
  if (dto.lifeCycle_phaseIn) lifecycle.phaseIn = dto.lifeCycle_phaseIn;
  if (dto.lifeCycle_active) lifecycle.active = dto.lifeCycle_active;
  if (dto.lifeCycle_phaseOut) lifecycle.phaseOut = dto.lifeCycle_phaseOut;
  if (dto.lifeCycle_endOfLife) lifecycle.endOfLife = dto.lifeCycle_endOfLife;
  if (dto.lifeCycle_plan) lifecycle.plan = dto.lifeCycle_plan;
  return lifecycle;
}

export function toApplication(dto: ApplicationDto): Application {
  return {
    id: dto.id,
    externalId: dto.externalId,
    name: dto.name,
    category: dto.appCategory ?? "notDefined",
    status: dto.appStatus ?? "NA",
    description: dto.description ?? "",
    lifecycle: toLifecycle(dto),
    version: dto.version?.trim() || null,
    portfolio:
      dto.portfolio &&
      typeof dto.portfolio.id === "string" &&
      dto.portfolio.id.length > 0 &&
      typeof dto.portfolio.name === "string" &&
      dto.portfolio.name.length > 0
        ? { id: dto.portfolio.id, name: dto.portfolio.name }
        : null,
    operator: dto.operator?.trim() || null,
    providerType: dto.providerType ?? "NA",
    deptProviders: dto.deptProviders ?? [],
    manager: dto.manager ? toPerson(dto.manager) : null,
    managerDelegates: (dto.managerDelegates ?? []).map(toPerson),
    solutionArchitect: dto.architectSolution
      ? toPerson(dto.architectSolution)
      : null,
    completion: dto.completion,
    businessCriticality: dto.businessCriticality ?? "NA",
    airbusSite: dto.airbusSite?.trim() || null,
    functionalSuitability: dto.functionalSuitability?.trim() || null,
    technicalSuitability: dto.technicalSuitability?.trim() || null,
    programCategory: dto.programCategory?.trim() || null,
    partIS: dto.partIS?.trim() || null,
    obsoRiskStatus: dto.obsoRiskStatus?.trim() || null,
    BRDURL: dto.BRDURL?.trim() || null,
    ARDURL: dto.ARDURL?.trim() || null,
    confluenceURL: dto.confluenceURL?.trim() || null,
    gDrivePath: dto.gDrivePath?.trim() || null,
    ...toPhotos(dto),
    linkedResources: toLinkedResources(dto),
  };
}

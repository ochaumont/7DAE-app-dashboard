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

/** Videos are identified by documentType (backend-controlled convention,
 * same pattern as LabTestMean photos). Slides/Docs/Sheets are detected from
 * the URL shape instead, independent of documentType — we don't control the
 * backend's category labels and can't rely on a specific value for these. */
function toLinkedResources(dto: ApplicationDto): Application["linkedResources"] {
  return (dto.documentRefs ?? [])
    .filter((d): d is NonNullable<typeof d> => !!d && !!d.url)
    .map((d): Application["linkedResources"][number] | null => {
      if (d.documentType?.toLowerCase() === "video") {
        return {
          id: d.id,
          name: d.name?.trim() || "Vidéo",
          url: d.url,
          kind: "video",
          embedUrl: getGoogleDriveEmbedUrl(d.url),
        };
      }
      const detected = detectGoogleDocFromUrl(d.url);
      if (!detected) return null;
      return {
        id: d.id,
        name: d.name?.trim() || DEFAULT_DOC_NAMES[detected.kind],
        url: d.url,
        kind: detected.kind,
        embedUrl: detected.embedUrl,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
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
    coverPhoto: null,
    photos: [],
    linkedResources: toLinkedResources(dto),
  };
}

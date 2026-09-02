import type { ApplicationDto, FactsheetRef } from "./atom-api";
import type { Application, Person } from "./types";

function toPerson(ref: FactsheetRef): Person {
  return { name: ref.name, email: ref.externalId };
}

function toVideos(dto: ApplicationDto): Application["videos"] {
  return (dto.documentRefs ?? [])
    .filter(
      (d): d is NonNullable<typeof d> =>
        !!d && d.documentType?.toLowerCase() === "video" && !!d.url,
    )
    .map((d) => ({
      id: d.id,
      name: d.name?.trim() || "Vidéo",
      url: d.url,
    }));
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
    videos: toVideos(dto),
  };
}

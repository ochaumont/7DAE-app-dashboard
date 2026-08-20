import type { ApplicationDto, FactsheetRef } from "./atom-api";
import type { Application, Person } from "./types";

function toPerson(ref: FactsheetRef): Person {
  return { name: ref.name, email: ref.externalId };
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
    coverPhoto: null,
    photos: [],
  };
}

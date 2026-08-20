import type {
  ApplicationCategory,
  ApplicationStatus,
  BusinessCriticality,
  ProviderType,
} from "@/lib/types";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  active: "Active",
  developmentPhase: "Development Phase",
  inactive: "Inactive",
  planPhase: "Plan Phase",
  NA: "Not set",
};

export const CATEGORY_LABELS: Record<ApplicationCategory, string> = {
  ivbot: "IVBOT",
  END_USER_TOOL: "End User Tool",
  component: "Component",
  official: "Official",
  not1v: "Not 1V",
  notDefined: "Not Defined",
};

export const BUSINESS_CRITICALITY_LABELS: Record<BusinessCriticality, string> = {
  missionCritical: "Mission Critical",
  businessCritical: "Business Critical",
  businessOperational: "Business Operational",
  administrativeService: "Administrative Service",
  NA: "Not set",
};

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  airbus: "Airbus",
  external: "External",
  NA: "Not set",
};

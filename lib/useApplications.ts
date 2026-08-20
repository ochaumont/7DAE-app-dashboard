"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
  getApplications,
  uniqueBusinessCriticalities,
  uniqueCategories,
  uniquePortfolios,
  uniqueStatuses,
} from "./applications";
import type {
  Application,
  ApplicationCategory,
  ApplicationStatus,
  BusinessCriticality,
} from "./types";

export const SWR_KEY_APPLICATIONS = "applications";

const EMPTY_APPLICATIONS: Application[] = [];

export type ApplicationsData = {
  applications: Application[];
  categories: ApplicationCategory[];
  statuses: ApplicationStatus[];
  businessCriticalities: BusinessCriticality[];
  portfolios: string[];
  loading: boolean;
  error: Error | null;
};

export function useApplications(): ApplicationsData {
  const { data, error } = useSWR(SWR_KEY_APPLICATIONS, getApplications);
  const applications = data ?? EMPTY_APPLICATIONS;
  const loading = !data && !error;

  const categories = useMemo(() => uniqueCategories(applications), [applications]);
  const statuses = useMemo(() => uniqueStatuses(applications), [applications]);
  const businessCriticalities = useMemo(
    () => uniqueBusinessCriticalities(applications),
    [applications],
  );
  const portfolios = useMemo(() => uniquePortfolios(applications), [applications]);

  return {
    applications,
    categories,
    statuses,
    businessCriticalities,
    portfolios,
    loading,
    error: (error as Error) ?? null,
  };
}

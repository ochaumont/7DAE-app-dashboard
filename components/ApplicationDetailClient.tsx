"use client";

import { useSearchParams, notFound } from "next/navigation";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import ApplicationHeader from "@/components/ApplicationHeader";
import Gallery from "@/components/Gallery";
import ManagerCard from "@/components/ManagerCard";
import Section from "@/components/detail/Section";
import { getApplicationByExternalId } from "@/lib/applications";
import { SWR_KEY_APPLICATIONS } from "@/lib/useApplications";
import { getCatalogueState } from "@/lib/catalogueFilters";
import { PROVIDER_TYPE_LABELS } from "@/lib/labels";
import type { Application } from "@/lib/types";

function DetailSkeleton() {
  return (
    <main className="px-4 md:px-8 py-8 max-w-[1400px] mx-auto">
      <div className="h-4 w-24 rounded bg-surface-2 skeleton-pulse mb-6" />
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
        <div className="aspect-[4/3] rounded-card bg-surface-2 skeleton-pulse" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-surface-2 skeleton-pulse" />
          <div className="h-4 w-1/2 rounded bg-surface-2 skeleton-pulse" />
          <div className="h-4 w-2/3 rounded bg-surface-2 skeleton-pulse" />
        </div>
      </div>
    </main>
  );
}

export default function ApplicationDetailClient() {
  const searchParams = useSearchParams();
  const externalId = searchParams.get("id") ?? "";
  const { cache } = useSWRConfig();

  // Cache-first: if the catalogue/map already loaded the list, serve the item
  // from memory (no network). `fallbackData` makes SWR skip the fetch entirely.
  const cachedList = cache.get(SWR_KEY_APPLICATIONS)?.data as
    | Application[]
    | undefined;
  const fallbackData = cachedList?.find((m) => m.externalId === externalId);

  const { data: app, error } = useSWR(
    externalId ? ["application", externalId] : null,
    () => getApplicationByExternalId(externalId),
    { fallbackData },
  );

  if (error) throw error;
  if (!externalId) return notFound();
  if (app === undefined) return <DetailSkeleton />;
  if (app === null) return notFound();

  // Restore the catalogue with its remembered page (filters live in the store
  // and are reapplied on mount). The "Catalogue" menu, by contrast, resets them.
  const backPage = getCatalogueState().page;
  const backHref = backPage > 1 ? `/?page=${backPage}` : "/";

  return (
    <main className="px-4 md:px-8 py-8 max-w-[1400px] mx-auto">
      <Link
        href={backHref}
        className="inline-block text-xs font-mono text-muted hover:text-fg mb-6"
      >
        ← Back to catalog
      </Link>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
        <div className="space-y-6">
          <Gallery photos={app.photos} name={app.name} externalId={app.externalId} />
          {app.description && (
            <Section title="Description">
              <p className="text-base leading-relaxed text-fg/90">
                {app.description}
              </p>
            </Section>
          )}
        </div>
        <div className="space-y-6">
          <ApplicationHeader application={app} />
          <Section title="Portfolio">
            <p className="text-sm text-fg/90">
              {app.portfolio ? app.portfolio.name : "No portfolio"}
            </p>
          </Section>
          <Section title="Operator & Provider">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm max-w-detail-info">
              <dt className="text-muted">Operator</dt>
              <dd>{app.operator ?? "—"}</dd>
              <dt className="text-muted">Provider type</dt>
              <dd>{PROVIDER_TYPE_LABELS[app.providerType]}</dd>
              <dt className="text-muted">Dept Provider</dt>
              <dd>
                {app.deptProviders.length > 0
                  ? app.deptProviders.join(", ")
                  : "—"}
              </dd>
              <dt className="text-muted">Version</dt>
              <dd>{app.version ?? "—"}</dd>
              <dt className="text-muted">Completion</dt>
              <dd>{app.completion}%</dd>
            </dl>
          </Section>
        </div>
      </div>

      {(app.manager || app.solutionArchitect) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          <ManagerCard
            name={app.manager?.name ?? "Not set"}
            email={app.manager?.email ?? ""}
            roleLabel="Application Manager"
          />
          {app.solutionArchitect && (
            <ManagerCard
              name={app.solutionArchitect.name}
              email={app.solutionArchitect.email}
              roleLabel="Solution Architect"
            />
          )}
        </div>
      )}
    </main>
  );
}

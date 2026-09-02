"use client";

import { useState } from "react";
import { useSearchParams, notFound } from "next/navigation";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import ApplicationHeader from "@/components/ApplicationHeader";
import Gallery, { type GalleryVideoOverride } from "@/components/Gallery";
import ManagerCard from "@/components/ManagerCard";
import Section from "@/components/detail/Section";
import VideoIcon from "@/components/icons/VideoIcon";
import { getApplicationByExternalId } from "@/lib/applications";
import { SWR_KEY_APPLICATIONS } from "@/lib/useApplications";
import { getCatalogueState } from "@/lib/catalogueFilters";
import { getGoogleDriveEmbedUrl } from "@/lib/gdrive";
import { PROVIDER_TYPE_LABELS } from "@/lib/labels";
import type { Application, VideoRef } from "@/lib/types";

function isValidUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function UrlField({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>
        {isValidUrl(value) ? (
          <a
            href={value!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          value || "—"
        )}
      </dd>
    </>
  );
}

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
  const [activeVideo, setActiveVideo] = useState<VideoRef | null>(null);

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

  const videoOverride: GalleryVideoOverride = activeVideo
    ? {
        name: activeVideo.name,
        embedUrl: getGoogleDriveEmbedUrl(activeVideo.url),
        rawUrl: activeVideo.url,
      }
    : null;

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
          <Gallery
            photos={app.photos}
            name={app.name}
            externalId={app.externalId}
            videoOverride={videoOverride}
            onPhotoSelect={() => setActiveVideo(null)}
          />
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

      <div className="mt-8">
        <Section title="Additional Information">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm max-w-detail-info">
            <dt className="text-muted">Airbus Site</dt>
            <dd>{app.airbusSite ?? "—"}</dd>
            <dt className="text-muted">Functional Suitability</dt>
            <dd>{app.functionalSuitability ?? "—"}</dd>
            <dt className="text-muted">Technical Suitability</dt>
            <dd>{app.technicalSuitability ?? "—"}</dd>
            <dt className="text-muted">Program Category</dt>
            <dd>{app.programCategory ?? "—"}</dd>
            <dt className="text-muted">Part IS</dt>
            <dd>{app.partIS ?? "—"}</dd>
            <dt className="text-muted">Obso Risk Status</dt>
            <dd>{app.obsoRiskStatus ?? "—"}</dd>
            <UrlField label="BRD" value={app.BRDURL} />
            <UrlField label="ARD" value={app.ARDURL} />
            <UrlField label="Confluence" value={app.confluenceURL} />
            <UrlField label="Google Drive" value={app.gDrivePath} />
          </dl>
        </Section>
      </div>

      {app.videos.length > 0 && (
        <div className="mt-8">
          <Section title="Videos">
            <div className="flex flex-wrap gap-3">
              {app.videos.map((video) => {
                const active = activeVideo?.id === video.id;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setActiveVideo(video)}
                    title={video.name}
                    className={`flex items-center gap-2 px-3 py-2 rounded border-2 transition-all max-w-[220px] bg-surface-2 ${
                      active
                        ? "border-accent opacity-100"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <VideoIcon
                      size={18}
                      className={active ? "text-accent" : "text-muted"}
                    />
                    <span className="text-xs truncate">{video.name}</span>
                  </button>
                );
              })}
            </div>
          </Section>
        </div>
      )}
    </main>
  );
}

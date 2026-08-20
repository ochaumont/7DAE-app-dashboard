"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Application } from "@/lib/types";
import { usePhoto } from "@/lib/usePhoto";
import { generateApplicationCoverDataUri } from "@/lib/generated-cover";
import ChipCategory from "./ChipCategory";
import BadgeStatus from "./BadgeStatus";
import ChipBusinessCriticality from "./ChipBusinessCriticality";

export default function ApplicationCard({
  application,
}: {
  application: Application;
}) {
  const realCover = usePhoto(
    application.coverPhoto?.id ?? "",
    application.coverPhoto?.uri ?? "",
  );
  const generatedCover = useMemo(
    () => generateApplicationCoverDataUri(application.name, application.externalId),
    [application.name, application.externalId],
  );
  const coverSrc = application.coverPhoto ? realCover : generatedCover;

  return (
    <Link
      href={`/application?id=${encodeURIComponent(application.externalId)}`}
      // No prefetch: every detail link resolves to the SAME static page
      // (/application, the ?id= is read client-side), so Next's viewport
      // prefetch would just refetch the same shell per card and spam the gateway
      // with 301/403 on load. Navigation still works on click.
      prefetch={false}
      className="bench-card group block overflow-hidden rounded-card transition-all duration-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <img
          src={coverSrc}
          alt={application.name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <ChipCategory category={application.category} withIcon />
          <ChipBusinessCriticality level={application.businessCriticality} />
        </div>
        <h3 className="font-semibold leading-tight line-clamp-2">
          {application.name}
        </h3>
        <p className="text-sm text-muted font-mono">
          [{application.externalId}]
          {application.portfolio ? ` · ${application.portfolio.name}` : ""}
        </p>
        <div className="flex items-center justify-between gap-2">
          <BadgeStatus status={application.status} />
          <span className="text-xs text-muted font-mono">
            {application.completion}%
          </span>
        </div>
      </div>
    </Link>
  );
}

import clsx from "clsx";
import type { Application } from "@/lib/types";
import { isValidUrl } from "@/lib/url";
import FileIcon from "@/components/icons/FileIcon";

function DocChip({ label, url }: { label: string; url: string | null }) {
  const clickable = isValidUrl(url);
  const className = clsx(
    "flex flex-col items-center justify-center gap-2 rounded-card border p-4 text-center transition-colors",
    clickable
      ? "border-border hover:border-accent hover:text-accent cursor-pointer"
      : "border-border opacity-50 pointer-events-none",
  );
  const content = (
    <>
      <FileIcon size={20} />
      <span className="text-xs uppercase tracking-[0.15em] font-mono">
        {label}
      </span>
    </>
  );
  return clickable ? (
    <a href={url!} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

/**
 * Content of the Documentation tab on the Application detail page: file
 * chips linking to ARD/BRD/Confluence/Google Drive when available.
 */
export default function DocumentationTab({
  application,
}: {
  /** Application already fetched by the parent — no data fetching here. */
  application: Application;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <DocChip label="ARD" url={application.ARDURL} />
      <DocChip label="BRD" url={application.BRDURL} />
      <DocChip label="Confluence" url={application.confluenceURL} />
      <DocChip label="Google Drive" url={application.gDrivePath} />
    </div>
  );
}

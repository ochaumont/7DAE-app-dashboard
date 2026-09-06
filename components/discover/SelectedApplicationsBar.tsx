import type { Application } from "@/lib/types";

type Props = {
  applications: Application[];
  onRemove: (id: string) => void;
};

/** Adapted verbatim from `/depgraph`'s `SelectedBenchesBar` — a chip list,
 * purely presentational. */
export default function SelectedApplicationsBar({ applications, onRemove }: Readonly<Props>) {
  if (applications.length === 0) return null;

  return (
    <div className="flex h-10 min-w-[140px] max-w-xl flex-1 basis-52 flex-wrap content-start gap-1.5 overflow-y-auto rounded-card border border-border bg-surface p-1.5">
      {applications.map((a) => (
        <span
          key={a.id}
          className="flex items-center gap-1.5 rounded-card border border-border bg-surface-2 px-2.5 py-1 text-xs text-fg"
        >
          {a.name}
          <button
            type="button"
            onClick={() => onRemove(a.id)}
            aria-label={`Remove ${a.name}`}
            className="text-muted hover:text-danger"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}

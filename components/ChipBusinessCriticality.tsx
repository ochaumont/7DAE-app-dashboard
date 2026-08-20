import type { BusinessCriticality } from "@/lib/types";
import clsx from "clsx";
import { BUSINESS_CRITICALITY_LABELS } from "@/lib/labels";

const COLORS: Record<BusinessCriticality, string> = {
  missionCritical: "bg-danger/15 text-danger",
  businessCritical: "bg-warning/15 text-warning",
  businessOperational: "bg-accent/15 text-accent",
  administrativeService: "bg-surface-2 text-muted",
  NA: "bg-surface-2 text-muted",
};

export default function ChipBusinessCriticality({
  level,
}: {
  level: BusinessCriticality;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        COLORS[level],
      )}
    >
      {BUSINESS_CRITICALITY_LABELS[level]}
    </span>
  );
}

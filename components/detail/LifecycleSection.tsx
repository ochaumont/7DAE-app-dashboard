import type { ComponentType } from "react";
import type { ApplicationLifecycle } from "@/lib/types";
import {
  PhaseInIcon,
  ActiveIcon,
  PhaseOutIcon,
  EndOfLifeIcon,
  PlanIcon,
} from "@/components/icons/ApplicationLifecycleIcon";
import { formatDate } from "@/lib/format-date";

type StepKey = "phaseIn" | "active" | "phaseOut" | "endOfLife" | "plan";

type StepDef = {
  key: StepKey;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  colorVar: string;
  reachedDescription: (formattedDate: string) => string;
  unreachedDescription: string;
};

const STEPS: StepDef[] = [
  {
    key: "plan",
    label: "Plan",
    Icon: PlanIcon,
    colorVar: "var(--color-muted)",
    reachedDescription: (d) => `Planned for ${d}`,
    unreachedDescription: "No plan date",
  },
  {
    key: "phaseIn",
    label: "Phase In",
    Icon: PhaseInIcon,
    colorVar: "var(--color-accent)",
    reachedDescription: (d) => `Phased in ${d}`,
    unreachedDescription: "Not yet phased in",
  },
  {
    key: "active",
    label: "Active",
    Icon: ActiveIcon,
    colorVar: "var(--color-success)",
    reachedDescription: (d) => `Active since ${d}`,
    unreachedDescription: "Not active",
  },
  {
    key: "phaseOut",
    label: "Phase Out",
    Icon: PhaseOutIcon,
    colorVar: "var(--color-warning)",
    reachedDescription: (d) => `Phase-out started ${d}`,
    unreachedDescription: "Not phased out",
  },
  {
    key: "endOfLife",
    label: "End of Life",
    Icon: EndOfLifeIcon,
    colorVar: "var(--color-danger)",
    reachedDescription: (d) => `End of life ${d}`,
    unreachedDescription: "Not end of life",
  },
];

function StepCard({
  step,
  rawDate,
}: {
  step: StepDef;
  rawDate?: string;
}) {
  const reached = !!rawDate;
  const formatted = formatDate(rawDate);
  const description = reached
    ? step.reachedDescription(formatted)
    : step.unreachedDescription;

  return (
    <li
      className="pl-3 py-1.5 border-l-[3px] flex items-start gap-3"
      style={{
        borderLeftColor: reached ? step.colorVar : "var(--color-border)",
      }}
    >
      <div
        className="flex items-center gap-2 shrink-0"
        style={{ color: reached ? step.colorVar : "var(--color-muted)" }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={
            reached
              ? { backgroundColor: step.colorVar }
              : {
                  backgroundColor: "transparent",
                  boxShadow: "inset 0 0 0 1px var(--color-muted)",
                }
          }
        />
        <step.Icon size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-fg">{step.label}</div>
        <div className="text-xs text-muted mt-0.5">{description}</div>
      </div>
    </li>
  );
}

export default function LifecycleSection({
  lifecycle,
}: {
  lifecycle: ApplicationLifecycle;
}) {
  const hasAny = STEPS.some((s) => lifecycle[s.key]);
  if (!hasAny) {
    return <p className="text-sm text-muted">No lifecycle data available</p>;
  }
  return (
    <ul className="space-y-3">
      {STEPS.map((s) => (
        <StepCard key={s.key} step={s} rawDate={lifecycle[s.key]} />
      ))}
    </ul>
  );
}

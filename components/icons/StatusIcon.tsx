import clsx from "clsx";
import type { ApplicationStatus } from "@/lib/types";

type Props = {
  status: ApplicationStatus;
  size?: number;
  className?: string;
};

const COLOR_CLASS: Record<ApplicationStatus, string> = {
  active: "text-success",
  developmentPhase: "text-accent",
  planPhase: "text-warning",
  inactive: "text-danger",
  NA: "text-muted",
};

export default function StatusIcon({ status, size = 14, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={clsx(COLOR_CLASS[status], className)}
    >
      {GLYPH[status]}
    </svg>
  );
}

const GLYPH: Record<ApplicationStatus, React.ReactNode> = {
  active: <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />,
  developmentPhase: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 7 12 12 15 14" />
    </>
  ),
  planPhase: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="10" y1="9" x2="10" y2="15" />
      <line x1="14" y1="9" x2="14" y2="15" />
    </>
  ),
  inactive: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </>
  ),
  NA: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
};

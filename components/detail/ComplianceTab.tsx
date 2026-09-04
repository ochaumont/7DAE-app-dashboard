import type { Application } from "@/lib/types";
import {
  getComplianceScore,
  complianceSeverity,
  COMPLIANCE_SEVERITY_CLASS,
} from "@/lib/compliance-score";

function ScoreCard({
  label,
  attribute,
  value,
}: {
  label: string;
  attribute: "functionalSuitability" | "technicalSuitability";
  value: string | null;
}) {
  const score = getComplianceScore(attribute, value);
  const severity = complianceSeverity(score);
  return (
    <div className="rounded-card border border-border bg-surface p-4 space-y-2">
      <span className="text-xs uppercase tracking-[0.15em] font-mono text-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-fg">{value || "—"}</span>
        {score !== null && (
          <span className={`text-xs font-mono ${COMPLIANCE_SEVERITY_CLASS[severity]}`}>
            {score}/5
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Content of the Compliance tab on the Application detail page. Reduced
 * scope: only `functionalSuitability`/`technicalSuitability` are available
 * today (2 of the 9 axes designed for the target radar) — no radar chart is
 * drawn from just 2 points, and no score is ever invented for the 7
 * attributes not yet exposed by the backend.
 */
export default function ComplianceTab({
  application,
}: {
  /** Application already fetched by the parent — no data fetching here. */
  application: Application;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <ScoreCard
          label="Functional Suitability"
          attribute="functionalSuitability"
          value={application.functionalSuitability}
        />
        <ScoreCard
          label="Technical Suitability"
          attribute="technicalSuitability"
          value={application.technicalSuitability}
        />
      </div>
      <p className="text-xs text-muted">
        Le radar de conformité complet (9 attributs) sera activé dès que les
        autres attributs seront exposés par le backend.
      </p>
    </div>
  );
}

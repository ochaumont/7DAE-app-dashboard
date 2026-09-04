import scoreMapping from "./compliance-score-mapping.json";

type ComplianceAttribute = keyof typeof scoreMapping;

/**
 * Looks up the 1-5 compliance score for a raw attribute value using
 * `compliance-score-mapping.json`. Case-insensitive; returns `null` when the
 * value is absent or not a recognized key — never invents a score.
 */
export function getComplianceScore(
  attribute: ComplianceAttribute,
  rawValue: string | null,
): number | null {
  if (!rawValue) return null;
  const mapping = scoreMapping[attribute] as Record<string, number>;
  const key = Object.keys(mapping).find(
    (k) => k.toLowerCase() === rawValue.toLowerCase(),
  );
  return key ? mapping[key] : null;
}

export type ComplianceSeverity = "good" | "warn" | "risk" | "unknown";

/** `>= 4` good, `=== 3` warn, `<= 2` risk, `null` → unknown. */
export function complianceSeverity(score: number | null): ComplianceSeverity {
  if (score === null) return "unknown";
  if (score >= 4) return "good";
  if (score === 3) return "warn";
  return "risk";
}

export const COMPLIANCE_SEVERITY_CLASS: Record<ComplianceSeverity, string> = {
  good: "text-success",
  warn: "text-warning",
  risk: "text-danger",
  unknown: "text-muted",
};

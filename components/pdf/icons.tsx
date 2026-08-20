/**
 * PDF transpositions of the web SVG icons (components/icons/*) into
 * @react-pdf/renderer primitives. The web icons rely on `currentColor`, which
 * is not resolved in react-pdf, so every shape here receives an EXPLICIT color.
 */
import { Svg, Path, Circle, Line, Rect, Polyline } from "@react-pdf/renderer";
import type { ApplicationCategory, ApplicationStatus } from "@/lib/types";
import { colors, statusColor } from "./styles";

// Shared stroke style for the line-art icons (matches the web: round caps/joins,
// no fill). `w` mirrors each source icon's strokeWidth.
function strokeProps(color: string, w = 1.8) {
  return {
    stroke: color,
    strokeWidth: w,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

// ---------------------------------------------------------------------------
// Status (components/icons/StatusIcon.tsx)
// ---------------------------------------------------------------------------
export function PdfStatusIcon({
  status,
  size = 12,
}: {
  status: ApplicationStatus;
  size?: number;
}) {
  const c = statusColor[status] ?? colors.muted;
  const s = strokeProps(c, 2);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {status === "active" && <Circle cx={12} cy={12} r={9} fill={c} />}
      {status === "developmentPhase" && (
        <>
          <Circle cx={12} cy={12} r={10} {...s} />
          <Polyline points="12,7 12,12 15,14" {...s} />
        </>
      )}
      {status === "planPhase" && (
        <>
          <Circle cx={12} cy={12} r={10} {...s} />
          <Line x1={10} y1={9} x2={10} y2={15} {...s} />
          <Line x1={14} y1={9} x2={14} y2={15} {...s} />
        </>
      )}
      {status === "inactive" && (
        <>
          <Circle cx={12} cy={12} r={10} {...s} />
          <Line x1={9} y1={9} x2={15} y2={15} {...s} />
          <Line x1={15} y1={9} x2={9} y2={15} {...s} />
        </>
      )}
      {status === "NA" && (
        <>
          <Circle cx={12} cy={12} r={10} {...s} />
          <Line x1={8} y1={12} x2={16} y2={12} {...s} />
        </>
      )}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Category glyph (components/icons/CategoryIcon.tsx) — used in the Identity chip
// ---------------------------------------------------------------------------
export function PdfCategoryIcon({
  size = 14,
  color = colors.accent,
}: {
  category?: ApplicationCategory;
  size?: number;
  color?: string;
}) {
  const s = strokeProps(color, 1.8);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 3 11v9a2 2 0 0 0 2 2h6" {...s} />
      <Path d="M12 2l9 9v3" {...s} />
      <Circle cx={8} cy={9} r={1.2} fill={color} />
      <Path d="M20 15v6M17 18h6" {...s} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Lifecycle step icons (components/icons/ApplicationLifecycleIcon.tsx)
// ---------------------------------------------------------------------------
type StepIconProps = { size?: number; color?: string };

export function PdfPhaseInIcon({ size = 14, color = colors.fg }: StepIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 12h12" {...strokeProps(color)} />
      <Path d="m12 6 6 6-6 6" {...strokeProps(color)} />
      <Path d="M20 5v14" {...strokeProps(color)} />
    </Svg>
  );
}

export function PdfActiveIcon({ size = 14, color = colors.fg }: StepIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} {...strokeProps(color)} />
      <Path d="m8 12 3 3 5-6" {...strokeProps(color)} />
    </Svg>
  );
}

export function PdfPhaseOutIcon({ size = 14, color = colors.fg }: StepIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 5v14" {...strokeProps(color)} />
      <Path d="M8 12h12" {...strokeProps(color)} />
      <Path d="m14 6 6 6-6 6" {...strokeProps(color)} />
    </Svg>
  );
}

export function PdfEndOfLifeIcon({ size = 14, color = colors.fg }: StepIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={4} rx={1} {...strokeProps(color)} />
      <Path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" {...strokeProps(color)} />
      <Path d="M10 12h4" {...strokeProps(color)} />
    </Svg>
  );
}

export function PdfPlanIcon({ size = 14, color = colors.fg }: StepIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={16} rx={2} {...strokeProps(color)} />
      <Path d="M3 10h18" {...strokeProps(color)} />
      <Path d="M8 3v4M16 3v4" {...strokeProps(color)} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Airbus wordmark (public/airbus-logo.svg) — fill forced to Airbus blue.
// ---------------------------------------------------------------------------
export function PdfAirbusLogo({
  width = 120,
  color = "#00205b",
}: {
  width?: number;
  color?: string;
}) {
  const height = Math.round((width * 73.885) / 398.971);
  return (
    <Svg width={width} height={height} viewBox="0 0 398.971 73.885">
      <Path
        fill={color}
        d="m120.15 1.5117v70.861h17.258v-55.547h19.521c7.227 0 9.8145 4.1007 9.8145 8.8457 0 4.854-2.6968 8.8438-9.9238 8.8438h-16.717l23.729 37.857h19.631s-16.179-25.453-16.07-25.453c10.032-2.372 16.502-9.3837 16.502-21.68 0-13.482-8.8443-23.729-27.072-23.729zm-28.906-7.188e-4h17.258v70.864h-17.258zm-44.114 44.114h-14.523l10.747-21.787h0.217l24.16 48.536h19.846l-36.133-70.863h-15.315l-36.133 70.863h19.414l5.853-11.864h29.093zm144.96-44.113v70.861h41.961c14.668 0 24.268-7.8737 24.268-19.846-1e-3 -8.304-4.6376-14.559-11.434-16.932 5.502-3.021 8.4141-7.8752 8.4141-14.994 0-11.433-8.5222-19.09-22.867-19.09zm17.26 14.992h23.082c3.452 0 6.1484 2.6959 6.1484 6.2559 0 3.56-2.6968 6.2559-6.2578 6.2559h-22.973zm0 26.639h23.514c4.207 0 7.4434 3.0211 7.4434 7.1191 1e-3 4.206-3.2364 7.334-7.4434 7.334h-23.514zm103.44-2.0476c0 10.756-4.962 16.718-14.776 16.718-9.707 0-14.669-5.962-14.669-16.718v-39.584h-17.688v38.29c0 21.896 11.541 34.084 32.357 34.084s32.465-12.188 32.465-34.084v-38.29h-17.689zm55.009-41.095c-18.229 0-28.477 9.0611-28.477 21.248 0 13.114 7.6533 18.442 25.238 22.219 13.69 3.018 16.609 4.9013 16.609 8.7363 0 4.166-3.7748 6.041-11.217 6.041-10.786 0-20.546-2.6193-28.365-6.9023l-5.2852 15.1c8.521 4.53 21.247 7.4434 34.082 7.4434 17.905 0 28.582-8.3067 28.582-22.221 2e-3 -11.163-7.2206-18.334-22.434-22.002-16.383-3.989-19.951-4.3696-19.951-9.0605 0-3.629 4.097-5.3945 11-5.3945 9.168 0 18.931 2.3018 24.484 5.7188l5.5-14.453c-7.118-3.775-17.58-6.4727-29.768-6.4727z"
      />
    </Svg>
  );
}

import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  fg: "#0f172a",
  muted: "#64748b",
  accent: "#2563eb",
  success: "#047857",
  warning: "#b45309",
  danger: "#b91c1c",
  border: "#e2e8f0",
  bg: "#ffffff",
  surface: "#f8fafc",
};

export const statusColor: Record<string, string> = {
  active: colors.success,
  developmentPhase: colors.accent,
  planPhase: colors.warning,
  inactive: colors.danger,
  NA: colors.muted,
};

export const businessCriticalityColor: Record<string, string> = {
  missionCritical: colors.danger,
  businessCritical: colors.warning,
  businessOperational: colors.accent,
  administrativeService: colors.muted,
  NA: colors.muted,
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.fg,
    backgroundColor: colors.bg,
  },
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", color: colors.fg },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", color: colors.fg },
  h3: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  body: { fontSize: 10, color: colors.fg, lineHeight: 1.4 },
  small: { fontSize: 9, color: colors.muted },
  mono: { fontFamily: "Courier", fontSize: 9 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 6,
  },
  row: { flexDirection: "row", alignItems: "center" },
  spaceBetween: { justifyContent: "space-between" },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: colors.bg,
  },
  link: { color: colors.accent, textDecoration: "underline" },
  section: { marginBottom: 12 },
  // Highlighted manager card.
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.surface,
    padding: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    color: colors.bg,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  // Boxed description block placed after all other attributes.
  descriptionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.surface,
    padding: 10,
  },
  // Identity "type" chip: type glyph + label on a light accent background.
  chipType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#c7d7f7",
    borderRadius: 4,
    backgroundColor: "#eef3fd",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  chipTypeLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
  },
  // Small text chip (softwares).
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 9,
    color: colors.fg,
    marginRight: 4,
    marginBottom: 4,
  },
});

// Per-step lifecycle colors (mirrors components/detail/LifecycleSection.tsx).
export const lifecycleColor = {
  phaseIn: colors.accent,
  active: colors.success,
  phaseOut: colors.warning,
  endOfLife: colors.danger,
  plan: colors.muted,
};

// Deterministic avatar palette + helpers (mirrors components/Avatar.tsx) so the
// manager encart shows the same initials/color as the web.
const AVATAR_PALETTE = [
  "#5b8def",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#22d3ee",
  "#fb7185",
  "#84cc16",
];

export function avatarColor(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return AVATAR_PALETTE[(h >>> 0) % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

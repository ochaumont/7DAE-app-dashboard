import clsx from "clsx";

const PALETTE = [
  "#5b8def",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#22d3ee",
  "#fb7185",
  "#84cc16",
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  seed,
  size = 48,
  className,
}: {
  name: string;
  seed?: string;
  size?: number;
  className?: string;
}) {
  const color = PALETTE[hash(seed ?? name) % PALETTE.length];
  return (
    <span
      role="img"
      aria-label={name}
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-semibold text-white select-none",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials(name)}
    </span>
  );
}

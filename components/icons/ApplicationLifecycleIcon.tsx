type Props = { size?: number; className?: string };

function svgProps({ size = 18, className }: Props) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className,
  };
}

export function PhaseInIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 12h12" />
      <path d="m12 6 6 6-6 6" />
      <path d="M20 5v14" />
    </svg>
  );
}

export function ActiveIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export function PhaseOutIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 5v14" />
      <path d="M8 12h12" />
      <path d="m14 6 6 6-6 6" />
    </svg>
  );
}

export function EndOfLifeIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function PlanIcon(props: Props) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

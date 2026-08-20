type Props = { size?: number; className?: string };

export default function CategoryIcon({ size = 14, className }: Props) {
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
      className={className}
    >
      <path d="M12 2 3 11v9a2 2 0 0 0 2 2h6" />
      <path d="M12 2l9 9v3" />
      <circle cx="8" cy="9" r="1.2" fill="currentColor" stroke="none" />
      <path d="M20 15v6M17 18h6" />
    </svg>
  );
}

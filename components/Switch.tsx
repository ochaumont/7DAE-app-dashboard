"use client";

export default function Switch({
  checked,
  onChange,
}: Readonly<{
  checked: boolean;
  onChange: (v: boolean) => void;
}>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[20px] w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform"
        style={{ transform: checked ? "translateX(17px)" : "translateX(2px)" }}
      />
    </button>
  );
}

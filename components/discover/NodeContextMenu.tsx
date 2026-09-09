"use client";

import { useEffect, useRef } from "react";

export type DiscoverContextMenuTarget = {
  nodeId: string;
  x: number;
  y: number;
  variant: "application" | "interface";
  inboundCount: number;
  outboundCount: number;
  /** Distinct consumer apps whose edge to a currently-*visible* interface
   * isn't drawn yet — governs what a click on "Show Consumers" actually
   * reveals, so it also governs whether the item is disabled. */
  consumersMissingVisible: number;
  /** Same, but across every interface this node is attached to (visible or
   * not) — shown alongside the first as context, not actionable by itself. */
  consumersMissingTotal: number;
  canHide: boolean;
};

type Props = {
  target: DiscoverContextMenuTarget | null;
  onClose: () => void;
  onShowInterfacesInbound: (nodeId: string) => void;
  onShowInterfacesOutbound: (nodeId: string) => void;
  onShowDependencies: (nodeId: string) => void;
  onHide: (nodeId: string) => void;
};

function formatCount(n: number): string {
  return n < 0 ? "…" : String(n);
}

function MenuItem({
  label,
  count,
  secondaryCount,
  onClick,
}: Readonly<{ label: string; count: number; secondaryCount?: number; onClick: () => void }>) {
  // `count === -1` means "not fetched yet" — stays enabled (clicking is what
  // triggers the fetch) and shows "…" instead of a number. Only `count` (not
  // `secondaryCount`) governs whether the action does anything.
  const disabled = count === 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm ${
        disabled ? "opacity-60 cursor-default" : "hover:bg-surface-2"
      }`}
    >
      <span className="text-fg">{label}</span>
      <span className="text-xs text-muted">
        {secondaryCount === undefined
          ? formatCount(count)
          : `${formatCount(count)} / ${formatCount(secondaryCount)}`}
      </span>
    </button>
  );
}

/** Adapted from `/depgraph`'s `NodeContextMenu` — same popover/positioning
 * and Escape/outside-click dismissal, with the Application/Interface action
 * vocabulary from the Discover spec instead of bench relation kinds. */
export default function NodeContextMenu({
  target,
  onClose,
  onShowInterfacesInbound,
  onShowInterfacesOutbound,
  onShowDependencies,
  onHide,
}: Readonly<Props>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // Capture phase: React Flow's own node/pane handlers call
    // `stopPropagation()` on mousedown (for drag/pan) during the bubble
    // phase, which would otherwise swallow left-clicks on the canvas before
    // this listener ever saw them. Capture runs before that, so both left-
    // and right-clicks anywhere outside the menu close it.
    document.addEventListener("mousedown", onMouseDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown, true);
    };
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute z-20 min-w-[220px] overflow-hidden rounded-card border border-border bg-surface py-1 shadow-lg"
      style={{ left: target.x, top: target.y }}
    >
      {target.variant === "application" ? (
        <>
          <MenuItem
            label="Show API"
            count={target.inboundCount}
            onClick={() => onShowInterfacesInbound(target.nodeId)}
          />
          <MenuItem
            label="Show Consumers"
            count={target.consumersMissingVisible}
            secondaryCount={target.consumersMissingTotal}
            onClick={() => onShowDependencies(target.nodeId)}
          />
          <MenuItem
            label="Show providers"
            count={target.outboundCount}
            onClick={() => onShowInterfacesOutbound(target.nodeId)}
          />
        </>
      ) : (
        <MenuItem
          label="Show Consumers"
          count={target.consumersMissingVisible}
          secondaryCount={target.consumersMissingTotal}
          onClick={() => onShowDependencies(target.nodeId)}
        />
      )}
      <div className="my-1 border-t border-border" />
      <button
        type="button"
        disabled={!target.canHide}
        onClick={() => onHide(target.nodeId)}
        className={`w-full px-3 py-1.5 text-left text-sm text-danger ${
          target.canHide ? "hover:bg-surface-2" : "opacity-60 cursor-default"
        }`}
      >
        Hide
      </button>
    </div>
  );
}

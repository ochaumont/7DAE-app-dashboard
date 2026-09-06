"use client";

import { useEffect, useRef } from "react";

export type DiscoverContextMenuTarget = {
  nodeId: string;
  x: number;
  y: number;
  variant: "application" | "interface";
  inboundCount: number;
  outboundCount: number;
  dependenciesCount: number;
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

function MenuItem({
  label,
  count,
  onClick,
}: Readonly<{ label: string; count: number; onClick: () => void }>) {
  // `count === -1` means "not fetched yet" — stays enabled (clicking is what
  // triggers the fetch) and shows "…" instead of a number.
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
      <span className="text-xs text-muted">{count < 0 ? "…" : count}</span>
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
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
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
            label="Show Interfaces Inbound"
            count={target.inboundCount}
            onClick={() => onShowInterfacesInbound(target.nodeId)}
          />
          <MenuItem
            label="Show Interfaces Outbound"
            count={target.outboundCount}
            onClick={() => onShowInterfacesOutbound(target.nodeId)}
          />
          <MenuItem
            label="Show dependencies"
            count={target.dependenciesCount}
            onClick={() => onShowDependencies(target.nodeId)}
          />
        </>
      ) : (
        <MenuItem
          label="Show dependencies"
          count={target.dependenciesCount}
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Application } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/labels";
import GripIcon from "@/components/icons/GripIcon";

type Props = {
  application: Application | null;
  onClose: () => void;
};

const RESIZABLE_MIN_HEIGHT = 24;
const RESIZABLE_MAX_HEIGHT = 240;
const DATA_OBJECTS_DEFAULT_HEIGHT = 48;
const DESCRIPTION_DEFAULT_HEIGHT = 64;

/** Drag-to-resize a section's height via a small handle below it — used for
 * both Data Objects and Description, each growing the card itself (unlike a
 * fixed-size box) as the user drags. */
function useDragResizeHeight(defaultHeight: number) {
  const [height, setHeight] = useState(defaultHeight);
  const dragRef = useRef<{ startClientY: number; startHeight: number } | null>(null);

  const reset = useCallback(() => setHeight(defaultHeight), [defaultHeight]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { startClientY: e.clientY, startHeight: height };

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!dragRef.current) return;
        const delta = moveEvent.clientY - dragRef.current.startClientY;
        const proposed = dragRef.current.startHeight + delta;
        setHeight(Math.min(RESIZABLE_MAX_HEIGHT, Math.max(RESIZABLE_MIN_HEIGHT, proposed)));
      };
      const onPointerUp = () => {
        dragRef.current = null;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [height],
  );

  return { height, onPointerDown, reset };
}

/** Drag-to-move the whole card via its header — an offset applied on top of
 * the card's default anchor position (right of the info icon), reset
 * whenever a different application's card opens. */
function useDragMove() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const reset = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: offset.x,
        startY: offset.y,
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!dragRef.current) return;
        setOffset({
          x: dragRef.current.startX + (moveEvent.clientX - dragRef.current.startClientX),
          y: dragRef.current.startY + (moveEvent.clientY - dragRef.current.startClientY),
        });
      };
      const onPointerUp = () => {
        dragRef.current = null;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [offset],
  );

  return { offset, onPointerDown, reset };
}

function ResizeHandle({ onPointerDown }: Readonly<{ onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void }>) {
  return (
    <div
      className="nodrag -my-0.5 flex h-2.5 cursor-ns-resize items-center justify-center"
      onPointerDown={onPointerDown}
    >
      <div className="h-1 w-8 rounded-full bg-border" />
    </div>
  );
}

function Field({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] uppercase tracking-[0.08em] text-muted shrink-0">{label}</span>
      <span className="truncate text-xs text-fg text-right" title={value ?? undefined}>
        {value || "—"}
      </span>
    </div>
  );
}

/** Lightweight identity card shown to the right of an Application
 * rectangle's info icon (`ApplicationNode.tsx`). Data Objects and
 * Description are both user-resizable (drag handle below each), growing the
 * card itself rather than paginating. Never propagates its clicks to the
 * rectangle (no link highlight, no context menu). */
export default function ApplicationInfoCard({ application, onClose }: Readonly<Props>) {
  const dataObjects = useDragResizeHeight(DATA_OBJECTS_DEFAULT_HEIGHT);
  const description = useDragResizeHeight(DESCRIPTION_DEFAULT_HEIGHT);
  const move = useDragMove();

  useEffect(() => {
    dataObjects.reset();
    description.reset();
    move.reset();
    // Reset only when a different application's card opens, not on every
    // render — `reset` is stable per `defaultHeight` (see the hook).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id]);

  return (
    <div
      role="dialog"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className="nodrag absolute z-20 flex w-64 flex-col gap-1.5 rounded-card border border-border bg-surface p-3 shadow-lg"
      style={{
        left: "calc(100% + 8px)",
        bottom: 0,
        transform: `translate(${move.offset.x}px, ${move.offset.y}px)`,
      }}
    >
      <div
        className="-mx-3 -mt-3 flex cursor-grab items-center gap-1.5 rounded-t-card border-b border-border bg-surface-2 px-3 py-1.5 active:cursor-grabbing"
        onPointerDown={move.onPointerDown}
      >
        <GripIcon size={12} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg" title={application?.name}>
          {application?.name || "—"}
        </span>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Close"
          className="shrink-0 text-muted hover:text-fg"
        >
          ✕
        </button>
      </div>

      <Field label="External Ref" value={application?.externalId ?? null} />
      <Field
        label="Category"
        value={application ? CATEGORY_LABELS[application.category] : null}
      />
      <Field label="Portfolio" value={application?.portfolio?.name ?? null} />
      <Field label="Operator" value={application?.operator ?? null} />

      <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1.5">
        <span className="text-[10px] uppercase tracking-[0.08em] text-muted">Data Objects</span>
        <div className="overflow-y-auto text-xs text-fg" style={{ height: dataObjects.height }}>
          {application && (application.dataObjects ?? []).length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {(application?.dataObjects ?? []).map((dataObject) => (
                <li key={dataObject.id} className="truncate" title={dataObject.name}>
                  {dataObject.name}
                </li>
              ))}
            </ul>
          ) : (
            <span>—</span>
          )}
        </div>
        <ResizeHandle onPointerDown={dataObjects.onPointerDown} />
      </div>

      <div className="mt-1 flex flex-col gap-1 border-t border-border pt-1.5">
        <span className="text-[10px] uppercase tracking-[0.08em] text-muted">Description</span>
        <p className="overflow-y-auto text-xs text-fg" style={{ height: description.height }}>
          {application?.description || "—"}
        </p>
        <ResizeHandle onPointerDown={description.onPointerDown} />
      </div>
    </div>
  );
}

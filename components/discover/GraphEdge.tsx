"use client";

import { BaseEdge, type EdgeProps } from "@xyflow/react";

export type GraphEdgeData = {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  /** Alternates +1/-1 across parallel edges between overlapping node pairs
   * so their curves separate instead of overlapping. */
  bend: number;
};

/** Quadratic-bezier edge with a control point offset along the segment's
 * normal — same curvature technique as `/depgraph`'s `RadialEdge`, generic
 * enough to reuse verbatim (it knows nothing about applications/interfaces). */
export default function GraphEdge({ data, markerEnd, style }: EdgeProps) {
  const d = data as unknown as GraphEdgeData;
  const mx = (d.sx + d.tx) / 2;
  const my = (d.sy + d.ty) / 2;
  const dx = d.tx - d.sx;
  const dy = d.ty - d.sy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = len * 0.16 * d.bend;
  const cx = mx + nx * offset;
  const cy = my + ny * offset;
  const path = `M ${d.sx} ${d.sy} Q ${cx} ${cy} ${d.tx} ${d.ty}`;
  return <BaseEdge path={path} markerEnd={markerEnd} style={style} />;
}

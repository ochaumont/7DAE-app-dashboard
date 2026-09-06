"use client";

import { Handle, Position } from "@xyflow/react";
import { INTERFACE_NODE_SIZE } from "@/lib/discover-graph-layout";

export type InterfaceNodeData = {
  name: string | null;
  protocol: string | null;
};

/** Small circle node — positioned in a ring around its provider's rectangle
 * by `placeInterfacesAroundProvider`. Too small for inline text; the name
 * (falling back to the protocol, then the node id) is a tooltip only. */
export default function InterfaceNode({ data }: Readonly<{ data: InterfaceNodeData }>) {
  const label = data.name || data.protocol || "Interface";
  return (
    <div
      title={label}
      className="rounded-full border-2 bg-surface"
      style={{
        width: INTERFACE_NODE_SIZE,
        height: INTERFACE_NODE_SIZE,
        borderColor: "var(--color-accent)",
      }}
    >
      <Handle type="source" position={Position.Left} style={{ visibility: "hidden" }} />
      <Handle type="source" position={Position.Right} style={{ visibility: "hidden" }} />
      <Handle type="target" position={Position.Left} style={{ visibility: "hidden" }} />
      <Handle type="target" position={Position.Right} style={{ visibility: "hidden" }} />
    </div>
  );
}

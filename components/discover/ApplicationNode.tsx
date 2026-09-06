"use client";

import { Handle, Position } from "@xyflow/react";
import { useDiscoverDisplaySettings } from "@/lib/discoverDisplaySettings";
import { APP_NODE_HEIGHT, APP_NODE_WIDTH } from "@/lib/discover-graph-layout";

export type ApplicationNodeData = {
  name: string;
  externalId: string | null;
  managerName: string | null;
  isRoot: boolean;
};

/** Rectangle node — same visual footprint/style as the `/depgraph` card, one
 * fixed size (no per-node resize) so the interface-circle placement math in
 * `lib/discover-graph-layout.ts` can rely on it. */
export default function ApplicationNode({ data }: Readonly<{ data: ApplicationNodeData }>) {
  const settings = useDiscoverDisplaySettings();
  return (
    <div
      className="relative flex flex-col justify-center rounded-card border bg-surface px-3 py-2 shadow-sm"
      style={{
        width: APP_NODE_WIDTH,
        height: APP_NODE_HEIGHT,
        borderColor: data.isRoot ? "var(--color-accent)" : "var(--color-border)",
        borderWidth: data.isRoot ? 2 : 1.5,
      }}
    >
      <Handle type="source" position={Position.Left} style={{ visibility: "hidden" }} />
      <Handle type="source" position={Position.Right} style={{ visibility: "hidden" }} />
      <Handle type="target" position={Position.Left} style={{ visibility: "hidden" }} />
      <Handle type="target" position={Position.Right} style={{ visibility: "hidden" }} />
      {settings.showName && (
        <div className="truncate font-mono text-sm font-semibold text-fg" title={data.name}>
          {data.name}
        </div>
      )}
      {settings.showExternalId && (
        <div className="truncate text-xs text-muted">{data.externalId ?? "—"}</div>
      )}
      {settings.showManager && (
        <div className="truncate text-xs text-muted">{data.managerName ?? "—"}</div>
      )}
    </div>
  );
}

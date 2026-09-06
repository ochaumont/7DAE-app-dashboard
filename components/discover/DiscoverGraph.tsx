"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  MarkerType,
  type Node,
  type Edge,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DiscoverApplicationNode, DiscoverEdge, DiscoverInterfaceNode } from "@/lib/types";
import {
  fetchApplicationInterfaces,
  fetchInterfaceDependencies,
  type ApplicationInterfacesNode,
  type InterfaceNode as InterfaceFactSheet,
} from "@/lib/atom-api";
import {
  toInboundInterfaces,
  toOutboundInterfacesAndProviders,
  toInterfaceConsumers,
  toInterfaceProvider,
} from "@/lib/discover-graph-adapter";
import {
  APP_NODE_HEIGHT,
  APP_NODE_WIDTH,
  INTERFACE_NODE_SIZE,
  placeInterfacesAroundProvider,
  placeNewApplicationNode,
} from "@/lib/discover-graph-layout";
import ApplicationNodeComponent, { type ApplicationNodeData } from "./ApplicationNode";
import InterfaceNodeComponent, { type InterfaceNodeData } from "./InterfaceNode";
import GraphEdge, { type GraphEdgeData } from "./GraphEdge";
import NodeContextMenu, { type DiscoverContextMenuTarget } from "./NodeContextMenu";

const nodeTypes = { application: ApplicationNodeComponent, interface: InterfaceNodeComponent };
const edgeTypes = { graphEdge: GraphEdge };

export type DiscoverGraphHandle = {
  addApplication: (app: DiscoverApplicationNode) => void;
  removeApplication: (id: string) => void;
};

type Props = {
  resolveManagerName: (applicationId: string) => string | null;
};

function boxSizeOf(node: Node): { width: number; height: number } {
  return node.type === "interface"
    ? { width: INTERFACE_NODE_SIZE, height: INTERFACE_NODE_SIZE }
    : { width: APP_NODE_WIDTH, height: APP_NODE_HEIGHT };
}

/** Interface nodes are children (`parentId`) of their provider so xyflow
 * moves them together when the rectangle is dragged — their stored
 * `position` is relative to the parent, not a screen coordinate. Every
 * consumer of node geometry (edge drawing, overlap checks) must resolve
 * through this instead of reading `node.position` directly. */
function absolutePosition(node: Node, byId: Map<string, Node>): { x: number; y: number } {
  if (!node.parentId) return node.position;
  const parent = byId.get(node.parentId);
  if (!parent) return node.position;
  const parentAbs = absolutePosition(parent, byId);
  return { x: parentAbs.x + node.position.x, y: parentAbs.y + node.position.y };
}

function centerOf(node: Node, byId: Map<string, Node>): { x: number; y: number } {
  const abs = absolutePosition(node, byId);
  const size = boxSizeOf(node);
  return { x: abs.x + size.width / 2, y: abs.y + size.height / 2 };
}

function boxesOf(nodes: Node[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes.map((n) => ({ ...absolutePosition(n, byId), ...boxSizeOf(n) }));
}

/** Where a ray from `from` toward `to` leaves `from`'s box — same math as
 * `lib/star-graph-layout.ts`'s `boxExit`, so edges visibly touch the
 * rectangle/circle border instead of hiding under it. */
function trimToBorder(
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: { width: number; height: number },
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  const byWidth = Math.abs(dx) < 1e-6 ? Infinity : halfW / Math.abs(dx);
  const byHeight = Math.abs(dy) < 1e-6 ? Infinity : halfH / Math.abs(dy);
  const t = Math.min(byWidth, byHeight);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function mergeInterfaceFactSheet(
  a: InterfaceFactSheet | undefined,
  b: InterfaceFactSheet,
): InterfaceFactSheet {
  if (!a) return b;
  return {
    ...a,
    ...b,
    relInterfaceToConsumerApplication:
      b.relInterfaceToConsumerApplication ?? a.relInterfaceToConsumerApplication,
    relInterfaceToProviderApplication:
      b.relInterfaceToProviderApplication ?? a.relInterfaceToProviderApplication,
    relInterfaceToDataObject: b.relInterfaceToDataObject ?? a.relInterfaceToDataObject,
  };
}

/** Adapted from `/depgraph`'s `DependencyGraph.tsx`: plain `useState` (not
 * `useNodesState`), edges derived from `edgeMeta` + live node positions via
 * `useMemo` so dragging never touches `edgeMeta`, and every expand/hide
 * action mutates state locally — ELK never runs again after the initial
 * root layout (done by the caller before `addApplication` for the first
 * node, trivially a single point at the origin). */
const DiscoverGraph = forwardRef<DiscoverGraphHandle, Props>(function DiscoverGraph(
  { resolveManagerName },
  ref,
) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edgeMeta, setEdgeMeta] = useState<DiscoverEdge[]>([]);
  const [contextMenu, setContextMenu] = useState<DiscoverContextMenuTarget | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgeMetaRef = useRef(edgeMeta);
  edgeMetaRef.current = edgeMeta;

  const rootIdsRef = useRef<Set<string>>(new Set());
  /** Every interface's provider id — the source of truth for "who anchors
   * this circle", independent of node.data (kept lean/render-only). */
  const interfaceProviderRef = useRef<Map<string, string>>(new Map());
  const appInterfacesCache = useRef<Map<string, ApplicationInterfacesNode>>(new Map());
  const interfaceFactSheetCache = useRef<Map<string, InterfaceFactSheet>>(new Map());

  const cacheInterfaceFactSheet = useCallback((fs: InterfaceFactSheet) => {
    interfaceFactSheetCache.current.set(
      fs.id,
      mergeInterfaceFactSheet(interfaceFactSheetCache.current.get(fs.id), fs),
    );
  }, []);

  const ensureAppInterfaces = useCallback(
    async (appId: string): Promise<ApplicationInterfacesNode | null> => {
      const cached = appInterfacesCache.current.get(appId);
      if (cached) return cached;
      const data = await fetchApplicationInterfaces(appId);
      if (!data) return null;
      appInterfacesCache.current.set(appId, data);
      for (const edge of data.relProviderApplicationToInterface?.edges ?? []) {
        if (edge.node.factSheet) cacheInterfaceFactSheet(edge.node.factSheet);
      }
      for (const edge of data.relConsumerApplicationToInterface?.edges ?? []) {
        if (edge.node.factSheet) cacheInterfaceFactSheet(edge.node.factSheet);
      }
      return data;
    },
    [cacheInterfaceFactSheet],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const makeApplicationNode = useCallback(
    (app: DiscoverApplicationNode, position: { x: number; y: number }, isRoot: boolean): Node => ({
      id: app.id,
      type: "application",
      position,
      data: {
        name: app.name,
        externalId: app.externalId,
        managerName: resolveManagerName(app.id) ?? app.managerName,
        isRoot,
      } satisfies ApplicationNodeData,
    }),
    [resolveManagerName],
  );

  function makeInterfaceNode(
    iface: DiscoverInterfaceNode,
    position: { x: number; y: number },
    parentId: string,
  ): Node {
    return {
      id: iface.id,
      type: "interface",
      // Relative to `parentId` (its provider) — a xyflow child node, so it
      // moves on-screen together with the provider's own drag/position,
      // with no extra code needed here or in the drag handler.
      position,
      parentId,
      data: { name: iface.name, protocol: iface.protocol } satisfies InterfaceNodeData,
    };
  }

  /** Adds/repositions every interface currently attached to `providerId`
   * (existing + `newInterfaces`) evenly along its top border — the only
   * placement that intentionally moves already-visible circles, since the
   * spacing depends on the total count (no density limit, decision).
   * Positions are relative to the provider (xyflow child nodes), so this
   * never needs the provider's own (possibly dragged) position. */
  const placeProviderInterfaces = useCallback(
    (current: Node[], providerId: string, newInterfaces: DiscoverInterfaceNode[]): Node[] => {
      const provider = current.find((n) => n.id === providerId);
      if (!provider) return current;
      const existingIds = new Set(current.map((n) => n.id));
      const toAdd = newInterfaces.filter((i) => !existingIds.has(i.id));
      for (const i of toAdd) interfaceProviderRef.current.set(i.id, providerId);
      const allIds = [
        ...current
          .filter((n) => interfaceProviderRef.current.get(n.id) === providerId)
          .map((n) => n.id),
        ...toAdd.map((i) => i.id),
      ];
      if (allIds.length === 0) return current;
      const positions = placeInterfacesAroundProvider(allIds.length);
      const positionById = new Map(allIds.map((id, i) => [id, positions[i]]));
      const repositioned = current.map((n) =>
        positionById.has(n.id) ? { ...n, position: positionById.get(n.id)! } : n,
      );
      const newNodes = toAdd.map((i) => makeInterfaceNode(i, positionById.get(i.id)!, providerId));
      return [...repositioned, ...newNodes];
    },
    [],
  );

  const addApplication = useCallback(
    (app: DiscoverApplicationNode) => {
      rootIdsRef.current.add(app.id);
      setNodes((current) => {
        const existingIndex = current.findIndex((n) => n.id === app.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = {
            ...next[existingIndex],
            data: { ...next[existingIndex].data, isRoot: true },
          };
          return next;
        }
        if (current.length === 0) {
          // Trivial ELK layout for a single node: always the origin.
          return [makeApplicationNode(app, { x: 0, y: 0 }, true)];
        }
        const byId = new Map(current.map((n) => [n.id, n]));
        const anchor = absolutePosition(current[current.length - 1], byId);
        const position = placeNewApplicationNode(anchor, "right", boxesOf(current));
        return [...current, makeApplicationNode(app, position, true)];
      });
    },
    [makeApplicationNode],
  );

  const removeApplication = useCallback((id: string) => {
    rootIdsRef.current.delete(id);
    const remainingIds = new Set(nodesRef.current.map((n) => n.id).filter((nid) => nid !== id));
    const adjacency = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a)!.add(b);
      adjacency.get(b)!.add(a);
    };
    for (const [ifaceId, providerId] of interfaceProviderRef.current) link(ifaceId, providerId);
    for (const e of edgeMetaRef.current) link(e.interfaceId, e.consumerId);
    const visited = new Set<string>();
    const queue = [...rootIdsRef.current].filter((rid) => remainingIds.has(rid));
    for (const rid of queue) visited.add(rid);
    while (queue.length) {
      const current = queue.shift()!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (remainingIds.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    setNodes((current) => current.filter((n) => n.id !== id && visited.has(n.id)));
    setEdgeMeta((current) =>
      current.filter((e) => visited.has(e.consumerId) && visited.has(e.interfaceId)),
    );
  }, []);

  const handleShowInterfacesInbound = useCallback(
    async (appId: string) => {
      setContextMenu(null);
      const data = await ensureAppInterfaces(appId);
      if (!data) return;
      const interfaces = toInboundInterfaces(data);
      setNodes((current) => placeProviderInterfaces(current, appId, interfaces));
    },
    [ensureAppInterfaces, placeProviderInterfaces],
  );

  const handleShowInterfacesOutbound = useCallback(
    async (appId: string) => {
      setContextMenu(null);
      const data = await ensureAppInterfaces(appId);
      if (!data) return;
      const { interfaces, providers, edges } = toOutboundInterfacesAndProviders(data);

      setNodes((current) => {
        let next = current;
        const existingIds = new Set(next.map((n) => n.id));
        const anchor = next.find((n) => n.id === appId)?.position ?? { x: 0, y: 0 };
        let cursor = anchor;
        for (const provider of providers) {
          if (existingIds.has(provider.id)) continue;
          const position = placeNewApplicationNode(cursor, "left", boxesOf(next));
          next = [...next, makeApplicationNode(provider, position, false)];
          existingIds.add(provider.id);
          cursor = position;
        }
        const byProvider = new Map<string, DiscoverInterfaceNode[]>();
        for (const iface of interfaces) {
          if (existingIds.has(iface.id)) continue;
          if (!byProvider.has(iface.providerId)) byProvider.set(iface.providerId, []);
          byProvider.get(iface.providerId)!.push(iface);
        }
        for (const [providerId, ifaces] of byProvider) {
          next = placeProviderInterfaces(next, providerId, ifaces);
        }
        return next;
      });

      setEdgeMeta((current) => {
        const existingIds = new Set(current.map((e) => e.id));
        return [...current, ...edges.filter((e) => !existingIds.has(e.id))];
      });
    },
    [ensureAppInterfaces, makeApplicationNode, placeProviderInterfaces],
  );

  const revealInterfaceDependencies = useCallback(
    async (ifaceId: string) => {
      let fs = interfaceFactSheetCache.current.get(ifaceId);
      if (!fs || !fs.relInterfaceToConsumerApplication || !fs.relInterfaceToProviderApplication) {
        const fetched = await fetchInterfaceDependencies(ifaceId);
        if (fetched) {
          cacheInterfaceFactSheet(fetched);
          fs = interfaceFactSheetCache.current.get(ifaceId);
        }
      }
      if (!fs) return;
      const { consumers, edges: newEdges } = toInterfaceConsumers(fs);
      const provider = toInterfaceProvider(fs);

      setNodes((current) => {
        let next = current;
        const existingIds = new Set(next.map((n) => n.id));
        const ifaceAnchor = () => {
          const byId = new Map(next.map((n) => [n.id, n]));
          const iface = byId.get(ifaceId);
          return iface ? absolutePosition(iface, byId) : { x: 0, y: 0 };
        };
        if (provider && !existingIds.has(provider.id)) {
          const position = placeNewApplicationNode(ifaceAnchor(), "left", boxesOf(next));
          next = [...next, makeApplicationNode(provider, position, false)];
          existingIds.add(provider.id);
          interfaceProviderRef.current.set(ifaceId, provider.id);
        }
        const missingConsumers = consumers.filter((c) => !existingIds.has(c.id));
        if (missingConsumers.length === 0) return next;
        let cursor = ifaceAnchor();
        const added: Node[] = [];
        for (const c of missingConsumers) {
          const position = placeNewApplicationNode(cursor, "right", boxesOf([...next, ...added]));
          added.push(makeApplicationNode(c, position, false));
          cursor = position;
        }
        return [...next, ...added];
      });

      setEdgeMeta((current) => {
        const existingIds = new Set(current.map((e) => e.id));
        return [...current, ...newEdges.filter((e) => !existingIds.has(e.id))];
      });
    },
    [cacheInterfaceFactSheet, makeApplicationNode],
  );

  const handleShowDependencies = useCallback(
    async (nodeId: string) => {
      setContextMenu(null);
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;
      if (node.type !== "application") {
        await revealInterfaceDependencies(nodeId);
        return;
      }
      const visibleIds = new Set(nodesRef.current.map((n) => n.id));
      const attached = new Set<string>();
      for (const [ifaceId, providerId] of interfaceProviderRef.current) {
        if (providerId === nodeId && visibleIds.has(ifaceId)) attached.add(ifaceId);
      }
      for (const e of edgeMetaRef.current) {
        if (e.consumerId === nodeId && visibleIds.has(e.interfaceId)) attached.add(e.interfaceId);
      }
      for (const ifaceId of attached) {
        await revealInterfaceDependencies(ifaceId);
      }
    },
    [revealInterfaceDependencies],
  );

  const handleHide = useCallback((nodeId: string) => {
    setContextMenu(null);
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    if (node.type === "application") {
      if (rootIdsRef.current.has(nodeId)) return; // roots only leave via their chip
      const ownedInterfaceIds = new Set(
        [...interfaceProviderRef.current.entries()]
          .filter(([, providerId]) => providerId === nodeId)
          .map(([ifaceId]) => ifaceId),
      );
      for (const id of ownedInterfaceIds) interfaceProviderRef.current.delete(id);
      setNodes((current) => current.filter((n) => n.id !== nodeId && !ownedInterfaceIds.has(n.id)));
      setEdgeMeta((current) =>
        current.filter((e) => e.consumerId !== nodeId && !ownedInterfaceIds.has(e.interfaceId)),
      );
    } else {
      interfaceProviderRef.current.delete(nodeId);
      setNodes((current) => current.filter((n) => n.id !== nodeId));
      setEdgeMeta((current) => current.filter((e) => e.interfaceId !== nodeId));
    }
  }, []);

  useImperativeHandle(ref, () => ({ addApplication, removeApplication }), [
    addApplication,
    removeApplication,
  ]);

  const edges = useMemo<Edge[]>(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const byInterface = new Map<string, DiscoverEdge[]>();
    for (const e of edgeMeta) {
      if (!byInterface.has(e.interfaceId)) byInterface.set(e.interfaceId, []);
      byInterface.get(e.interfaceId)!.push(e);
    }
    const result: Edge[] = [];
    for (const group of byInterface.values()) {
      group.forEach((e, i) => {
        const source = byId.get(e.consumerId);
        const target = byId.get(e.interfaceId);
        if (!source || !target) return;
        const sourceCenter = centerOf(source, byId);
        const targetCenter = centerOf(target, byId);
        const from = trimToBorder(sourceCenter, targetCenter, boxSizeOf(source));
        const to = trimToBorder(targetCenter, sourceCenter, boxSizeOf(target));
        result.push({
          id: e.id,
          source: e.consumerId,
          target: e.interfaceId,
          type: "graphEdge",
          data: {
            sx: from.x,
            sy: from.y,
            tx: to.x,
            ty: to.y,
            bend: i % 2 === 0 ? 1 : -1,
          } satisfies GraphEdgeData,
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-accent)" },
          style: { stroke: "var(--color-accent)" },
        });
      });
    }
    return result;
  }, [nodes, edgeMeta]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, n: Node) => {
      event.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const x = event.clientX - (rect?.left ?? 0);
      const y = event.clientY - (rect?.top ?? 0);
      const visibleIds = new Set(nodesRef.current.map((nn) => nn.id));

      if (n.type === "application") {
        const cached = appInterfacesCache.current.get(n.id);
        let inboundCount = -1;
        let outboundCount = -1;
        if (cached) {
          inboundCount = toInboundInterfaces(cached).filter((i) => !visibleIds.has(i.id)).length;
          outboundCount = toOutboundInterfacesAndProviders(cached).interfaces.filter(
            (i) => !visibleIds.has(i.id),
          ).length;
        }
        const hasAttachedVisible =
          [...interfaceProviderRef.current.entries()].some(
            ([ifaceId, providerId]) => providerId === n.id && visibleIds.has(ifaceId),
          ) ||
          edgeMetaRef.current.some((e) => e.consumerId === n.id && visibleIds.has(e.interfaceId));
        setContextMenu({
          nodeId: n.id,
          x,
          y,
          variant: "application",
          inboundCount,
          outboundCount,
          dependenciesCount: hasAttachedVisible ? 1 : 0,
          canHide: !rootIdsRef.current.has(n.id),
        });
      } else {
        const fs = interfaceFactSheetCache.current.get(n.id);
        let dependenciesCount = -1;
        if (fs && fs.relInterfaceToConsumerApplication && fs.relInterfaceToProviderApplication) {
          const missingConsumers = toInterfaceConsumers(fs).consumers.filter(
            (c) => !visibleIds.has(c.id),
          ).length;
          dependenciesCount = missingConsumers;
        }
        setContextMenu({
          nodeId: n.id,
          x,
          y,
          variant: "interface",
          inboundCount: 0,
          outboundCount: 0,
          dependenciesCount,
          canHide: true,
        });
      }
    },
    [],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        onNodesChange={onNodesChange}
        onNodeContextMenu={onNodeContextMenu}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
      <NodeContextMenu
        target={contextMenu}
        onClose={() => setContextMenu(null)}
        onShowInterfacesInbound={handleShowInterfacesInbound}
        onShowInterfacesOutbound={handleShowInterfacesOutbound}
        onShowDependencies={handleShowDependencies}
        onHide={handleHide}
      />
    </div>
  );
});

export default DiscoverGraph;

import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

/** Fixed footprint of an Application rectangle — kept constant (no
 * user-configurable width, unlike `/depgraph`'s card) so the polar/overlap
 * math below never has to special-case a resized node. */
export const APP_NODE_WIDTH = 200;
export const APP_NODE_HEIGHT = 60;
export const INTERFACE_NODE_SIZE = 20;

/** Root Application rectangles have no known relations between them until
 * expanded — there is nothing for a hub-and-spoke "radial" layout to be
 * radial about yet, so the one-time initial layout just packs them without
 * overlap (`elk.algorithm: "box"`). Everything added afterward (interfaces,
 * revealed providers/consumers) is positioned locally, never through ELK. */
export async function layoutRootApplications(
  ids: string[],
): Promise<Map<string, { x: number; y: number }>> {
  const graph: ElkNode = {
    id: "root",
    children: ids.map((id) => ({ id, width: APP_NODE_WIDTH, height: APP_NODE_HEIGHT })),
    edges: [],
  };
  const result = await elk.layout(graph, {
    layoutOptions: { "elk.algorithm": "box", "elk.spacing.nodeNode": "60" },
  });
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of result.children ?? []) {
    if (typeof child.x === "number" && typeof child.y === "number") {
      positions.set(child.id, { x: child.x, y: child.y });
    }
  }
  return positions;
}

/** Evenly spaces `count` interface circles right on the provider rectangle's
 * top border — centers sit ON the border line (half the circle above it,
 * half overlapping the rectangle), not on a ring floating away from it.
 * Recomputed for a given provider every time its visible interface count
 * changes; no density cap in this first version (decision: no limit — many
 * interfaces will crowd/overlap along the same edge).
 *
 * Positions are relative to the provider's own top-left corner, not
 * absolute — callers set them as an xyflow child node (`parentId`), which is
 * what makes the circles move together with the rectangle when it's
 * dragged: xyflow renders/drags a child's on-screen position as
 * `parent.position + child.position` automatically, so nothing here (or in
 * the drag handler) needs to react to the provider moving. */
export function placeInterfacesAroundProvider(count: number): { x: number; y: number }[] {
  const margin = INTERFACE_NODE_SIZE;
  const usableWidth = APP_NODE_WIDTH - margin * 2;
  const y = -INTERFACE_NODE_SIZE / 2;
  if (count === 1) {
    return [{ x: APP_NODE_WIDTH / 2 - INTERFACE_NODE_SIZE / 2, y }];
  }
  const step = usableWidth / (count - 1);
  return Array.from({ length: count }, (_, i) => ({
    x: margin + i * step - INTERFACE_NODE_SIZE / 2,
    y,
  }));
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap = 20,
): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

/** Positions a newly revealed Application rectangle near the node that
 * caused its reveal (an interface circle, or another application), nudging
 * downward on overlap with any already-placed node — never touches ELK, so
 * existing positions (including manual drags) are never disturbed. */
export function placeNewApplicationNode(
  anchor: { x: number; y: number },
  direction: "left" | "right",
  existing: { x: number; y: number; width: number; height: number }[],
): { x: number; y: number } {
  const dx = direction === "right" ? APP_NODE_WIDTH + 80 : -(APP_NODE_WIDTH + 80);
  let candidate = { x: anchor.x + dx, y: anchor.y };
  const box = () => ({ ...candidate, width: APP_NODE_WIDTH, height: APP_NODE_HEIGHT });
  let guard = 0;
  while (existing.some((n) => rectsOverlap(box(), n)) && guard < 50) {
    candidate = { ...candidate, y: candidate.y + APP_NODE_HEIGHT + 30 };
    guard += 1;
  }
  return candidate;
}

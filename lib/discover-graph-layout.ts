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

/** Fixed horizontal gap between two interface slots along a provider's top
 * border (independent of how many slots end up used — no density cap in
 * this first version, decision: many interfaces just crowd/overlap). */
const INTERFACE_SLOT_STEP = INTERFACE_NODE_SIZE + 12;

/** Every interface circle's relative y — always the provider's top border,
 * never anything else. The single source of truth for that constant: used
 * both to place a newly revealed interface (`interfaceSlotPosition`) and,
 * in `DiscoverGraph`'s `onNodesChange`, to pin a dragged circle back onto
 * the line (x free, y locked) after every drag frame. */
export const INTERFACE_Y = -INTERFACE_NODE_SIZE / 2;

/** Position (relative to the provider's top-left corner) of interface
 * "slot" `slot` — a fixed, stable index, not a recomputed `i / count`
 * fraction. This is what lets already-visible interfaces keep their exact
 * place when siblings are added or removed: each interface keeps whichever
 * slot it was assigned (tracked by the caller, `DiscoverGraph`'s
 * `interfaceSlotRef`) for as long as it stays visible, instead of every
 * interface being repositioned whenever the provider's visible count
 * changes. Slot 0 sits centered on the top border; further slots extend
 * outward left/right of it. Purely the initial placement — once revealed,
 * the user can drag a circle anywhere along the same line (see `INTERFACE_Y`
 * above), independently of its slot. */
export function interfaceSlotPosition(slot: number): { x: number; y: number } {
  const centerX = APP_NODE_WIDTH / 2;
  // 0, 1, -1, 2, -2, ... so new slots alternate sides around the center
  // instead of drifting off in one direction only.
  const offsetIndex = Math.ceil(slot / 2) * (slot % 2 === 0 ? -1 : 1);
  return {
    x: centerX + offsetIndex * INTERFACE_SLOT_STEP - INTERFACE_NODE_SIZE / 2,
    y: INTERFACE_Y,
  };
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

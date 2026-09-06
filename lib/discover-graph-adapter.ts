import type {
  ApplicationInterfacesNode,
  InterfaceNode,
} from "./atom-api";
import type { DiscoverApplicationNode, DiscoverEdge, DiscoverInterfaceNode } from "./types";

/** `managerName` is never known from these GraphQL shapes (the Interface
 * queries don't carry it) — callers resolve it separately from the
 * already-loaded `Application[]` catalogue and patch it in. */
function toApplicationNode(factSheet: {
  id: string;
  name: string | null;
  externalId?: { externalId: string } | null;
}): DiscoverApplicationNode {
  return {
    kind: "application",
    id: factSheet.id,
    externalId: factSheet.externalId?.externalId ?? null,
    name: factSheet.name ?? factSheet.id,
    managerName: null,
  };
}

function toInterfaceNode(iface: InterfaceNode, providerId: string): DiscoverInterfaceNode {
  return {
    kind: "interface",
    id: iface.id,
    name: iface.name,
    protocol: iface.protocol,
    providerId,
  };
}

/** *Show Interfaces Inbound* — circles only, for the interfaces this
 * application provides. Filters out any edge with an incomplete FactSheet
 * (missing/malformed LeanIX data) rather than throwing. */
export function toInboundInterfaces(node: ApplicationInterfacesNode): DiscoverInterfaceNode[] {
  const edges = node.relProviderApplicationToInterface?.edges ?? [];
  return edges
    .map((e) => e.node.factSheet)
    .filter((iface): iface is InterfaceNode => !!iface)
    .map((iface) => toInterfaceNode(iface, node.id));
}

/** *Show Interfaces Outbound* — the interfaces this application consumes,
 * plus their (possibly not-yet-visible) provider applications and the
 * consumer→interface edges. */
export function toOutboundInterfacesAndProviders(node: ApplicationInterfacesNode): {
  interfaces: DiscoverInterfaceNode[];
  providers: DiscoverApplicationNode[];
  edges: DiscoverEdge[];
} {
  const interfaces: DiscoverInterfaceNode[] = [];
  const providers: DiscoverApplicationNode[] = [];
  const edges: DiscoverEdge[] = [];

  for (const edge of node.relConsumerApplicationToInterface?.edges ?? []) {
    const iface = edge.node.factSheet;
    if (!iface) continue;
    const providerFactSheet = iface.relInterfaceToProviderApplication?.edges?.[0]?.node?.factSheet;
    if (!providerFactSheet) continue;
    interfaces.push(toInterfaceNode(iface, providerFactSheet.id));
    providers.push(toApplicationNode(providerFactSheet));
    edges.push({
      id: `${node.id}::${iface.id}`,
      consumerId: node.id,
      interfaceId: iface.id,
      interfacetype: edge.node.interfacetype,
      frequency: edge.node.frequency,
    });
  }

  return { interfaces, providers, edges };
}

/** Consumers of an already-visible Interface, for *Show dependencies* on a
 * circle — from either the provider-side query (nested consumers already
 * present) or a dedicated `fetchInterfaceDependencies` call. */
export function toInterfaceConsumers(iface: InterfaceNode): {
  consumers: DiscoverApplicationNode[];
  edges: DiscoverEdge[];
} {
  const consumers: DiscoverApplicationNode[] = [];
  const edges: DiscoverEdge[] = [];

  for (const edge of iface.relInterfaceToConsumerApplication?.edges ?? []) {
    const factSheet = edge.node.factSheet;
    if (!factSheet) continue;
    consumers.push(toApplicationNode(factSheet));
    edges.push({
      id: `${factSheet.id}::${iface.id}`,
      consumerId: factSheet.id,
      interfaceId: iface.id,
      interfacetype: edge.node.interfacetype,
      frequency: edge.node.frequency,
    });
  }

  return { consumers, edges };
}

/** The provider of an already-visible Interface, for *Show dependencies* on
 * a circle discovered via a consumer (which doesn't need this — its provider
 * was already revealed) or completed via `fetchInterfaceDependencies`. */
export function toInterfaceProvider(iface: InterfaceNode): DiscoverApplicationNode | null {
  const factSheet = iface.relInterfaceToProviderApplication?.edges?.[0]?.node?.factSheet;
  return factSheet ? toApplicationNode(factSheet) : null;
}

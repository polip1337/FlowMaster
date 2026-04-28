import type { T1ClusterTopology } from "../../data/topologies/types";
import { createT1Node } from "./t1Factory";
import { getT1Capacity } from "./t1Logic";
import { edgeKey, type T1EdgeMap } from "./T1Edge";
import type { T1Node } from "./T1Node";
import { T1NodeState } from "./T1Types";

function computeUnlockDepthMap(defs: T1ClusterTopology["nodes"]): Map<number, number> {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const depths = new Map<number, number>();

  const maxDepth = (id: number, visiting: Set<number>): number => {
    if (visiting.has(id)) {
      return 0;
    }
    if (depths.has(id)) {
      return depths.get(id)!;
    }
    visiting.add(id);
    const def = byId.get(id);
    let d = 0;
    for (const p of def?.unlockAfter ?? []) {
      d = Math.max(d, maxDepth(p, visiting) + 1);
    }
    visiting.delete(id);
    depths.set(id, d);
    return d;
  };

  for (const d of defs) {
    maxDepth(d.id, new Set());
  }
  return depths;
}

function rebuildAdjacency(nodes: Map<number, T1Node>, edges: T1EdgeMap): void {
  for (const node of nodes.values()) {
    node.outgoingEdges = [];
    node.incomingEdges = [];
  }

  for (const edge of edges.values()) {
    nodes.get(edge.fromId)?.outgoingEdges.push(edge.toId);
    nodes.get(edge.toId)?.incomingEdges.push(edge.fromId);
  }
}

export interface T2ClusterInstance {
  nodes: Map<number, T1Node>;
  edges: T1EdgeMap;
  latentT1NodeIds: number[];
}

/**
 * Builds T1 nodes and directed edges for one T2 cluster from static topology data.
 * Source T1 nodes start UNSEALED; all others LOCKED. Undirected defs become reciprocal edges.
 */
export function createT2Cluster(topology: T1ClusterTopology, t2NodeId: string): T2ClusterInstance {
  void t2NodeId;
  const nodes = new Map<number, T1Node>();
  const depthById = computeUnlockDepthMap(topology.nodes);

  for (const def of topology.nodes) {
    const node = createT1Node(def.id, def.type, def.isSourceNode, topology.baseCapacityPerNode);
    node.capacity = getT1Capacity(topology.baseCapacityPerNode, node.quality);
    node.predecessorIds = [...def.unlockAfter];
    node.unlockDepth = depthById.get(def.id) ?? 0;
    if (def.isSourceNode) {
      node.state = T1NodeState.UNSEALED;
    }
    nodes.set(def.id, node);
  }

  for (const special of topology.specialNodes ?? []) {
    const node = nodes.get(special.id);
    if (node && special.resonanceMultiplier != null) {
      node.resonanceMultiplier = special.resonanceMultiplier;
    }
  }

  const edges: T1EdgeMap = new Map();

  const addDirected = (fromId: number, toId: number, weight: number): void => {
    const key = edgeKey(fromId, toId);
    if (edges.has(key)) {
      return;
    }
    edges.set(key, {
      fromId,
      toId,
      weight: Math.round(weight),
      isLocked: false
    });
  };

  for (const e of topology.edges) {
    if (topology.directedEdges) {
      addDirected(e.from, e.to, e.defaultWeight);
    } else {
      addDirected(e.from, e.to, e.defaultWeight);
      addDirected(e.to, e.from, e.defaultWeight);
    }
  }

  for (const [slot, nodeId] of Object.entries(topology.meridianIoMap)) {
    const node = nodes.get(nodeId);
    if (node) {
      node.meridianSlotId = slot;
    }
  }

  rebuildAdjacency(nodes, edges);

  return {
    nodes,
    edges,
    latentT1NodeIds: [...(topology.latentT1NodeIds ?? [])]
  };
}

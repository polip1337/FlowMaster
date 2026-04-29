import type { T1ClusterTopology } from "../../data/topologies/types";
import { createT1Node } from "./t1Factory";
import { getT1Capacity } from "./t1Logic";
import { edgeKey, type T1EdgeMap } from "./T1Edge";
import type { T1Node } from "./T1Node";
import { T1NodeState, T1NodeType } from "./T1Types";

function isIoType(t: T1NodeType): boolean {
  return t === T1NodeType.IO_IN || t === T1NodeType.IO_OUT || t === T1NodeType.IO_BIDIR;
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

  // Atlas S-007 unlock order: unlock sequence is derived from graph distance to
  // the nearest I/O node(s), not from a handwritten unlock DAG.
  const adjacencyUndirected: Record<number, number[]> = {};
  for (const e of topology.edges) {
    (adjacencyUndirected[e.from] ??= []).push(e.to);
    (adjacencyUndirected[e.to] ??= []).push(e.from);
  }

  const ioIds = topology.nodes.filter((d) => isIoType(d.type)).map((d) => d.id);
  const distById = new Map<number, number>();
  for (const d of topology.nodes) distById.set(d.id, Number.POSITIVE_INFINITY);
  const q: number[] = [];
  for (const id of ioIds) {
    distById.set(id, 0);
    q.push(id);
  }

  while (q.length > 0) {
    const cur = q.shift()!;
    const curDist = distById.get(cur) ?? Number.POSITIVE_INFINITY;
    for (const nb of adjacencyUndirected[cur] ?? []) {
      const nextDist = curDist + 1;
      const prev = distById.get(nb) ?? Number.POSITIVE_INFINITY;
      if (nextDist < prev) {
        distById.set(nb, nextDist);
        q.push(nb);
      }
    }
  }

  for (const def of topology.nodes) {
    const node = createT1Node(def.id, def.type, def.isSourceNode, topology.baseCapacityPerNode);
    node.capacity = getT1Capacity(topology.baseCapacityPerNode, node.quality);

    const d = distById.get(def.id) ?? Number.POSITIVE_INFINITY;
    node.unlockDepth = Number.isFinite(d) ? d : 999;

    // Each node depends on exactly one predecessor from the previous distance layer.
    // This produces a distance-ordered unlock sweep while keeping unlock gating simple.
    if (d === 0) {
      node.predecessorIds = [];
    } else {
      const candidates = (adjacencyUndirected[def.id] ?? [])
        .filter((nb) => (distById.get(nb) ?? Number.POSITIVE_INFINITY) === d - 1);
      const pick = candidates.length > 0 ? candidates.sort((a, b) => a - b)[0] : null;
      node.predecessorIds = pick != null ? [pick] : [];
    }

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

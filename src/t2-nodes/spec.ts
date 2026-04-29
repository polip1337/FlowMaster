import { PROJECTION_LINKS } from "../../nodes.ts";
import type { T1ClusterTopology } from "../data/topologies/types.ts";
import { getTopologyNodeDefinitions } from "../data/topologies/node-definitions.ts";

export interface Tier2NodeSpec {
  uiId: string;
  topology: T1ClusterTopology;
  schema: {
    nodeDefinitions: any[];
    initialNodePositions: Record<number, { x: number; y: number }>;
    nodeEdges: any[];
    projectionLinks: any[];
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function buildNodeSchema(
  topology: T1ClusterTopology,
  initialNodePositions: Record<number, { x: number; y: number }>
) {
  const topoNodeById = new Map(topology.nodes.map((n) => [n.id, n]));
  const nodeDefinitions = getTopologyNodeDefinitions(topology)
    .map((n: any) => {
      const topoNode = topoNodeById.get(n.id);
      return {
        ...deepClone(n),
        nodeType: String(topoNode?.type ?? "INTERNAL"),
        isSourceNode: Boolean(topoNode?.isSourceNode)
      };
    });

  const nodeEdges: any[] = [];
  const addEdge = (from: number, to: number, weight: number) => {
    nodeEdges.push({
      from,
      to,
      flow: 0,
      key: `${from}_${to}`,
      weight: weight ?? 0,
      isScarred: false,
      scarPenalty: 0,
      scarHealingCostShen: 50000
    });
  };
  for (const e of topology.edges) {
    if (topology.directedEdges) addEdge(e.from, e.to, e.defaultWeight);
    else {
      addEdge(e.from, e.to, e.defaultWeight);
      addEdge(e.to, e.from, e.defaultWeight);
    }
  }

  return {
    nodeDefinitions,
    initialNodePositions: deepClone(initialNodePositions),
    nodeEdges,
    projectionLinks: deepClone(PROJECTION_LINKS)
  };
}


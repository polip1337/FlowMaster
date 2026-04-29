import { NODE_DEFINITIONS } from "../../../nodes.ts";
import type { T1ClusterTopology } from "./types";

export type TopologyNodeDefinition = {
  id: number;
  name: string;
  unlocked: boolean;
  si: number;
  unlockCost: number;
  [key: string]: unknown;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function getTopologyNodeDefinitions(topology: T1ClusterTopology): TopologyNodeDefinition[] {
  if (topology.nodeDefinitions && topology.nodeDefinitions.length > 0) {
    return deepClone(topology.nodeDefinitions);
  }

  const topologyNodeIds = new Set(topology.nodes.map((n) => n.id));
  return NODE_DEFINITIONS
    .filter((node: any) => topologyNodeIds.has(node.id))
    .map((node: any) => deepClone(node));
}

export function withTopologyNodeDefinitions(topology: T1ClusterTopology): T1ClusterTopology {
  return {
    ...topology,
    nodeDefinitions: getTopologyNodeDefinitions(topology)
  };
}

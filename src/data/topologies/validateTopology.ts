import type { T1ClusterTopology } from "./types";
import { T1NodeType } from "../../core/nodes/T1Types";

export interface TopologyValidationError {
  topologyId: string;
  message: string;
}

function isIoType(t: T1NodeType): boolean {
  return t === T1NodeType.IO_IN || t === T1NodeType.IO_OUT || t === T1NodeType.IO_BIDIR;
}

/**
 * S-007 — Static integrity checks for authored T1 cluster topologies.
 */
export function validateTopology(t: T1ClusterTopology): TopologyValidationError[] {
  const errors: TopologyValidationError[] = [];
  const idSet = new Set<number>();
  let sourceCount = 0;

  for (const n of t.nodes) {
    if (idSet.has(n.id)) {
      errors.push({ topologyId: t.id, message: `Duplicate node id ${n.id}` });
    } else {
      idSet.add(n.id);
    }
    if (n.isSourceNode) {
      sourceCount += 1;
    }
    for (const pred of n.unlockAfter) {
      if (!t.nodes.some((x) => x.id === pred)) {
        errors.push({
          topologyId: t.id,
          message: `Node ${n.id} unlockAfter references unknown id ${pred}`
        });
      }
    }
  }

  if (sourceCount > 1) {
    errors.push({ topologyId: t.id, message: "More than one isSourceNode=true" });
  }

  for (const [slot, nodeId] of Object.entries(t.meridianIoMap)) {
    if (!idSet.has(nodeId)) {
      errors.push({ topologyId: t.id, message: `meridianIoMap.${slot} → unknown node ${nodeId}` });
      continue;
    }
    const node = t.nodes.find((x) => x.id === nodeId);
    if (node && !isIoType(node.type)) {
      errors.push({
        topologyId: t.id,
        message: `meridianIoMap.${slot} → node ${nodeId} is ${node.type}, expected IO type`
      });
    }
  }

  for (const e of t.edges) {
    if (!idSet.has(e.from) || !idSet.has(e.to)) {
      errors.push({
        topologyId: t.id,
        message: `Edge ${e.from}→${e.to} references unknown node id`
      });
    }
  }
  for (const e of t.potentialExtraEdges ?? []) {
    if (!idSet.has(e.from) || !idSet.has(e.to)) {
      errors.push({
        topologyId: t.id,
        message: `potentialExtraEdge ${e.from}→${e.to} references unknown node id`
      });
    }
  }

  const checkSpecial = (label: keyof T1ClusterTopology, id: number | undefined): void => {
    if (id === undefined) {
      return;
    }
    if (!idSet.has(id)) {
      errors.push({ topologyId: t.id, message: `${String(label)} references unknown node ${id}` });
    }
  };

  checkSpecial("yangQiConversionNode", t.yangQiConversionNode);
  checkSpecial("passiveAbsorberNode", t.passiveAbsorberNode);
  checkSpecial("stabilizationReserveNode", t.stabilizationReserveNode);
  checkSpecial("realmCapNode", t.realmCapNode);

  if (t.nodeCount !== t.nodes.length) {
    errors.push({
      topologyId: t.id,
      message: `nodeCount ${t.nodeCount} !== nodes.length ${t.nodes.length}`
    });
  }

  return errors;
}

export function validateAllTopologies(topologies: Record<string, T1ClusterTopology>): TopologyValidationError[] {
  const all: TopologyValidationError[] = [];
  for (const top of Object.values(topologies)) {
    all.push(...validateTopology(top));
  }
  return all;
}

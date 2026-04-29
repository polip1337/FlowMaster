import { T1_BASE_SOURCE_RATE, T1_MAX_FLOW_RATE, T1_SECONDARY_SOURCE_RATE } from "../constants";
import { EnergyType, addPools, emptyPool, scaledPool, subtractPoolsNonNegative, totalEnergy } from "../energy/EnergyType";
import { clamp, qualityMultiplier, qualityRefinementThreshold } from "../../utils/math";
import { sanitizeEnergyPool } from "../simulation/guards";
import type { T1Node } from "./T1Node";
import type { T1EdgeMap } from "./T1Edge";
import { T1NodeState, T1NodeType } from "./T1Types";

export interface FlowResult {
  fromId: number;
  toId: number;
  amount: ReturnType<typeof emptyPool>;
}

export interface T1StateChangeEvent {
  nodeId: number;
  from: T1NodeState;
  to: T1NodeState;
}

export function getT1Capacity(baseCapacity: number, quality: number): number {
  return baseCapacity * qualityMultiplier(quality);
}

export function computeT1Flows(
  nodes: Map<number, T1Node>,
  edges: T1EdgeMap,
  reservedByNodeId?: Map<number, ReturnType<typeof emptyPool>>
): FlowResult[] {
  const flows: FlowResult[] = [];
  const snapshotTotalByNode = new Map<number, number>();
  const snapshotPoolByNode = new Map<number, ReturnType<typeof emptyPool>>();
  const remainingCapacityByNode = new Map<number, number>();

  for (const [id, node] of nodes) {
    const snap = { ...node.energy };
    const res = reservedByNodeId?.get(id) ?? emptyPool();
    const availPool = subtractPoolsNonNegative(snap, res);
    const availTotal = totalEnergy(availPool);
    snapshotTotalByNode.set(id, availTotal);
    snapshotPoolByNode.set(id, availTotal > 0 ? scaledPool(availPool, 1 / availTotal) : emptyPool());
    remainingCapacityByNode.set(id, Math.max(0, node.capacity - totalEnergy(node.energy)));
  }

  for (const edge of edges.values()) {
    if (edge.isLocked) {
      continue;
    }

    const from = nodes.get(edge.fromId);
    const to = nodes.get(edge.toId);
    if (!from || !to || to.state === T1NodeState.LOCKED) {
      continue;
    }

    const sourceTotal = snapshotTotalByNode.get(edge.fromId) ?? 0;
    if (sourceTotal <= 0) {
      continue;
    }

    const requestedFlow = sourceTotal * T1_MAX_FLOW_RATE * (clamp(edge.weight, 0, 100) / 100);
    const destRemaining = remainingCapacityByNode.get(edge.toId) ?? 0;
    const actualFlow = Math.min(requestedFlow, destRemaining);

    if (actualFlow <= 0) {
      continue;
    }

    const ratioPool = snapshotPoolByNode.get(edge.fromId) ?? emptyPool();
    const amount = scaledPool(ratioPool, actualFlow);

    flows.push({
      fromId: edge.fromId,
      toId: edge.toId,
      amount
    });

    remainingCapacityByNode.set(edge.toId, Math.max(0, destRemaining - actualFlow));
  }

  // S-015 — cap total outgoing drain per source node to 1% of start-of-tick total energy (not reserved-adjusted).
  const startTotals = new Map<number, number>();
  for (const [id, node] of nodes) {
    startTotals.set(id, totalEnergy(node.energy));
  }
  const byFrom = new Map<number, FlowResult[]>();
  for (const f of flows) {
    if (!byFrom.has(f.fromId)) {
      byFrom.set(f.fromId, []);
    }
    byFrom.get(f.fromId)!.push(f);
  }
  for (const [fromId, group] of byFrom) {
    const startTot = startTotals.get(fromId) ?? 0;
    const maxDrain = startTot * T1_MAX_FLOW_RATE;
    const totalDrain = group.reduce((sum, f) => sum + totalEnergy(f.amount), 0);
    if (totalDrain > maxDrain && maxDrain >= 0) {
      const scale = maxDrain / totalDrain;
      for (const f of group) {
        f.amount = scaledPool(f.amount, scale);
      }
    }
  }

  return flows;
}

export function applyT1Flows(nodes: Map<number, T1Node>, flows: FlowResult[]): void {
  for (const flow of flows) {
    const source = nodes.get(flow.fromId);
    const dest = nodes.get(flow.toId);
    if (!source || !dest) {
      continue;
    }

    const amount = sanitizeEnergyPool(flow.amount);
    for (const type of Object.values(EnergyType)) {
      source.energy[type] = Math.max(0, source.energy[type] - amount[type]);
    }

    dest.energy = sanitizeEnergyPool(addPools(dest.energy, amount));
    source.lifetimeFlowOut += totalEnergy(flow.amount);
  }
}

export function generateSourceEnergy(node: T1Node): ReturnType<typeof emptyPool> {
  if (node.isSourceNode && node.type === T1NodeType.INTERNAL) {
    return {
      ...emptyPool(),
      [EnergyType.Qi]: T1_BASE_SOURCE_RATE * qualityMultiplier(node.quality)
    };
  }

  if (node.state === T1NodeState.ACTIVE && node.type === T1NodeType.INTERNAL) {
    return {
      ...emptyPool(),
      [EnergyType.Qi]: T1_SECONDARY_SOURCE_RATE * node.quality
    };
  }

  return emptyPool();
}

export function updateT1States(nodes: Map<number, T1Node>): T1StateChangeEvent[] {
  const events: T1StateChangeEvent[] = [];

  for (const node of nodes.values()) {
    if (node.state === T1NodeState.LOCKED) {
      const predecessorsReady =
        node.predecessorIds.length > 0
          ? node.predecessorIds.every((predId) => {
              const predecessor = nodes.get(predId);
              return predecessor?.state === T1NodeState.ACTIVE;
            })
          : node.incomingEdges.every((predId) => {
              const predecessor = nodes.get(predId);
              return predecessor?.state === T1NodeState.ACTIVE;
            });

      if (predecessorsReady) {
        events.push({
          nodeId: node.id,
          from: T1NodeState.LOCKED,
          to: T1NodeState.UNSEALED
        });
        node.state = T1NodeState.UNSEALED;
      }
      continue;
    }

    if (node.state === T1NodeState.UNSEALED) {
      const activationThreshold = node.capacity * 0.3;
      if (totalEnergy(node.energy) >= activationThreshold) {
        events.push({
          nodeId: node.id,
          from: T1NodeState.UNSEALED,
          to: T1NodeState.ACTIVE
        });
        node.state = T1NodeState.ACTIVE;
      }
    }
  }

  return events;
}

export function updateT1Refinement(node: T1Node, flowedThisTick: number, qualityRateMultiplier = 1): void {
  node.refinementPoints += (flowedThisTick / 1000) * qualityRateMultiplier;

  const baseCapacity = node.capacity / qualityMultiplier(node.quality);

  while (node.quality < 10) {
    const threshold = qualityRefinementThreshold(node.quality);
    if (threshold <= 0 || node.refinementPoints < threshold) {
      break;
    }

    node.refinementPoints -= threshold;
    node.quality += 1;
  }

  node.capacity = getT1Capacity(baseCapacity, node.quality);
}

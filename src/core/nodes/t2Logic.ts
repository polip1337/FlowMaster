import { ENERGY_MODIFIERS } from "../energy/energyModifiers";
import { EnergyType, emptyPool, totalEnergy } from "../energy/EnergyType";
import { clamp, resonanceQualityFactor } from "../../utils/math";
import type { UpgradeCondition } from "../../data/conditions";
import { T2_NODE_DEFS_BY_ID } from "../../data/t2NodeDefs";
import type { T2Node } from "./T2Node";
import { T1NodeState } from "./T1Types";
import { T2NodeType } from "./T2Types";

const T2_RESONANCE_TYPE_MULTIPLIER: Record<T2NodeType, number> = {
  [T2NodeType.CHAKRA]: 1.0,
  [T2NodeType.JOINT]: 1.0
};

export function getT2EnergyPool(node: T2Node): ReturnType<typeof emptyPool> {
  const pool = emptyPool();

  for (const t1Node of node.t1Nodes.values()) {
    for (const type of Object.values(EnergyType)) {
      pool[type] += t1Node.energy[type];
    }
  }

  return pool;
}

export function getT2TotalEnergy(node: T2Node): number {
  return totalEnergy(getT2EnergyPool(node));
}

export function getT2Capacity(node: T2Node): number {
  let capacity = 0;
  for (const t1Node of node.t1Nodes.values()) {
    capacity += t1Node.capacity;
  }
  return capacity;
}

export function getT2Pressure(node: T2Node): number {
  const capacity = getT2Capacity(node);
  if (capacity <= 0) {
    return 0;
  }
  return clamp(getT2TotalEnergy(node) / capacity, 0, 1);
}

export function getT2EnergyOfType(node: T2Node, type: EnergyType): number {
  let sum = 0;
  for (const t1 of node.t1Nodes.values()) {
    sum += t1.energy[type];
  }
  return sum;
}

/**
 * TASK-082 — non-affinity types above 60% of C_T2 add export pressure for meridian IO.
 */
export function getNonAffinityOverflowBoost(node: T2Node): number {
  const def = T2_NODE_DEFS_BY_ID.get(node.id);
  if (!def) {
    return 0;
  }
  const C = getT2Capacity(node);
  if (C <= 0) {
    return 0;
  }
  const cap60 = 0.6 * C;
  let maxBoost = 0;
  for (const t of Object.values(EnergyType)) {
    if (t === def.primaryAffinity || t === def.secondaryAffinity) {
      continue;
    }
    const e = getT2EnergyOfType(node, t);
    if (e <= cap60) {
      continue;
    }
    const p = (e / cap60 - 1) * 0.5;
    maxBoost = Math.max(maxBoost, p);
  }
  return clamp(maxBoost, 0, 0.95);
}

/**
 * S-010 — T2 `REFINED` is applied in `simulationTick` when rank ≥ 5 and every T1 in the cluster
 * has quality ≥ 8; all T1 `resonanceMultiplier` values are then multiplied by 1.15 once
 * (`refinedResonanceBonusApplied` on the T2 node prevents double application).
 */

/** TASK-082 + bidir routing — aggregate fill plus non-affinity export pressure. */
export function getT2PressureForRouting(node: T2Node): number {
  return clamp(getT2Pressure(node) + getNonAffinityOverflowBoost(node), 0, 1.35);
}

export function getT2Resonance(node: T2Node): number {
  if (node.nodeDamageState.shattered) {
    return 0;
  }
  const t1Count = node.t1Nodes.size;
  if (t1Count === 0) {
    return 0;
  }

  const activeNodes = [...node.t1Nodes.values()].filter((t1Node) => t1Node.state === T1NodeState.ACTIVE);
  if (activeNodes.length === 0) {
    return 0;
  }

  const activeRatio = activeNodes.length / t1Count;
  const qualityFactor = resonanceQualityFactor(activeNodes.map((t1Node) => t1Node.quality));
  const multiplierAvg =
    activeNodes.reduce((sum, nodeRef) => sum + nodeRef.resonanceMultiplier, 0) / activeNodes.length;
  const typeMultiplier = T2_RESONANCE_TYPE_MULTIPLIER[node.type];

  const resonance = activeRatio * qualityFactor * multiplierAvg * typeMultiplier;
  if (node.nodeDamageState.cracked) {
    return Math.min(0.5, resonance);
  }
  return resonance;
}

export function computeStandardUpgradeRequirements(node: T2Node): UpgradeCondition[] {
  return [
    {
      type: "energy_accumulated",
      scope: "node",
      energyType: EnergyType.Qi,
      minAmount: 500 * node.rank * node.level
    },
    {
      type: "lifetime_energy_generated",
      scope: "node",
      minAmount: 2000 * node.rank * node.rank * node.level
    },
    {
      type: "meridian_quality",
      average: true,
      minQuality: node.rank + node.level / 3
    }
  ];
}

export function updateSealingProgress(
  node: T2Node,
  arrivedThisTick: ReturnType<typeof emptyPool>,
  baseThreshold: number,
  unlockEfficiencyBonus: number
): boolean {
  const weightedQE = Object.values(EnergyType).reduce((sum, type) => {
    return sum + arrivedThisTick[type] * ENERGY_MODIFIERS[type].unlockWeight;
  }, 0);

  const denominator = Math.max(1e-9, baseThreshold * (1 - clamp(unlockEfficiencyBonus, 0, 0.99)));
  node.sealingProgress = clamp(node.sealingProgress + weightedQE / denominator, 0, 1);

  return node.sealingProgress >= 1;
}

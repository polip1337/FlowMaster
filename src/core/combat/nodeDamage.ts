import { DELTA_T } from "../constants";
import { EnergyType } from "../energy/EnergyType";
import type { T2Node } from "../nodes/T2Node";
import { T1NodeState } from "../nodes/T1Types";
import { T2NodeState } from "../nodes/T2Types";
import type { GameState } from "../../state/GameState";

const BINDU_NODE_ID = "BINDU";
const BINDU_RESERVE_T1_ID = 11;
const SHATTER_STABILIZATION_COST = 1;
const PASSIVE_REPAIR_FACTOR = 0.001;
const ACTIVE_REPAIR_MULTIPLIER = 10;
const ACTIVE_REPAIR_JING_DRAIN_PER_TICK = 0.1;
type HpThresholdDamagePhase = "hp30" | "hp10" | "auto";
type NodeContainer = Map<string, T2Node> | Pick<GameState, "t2Nodes">;

function resolveNodes(container: NodeContainer): Map<string, T2Node> {
  return container instanceof Map ? container : container.t2Nodes;
}

function activeNodes(nodes: Map<string, T2Node>): T2Node[] {
  return [...nodes.values()].filter((node) => {
    const activeState = node.state === T2NodeState.ACTIVE || node.state === T2NodeState.REFINED;
    return activeState && !node.nodeDamageState.shattered;
  });
}

function pickRandomNode(nodes: T2Node[], random: () => number): T2Node | null {
  if (nodes.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.min(nodes.length - 1, Math.floor(random() * nodes.length)));
  return nodes[index];
}

export function crackNode(node: T2Node): void {
  node.nodeDamageState.cracked = true;
  node.nodeDamageState.shattered = false;
  node.nodeDamageState.repairProgress = 0;
}

export function shatterNode(node: T2Node): void {
  node.nodeDamageState.cracked = false;
  node.nodeDamageState.shattered = true;
  node.nodeDamageState.repairProgress = 0;
  for (const t1 of node.t1Nodes.values()) {
    t1.state = T1NodeState.UNSEALED;
  }
}

export function getBinduReserve(container: NodeContainer): number {
  const t2Nodes = resolveNodes(container);
  const bindu = t2Nodes.get(BINDU_NODE_ID);
  const reserveNode = bindu?.t1Nodes.get(BINDU_RESERVE_T1_ID);
  if (!reserveNode) {
    return 0;
  }
  return Math.max(0, reserveNode.energy[EnergyType.Qi]);
}

export function spendBinduReserve(container: NodeContainer, amount: number): number {
  const t2Nodes = resolveNodes(container);
  const bindu = t2Nodes.get(BINDU_NODE_ID);
  const reserveNode = bindu?.t1Nodes.get(BINDU_RESERVE_T1_ID);
  if (!reserveNode || amount <= 0) {
    return 0;
  }
  const spent = Math.min(amount, reserveNode.energy[EnergyType.Qi]);
  reserveNode.energy[EnergyType.Qi] -= spent;
  return spent;
}

export function applyHpThresholdNodeDamageRolls(
  hpRatio: number,
  t2Nodes: Map<string, T2Node>,
  stabilizationUsed: boolean,
  random: () => number,
  phase: HpThresholdDamagePhase = "auto"
): { stabilizationUsed: boolean; cracked: boolean; shattered: boolean } {
  const active = activeNodes(t2Nodes);
  let didCrack = false;
  let didShatter = false;
  let nextStabilizationUsed = stabilizationUsed;

  const allowCrack = phase === "hp30" || phase === "auto";
  const allowShatter = phase === "hp10" || phase === "auto";

  if (allowCrack && hpRatio <= 0.3 && hpRatio > 0.1 && random() < 0.5) {
    const target = pickRandomNode(active, random);
    if (target) {
      crackNode(target);
      didCrack = true;
    }
  }

  if (allowShatter && hpRatio <= 0.1) {
    if (!nextStabilizationUsed && getBinduReserve(t2Nodes) >= SHATTER_STABILIZATION_COST) {
      spendBinduReserve(t2Nodes, SHATTER_STABILIZATION_COST);
      nextStabilizationUsed = true;
    } else if (random() < 0.7) {
      const target = pickRandomNode(active, random);
      if (target) {
        shatterNode(target);
        didShatter = true;
      }
    }
  }

  return { stabilizationUsed: nextStabilizationUsed, cracked: didCrack, shattered: didShatter };
}

function getNodeJing(node: T2Node): number {
  let jing = 0;
  for (const t1 of node.t1Nodes.values()) {
    jing += t1.energy[EnergyType.Jing];
  }
  return jing;
}

function drainBodyJing(t2Nodes: Map<string, T2Node>, amount: number): number {
  let remaining = Math.max(0, amount);
  if (remaining <= 0) {
    return 0;
  }
  const holders = [...t2Nodes.values()].flatMap((t2) => [...t2.t1Nodes.values()]);
  for (const t1 of holders) {
    if (remaining <= 0) {
      break;
    }
    const drained = Math.min(remaining, t1.energy[EnergyType.Jing]);
    t1.energy[EnergyType.Jing] -= drained;
    remaining -= drained;
  }
  return amount - remaining;
}

export function applyNodeRepairTick(
  t2Nodes: Map<string, T2Node>,
  meridianRepairRate: number,
  activeRepairNodeId: string | null
): void {
  for (const node of t2Nodes.values()) {
    if (!node.nodeDamageState.cracked && !node.nodeDamageState.shattered) {
      continue;
    }
    const cap = Math.max(1, node.t1Nodes.size > 0 ? [...node.t1Nodes.values()].reduce((s, t1) => s + t1.capacity, 0) : 1);
    const jingRatio = getNodeJing(node) / cap;
    let rate = Math.max(0, meridianRepairRate) * jingRatio * PASSIVE_REPAIR_FACTOR * DELTA_T;
    const isActiveRepair = activeRepairNodeId === node.id;
    if (isActiveRepair) {
      const drained = drainBodyJing(t2Nodes, ACTIVE_REPAIR_JING_DRAIN_PER_TICK);
      if (drained > 0) {
        rate *= ACTIVE_REPAIR_MULTIPLIER;
      }
    }
    node.nodeDamageState.repairProgress = Math.min(1, node.nodeDamageState.repairProgress + rate);
    if (node.nodeDamageState.repairProgress >= 1) {
      node.nodeDamageState.cracked = false;
      node.nodeDamageState.shattered = false;
      node.nodeDamageState.repairProgress = 0;
    }
  }
}

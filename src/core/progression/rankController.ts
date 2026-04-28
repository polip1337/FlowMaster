import { EnergyType } from "../energy/EnergyType";
import { qualityMultiplier } from "../../utils/math";
import type { GameState, ProgressionBreakthroughEvent } from "../../state/GameState";
import type { T2Node } from "../nodes/T2Node";
import { T2NodeState } from "../nodes/T2Types";
import { buildConditionState } from "./conditionSnapshot";
import { finalizeSuccessfulTribulation, isTribulationActive, triggerTribulation } from "./tribulationSystem";

const MAX_RANK = 9;

interface RankRequirement {
  jingCost: number;
  shenCost: number;
  minAverageMeridianQuality: number;
  minActiveNodes: number;
}

function getRankBreakthroughRequirements(currentRank: number): RankRequirement {
  return {
    jingCost: 1000 * currentRank * currentRank,
    shenCost: 500 * currentRank * currentRank,
    minAverageMeridianQuality: currentRank * 0.8,
    minActiveNodes: Math.min(24, 2 + currentRank * 2)
  };
}

function getBodyEnergyTypeAmount(state: GameState, type: EnergyType): number {
  let total = 0;
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      total += t1.energy[type];
    }
  }
  return total;
}

function spendBodyEnergyType(state: GameState, type: EnergyType, amount: number): boolean {
  let remaining = Math.max(0, amount);
  if (remaining <= 0) {
    return true;
  }

  const holders: { amount: number; t1: T2Node["t1Nodes"] extends Map<number, infer U> ? U : never }[] = [];
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      if (t1.energy[type] > 0) {
        holders.push({ amount: t1.energy[type], t1 });
      }
    }
  }

  holders.sort((a, b) => b.amount - a.amount);
  for (const holder of holders) {
    const drained = Math.min(holder.t1.energy[type], remaining);
    holder.t1.energy[type] -= drained;
    remaining -= drained;
    if (remaining <= 0) {
      return true;
    }
  }

  return false;
}

function canPassSahasraraRealmCap(state: GameState, node: T2Node): boolean {
  const sahasrara = state.t2Nodes.get("SAHASRARA");
  const sahasraraRank = sahasrara?.rank ?? 1;
  if (node.id === "SAHASRARA") {
    const requiredFlag = `dao_challenge:sahasrara:${node.rank + 1}`;
    return state.specialEventFlags.has(requiredFlag);
  }
  return node.rank + 1 <= sahasraraRank + 1;
}

function applyClusterQualityBreakthrough(node: T2Node): number {
  let boosted = 0;
  const qualityCap = Math.ceil(node.rank * 1.5);
  for (const t1 of node.t1Nodes.values()) {
    if (t1.quality >= qualityCap) {
      continue;
    }
    const baseCapacity = t1.capacity / qualityMultiplier(t1.quality);
    t1.quality += 1;
    t1.capacity = baseCapacity * qualityMultiplier(t1.quality);
    boosted += 1;
  }
  return boosted;
}

export function checkRankBreakthroughs(state: GameState): ProgressionBreakthroughEvent[] {
  const tickAfter = state.tick + 1;
  if (!state.immediateConditionCheck && tickAfter % 30 !== 0) {
    return [];
  }

  const conditionState = buildConditionState(state);
  const activeNodeCount = [...state.t2Nodes.values()].filter(
    (n) => n.state === T2NodeState.ACTIVE || n.state === T2NodeState.REFINED
  ).length;
  const events: ProgressionBreakthroughEvent[] = [];
  const pending = state.tribulation.pendingBreakthrough;
  if (pending) {
    const successFlag = `event:tribulation_success:${pending.nodeId}:${pending.toRank}`;
    const targetNode = state.t2Nodes.get(pending.nodeId);
    if (
      state.specialEventFlags.has(successFlag) &&
      targetNode &&
      targetNode.rank === pending.fromRank &&
      getBodyEnergyTypeAmount(state, EnergyType.Jing) >= pending.jingCost &&
      getBodyEnergyTypeAmount(state, EnergyType.Shen) >= pending.shenCost &&
      spendBodyEnergyType(state, EnergyType.Jing, pending.jingCost) &&
      spendBodyEnergyType(state, EnergyType.Shen, pending.shenCost)
    ) {
      targetNode.rank += 1;
      targetNode.level = 1;
      const qualityNodesBoosted = applyClusterQualityBreakthrough(targetNode);
      events.push({
        nodeId: targetNode.id,
        fromRank: pending.fromRank,
        toRank: targetNode.rank,
        qualityNodesBoosted,
        tick: tickAfter
      });
      finalizeSuccessfulTribulation(state);
    }
    state.specialEventFlags.delete(successFlag);
  }
  if (isTribulationActive(state)) {
    return events;
  }

  for (const node of state.t2Nodes.values()) {
    const isActiveLike = node.state === T2NodeState.ACTIVE || node.state === T2NodeState.REFINED;
    if (!isActiveLike || node.level < 9 || node.rank >= MAX_RANK) {
      continue;
    }

    if (!canPassSahasraraRealmCap(state, node)) {
      continue;
    }

    const req = getRankBreakthroughRequirements(node.rank);
    if (conditionState.averageMeridianQuality < req.minAverageMeridianQuality || activeNodeCount < req.minActiveNodes) {
      continue;
    }
    if (getBodyEnergyTypeAmount(state, EnergyType.Jing) < req.jingCost) {
      continue;
    }
    if (getBodyEnergyTypeAmount(state, EnergyType.Shen) < req.shenCost) {
      continue;
    }

    triggerTribulation(state, node.id, node.rank, node.rank + 1, req.jingCost, req.shenCost);
  }

  return events;
}

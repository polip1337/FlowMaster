import { EnergyType } from "../energy/EnergyType";
import type { GameState } from "../../state/GameState";
import type { ConditionGameState } from "../nodes/conditionEvaluator";
import { T2NodeState } from "../nodes/T2Types";

export function buildConditionState(state: GameState): ConditionGameState {
  const nodes = new Map<string | number, { rank: number; level: number; isActive: boolean; lifetimeEnergyGenerated: number }>();
  const meridians = new Map<string, { state: string; quality: number }>();
  const energyAccumulatedByScope = new Map<string, Partial<Record<EnergyType, number>>>();
  const lifetimeEnergyByScope = new Map<string, number>();

  const globalPool: Partial<Record<EnergyType, number>> = {
    [EnergyType.Qi]: 0,
    [EnergyType.Jing]: 0,
    [EnergyType.YangQi]: 0,
    [EnergyType.Shen]: 0
  };
  let globalLifetime = 0;

  for (const [id, node] of state.t2Nodes) {
    let nodeLifetime = 0;
    const nodePool: Partial<Record<EnergyType, number>> = {
      [EnergyType.Qi]: 0,
      [EnergyType.Jing]: 0,
      [EnergyType.YangQi]: 0,
      [EnergyType.Shen]: 0
    };

    for (const t1 of node.t1Nodes.values()) {
      nodeLifetime += t1.lifetimeFlowOut;
      for (const t of Object.values(EnergyType)) {
        nodePool[t] = (nodePool[t] ?? 0) + t1.energy[t];
        globalPool[t] = (globalPool[t] ?? 0) + t1.energy[t];
      }
    }

    globalLifetime += nodeLifetime;
    energyAccumulatedByScope.set("node", nodePool);
    energyAccumulatedByScope.set(id, nodePool);
    lifetimeEnergyByScope.set("node", nodeLifetime);
    lifetimeEnergyByScope.set(id, nodeLifetime);
    nodes.set(id, {
      rank: node.rank,
      level: node.level,
      isActive: node.state === T2NodeState.ACTIVE || node.state === T2NodeState.REFINED,
      lifetimeEnergyGenerated: nodeLifetime
    });
  }

  energyAccumulatedByScope.set("global", globalPool);
  lifetimeEnergyByScope.set("global", globalLifetime);

  let qualitySum = 0;
  let qualityCount = 0;
  for (const [id, meridian] of state.meridians) {
    const quality = meridian.width * meridian.purity;
    meridians.set(id, {
      state: meridian.state,
      quality
    });
    if (meridian.isEstablished) {
      qualitySum += quality;
      qualityCount += 1;
    }
  }

  return {
    nodes,
    meridians,
    energyAccumulatedByScope,
    lifetimeEnergyByScope,
    averageMeridianQuality: qualityCount > 0 ? qualitySum / qualityCount : 0,
    specialEvents: state.specialEventFlags
  };
}

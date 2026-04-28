import { EnergyType, emptyPool, type EnergyPool } from "../energy/EnergyType";
import { canOpenReverse } from "../meridians/meridianLogic";
import type { Meridian } from "../meridians/Meridian";
import type { GameState } from "../../state/GameState";

export interface ReverseMeridianAvailability {
  meridianId: string;
  fromNodeId: string;
  toNodeId: string;
  canOpen: boolean;
  cost: EnergyPool;
}

function getReverseOpenCost(meridian: Meridian, state: GameState): EnergyPool {
  const from = state.t2Nodes.get(meridian.nodeFromId);
  const to = state.t2Nodes.get(meridian.nodeToId);
  const rank = Math.max(from?.rank ?? 1, to?.rank ?? 1);
  const cost = emptyPool();
  cost[EnergyType.Jing] = 500 * rank * meridian.hopCount;
  cost[EnergyType.YangQi] = 200 * rank;
  return cost;
}

export function getReverseMeridiansAvailable(state: GameState): ReverseMeridianAvailability[] {
  const result: ReverseMeridianAvailability[] = [];
  for (const meridian of state.meridians.values()) {
    if (meridian.isReverse) {
      continue;
    }
    result.push({
      meridianId: meridian.id,
      fromNodeId: meridian.nodeFromId,
      toNodeId: meridian.nodeToId,
      canOpen: canOpenReverse(meridian, state),
      cost: getReverseOpenCost(meridian, state)
    });
  }
  return result;
}

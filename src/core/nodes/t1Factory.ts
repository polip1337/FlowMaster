import { emptyPool } from "../energy/EnergyType";
import type { T1Node } from "./T1Node";
import { T1NodeState, T1NodeType } from "./T1Types";

export function createT1Node(
  id: number,
  type: T1NodeType,
  isSource: boolean,
  baseCapacity: number
): T1Node {
  return {
    id,
    type,
    state: T1NodeState.LOCKED,
    energy: emptyPool(),
    capacity: baseCapacity,
    quality: 1,
    outgoingEdges: [],
    incomingEdges: [],
    meridianSlotId: null,
    isSourceNode: isSource,
    refinementPoints: 0,
    lifetimeFlowOut: 0,
    resonanceMultiplier: 1.0,
    damageState: "healthy",
    reservedEnergy: emptyPool(),
    predecessorIds: [],
    unlockDepth: 0
  };
}

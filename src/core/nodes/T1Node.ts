import type { EnergyPool } from "../energy/EnergyType";
import type { T1NodeState, T1NodeType } from "./T1Types";

export type T1DamageState = "healthy" | "cracked" | "shattered";

export interface T1Node {
  id: number;
  type: T1NodeType;
  state: T1NodeState;
  energy: EnergyPool;
  capacity: number;
  quality: number;
  outgoingEdges: number[];
  incomingEdges: number[];
  meridianSlotId: string | null;
  isSourceNode: boolean;
  refinementPoints: number;
  lifetimeFlowOut: number;
  resonanceMultiplier: number;
  damageState: T1DamageState;
  /** S-013 — energy promised to outgoing meridian withdrawals this tick (cleared after apply). */
  reservedEnergy: EnergyPool;
  /** S-016 — topology unlock predecessors (from unlockAfter). */
  predecessorIds: number[];
  /** S-016 — topological depth in unlock DAG (roots = 0). */
  unlockDepth: number;
}

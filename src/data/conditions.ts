import type { EnergyType } from "../core/energy/EnergyType";
import { MeridianState } from "../core/meridians/MeridianTypes";

export type ConditionScope = "node" | "cluster" | "global";
export { MeridianState };

export interface NodeRankCondition {
  type: "node_rank";
  minRank: number;
  nodeId?: string | number;
}

export interface NodeLevelCondition {
  type: "node_level";
  minLevel: number;
  nodeId?: string | number;
}

export interface NodeActiveCondition {
  type: "node_active";
  nodeId?: string | number;
}

export interface EnergyAccumulatedCondition {
  type: "energy_accumulated";
  energyType: EnergyType;
  minAmount: number;
  scope: ConditionScope;
}

export interface MeridianStateCondition {
  type: "meridian_state";
  meridianId: string;
  requiredState: MeridianState;
}

export interface MeridianQualityCondition {
  type: "meridian_quality";
  minQuality: number;
  meridianId?: string;
  average?: boolean;
}

export interface OtherNodeLevelCondition {
  type: "other_node_level";
  nodeId: string | number;
  minLevel: number;
}

export interface LifetimeEnergyGeneratedCondition {
  type: "lifetime_energy_generated";
  minAmount: number;
  scope: ConditionScope;
}

export interface SpecialEventCondition {
  type: "special_event";
  eventId: string;
}

export type UnlockCondition =
  | NodeRankCondition
  | NodeLevelCondition
  | NodeActiveCondition
  | EnergyAccumulatedCondition
  | MeridianStateCondition
  | MeridianQualityCondition
  | OtherNodeLevelCondition
  | LifetimeEnergyGeneratedCondition
  | SpecialEventCondition;

export type UpgradeCondition = UnlockCondition;

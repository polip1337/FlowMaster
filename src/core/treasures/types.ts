import type { EnergyType } from "../energy/EnergyType";

export enum TreasureType {
  CondensedEssencePill = "condensed_essence_pill",
  RefiningStone = "refining_stone",
  MeridianSalve = "meridian_salve",
  JingDeposit = "jing_deposit",
  DaoFragment = "dao_fragment",
  RecoveryElixir = "recovery_elixir",
  FormationArray = "formation_array",
  CultivationManual = "cultivation_manual"
}

export interface CondensedEssencePillEffect {
  energyType: EnergyType;
  amount: number;
}

export interface RefiningStoneEffect {
  qualityGain: number;
}

export interface MeridianSalveEffect {
  trainingFlowGain: number;
}

export interface JingDepositEffect {
  jingDepositGain: number;
}

export interface DaoFragmentEffect {
  insightsGain: number;
}

export interface RecoveryElixirEffect {
  repairAmount: number;
  restoreJing: number;
}

export interface FormationArrayEffect {
  energyType: EnergyType;
  perTickGeneration: number;
}

export interface TechniqueUnlockManualEffect {
  mode: "unlock_technique";
  techniqueId: string;
}

export interface SealThresholdReductionManualEffect {
  mode: "reduce_seal_threshold";
  nodeId: string;
  multiplier: number;
}

export interface OpenLatentIoSlotManualEffect {
  mode: "open_latent_io_slot";
  nodeId: string;
  slotId: string;
}

export type CultivationManualEffect =
  | TechniqueUnlockManualEffect
  | SealThresholdReductionManualEffect
  | OpenLatentIoSlotManualEffect;

export type TreasureEffect =
  | CondensedEssencePillEffect
  | RefiningStoneEffect
  | MeridianSalveEffect
  | JingDepositEffect
  | DaoFragmentEffect
  | RecoveryElixirEffect
  | FormationArrayEffect
  | CultivationManualEffect;

export interface Treasure {
  id: string;
  type: TreasureType;
  tier: number;
  quantity: number;
  effect: TreasureEffect;
}

export interface PlacedFormationArray {
  treasureId: string;
  nodeId: string;
  energyType: EnergyType;
  perTickGeneration: number;
}

export interface TreasureDropDef {
  treasureType: TreasureType;
  weight: number;
  tierMin: number;
  tierMax: number;
  quantityMin: number;
  quantityMax: number;
  energyTypeFilter?: EnergyType;
}

export interface IngredientDropDef {
  ingredientId: string;
  probability: number;
  quantityMin: number;
  quantityMax: number;
  tierMin: number;
  tierMax: number;
}

import type { EnergyType } from "../energy/EnergyType";

export enum TreasureType {
  CondensedEssencePill = "condensed_essence_pill",
  RefiningStone = "refining_stone",
  MeridianSalve = "meridian_salve",
  MeridianRestoration = "meridian_restoration",
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

export interface MeridianRestorationEffect {
  scarHealApplications: number;
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

export interface UnlockT1ConnectionManualEffect {
  mode: "unlock_t1_connection";
}

export type CultivationManualEffect =
  | TechniqueUnlockManualEffect
  | SealThresholdReductionManualEffect
  | OpenLatentIoSlotManualEffect
  | UnlockT1ConnectionManualEffect;

export type TreasureEffect =
  | CondensedEssencePillEffect
  | RefiningStoneEffect
  | MeridianSalveEffect
  | MeridianRestorationEffect
  | JingDepositEffect
  | DaoFragmentEffect
  | RecoveryElixirEffect
  | FormationArrayEffect
  | CultivationManualEffect;

interface BaseTreasure {
  id: string;
  tier: number;
  quantity: number;
}

export type Treasure =
  | (BaseTreasure & { type: TreasureType.CondensedEssencePill; effect: CondensedEssencePillEffect })
  | (BaseTreasure & { type: TreasureType.RefiningStone; effect: RefiningStoneEffect })
  | (BaseTreasure & { type: TreasureType.MeridianSalve; effect: MeridianSalveEffect })
  | (BaseTreasure & { type: TreasureType.MeridianRestoration; effect: MeridianRestorationEffect })
  | (BaseTreasure & { type: TreasureType.JingDeposit; effect: JingDepositEffect })
  | (BaseTreasure & { type: TreasureType.DaoFragment; effect: DaoFragmentEffect })
  | (BaseTreasure & { type: TreasureType.RecoveryElixir; effect: RecoveryElixirEffect })
  | (BaseTreasure & { type: TreasureType.FormationArray; effect: FormationArrayEffect })
  | (BaseTreasure & { type: TreasureType.CultivationManual; effect: CultivationManualEffect });

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

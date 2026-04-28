import { TreasureType, type TreasureDropDef } from "../../core/treasures/types";
import { EnergyType } from "../../core/energy/EnergyType";
import type { EnemyDef } from "./types";

const BASIC_DROPS: TreasureDropDef[] = [
  { treasureType: TreasureType.CondensedEssencePill, weight: 10, quantityMin: 1, quantityMax: 2, tierMin: 1, tierMax: 2 },
  { treasureType: TreasureType.RefiningStone, weight: 4, quantityMin: 1, quantityMax: 1, tierMin: 1, tierMax: 2 },
  {
    treasureType: TreasureType.FormationArray,
    weight: 2,
    quantityMin: 1,
    quantityMax: 1,
    tierMin: 1,
    tierMax: 2,
    energyTypeFilter: EnergyType.Qi
  }
];

const ADVANCED_DROPS: TreasureDropDef[] = [
  {
    treasureType: TreasureType.CondensedEssencePill,
    weight: 6,
    quantityMin: 1,
    quantityMax: 2,
    tierMin: 2,
    tierMax: 4,
    energyTypeFilter: EnergyType.Jing
  },
  { treasureType: TreasureType.MeridianSalve, weight: 6, quantityMin: 1, quantityMax: 1, tierMin: 2, tierMax: 4 },
  { treasureType: TreasureType.JingDeposit, weight: 3, quantityMin: 1, quantityMax: 1, tierMin: 3, tierMax: 4 },
  { treasureType: TreasureType.DaoFragment, weight: 3, quantityMin: 1, quantityMax: 1, tierMin: 3, tierMax: 4 }
];

const ELITE_DROPS: TreasureDropDef[] = [
  {
    treasureType: TreasureType.CondensedEssencePill,
    weight: 3,
    quantityMin: 1,
    quantityMax: 1,
    tierMin: 4,
    tierMax: 6,
    energyTypeFilter: EnergyType.Shen
  },
  { treasureType: TreasureType.RecoveryElixir, weight: 5, quantityMin: 1, quantityMax: 1, tierMin: 4, tierMax: 6 },
  { treasureType: TreasureType.CultivationManual, weight: 4, quantityMin: 1, quantityMax: 1, tierMin: 5, tierMax: 7 },
  { treasureType: TreasureType.DaoFragment, weight: 2, quantityMin: 1, quantityMax: 1, tierMin: 5, tierMax: 7 }
];

const BASIC_INGREDIENT_DROPS = [
  { ingredientId: "spirit-grass", probability: 0.6, quantityMin: 1, quantityMax: 3, tierMin: 1, tierMax: 3 },
  { ingredientId: "iron-bark", probability: 0.45, quantityMin: 1, quantityMax: 2, tierMin: 1, tierMax: 3 },
  { ingredientId: "jade-moss", probability: 0.35, quantityMin: 1, quantityMax: 2, tierMin: 1, tierMax: 3 }
];

const ADVANCED_INGREDIENT_DROPS = [
  { ingredientId: "ember-bloom", probability: 0.55, quantityMin: 1, quantityMax: 2, tierMin: 2, tierMax: 5 },
  { ingredientId: "moon-tear", probability: 0.5, quantityMin: 1, quantityMax: 2, tierMin: 2, tierMax: 5 },
  { ingredientId: "void-thorn", probability: 0.35, quantityMin: 1, quantityMax: 1, tierMin: 3, tierMax: 6 },
  { ingredientId: "golden-pith", probability: 0.3, quantityMin: 1, quantityMax: 1, tierMin: 3, tierMax: 6 }
];

const ELITE_INGREDIENT_DROPS = [
  { ingredientId: "void-thorn", probability: 0.5, quantityMin: 1, quantityMax: 2, tierMin: 4, tierMax: 8 },
  { ingredientId: "dragon-blood-sap", probability: 0.4, quantityMin: 1, quantityMax: 1, tierMin: 5, tierMax: 9 },
  { ingredientId: "astral-pollen", probability: 0.3, quantityMin: 1, quantityMax: 1, tierMin: 5, tierMax: 9 },
  { ingredientId: "dao-lotus-heart", probability: 0.15, quantityMin: 1, quantityMax: 1, tierMin: 7, tierMax: 9 }
];

export const ENEMY_ARCHETYPES: EnemyDef[] = [
  {
    id: "bandit-cultivator",
    name: "Bandit Cultivator",
    tier: 2,
    hp: 180,
    soulHp: 90,
    physicalAttack: 14,
    soulAttack: 2,
    attackSpeedTicks: 16,
    preferredNodeTarget: null,
    dropTable: BASIC_DROPS,
    ingredientDropTable: BASIC_INGREDIENT_DROPS,
    realmRequired: 1
  },
  {
    id: "wild-beast",
    name: "Wild Beast",
    tier: 3,
    hp: 300,
    soulHp: 60,
    physicalAttack: 16,
    soulAttack: 0,
    attackSpeedTicks: 14,
    preferredNodeTarget: null,
    dropTable: BASIC_DROPS,
    ingredientDropTable: BASIC_INGREDIENT_DROPS,
    realmRequired: 1
  },
  {
    id: "rogue-scholar",
    name: "Rogue Scholar",
    tier: 5,
    hp: 240,
    soulHp: 220,
    physicalAttack: 10,
    soulAttack: 18,
    attackSpeedTicks: 18,
    preferredNodeTarget: "AJNA",
    dropTable: ADVANCED_DROPS,
    ingredientDropTable: ADVANCED_INGREDIENT_DROPS,
    realmRequired: 3
  },
  {
    id: "ancient-guardian",
    name: "Ancient Guardian",
    tier: 7,
    hp: 520,
    soulHp: 360,
    physicalAttack: 28,
    soulAttack: 10,
    attackSpeedTicks: 20,
    preferredNodeTarget: "ANAHATA",
    dropTable: ELITE_DROPS,
    ingredientDropTable: ELITE_INGREDIENT_DROPS,
    realmRequired: 5
  },
  {
    id: "tribulation-spirit",
    name: "Tribulation Spirit",
    tier: 9,
    hp: 700,
    soulHp: 640,
    physicalAttack: 34,
    soulAttack: 32,
    attackSpeedTicks: 12,
    preferredNodeTarget: "SAHASRARA",
    dropTable: ELITE_DROPS,
    ingredientDropTable: ELITE_INGREDIENT_DROPS,
    realmRequired: 7
  }
];

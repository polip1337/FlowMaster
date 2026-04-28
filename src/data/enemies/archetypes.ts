import type { TreasureDropDef } from "../../core/treasures/types";
import type { EnemyDef } from "./types";

const BASIC_DROPS: TreasureDropDef[] = [
  { treasureType: "pill_qi", probability: 0.3, quantityMin: 1, quantityMax: 2, tierMin: 1, tierMax: 2 },
  { treasureType: "material", probability: 0.5, quantityMin: 1, quantityMax: 3, tierMin: 1, tierMax: 3 }
];

const ADVANCED_DROPS: TreasureDropDef[] = [
  { treasureType: "pill_jing", probability: 0.25, quantityMin: 1, quantityMax: 2, tierMin: 2, tierMax: 4 },
  { treasureType: "artifact", probability: 0.1, quantityMin: 1, quantityMax: 1, tierMin: 3, tierMax: 4 }
];

const ELITE_DROPS: TreasureDropDef[] = [
  { treasureType: "pill_shen", probability: 0.2, quantityMin: 1, quantityMax: 1, tierMin: 4, tierMax: 5 },
  { treasureType: "artifact", probability: 0.2, quantityMin: 1, quantityMax: 1, tierMin: 4, tierMax: 5 }
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
    realmRequired: 7
  }
];

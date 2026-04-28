import type { IngredientDropDef, TreasureDropDef } from "../../core/treasures/types";

export type EnemyTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface EnemyDef {
  id: string;
  name: string;
  tier: EnemyTier;
  hp: number;
  soulHp: number;
  physicalAttack: number;
  soulAttack: number;
  attackSpeedTicks: number;
  preferredNodeTarget: string | null;
  dropTable: TreasureDropDef[];
  ingredientDropTable: IngredientDropDef[];
  realmRequired: number;
}

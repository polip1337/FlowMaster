import type { EnergyType } from "../energy/EnergyType";

/** S-011 — pill / treasure taxonomy placeholder until TASK-127 fully lands. */
export type TreasureType = "pill_qi" | "pill_jing" | "pill_yang" | "pill_shen" | "artifact" | "material";

export interface TreasureDropDef {
  treasureType: TreasureType;
  /** 0–1, rolled independently per drop row. */
  probability: number;
  quantityMin: number;
  quantityMax: number;
  /** Quality tier 1–5. */
  tierMin: number;
  tierMax: number;
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

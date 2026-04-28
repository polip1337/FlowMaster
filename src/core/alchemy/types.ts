import type { EnergyPool } from "../energy/EnergyType";
import type { TreasureType } from "../treasures/types";

export type IngredientId = string;
export type RecipeId = string;

export type IngredientRarity = "common" | "uncommon" | "rare" | "epic" | "mythic";

export interface Ingredient {
  id: IngredientId;
  name: string;
  energyContent: EnergyPool;
  rarity: IngredientRarity;
}

export interface IngredientStack {
  ingredientId: IngredientId;
  quantity: number;
}

export type RecipeTier = "basic" | "refined" | "transcendent";

export interface Recipe {
  id: RecipeId;
  name: string;
  ingredients: IngredientId[];
  baseQuality: number;
  resultType: TreasureType;
  tier: RecipeTier;
}

export type AlchemySessionState = "MIXING" | "REFINING" | "COMPLETE";

export interface AlchemySession {
  recipe: Recipe;
  ingredientsPlaced: IngredientId[];
  state: AlchemySessionState;
  quality: number;
}

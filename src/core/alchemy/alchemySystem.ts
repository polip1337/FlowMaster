import type { IngredientId, IngredientStack, Recipe } from "./types";
import { EnergyType } from "../energy/EnergyType";
import type { GameState } from "../../state/GameState";
import { TreasureType, type Treasure } from "../treasures/types";
import { ALCHEMY_RECIPES } from "../../data/alchemy/recipes";

interface PillQualityContext {
  manipuraResonance: number;
  avgBodyRank: number;
  jingGenerationRate: number;
  maxJingRate: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findRecipe(recipeId: string): Recipe {
  const recipe = ALCHEMY_RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown alchemy recipe: ${recipeId}`);
  }
  return recipe;
}

function countIngredients(ids: IngredientId[]): Map<IngredientId, number> {
  const out = new Map<IngredientId, number>();
  for (const id of ids) {
    out.set(id, (out.get(id) ?? 0) + 1);
  }
  return out;
}

function getManipuraResonance(state: GameState): number {
  const manipura = state.t2Nodes.get("MANIPURA");
  if (!manipura) {
    return 0;
  }
  const t1s = [...manipura.t1Nodes.values()];
  if (t1s.length === 0) {
    return 0;
  }
  const avgQuality = t1s.reduce((sum, t1) => sum + t1.quality, 0) / t1s.length;
  return clamp((manipura.rank * 0.55 + manipura.level * 0.25 + avgQuality * 0.2) / 3, 0, 3);
}

function getAvgBodyRank(state: GameState): number {
  const nodes = [...state.t2Nodes.values()];
  if (nodes.length === 0) {
    return 1;
  }
  return nodes.reduce((sum, node) => sum + node.rank, 0) / nodes.length;
}

function getMaxJingRate(state: GameState): number {
  return Math.max(1, 100 + state.technique.strength * 200);
}

function getQualityContext(state: GameState): PillQualityContext {
  return {
    manipuraResonance: getManipuraResonance(state),
    avgBodyRank: getAvgBodyRank(state),
    jingGenerationRate: Math.max(0, state.cultivationAttributes.jingGenerationRate),
    maxJingRate: getMaxJingRate(state)
  };
}

function consumeIngredientInventory(inventory: IngredientStack[], ingredientIds: IngredientId[]): void {
  const required = countIngredients(ingredientIds);
  for (const [ingredientId, qty] of required) {
    const stack = inventory.find((entry) => entry.ingredientId === ingredientId);
    if (!stack || stack.quantity < qty) {
      throw new Error(`Missing required ingredient ${ingredientId} x${qty}.`);
    }
  }
  for (const [ingredientId, qty] of required) {
    const stack = inventory.find((entry) => entry.ingredientId === ingredientId)!;
    stack.quantity -= qty;
  }
  for (let i = inventory.length - 1; i >= 0; i -= 1) {
    if (inventory[i].quantity <= 0) {
      inventory.splice(i, 1);
    }
  }
}

function totalBodyYangQi(state: GameState): number {
  let total = 0;
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      total += t1.energy[EnergyType.YangQi];
    }
  }
  return total;
}

function spendBodyYangQi(state: GameState, amount: number): number {
  let remaining = Math.max(0, amount);
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      if (remaining <= 0) {
        return amount;
      }
      const spent = Math.min(t1.energy[EnergyType.YangQi], remaining);
      t1.energy[EnergyType.YangQi] -= spent;
      remaining -= spent;
    }
  }
  return amount - remaining;
}

function effectMultiplierFromQuality(quality: number): number {
  return Math.max(0.2, quality / 100);
}

function buildTreasureFromRecipe(recipe: Recipe, quality: number): Treasure {
  const multiplier = effectMultiplierFromQuality(quality);
  const tier = recipe.tier === "basic" ? 2 : recipe.tier === "refined" ? 5 : 8;
  const id = `${recipe.resultType}:alchemy:${recipe.id}:${Math.floor(quality)}`;
  switch (recipe.resultType) {
    case TreasureType.CondensedEssencePill:
      return {
        id,
        type: TreasureType.CondensedEssencePill,
        tier,
        quantity: 1,
        effect: { energyType: EnergyType.Qi, amount: 150 * multiplier }
      };
    case TreasureType.RefiningStone:
      return { id, type: TreasureType.RefiningStone, tier, quantity: 1, effect: { qualityGain: Math.max(1, Math.floor(3 * multiplier)) } };
    case TreasureType.MeridianSalve:
      return { id, type: TreasureType.MeridianSalve, tier, quantity: 1, effect: { trainingFlowGain: Math.floor(800 * multiplier) } };
    case TreasureType.JingDeposit:
      return { id, type: TreasureType.JingDeposit, tier, quantity: 1, effect: { jingDepositGain: Math.floor(500 * multiplier) } };
    case TreasureType.DaoFragment:
      return { id, type: TreasureType.DaoFragment, tier, quantity: 1, effect: { insightsGain: Math.floor(180 * multiplier) } };
    case TreasureType.RecoveryElixir:
      return {
        id,
        type: TreasureType.RecoveryElixir,
        tier,
        quantity: 1,
        effect: { repairAmount: clamp(0.2 * multiplier, 0.1, 1), restoreJing: Math.floor(300 * multiplier) }
      };
    case TreasureType.FormationArray:
      return {
        id,
        type: TreasureType.FormationArray,
        tier,
        quantity: 1,
        effect: { energyType: EnergyType.YangQi, perTickGeneration: clamp(0.6 * multiplier, 0.1, 4) }
      };
    case TreasureType.CultivationManual:
      return {
        id,
        type: TreasureType.CultivationManual,
        tier,
        quantity: 1,
        effect: { mode: "unlock_technique", techniqueId: multiplier >= 1 ? "master" : "adept" }
      };
    default:
      return {
        id,
        type: TreasureType.CondensedEssencePill,
        tier,
        quantity: 1,
        effect: { energyType: EnergyType.Qi, amount: 120 * multiplier }
      };
  }
}

export function computePillQuality(recipe: Recipe, context: PillQualityContext): number {
  const quality =
    recipe.baseQuality *
    (context.manipuraResonance * 0.4 + (context.avgBodyRank / 9) * 0.3 + (context.jingGenerationRate / context.maxJingRate) * 0.3);
  return clamp(quality, 1, 200);
}

export function beginAlchemySession(state: GameState, recipeId: string): GameState {
  const next = structuredClone(state);
  const recipe = findRecipe(recipeId);
  consumeIngredientInventory(next.ingredientInventory, recipe.ingredients);
  const quality = computePillQuality(recipe, getQualityContext(next));
  next.alchemySession = {
    recipe,
    ingredientsPlaced: recipe.ingredients.slice(),
    state: "MIXING",
    quality
  };
  return next;
}

export function advanceAlchemyToRefining(state: GameState): GameState {
  const next = structuredClone(state);
  if (!next.alchemySession) {
    throw new Error("No active alchemy session.");
  }
  if (next.alchemySession.state !== "MIXING") {
    throw new Error("Alchemy session is not in MIXING state.");
  }
  next.alchemySession.state = "REFINING";
  return next;
}

export function refineAlchemySession(state: GameState, desiredQualityGain: number): GameState {
  const next = structuredClone(state);
  if (!next.alchemySession) {
    throw new Error("No active alchemy session.");
  }
  if (next.alchemySession.state !== "REFINING") {
    throw new Error("Alchemy session must be in REFINING state.");
  }
  const requestedGain = Math.max(0, Math.floor(desiredQualityGain));
  const availableYangQi = Math.floor(totalBodyYangQi(next));
  const affordableGain = Math.min(requestedGain, availableYangQi);
  if (affordableGain <= 0) {
    return next;
  }
  const spent = spendBodyYangQi(next, affordableGain);
  next.alchemySession.quality = clamp(next.alchemySession.quality + spent, 1, 200);
  return next;
}

export function completeAlchemySession(state: GameState): GameState {
  const next = structuredClone(state);
  const session = next.alchemySession;
  if (!session) {
    throw new Error("No active alchemy session.");
  }
  if (session.state !== "REFINING" && session.state !== "COMPLETE") {
    throw new Error("Alchemy session must be refined before completion.");
  }
  const treasure = buildTreasureFromRecipe(session.recipe, session.quality);
  next.inventory.push(treasure);
  session.state = "COMPLETE";
  next.alchemySession = null;
  return next;
}

export function abandonAlchemySession(state: GameState): GameState {
  const next = structuredClone(state);
  if (!next.alchemySession) {
    return next;
  }
  next.alchemySession = null;
  return next;
}

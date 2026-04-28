import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import {
  abandonAlchemySession,
  advanceAlchemyToRefining,
  beginAlchemySession,
  completeAlchemySession,
  computePillQuality,
  refineAlchemySession
} from "../../../src/core/alchemy/alchemySystem";
import { ALCHEMY_RECIPES } from "../../../src/data/alchemy/recipes";
import { TreasureType } from "../../../src/core/treasures/types";
import { endCombat, startCombat } from "../../../src/core/combat/combatSystem";
import { ENEMY_ARCHETYPES } from "../../../src/data/enemies/archetypes";
import { EnergyType } from "../../../src/core/energy/EnergyType";

describe("phase 16 alchemy system", () => {
  it("defines 12 base recipes with 3 tiers and covers all treasure types", () => {
    expect(ALCHEMY_RECIPES).toHaveLength(36);
    const familyIds = new Set(ALCHEMY_RECIPES.map((r) => r.id.split(":")[0]));
    expect(familyIds.size).toBe(12);
    expect(new Set(ALCHEMY_RECIPES.map((r) => r.tier))).toEqual(new Set(["basic", "refined", "transcendent"]));
    const coveredTypes = new Set(ALCHEMY_RECIPES.map((r) => r.resultType));
    for (const type of Object.values(TreasureType)) {
      expect(coveredTypes.has(type)).toBe(true);
    }
  });

  it("computePillQuality follows formula inputs", () => {
    const recipe = ALCHEMY_RECIPES.find((r) => r.id === "essence-condensation:basic");
    expect(recipe).toBeTruthy();
    const quality = computePillQuality(recipe!, {
      manipuraResonance: 1.5,
      avgBodyRank: 6,
      jingGenerationRate: 50,
      maxJingRate: 100
    });
    const expected = recipe!.baseQuality * (1.5 * 0.4 + (6 / 9) * 0.3 + (50 / 100) * 0.3);
    expect(quality).toBeCloseTo(expected, 6);
  });

  it("session lifecycle supports mixing, refining via YangQi spend, completion, and abandonment", () => {
    const state = buildInitialGameState();
    state.ingredientInventory.push(
      { ingredientId: "spirit-grass", quantity: 2 },
      { ingredientId: "jade-moss", quantity: 1 },
      { ingredientId: "ember-bloom", quantity: 1 }
    );
    const source = state.t2Nodes.get("MULADHARA")?.t1Nodes.get(0);
    expect(source).toBeTruthy();
    if (source) {
      source.energy[EnergyType.YangQi] = 40;
    }

    const mixed = beginAlchemySession(state, "essence-condensation:basic");
    expect(mixed.alchemySession?.state).toBe("MIXING");
    expect(mixed.ingredientInventory.find((s) => s.ingredientId === "spirit-grass")?.quantity).toBe(1);

    const refining = advanceAlchemyToRefining(mixed);
    const preQuality = refining.alchemySession?.quality ?? 0;
    const refined = refineAlchemySession(refining, 10);
    expect((refined.alchemySession?.quality ?? 0) - preQuality).toBeGreaterThan(0);

    const completed = completeAlchemySession(refined);
    expect(completed.alchemySession).toBeNull();
    expect(completed.inventory.length).toBeGreaterThan(0);
    expect(completed.inventory.at(-1)?.type).toBe(TreasureType.CondensedEssencePill);

    const abandoned = abandonAlchemySession(refining);
    expect(abandoned.alchemySession).toBeNull();
  });

  it("post-combat ingredient drops are granted in separate inventory section", () => {
    const started = startCombat(buildInitialGameState(), ENEMY_ARCHETYPES[4]);
    const result = endCombat(started, "player_win", () => 0);
    expect(result.droppedIngredients.length).toBeGreaterThan(0);
    expect(result.state.ingredientInventory.length).toBeGreaterThan(0);
    expect(result.state.inventory.length).toBeGreaterThan(0);
    const ingredientIds = new Set(result.state.ingredientInventory.map((s) => s.ingredientId));
    expect(ingredientIds.has("void-thorn") || ingredientIds.has("dragon-blood-sap")).toBe(true);
  });
});

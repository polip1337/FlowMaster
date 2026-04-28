import { describe, expect, it } from "vitest";
import { CELESTIAL_PEAK_DURATION_DAYS, CELESTIAL_YEAR_DAYS, getCelestialTickModifiers, refreshCelestialStateForCurrentDay } from "../../../src/core/celestial/calendar";
import { MeridianState, MERIDIAN_TF_FOR_STATE } from "../../../src/core/meridians/MeridianTypes";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { getRankBreakthroughRequirements } from "../../../src/core/progression/rankController";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";
import { computePillQuality } from "../../../src/core/alchemy/alchemySystem";
import { ALCHEMY_RECIPES } from "../../../src/data/alchemy/recipes";
import { ENEMY_ARCHETYPES } from "../../../src/data/enemies/archetypes";

describe("Phase 36 balance pass (TASK-228..234)", () => {
  it("TASK-228: early unlock cadence and heat gating remain in target window", { timeout: 20_000 }, () => {
    let state = buildInitialGameState();
    let svadhUnlockTick = -1;
    let manipuraUnlockTick = -1;
    let heatBeforeManipura = false;
    for (let i = 0; i < 3_200; i += 1) {
      state = simulationTick(state);
      if (state.t2Nodes.get("SVADHISTHANA")?.state === T2NodeState.ACTIVE && svadhUnlockTick < 0) {
        svadhUnlockTick = state.tick;
      }
      if (state.t2Nodes.get("MANIPURA")?.state === T2NodeState.ACTIVE && manipuraUnlockTick < 0) {
        manipuraUnlockTick = state.tick;
      }
      if (manipuraUnlockTick < 0 && state.bodyHeat > 0) {
        heatBeforeManipura = true;
      }
    }

    expect(svadhUnlockTick).toBeGreaterThanOrEqual(1_500);
    expect(svadhUnlockTick).toBeLessThanOrEqual(3_000);
    expect(heatBeforeManipura).toBe(false);
  });

  it("TASK-229/230: midgame entry is accessible while rank 9 remains a long-tail goal", () => {
    const firstBreakthrough = getRankBreakthroughRequirements(1);
    const midBreakthrough = getRankBreakthroughRequirements(4);
    const finalBreakthrough = getRankBreakthroughRequirements(8);

    expect(firstBreakthrough.jingCost).toBeLessThanOrEqual(1_000);
    expect(firstBreakthrough.shenCost).toBeLessThanOrEqual(500);
    expect(midBreakthrough.minActiveNodes).toBeLessThanOrEqual(12);
    expect(finalBreakthrough.jingCost).toBeGreaterThanOrEqual(400_000);
    expect(finalBreakthrough.shenCost).toBeGreaterThanOrEqual(200_000);
    expect(finalBreakthrough.jingCost).toBeGreaterThan(midBreakthrough.jingCost * 8);
  });

  it("TASK-231: enemy power curve enforces clear tier progression", () => {
    const low = ENEMY_ARCHETYPES.find((e) => e.tier <= 3)!;
    const mid = ENEMY_ARCHETYPES.find((e) => e.tier === 5)!;
    const high = ENEMY_ARCHETYPES.find((e) => e.tier >= 9)!;

    expect(low.hp + low.soulHp).toBeLessThan(mid.hp + mid.soulHp);
    expect(mid.hp + mid.soulHp).toBeLessThan(high.hp + high.soulHp);
    expect(low.physicalAttack + low.soulAttack).toBeLessThan(mid.physicalAttack + mid.soulAttack);
    expect(mid.physicalAttack + mid.soulAttack).toBeLessThan(high.physicalAttack + high.soulAttack);
  });

  it("TASK-232: meridian TF thresholds map to session, sustained, and late-game windows", () => {
    const developedTicks = MERIDIAN_TF_FOR_STATE[MeridianState.DEVELOPED];
    const refinedTicks = MERIDIAN_TF_FOR_STATE[MeridianState.REFINED] - developedTicks;
    const transcendentTicks = MERIDIAN_TF_FOR_STATE[MeridianState.TRANSCENDENT] - MERIDIAN_TF_FOR_STATE[MeridianState.REFINED];
    const ticksPerHour = 36_000;

    expect(developedTicks / ticksPerHour).toBeGreaterThanOrEqual(1);
    expect(developedTicks / ticksPerHour).toBeLessThanOrEqual(2);
    expect(refinedTicks / ticksPerHour).toBeGreaterThanOrEqual(5);
    expect(refinedTicks / ticksPerHour).toBeLessThanOrEqual(10);
    expect(transcendentTicks / ticksPerHour).toBeGreaterThanOrEqual(30);
  });

  it("TASK-233: ingredient and alchemy quality targets stay in desired encounter/value bands", () => {
    const basic = ENEMY_ARCHETYPES.find((e) => e.id === "wild-beast")!;
    const elite = ENEMY_ARCHETYPES.find((e) => e.id === "tribulation-spirit")!;
    const commonAnyChance = 1 - basic.ingredientDropTable.reduce((p, drop) => p * (1 - drop.probability), 1);
    const rareDrop = elite.ingredientDropTable.find((drop) => drop.ingredientId === "dao-lotus-heart")!;

    expect(1 / commonAnyChance).toBeGreaterThanOrEqual(3);
    expect(1 / commonAnyChance).toBeLessThanOrEqual(5);
    expect(1 / rareDrop.probability).toBeGreaterThanOrEqual(20);
    expect(1 / rareDrop.probability).toBeLessThanOrEqual(30);

    const recipe = ALCHEMY_RECIPES.find((r) => r.id === "essence-condensation:basic");
    expect(recipe).toBeTruthy();
    const craftedQuality = computePillQuality(recipe!, {
      manipuraResonance: 1.4,
      avgBodyRank: 4,
      jingGenerationRate: 140,
      maxJingRate: 240
    });
    expect(craftedQuality).toBeGreaterThan(35);
  });

  it("TASK-234: calendar cadence stays meaningful and stacked multipliers are capped", () => {
    expect(CELESTIAL_PEAK_DURATION_DAYS).toBeGreaterThanOrEqual(20);
    expect(CELESTIAL_PEAK_DURATION_DAYS).toBeLessThanOrEqual(35);

    const state = buildInitialGameState();
    let conjunctionDays = 0;
    for (let day = 0; day < CELESTIAL_YEAR_DAYS; day += 1) {
      state.celestialCalendar.dayOfYear = day;
      refreshCelestialStateForCurrentDay(state);
      if (state.celestialCalendar.activeConjunctions.length > 0) {
        conjunctionDays += 1;
      }
      const modifiers = getCelestialTickModifiers(state);
      const nodeId = "ANAHATA";
      const stackedShen =
        modifiers.shenGenerationMultiplier *
        modifiers.t2GenerationMultiplier(nodeId) *
        modifiers.t2ShenGenerationMultiplier(nodeId);
      expect(stackedShen).toBeLessThanOrEqual(2.4);
    }
    expect(conjunctionDays).toBeGreaterThanOrEqual(3);
    expect(conjunctionDays).toBeLessThanOrEqual(8);
  });
});

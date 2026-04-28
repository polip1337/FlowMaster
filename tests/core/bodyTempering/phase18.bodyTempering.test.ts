import { describe, expect, it } from "vitest";
import { computeAllAttributes } from "../../../src/core/attributes/attributeComputer";
import { combatTick, startCombat } from "../../../src/core/combat/combatSystem";
import type { EnemyDef } from "../../../src/data/enemies/types";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";
import { EnergyType } from "../../../src/core/energy/EnergyType";

const TRAINING_DUMMY: EnemyDef = {
  id: "training-dummy",
  name: "Training Dummy",
  tier: 1,
  hp: 200,
  soulHp: 100,
  physicalAttack: 10,
  soulAttack: 0,
  attackSpeedTicks: 1,
  preferredNodeTarget: null,
  dropTable: [],
  ingredientDropTable: [],
  realmRequired: 1
};

describe("phase 18 body tempering", () => {
  it("initializes body tempering state in game state", () => {
    const state = buildInitialGameState();
    expect(state.bodyTemperingState.temperingLevel).toBe(1);
    expect(state.bodyTemperingState.temperingXP).toBe(0);
    expect(state.bodyTemperingState.currentTrainingAction).toBeNull();
    expect(state.bodyTemperingState.trainingCooldown).toBe(0);
  });

  it("applies passive and active training effects through simulation tick", () => {
    const state = buildInitialGameState();
    state.bodyTemperingState.currentTrainingAction = "stone-lifting";
    const muladhara = state.t2Nodes.get("MULADHARA");
    if (!muladhara) {
      throw new Error("MULADHARA missing in test setup");
    }
    const source = [...muladhara.t1Nodes.values()].find((t1) => t1.isSourceNode);
    if (!source) {
      throw new Error("source node missing in test setup");
    }
    const jingBefore = source.energy[EnergyType.Jing];
    const ticked = simulationTick(state);

    expect(ticked.bodyTemperingState.temperingXP).toBeGreaterThan(0.3);
    expect(ticked.bodyTemperingState.trainingCooldown).toBeGreaterThan(0);
    const nextSource = [...(ticked.t2Nodes.get("MULADHARA")?.t1Nodes.values() ?? [])].find((t1) => t1.isSourceNode);
    expect(nextSource?.energy[EnergyType.Jing] ?? 0).toBeGreaterThan(jingBefore);
  });

  it("levels up tempering and grants immediate hp from training xp", () => {
    const state = buildInitialGameState();
    state.hp = 90;
    state.bodyTemperingState.temperingXP = 9.9;
    state.bodyTemperingState.currentTrainingAction = "sprint-training";

    const ticked = simulationTick(state);
    expect(ticked.bodyTemperingState.temperingLevel).toBe(2);
    expect(ticked.hp).toBeGreaterThan(90);
  });

  it("adds tempering durability and jing generation bonuses to attributes", () => {
    const state = buildInitialGameState();
    state.bodyTemperingState.temperingLevel = 5;
    const muladhara = state.t2Nodes.get("MULADHARA");
    if (!muladhara) {
      throw new Error("MULADHARA missing in test setup");
    }
    const source = [...muladhara.t1Nodes.values()].find((t1) => t1.isSourceNode);
    if (!source) {
      throw new Error("source node missing in test setup");
    }
    source.energy[EnergyType.Jing] = 1;

    const attrs = computeAllAttributes(state);
    expect(attrs.combat.physicalDurability).toBeGreaterThanOrEqual(50);
    expect(attrs.cultivation.jingGenerationRate).toBeGreaterThanOrEqual(0.1);
  });

  it("applies max hp and physical reduction bonuses in combat", () => {
    const state = buildInitialGameState();
    state.bodyTemperingState.temperingLevel = 5;
    state.combatAttributes.physicalDurability = 20;
    state.playerDao.availableSkillIds = [];
    const started = startCombat(state, TRAINING_DUMMY);

    expect(started.combat?.playerMaxHp).toBe(170);
    if (!started.combat) {
      throw new Error("combat not started in test setup");
    }
    started.combat.rotation = [];
    started.combat.ticksUntilNextSkill = 99;
    const hpBefore = started.combat.playerHp;
    combatTick(started.combat, {
      attributes: started.combatAttributes,
      criticalInsight: 0,
      t2Nodes: started.t2Nodes,
      random: () => 1
    });
    expect(started.combat.playerHp).toBeCloseTo(hpBefore - 9, 6);
  });
});

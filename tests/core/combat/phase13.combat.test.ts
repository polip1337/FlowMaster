import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { endCombat, checkCombatEnd, combatTick, rollCrit, snapshotBodyEnergyForCombat, startCombat } from "../../../src/core/combat/combatSystem";
import { ENEMY_ARCHETYPES } from "../../../src/data/enemies/archetypes";
import { DAO_SKILLS } from "../../../src/data/dao/skills";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import type { CombatState } from "../../../src/core/combat/types";
import { T2NodeState } from "../../../src/core/nodes/T2Types";

function sumBodyEnergy(state: ReturnType<typeof buildInitialGameState>): number {
  let sum = 0;
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      for (const type of Object.values(EnergyType)) {
        sum += t1.energy[type];
      }
    }
  }
  return sum;
}

describe("phase 13 combat system", () => {
  it("provides enemy definitions and five combat archetypes", () => {
    expect(ENEMY_ARCHETYPES).toHaveLength(5);
    for (const enemy of ENEMY_ARCHETYPES) {
      expect(enemy.hp).toBeGreaterThan(0);
      expect(enemy.attackSpeedTicks).toBeGreaterThan(0);
      expect(enemy.dropTable.length).toBeGreaterThan(0);
    }
  });

  it("startCombat moves 40% body energy into combat pool and initializes hp bars", () => {
    const state = buildInitialGameState();
    state.combatAttributes.physicalDurability = 30;
    state.combatAttributes.soulDurability = 20;

    const before = snapshotBodyEnergyForCombat(state);
    const started = startCombat(state, ENEMY_ARCHETYPES[0]);
    const after = snapshotBodyEnergyForCombat(started);
    const pool = started.combat?.combatEnergyPool;

    expect(started.combat?.playerMaxHp).toBe(130);
    expect(started.combat?.playerMaxSoulHp).toBe(70);
    expect(pool).toBeTruthy();
    for (const type of Object.values(EnergyType)) {
      expect(pool?.[type] ?? 0).toBeCloseTo(before[type] * 0.4, 6);
      expect(after[type]).toBeCloseTo(before[type] * 0.6, 6);
    }
  });

  it("combatTick executes rotation skill, applies crit and enemy attacks", () => {
    const state = buildInitialGameState();
    state.playerDao.availableSkillIds = ["water-river-palm"];
    state.combatAttributes.physicalPower = 200;
    state.combatAttributes.energyRecovery = 8;
    state.cultivationAttributes.criticalInsight = 250;
    const started = startCombat(state, ENEMY_ARCHETYPES[0]);
    const combat = started.combat as CombatState;
    for (const type of Object.values(EnergyType)) {
      combat.combatEnergyPool[type] = 500;
    }

    const result = combatTick(combat, {
      attributes: started.combatAttributes,
      criticalInsight: started.cultivationAttributes.criticalInsight,
      t2Nodes: started.t2Nodes,
      random: () => 0
    });

    expect(result.combat.enemyHp).toBeLessThan(ENEMY_ARCHETYPES[0].hp);
    expect(result.combat.combatTick).toBe(1);
    expect(result.combat.currentSkillIndex).toBe(0);
    expect(result.combat.ticksUntilNextSkill).toBeGreaterThan(0);
  });

  it("skill category formulas route damage and effects correctly", () => {
    const state = buildInitialGameState();
    const enemy = ENEMY_ARCHETYPES[2];
    const started = startCombat(state, enemy);
    const combat = started.combat as CombatState;
    started.combatAttributes.physicalPower = 100;
    started.combatAttributes.techniquePower = 200;
    started.combatAttributes.soulPower = 300;

    combat.rotation = ["earth-rumble-fist", "fire-phoenix-arc", "void-soul-shear", "wind-voidstep", "earth-crag-guard"];
    combat.ticksUntilNextSkill = 0;
    for (const type of Object.values(EnergyType)) {
      combat.combatEnergyPool[type] = 10_000;
    }

    const initialEnemyHp = combat.enemyHp;
    const initialSoulHp = combat.enemySoulHp;
    const initialDodge = combat.dodgeCharges;
    combatTick(combat, { attributes: started.combatAttributes, criticalInsight: 0, t2Nodes: started.t2Nodes, random: () => 1 });
    combat.ticksUntilNextSkill = 0;
    combatTick(combat, { attributes: started.combatAttributes, criticalInsight: 0, t2Nodes: started.t2Nodes, random: () => 1 });
    combat.ticksUntilNextSkill = 0;
    combatTick(combat, { attributes: started.combatAttributes, criticalInsight: 0, t2Nodes: started.t2Nodes, random: () => 1 });
    combat.ticksUntilNextSkill = 0;
    combatTick(combat, { attributes: started.combatAttributes, criticalInsight: 0, t2Nodes: started.t2Nodes, random: () => 1 });
    combat.ticksUntilNextSkill = 0;
    combatTick(combat, { attributes: started.combatAttributes, criticalInsight: 0, t2Nodes: started.t2Nodes, random: () => 1 });

    expect(combat.enemyHp).toBeLessThan(initialEnemyHp);
    expect(combat.enemySoulHp).toBeLessThan(initialSoulHp);
    expect(combat.dodgeCharges).toBeGreaterThan(initialDodge);
    expect(combat.combatEnergyPool[EnergyType.Qi]).toBeGreaterThan(0);
  });

  it("rollCrit respects capped critical chance", () => {
    expect(rollCrit(1_000, () => 0.49)).toBe(true);
    expect(rollCrit(1_000, () => 0.51)).toBe(false);
    expect(rollCrit(10, () => 0.05)).toBe(false);
  });

  it("checkCombatEnd requires both enemy hp bars depleted", () => {
    const state = buildInitialGameState();
    const started = startCombat(state, ENEMY_ARCHETYPES[0]);
    const combat = started.combat as CombatState;

    combat.enemyHp = 0;
    combat.enemySoulHp = 10;
    expect(checkCombatEnd(combat)).toBe("ongoing");

    combat.enemySoulHp = 0;
    expect(checkCombatEnd(combat)).toBe("player_win");

    combat.playerHp = 0;
    expect(checkCombatEnd(combat)).toBe("player_loss");
  });

  it("endCombat win grants drops and loss cracks nodes with 20% energy loss", () => {
    const winState = startCombat(buildInitialGameState(), ENEMY_ARCHETYPES[0]);
    const winResult = endCombat(winState, "player_win", () => 0);
    expect(winResult.droppedTreasures.length).toBeGreaterThan(0);
    expect(winResult.state.globalTrackers.combatCount).toBe(1);
    expect(winResult.state.specialEventFlags.has("event:combat_victory")).toBe(true);

    const lossBase = buildInitialGameState();
    for (const t2 of lossBase.t2Nodes.values()) {
      if (t2.state !== T2NodeState.ACTIVE) {
        t2.state = T2NodeState.ACTIVE;
      }
      for (const t1 of t2.t1Nodes.values()) {
        t1.energy[EnergyType.Qi] = 100;
      }
    }
    const lossStarted = startCombat(lossBase, ENEMY_ARCHETYPES[1]);
    const beforeLossEnergy = sumBodyEnergy(lossStarted);
    const lossResult = endCombat(lossStarted, "player_loss", () => 0.99);
    const afterLossEnergy = sumBodyEnergy(lossResult.state as ReturnType<typeof buildInitialGameState>);

    expect(afterLossEnergy).toBeCloseTo(beforeLossEnergy * 0.8, 5);
    expect(
      [...lossResult.state.t2Nodes.values()].filter((n) => n.nodeDamageState === "cracked").length
    ).toBeGreaterThan(0);
  });

  it("enemy preferred node targeting cracks node directly", () => {
    const state = buildInitialGameState();
    state.playerDao.availableSkillIds = ["earth-rumble-fist"];
    const started = startCombat(state, ENEMY_ARCHETYPES[2]);
    const combat = started.combat as CombatState;
    combat.enemy.attackSpeedTicks = 1;
    combat.ticksUntilNextSkill = 99;
    combat.rotation = [];

    combatTick(combat, {
      attributes: started.combatAttributes,
      criticalInsight: 0,
      t2Nodes: started.t2Nodes,
      random: () => 0
    });

    const target = started.t2Nodes.get("AJNA");
    expect(target?.nodeDamageState).toBe("cracked");
    expect(combat.playerHp).toBe(combat.playerMaxHp);
  });

  it("dao skill catalog remains available for combat rotation", () => {
    expect(DAO_SKILLS.length).toBeGreaterThan(40);
    expect(DAO_SKILLS.some((s) => s.category === "soul")).toBe(true);
  });
});

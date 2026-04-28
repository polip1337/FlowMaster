import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { checkRankBreakthroughs } from "../../../src/core/progression/rankController";
import {
  applyTribulationCombatTick,
  createTribulationEvent,
  startActiveTribulationCombat
} from "../../../src/core/progression/tribulationSystem";
import { simulationTick } from "../../../src/core/simulation/tick";

function makeNodeBreakthroughReady(state: ReturnType<typeof buildInitialGameState>, nodeId: string, rank: number): void {
  const node = state.t2Nodes.get(nodeId);
  if (!node) {
    return;
  }
  node.state = T2NodeState.ACTIVE;
  node.rank = rank;
  node.level = 9;
  for (const t2 of state.t2Nodes.values()) {
    t2.state = T2NodeState.ACTIVE;
    for (const t1 of t2.t1Nodes.values()) {
      t1.energy[EnergyType.Jing] = 50_000;
      t1.energy[EnergyType.Shen] = 50_000;
      t1.energy[EnergyType.Qi] = 50_000;
    }
  }
  for (const meridian of state.meridians.values()) {
    meridian.isEstablished = true;
    meridian.width = 10;
    meridian.purity = 1;
  }
  state.immediateConditionCheck = true;
}

function poolTotal(pool: Record<EnergyType, number>): number {
  return Object.values(EnergyType).reduce((sum, type) => sum + pool[type], 0);
}

describe("phase 19 tribulation events", () => {
  it("triggers tribulation instead of immediate breakthrough", () => {
    const state = buildInitialGameState();
    makeNodeBreakthroughReady(state, "MULADHARA", 1);

    const events = checkRankBreakthroughs(state);
    expect(events).toHaveLength(0);
    expect(state.tribulation.activeEvent).toBeTruthy();
    expect(state.tribulation.pendingBreakthrough?.nodeId).toBe("MULADHARA");
  });

  it("pauses internal routing during tribulation but keeps source generation", () => {
    const state = buildInitialGameState();
    const root = state.t2Nodes.get("MULADHARA");
    expect(root).toBeTruthy();
    if (!root) {
      return;
    }
    state.tribulation.activeEvent = createTribulationEvent(2);
    state.tribulation.isCultivationPaused = true;
    const source = [...root.t1Nodes.values()].find((n) => n.isSourceNode);
    const sourceBefore = source?.energy[EnergyType.Qi] ?? 0;
    const nonSourceBefore = [...root.t1Nodes.values()]
      .filter((n) => !n.isSourceNode)
      .reduce((sum, n) => sum + n.energy[EnergyType.Qi], 0);

    const next = simulationTick(state);
    const nextRoot = next.t2Nodes.get("MULADHARA");
    if (!nextRoot) {
      return;
    }
    const nextSource = [...nextRoot.t1Nodes.values()].find((n) => n.isSourceNode);
    const nonSourceAfter = [...nextRoot.t1Nodes.values()]
      .filter((n) => !n.isSourceNode)
      .reduce((sum, n) => sum + n.energy[EnergyType.Qi], 0);

    expect((nextSource?.energy[EnergyType.Qi] ?? 0)).toBeGreaterThan(sourceBefore);
    expect(nonSourceAfter).toBeCloseTo(nonSourceBefore, 6);
  });

  it("runs sequential waves without between-wave combat pool regeneration and grants success rewards", () => {
    const state = buildInitialGameState();
    state.playerDao.availableSkillIds = ["earth-rumble-fist"];
    const sahasrara = state.t2Nodes.get("SAHASRARA");
    if (sahasrara) {
      sahasrara.rank = 2;
    }
    makeNodeBreakthroughReady(state, "MULADHARA", 2);
    checkRankBreakthroughs(state);
    expect(state.tribulation.activeEvent).toBeTruthy();
    if (!state.tribulation.activeEvent) {
      return;
    }

    state.tribulation.activeEvent.enemyWave = state.tribulation.activeEvent.enemyWave.map((enemy) => ({
      ...enemy,
      hp: 1,
      soulHp: 0,
      physicalAttack: 0,
      soulAttack: 0
    }));

    const inCombat = startActiveTribulationCombat(state);
    expect(inCombat.combat).toBeTruthy();
    if (!inCombat.combat) {
      return;
    }
    const poolBefore = poolTotal(inCombat.combat.combatEnergyPool);

    inCombat.combat.enemyHp = 0;
    inCombat.combat.enemySoulHp = 0;
    applyTribulationCombatTick(inCombat, {
      attributes: inCombat.combatAttributes,
      criticalInsight: inCombat.cultivationAttributes.criticalInsight,
      t2Nodes: inCombat.t2Nodes,
      random: () => 0
    });
    const poolAfterTick = inCombat.combat ? poolTotal(inCombat.combat.combatEnergyPool) : 0;
    expect(poolAfterTick).toBeLessThanOrEqual(poolBefore);

    while (inCombat.tribulation.activeEvent && inCombat.combat) {
      inCombat.combat.enemyHp = 0;
      inCombat.combat.enemySoulHp = 0;
      applyTribulationCombatTick(inCombat, {
        attributes: inCombat.combatAttributes,
        criticalInsight: inCombat.cultivationAttributes.criticalInsight,
        t2Nodes: inCombat.t2Nodes,
        random: () => 0
      });
    }

    expect(inCombat.specialEventFlags.has("event:insight_library:tribulation_success")).toBe(true);
    expect(inCombat.tribulation.permanentCultivationRateBonus).toBeGreaterThan(0);

    const beforeRank = inCombat.t2Nodes.get("MULADHARA")?.rank ?? 0;
    const events = checkRankBreakthroughs(inCombat);
    expect(events.some((e) => e.nodeId === "MULADHARA")).toBe(true);
    expect((inCombat.t2Nodes.get("MULADHARA")?.rank ?? 0)).toBe(beforeRank + 1);
  });

  it("fails tribulation on timeout and applies delay plus cracked node penalty", () => {
    const state = buildInitialGameState();
    state.playerDao.availableSkillIds = [];
    makeNodeBreakthroughReady(state, "MULADHARA", 1);
    checkRankBreakthroughs(state);
    if (!state.tribulation.activeEvent) {
      return;
    }

    state.tribulation.activeEvent.enemyWave = state.tribulation.activeEvent.enemyWave.map((enemy) => ({
      ...enemy,
      hp: 999_999,
      soulHp: 999_999
    }));

    startActiveTribulationCombat(state);
    if (!state.tribulation.activeEvent || !state.combat) {
      return;
    }
    state.tribulation.elapsedTicks = state.tribulation.activeEvent.timeLimit - 1;

    applyTribulationCombatTick(
      state,
      {
        attributes: state.combatAttributes,
        criticalInsight: state.cultivationAttributes.criticalInsight,
        t2Nodes: state.t2Nodes,
        random: () => 1
      },
      () => 0
    );

    expect(state.tribulation.activeEvent).toBeNull();
    expect(state.tribulation.delayUntilTickByNode.MULADHARA).toBe(state.tick + 36_000);
    expect([...state.t2Nodes.values()].some((n) => n.nodeDamageState.cracked)).toBe(true);
  });
});

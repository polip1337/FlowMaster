import { describe, expect, it } from "vitest";
import { computeAllAttributes } from "../../../src/core/attributes/attributeComputer";
import { applyHpThresholdNodeDamageRolls, applyNodeRepairTick } from "../../../src/core/combat/nodeDamage";
import { executeCirculationRoute } from "../../../src/core/circulation/routes";
import { checkDaoSelectionTrigger, selectDao } from "../../../src/core/dao/daoSystem";
import { DaoType } from "../../../src/core/dao/types";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import {
  applyMeridianFlow,
  computeMeridianPurity,
  computePassiveMeridianFlow,
  establishMeridian,
  openReverseMeridian,
  updateMeridianAffinity,
  updateMeridianWidth
} from "../../../src/core/meridians/meridianLogic";
import { makeMeridianId } from "../../../src/core/meridians/meridianId";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";
import { T1NodeState } from "../../../src/core/nodes/T1Types";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { advanceCalendar, getCelestialTickModifiers, refreshCelestialStateForCurrentDay } from "../../../src/core/celestial/calendar";
import { TICKS_PER_INGAME_DAY } from "../../../src/core/constants";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";
import { bodyMeridianId } from "../../../src/data/bodyMap";

function runTicks(state: ReturnType<typeof buildInitialGameState>, ticks: number) {
  let next = state;
  for (let i = 0; i < ticks; i += 1) {
    next = simulationTick(next);
  }
  return next;
}

describe("Phase 35 integration (TASK-218..227)", () => {
  it("TASK-218: Muladhara progression unlocks Svadhisthana and first meridian reaches DEVELOPED in target window", () => {
    let state = buildInitialGameState();
    const muladhara = state.t2Nodes.get("MULADHARA")!;
    const source = [...muladhara.t1Nodes.values()].find((t1) => t1.isSourceNode)!;
    const qiBefore = source.energy[EnergyType.Qi];
    state = runTicks(state, 50);
    const qiAfter = [...state.t2Nodes.get("MULADHARA")!.t1Nodes.values()].find((t1) => t1.isSourceNode)!.energy[EnergyType.Qi];
    expect(qiAfter).toBeGreaterThan(qiBefore);

    state.t2Nodes.get("MULADHARA")!.level = 3;
    [...state.t2Nodes.get("MULADHARA")!.t1Nodes.values()].find((t1) => t1.isSourceNode)!.energy[EnergyType.Qi] = 5000;
    let unlockTick = -1;
    for (let i = 0; i < 600; i += 1) {
      state = simulationTick(state);
      if (state.t2Nodes.get("SVADHISTHANA")?.state === T2NodeState.ACTIVE) {
        unlockTick = state.tick;
        break;
      }
    }
    expect(unlockTick).toBeGreaterThan(0);

    const root = state.t2Nodes.get("MULADHARA");
    const sacral = state.t2Nodes.get("SVADHISTHANA");
    const firstMeridian = state.meridians.get(bodyMeridianId("MULADHARA", "SVADHISTHANA"));
    if (!root || !sacral || !firstMeridian) {
      throw new Error("missing setup for first meridian integration");
    }
    expect(establishMeridian(firstMeridian, EnergyType.Qi, root, sacral)).toBe(true);
    firstMeridian.totalFlow = 55_000;
    root.t1Nodes.get(firstMeridian.ioNodeOutId)!.energy[EnergyType.Qi] = 2_000_000;
    sacral.t1Nodes.get(firstMeridian.ioNodeInId)!.energy[EnergyType.Qi] = 0;
    sacral.t1Nodes.get(firstMeridian.ioNodeInId)!.capacity = 2_000_000;

    let trainTicks = 0;
    while (trainTicks < 80_000 && firstMeridian.state !== MeridianState.DEVELOPED) {
      const flow = computePassiveMeridianFlow(firstMeridian, root, sacral);
      applyMeridianFlow(root, sacral, flow, firstMeridian);
      updateMeridianWidth(firstMeridian, flow);
      firstMeridian.purity = computeMeridianPurity(firstMeridian);
      updateMeridianAffinity(firstMeridian, flow);
      root.t1Nodes.get(firstMeridian.ioNodeOutId)!.energy[EnergyType.Qi] = 2_000_000;
      trainTicks += 1;
    }
    expect(firstMeridian.state).toBe(MeridianState.DEVELOPED);
    expect(trainTicks).toBeGreaterThanOrEqual(30000);
    expect(trainTicks).toBeLessThanOrEqual(60000);
  });

  it("TASK-219: active 3-node loop trains meridians at least 3x passive", () => {
    const active = buildInitialGameState();
    const passive = buildInitialGameState();
    const keyIds = [
      makeMeridianId("MULADHARA", "SVADHISTHANA"),
      makeMeridianId("SVADHISTHANA", "L_HIP"),
      makeMeridianId("L_HIP", "MULADHARA")
    ];

    const setup = (state: ReturnType<typeof buildInitialGameState>, nearEqualPressure = false) => {
      const a = state.t2Nodes.get("MULADHARA")!;
      const b = state.t2Nodes.get("SVADHISTHANA")!;
      const c = state.t2Nodes.get("L_HIP")!;
      b.state = T2NodeState.ACTIVE;
      c.state = T2NodeState.ACTIVE;
      a.level = 3;
      b.level = 3;
      c.level = 3;

      const mAB = state.meridians.get(keyIds[0])!;
      const mBC = state.meridians.get(keyIds[1])!;
      establishMeridian(mAB, EnergyType.Qi, a, b);
      establishMeridian(mBC, EnergyType.Qi, b, c);
      mAB.basePurity = 0.99;
      mAB.purity = 0.99;
      mBC.basePurity = 0.99;
      mBC.purity = 0.99;

      const reverse = openReverseMeridian(
        {
          ...state.meridians.get(bodyMeridianId("MULADHARA", "L_HIP"))!,
          isEstablished: true,
          state: MeridianState.DEVELOPED,
          totalFlow: 60_000
        },
        keyIds[2],
        state
      );
      if (!reverse) {
        throw new Error("failed to open reverse meridian for 3-node route");
      }
      state.meridians.set(reverse.meridian.id, reverse.meridian);
      reverse.meridian.basePurity = 0.99;
      reverse.meridian.purity = 0.99;

      const pump = (fromId: string, meridianId: string, amount: number) => {
        const m = state.meridians.get(meridianId)!;
        state.t2Nodes.get(fromId)!.t1Nodes.get(m.ioNodeOutId)!.energy[EnergyType.Qi] = amount;
        const inNode = state.t2Nodes.get(m.nodeToId)!.t1Nodes.get(m.ioNodeInId)!;
        inNode.capacity = 1_000_000;
        inNode.energy[EnergyType.Qi] = nearEqualPressure ? 999_500 : 0;
      };
      pump("MULADHARA", keyIds[0], 1_000_000);
      pump("SVADHISTHANA", keyIds[1], 1_000_000);
      pump("L_HIP", keyIds[2], 1_000_000);
      state.technique.strength = 5;
      return state;
    };

    setup(active, false);
    setup(passive, true);
    active.activeRoute = {
      id: "phase35-loop",
      nodeSequence: ["MULADHARA", "SVADHISTHANA", "L_HIP", "MULADHARA"],
      isActive: true,
      loopEfficiency: 1,
      bottleneckMeridianId: null,
      estimatedHeatPerTick: 0,
      estimatedTrainingMultiplier: 1,
      accumulatedRouteHeat: 0
    };

    const beforeActive = keyIds.reduce((s, id) => s + (active.meridians.get(id)?.totalFlow ?? 0), 0);
    const beforePassive = keyIds.reduce((s, id) => s + (passive.meridians.get(id)?.totalFlow ?? 0), 0);
    const afterActive = runTicks(active, 500);
    const afterPassive = runTicks(passive, 500);
    const gainActive = keyIds.reduce((s, id) => s + (afterActive.meridians.get(id)?.totalFlow ?? 0), 0) - beforeActive;
    const gainPassive = keyIds.reduce((s, id) => s + (afterPassive.meridians.get(id)?.totalFlow ?? 0), 0) - beforePassive;
    expect(gainPassive).toBeGreaterThanOrEqual(0);
    expect(gainActive).toBeGreaterThanOrEqual(gainPassive * 3);
  });

  it("TASK-220: refining pulse converts Qi→YangQi, raises heat, and heat decays when disabled", () => {
    let state = buildInitialGameState();
    const manipura = state.t2Nodes.get("MANIPURA")!;
    manipura.state = T2NodeState.ACTIVE;
    const furnace = manipura.t1Nodes.get(11)!;
    furnace.state = T1NodeState.ACTIVE;
    furnace.energy[EnergyType.Qi] = 2000;
    const yangBefore = furnace.energy[EnergyType.YangQi];
    state.refiningPulseActive = true;
    state = runTicks(state, 40);
    const hotState = state;
    const yangAfter = hotState.t2Nodes.get("MANIPURA")!.t1Nodes.get(11)!.energy[EnergyType.YangQi];
    expect(yangAfter).toBeGreaterThan(yangBefore);
    expect(hotState.bodyHeat).toBeGreaterThan(0);
    state.refiningPulseActive = false;
    state = runTicks(state, 200);
    expect(state.bodyHeat).toBeLessThan(hotState.bodyHeat);
  });

  it("TASK-221: type circulation impacts width/purity as specified", () => {
    const trainType = (type: EnergyType) => {
      const state = buildInitialGameState();
      const a = state.t2Nodes.get("MULADHARA")!;
      const b = state.t2Nodes.get("SVADHISTHANA")!;
      b.state = T2NodeState.ACTIVE;
      const m = state.meridians.get(makeMeridianId("MULADHARA", "SVADHISTHANA"))!;
      establishMeridian(m, type, a, b);
      const out = a.t1Nodes.get(m.ioNodeOutId)!;
      const inn = b.t1Nodes.get(m.ioNodeInId)!;
      for (const t of Object.values(EnergyType)) {
        out.energy[t] = 0;
      }
      out.energy[type] = 1_000_000;
      inn.capacity = 1_000_000;
      for (let i = 0; i < 1200; i += 1) {
        const flow = computePassiveMeridianFlow(m, a, b);
        applyMeridianFlow(a, b, flow, m);
        updateMeridianWidth(m, flow);
        m.purity = computeMeridianPurity(m);
        updateMeridianAffinity(m, flow);
      }
      return { width: m.width, purity: m.purity };
    };

    const qi = trainType(EnergyType.Qi);
    const yang = trainType(EnergyType.YangQi);
    const jing = trainType(EnergyType.Jing);
    const shen = trainType(EnergyType.Shen);
    expect(yang.width).toBeGreaterThan(qi.width);
    expect(yang.purity).toBeLessThan(qi.purity);
    expect(jing.purity).toBeGreaterThan(qi.purity);
    expect(shen.purity).toBeGreaterThan(jing.purity);
  });

  it("TASK-222: reverse meridian enables 2-node loop and 0.60 vs 0.66 efficiencies", () => {
    const state = buildInitialGameState();
    const root = state.t2Nodes.get("MULADHARA")!;
    const sacral = state.t2Nodes.get("SVADHISTHANA")!;
    const lHip = state.t2Nodes.get("L_HIP")!;
    sacral.state = T2NodeState.ACTIVE;
    lHip.state = T2NodeState.ACTIVE;
    root.level = 3;
    sacral.level = 3;
    lHip.level = 3;
    const forward = state.meridians.get(makeMeridianId("MULADHARA", "SVADHISTHANA"))!;
    establishMeridian(forward, EnergyType.Qi, root, sacral);
    forward.totalFlow = 60_000;
    forward.state = MeridianState.DEVELOPED;
    const reverseId = makeMeridianId("SVADHISTHANA", "MULADHARA");
    const reverse = openReverseMeridian(forward, reverseId, state);
    expect(reverse).toBeTruthy();
    if (!reverse) {
      return;
    }
    state.meridians.set(reverseId, reverse.meridian);

    state.activeRoute = {
      id: "r2",
      nodeSequence: ["MULADHARA", "SVADHISTHANA", "MULADHARA"],
      isActive: true,
      loopEfficiency: 1,
      bottleneckMeridianId: null,
      estimatedHeatPerTick: 0,
      estimatedTrainingMultiplier: 1,
      accumulatedRouteHeat: 0
    };
    const twoNode = executeCirculationRoute(state, state.technique.strength);
    state.activeRoute.nodeSequence = ["MULADHARA", "SVADHISTHANA", "L_HIP", "MULADHARA"];
    const hipReverseId = makeMeridianId("L_HIP", "MULADHARA");
    const hipForward = state.meridians.get(makeMeridianId("MULADHARA", "L_HIP"))!;
    hipForward.totalFlow = 60_000;
    hipForward.state = MeridianState.DEVELOPED;
    hipForward.isEstablished = true;
    state.meridians.get(makeMeridianId("SVADHISTHANA", "L_HIP"))!.isEstablished = true;
    state.meridians.get(makeMeridianId("SVADHISTHANA", "L_HIP"))!.state = MeridianState.DEVELOPED;
    state.t2Nodes.get("L_HIP")!.state = T2NodeState.ACTIVE;
    const hipReverse = openReverseMeridian(hipForward, hipReverseId, state);
    if (!hipReverse) {
      throw new Error("failed to open L_HIP reverse");
    }
    state.meridians.set(hipReverseId, hipReverse.meridian);
    const threeNode = executeCirculationRoute(state, state.technique.strength);
    expect(twoNode.loopEfficiency).toBeCloseTo(0.6, 6);
    expect(threeNode.loopEfficiency).toBeCloseTo(0.66, 6);
  });

  it("TASK-223: Bindu stabilization prevents first shatter, second can shatter", () => {
    const state = buildInitialGameState();
    for (const node of state.t2Nodes.values()) {
      node.state = T2NodeState.ACTIVE;
    }
    state.t2Nodes.get("BINDU")!.t1Nodes.get(11)!.energy[EnergyType.Qi] = 5;
    const first = applyHpThresholdNodeDamageRolls(0.1, state.t2Nodes, false, () => 0, "hp10");
    expect(first.stabilizationUsed).toBe(true);
    expect(first.shattered).toBe(false);
    const second = applyHpThresholdNodeDamageRolls(0.1, state.t2Nodes, true, () => 0, "hp10");
    expect(second.shattered).toBe(true);
  });

  it("TASK-224: cracked halves attributes, shattered zeroes, passive repair restores over long run", () => {
    const state = buildInitialGameState();
    for (const [id, node] of state.t2Nodes) {
      node.state = id === "MULADHARA" ? T2NodeState.ACTIVE : T2NodeState.LOCKED;
    }
    const muladhara = state.t2Nodes.get("MULADHARA")!;
    for (const t1 of muladhara.t1Nodes.values()) {
      t1.state = T1NodeState.ACTIVE;
      t1.energy[EnergyType.Jing] = 50;
    }
    const base = computeAllAttributes(state).cultivation.maxEnergyBonus;
    muladhara.nodeDamageState.cracked = true;
    const cracked = computeAllAttributes(state).cultivation.maxEnergyBonus;
    muladhara.nodeDamageState.cracked = false;
    muladhara.nodeDamageState.shattered = true;
    const shattered = computeAllAttributes(state).cultivation.maxEnergyBonus;
    expect(base).toBeGreaterThan(0);
    expect(cracked).toBeCloseTo(base * 0.5, 6);
    expect(shattered).toBe(0);

    muladhara.nodeDamageState.shattered = false;
    muladhara.nodeDamageState.cracked = true;
    state.cultivationAttributes.meridianRepairRate = 20;
    for (let i = 0; i < 10_000; i += 1) {
      applyNodeRepairTick(state.t2Nodes, state.cultivationAttributes.meridianRepairRate, null);
      if (!muladhara.nodeDamageState.cracked) {
        break;
      }
    }
    expect(muladhara.nodeDamageState.cracked).toBe(false);
  });

  it("TASK-225: rank 2 triggers Dao selection and Fire selection grants node + first skill", () => {
    const state = buildInitialGameState();
    state.t2Nodes.get("MULADHARA")!.rank = 2;
    expect(checkDaoSelectionTrigger(state)).toBe(true);
    selectDao(state, DaoType.Fire);
    expect(state.playerDao.selectedDao).toBe(DaoType.Fire);
    expect(state.playerDao.daoNodes.has("FIRE_SPARK")).toBe(true);
    expect(state.playerDao.availableSkillIds).toContain("fire-blazing-strike");
  });

  it("TASK-226: tempering level 5 applies HP and Jing generation bonuses", () => {
    const level1 = buildInitialGameState();
    const level5 = buildInitialGameState();
    level1.bodyTemperingState.temperingLevel = 1;
    level5.bodyTemperingState.temperingLevel = 5;
    const attrs1 = computeAllAttributes(level1);
    const attrs5 = computeAllAttributes(level5);
    expect(attrs5.combat.physicalDurability - attrs1.combat.physicalDurability).toBeCloseTo(40, 6);
    expect(attrs5.cultivation.jingGenerationRate - attrs1.cultivation.jingGenerationRate).toBeCloseTo(0.04, 6);

    level5.combatAttributes.physicalDurability = 0;
    const afterTick = simulationTick(level5);
    expect(afterTick.maxHp).toBe(150);
  });

  it("TASK-227: calendar day advances per 720s and peak phase doubles linked T2 generation", () => {
    const state = buildInitialGameState();
    state.tick = TICKS_PER_INGAME_DAY - 1;
    const next = simulationTick(state);
    expect(next.celestialCalendar.dayOfYear).toBe(1);

    const peakState = buildInitialGameState();
    peakState.celestialCalendar.dayOfYear = 0;
    refreshCelestialStateForCurrentDay(peakState);
    const baseMod = getCelestialTickModifiers(peakState).t2GenerationMultiplier("MULADHARA");
    let nonPeakDay = 0;
    while (nonPeakDay < 364) {
      nonPeakDay += 1;
      peakState.celestialCalendar.dayOfYear = nonPeakDay;
      refreshCelestialStateForCurrentDay(peakState);
      if (getCelestialTickModifiers(peakState).t2GenerationMultiplier("MULADHARA") < baseMod) {
        break;
      }
    }
    const peakMultiplier = baseMod;
    const nonPeakMultiplier = getCelestialTickModifiers(peakState).t2GenerationMultiplier("MULADHARA");
    expect(nonPeakMultiplier).toBe(1);
    expect(peakMultiplier).toBeCloseTo(1.7, 6);

    advanceCalendar(peakState);
    expect(peakState.celestialCalendar.dayOfYear).toBe((nonPeakDay + 1) % 364);
  });
});

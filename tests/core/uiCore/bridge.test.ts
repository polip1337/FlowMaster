import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory.ts";
import {
  applyUiInputsToCoreState,
  mirrorCoreStateToUi,
  normalizeToCoreMeridianId,
  routeNodeSequenceToMeridianIds,
  runUiDrivenCoreTick
} from "../../../src/uiCore/bridge.ts";
import { EnergyType } from "../../../src/core/energy/EnergyType.ts";

describe("uiCore bridge contracts", () => {
  it("normalizes legacy and core meridian ids to canonical format", () => {
    expect(normalizeToCoreMeridianId("MULADHARA->SVADHISTHANA")).toBe("MULADHARA::SVADHISTHANA");
    expect(normalizeToCoreMeridianId("MULADHARA::SVADHISTHANA")).toBe("MULADHARA::SVADHISTHANA");
  });

  it("builds canonical route meridian ids from node sequences", () => {
    expect(routeNodeSequenceToMeridianIds(["MULADHARA", "SVADHISTHANA", "MULADHARA"])).toEqual([
      "MULADHARA::SVADHISTHANA",
      "SVADHISTHANA::MULADHARA"
    ]);
  });

  it("applies UI route/toggle inputs and advances one core tick", () => {
    const state = buildInitialGameState();
    const withUiInputs = applyUiInputsToCoreState(state, {
      refiningPulseActive: true,
      activeBodyRouteNodeIds: ["MULADHARA", "SVADHISTHANA", "MULADHARA"]
    });
    expect(withUiInputs.refiningPulseActive).toBe(true);
    expect(withUiInputs.activeRoute?.isActive).toBe(true);
    expect(withUiInputs.activeRoute?.nodeSequence).toEqual(["MULADHARA", "SVADHISTHANA", "MULADHARA"]);

    const afterTick = runUiDrivenCoreTick(state, {
      refiningPulseActive: true,
      activeBodyRouteNodeIds: ["MULADHARA", "SVADHISTHANA", "MULADHARA"]
    });
    expect(afterTick.tick).toBe(state.tick + 1);
    expect(afterTick.refiningPulseActive).toBe(true);
  });

  it("maps mirrored T2 damage/rank state to deterministic UI ids", () => {
    const core = buildInitialGameState();
    const bindu = core.t2Nodes.get("BINDU");
    const ajna = core.t2Nodes.get("AJNA");
    if (!bindu || !ajna) throw new Error("Expected BINDU and AJNA in initial game state.");
    bindu.rank = 4;
    bindu.nodeDamageState.cracked = true;
    bindu.nodeDamageState.repairProgress = 0.42;
    const yinNode = ajna.t1Nodes.get(0);
    const yangNode = ajna.t1Nodes.get(5);
    if (!yinNode || !yangNode) throw new Error("Expected Ajna lobe nodes.");
    yinNode.energy[EnergyType.Shen] = 180;
    yangNode.energy[EnergyType.YangQi] = 40;
    const ui = {
      tickCounter: 0,
      bodyHeat: 0,
      maxBodyHeat: 0,
      refiningPulseActive: false,
      temperingLevel: 1,
      temperingXp: 0,
      temperingAction: "",
      daoSelected: null,
      daoInsights: 0,
      daoComprehensionLevel: 0,
      combatEncountered: false,
      combatPhase: "prep" as const,
      combatTick: 0,
      combatPlayerHp: 0,
      combatPlayerMaxHp: 0,
      combatPlayerSoulHp: 0,
      combatPlayerMaxSoulHp: 0,
      combatEnemyHp: 0,
      combatEnemyMaxHp: 0,
      combatEnemySoulHp: 0,
      combatEnemyMaxSoulHp: 0,
      celestialDayOfYear: 0,
      celestialSeason: "Spring" as const,
      celestialActiveConjunctions: [],
      celestialBodies: [],
      sectJoinedId: null,
      sectElderFavorLevels: {},
      unlockedTechniques: [],
      t2NodeRanks: {},
      coreActiveRouteLength: 0,
      circulationSpeedPercent: 0,
      t2DamageById: {},
      binduReserveRatio: 0,
      ajnaYinRatio: 0.5,
      ajnaYangRatio: 0.5,
      ajnaImbalanceSeverity: 0
    };
    mirrorCoreStateToUi(core, ui);
    expect(ui.t2NodeRanks.crown).toBe(4);
    expect(ui.t2DamageById.crown).toEqual({ cracked: true, shattered: false, repairProgress: 0.42 });
    expect(ui.binduReserveRatio).toBeGreaterThanOrEqual(0);
    expect(ui.ajnaYinRatio).toBeGreaterThan(ui.ajnaYangRatio);
    expect(ui.ajnaImbalanceSeverity).toBeGreaterThan(0.2);
  });
});

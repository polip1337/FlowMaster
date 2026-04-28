import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { checkAndUnlockT2Nodes } from "../../../src/core/progression/unlockController";
import { checkLevelUps } from "../../../src/core/progression/levelController";
import { checkRankBreakthroughs } from "../../../src/core/progression/rankController";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import { T2NodeState } from "../../../src/core/nodes/T2Types";

describe("phase 11 progression controllers", () => {
  it("unlocks nodes on throttled tick cadence", () => {
    const state = buildInitialGameState();
    const svadhisthana = state.t2Nodes.get("SVADHISTHANA");
    expect(svadhisthana).toBeTruthy();
    if (!svadhisthana) {
      return;
    }

    svadhisthana.unlockConditions = [];
    state.tick = 29;
    state.immediateConditionCheck = false;
    const events = checkAndUnlockT2Nodes(state);

    expect(events.some((e) => e.nodeId === "SVADHISTHANA")).toBe(true);
    expect(svadhisthana.state).toBe(T2NodeState.ACTIVE);
  });

  it("enforces anahata shoulder-level constraint for level-up", () => {
    const state = buildInitialGameState();
    const anahata = state.t2Nodes.get("ANAHATA");
    const leftShoulder = state.t2Nodes.get("L_SHOULDER");
    const rightShoulder = state.t2Nodes.get("R_SHOULDER");
    expect(anahata && leftShoulder && rightShoulder).toBeTruthy();
    if (!anahata || !leftShoulder || !rightShoulder) {
      return;
    }

    anahata.state = T2NodeState.ACTIVE;
    anahata.level = 2;
    anahata.upgradeConditions = [];
    leftShoulder.level = 2;
    rightShoulder.level = 2;
    state.tick = 9;
    state.immediateConditionCheck = false;

    const blockedEvents = checkLevelUps(state);
    expect(blockedEvents.some((e) => e.nodeId === "ANAHATA")).toBe(false);
    expect(anahata.level).toBe(2);

    leftShoulder.level = 3;
    rightShoulder.level = 3;
    const allowedEvents = checkLevelUps(state);
    expect(allowedEvents.some((e) => e.nodeId === "ANAHATA" && e.toLevel === 3)).toBe(true);
    expect(anahata.level).toBe(3);
  });

  it("blocks non-sahasrara rank-ups beyond realm cap", () => {
    const state = buildInitialGameState();
    const manipura = state.t2Nodes.get("MANIPURA");
    const sahasrara = state.t2Nodes.get("SAHASRARA");
    expect(manipura && sahasrara).toBeTruthy();
    if (!manipura || !sahasrara) {
      return;
    }

    manipura.state = T2NodeState.ACTIVE;
    manipura.rank = 3;
    manipura.level = 9;
    sahasrara.rank = 1;
    for (const t2 of state.t2Nodes.values()) {
      t2.state = T2NodeState.ACTIVE;
    }
    for (const t2 of state.t2Nodes.values()) {
      for (const t1 of t2.t1Nodes.values()) {
        t1.energy[EnergyType.Jing] = 10000;
        t1.energy[EnergyType.Shen] = 10000;
      }
    }
    for (const m of state.meridians.values()) {
      m.isEstablished = true;
      m.width = 10;
      m.purity = 1;
    }
    state.tick = 29;
    state.immediateConditionCheck = false;

    const events = checkRankBreakthroughs(state);
    expect(events.some((e) => e.nodeId === "MANIPURA")).toBe(false);
    expect(manipura.rank).toBe(3);
  });
});

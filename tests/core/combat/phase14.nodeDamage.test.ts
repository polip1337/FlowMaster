import { describe, expect, it } from "vitest";
import {
  applyHpThresholdNodeDamageRolls,
  applyNodeRepairTick,
  getBinduReserve,
  spendBinduReserve
} from "../../../src/core/combat/nodeDamage";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import { T1NodeState } from "../../../src/core/nodes/T1Types";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { simulationTick } from "../../../src/core/simulation/tick";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";

describe("phase 14 hp/soul and node damage", () => {
  it("tracks hp/soul pools and regenerates out of combat", () => {
    let state = buildInitialGameState();
    state.hp = 12;
    state.soulHp = 7;
    state = simulationTick(state);
    expect(state.hp).toBeGreaterThan(12);
    expect(state.soulHp).toBeCloseTo(7.1, 6);
  });

  it("rolls crack at <=30% hp and shatter prevention via bindu reserve at <=10%", () => {
    const state = buildInitialGameState();
    for (const node of state.t2Nodes.values()) {
      node.state = T2NodeState.ACTIVE;
    }

    const bindu = state.t2Nodes.get("BINDU");
    const reserveNode = bindu?.t1Nodes.get(11);
    if (reserveNode) {
      reserveNode.energy[EnergyType.Qi] = 5;
    }
    const beforeReserve = getBinduReserve(state.t2Nodes);

    const crackRoll = applyHpThresholdNodeDamageRolls(0.3, state.t2Nodes, false, () => 0);
    expect(crackRoll.cracked).toBe(true);

    const shatterRoll = applyHpThresholdNodeDamageRolls(0.1, state.t2Nodes, false, () => 0);
    expect(shatterRoll.shattered).toBe(false);
    expect(shatterRoll.stabilizationUsed).toBe(true);
    expect(getBinduReserve(state.t2Nodes)).toBeLessThan(beforeReserve);
  });

  it("shatters active node when critical hp and no stabilization reserve", () => {
    const state = buildInitialGameState();
    for (const node of state.t2Nodes.values()) {
      node.state = T2NodeState.ACTIVE;
    }
    spendBinduReserve(state.t2Nodes, Number.POSITIVE_INFINITY);

    const roll = applyHpThresholdNodeDamageRolls(0.1, state.t2Nodes, true, () => 0);
    expect(roll.shattered).toBe(true);

    const shatteredNode = [...state.t2Nodes.values()].find((node) => node.nodeDamageState.shattered);
    expect(shatteredNode).toBeTruthy();
    expect([...shatteredNode!.t1Nodes.values()].every((t1) => t1.state === T1NodeState.UNSEALED)).toBe(true);
  });

  it("does not crack during hp10-only roll phase", () => {
    const state = buildInitialGameState();
    for (const node of state.t2Nodes.values()) {
      node.state = T2NodeState.ACTIVE;
    }
    spendBinduReserve(state.t2Nodes, Number.POSITIVE_INFINITY);

    const roll = applyHpThresholdNodeDamageRolls(0.1, state.t2Nodes, true, () => 0, "hp10");
    expect(roll.cracked).toBe(false);
    expect(roll.shattered).toBe(true);
  });

  it("repairs damaged nodes passively and faster with active repair toggle", () => {
    const passiveState = buildInitialGameState();
    const damagedPassive = passiveState.t2Nodes.get("MULADHARA")!;
    damagedPassive.nodeDamageState.cracked = true;
    for (const t1 of damagedPassive.t1Nodes.values()) {
      t1.energy[EnergyType.Jing] = 40;
    }
    applyNodeRepairTick(passiveState.t2Nodes, 10, null);
    const passiveProgress = damagedPassive.nodeDamageState.repairProgress;
    expect(passiveProgress).toBeGreaterThan(0);

    const activeState = buildInitialGameState();
    const damagedActive = activeState.t2Nodes.get("MULADHARA")!;
    damagedActive.nodeDamageState.cracked = true;
    for (const t1 of damagedActive.t1Nodes.values()) {
      t1.energy[EnergyType.Jing] = 40;
    }
    const bodyJingBefore = [...activeState.t2Nodes.values()].reduce((sum, t2) => {
      return sum + [...t2.t1Nodes.values()].reduce((s, t1) => s + t1.energy[EnergyType.Jing], 0);
    }, 0);
    applyNodeRepairTick(activeState.t2Nodes, 10, "MULADHARA");
    const bodyJingAfter = [...activeState.t2Nodes.values()].reduce((sum, t2) => {
      return sum + [...t2.t1Nodes.values()].reduce((s, t1) => s + t1.energy[EnergyType.Jing], 0);
    }, 0);

    expect(damagedActive.nodeDamageState.repairProgress).toBeGreaterThan(passiveProgress);
    expect(bodyJingAfter).toBeLessThan(bodyJingBefore);
  });
});

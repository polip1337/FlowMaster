import { describe, expect, it } from "vitest";
import { computeAllAttributes } from "../../../src/core/attributes/attributeComputer";
import { EnergyType, emptyPool } from "../../../src/core/energy/EnergyType";
import { establishMeridian, updateMeridianWidth } from "../../../src/core/meridians/meridianLogic";
import { makeMeridianId } from "../../../src/core/meridians/meridianId";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";
import { T1NodeState } from "../../../src/core/nodes/T1Types";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";

describe("computeAllAttributes", () => {
  it("aggregates active node contributions and includes meridian flow bonus", () => {
    const state = buildInitialGameState();

    for (const node of state.t2Nodes.values()) {
      node.state = T2NodeState.ACTIVE;
      node.level = 3;
      node.rank = 2;
      for (const t1 of node.t1Nodes.values()) {
        t1.state = T1NodeState.ACTIVE;
      }
    }

    const rootToSacral = state.meridians.get(makeMeridianId("MULADHARA", "SVADHISTHANA"));
    const root = state.t2Nodes.get("MULADHARA");
    const sacral = state.t2Nodes.get("SVADHISTHANA");
    if (!rootToSacral || !root || !sacral) {
      throw new Error("test setup failed");
    }
    establishMeridian(rootToSacral, EnergyType.Qi, root, sacral);
    rootToSacral.state = MeridianState.REFINED;
    rootToSacral.totalFlow = 500_000;
    rootToSacral.purity = 0.9;
    updateMeridianWidth(rootToSacral, { ...emptyPool(), [EnergyType.Qi]: 20 });

    const attrs = computeAllAttributes(state);
    expect(attrs.cultivation.maxEnergyBonus).toBeGreaterThan(0);
    expect(attrs.cultivation.circulationSpeed).toBeGreaterThan(0);
    expect(attrs.cultivation.refinementRate).toBeGreaterThan(0);
    expect(attrs.combat.physicalPower).toBeGreaterThan(0);
    expect(attrs.combat.techniquePower).toBeGreaterThan(0);
  });

  it("applies Ajna lobe imbalance penalty to critical insight", () => {
    const state = buildInitialGameState();
    const ajna = state.t2Nodes.get("AJNA");
    if (!ajna) {
      throw new Error("AJNA not found");
    }
    ajna.state = T2NodeState.ACTIVE;

    for (let i = 0; i <= 9; i += 1) {
      const t1 = ajna.t1Nodes.get(i);
      if (!t1) {
        continue;
      }
      t1.state = T1NodeState.ACTIVE;
      t1.energy = emptyPool();
    }

    // Balanced lobes: equal total energy in nodes 0-4 and 5-9.
    for (let i = 0; i <= 4; i += 1) {
      const t1 = ajna.t1Nodes.get(i);
      if (t1) {
        t1.energy[EnergyType.Qi] = 10;
      }
    }
    for (let i = 5; i <= 9; i += 1) {
      const t1 = ajna.t1Nodes.get(i);
      if (t1) {
        t1.energy[EnergyType.Qi] = 10;
      }
    }
    const balanced = computeAllAttributes(state).cultivation.criticalInsight;

    // Fully imbalanced: all lobe energy on yin side.
    for (let i = 5; i <= 9; i += 1) {
      const t1 = ajna.t1Nodes.get(i);
      if (t1) {
        t1.energy = emptyPool();
      }
    }
    const imbalanced = computeAllAttributes(state).cultivation.criticalInsight;
    expect(imbalanced).toBeLessThan(balanced);
  });
});

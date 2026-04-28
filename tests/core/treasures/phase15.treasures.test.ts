import { describe, expect, it } from "vitest";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import { simulationTick } from "../../../src/core/simulation/tick";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { applyTreasure, rollDrops } from "../../../src/core/treasures/treasureSystem";
import { TreasureType, type Treasure } from "../../../src/core/treasures/types";
import { ENEMY_ARCHETYPES } from "../../../src/data/enemies/archetypes";

function addInventoryItem(state: ReturnType<typeof buildInitialGameState>, item: Treasure): void {
  state.inventory.push(item);
}

describe("phase 15 treasure and inventory system", () => {
  it("defines all required treasure types", () => {
    expect(Object.values(TreasureType)).toEqual(
      expect.arrayContaining([
        TreasureType.CondensedEssencePill,
        TreasureType.RefiningStone,
        TreasureType.MeridianSalve,
        TreasureType.JingDeposit,
        TreasureType.DaoFragment,
        TreasureType.RecoveryElixir,
        TreasureType.FormationArray,
        TreasureType.CultivationManual
      ])
    );
  });

  it("applyTreasure routes effects, validates target type, and decrements quantity", () => {
    const state = buildInitialGameState();
    const t2 = state.t2Nodes.get("MULADHARA");
    expect(t2).toBeTruthy();
    const sourceT1 = [...(t2?.t1Nodes.values() ?? [])].find((n) => n.isSourceNode);
    expect(sourceT1).toBeTruthy();

    const pill: Treasure = {
      id: "pill-1",
      type: TreasureType.CondensedEssencePill,
      tier: 2,
      quantity: 2,
      effect: { energyType: EnergyType.Qi, amount: 50 }
    };
    addInventoryItem(state, pill);
    const beforeQi = sourceT1?.energy[EnergyType.Qi] ?? 0;
    const afterPill = applyTreasure(pill, "MULADHARA:0", state);
    const afterPillSource = afterPill.t2Nodes.get("MULADHARA")?.t1Nodes.get(0);
    expect(afterPillSource?.energy[EnergyType.Qi]).toBeGreaterThan(beforeQi);
    expect(afterPill.inventory.find((t) => t.id === "pill-1")?.quantity).toBe(1);

    const stone: Treasure = {
      id: "stone-1",
      type: TreasureType.RefiningStone,
      tier: 1,
      quantity: 1,
      effect: { qualityGain: 1 }
    };
    addInventoryItem(afterPill, stone);
    const beforeQuality = afterPill.t2Nodes.get("MULADHARA")?.t1Nodes.get(0)?.quality ?? 1;
    const afterStone = applyTreasure(stone, "MULADHARA:0", afterPill);
    expect(afterStone.t2Nodes.get("MULADHARA")?.t1Nodes.get(0)?.quality).toBe(beforeQuality + 1);

    const badTargetStone: Treasure = {
      id: "stone-bad",
      type: TreasureType.RefiningStone,
      tier: 1,
      quantity: 1,
      effect: { qualityGain: 1 }
    };
    addInventoryItem(afterStone, badTargetStone);
    expect(() => applyTreasure(badTargetStone, "MULADHARA", afterStone)).toThrow();
  });

  it("rollDrops uses critical insight chance and weighted tiered enemy table", () => {
    const lowInsight = buildInitialGameState();
    lowInsight.cultivationAttributes.criticalInsight = 0;
    const none = rollDrops(ENEMY_ARCHETYPES[0], lowInsight, () => 0.99);
    expect(none).toHaveLength(0);

    const highInsight = buildInitialGameState();
    highInsight.cultivationAttributes.criticalInsight = 200;
    const drops = rollDrops(ENEMY_ARCHETYPES[4], highInsight, () => 0);
    expect(drops.length).toBeGreaterThan(0);
    expect(drops[0].tier).toBeGreaterThanOrEqual(4);
  });

  it("formation arrays place with stack cap and grant passive tick generation", () => {
    const state = buildInitialGameState();
    const arr: Treasure = {
      id: "arr-1",
      type: TreasureType.FormationArray,
      tier: 2,
      quantity: 1,
      effect: { energyType: EnergyType.Qi, perTickGeneration: 3 }
    };
    addInventoryItem(state, arr);
    const placed = applyTreasure(arr, "MULADHARA", state);
    expect(placed.placedFormationArrays).toHaveLength(1);

    const before = placed.t2Nodes.get("MULADHARA")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0;
    const ticked = simulationTick(placed);
    const after = ticked.t2Nodes.get("MULADHARA")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0;
    expect(after).toBeGreaterThan(before);

    ticked.placedFormationArrays = [
      ...ticked.placedFormationArrays,
      { treasureId: "arr-2", nodeId: "MULADHARA", energyType: EnergyType.Qi, perTickGeneration: 1 },
      { treasureId: "arr-3", nodeId: "MULADHARA", energyType: EnergyType.Qi, perTickGeneration: 1 }
    ];
    const overflowArray: Treasure = {
      id: "arr-over",
      type: TreasureType.FormationArray,
      tier: 1,
      quantity: 1,
      effect: { energyType: EnergyType.Qi, perTickGeneration: 1 }
    };
    addInventoryItem(ticked, overflowArray);
    expect(() => applyTreasure(overflowArray, "MULADHARA", ticked)).toThrow();
  });

  it("cultivation manuals unlock techniques, reduce threshold, and open latent io slot", () => {
    const state = buildInitialGameState();
    const unlockManual: Treasure = {
      id: "manual-1",
      type: TreasureType.CultivationManual,
      tier: 5,
      quantity: 1,
      effect: { mode: "unlock_technique", techniqueId: "master" }
    };
    addInventoryItem(state, unlockManual);
    const withTechnique = applyTreasure(unlockManual, "", state);
    expect(withTechnique.unlockedTechniques).toContain("master");

    const sealManual: Treasure = {
      id: "manual-2",
      type: TreasureType.CultivationManual,
      tier: 3,
      quantity: 1,
      effect: { mode: "reduce_seal_threshold", nodeId: "SVADHISTHANA", multiplier: 0.8 }
    };
    addInventoryItem(withTechnique, sealManual);
    const withSeal = applyTreasure(sealManual, "", withTechnique);
    expect(withSeal.nodeSealThresholdModifiers.SVADHISTHANA).toBeCloseTo(0.8);

    const sealManualWrongMultiplier: Treasure = {
      id: "manual-2b",
      type: TreasureType.CultivationManual,
      tier: 3,
      quantity: 1,
      effect: { mode: "reduce_seal_threshold", nodeId: "SVADHISTHANA", multiplier: 0.1 }
    };
    addInventoryItem(withSeal, sealManualWrongMultiplier);
    const withFixedSecondReduction = applyTreasure(sealManualWrongMultiplier, "", withSeal);
    expect(withFixedSecondReduction.nodeSealThresholdModifiers.SVADHISTHANA).toBeCloseTo(0.64);

    const ioManual: Treasure = {
      id: "manual-3",
      type: TreasureType.CultivationManual,
      tier: 4,
      quantity: 1,
      effect: { mode: "open_latent_io_slot", nodeId: "MULADHARA", slotId: "HIDDEN_IO_1" }
    };
    addInventoryItem(withSeal, ioManual);
    const withIo = applyTreasure(ioManual, "", withSeal);
    expect(withIo.t2Nodes.get("MULADHARA")?.meridianSlotIds).toContain("HIDDEN_IO_1");
  });
});

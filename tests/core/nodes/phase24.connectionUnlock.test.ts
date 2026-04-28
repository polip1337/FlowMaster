import { describe, expect, it } from "vitest";
import { unlockT1Connection } from "../../../src/core/nodes/t1ConnectionUnlock";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { TreasureType, type Treasure } from "../../../src/core/treasures/types";

function structureCatalyst(id: string, quantity: number): Treasure {
  return {
    id,
    type: TreasureType.CultivationManual,
    tier: 5,
    quantity,
    effect: { mode: "unlock_t1_connection" }
  };
}

describe("phase 24 T1 connection unlocking", () => {
  it("requires a Structure Catalyst in inventory", () => {
    const state = buildInitialGameState();
    expect(() => unlockT1Connection("MULADHARA", 4, 6, state)).toThrow("Structure Catalyst");
  });

  it("unlocks valid potential extra edge with weight 0 and consumes catalyst", () => {
    const state = buildInitialGameState();
    state.inventory.push(structureCatalyst("sc-1", 1));

    const next = unlockT1Connection("MULADHARA", 6, 4, state);
    expect(next.t2Nodes.get("MULADHARA")?.t1Edges.get("6-4")?.weight).toBe(0);
    expect(next.t2Nodes.get("MULADHARA")?.unlockedEdges).toEqual(
      expect.arrayContaining([{ from: 6, to: 4, defaultWeight: 0 }])
    );
    expect(next.inventory.find((item) => item.id === "sc-1")).toBeUndefined();
  });

  it("rejects edges not listed in potentialExtraEdges", () => {
    const state = buildInitialGameState();
    state.inventory.push(structureCatalyst("sc-2", 1));
    expect(() => unlockT1Connection("MULADHARA", 0, 11, state)).toThrow("not allowed");
  });

  it("caps unlocked extra edges at two per cluster", () => {
    const state = buildInitialGameState();
    state.inventory.push(structureCatalyst("sc-3", 3));

    const first = unlockT1Connection("MULADHARA", 4, 6, state);
    const second = unlockT1Connection("MULADHARA", 5, 7, first);
    expect(second.t2Nodes.get("MULADHARA")?.unlockedEdges).toHaveLength(2);

    expect(() => unlockT1Connection("MULADHARA", 6, 8, second)).toThrow("max unlocked connections");
    expect(second.inventory.find((item) => item.id === "sc-3")?.quantity).toBe(1);
  });
});

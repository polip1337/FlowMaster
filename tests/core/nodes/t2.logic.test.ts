import { describe, expect, it } from "vitest";
import { EnergyType, emptyPool } from "../../../src/core/energy/EnergyType";
import { createT1Node } from "../../../src/core/nodes/t1Factory";
import { getT2Pressure, getT2Resonance, updateSealingProgress } from "../../../src/core/nodes/t2Logic";
import type { T2Node } from "../../../src/core/nodes/T2Node";
import { T1NodeState, T1NodeType } from "../../../src/core/nodes/T1Types";
import { T2NodeState, T2NodeType } from "../../../src/core/nodes/T2Types";

function makeT2Node(): T2Node {
  return {
    id: "qi",
    name: "Qi",
    type: T2NodeType.CHAKRA,
    state: T2NodeState.SEALING,
    t1Nodes: new Map(),
    t1Edges: new Map(),
    ioNodeMap: new Map(),
    rank: 1,
    level: 1,
    sealingProgress: 0,
    unlockConditions: [],
    upgradeConditions: [],
    meridianSlotIds: [],
    latentT1NodeIds: [],
    flowBonusPercent: 0,
    nodeDamageState: "healthy",
    refinedResonanceBonusApplied: false
  };
}

describe("T2 logic", () => {
  it("returns pressure 0.5 for half-filled cluster", () => {
    const t2 = makeT2Node();
    const a = createT1Node(1, T1NodeType.INTERNAL, false, 100);
    const b = createT1Node(2, T1NodeType.INTERNAL, false, 100);
    a.energy = { ...emptyPool(), [EnergyType.Qi]: 50 };
    b.energy = emptyPool();
    t2.t1Nodes.set(a.id, a);
    t2.t1Nodes.set(b.id, b);

    expect(getT2Pressure(t2)).toBeCloseTo(0.25);
    b.energy = { ...emptyPool(), [EnergyType.Qi]: 50 };
    expect(getT2Pressure(t2)).toBeCloseTo(0.5);
  });

  it("returns resonance 1.0 when all nodes active at quality 5", () => {
    const t2 = makeT2Node();
    const a = createT1Node(1, T1NodeType.INTERNAL, false, 100);
    const b = createT1Node(2, T1NodeType.INTERNAL, false, 100);
    a.state = T1NodeState.ACTIVE;
    b.state = T1NodeState.ACTIVE;
    a.quality = 5;
    b.quality = 5;
    t2.t1Nodes.set(a.id, a);
    t2.t1Nodes.set(b.id, b);

    expect(getT2Resonance(t2)).toBeCloseTo(1);
  });

  it("completes sealing when enough weighted energy arrives", () => {
    const t2 = makeT2Node();
    const completed = updateSealingProgress(
      t2,
      { ...emptyPool(), [EnergyType.Qi]: 100 },
      100,
      0
    );

    expect(completed).toBe(true);
    expect(t2.sealingProgress).toBeCloseTo(1);
  });
});

import { describe, expect, it } from "vitest";
import { EnergyType, emptyPool, totalEnergy } from "../../../src/core/energy/EnergyType";
import {
  applyMeridianFlow,
  computeFlowBonus,
  computeMeridianPurity,
  computePassiveMeridianFlow,
  createBaseMeridian,
  establishMeridian,
  canOpenReverse,
  openReverseMeridian,
  resolveBidirDirection,
  updateMeridianWidth
} from "../../../src/core/meridians/meridianLogic";
import { flowBonusPercent } from "../../../src/utils/math";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";
import { createT1Node } from "../../../src/core/nodes/t1Factory";
import type { T2Node } from "../../../src/core/nodes/T2Node";
import { T1NodeState, T1NodeType } from "../../../src/core/nodes/T1Types";
import { T2NodeState, T2NodeType } from "../../../src/core/nodes/T2Types";
import { healMeridianScar, recordMeridianScarIfOverloaded } from "../../../src/core/meridians/scarSystem";

function makeT2Stub(id: string, level: number, rank: number): T2Node {
  return {
    id,
    name: id,
    type: T2NodeType.CHAKRA,
    state: T2NodeState.ACTIVE,
    t1Nodes: new Map(),
    t1Edges: new Map(),
    ioNodeMap: new Map(),
    rank,
    level,
    sealingProgress: 0,
    unlockConditions: [],
    upgradeConditions: [],
    meridianSlotIds: [],
    latentT1NodeIds: [],
    flowBonusPercent: 0,
    nodeDamageState: { cracked: false, shattered: false, repairProgress: 0 },
    refinedResonanceBonusApplied: false
  };
}

describe("meridian system (phase 5)", () => {
  it("NASCENT passive flow at ΔP=0.5 equals width×0.5×purity×Δt (Qi-only)", () => {
    const from = makeT2Stub("a", 1, 1);
    const to = makeT2Stub("b", 1, 1);
    const ioOut = createT1Node(1, T1NodeType.IO_OUT, false, 100);
    const ioIn = createT1Node(2, T1NodeType.IO_IN, false, 100);
    ioOut.energy = { ...emptyPool(), [EnergyType.Qi]: 100 };
    ioIn.energy = { ...emptyPool(), [EnergyType.Qi]: 50 };
    ioOut.state = T1NodeState.ACTIVE;
    ioIn.state = T1NodeState.ACTIVE;
    from.t1Nodes.set(1, ioOut);
    to.t1Nodes.set(2, ioIn);

    const m = createBaseMeridian({
      id: "m1",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 1
    });
    establishMeridian(m, EnergyType.Qi, from, to);
    m.purity = computeMeridianPurity(m);
    updateMeridianWidth(m, getT2QiMix(from));

    const flow = computePassiveMeridianFlow(m, from, to);
    const pur = m.purity;
    const expected = m.width * 0.5 * pur * 0.1;
    expect(totalEnergy(flow)).toBeCloseTo(expected, 6);
  });

  it("FlowBonus for REFINED-scale meridian near 9.6% at 500k TF", () => {
    const m = createBaseMeridian({
      id: "m2",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 1,
      isEstablished: true,
      state: MeridianState.REFINED,
      width: 8,
      purity: 0.99,
      totalFlow: 500_000,
      basePurity: 0.55,
      dominantTypeAccumulator: { ...emptyPool(), [EnergyType.Qi]: 10_000 }
    });
    expect(computeFlowBonus(m)).toBeCloseTo(flowBonusPercent(8, 0.99, 500_000), 5);
  });

  it("purity stays capped at 0.99", () => {
    const m = createBaseMeridian({
      id: "m3",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 1,
      isEstablished: true,
      state: MeridianState.TRANSCENDENT,
      basePurity: 0.65,
      jingDeposit: 1e15,
      totalFlow: 1e15,
      shenScatterBonus: 0.2,
      dominantTypeAccumulator: { ...emptyPool(), [EnergyType.Qi]: 1e12 }
    });
    expect(computeMeridianPurity(m)).toBeLessThanOrEqual(0.99);
  });

  it("applyMeridianFlow moves Qi and tracks totalFlow", () => {
    const from = makeT2Stub("a", 1, 1);
    const to = makeT2Stub("b", 1, 1);
    const ioOut = createT1Node(1, T1NodeType.IO_OUT, false, 100);
    const ioIn = createT1Node(2, T1NodeType.IO_IN, false, 100);
    ioOut.energy = { ...emptyPool(), [EnergyType.Qi]: 20 };
    ioIn.energy = emptyPool();
    from.t1Nodes.set(1, ioOut);
    to.t1Nodes.set(2, ioIn);

    const m = createBaseMeridian({
      id: "m4",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 1,
      isEstablished: true,
      state: MeridianState.NASCENT,
      basePurity: 0.55,
      width: 2,
      dominantTypeAccumulator: { ...emptyPool(), [EnergyType.Qi]: 100 }
    });
    m.purity = computeMeridianPurity(m);

    const want = { ...emptyPool(), [EnergyType.Qi]: 10 };
    applyMeridianFlow(from, to, want, m);
    expect(ioOut.energy[EnergyType.Qi]).toBeCloseTo(10, 5);
    expect(ioIn.energy[EnergyType.Qi]).toBeGreaterThan(0);
    expect(m.totalFlow).toBeCloseTo(10, 5);
  });

  it("reverse meridian requires DEVELOPED tier and level 3+", () => {
    const forward = createBaseMeridian({
      id: "f",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 2,
      isEstablished: true,
      state: MeridianState.DEVELOPED,
      totalFlow: 12_000,
      isReverse: false
    });
    const gs = {
      t2Nodes: new Map([
        ["a", makeT2Stub("a", 3, 1)],
        ["b", makeT2Stub("b", 3, 1)]
      ])
    };
    expect(canOpenReverse(forward, gs)).toBe(true);

    const low = { ...forward, totalFlow: 100 };
    expect(canOpenReverse(low, gs)).toBe(false);

    const opened = openReverseMeridian(forward, "rev", gs);
    expect(opened).not.toBeNull();
    expect(opened!.cost[EnergyType.Jing]).toBe(1000);
    expect(opened!.cost[EnergyType.YangQi]).toBe(200);
    expect(opened!.meridian.nodeFromId).toBe("b");
    expect(opened!.meridian.ioNodeOutId).toBe(2);
  });

  it("resolveBidirDirection idle near equal local IO pressure (S-014)", () => {
    const a = makeT2Stub("a", 1, 1);
    const b = makeT2Stub("b", 1, 1);
    const n1 = createT1Node(1, T1NodeType.IO_BIDIR, false, 100);
    n1.energy = { ...emptyPool(), [EnergyType.Qi]: 50 };
    const n2 = createT1Node(2, T1NodeType.IO_BIDIR, false, 100);
    n2.energy = { ...emptyPool(), [EnergyType.Qi]: 51 };
    a.t1Nodes.set(1, n1);
    b.t1Nodes.set(2, n2);
    const m = createBaseMeridian({
      id: "x",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 1
    });
    expect(resolveBidirDirection(m, a, b)).toBe("idle");
  });

  it("records meridian scars for active over-pump overload and caps at 0.25", () => {
    const m = createBaseMeridian({
      id: "scarred",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 1,
      isEstablished: true,
      width: 10,
      scarPenalty: 0
    });
    const overloaded = recordMeridianScarIfOverloaded(m, 30, true);
    expect(overloaded).toBe(true);
    expect(m.isScarred).toBe(true);
    expect(m.scarPenalty).toBeCloseTo(0.05, 6);

    for (let i = 0; i < 10; i += 1) {
      recordMeridianScarIfOverloaded(m, 100, true);
    }
    expect(m.scarPenalty).toBeCloseTo(0.25, 6);
  });

  it("does not scar on passive flow even when over threshold", () => {
    const m = createBaseMeridian({
      id: "passive-overload",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 1,
      isEstablished: true,
      width: 10,
      scarPenalty: 0
    });
    const scarred = recordMeridianScarIfOverloaded(m, 40, false);
    expect(scarred).toBe(false);
    expect(m.isScarred).toBe(false);
    expect(m.scarPenalty).toBe(0);
  });

  it("scar penalty reduces computed purity and can be healed in 0.05 steps", () => {
    const m = createBaseMeridian({
      id: "scar-heal",
      nodeFromId: "a",
      nodeToId: "b",
      ioNodeOutId: 1,
      ioNodeInId: 2,
      hopCount: 1,
      isEstablished: true,
      basePurity: 0.65,
      scarPenalty: 0.1,
      isScarred: true
    });
    const withScar = computeMeridianPurity(m);
    m.scarPenalty = 0;
    m.isScarred = false;
    const withoutScar = computeMeridianPurity(m);
    expect(withoutScar - withScar).toBeCloseTo(0.1, 6);

    m.scarPenalty = 0.1;
    m.isScarred = true;
    const healed = healMeridianScar(m, 1);
    expect(healed).toBeCloseTo(0.05, 6);
    expect(m.scarPenalty).toBeCloseTo(0.05, 6);
  });
});

function getT2QiMix(node: T2Node): ReturnType<typeof emptyPool> {
  const p = emptyPool();
  for (const n of node.t1Nodes.values()) {
    for (const t of Object.values(EnergyType)) {
      p[t] += n.energy[t];
    }
  }
  return p;
}

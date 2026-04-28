import { describe, expect, it } from "vitest";
import { EnergyType, emptyPool } from "../../../src/core/energy/EnergyType";
import type { T1EdgeMap } from "../../../src/core/nodes/T1Edge";
import type { T1Node } from "../../../src/core/nodes/T1Node";
import { createT1Node } from "../../../src/core/nodes/t1Factory";
import { computeT1Flows, generateSourceEnergy } from "../../../src/core/nodes/t1Logic";
import { T1NodeState, T1NodeType } from "../../../src/core/nodes/T1Types";

function poolWithQi(qi: number) {
  return {
    ...emptyPool(),
    [EnergyType.Qi]: qi
  };
}

describe("T1 flow logic", () => {
  it("flows 10 Qi from a 1000 Qi source at 100 weight", () => {
    const a = createT1Node(1, T1NodeType.INTERNAL, false, 2000);
    const b = createT1Node(2, T1NodeType.INTERNAL, false, 2000);
    a.state = T1NodeState.ACTIVE;
    b.state = T1NodeState.ACTIVE;
    a.energy = poolWithQi(1000);

    const nodes = new Map([
      [a.id, a],
      [b.id, b]
    ]);
    const edges: T1EdgeMap = new Map([
      ["1-2", { fromId: 1, toId: 2, weight: 100, isLocked: false }]
    ]);

    const flows = computeT1Flows(nodes, edges);
    expect(flows).toHaveLength(1);
    expect(flows[0].amount[EnergyType.Qi]).toBeCloseTo(10);
  });

  it("splits flow into two 5 Qi transfers at 50/50 weights", () => {
    const a = createT1Node(1, T1NodeType.INTERNAL, false, 2000);
    const b = createT1Node(2, T1NodeType.INTERNAL, false, 2000);
    const c = createT1Node(3, T1NodeType.INTERNAL, false, 2000);
    a.state = T1NodeState.ACTIVE;
    b.state = T1NodeState.ACTIVE;
    c.state = T1NodeState.ACTIVE;
    a.energy = poolWithQi(1000);

    const nodes = new Map([
      [a.id, a],
      [b.id, b],
      [c.id, c]
    ]);
    const edges: T1EdgeMap = new Map([
      ["1-2", { fromId: 1, toId: 2, weight: 50, isLocked: false }],
      ["1-3", { fromId: 1, toId: 3, weight: 50, isLocked: false }]
    ]);

    const flows = computeT1Flows(nodes, edges);
    expect(flows).toHaveLength(2);
    expect(flows[0].amount[EnergyType.Qi]).toBeCloseTo(5);
    expect(flows[1].amount[EnergyType.Qi]).toBeCloseTo(5);
  });

  it("returns zero flow when destination is LOCKED", () => {
    const a = createT1Node(1, T1NodeType.INTERNAL, false, 2000);
    const b = createT1Node(2, T1NodeType.INTERNAL, false, 2000);
    a.state = T1NodeState.ACTIVE;
    b.state = T1NodeState.LOCKED;
    a.energy = poolWithQi(1000);

    const nodes = new Map([
      [a.id, a],
      [b.id, b]
    ]);
    const edges: T1EdgeMap = new Map([
      ["1-2", { fromId: 1, toId: 2, weight: 100, isLocked: false }]
    ]);

    expect(computeT1Flows(nodes, edges)).toHaveLength(0);
  });

  it("generates source Qi using quality multiplier", () => {
    const source = createT1Node(1, T1NodeType.INTERNAL, true, 100);
    source.quality = 5;

    const generated = generateSourceEnergy(source);
    expect(generated[EnergyType.Qi]).toBeCloseTo(1.175);
  });

  it("S-015 caps total outgoing drain to 1% of start energy across many edges", () => {
    const hub = createT1Node(1, T1NodeType.INTERNAL, false, 10_000);
    hub.state = T1NodeState.ACTIVE;
    hub.energy = poolWithQi(1000);
    const outs: T1Node[] = [2, 3, 4, 5, 6].map((id) => {
      const n = createT1Node(id, T1NodeType.INTERNAL, false, 10_000);
      n.state = T1NodeState.ACTIVE;
      return n;
    });
    const nodes = new Map<number, T1Node>([[hub.id, hub], ...outs.map((n) => [n.id, n] as [number, T1Node])]);
    const edges: T1EdgeMap = new Map();
    for (const n of outs) {
      edges.set(`1-${n.id}`, { fromId: 1, toId: n.id, weight: 100, isLocked: false });
    }

    const flows = computeT1Flows(nodes, edges);
    const totalOut = flows.reduce((s, f) => s + f.amount[EnergyType.Qi], 0);
    expect(totalOut).toBeCloseTo(10, 5);
  });
});

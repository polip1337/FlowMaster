import { describe, expect, it } from "vitest";
import { createT1Node } from "../../../src/core/nodes/t1Factory";
import { getT1Capacity } from "../../../src/core/nodes/t1Logic";
import { T1NodeState, T1NodeType } from "../../../src/core/nodes/T1Types";

describe("T1 model", () => {
  it("creates default locked node with expected base values", () => {
    const node = createT1Node(7, T1NodeType.INTERNAL, true, 100);

    expect(node.id).toBe(7);
    expect(node.state).toBe(T1NodeState.LOCKED);
    expect(node.quality).toBe(1);
    expect(node.capacity).toBe(100);
    expect(node.isSourceNode).toBe(true);
    expect(node.refinementPoints).toBe(0);
    expect(node.resonanceMultiplier).toBe(1);
    expect(node.lifetimeFlowOut).toBe(0);
  });

  it("scales capacity by quality multiplier table", () => {
    expect(getT1Capacity(100, 1)).toBe(100);
    expect(getT1Capacity(100, 5)).toBe(235);
    expect(getT1Capacity(100, 10)).toBe(700);
  });
});

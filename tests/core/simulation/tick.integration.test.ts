import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";
import { EnergyType, totalEnergy } from "../../../src/core/energy/EnergyType";
import { T1NodeState } from "../../../src/core/nodes/T1Types";

function hasNaNDeep(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isNaN(value);
  }
  if (value instanceof Map) {
    for (const [k, v] of value) {
      if (hasNaNDeep(k) || hasNaNDeep(v)) {
        return true;
      }
    }
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasNaNDeep(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => hasNaNDeep(item));
  }
  return false;
}

describe("simulationTick integration", () => {
  it("runs 1000 ticks without NaNs and grows Muladhara activation/energy", () => {
    let state = buildInitialGameState();
    const activationTickByNode = new Map<number, number>();
    let sourceActivatedTick = -1;

    for (let i = 0; i < 1000; i += 1) {
      state = simulationTick(state);
      const muladharaNow = state.t2Nodes.get("MULADHARA");
      if (!muladharaNow) {
        continue;
      }
      for (const node of muladharaNow.t1Nodes.values()) {
        if (node.state === T1NodeState.ACTIVE && !activationTickByNode.has(node.id)) {
          activationTickByNode.set(node.id, i + 1);
          if (node.isSourceNode) {
            sourceActivatedTick = i + 1;
          }
        }
      }
    }

    const muladhara = state.t2Nodes.get("MULADHARA");
    expect(muladhara).toBeTruthy();
    if (!muladhara) {
      return;
    }

    const sourceNode = [...muladhara.t1Nodes.values()].find((n) => n.isSourceNode);
    expect(sourceNode).toBeTruthy();
    expect(sourceNode?.state).toBe(T1NodeState.ACTIVE);

    const activeCount = [...muladhara.t1Nodes.values()].filter((n) => n.state === T1NodeState.ACTIVE).length;
    expect(activeCount).toBeGreaterThanOrEqual(1);

    // Source should be first active node in the sequence.
    for (const [nodeId, tick] of activationTickByNode) {
      if (sourceNode && nodeId !== sourceNode.id) {
        expect(sourceActivatedTick).toBeGreaterThan(0);
        expect(tick).toBeGreaterThanOrEqual(sourceActivatedTick);
      }
    }

    const qiTotal = [...muladhara.t1Nodes.values()].reduce((sum, node) => sum + node.energy[EnergyType.Qi], 0);
    expect(qiTotal).toBeGreaterThan(0);
    expect(totalEnergy(state.globalTrackers.lifetimeEnergyByType)).toBeGreaterThan(0);

    expect(hasNaNDeep(state)).toBe(false);
  });
});

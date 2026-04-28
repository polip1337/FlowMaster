import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";
import { EnergyType, totalEnergy } from "../../../src/core/energy/EnergyType";
import { T1NodeState } from "../../../src/core/nodes/T1Types";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";
import { bodyMeridianId } from "../../../src/data/bodyMap";

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

  it("applies harmonic throughput, Shen pulse, and body-map display hook state", () => {
    const harmonicState = buildInitialGameState();
    const controlState = buildInitialGameState();
    const leftId = bodyMeridianId("MULADHARA", "L_HIP");
    const rightId = bodyMeridianId("MULADHARA", "R_HIP");
    const harmonicLeft = harmonicState.meridians.get(leftId);
    const harmonicRight = harmonicState.meridians.get(rightId);
    const controlLeft = controlState.meridians.get(leftId);
    const controlRight = controlState.meridians.get(rightId);
    const harmonicRoot = harmonicState.t2Nodes.get("MULADHARA");
    const controlRoot = controlState.t2Nodes.get("MULADHARA");
    const harmonicLeftHip = harmonicState.t2Nodes.get("L_HIP");
    const harmonicRightHip = harmonicState.t2Nodes.get("R_HIP");
    const controlLeftHip = controlState.t2Nodes.get("L_HIP");
    const controlRightHip = controlState.t2Nodes.get("R_HIP");
    if (
      !harmonicLeft ||
      !harmonicRight ||
      !controlLeft ||
      !controlRight ||
      !harmonicRoot ||
      !controlRoot ||
      !harmonicLeftHip ||
      !harmonicRightHip ||
      !controlLeftHip ||
      !controlRightHip
    ) {
      throw new Error("missing setup nodes/meridians");
    }

    for (const meridian of [harmonicLeft, harmonicRight, controlLeft, controlRight]) {
      meridian.isEstablished = true;
      meridian.state = MeridianState.REFINED;
      meridian.width = 10;
      meridian.basePurity = 0.7;
      meridian.purity = 0.8;
      meridian.totalFlow = 100_000;
    }
    // Diverged quality disables control harmonic pair.
    controlRight.purity = 0.1;

    const setupRoots = [harmonicRoot, controlRoot];
    for (const root of setupRoots) {
      const source = [...root.t1Nodes.values()].find((t1) => t1.isSourceNode);
      const leftIo = root.t1Nodes.get(1);
      const rightIo = root.t1Nodes.get(2);
      if (!source || !leftIo || !rightIo) {
        throw new Error("missing Muladhara IO/source nodes");
      }
      source.energy[EnergyType.Shen] = 0;
      leftIo.energy[EnergyType.Qi] = 1_000;
      rightIo.energy[EnergyType.Qi] = 1_000;
    }

    for (const node of [harmonicLeftHip, harmonicRightHip, controlLeftHip, controlRightHip]) {
      const io = node.t1Nodes.get(0);
      if (!io) {
        throw new Error("missing hip IO_IN node");
      }
      io.energy[EnergyType.Qi] = 0;
      io.capacity = 10_000;
    }

    const harmonicNext = simulationTick(harmonicState);
    const controlNext = simulationTick(controlState);
    const harmonicShen = [...(harmonicNext.t2Nodes.get("MULADHARA")?.t1Nodes.values() ?? [])]
      .find((t1) => t1.isSourceNode)?.energy[EnergyType.Shen] ?? 0;

    expect(harmonicNext.meridianHarmonics.pairs).toHaveLength(1);
    expect(new Set(harmonicNext.meridianHarmonics.activeMeridianIds)).toEqual(new Set([leftId, rightId]));
    expect(harmonicNext.meridianHarmonics.pulsePhase).toBeGreaterThanOrEqual(0);
    expect(harmonicNext.meridianHarmonics.pulsePhase).toBeLessThan(1);
    expect(harmonicShen).toBeGreaterThanOrEqual(0.002);
    expect(
      (harmonicNext.t2Nodes.get("L_HIP")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0) +
        (harmonicNext.t2Nodes.get("R_HIP")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0)
    ).toBeGreaterThan(
      (controlNext.t2Nodes.get("L_HIP")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0) +
        (controlNext.t2Nodes.get("R_HIP")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0)
    );
  });
});

import { describe, expect, it } from "vitest";
import { EnergyType, emptyPool } from "../../../src/core/energy/EnergyType";
import {
  MERIDIAN_HARMONIC_QUALITY_DELTA_MAX,
  MERIDIAN_HARMONIC_SHEN_PULSE_PER_TICK
} from "../../../src/core/meridians/meridianLogic";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";
import { bodyMeridianId } from "../../../src/data/bodyMap";

function setupMuladharaHipPair(state: ReturnType<typeof buildInitialGameState>): { leftId: string; rightId: string } {
  const leftId = bodyMeridianId("MULADHARA", "L_HIP");
  const rightId = bodyMeridianId("MULADHARA", "R_HIP");
  const left = state.meridians.get(leftId)!;
  const right = state.meridians.get(rightId)!;
  for (const meridian of [left, right]) {
    meridian.isEstablished = true;
    meridian.state = MeridianState.REFINED;
    meridian.width = 10;
    meridian.basePurity = 0.7;
    meridian.purity = 0.8;
    meridian.totalFlow = 100_000;
  }
  const root = state.t2Nodes.get("MULADHARA")!;
  const source = [...root.t1Nodes.values()].find((t1) => t1.isSourceNode)!;
  const leftIo = root.t1Nodes.get(1)!;
  const rightIo = root.t1Nodes.get(2)!;
  source.energy[EnergyType.Shen] = 0;
  leftIo.energy[EnergyType.Qi] = 1_000;
  rightIo.energy[EnergyType.Qi] = 1_000;
  for (const nodeId of ["L_HIP", "R_HIP"]) {
    const io = state.t2Nodes.get(nodeId)!.t1Nodes.get(0)!;
    io.energy[EnergyType.Qi] = 0;
    io.capacity = 10_000;
  }
  return { leftId, rightId };
}

describe("phase 25 meridian harmonics", () => {
  it("adds harmonic Shen pulse at shared node and marks active pair ids", () => {
    const state = buildInitialGameState();
    const { leftId, rightId } = setupMuladharaHipPair(state);
    const next = simulationTick(state);
    const sourceShen =
      [...(next.t2Nodes.get("MULADHARA")?.t1Nodes.values() ?? [])].find((t1) => t1.isSourceNode)?.energy[
        EnergyType.Shen
      ] ?? 0;

    expect(next.meridianHarmonics.pairs).toHaveLength(1);
    expect(new Set(next.meridianHarmonics.activeMeridianIds)).toEqual(new Set([leftId, rightId]));
    expect(sourceShen).toBeGreaterThanOrEqual(MERIDIAN_HARMONIC_SHEN_PULSE_PER_TICK);
  });

  it("disables harmonic activation when pair quality delta exceeds threshold", () => {
    const state = buildInitialGameState();
    setupMuladharaHipPair(state);
    const right = state.meridians.get(bodyMeridianId("MULADHARA", "R_HIP"))!;
    right.purity = Math.max(0, 0.8 - (MERIDIAN_HARMONIC_QUALITY_DELTA_MAX + 0.01));

    const next = simulationTick(state);
    expect(next.meridianHarmonics.pairs).toHaveLength(0);
  });

  it("applies harmonic throughput to delivery without inflating training progress", () => {
    const harmonic = buildInitialGameState();
    const control = buildInitialGameState();
    setupMuladharaHipPair(harmonic);
    setupMuladharaHipPair(control);
    const controlRight = control.meridians.get(bodyMeridianId("MULADHARA", "R_HIP"))!;
    controlRight.purity = 0.1;
    const harmonicLeftBefore = harmonic.meridians.get(bodyMeridianId("MULADHARA", "L_HIP"))!.totalFlow;
    const controlLeftBefore = control.meridians.get(bodyMeridianId("MULADHARA", "L_HIP"))!.totalFlow;

    const harmonicNext = simulationTick(harmonic);
    const controlNext = simulationTick(control);
    const harmonicHipQi =
      (harmonicNext.t2Nodes.get("L_HIP")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0) +
      (harmonicNext.t2Nodes.get("R_HIP")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0);
    const controlHipQi =
      (controlNext.t2Nodes.get("L_HIP")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0) +
      (controlNext.t2Nodes.get("R_HIP")?.t1Nodes.get(0)?.energy[EnergyType.Qi] ?? 0);
    const harmonicLeftAfter = harmonicNext.meridians.get(bodyMeridianId("MULADHARA", "L_HIP"))!.totalFlow;
    const controlLeftAfter = controlNext.meridians.get(bodyMeridianId("MULADHARA", "L_HIP"))!.totalFlow;

    expect(harmonicHipQi).toBeGreaterThan(controlHipQi);
    expect(harmonicLeftAfter - harmonicLeftBefore).toBeCloseTo(controlLeftAfter - controlLeftBefore, 6);
  });
});

import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";
describe("Phase 37 perf guards (TASK-244)", () => {
  it("consumes and clears attributes dirty flag on tick", () => {
    const seeded = buildInitialGameState();
    seeded.attributesDirty = true;
    const next = simulationTick(seeded);
    expect(next.attributesDirty).toBe(false);
  });

  it("stores tick duration telemetry", () => {
    const state = simulationTick(buildInitialGameState());
    expect(state.performance.lastTickDurationMs).toBeGreaterThanOrEqual(0);
    expect(state.performance.overBudgetTickCount).toBeGreaterThanOrEqual(0);
  });
});

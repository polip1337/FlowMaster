import { describe, expect, it } from "vitest";
import { checkRankBreakthroughs } from "../../../src/core/progression/rankController";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { createTribulationEvent } from "../../../src/core/progression/tribulationSystem";
import { EnergyType } from "../../../src/core/energy/EnergyType";

describe("phase 20 tribulation finalization", () => {
  it("finalizes tribulation even when delayed rank-up prerequisites are no longer satisfied", () => {
    const state = buildInitialGameState();
    state.tribulation.activeEvent = createTribulationEvent(2);
    state.tribulation.activeNodeId = "MULADHARA";
    state.tribulation.pendingBreakthrough = {
      nodeId: "MULADHARA",
      fromRank: 1,
      toRank: 2,
      jingCost: 1000,
      shenCost: 500
    };
    state.tribulation.isCultivationPaused = true;
    state.specialEventFlags.add("event:tribulation_success:MULADHARA:2");

    for (const t2 of state.t2Nodes.values()) {
      for (const t1 of t2.t1Nodes.values()) {
        t1.energy[EnergyType.Jing] = 0;
        t1.energy[EnergyType.Shen] = 0;
      }
    }

    const events = checkRankBreakthroughs(state);
    expect(events).toHaveLength(0);
    expect(state.tribulation.activeEvent).toBeNull();
    expect(state.tribulation.pendingBreakthrough).toBeNull();
    expect(state.tribulation.isCultivationPaused).toBe(false);
    expect(state.specialEventFlags.has("event:tribulation_success:MULADHARA:2")).toBe(false);
    expect(state.specialEventFlags.has("event:tribulation_finalize_skipped:MULADHARA:2")).toBe(true);
  });
});

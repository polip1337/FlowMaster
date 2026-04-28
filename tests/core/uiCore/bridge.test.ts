import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory.ts";
import {
  applyUiInputsToCoreState,
  normalizeToCoreMeridianId,
  routeNodeSequenceToMeridianIds,
  runUiDrivenCoreTick
} from "../../../src/uiCore/bridge.ts";

describe("uiCore bridge contracts", () => {
  it("normalizes legacy and core meridian ids to canonical format", () => {
    expect(normalizeToCoreMeridianId("MULADHARA->SVADHISTHANA")).toBe("MULADHARA::SVADHISTHANA");
    expect(normalizeToCoreMeridianId("MULADHARA::SVADHISTHANA")).toBe("MULADHARA::SVADHISTHANA");
  });

  it("builds canonical route meridian ids from node sequences", () => {
    expect(routeNodeSequenceToMeridianIds(["MULADHARA", "SVADHISTHANA", "MULADHARA"])).toEqual([
      "MULADHARA::SVADHISTHANA",
      "SVADHISTHANA::MULADHARA"
    ]);
  });

  it("applies UI route/toggle inputs and advances one core tick", () => {
    const state = buildInitialGameState();
    const withUiInputs = applyUiInputsToCoreState(state, {
      refiningPulseActive: true,
      activeBodyRouteNodeIds: ["MULADHARA", "SVADHISTHANA", "MULADHARA"]
    });
    expect(withUiInputs.refiningPulseActive).toBe(true);
    expect(withUiInputs.activeRoute?.isActive).toBe(true);
    expect(withUiInputs.activeRoute?.nodeSequence).toEqual(["MULADHARA", "SVADHISTHANA", "MULADHARA"]);

    const afterTick = runUiDrivenCoreTick(state, {
      refiningPulseActive: true,
      activeBodyRouteNodeIds: ["MULADHARA", "SVADHISTHANA", "MULADHARA"]
    });
    expect(afterTick.tick).toBe(state.tick + 1);
    expect(afterTick.refiningPulseActive).toBe(true);
  });
});

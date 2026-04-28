import { describe, expect, it } from "vitest";
import {
  CELESTIAL_YEAR_DAYS,
  getCelestialTickModifiers,
  refreshCelestialStateForCurrentDay
} from "../../../src/core/celestial/calendar";
import { TICKS_PER_INGAME_DAY } from "../../../src/core/constants";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import { T1NodeState } from "../../../src/core/nodes/T1Types";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";

describe("phase 21 celestial body map", () => {
  it("creates 24 celestial bodies linked 1:1 to T2 nodes", () => {
    const state = buildInitialGameState();
    expect(state.celestialBodies).toHaveLength(24);
    const linkedNodes = new Set(state.celestialBodies.map((body) => body.linkedT2NodeId));
    expect(linkedNodes.size).toBe(24);
    expect(linkedNodes).toEqual(new Set([...state.t2Nodes.keys()]));
  });

  it("advances celestial calendar once every in-game day worth of ticks", () => {
    let state = buildInitialGameState();
    state.tick = TICKS_PER_INGAME_DAY - 1;
    state = simulationTick(state);
    expect(state.celestialCalendar.dayOfYear).toBe(1);
    expect(state.celestialCalendar.season).toBe("Spring");

    state.celestialCalendar.dayOfYear = 90;
    refreshCelestialStateForCurrentDay(state);
    state.tick = TICKS_PER_INGAME_DAY - 1;
    state = simulationTick(state);
    expect(state.celestialCalendar.dayOfYear).toBe(91);
    expect(state.celestialCalendar.season).toBe("Summer");
  });

  it("applies peak generation and resonance bonuses for linked T2 node", () => {
    const state = buildInitialGameState();
    const modifiers = getCelestialTickModifiers(state);
    expect(modifiers.t2GenerationMultiplier("MULADHARA")).toBeCloseTo(2, 6);
    expect(modifiers.t2ResonanceQualityMultiplier("MULADHARA")).toBeCloseTo(1.1, 6);
  });

  it("applies conjunction Shen multiplier for linked T2 nodes", () => {
    const baseState = buildInitialGameState();
    const anahataBase = baseState.t2Nodes.get("ANAHATA");
    if (!anahataBase) {
      return;
    }
    anahataBase.state = T2NodeState.ACTIVE;
    for (const t1 of anahataBase.t1Nodes.values()) {
      t1.state = T1NodeState.ACTIVE;
      t1.quality = 10;
      t1.resonanceMultiplier = 1;
    }

    const baseTarget = anahataBase.t1Nodes.get(6);
    if (!baseTarget) {
      return;
    }
    const baseBefore = baseTarget.energy[EnergyType.Shen];
    const baseNext = simulationTick(baseState);
    const baseAfter = baseNext.t2Nodes.get("ANAHATA")?.t1Nodes.get(6)?.energy[EnergyType.Shen] ?? 0;
    const baseDelta = baseAfter - baseBefore;

    const conjunctionState = buildInitialGameState();
    conjunctionState.celestialCalendar.dayOfYear = 44;
    refreshCelestialStateForCurrentDay(conjunctionState);
    const anahataConj = conjunctionState.t2Nodes.get("ANAHATA");
    if (!anahataConj) {
      return;
    }
    anahataConj.state = T2NodeState.ACTIVE;
    for (const t1 of anahataConj.t1Nodes.values()) {
      t1.state = T1NodeState.ACTIVE;
      t1.quality = 10;
      t1.resonanceMultiplier = 1;
    }
    const conjTarget = anahataConj.t1Nodes.get(6);
    if (!conjTarget) {
      return;
    }
    const conjBefore = conjTarget.energy[EnergyType.Shen];
    const conjNext = simulationTick(conjunctionState);
    const conjAfter = conjNext.t2Nodes.get("ANAHATA")?.t1Nodes.get(6)?.energy[EnergyType.Shen] ?? 0;
    const conjDelta = conjAfter - conjBefore;

    expect(baseDelta).toBeGreaterThan(0);
    expect(conjDelta).toBeGreaterThan(baseDelta * 2.9);
    expect(conjDelta).toBeLessThan(baseDelta * 3.1);
    expect(conjNext.specialEventFlags.has("event:celestial_conjunction_active")).toBe(true);
  });

  it("keeps day index within a 364-day year", () => {
    let state = buildInitialGameState();
    state.celestialCalendar.dayOfYear = CELESTIAL_YEAR_DAYS - 1;
    refreshCelestialStateForCurrentDay(state);
    state.tick = TICKS_PER_INGAME_DAY - 1;
    state = simulationTick(state);
    expect(state.celestialCalendar.dayOfYear).toBe(0);
    expect(state.celestialCalendar.season).toBe("Spring");
  });
});

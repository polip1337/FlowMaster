import { describe, expect, it } from "vitest";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import { BODY_MAP_EDGES, BODY_T2_IDS } from "../../../src/data/bodyMap";
import { T2_NODE_DEFS } from "../../../src/data/t2NodeDefs";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { T1NodeState } from "../../../src/core/nodes/T1Types";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";

describe("buildInitialGameState", () => {
  it("creates 24 T2 nodes and Muladhara ACTIVE with source T1 bootstrapped (S-012)", () => {
    const state = buildInitialGameState();
    expect(state.t2Nodes.size).toBe(24);
    const root = state.t2Nodes.get("MULADHARA");
    expect(root?.state).toBe(T2NodeState.ACTIVE);
    const source = [...(root?.t1Nodes.values() ?? [])].find((n) => n.isSourceNode);
    expect(source?.state).toBe(T1NodeState.ACTIVE);
    expect(source?.capacity).toBeGreaterThan(0);
    const qi = source?.energy[EnergyType.Qi] ?? 0;
    expect(qi / (source?.capacity ?? 1)).toBeCloseTo(0.3, 5);
  });

  it("locks all non-root T2 nodes", () => {
    const state = buildInitialGameState();
    for (const [id, node] of state.t2Nodes) {
      if (id !== "MULADHARA") {
        expect(node.state).toBe(T2NodeState.LOCKED);
      }
    }
  });

  it("creates one UNESTABLISHED meridian per body map edge", () => {
    const state = buildInitialGameState();
    expect(state.meridians.size).toBe(BODY_MAP_EDGES.length);
    for (const m of state.meridians.values()) {
      expect(m.state).toBe(MeridianState.UNESTABLISHED);
      expect(m.isEstablished).toBe(false);
      expect(m.isScarred).toBe(false);
      expect(m.scarPenalty).toBe(0);
    }
  });

  it("T2 defs and BODY_T2_IDS list agree", () => {
    expect(T2_NODE_DEFS.length).toBe(24);
    const fromDefs = [...new Set(T2_NODE_DEFS.map((d) => d.id))].sort();
    const fromBody = [...BODY_T2_IDS].sort();
    expect(fromDefs).toEqual(fromBody);
  });

  it("initializes harmonic body-map display state hooks", () => {
    const state = buildInitialGameState();
    expect(state.meridianHarmonics.pairs).toEqual([]);
    expect(state.meridianHarmonics.activeMeridianIds).toEqual([]);
    expect(state.meridianHarmonics.pulsePhase).toBe(0);
    expect(state.meridianHarmonics.tintByMeridianId).toEqual({});
  });
});

import { describe, expect, it } from "vitest";
import {
  detectAnkleMiniCirculationBonus,
  executeCirculationRoute,
  isGreatCirculationAvailable,
  validateRoute
} from "../../../src/core/circulation/routes";
import { makeMeridianId } from "../../../src/core/meridians/meridianId";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { BODY_MAP_EDGES, BODY_T2_IDS } from "../../../src/data/bodyMap";
import { T2NodeState } from "../../../src/core/nodes/T2Types";

describe("Phase 9 — TASK-085 validateRoute", () => {
  it("rejects routes that include terminal nodes", () => {
    const state = buildInitialGameState();
    const route = ["L_WRIST", "L_HAND", "L_WRIST"];
    const result = validateRoute(route, state.meridians, state.t2Nodes);
    expect(result.valid).toBe(false);
    expect(result.errors.join("|")).toContain("terminal topology node cannot be on route: L_HAND");
  });

  it("accepts a simple closed route when nodes are active and meridians established", () => {
    const state = buildInitialGameState();
    const a = state.t2Nodes.get("MULADHARA")!;
    const b = state.t2Nodes.get("SVADHISTHANA")!;
    a.state = T2NodeState.ACTIVE;
    b.state = T2NodeState.ACTIVE;

    const ab = state.meridians.get(makeMeridianId("MULADHARA", "SVADHISTHANA"))!;
    const baId = makeMeridianId("SVADHISTHANA", "MULADHARA");
    state.meridians.set(baId, {
      ...ab,
      id: baId,
      nodeFromId: "SVADHISTHANA",
      nodeToId: "MULADHARA",
      ioNodeOutId: ab.ioNodeInId,
      ioNodeInId: ab.ioNodeOutId,
      isReverse: true
    });
    ab.isEstablished = true;
    ab.state = MeridianState.DEVELOPED;
    const ba = state.meridians.get(baId)!;
    ba.isEstablished = true;
    ba.state = MeridianState.DEVELOPED;

    const route = ["MULADHARA", "SVADHISTHANA", "MULADHARA"];
    const result = validateRoute(route, state.meridians, state.t2Nodes);
    expect(result.valid).toBe(true);
  });
});

describe("Phase 9 — TASK-088 Great Circulation availability", () => {
  it("requires all 24 nodes active and canonical meridians at DEVELOPED+", () => {
    const state = buildInitialGameState();
    expect(isGreatCirculationAvailable(state)).toBe(false);

    for (const id of BODY_T2_IDS) {
      const t2 = state.t2Nodes.get(id)!;
      t2.state = T2NodeState.ACTIVE;
    }
    for (const edge of BODY_MAP_EDGES) {
      const m = state.meridians.get(makeMeridianId(edge.fromNodeId, edge.toNodeId))!;
      m.isEstablished = true;
      m.state = MeridianState.DEVELOPED;
      m.totalFlow = 12_000;
    }
    expect(isGreatCirculationAvailable(state)).toBe(true);
  });
});

describe("Phase 9 — TASK-089 Ankle mini-circulation detection", () => {
  it("detects ankle-only segment when neither knee nor foot is included", () => {
    expect(detectAnkleMiniCirculationBonus(["MULADHARA", "L_ANKLE", "SVADHISTHANA", "MULADHARA"])).toBe(true);
    expect(detectAnkleMiniCirculationBonus(["L_KNEE", "L_ANKLE", "MULADHARA", "L_KNEE"])).toBe(false);
  });
});

describe("Phase 9 — TASK-087 route throttle", () => {
  it("reduces active route throughput multiplier when body heat exceeds 60%", () => {
    const state = buildInitialGameState();
    state.bodyHeat = 800;
    state.maxBodyHeat = 1000;
    state.activeRoute = {
      id: "r1",
      nodeSequence: ["MULADHARA", "SVADHISTHANA", "MULADHARA"],
      isActive: true,
      loopEfficiency: 1,
      bottleneckMeridianId: null,
      estimatedHeatPerTick: 0,
      estimatedTrainingMultiplier: 1,
      accumulatedRouteHeat: 0
    };
    const ab = state.meridians.get(makeMeridianId("MULADHARA", "SVADHISTHANA"))!;
    const baId = makeMeridianId("SVADHISTHANA", "MULADHARA");
    state.meridians.set(baId, {
      ...ab,
      id: baId,
      nodeFromId: "SVADHISTHANA",
      nodeToId: "MULADHARA",
      ioNodeOutId: ab.ioNodeInId,
      ioNodeInId: ab.ioNodeOutId,
      isReverse: true
    });
    const ba = state.meridians.get(baId)!;
    ab.isEstablished = true;
    ba.isEstablished = true;
    ab.state = MeridianState.DEVELOPED;
    ba.state = MeridianState.DEVELOPED;
    state.t2Nodes.get("SVADHISTHANA")!.state = T2NodeState.ACTIVE;

    const mods = executeCirculationRoute(state, state.technique.strength);
    expect(mods.throttleFactor).toBeLessThan(1);
  });
});

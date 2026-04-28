import { describe, expect, it } from "vitest";
import { executeCirculationRoute } from "../../../src/core/circulation/routes";
import { createEmptyRoute } from "../../../src/core/circulation/types";
import { EnergyType, emptyPool } from "../../../src/core/energy/EnergyType";
import { makeMeridianId } from "../../../src/core/meridians/meridianId";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { simulationTick } from "../../../src/core/simulation/tick";

function establishSimpleLoop(state: ReturnType<typeof buildInitialGameState>): void {
  state.t2Nodes.get("MULADHARA")!.state = T2NodeState.ACTIVE;
  state.t2Nodes.get("SVADHISTHANA")!.state = T2NodeState.ACTIVE;
  const ab = state.meridians.get(makeMeridianId("MULADHARA", "SVADHISTHANA"))!;
  ab.isEstablished = true;
  ab.state = MeridianState.DEVELOPED;
  ab.width = 2;
  ab.purity = 0.9;
  ab.totalFlow = 2_000;
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
}

describe("phase 22 dual cultivation", () => {
  it("TASK-158 initializes companion state in game state", () => {
    const state = buildInitialGameState();
    expect(state.companion).toBeTruthy();
    expect(state.companion?.active).toBe(false);
    expect(state.companion?.harmonyLevel).toBe(0);
    expect(state.companion?.crossBodyMeridians).toEqual([]);
  });

  it("TASK-159 runs simplified companion meridian training tick", () => {
    const state = buildInitialGameState();
    const companionBase = buildInitialGameState();
    establishSimpleLoop(companionBase);
    companionBase.activeRoute = {
      ...createEmptyRoute("companion-loop"),
      isActive: true,
      nodeSequence: ["MULADHARA", "SVADHISTHANA", "MULADHARA"]
    };
    state.companion = {
      active: true,
      name: "Ling",
      cultivation: {
        t2Nodes: companionBase.t2Nodes,
        meridians: companionBase.meridians,
        activeRoute: companionBase.activeRoute,
        techniqueStrength: 1.2
      },
      harmonyLevel: 20,
      sharedRouteActive: false,
      crossBodyMeridians: []
    };
    const mid = makeMeridianId("MULADHARA", "SVADHISTHANA");
    const before = state.companion.cultivation.meridians.get(mid)?.totalFlow ?? 0;
    const next = simulationTick(state);
    const after = next.companion?.cultivation.meridians.get(mid)?.totalFlow ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  it("TASK-160 applies harmony shared-route modifiers", () => {
    const state = buildInitialGameState();
    establishSimpleLoop(state);
    state.activeRoute = {
      ...createEmptyRoute("shared-loop"),
      isActive: true,
      nodeSequence: ["MULADHARA", "SVADHISTHANA", "MULADHARA"]
    };
    state.companion = {
      active: true,
      name: "Ling",
      cultivation: { t2Nodes: new Map(), meridians: new Map(), activeRoute: state.activeRoute, techniqueStrength: 1 },
      harmonyLevel: 70,
      sharedRouteActive: true,
      crossBodyMeridians: []
    };
    const mods = executeCirculationRoute(state, state.technique.strength);
    expect(mods.loopEfficiency).toBeGreaterThan(0.74);
    expect(mods.greatCirculationTrainingPoolScale).toBeCloseTo(1.3, 6);
  });

  it("TASK-161 opens cross-body meridian, transfers Shen, and grants both FlowBonus", () => {
    const state = buildInitialGameState();
    state.tick = 9;
    const companionBase = buildInitialGameState();
    const playerAnahata = state.t2Nodes.get("ANAHATA")!;
    const companionAnahata = companionBase.t2Nodes.get("ANAHATA")!;
    playerAnahata.rank = 6;
    companionAnahata.rank = 6;
    const playerIo = playerAnahata.t1Nodes.get(playerAnahata.ioNodeMap.get("SOLAR")!)!;
    const companionIo = companionAnahata.t1Nodes.get(companionAnahata.ioNodeMap.get("SOLAR")!)!;
    playerIo.energy = { ...emptyPool(), [EnergyType.Shen]: 30 };
    companionIo.energy = { ...emptyPool(), [EnergyType.Shen]: 0 };

    state.companion = {
      active: true,
      name: "Ling",
      cultivation: {
        t2Nodes: companionBase.t2Nodes,
        meridians: companionBase.meridians,
        activeRoute: null,
        techniqueStrength: 1
      },
      harmonyLevel: 95,
      sharedRouteActive: false,
      crossBodyMeridians: []
    };
    const next = simulationTick(state);
    const nextPlayerAnahata = next.t2Nodes.get("ANAHATA")!;
    const nextCompanionAnahata = next.companion!.cultivation.t2Nodes.get("ANAHATA")!;
    const nextPlayerIo = nextPlayerAnahata.t1Nodes.get(nextPlayerAnahata.ioNodeMap.get("SOLAR")!)!;
    const nextCompanionIo = nextCompanionAnahata.t1Nodes.get(nextCompanionAnahata.ioNodeMap.get("SOLAR")!)!;

    expect(next.companion?.crossBodyMeridians.length).toBe(1);
    expect(nextCompanionIo.energy[EnergyType.Shen]).toBeGreaterThan(0);
    expect(nextPlayerIo.energy[EnergyType.Shen]).toBeLessThan(30);
    expect(nextPlayerAnahata.flowBonusPercent).toBeGreaterThan(0);
    expect(nextCompanionAnahata.flowBonusPercent).toBeGreaterThan(0);
  });
});

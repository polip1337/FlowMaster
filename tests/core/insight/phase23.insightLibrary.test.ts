import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { MeridianState } from "../../../src/core/meridians/MeridianTypes";
import { T2NodeState } from "../../../src/core/nodes/T2Types";
import { DaoType } from "../../../src/core/dao/types";
import { selectDao } from "../../../src/core/dao/daoSystem";
import { processInsightLibraryTriggers } from "../../../src/core/insight/insightLibrary";
import { buildInsightLibraryUiModel } from "../../../src/core/insight/insightLibraryUi";

describe("phase 23 insight library", () => {
  it("initializes insight library state in new saves", () => {
    const state = buildInitialGameState();
    expect(state.insightLibrary.entries.size).toBe(0);
    expect(state.insightLibrary.totalEntries).toBe(0);
    expect(state.insightLibrary.permanentBonuses.cultivation).toEqual({});
    expect(state.insightLibrary.permanentBonuses.combat).toEqual({});
  });

  it("creates codex entries from all trigger groups and keeps them unique", () => {
    const state = buildInitialGameState();
    const muladhara = state.t2Nodes.get("MULADHARA");
    if (muladhara) {
      muladhara.state = T2NodeState.ACTIVE;
      muladhara.rank = 2;
    }
    state.progression.unlockEvents.push({ nodeId: "MULADHARA", tick: 1 });
    state.progression.breakthroughEvents.push({
      nodeId: "MULADHARA",
      fromRank: 1,
      toRank: 2,
      qualityNodesBoosted: 3,
      tick: 1
    });

    selectDao(state, DaoType.Fire);
    const fireSpark = state.playerDao.daoNodes.get("FIRE_SPARK");
    if (fireSpark) {
      fireSpark.state = T2NodeState.ACTIVE;
    }

    const firstMeridianId = [...state.meridians.keys()][0];
    if (firstMeridianId) {
      const firstMeridian = state.meridians.get(firstMeridianId);
      if (firstMeridian) {
        firstMeridian.isEstablished = true;
        firstMeridian.state = MeridianState.TRANSCENDENT;
      }
    }

    state.specialEventFlags.add("event:enemy_defeated:wild-beast");
    state.specialEventFlags.add("event:treasure_acquired:dao_fragment");
    state.specialEventFlags.add("event:insight_library:tribulation_success:3");

    processInsightLibraryTriggers(state);
    const firstCount = state.insightLibrary.totalEntries;
    expect(firstCount).toBeGreaterThanOrEqual(7);
    expect(state.insightLibrary.entries.has("insight:t2:MULADHARA")).toBe(true);
    expect(state.insightLibrary.entries.has("insight:rank:2")).toBe(true);
    expect(state.insightLibrary.entries.has("insight:dao:FIRE_SPARK")).toBe(true);
    expect(state.insightLibrary.entries.has("insight:enemy:wild-beast")).toBe(true);
    expect(state.insightLibrary.entries.has("insight:treasure:dao_fragment")).toBe(true);
    expect(state.insightLibrary.entries.has("insight:tribulation:3")).toBe(true);
    expect(state.specialEventFlags.has("event:enemy_defeated:wild-beast")).toBe(false);

    processInsightLibraryTriggers(state);
    expect(state.insightLibrary.totalEntries).toBe(firstCount);
  });

  it("updates minimal UI model with locked silhouettes and discovered timestamps", () => {
    const state = buildInitialGameState();
    state.progression.unlockEvents.push({ nodeId: "SVADHISTHANA", tick: 1 });
    const svadhisthana = state.t2Nodes.get("SVADHISTHANA");
    if (svadhisthana) {
      svadhisthana.state = T2NodeState.ACTIVE;
    }
    processInsightLibraryTriggers(state);
    const model = buildInsightLibraryUiModel(state);
    const activation = model.find((section) => section.category === "body_node_activation");
    expect(activation).toBeTruthy();
    if (!activation) {
      return;
    }
    expect(activation.entries.some((entry) => entry.discovered)).toBe(true);
    expect(activation.entries.some((entry) => !entry.discovered && entry.title.startsWith("???"))).toBe(true);
    const discoveredEntry = activation.entries.find((entry) => entry.discovered);
    expect(discoveredEntry?.discoveredAtTick).not.toBeNull();
  });
});

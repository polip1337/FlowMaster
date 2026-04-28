import { describe, expect, it } from "vitest";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import { DaoType } from "../../../src/core/dao/types";
import {
  checkDaoSelectionTrigger,
  generateDaoInsights,
  selectDao,
  updateDaoNodeProgression
} from "../../../src/core/dao/daoSystem";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { T2NodeState } from "../../../src/core/nodes/T2Types";

describe("phase 12 dao system", () => {
  it("triggers moment of stillness at first rank 2 without selected dao", () => {
    const state = buildInitialGameState();
    state.t2Nodes.get("MULADHARA")!.rank = 2;

    const triggered = checkDaoSelectionTrigger(state);
    expect(triggered).toBe(true);
    expect(state.specialEventFlags.has("event:moment_of_stillness")).toBe(true);
  });

  it("selectDao initializes dao nodes and first unlockable skill", () => {
    const state = buildInitialGameState();
    const next = selectDao(state, DaoType.Fire);

    expect(next.playerDao.selectedDao).toBe(DaoType.Fire);
    expect(next.playerDao.daoNodes.size).toBeGreaterThanOrEqual(5);
    const firstNode = next.playerDao.daoNodes.get("FIRE_SPARK");
    expect(firstNode?.state).toBe(T2NodeState.SEALING);
    expect(next.playerDao.availableSkillIds).toContain("fire-blazing-strike");
  });

  it("gains dao insights from base and burst events", () => {
    const state = buildInitialGameState();
    selectDao(state, DaoType.Void);
    state.cultivationAttributes.daoInsightGain = 10;
    state.progression.breakthroughEvents.push({
      nodeId: "MULADHARA",
      fromRank: 1,
      toRank: 2,
      qualityNodesBoosted: 3,
      tick: 1
    });
    state.specialEventFlags.add("event:combat_victory");
    state.specialEventFlags.add("event:dao_comprehension_complete");

    const gained = generateDaoInsights(state);
    // 10 * 0.1 + breakthrough(50) + combat(10) + challenge(100)
    expect(gained).toBeGreaterThanOrEqual(161);
    expect(state.playerDao.daoInsights).toBe(gained);
    expect(state.specialEventFlags.has("event:combat_victory")).toBe(false);
  });

  it("unlocks and levels dao nodes with insight and energy costs", () => {
    const state = buildInitialGameState();
    selectDao(state, DaoType.Fire);
    state.playerDao.daoInsights = 10_000;
    for (const t2 of state.t2Nodes.values()) {
      for (const t1 of t2.t1Nodes.values()) {
        t1.energy[EnergyType.YangQi] = 500;
      }
    }

    updateDaoNodeProgression(state);

    const spark = state.playerDao.daoNodes.get("FIRE_SPARK");
    expect(spark?.state).toBe(T2NodeState.ACTIVE);
    expect(state.playerDao.availableSkillIds.includes("fire-blazing-strike")).toBe(true);
  });

  it("increments comprehension on dao node rank-up and sets challenge availability", () => {
    const state = buildInitialGameState();
    selectDao(state, DaoType.Sword);
    state.playerDao.comprehensionLevel = 7;
    state.playerDao.daoInsights = 1_000_000;
    for (const t2 of state.t2Nodes.values()) {
      for (const t1 of t2.t1Nodes.values()) {
        t1.energy[EnergyType.YangQi] = 20_000;
      }
    }
    const node = state.playerDao.daoNodes.get("SWORD_EDGE")!;
    node.state = T2NodeState.ACTIVE;
    node.level = 9;
    node.rank = 1;

    updateDaoNodeProgression(state);

    expect(node.rank).toBeGreaterThanOrEqual(2);
    expect(state.playerDao.comprehensionLevel).toBeGreaterThanOrEqual(8);
    expect(state.specialEventFlags.has("event:dao_comprehension_available")).toBe(true);
  });
});

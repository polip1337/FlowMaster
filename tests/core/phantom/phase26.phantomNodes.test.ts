import { describe, expect, it } from "vitest";
import { DaoType } from "../../../src/core/dao/types";
import { selectDao, updateDaoNodeProgression } from "../../../src/core/dao/daoSystem";
import { EnergyType } from "../../../src/core/energy/EnergyType";
import {
  beginPhantomRetrieval,
  plantPhantomNode,
  processPhantomTick,
  tryUnlockPhantomNode
} from "../../../src/core/phantom/phantomSystem";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { TICKS_PER_INGAME_HOUR } from "../../../src/core/constants";
import { T2NodeState } from "../../../src/core/nodes/T2Types";

function fillYangQi(state: ReturnType<typeof buildInitialGameState>, amount: number): void {
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      t1.energy[EnergyType.YangQi] = amount;
    }
  }
}

describe("phase 26 phantom nodes", () => {
  it("unlocks phantom node on dao rank-advance reward with gating", () => {
    const state = buildInitialGameState();
    selectDao(state, DaoType.Sword);
    state.t2Nodes.get("MULADHARA")!.rank = 7;
    state.playerDao.comprehensionLevel = 5;
    state.playerDao.daoInsights = 1_000_000;
    fillYangQi(state, 20_000);

    const node = state.playerDao.daoNodes.get("SWORD_EDGE")!;
    node.state = T2NodeState.ACTIVE;
    node.level = 9;
    node.rank = 1;

    updateDaoNodeProgression(state);
    expect(state.playerDao.comprehensionLevel).toBeGreaterThanOrEqual(6);
    expect(state.phantomNodes).toHaveLength(1);
  });

  it("plants phantom node and transfers generation to nearest chakra each tick", () => {
    const state = buildInitialGameState();
    selectDao(state, DaoType.Void);
    state.t2Nodes.get("MULADHARA")!.rank = 7;
    state.playerDao.comprehensionLevel = 6;
    const seed = [...state.playerDao.daoNodes.values()][0]!;
    seed.state = T2NodeState.ACTIVE;
    const phantom = tryUnlockPhantomNode(state);
    expect(phantom).not.toBeNull();

    const planted = plantPhantomNode(state, phantom!.id, "moonwell_ruins", { x: 0.5, y: 0.15 });
    expect(planted).toBe(true);

    const sahasrara = state.t2Nodes.get("SAHASRARA")!;
    const source = [...sahasrara.t1Nodes.values()].find((n) => n.isSourceNode) ?? [...sahasrara.t1Nodes.values()][0]!;
    const beforeShen = source.energy[EnergyType.Shen];
    processPhantomTick(state);
    expect(source.energy[EnergyType.Shen]).toBeGreaterThan(beforeShen);
  });

  it("prevents phantom replant while already planted", () => {
    const state = buildInitialGameState();
    selectDao(state, DaoType.Void);
    state.t2Nodes.get("MULADHARA")!.rank = 7;
    state.playerDao.comprehensionLevel = 6;
    const seed = [...state.playerDao.daoNodes.values()][0]!;
    seed.state = T2NodeState.ACTIVE;
    const phantom = tryUnlockPhantomNode(state)!;

    const planted = plantPhantomNode(state, phantom.id, "moonwell_ruins", { x: 0.5, y: 0.15 });
    expect(planted).toBe(true);
    const replanted = plantPhantomNode(state, phantom.id, "volcanic_rift", { x: 0.2, y: 0.2 });
    expect(replanted).toBe(false);
    expect(phantom.locationId).toBe("moonwell_ruins");
  });

  it("prevents leveling dao node while linked phantom is planted", () => {
    const state = buildInitialGameState();
    selectDao(state, DaoType.Sword);
    state.t2Nodes.get("MULADHARA")!.rank = 7;
    state.playerDao.comprehensionLevel = 6;
    const node = state.playerDao.daoNodes.get("SWORD_EDGE")!;
    node.state = T2NodeState.ACTIVE;
    node.level = 3;
    node.rank = 1;
    const phantom = tryUnlockPhantomNode(state);
    expect(phantom).not.toBeNull();
    const planted = plantPhantomNode(state, phantom!.id, "volcanic_rift", { x: 0.5, y: 0.55 });
    expect(planted).toBe(true);

    state.playerDao.daoInsights = 1_000_000;
    fillYangQi(state, 20_000);
    updateDaoNodeProgression(state);
    expect(node.level).toBe(3);
    expect(node.rank).toBe(1);
  });

  it("retrieves planted phantom after one in-game hour", () => {
    const state = buildInitialGameState();
    selectDao(state, DaoType.Fire);
    state.t2Nodes.get("MULADHARA")!.rank = 7;
    state.playerDao.comprehensionLevel = 6;
    const seed = [...state.playerDao.daoNodes.values()][0]!;
    seed.state = T2NodeState.ACTIVE;
    const phantom = tryUnlockPhantomNode(state)!;
    plantPhantomNode(state, phantom.id, "volcanic_rift", { x: 0.5, y: 0.5 });

    const started = beginPhantomRetrieval(state, phantom.id);
    expect(started).toBe(true);
    expect(phantom.retrievalEndsAtTick).toBe(state.tick + TICKS_PER_INGAME_HOUR);

    state.tick = phantom.retrievalEndsAtTick!;
    processPhantomTick(state);
    expect(phantom.isPlanted).toBe(false);
    expect(phantom.locationId).toBeNull();
    expect(phantom.retrievalEndsAtTick).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { EnergyType, emptyPool, totalEnergy } from "../../../src/core/energy/EnergyType";
import { applyMeridianFlowPriorityCap } from "../../../src/core/meridians/meridianLogic";
import { createT2Cluster } from "../../../src/core/nodes/clusterFactory";
import type { T2Node } from "../../../src/core/nodes/T2Node";
import { T1NodeState } from "../../../src/core/nodes/T1Types";
import { T2NodeState, T2NodeType } from "../../../src/core/nodes/T2Types";
import { getNonAffinityOverflowBoost, getT2Capacity, getT2Resonance } from "../../../src/core/nodes/t2Logic";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { applyManipuraRefiningPulse } from "../../../src/core/simulation/conversion";
import { applyFootSoleEarthJing, applyShenPassiveGeneration, FOOT_SOLE_T1_ID } from "../../../src/core/simulation/phase8EnergyStep";
import { simulationTick } from "../../../src/core/simulation/tick";
import { anahataTopology } from "../../../src/data/topologies/anahata";
import { footTopology } from "../../../src/data/topologies/foot";
import { manipuraTopology } from "../../../src/data/topologies/manipura";

function minimalT2(id: string, cluster: ReturnType<typeof createT2Cluster>): T2Node {
  return {
    id,
    name: id,
    type: T2NodeType.CHAKRA,
    state: T2NodeState.ACTIVE,
    t1Nodes: cluster.nodes,
    t1Edges: cluster.edges,
    unlockedEdges: [],
    ioNodeMap: new Map(),
    rank: 1,
    level: 3,
    sealingProgress: 0,
    unlockConditions: [],
    upgradeConditions: [],
    meridianSlotIds: [],
    latentT1NodeIds: cluster.latentT1NodeIds,
    flowBonusPercent: 0,
    nodeDamageState: { cracked: false, shattered: false, repairProgress: 0 },
    refinedResonanceBonusApplied: false
  };
}

describe("Phase 8 — TASK-081 meridian priority cap", () => {
  it("allocates width to Shen before lower-priority types when over cap", () => {
    const desired = emptyPool();
    desired[EnergyType.Shen] = 10;
    desired[EnergyType.Jing] = 10;
    desired[EnergyType.Qi] = 10;
    desired[EnergyType.YangQi] = 10;
    const out = applyMeridianFlowPriorityCap(desired, 15);
    expect(out[EnergyType.Shen]).toBe(10);
    expect(out[EnergyType.Jing]).toBe(5);
    expect(out[EnergyType.Qi]).toBe(0);
    expect(out[EnergyType.YangQi]).toBe(0);
    expect(totalEnergy(out)).toBe(15);
  });
});

describe("Phase 8 — TASK-078 foot SOLE Jing", () => {
  it("adds Jing to ACTIVE SOLE on ACTIVE foot cluster", () => {
    const cluster = createT2Cluster(footTopology, "L_FOOT");
    const foot = minimalT2("L_FOOT", cluster);
    const sole = foot.t1Nodes.get(FOOT_SOLE_T1_ID)!;
    sole.state = T1NodeState.ACTIVE;
    sole.quality = 2;
    const before = sole.energy[EnergyType.Jing];
    applyFootSoleEarthJing(foot, 1);
    expect(sole.energy[EnergyType.Jing]).toBeCloseTo(before + 0.03 * 2 * 1, 8);
  });
});

describe("Phase 8 — TASK-079 Manipura refining pulse", () => {
  it("converts Qi to YangQi at furnace when active", () => {
    const cluster = createT2Cluster(manipuraTopology, "MANIPURA");
    const manipura = minimalT2("MANIPURA", cluster);
    const furnace = manipura.t1Nodes.get(11)!;
    furnace.state = T1NodeState.ACTIVE;
    furnace.energy[EnergyType.Qi] = 30;
    furnace.energy[EnergyType.YangQi] = 0;
    const heat = applyManipuraRefiningPulse(manipura, true, 0);
    expect(heat).toBeGreaterThan(0);
    expect(furnace.energy[EnergyType.Qi]).toBeLessThan(30);
    expect(furnace.energy[EnergyType.YangQi]).toBeGreaterThan(0);
  });
});

describe("Phase 8 — TASK-082 non-affinity overflow", () => {
  it("returns positive boost when non-affinity energy exceeds 60% of C_T2", () => {
    const cluster = createT2Cluster(footTopology, "L_FOOT");
    const foot = minimalT2("L_FOOT", cluster);
    const C = getT2Capacity(foot);
    const target = 0.65 * C;
    for (const t1 of foot.t1Nodes.values()) {
      t1.energy[EnergyType.Qi] = 0;
      t1.energy[EnergyType.Jing] = 0;
      t1.energy[EnergyType.YangQi] = 0;
      t1.energy[EnergyType.Shen] = 0;
    }
    const first = foot.t1Nodes.get(0)!;
    first.energy[EnergyType.YangQi] = target;
    expect(getNonAffinityOverflowBoost(foot)).toBeGreaterThan(0);
  });
});

describe("Phase 8 — TASK-083 Jing depletion", () => {
  it("sets warning and drains hp when global Jing is below 10% of capacity budget", () => {
    let state = buildInitialGameState();
    const activeT2 = [...state.t2Nodes.values()].filter((t2) => t2.state === T2NodeState.ACTIVE).length;
    for (const t2 of state.t2Nodes.values()) {
      for (const t1 of t2.t1Nodes.values()) {
        t1.energy[EnergyType.Jing] = 0;
      }
    }
    const hp0 = state.hp;
    state = simulationTick(state);
    expect(state.jingDepletionWarning).toBe(true);
    expect(state.hp).toBeCloseTo(hp0 + 0.1 - 0.001 * activeT2, 6);
  });
});

describe("Phase 8 — TASK-080 Shen passive", () => {
  it("adds Shen to target T1 when resonance exceeds 0.5", () => {
    const cluster = createT2Cluster(anahataTopology, "ANAHATA");
    const heart = minimalT2("ANAHATA", cluster);
    for (const t1 of heart.t1Nodes.values()) {
      t1.state = T1NodeState.ACTIVE;
      t1.quality = 8;
    }
    expect(getT2Resonance(heart)).toBeGreaterThan(0.5);
    const hx1 = heart.t1Nodes.get(6)!;
    const before = hx1.energy[EnergyType.Shen];
    applyShenPassiveGeneration(heart);
    expect(hx1.energy[EnergyType.Shen]).toBeCloseTo(before + 0.003, 8);
  });
});

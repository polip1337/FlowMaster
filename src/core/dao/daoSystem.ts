import { DELTA_T } from "../constants";
import { DaoType } from "./types";
import type { GameState } from "../../state/GameState";
import type { T2Node } from "../nodes/T2Node";
import { T2NodeState, T2NodeType } from "../nodes/T2Types";
import { createT2Cluster } from "../nodes/clusterFactory";
import { computeStandardUpgradeRequirements } from "../nodes/t2Logic";
import { allTopologies } from "../../data/topologies";
import { DAO_NODE_DEFS_BY_TYPE } from "../../data/dao";
import { DAO_SKILLS } from "../../data/dao/skills";
import { EnergyType } from "../energy/EnergyType";

const COMBAT_VICTORY_FLAG = "event:combat_victory";
const DAO_CHALLENGE_COMPLETE_FLAG = "event:dao_comprehension_complete";
const MOMENT_OF_STILLNESS_FLAG = "event:moment_of_stillness";
const DAO_CHALLENGE_AVAILABLE_FLAG = "event:dao_comprehension_available";
const DAO_FULLY_COMPREHENDED_FLAG = "event:dao_fully_comprehended";

const DAO_ENERGY_REQUIREMENTS: Record<DaoType, EnergyType[]> = {
  [DaoType.Earth]: [EnergyType.Jing],
  [DaoType.Fire]: [EnergyType.YangQi],
  [DaoType.Water]: [EnergyType.Qi],
  [DaoType.Wind]: [EnergyType.YangQi],
  [DaoType.Void]: [EnergyType.Shen],
  [DaoType.Life]: [EnergyType.Jing, EnergyType.Shen],
  [DaoType.Sword]: [EnergyType.YangQi],
  [DaoType.Thunder]: [EnergyType.YangQi, EnergyType.Shen]
};

function getHighestBodyRank(state: GameState): number {
  let rank = 1;
  for (const node of state.t2Nodes.values()) {
    rank = Math.max(rank, node.rank);
  }
  return rank;
}

function spendBodyEnergyByType(state: GameState, type: EnergyType, amount: number): boolean {
  let remaining = Math.max(0, amount);
  if (remaining <= 0) {
    return true;
  }
  const holders = [...state.t2Nodes.values()]
    .flatMap((t2) => [...t2.t1Nodes.values()])
    .filter((t1) => t1.energy[type] > 0)
    .sort((a, b) => b.energy[type] - a.energy[type]);

  for (const t1 of holders) {
    const drained = Math.min(remaining, t1.energy[type]);
    t1.energy[type] -= drained;
    remaining -= drained;
    if (remaining <= 0) {
      return true;
    }
  }
  return false;
}

function buildDaoNode(def: (typeof DAO_NODE_DEFS_BY_TYPE)[DaoType][number]): T2Node {
  const topology = allTopologies[def.topologyId as keyof typeof allTopologies];
  const cluster = createT2Cluster(topology, def.id);
  const node: T2Node = {
    id: def.id,
    name: def.name,
    type: T2NodeType.CHAKRA,
    state: def.nodeIndex === 0 ? T2NodeState.SEALING : T2NodeState.LOCKED,
    t1Nodes: cluster.nodes,
    t1Edges: cluster.edges,
    ioNodeMap: new Map(Object.entries(topology.meridianIoMap)),
    rank: 1,
    level: 1,
    sealingProgress: 0,
    unlockConditions: [],
    upgradeConditions: [],
    meridianSlotIds: Object.keys(topology.meridianIoMap),
    latentT1NodeIds: cluster.latentT1NodeIds,
    flowBonusPercent: 0,
    nodeDamageState: "healthy",
    refinedResonanceBonusApplied: false
  };
  node.upgradeConditions = computeStandardUpgradeRequirements(node);
  return node;
}

function unlockDaoSkillsForActiveNodes(state: GameState): void {
  const activeNodeIds = new Set(
    [...state.playerDao.daoNodes.values()]
      .filter((n) => n.state === T2NodeState.ACTIVE || n.state === T2NodeState.REFINED)
      .map((n) => n.id)
  );
  for (const skill of DAO_SKILLS) {
    if (!activeNodeIds.has(skill.unlockedByDaoNode)) {
      continue;
    }
    if (!state.playerDao.availableSkillIds.includes(skill.id)) {
      state.playerDao.availableSkillIds.push(skill.id);
    }
  }
}

function daoNodeThreshold(state: GameState, nodeIndex: number): number {
  return state.playerDao.insightThresholds[nodeIndex] ?? Number.POSITIVE_INFINITY;
}

function updateDaoComprehensionFlags(state: GameState): void {
  if (state.playerDao.comprehensionLevel >= 8) {
    state.specialEventFlags.add(DAO_CHALLENGE_AVAILABLE_FLAG);
  }
  const daoNodes = [...state.playerDao.daoNodes.values()];
  if (daoNodes.length > 0 && daoNodes.every((n) => n.rank >= 9)) {
    state.playerDao.fullyComprehended = true;
    state.specialEventFlags.add(DAO_FULLY_COMPREHENDED_FLAG);
  }
}

export function checkDaoSelectionTrigger(state: GameState): boolean {
  if (state.playerDao.selectedDao !== null) {
    return false;
  }
  const rank = getHighestBodyRank(state);
  const shouldTrigger = rank >= 2;
  if (shouldTrigger) {
    state.specialEventFlags.add(MOMENT_OF_STILLNESS_FLAG);
  }
  return shouldTrigger;
}

export function selectDao(state: GameState, daoType: DaoType): GameState {
  if (state.playerDao.selectedDao !== null) {
    return state;
  }
  const defs = DAO_NODE_DEFS_BY_TYPE[daoType];
  const daoNodes = new Map<string, T2Node>();
  for (const def of defs) {
    daoNodes.set(def.id, buildDaoNode(def));
  }

  state.playerDao.selectedDao = daoType;
  state.playerDao.daoNodes = daoNodes;
  state.playerDao.selectedAtBodyRank = getHighestBodyRank(state);
  state.playerDao.availableSkillIds = defs.length > 0 ? [defs[0].associatedSkillId] : [];
  state.playerDao.fullyComprehended = false;
  unlockDaoSkillsForActiveNodes(state);
  state.specialEventFlags.delete(MOMENT_OF_STILLNESS_FLAG);
  state.immediateConditionCheck = true;
  return state;
}

export function generateDaoInsights(state: GameState): number {
  if (state.playerDao.selectedDao === null) {
    return 0;
  }
  const ajna = state.t2Nodes.get("AJNA");
  const ajnaResonance = ajna ? [...ajna.t1Nodes.values()].reduce((s, t1) => s + t1.resonanceMultiplier, 0) / ajna.t1Nodes.size : 0;
  const base = state.cultivationAttributes.daoInsightGain * DELTA_T * (1 + ajnaResonance * 0.5);

  const breakthroughDelta = state.progression.breakthroughEvents.length - state.playerDao.processedBreakthroughEvents;
  const breakthroughBurst = Math.max(0, breakthroughDelta) * 50;
  state.playerDao.processedBreakthroughEvents = state.progression.breakthroughEvents.length;

  const combatBurst = state.specialEventFlags.has(COMBAT_VICTORY_FLAG) ? 10 : 0;
  const challengeBurst = state.specialEventFlags.has(DAO_CHALLENGE_COMPLETE_FLAG) ? 100 : 0;
  state.specialEventFlags.delete(COMBAT_VICTORY_FLAG);
  state.specialEventFlags.delete(DAO_CHALLENGE_COMPLETE_FLAG);

  const totalGain = base + breakthroughBurst + combatBurst + challengeBurst;
  state.playerDao.daoInsights += totalGain;
  return totalGain;
}

export function updateDaoNodeProgression(state: GameState): void {
  const selectedDao = state.playerDao.selectedDao;
  if (!selectedDao) {
    return;
  }
  const energyTypes = DAO_ENERGY_REQUIREMENTS[selectedDao];
  const defs = DAO_NODE_DEFS_BY_TYPE[selectedDao];

  for (const def of defs) {
    const node = state.playerDao.daoNodes.get(def.id);
    if (!node) {
      continue;
    }

    if (node.state === T2NodeState.LOCKED) {
      const prevDef = defs[def.nodeIndex - 1];
      const prevNode = prevDef ? state.playerDao.daoNodes.get(prevDef.id) : undefined;
      if (!prevNode || prevNode.state === T2NodeState.ACTIVE || prevNode.state === T2NodeState.REFINED) {
        node.state = T2NodeState.SEALING;
      }
    }

    if (node.state === T2NodeState.SEALING) {
      const threshold = daoNodeThreshold(state, def.nodeIndex);
      if (state.playerDao.daoInsights >= threshold) {
        const energyCost = 100 * (def.nodeIndex + 1);
        const canPay = energyTypes.every((type) => spendBodyEnergyByType(state, type, energyCost));
        if (canPay) {
          state.playerDao.daoInsights -= threshold;
          node.state = T2NodeState.ACTIVE;
          node.sealingProgress = 1;
        }
      }
      continue;
    }

    if (node.state !== T2NodeState.ACTIVE && node.state !== T2NodeState.REFINED) {
      continue;
    }

    const levelCost = Math.max(1, daoNodeThreshold(state, def.nodeIndex) * node.level);
    const energyCost = 40 * node.rank * node.level;
    if (node.level < 9 && state.playerDao.daoInsights >= levelCost) {
      const canPay = energyTypes.every((type) => spendBodyEnergyByType(state, type, energyCost));
      if (canPay) {
        state.playerDao.daoInsights -= levelCost;
        node.level += 1;
      }
    } else if (node.level >= 9 && node.rank < 9 && state.playerDao.daoInsights >= levelCost * 2) {
      const canPay = energyTypes.every((type) => spendBodyEnergyByType(state, type, energyCost * 3));
      if (canPay) {
        state.playerDao.daoInsights -= levelCost * 2;
        node.rank += 1;
        node.level = 1;
        state.playerDao.comprehensionLevel += 1;
      }
    }
  }

  unlockDaoSkillsForActiveNodes(state);
  updateDaoComprehensionFlags(state);
}

export function getDaoSkillScaling(node: T2Node, techniquePower: number): number {
  return (1 + node.rank * 0.2 + node.level * 0.08) * (1 + techniquePower / 100);
}

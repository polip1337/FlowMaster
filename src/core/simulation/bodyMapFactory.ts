import { EnergyType, emptyPool } from "../energy/EnergyType";
import { createEmptyCombatAttributes, createEmptyCultivationAttributes } from "../attributes/types";
import type { Meridian } from "../meridians/Meridian";
import { MeridianState } from "../meridians/MeridianTypes";
import { createT2Cluster } from "../nodes/clusterFactory";
import { computeStandardUpgradeRequirements } from "../nodes/t2Logic";
import type { T2Node } from "../nodes/T2Node";
import { T1NodeState } from "../nodes/T1Types";
import { T2NodeState } from "../nodes/T2Types";
import { BODY_MAP_EDGES, bodyMeridianId } from "../../data/bodyMap";
import { allTopologies } from "../../data/topologies";
import { validateAllTopologies } from "../../data/topologies/validateTopology";
import type { T1ClusterTopology } from "../../data/topologies/types";
import { T2_NODE_DEFS } from "../../data/t2NodeDefs";
import type { GameState } from "../../state/GameState";
import { BASIC_TECHNIQUE } from "./CultivationTechnique";
import type { CompanionState } from "../companion/types";
import {
  createInitialCelestialBodies,
  createInitialCelestialCalendar,
  refreshCelestialStateForCurrentDay
} from "../celestial/calendar";
import { createInitialInsightLibraryState } from "../insight/insightLibrary";

function ioNodeMapFromTopology(topology: T1ClusterTopology): Map<string, number> {
  return new Map(Object.entries(topology.meridianIoMap));
}

function createUneStablishedMeridian(
  edge: (typeof BODY_MAP_EDGES)[number],
  id: string
): Meridian {
  return {
    id,
    nodeFromId: edge.fromNodeId,
    nodeToId: edge.toNodeId,
    ioNodeOutId: edge.fromT1IoId,
    ioNodeInId: edge.toT1IoId,
    state: MeridianState.UNESTABLISHED,
    width: 0,
    purity: 0,
    totalFlow: 0,
    jingDeposit: 0,
    shenScatterBonus: 0,
    basePurity: 0,
    typeAffinity: null,
    affinityFraction: 0,
    dominantTypeAccumulator: emptyPool(),
    isEstablished: false,
    isScarred: false,
    scarPenalty: 0,
    hopCount: edge.hopCount,
    isReverse: false
  };
}

/**
 * Full initial save: all 24 clusters, all body meridian slots (UNESTABLISHED),
 * only Muladhara ACTIVE with its source T1 UNSEALED (via cluster factory).
 */
export function buildInitialGameState(): GameState {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    const topoErrors = validateAllTopologies(allTopologies as unknown as Record<string, T1ClusterTopology>);
    if (topoErrors.length > 0) {
      const msg = topoErrors.map((e) => `${e.topologyId}: ${e.message}`).join("\n");
      throw new Error(`Topology validation failed:\n${msg}`);
    }
  }

  const t2Nodes = new Map<string, T2Node>();

  for (const def of T2_NODE_DEFS) {
    const topology = allTopologies[def.topologyId];
    const cluster = createT2Cluster(topology, def.id);
    const node: T2Node = {
      id: def.id,
      name: def.displayName,
      type: def.type,
      state: def.id === "MULADHARA" ? T2NodeState.ACTIVE : T2NodeState.LOCKED,
      t1Nodes: cluster.nodes,
      t1Edges: cluster.edges,
      unlockedEdges: [],
      ioNodeMap: ioNodeMapFromTopology(topology),
      rank: 1,
      level: 1,
      sealingProgress: 0,
      unlockConditions: def.unlockConditions,
      upgradeConditions: [],
      meridianSlotIds: Object.keys(topology.meridianIoMap),
      latentT1NodeIds: cluster.latentT1NodeIds,
      flowBonusPercent: 0,
      nodeDamageState: {
        cracked: false,
        shattered: false,
        repairProgress: 0
      },
      refinedResonanceBonusApplied: false
    };
    node.upgradeConditions = computeStandardUpgradeRequirements(node);
    if (def.id === "MULADHARA") {
      const src = [...node.t1Nodes.values()].find((n) => n.isSourceNode);
      if (src) {
        src.state = T1NodeState.ACTIVE;
        const seed = src.capacity * 0.3;
        src.energy = { ...emptyPool(), [EnergyType.Qi]: seed };
      }
    }
    t2Nodes.set(def.id, node);
  }

  const meridians = new Map<string, Meridian>();
  for (const edge of BODY_MAP_EDGES) {
    const id = bodyMeridianId(edge.fromNodeId, edge.toNodeId);
    meridians.set(id, createUneStablishedMeridian(edge, id));
  }

  const companion: CompanionState = {
    active: false,
    name: "Companion",
    cultivation: {
      t2Nodes: new Map(),
      meridians: new Map(),
      activeRoute: null,
      techniqueStrength: 1
    },
    harmonyLevel: 0,
    sharedRouteActive: false,
    crossBodyMeridians: []
  };

  const initialState: GameState = {
    t2Nodes,
    meridians,
    bodyHeat: 0,
    maxBodyHeat: 1000,
    environmentModifier: 1,
    refiningPulseActive: false,
    hp: 100,
    maxHp: 100,
    soulHp: 50,
    maxSoulHp: 50,
    jingDepletionWarning: false,
    activeRoute: null,
    technique: { ...BASIC_TECHNIQUE },
    playerDao: {
      selectedDao: null,
      daoNodes: new Map(),
      daoInsights: 0,
      insightThresholds: [120, 240, 420, 700, 1100, 1600, 2200],
      comprehensionLevel: 0,
      resetCost: 1_000_000,
      selectedAtBodyRank: null,
      availableSkillIds: [],
      fullyComprehended: false,
      processedBreakthroughEvents: 0
    },
    combat: null,
    inventory: [],
    ingredientInventory: [],
    alchemySession: null,
    placedFormationArrays: [],
    unlockedTechniques: [BASIC_TECHNIQUE.id],
    nodeSealThresholdModifiers: {},
    globalTrackers: {
      lifetimeEnergyByType: emptyPool(),
      totalEnergyGenerated: 0,
      nodeDamageCount: 0,
      combatCount: 0
    },
    tutorial: {
      completedSteps: []
    },
    cultivationAttributes: createEmptyCultivationAttributes(),
    combatAttributes: createEmptyCombatAttributes(),
    progression: {
      unlockEvents: [],
      levelUpEvents: [],
      breakthroughEvents: []
    },
    tribulation: {
      activeEvent: null,
      activeNodeId: null,
      pendingBreakthrough: null,
      currentWaveIndex: 0,
      elapsedTicks: 0,
      isCultivationPaused: false,
      delayUntilTickByNode: {},
      permanentCultivationRateBonus: 0
    },
    specialEventFlags: new Set<string>(),
    sect: {
      joinedSectId: null,
      elderFavorLevels: {}
    },
    bodyTemperingState: {
      temperingLevel: 1,
      temperingXP: 0,
      currentTrainingAction: null,
      trainingCooldown: 0
    },
    celestialBodies: createInitialCelestialBodies(),
    celestialCalendar: createInitialCelestialCalendar(),
    companion,
    insightLibrary: createInitialInsightLibraryState(),
    phantomNodes: [],
    tick: 0,
    immediateConditionCheck: true,
    activeRepairNodeId: null,
    meridianHarmonics: {
      pairs: [],
      activeMeridianIds: [],
      pulsePhase: 0,
      tintByMeridianId: {}
    },
    attributesDirty: true,
    performance: {
      lastTickDurationMs: 0,
      overBudgetTickCount: 0
    }
  };
  refreshCelestialStateForCurrentDay(initialState);
  return initialState;
}

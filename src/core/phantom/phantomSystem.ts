import { TICKS_PER_INGAME_HOUR } from "../constants";
import { EnergyType, emptyPool } from "../energy/EnergyType";
import type { T2Node } from "../nodes/T2Node";
import { T2NodeState } from "../nodes/T2Types";
import { T2_NODE_DEFS_BY_ID } from "../../data/t2NodeDefs";
import type { GameState, PhantomNode } from "../../state/GameState";

const MAX_PHANTOM_NODES = 3;
const PHANTOM_UNLOCK_MIN_RANK = 7;
const PHANTOM_UNLOCK_MIN_COMPREHENSION = 6;

const LOCATION_RESONANCE: Record<string, ReturnType<typeof emptyPool>> = {
  volcanic_rift: { ...emptyPool(), [EnergyType.YangQi]: 0.05, [EnergyType.Qi]: 0.01 },
  ancient_forest: { ...emptyPool(), [EnergyType.Jing]: 0.04, [EnergyType.Qi]: 0.02 },
  moonwell_ruins: { ...emptyPool(), [EnergyType.Shen]: 0.03, [EnergyType.Qi]: 0.015 },
  crystal_cavern: { ...emptyPool(), [EnergyType.Qi]: 0.045, [EnergyType.Shen]: 0.01 }
};

const DEFAULT_RESONANCE = { ...emptyPool(), [EnergyType.Qi]: 0.02 };

function highestBodyRank(state: GameState): number {
  let highest = 1;
  for (const node of state.t2Nodes.values()) {
    highest = Math.max(highest, node.rank);
  }
  return highest;
}

function nearestPhantomTargetNodeId(phantom: PhantomNode): string {
  const anahataPos = T2_NODE_DEFS_BY_ID.get("ANAHATA")?.displayPosition;
  const sahasraraPos = T2_NODE_DEFS_BY_ID.get("SAHASRARA")?.displayPosition;
  if (!anahataPos || !sahasraraPos) {
    return "ANAHATA";
  }
  const dxA = phantom.bodyOverlayPosition.x - anahataPos.x;
  const dyA = phantom.bodyOverlayPosition.y - anahataPos.y;
  const dxS = phantom.bodyOverlayPosition.x - sahasraraPos.x;
  const dyS = phantom.bodyOverlayPosition.y - sahasraraPos.y;
  const dA = dxA * dxA + dyA * dyA;
  const dS = dxS * dxS + dyS * dyS;
  return dA <= dS ? "ANAHATA" : "SAHASRARA";
}

function getDaoNodeSnapshot(state: GameState): T2Node | null {
  const activeDaoNode = [...state.playerDao.daoNodes.values()].find(
    (node) => node.state === T2NodeState.ACTIVE || node.state === T2NodeState.REFINED
  );
  if (!activeDaoNode) {
    return null;
  }
  return structuredClone(activeDaoNode);
}

export function tryUnlockPhantomNode(state: GameState): PhantomNode | null {
  const canUnlock =
    highestBodyRank(state) >= PHANTOM_UNLOCK_MIN_RANK &&
    state.playerDao.comprehensionLevel >= PHANTOM_UNLOCK_MIN_COMPREHENSION;
  if (!canUnlock || state.phantomNodes.length >= MAX_PHANTOM_NODES) {
    return null;
  }
  const snapshot = getDaoNodeSnapshot(state);
  if (!snapshot || state.playerDao.selectedDao === null) {
    return null;
  }
  const phantom: PhantomNode = {
    id: `phantom_${state.phantomNodes.length + 1}`,
    daoType: state.playerDao.selectedDao,
    bodyOverlayPosition: { x: 0.5, y: 0.5 },
    t2NodeRef: snapshot,
    isPlanted: false,
    locationId: null,
    generationBonus: emptyPool(),
    retrievalEndsAtTick: null
  };
  state.phantomNodes.push(phantom);
  return phantom;
}

export function plantPhantomNode(
  state: GameState,
  phantomId: string,
  locationId: string,
  bodyOverlayPosition: { x: number; y: number }
): boolean {
  const phantom = state.phantomNodes.find((node) => node.id === phantomId);
  if (!phantom || phantom.retrievalEndsAtTick !== null) {
    return false;
  }
  phantom.isPlanted = true;
  phantom.locationId = locationId;
  phantom.bodyOverlayPosition = bodyOverlayPosition;
  phantom.generationBonus = structuredClone(LOCATION_RESONANCE[locationId] ?? DEFAULT_RESONANCE);
  return true;
}

export function beginPhantomRetrieval(state: GameState, phantomId: string): boolean {
  const phantom = state.phantomNodes.find((node) => node.id === phantomId);
  if (!phantom || !phantom.isPlanted || phantom.retrievalEndsAtTick !== null) {
    return false;
  }
  phantom.retrievalEndsAtTick = state.tick + TICKS_PER_INGAME_HOUR;
  return true;
}

export function processPhantomTick(state: GameState): void {
  for (const phantom of state.phantomNodes) {
    if (phantom.retrievalEndsAtTick !== null && state.tick >= phantom.retrievalEndsAtTick) {
      phantom.isPlanted = false;
      phantom.locationId = null;
      phantom.generationBonus = emptyPool();
      phantom.retrievalEndsAtTick = null;
    }
    if (!phantom.isPlanted || phantom.retrievalEndsAtTick !== null) {
      continue;
    }
    const targetNodeId = nearestPhantomTargetNodeId(phantom);
    const targetT2 = state.t2Nodes.get(targetNodeId);
    if (!targetT2) {
      continue;
    }
    const targetT1 = [...targetT2.t1Nodes.values()].find((n) => n.isSourceNode) ?? [...targetT2.t1Nodes.values()][0];
    if (!targetT1) {
      continue;
    }
    for (const type of Object.values(EnergyType)) {
      targetT1.energy[type] += phantom.generationBonus[type];
    }
  }
}

export function isDaoNodeBlockedByPlantedPhantom(state: GameState, nodeId: string): boolean {
  return state.phantomNodes.some((phantom) => phantom.isPlanted && phantom.t2NodeRef.id === nodeId);
}

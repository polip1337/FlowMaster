import { validateRoute } from "../circulation/routes";
import { EnergyType, emptyPool, totalEnergy } from "../energy/EnergyType";
import type { Meridian } from "../meridians/Meridian";
import { MeridianState } from "../meridians/MeridianTypes";
import {
  applyMeridianFlow,
  computeActiveMeridianFlow,
  computeFlowBonus,
  computePassiveMeridianFlow,
  updateMeridianAffinity,
  updateMeridianDeposits,
  updateMeridianWidth
} from "../meridians/meridianLogic";
import type { T2Node } from "../nodes/T2Node";
import type { CompanionState } from "./types";

const CROSS_BODY_MERIDIAN_ID = "cross:anahata:player-companion";
const CROSS_BODY_OPEN_HARMONY = 90;
const SHARED_ROUTE_HARMONY = 50;
const MIN_BODY_RANK_FOR_CROSS = 6;

function getHighestRank(t2Nodes: Map<string, T2Node>): number {
  let rank = 1;
  for (const node of t2Nodes.values()) {
    rank = Math.max(rank, node.rank);
  }
  return rank;
}

export function runCompanionCultivationTick(companion: CompanionState): void {
  if (!companion.active) {
    return;
  }
  const activeRouteIds = new Set<string>();
  const route = companion.cultivation.activeRoute;
  if (route?.isActive) {
    const validation = validateRoute(route.nodeSequence, companion.cultivation.meridians, companion.cultivation.t2Nodes);
    if (validation.valid) {
      for (let i = 0; i < route.nodeSequence.length - 1; i += 1) {
        activeRouteIds.add(`${route.nodeSequence[i]}->${route.nodeSequence[i + 1]}`);
      }
    }
  }

  for (const meridian of companion.cultivation.meridians.values()) {
    if (!meridian.isEstablished || meridian.state === MeridianState.UNESTABLISHED) {
      continue;
    }
    const fromNode = companion.cultivation.t2Nodes.get(meridian.nodeFromId);
    const toNode = companion.cultivation.t2Nodes.get(meridian.nodeToId);
    if (!fromNode || !toNode) {
      continue;
    }
    const routeKey = `${meridian.nodeFromId}->${meridian.nodeToId}`;
    const requested = activeRouteIds.has(routeKey)
      ? computeActiveMeridianFlow(meridian, fromNode, toNode, companion.cultivation.techniqueStrength)
      : computePassiveMeridianFlow(meridian, fromNode, toNode);
    const applied = applyMeridianFlow(fromNode, toNode, requested, meridian);
    if (totalEnergy(applied.grossWithdrawn) <= 0) {
      continue;
    }
    updateMeridianWidth(meridian, applied.grossWithdrawn);
    meridian.purity = Math.min(0.99, meridian.purity);
    updateMeridianAffinity(meridian, applied.grossWithdrawn);
  }
}

export function evaluateSharedRouteActivation(
  companion: CompanionState,
  playerRoute: { isActive: boolean; nodeSequence: string[] } | null
): boolean {
  if (!companion.active || companion.harmonyLevel < SHARED_ROUTE_HARMONY || !playerRoute?.isActive) {
    companion.sharedRouteActive = false;
    return false;
  }
  const companionRoute = companion.cultivation.activeRoute;
  const matches = Boolean(
    companionRoute?.isActive &&
      companionRoute.nodeSequence.length > 2 &&
      companionRoute.nodeSequence.join("->") === playerRoute.nodeSequence.join("->")
  );
  companion.sharedRouteActive = matches;
  return matches;
}

export function ensureCrossBodyMeridian(
  companion: CompanionState,
  playerT2Nodes: Map<string, T2Node>
): Meridian | null {
  if (!companion.active || companion.harmonyLevel < CROSS_BODY_OPEN_HARMONY) {
    return null;
  }
  if (
    getHighestRank(playerT2Nodes) < MIN_BODY_RANK_FOR_CROSS ||
    getHighestRank(companion.cultivation.t2Nodes) < MIN_BODY_RANK_FOR_CROSS
  ) {
    return null;
  }
  let meridian = companion.crossBodyMeridians.find((m) => m.id === CROSS_BODY_MERIDIAN_ID) ?? null;
  if (meridian) {
    return meridian;
  }
  meridian = {
    id: CROSS_BODY_MERIDIAN_ID,
    nodeFromId: "ANAHATA",
    nodeToId: "ANAHATA",
    ioNodeOutId: 0,
    ioNodeInId: 0,
    state: MeridianState.NASCENT,
    width: 1.2,
    purity: 0.8,
    totalFlow: 0,
    jingDeposit: 0,
    shenScatterBonus: 0,
    basePurity: 0.7,
    typeAffinity: EnergyType.Shen,
    affinityFraction: 1,
    dominantTypeAccumulator: emptyPool(),
    isEstablished: true,
    isScarred: false,
    scarPenalty: 0,
    hopCount: 1,
    isReverse: false
  };
  companion.crossBodyMeridians.push(meridian);
  return meridian;
}

export function applyCrossBodyShenTransfer(
  companion: CompanionState,
  playerT2Nodes: Map<string, T2Node>
): void {
  const cross = ensureCrossBodyMeridian(companion, playerT2Nodes);
  if (!cross) {
    return;
  }
  const playerAnahata = playerT2Nodes.get("ANAHATA");
  const companionAnahata = companion.cultivation.t2Nodes.get("ANAHATA");
  if (!playerAnahata || !companionAnahata) {
    return;
  }
  const playerIo = playerAnahata.t1Nodes.get(playerAnahata.ioNodeMap.get("SOLAR") ?? -1);
  const companionIo = companionAnahata.t1Nodes.get(companionAnahata.ioNodeMap.get("SOLAR") ?? -1);
  if (!playerIo || !companionIo) {
    return;
  }
  const playerShen = playerIo.energy[EnergyType.Shen];
  const companionShen = companionIo.energy[EnergyType.Shen];
  const delta = playerShen - companionShen;
  const transfer = Math.min(Math.abs(delta) * 0.1, Math.max(playerShen, companionShen));
  if (transfer <= 0) {
    return;
  }
  const from = delta >= 0 ? playerIo : companionIo;
  const to = delta >= 0 ? companionIo : playerIo;
  const moved = Math.min(from.energy[EnergyType.Shen], transfer);
  const deposited = moved * cross.purity;
  from.energy[EnergyType.Shen] -= moved;
  to.energy[EnergyType.Shen] += deposited;
  cross.totalFlow += moved;
  updateMeridianDeposits(cross, 0, moved - deposited);
  const flowPool = emptyPool();
  flowPool[EnergyType.Shen] = moved;
  updateMeridianWidth(cross, flowPool);
  updateMeridianAffinity(cross, flowPool);
}

export function getCrossBodyFlowBonus(companion: CompanionState): number {
  return companion.crossBodyMeridians
    .filter((m) => m.isEstablished)
    .reduce((sum, meridian) => sum + computeFlowBonus(meridian), 0);
}

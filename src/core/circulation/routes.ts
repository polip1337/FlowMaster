import { clamp } from "../../utils/math";
import { EnergyType, totalEnergy, type EnergyPool } from "../energy/EnergyType";
import { BODY_MAP_EDGES, BODY_T2_IDS } from "../../data/bodyMap";
import { T2_NODE_DEFS } from "../../data/t2NodeDefs";
import { allTopologies } from "../../data/topologies";
import type { T1ClusterTopology } from "../../data/topologies/types";
import { makeMeridianId } from "../meridians/meridianId";
import type { Meridian } from "../meridians/Meridian";
import {
  computeActiveMeridianFlow,
  computeMeridianPurity,
  getMeridianEffectiveWidth,
  resolveBidirDirection
} from "../meridians/meridianLogic";
import { T1NodeType } from "../nodes/T1Types";
import { meridianStateRank, MeridianState, meridianStateFromTotalFlow } from "../meridians/MeridianTypes";
import type { T2Node } from "../nodes/T2Node";
import { T2NodeState } from "../nodes/T2Types";
import type { GameState } from "../../state/GameState";
import type { CirculationRoute, RouteValidationResult } from "./types";

const MAX_ROUTE_DISTINCT_NODES = 16;
const GREAT_CIRCULATION_LOOP_EFFICIENCY = 1.3;
const GREAT_CIRCULATION_TRAINING_MOD = 1.25;
const GREAT_CIRCULATION_HEAT_MULT = 1.5;
const SHEN_BONUS_ANAHATA_PER_TICK = 0.003;
const HARMONY_LOOP_EFFICIENCY_BONUS = 0.15;
const HARMONY_TRAINING_MOD = 1.3;

const ANKLE_IDS = new Set(["L_ANKLE", "R_ANKLE"]);
/** TASK-089 — Ankle internal ring T1 ids (non KNEE/FOOT IO). */
export const ANKLE_INTERNAL_T1 = new Set([1, 2, 4, 5]);

function hasBidirIo(meridian: Meridian, fromNode: T2Node, toNode: T2Node): boolean {
  const outNode = fromNode.t1Nodes.get(meridian.ioNodeOutId);
  const inNode = toNode.t1Nodes.get(meridian.ioNodeInId);
  return Boolean(outNode?.type === T1NodeType.IO_BIDIR || inNode?.type === T1NodeType.IO_BIDIR);
}

function topologyForT2(nodeId: string): T1ClusterTopology | undefined {
  const def = T2_NODE_DEFS.find((d) => d.id === nodeId);
  if (!def) {
    return undefined;
  }
  return allTopologies[def.topologyId] as T1ClusterTopology;
}

function isTerminalT2(nodeId: string): boolean {
  return Boolean(topologyForT2(nodeId)?.terminalNode);
}

function isT2Active(node: T2Node | undefined): boolean {
  return Boolean(
    node &&
      !node.nodeDamageState.shattered &&
      (node.state === T2NodeState.ACTIVE || node.state === T2NodeState.REFINED)
  );
}

function meridianForDirectedEdge(
  fromId: string,
  toId: string,
  meridians: Map<string, Meridian>
): Meridian | undefined {
  return meridians.get(makeMeridianId(fromId, toId));
}

/**
 * TASK-085 — validate a closed circulation path.
 */
export function validateRoute(
  nodeSequence: string[],
  meridians: Map<string, Meridian>,
  t2Nodes: Map<string, T2Node>
): RouteValidationResult {
  const errors: string[] = [];

  if (nodeSequence.length < 3) {
    errors.push("closed route needs at least 3 entries (A, B, A)");
    return { valid: false, errors };
  }

  const first = nodeSequence[0];
  const last = nodeSequence[nodeSequence.length - 1];
  if (first !== last) {
    errors.push("route must close: last node must equal first");
    return { valid: false, errors };
  }

  const pathNodes = nodeSequence.slice(0, -1);
  if (pathNodes.length < 2) {
    errors.push("minimum 2 distinct T2 nodes (with double meridian for 2-node loops)");
    return { valid: false, errors };
  }

  if (pathNodes.length > MAX_ROUTE_DISTINCT_NODES) {
    errors.push(`at most ${MAX_ROUTE_DISTINCT_NODES} distinct nodes`);
  }

  const seenPath = new Set<string>();
  for (const id of pathNodes) {
    if (seenPath.has(id)) {
      errors.push(`repeated node in path: ${id}`);
    }
    seenPath.add(id);
  }

  for (const id of pathNodes) {
    if (isTerminalT2(id)) {
      errors.push(`terminal topology node cannot be on route: ${id}`);
    }
    const n = t2Nodes.get(id);
    if (!isT2Active(n)) {
      errors.push(`node not ACTIVE: ${id}`);
    }
  }

  for (let i = 0; i < nodeSequence.length - 1; i += 1) {
    const from = nodeSequence[i];
    const to = nodeSequence[i + 1];
    const m = meridianForDirectedEdge(from, to, meridians);
    if (!m) {
      errors.push(`no meridian ${from} → ${to}`);
      continue;
    }
    if (!m.isEstablished) {
      errors.push(`meridian not established: ${m.id}`);
    }
  }

  if (pathNodes.length === 2) {
    const [a, b] = pathNodes;
    const rev = meridianForDirectedEdge(b, a, meridians);
    if (!rev?.isEstablished) {
      errors.push("two-node circulation requires double meridian (both directions established)");
    }
  }

  return { valid: errors.length === 0, errors };
}

function distinctLoopNodeCount(nodeSequence: string[]): number {
  if (nodeSequence.length < 2) {
    return 0;
  }
  return nodeSequence[0] === nodeSequence[nodeSequence.length - 1]
    ? nodeSequence.length - 1
    : nodeSequence.length;
}

/**
 * TASK-086 — fill bottleneck, heat estimate, training multiplier on `route`.
 */
export function computeRouteMetrics(
  route: CirculationRoute,
  meridians: Map<string, Meridian>,
  t2Nodes: Map<string, T2Node>,
  techniqueStrength: number
): void {
  const seq = route.nodeSequence;
  const n = distinctLoopNodeCount(seq);
  if (n < 2) {
    route.loopEfficiency = 1;
    route.bottleneckMeridianId = null;
    route.estimatedHeatPerTick = 0;
    route.estimatedTrainingMultiplier = 1;
    return;
  }

  route.loopEfficiency = Math.min(1.2, 0.6 + 0.06 * (n - 2));

  let bottleneckId: string | null = null;
  let bottleneckScore = Number.POSITIVE_INFINITY;
  let heatSum = 0;
  let bottleneckTraining = 1;

  for (let i = 0; i < seq.length - 1; i += 1) {
    const fromId = seq[i];
    const toId = seq[i + 1];
    const m = meridianForDirectedEdge(fromId, toId, meridians);
    if (!m || !m.isEstablished) {
      continue;
    }

    let fromNode = t2Nodes.get(fromId);
    let toNode = t2Nodes.get(toId);
    if (!fromNode || !toNode) {
      continue;
    }

    if (hasBidirIo(m, fromNode, toNode)) {
      const dir = resolveBidirDirection(m, fromNode, toNode);
      if (dir === "idle") {
        continue;
      }
      if (dir === "receive") {
        fromNode = t2Nodes.get(m.nodeToId);
        toNode = t2Nodes.get(m.nodeFromId);
        if (!fromNode || !toNode) {
          continue;
        }
      }
    }

    m.purity = computeMeridianPurity(m);
    const W = getMeridianEffectiveWidth(m);
    const Pur = clamp(m.purity, 0, 1);
    const score = W * Pur;
    if (score < bottleneckScore) {
      bottleneckScore = score;
      bottleneckId = m.id;
      bottleneckTraining = score > 0 ? clamp(score / 3, 0.25, 1.5) : 0.25;
    }

    const flow = computeActiveMeridianFlow(m, fromNode, toNode, techniqueStrength);
    const tot = totalEnergy(flow);
    const yangFrac = tot > 0 ? flow[EnergyType.YangQi] / tot : 0;
    heatSum += yangFrac * tot * (1 - Pur);
  }

  route.bottleneckMeridianId = bottleneckId;
  route.estimatedHeatPerTick = heatSum;
  route.estimatedTrainingMultiplier = route.loopEfficiency * bottleneckTraining;
}

export function computeCirculationThrottleFactor(bodyHeat: number, maxBodyHeat: number): number {
  if (maxBodyHeat <= 0) {
    return 1;
  }
  const ratio = bodyHeat / maxBodyHeat;
  if (ratio <= 0.6) {
    return 1;
  }
  return Math.max(0.1, 1 - (ratio - 0.6) * 2.5);
}

export function getRouteMeridianIds(nodeSequence: string[]): Set<string> {
  const set = new Set<string>();
  if (nodeSequence.length < 2) {
    return set;
  }
  for (let i = 0; i < nodeSequence.length - 1; i += 1) {
    set.add(makeMeridianId(nodeSequence[i], nodeSequence[i + 1]));
  }
  return set;
}

/** Route meridian ids only when the active route passes TASK-085 validation. */
export function getActiveValidatedRouteMeridianIds(state: GameState): Set<string> {
  const route = state.activeRoute;
  if (!route?.isActive || route.nodeSequence.length < 3) {
    return new Set();
  }
  const v = validateRoute(route.nodeSequence, state.meridians, state.t2Nodes);
  if (!v.valid) {
    return new Set();
  }
  return getRouteMeridianIds(route.nodeSequence);
}

/**
 * TASK-088 — prerequisite for Great Circulation UI / route bonuses.
 */
export function isGreatCirculationAvailable(state: GameState): boolean {
  for (const id of BODY_T2_IDS) {
    const n = state.t2Nodes.get(id);
    if (!isT2Active(n)) {
      return false;
    }
  }

  for (const edge of BODY_MAP_EDGES) {
    const m = state.meridians.get(makeMeridianId(edge.fromNodeId, edge.toNodeId));
    if (!m?.isEstablished) {
      return false;
    }
    const flowState = meridianStateFromTotalFlow(m.totalFlow, m.isEstablished);
    const effectiveState = meridianStateRank(m.state) > meridianStateRank(flowState) ? m.state : flowState;
    if (meridianStateRank(effectiveState) < meridianStateRank(MeridianState.DEVELOPED)) {
      return false;
    }
  }

  return true;
}

/** Full 24-node Hamiltonian-style loop covering every T2 id exactly once (closed). */
export function isFullGreatCirculationRoute(nodeSequence: string[], _state: GameState): boolean {
  const v = validateRoute(nodeSequence, _state.meridians, _state.t2Nodes);
  if (!v.valid) {
    return false;
  }
  const path = nodeSequence.slice(0, -1);
  if (path.length !== BODY_T2_IDS.length) {
    return false;
  }
  const set = new Set(path);
  if (set.size !== BODY_T2_IDS.length) {
    return false;
  }
  for (const id of BODY_T2_IDS) {
    if (!set.has(id)) {
      return false;
    }
  }
  return true;
}

/**
 * TASK-089 — Ankle-only leg segment: internal mini-loop bonus when Knee and Foot are off-route.
 */
export function detectAnkleMiniCirculationBonus(nodeSequence: string[]): boolean {
  const onRoute = new Set(nodeSequence);
  for (const ankleId of ANKLE_IDS) {
    if (!onRoute.has(ankleId)) {
      continue;
    }
    const knee = ankleId === "L_ANKLE" ? "L_KNEE" : "R_KNEE";
    const foot = ankleId === "L_ANKLE" ? "L_FOOT" : "R_FOOT";
    if (!onRoute.has(knee) && !onRoute.has(foot)) {
      return true;
    }
  }
  return false;
}

export interface CirculationTickModifiers {
  throttleFactor: number;
  /** Loop efficiency for TF (TASK-087), excludes throttle. */
  loopEfficiency: number;
  greatCirculationRoute: boolean;
  greatCirculationAvailable: boolean;
  ankleMiniCirculationQualityBonus: boolean;
  /** Extra heat factor on route meridian transfer heat + route heat ledger (TASK-088). */
  routeHeatMultiplier: number;
  /** Apply TypeWidth/TypePurity training boost on route (TASK-088). */
  greatCirculationTrainingPoolScale: number;
}

/**
 * TASK-087 — prepare per-tick circulation modifiers; refresh route metrics.
 */
export function prepareCirculationTick(state: GameState, techniqueStrength: number): CirculationTickModifiers {
  const base: CirculationTickModifiers = {
    throttleFactor: 1,
    loopEfficiency: 1,
    greatCirculationRoute: false,
    greatCirculationAvailable: false,
    ankleMiniCirculationQualityBonus: false,
    routeHeatMultiplier: 1,
    greatCirculationTrainingPoolScale: 1
  };

  const route = state.activeRoute;
  if (!route?.isActive || route.nodeSequence.length < 3) {
    return base;
  }

  const validation = validateRoute(route.nodeSequence, state.meridians, state.t2Nodes);
  if (!validation.valid) {
    return base;
  }

  computeRouteMetrics(route, state.meridians, state.t2Nodes, techniqueStrength);

  const greatAvail = isGreatCirculationAvailable(state);
  const greatRoute = greatAvail && isFullGreatCirculationRoute(route.nodeSequence, state);
  let loopEff = route.loopEfficiency;
  if (greatRoute) {
    loopEff = GREAT_CIRCULATION_LOOP_EFFICIENCY;
    route.loopEfficiency = loopEff;
  }

  base.throttleFactor = computeCirculationThrottleFactor(state.bodyHeat, state.maxBodyHeat);
  const sharedHarmonyActive = Boolean(
    state.companion?.sharedRouteActive && state.companion.harmonyLevel >= 50
  );
  base.loopEfficiency = loopEff + (sharedHarmonyActive ? HARMONY_LOOP_EFFICIENCY_BONUS : 0);
  base.greatCirculationAvailable = greatAvail;
  base.greatCirculationRoute = greatRoute;
  base.ankleMiniCirculationQualityBonus = detectAnkleMiniCirculationBonus(route.nodeSequence);
  base.routeHeatMultiplier = greatRoute ? GREAT_CIRCULATION_HEAT_MULT : 1;
  const greatTraining = greatRoute ? GREAT_CIRCULATION_TRAINING_MOD : 1;
  base.greatCirculationTrainingPoolScale = sharedHarmonyActive ? greatTraining * HARMONY_TRAINING_MOD : greatTraining;

  return base;
}

/** TASK-087 — simulation hook at tick step 2 (returns modifiers for flow/TF/heat). */
export const executeCirculationRoute = prepareCirculationTick;

/** TASK-087 — accumulate route heat; optional Great Circulation Shen tick at Anahata. */
export function applyCirculationPostFlow(
  state: GameState,
  routeMeridianIds: Set<string>,
  grossByMeridian: Map<string, EnergyPool>,
  modifiers: CirculationTickModifiers
): void {
  const route = state.activeRoute;
  if (!route?.isActive || routeMeridianIds.size === 0) {
    return;
  }

  let routeHeat = 0;
  for (const id of routeMeridianIds) {
    const m = state.meridians.get(id);
    const gross = grossByMeridian.get(id);
    if (!m || !gross) {
      continue;
    }
    const Pur = clamp(computeMeridianPurity(m), 0, 1);
    const tot = totalEnergy(gross);
    const yangFrac = tot > 0 ? gross[EnergyType.YangQi] / tot : 0;
    routeHeat += yangFrac * tot * (1 - Pur);
  }

  route.accumulatedRouteHeat += routeHeat * modifiers.routeHeatMultiplier;

  if (modifiers.greatCirculationRoute) {
    const anahata = state.t2Nodes.get("ANAHATA");
    if (anahata) {
      const ioInId = anahata.ioNodeMap.get("SOLAR");
      if (ioInId !== undefined) {
        const t1 = anahata.t1Nodes.get(ioInId);
        if (t1) {
          t1.energy[EnergyType.Shen] += SHEN_BONUS_ANAHATA_PER_TICK;
        }
      }
    }
  }
}

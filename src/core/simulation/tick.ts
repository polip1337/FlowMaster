import { clamp } from "../../utils/math";
import { computeAllAttributes } from "../attributes/attributeComputer";
import {
  applyCirculationPostFlow,
  ANKLE_INTERNAL_T1,
  executeCirculationRoute,
  getActiveValidatedRouteMeridianIds
} from "../circulation/routes";
import { EnergyType, addPools, emptyPool, scaledPool, totalEnergy } from "../energy/EnergyType";
import {
  applyMeridianFlow,
  computeActiveMeridianFlow,
  computeFlowBonus,
  computeMeridianPurity,
  computePassiveMeridianFlow,
  planMeridianGrossWithdrawal,
  resolveBidirDirection,
  updateMeridianAffinity,
  updateMeridianWidth
} from "../meridians/meridianLogic";
import type { Meridian } from "../meridians/Meridian";
import { MeridianState } from "../meridians/MeridianTypes";
import { applyT1Flows, computeT1Flows, generateSourceEnergy, updateT1Refinement, updateT1States } from "../nodes/t1Logic";
import { applyManipuraRefiningPulse } from "./conversion";
import { applyFootSoleEarthJing, applyShenPassiveGeneration, FOOT_CLUSTER_IDS } from "./phase8EnergyStep";
import { getT2Capacity, getT2Resonance } from "../nodes/t2Logic";
import type { T1Node } from "../nodes/T1Node";
import { T1NodeState } from "../nodes/T1Types";
import { T1NodeType } from "../nodes/T1Types";
import type { T2Node } from "../nodes/T2Node";
import { T2NodeState } from "../nodes/T2Types";
import type { GameState } from "../../state/GameState";
import { updateBodyHeat } from "./heatSystem";
import { assertValidEnergyPool } from "./guards";
import { checkAndUnlockT2Nodes } from "../progression/unlockController";
import { checkLevelUps } from "../progression/levelController";
import { checkRankBreakthroughs } from "../progression/rankController";
import { checkDaoSelectionTrigger, generateDaoInsights, updateDaoNodeProgression } from "../dao/daoSystem";
import { applyNodeRepairTick } from "../combat/nodeDamage";
import { applyFormationArrayPassiveGeneration } from "../treasures/treasureSystem";

interface MeridianTickTransfer {
  meridian: Meridian;
  fromNode: T2Node;
  toNode: T2Node;
  requestedFlow: ReturnType<typeof emptyPool>;
}

function cloneGameState(state: GameState): GameState {
  return structuredClone(state);
}

function hasBidirIo(meridian: Meridian, fromNode: T2Node, toNode: T2Node): boolean {
  const outNode = fromNode.t1Nodes.get(meridian.ioNodeOutId);
  const inNode = toNode.t1Nodes.get(meridian.ioNodeInId);
  return Boolean(
    outNode?.type === T1NodeType.IO_BIDIR ||
      inNode?.type === T1NodeType.IO_BIDIR
  );
}

function clearMeridianReservations(state: GameState): void {
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      t1.reservedEnergy = emptyPool();
    }
  }
}

function addIoOutReservation(ioOut: T1Node, gross: ReturnType<typeof emptyPool>): void {
  for (const t of Object.values(EnergyType)) {
    const room = Math.max(0, ioOut.energy[t] - ioOut.reservedEnergy[t]);
    ioOut.reservedEnergy[t] += Math.min(Math.max(0, gross[t]), room);
  }
}

function reservedByCluster(t2: T2Node): Map<number, ReturnType<typeof emptyPool>> {
  const m = new Map<number, ReturnType<typeof emptyPool>>();
  for (const [id, t1] of t2.t1Nodes) {
    if (totalEnergy(t1.reservedEnergy) > 0) {
      m.set(id, t1.reservedEnergy);
    }
  }
  return m;
}

function applyPoolMultiplier(pool: ReturnType<typeof emptyPool>, multiplier: number): ReturnType<typeof emptyPool> {
  const out = emptyPool();
  for (const t of Object.values(EnergyType)) {
    out[t] = pool[t] * multiplier;
  }
  return out;
}

function updateFlowBonusCapacities(state: GameState): void {
  const perNodeBonus = new Map<string, number>();
  for (const meridian of state.meridians.values()) {
    if (!meridian.isEstablished) {
      continue;
    }
    const bonus = computeFlowBonus(meridian);
    perNodeBonus.set(meridian.nodeFromId, (perNodeBonus.get(meridian.nodeFromId) ?? 0) + bonus);
    perNodeBonus.set(meridian.nodeToId, (perNodeBonus.get(meridian.nodeToId) ?? 0) + bonus);
  }

  for (const [nodeId, t2Node] of state.t2Nodes) {
    const previousBonus = t2Node.flowBonusPercent;
    const nextBonus = perNodeBonus.get(nodeId) ?? 0;
    const prevMul = 1 + previousBonus / 100;
    const nextMul = 1 + nextBonus / 100;
    const rescale = prevMul > 0 ? nextMul / prevMul : nextMul;

    for (const t1 of t2Node.t1Nodes.values()) {
      t1.capacity *= rescale;
    }
    t2Node.flowBonusPercent = nextBonus;
  }
}

function unlockEdgesForNode(node: T2Node, unlockedNodeId: number): void {
  for (const edge of node.t1Edges.values()) {
    if (edge.toId === unlockedNodeId) {
      edge.isLocked = false;
    }
  }
}

function getManipuraResonance(state: GameState): number {
  const manipura = state.t2Nodes.get("MANIPURA");
  return manipura ? getT2Resonance(manipura) : 0;
}

/**
 * Phase 7 master tick (TASK-065..076) + Phase 8 special energy (TASK-078..083) + Phase 9 circulation (TASK-084..089).
 *
 * Phase 8 sub-order within step 1 (before meridian IO):
 * 1. T1 source generation (TASK-066)
 * 2. Foot SOLE Earth Jing absorption (TASK-078)
 * 3. Anahata / Ajna Shen passive (TASK-080)
 * 4. Manipura refining pulse heat + conversion (TASK-079) — uses body heat ratio at tick start
 *
 * TASK-082 overflow pressure is applied inside meridian passive flow via IO pressure on `fromNode`.
 * TASK-081 priority cap is applied when unconstrained type demand exceeds meridian width budget.
 *
 * TASK-083 Jing depletion runs after all energy movement for the tick (before counters).
 *
 * S-013 — meridian phase: plan gross IO_OUT reservations, T1 flows (cannot drain reserved energy),
 * then apply meridian transfers.
 */
export function simulationTick(state: GameState): GameState {
  const next = cloneGameState(state);
  const cultivation = next.cultivationAttributes;
  const circulationSpeedMul = 1 + cultivation.circulationSpeed / 100;
  const refinementRateMul = 1 + cultivation.refinementRate / 100;
  const circulation = executeCirculationRoute(next, next.technique.strength * circulationSpeedMul);
  const routeMeridians = getActiveValidatedRouteMeridianIds(next);
  const flowByMeridian = new Map<string, ReturnType<typeof emptyPool>>();
  const transfers: MeridianTickTransfer[] = [];
  let meridianHeatGain = 0;
  const preFlowLifetimeByT1 = new Map<string, number>();

  for (const [t2Id, t2] of next.t2Nodes) {
    for (const [t1Id, t1] of t2.t1Nodes) {
      preFlowLifetimeByT1.set(`${t2Id}:${t1Id}`, t1.lifetimeFlowOut);
    }
  }

  // Step 1: source generation
  for (const t2 of next.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      t1.energy = addPools(t1.energy, generateSourceEnergy(t1));
    }
  }
  applyFormationArrayPassiveGeneration(next);

  // Phase 8 — step 1 continued: foot Jing, Shen passive, Manipura furnace
  for (const footId of FOOT_CLUSTER_IDS) {
    const foot = next.t2Nodes.get(footId);
    if (foot) {
      applyFootSoleEarthJing(foot, next.environmentModifier);
    }
  }
  const anahata = next.t2Nodes.get("ANAHATA");
  if (anahata) {
    applyShenPassiveGeneration(anahata);
  }
  const ajna = next.t2Nodes.get("AJNA");
  if (ajna) {
    applyShenPassiveGeneration(ajna);
  }
  const manipura = next.t2Nodes.get("MANIPURA");
  if (manipura) {
    const heatRatio = next.maxBodyHeat > 0 ? next.bodyHeat / next.maxBodyHeat : 0;
    meridianHeatGain += applyManipuraRefiningPulse(manipura, next.refiningPulseActive, heatRatio);
  }

  // Step 2a — S-013: reserve IO_OUT energy meridians will withdraw (before T1 internal flows).
  clearMeridianReservations(next);
  for (const meridian of next.meridians.values()) {
    if (!meridian.isEstablished || meridian.state === MeridianState.UNESTABLISHED) {
      continue;
    }

    let fromNode = next.t2Nodes.get(meridian.nodeFromId);
    let toNode = next.t2Nodes.get(meridian.nodeToId);
    if (!fromNode || !toNode) {
      continue;
    }

    if (hasBidirIo(meridian, fromNode, toNode)) {
      const dir = resolveBidirDirection(meridian, fromNode, toNode);
      if (dir === "idle") {
        continue;
      }
      if (dir === "receive") {
        fromNode = next.t2Nodes.get(meridian.nodeToId);
        toNode = next.t2Nodes.get(meridian.nodeFromId);
        if (!fromNode || !toNode) {
          continue;
        }
      }
    }

    const isActiveRoute = routeMeridians.has(meridian.id);
    let requestedFlow = isActiveRoute
      ? computeActiveMeridianFlow(meridian, fromNode, toNode, next.technique.strength)
      : computePassiveMeridianFlow(meridian, fromNode, toNode);
    if (isActiveRoute) {
      requestedFlow = scaledPool(requestedFlow, circulation.throttleFactor);
    }

    const ioOut = fromNode.t1Nodes.get(meridian.ioNodeOutId);
    if (ioOut) {
      const plannedGross = planMeridianGrossWithdrawal(fromNode, toNode, requestedFlow, meridian);
      addIoOutReservation(ioOut, plannedGross);
    }

    transfers.push({
      meridian,
      fromNode,
      toNode,
      requestedFlow
    });
  }

  // Step 3: T1 weight-driven flows (respects reservedEnergy on each T1 node).
  for (const t2 of next.t2Nodes.values()) {
    const flows = computeT1Flows(t2.t1Nodes, t2.t1Edges, reservedByCluster(t2));
    applyT1Flows(t2.t1Nodes, flows);
  }

  // Step 4: apply meridian transfers after internal routing cannot consume reserved export.
  for (const transfer of transfers) {
    const { grossWithdrawn, heatDelta } = applyMeridianFlow(
      transfer.fromNode,
      transfer.toNode,
      transfer.requestedFlow,
      transfer.meridian
    );
    let effectiveHeat = heatDelta;
    if (routeMeridians.has(transfer.meridian.id)) {
      effectiveHeat *= circulation.routeHeatMultiplier;
    }
    meridianHeatGain += effectiveHeat;
    flowByMeridian.set(transfer.meridian.id, grossWithdrawn);
    if (routeMeridians.has(transfer.meridian.id)) {
      const flowed = totalEnergy(grossWithdrawn);
      transfer.meridian.totalFlow += flowed * (circulation.loopEfficiency - 1);
    }
  }

  applyCirculationPostFlow(next, routeMeridians, flowByMeridian, circulation);

  // Step 5: heat update
  const manipuraResonance = getManipuraResonance(next);
  const heat = updateBodyHeat({
    bodyHeat: next.bodyHeat,
    maxBodyHeat: next.maxBodyHeat,
    manipuraResonance,
    meridianHeatGain
  });
  next.bodyHeat = heat.bodyHeat;

  // Apply the hot-zone purity penalty directly to meridians.
  if (heat.purityMultiplier < 1) {
    for (const meridian of next.meridians.values()) {
      if (!meridian.isEstablished) {
        continue;
      }
      meridian.purity = Math.min(0.99, computeMeridianPurity(meridian) * heat.purityMultiplier);
    }
  }

  // Step 6: T1 refinement for nodes that flowed this tick
  for (const [t2Id, t2] of next.t2Nodes) {
    for (const [t1Id, t1] of t2.t1Nodes) {
      const key = `${t2Id}:${t1Id}`;
      const before = preFlowLifetimeByT1.get(key) ?? t1.lifetimeFlowOut;
      const flowed = Math.max(0, t1.lifetimeFlowOut - before);
      if (flowed > 0) {
        const ankleQ =
          circulation.ankleMiniCirculationQualityBonus &&
          (t2Id === "L_ANKLE" || t2Id === "R_ANKLE") &&
          ANKLE_INTERNAL_T1.has(t1Id)
            ? 1.2
            : 1;
        updateT1Refinement(t1, flowed * refinementRateMul, ankleQ);
      }
    }
  }

  // Step 7: meridian training updates on flowed meridians
  for (const transfer of transfers) {
    const gross = flowByMeridian.get(transfer.meridian.id) ?? emptyPool();
    if (totalEnergy(gross) <= 0) {
      continue;
    }
    let trainFlow = gross;
    if (routeMeridians.has(transfer.meridian.id) && circulation.greatCirculationTrainingPoolScale > 1) {
      trainFlow = scaledPool(gross, circulation.greatCirculationTrainingPoolScale);
    }

    updateMeridianWidth(transfer.meridian, trainFlow);
    transfer.meridian.purity = computeMeridianPurity(transfer.meridian);
    updateMeridianAffinity(transfer.meridian, trainFlow);
    // Deposits already updated via applyMeridianFlow; this keeps width/purity/affinity synchronized.
  }

  // Step 8 (throttled): flow bonus recalc
  if ((next.tick + 1) % 10 === 0) {
    updateFlowBonusCapacities(next);
  }

  // Step 9: T1 state update + edge unlocks
  for (const t2 of next.t2Nodes.values()) {
    const stateEvents = updateT1States(t2.t1Nodes);
    for (const ev of stateEvents) {
      if (ev.to === T1NodeState.UNSEALED) {
        unlockEdgesForNode(t2, ev.nodeId);
      }
    }
  }

  // Step 10: T2 progression update (unlock, level, rank breakthrough).
  const unlockEvents = checkAndUnlockT2Nodes(next);
  const levelEvents = checkLevelUps(next);
  const breakthroughEvents = checkRankBreakthroughs(next);
  next.progression.unlockEvents.push(...unlockEvents);
  next.progression.levelUpEvents.push(...levelEvents);
  next.progression.breakthroughEvents.push(...breakthroughEvents);
  next.immediateConditionCheck = false;

  // Phase 12: Dao selection gate and Dao progression.
  checkDaoSelectionTrigger(next);
  generateDaoInsights(next);
  updateDaoNodeProgression(next);

  for (const node of next.t2Nodes.values()) {
    // S-010 — REFINED when Rank 5+ and all T1 quality ≥ 8; cluster resonance ×1.15 once.
    if (
      node.state === T2NodeState.ACTIVE &&
      node.rank >= 5 &&
      !node.refinedResonanceBonusApplied &&
      [...node.t1Nodes.values()].every((t) => t.quality >= 8)
    ) {
      node.state = T2NodeState.REFINED;
      node.refinedResonanceBonusApplied = true;
      for (const t1 of node.t1Nodes.values()) {
        t1.resonanceMultiplier *= 1.15;
      }
    }
  }

  // Step 11 (throttled): attribute recalc.
  if ((next.tick + 1) % 10 === 0) {
    const attrs = computeAllAttributes(next);
    next.cultivationAttributes = attrs.cultivation;
    next.combatAttributes = attrs.combat;
  }

  next.maxHp = 100 + next.combatAttributes.physicalDurability;
  next.maxSoulHp = 50 + next.combatAttributes.soulDurability;
  next.hp = clamp(next.hp, 0, next.maxHp);
  next.soulHp = clamp(next.soulHp, 0, next.maxSoulHp);

  // Step 12: final state counters and trackers
  next.tick += 1;
  const globalTypeTotals = emptyPool();
  let globalTotal = 0;
  for (const t2 of next.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      for (const t of Object.values(EnergyType)) {
        globalTypeTotals[t] += t1.energy[t];
      }
      globalTotal += totalEnergy(t1.energy);
    }
  }
  next.globalTrackers.lifetimeEnergyByType = applyPoolMultiplier(globalTypeTotals, 1);
  next.globalTrackers.totalEnergyGenerated = globalTotal;

  // TASK-083 — Jing depletion vs total storable capacity (all T2), HP drain on ACTIVE T2 count
  let totalJing = 0;
  let jingCapacityBudget = 0;
  let activeT2ForHp = 0;
  for (const t2 of next.t2Nodes.values()) {
    jingCapacityBudget += getT2Capacity(t2);
    if (t2.state === T2NodeState.ACTIVE) {
      activeT2ForHp += 1;
    }
    for (const t1 of t2.t1Nodes.values()) {
      totalJing += t1.energy[EnergyType.Jing];
    }
  }
  next.jingDepletionWarning = jingCapacityBudget > 0 && totalJing < jingCapacityBudget * 0.1;
  if (next.jingDepletionWarning && activeT2ForHp > 0) {
    next.hp = clamp(next.hp - 0.001 * activeT2ForHp, 0, next.maxHp);
  }

  applyNodeRepairTick(next.t2Nodes, next.cultivationAttributes.meridianRepairRate, next.activeRepairNodeId);

  if (!next.combat) {
    next.hp = clamp(next.hp + 0.1, 0, next.maxHp);
    next.soulHp = clamp(next.soulHp + 0.1, 0, next.maxSoulHp);
  }

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    for (const t2 of next.t2Nodes.values()) {
      for (const t1 of t2.t1Nodes.values()) {
        assertValidEnergyPool(t1.energy, `T1 ${t2.id}/${t1.id}`);
      }
    }
  }

  return next;
}
